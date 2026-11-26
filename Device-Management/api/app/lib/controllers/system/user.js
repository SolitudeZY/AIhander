"use strict";
const { Op } = require("sequelize");
const Hex = require("crypto-js/enc-hex");
const MD5 = require("crypto-js/md5");

/**
 * 获取用户列表
 */
async function getUsers(ctx) {
  try {
    const models = ctx.fs.dc.models;
    const { page = 1, pageSize = 10, name, orgId, depId } = ctx.query;
    const p = parseInt(page) || 1;
    const size = Math.min(parseInt(pageSize) || 10, 100);

    const whereCondition = {};
    if (name) {
      whereCondition.name = {
        [Op.like]: `%${name}%`,
      };
    }
    if (orgId) {
      whereCondition.orgId = orgId;
    }
    if (depId) {
      whereCondition.depId = depId;
    }

    const { count, rows } = await models.User.findAndCountAll({
      where: whereCondition,
      attributes: [
        "id",
        "name",
        "username",
        "depId",
        "orgId",
        "postId",
        "enabled",
        "sortIndex",
      ],
      include: [
        {
          model: models.Department,
          attributes: ["id", "name"],
          required: false,
        },
        {
          model: models.Organization,
          attributes: ["id", "name"],
          required: false,
        },
        {
          model: models.TypePost,
          attributes: ["id", "name"],
          required: false,
        },
      ],
      limit: size,
      offset: (p - 1) * size,
      distinct: true,
      subQuery: false,
      order: [["id", "ASC"]],
    });

    ctx.status = 200;
    ctx.body = {
      data: rows,
      total: count,
      page: p,
      pageSize: size,
    };
  } catch (error) {
    ctx.fs.logger.error(`获取用户列表失败: ${error}`);
    ctx.status = 500;
    ctx.body = { message: "获取用户列表失败" };
  }
}

/**
 * 获取所有用户（不分页、无条件）
 */
async function getAllUsers(ctx) {
  try {
    const models = ctx.fs.dc.models;

    const users = await models.User.findAll({
      attributes: [
        "id",
        "name",
        "username",
        "depId",
        "orgId",
        "postId",
        "enabled",
        "sortIndex",
      ],
      include: [
        {
          model: models.Department,
          attributes: ["id", "name"],
          required: false,
        },
        {
          model: models.Organization,
          attributes: ["id", "name"],
          required: false,
        },
        {
          model: models.TypePost,
          attributes: ["id", "name"],
          required: false,
        },
      ],
      order: [["id", "ASC"]],
    });

    ctx.status = 200;
    ctx.body = {
      data: users,
      total: users.length,
    };
  } catch (error) {
    ctx.fs.logger.error(`获取所有用户列表失败: ${error}`);
    ctx.status = 500;
    ctx.body = { message: "获取所有用户列表失败" };
  }
}

/**
 * 获取用户详情
 */
async function getUser(ctx) {
  try {
    const models = ctx.fs.dc.models;
    const { id } = ctx.params;

    const user = await models.User.findByPk(id, {
      include: [
        {
          model: models.Department,
          attributes: ["id", "name"],
          required: false,
        },
        {
          model: models.Organization,
          attributes: ["id", "name"],
          required: false,
        },
        {
          model: models.TypePost,
          attributes: ["id", "name"],
          required: false,
        },
      ],
    });

    if (!user) {
      ctx.status = 404;
      ctx.body = { message: "用户不存在" };
      return;
    }

    ctx.status = 200;
    ctx.body = { data: user };
  } catch (error) {
    ctx.fs.logger.error(`获取用户详情失败: ${error}`);
    ctx.status = 500;
    ctx.body = { message: "获取用户详情失败" };
  }
}

/**
 * 创建用户
 */
async function createUser(ctx) {
  const transaction = await ctx.fs.dc.orm.transaction();
  try {
    const models = ctx.fs.dc.models;
    const userData = ctx.request.body;
    let newMemberId = null;

    // 检查账号是否已存在
    const existingUser = await models.User.findOne({
      where: { username: userData.username },
    });

    if (existingUser) {
      await transaction.rollback();
      ctx.status = 409;
      ctx.body = { message: "该账号已存在，请使用其他账号" };
      return;
    }

    // 获取当前最大的排序索引值并自增
    let nextSortIndex = 1;
    const maxSortIndexUser = await models.User.findOne({
      attributes: [
        [
          models.User.sequelize.fn(
            "MAX",
            models.User.sequelize.col("sort_index")
          ),
          "maxSortIndex",
        ],
      ],
    });

    if (maxSortIndexUser && maxSortIndexUser.dataValues.maxSortIndex !== null) {
      nextSortIndex = maxSortIndexUser.dataValues.maxSortIndex + 1;
    }

    // 提取 orgRole 数组，避免传递给 User.create() 时的类型冲突
    const { orgRole, ...userDataForCreate } = userData;

    // 设置默认值
    const userDataWithDefaults = {
      ...userDataForCreate,
      password: MD5(process.env.DEFAULT_MEMBER_PASSWORD || "CHANGE_ME_ON_FIRST_LOGIN").toString(Hex),
      regTime: new Date(),
      // 启用状态默认为true（如果未提供）
      enabled: userData.enabled !== undefined ? userData.enabled : true,
      // 排序索引自动递增
      sortIndex: nextSortIndex,
    };

    const user = await models.User.create(userDataWithDefaults, {
      transaction,
    });
    newMemberId = user.id;

    const userRoles = orgRole.map((v) => {
      return {
        userId: newMemberId,
        roleId: Number(v),
      };
    });
    await models.UserRole.bulkCreate(userRoles, { transaction });

    await transaction.commit();

    ctx.status = 201;
    ctx.body = {
      message: "用户创建成功",
      data: user,
    };
  } catch (error) {
    await transaction.rollback();
    ctx.fs.logger.error(`创建用户失败: ${error}`);
    ctx.status = 500;
    ctx.body = { message: "创建用户失败" };
  }
}

/**
 * 更新用户
 */
async function updateUser(ctx) {
  const transaction = await ctx.fs.dc.orm.transaction();
  try {
    const models = ctx.fs.dc.models;
    const { id } = ctx.params;
    const userData = ctx.request.body;

    // 参数验证
    if (!id || isNaN(Number(id))) {
      await transaction.rollback();
      ctx.status = 400;
      ctx.body = { message: "无效的用户ID" };
      return;
    }

    if (!userData || Object.keys(userData).length === 0) {
      await transaction.rollback();
      ctx.status = 400;
      ctx.body = { message: "请提供要更新的用户数据" };
      return;
    }

    // 查找要更新的用户，包含当前角色信息
    const user = await models.User.findOne({
      where: { id: id },
      include: [
        {
          model: models.Role,
          required: false,
        },
      ],
      transaction,
    });

    if (!user) {
      await transaction.rollback();
      ctx.status = 404;
      ctx.body = { message: "用户不存在" };
      return;
    }

    // 如果更新用户名，检查是否与其他用户冲突
    if (userData.username && userData.username !== user.username) {
      const existingUser = await models.User.findOne({
        where: {
          username: userData.username,
          id: { [Op.ne]: id },
        },
        transaction,
      });

      if (existingUser) {
        await transaction.rollback();
        ctx.status = 409;
        ctx.body = { message: "该用户名已被其他用户使用" };
        return;
      }
    }

    // 提取角色数据，避免传递给User.update时的类型冲突
    const { orgRole, ...userDataForUpdate } = userData;

    // 更新用户基本信息
    await models.User.update(userDataForUpdate, {
      where: { id: id },
      transaction,
    });

    // 处理角色更新（如果提供了角色数据）
    if (orgRole && Array.isArray(orgRole)) {
      const currentRoles = user.roles
        ? user.roles.map((role) => role.roleId)
        : [];
      const newRoles = orgRole.map((roleId) => Number(roleId));

      // 比较角色是否发生变化
      const currentRolesSorted = currentRoles.sort().toString();
      const newRolesSorted = newRoles.sort().toString();

      if (currentRolesSorted !== newRolesSorted) {
        // 删除现有角色关联
        await models.UserRole.destroy({
          where: { userId: id },
          transaction,
        });

        // 创建新的角色关联
        if (newRoles.length > 0) {
          const userRoles = newRoles.map((roleId) => ({
            userId: Number(id),
            roleId: roleId,
          }));
          await models.UserRole.bulkCreate(userRoles, { transaction });
        }
      }
    }

    // 获取更新后的用户信息
    const updatedUser = await models.User.findOne({
      where: { id: id },
      include: [
        {
          model: models.Department,
          attributes: ["id", "name"],
          required: false,
        },
        {
          model: models.Organization,
          attributes: ["id", "name"],
          required: false,
        },
        {
          model: models.TypePost,
          attributes: ["id", "name"],
          required: false,
        },
        {
          model: models.Role,
          attributes: ["id", "name"],
          required: false,
        },
      ],
      transaction,
    });

    await transaction.commit();

    ctx.status = 200;
    ctx.body = {
      message: "用户更新成功",
      data: updatedUser,
    };
  } catch (error) {
    await transaction.rollback();
    ctx.fs.logger.error(`更新用户失败: ${error}`);
    ctx.status = 500;
    ctx.body = { message: "更新用户失败" };
  }
}

/**
 * 删除用户
 */
async function deleteUser(ctx) {
  const transaction = await ctx.fs.dc.orm.transaction();
  try {
    const models = ctx.fs.dc.models;
    const { id } = ctx.params;

    const user = await models.User.findByPk(id, { transaction });
    if (!user) {
      await transaction.rollback();
      ctx.status = 404;
      ctx.body = { message: "用户不存在" };
      return;
    }

    // 1. 查找用户创建的所有项目
    const userProjects = await models.Project.findAll({
      where: { createBy: id },
      transaction
    });

    // 2. 查询并删除项目下的设备关联关系
    let deletedProjectDevicesCount = 0;
    let projectDeviceCodes = [];
    for (const project of userProjects) {
      // 先查询项目下的设备
      const projectDevices = await models.ProjectDevice.findAll({
        where: { projectId: project.id },
        transaction
      });
      
      // 收集设备ID
      projectDeviceCodes.push(...projectDevices.map(pd => pd.deviceCode));
      
      // 删除项目设备关联关系
      const count = await models.ProjectDevice.destroy({
        where: { projectId: project.id },
        transaction
      });
      deletedProjectDevicesCount += count;
    }

    // 3. 删除用户创建的所有项目
    await models.Project.destroy({
      where: { createBy: id },
      transaction
    });

    // 4. 删除外部用户设备关联数据
    const externalUserDevices = await models.ExternalUserDevice.findAll({
      where: { userId: id },
      transaction
    });
    
    let response;
    let deletedExternalDevicesCount = 0;
    
    if (externalUserDevices && externalUserDevices.length > 0) {
      deletedExternalDevicesCount = await models.ExternalUserDevice.destroy({
        where: { userId: id },
        transaction
      });
      response = {
        message: "用户删除成功，已同时删除用户创建的项目、项目下绑定的设备、外部用户设备关联数据",
        deletedProjects: userProjects.length,
        deletedProjectDevices: deletedProjectDevicesCount,
        deletedExternalDevices: deletedExternalDevicesCount,
      };
    } else {
      response = {
        message: "用户删除成功，已同时删除用户创建的项目、项目下绑定的设备",
        deletedProjects: userProjects.length,
        deletedProjectDevices: deletedProjectDevicesCount,
      };
    }

    // 5. 删除用户
    await user.destroy({ transaction });

    await transaction.commit();

    // 6. 记录系统日志
    try {
      let logContent = `删除用户: ${user.username}(ID: ${id})`;
      
      if (userProjects.length > 0) {
        const projectNames = userProjects.map(p => p.name).join("、");
        logContent += `，删除用户创建的项目(${userProjects.length}个): ${projectNames}`;
      }
      
      if (deletedProjectDevicesCount > 0) {
        logContent += `，删除项目下绑定的设备(${deletedProjectDevicesCount}个)`;
        if (projectDeviceCodes.length > 0) {
          logContent += `，设备ID: ${projectDeviceCodes.join("、")}`;
        }
      }
      
      if (deletedExternalDevicesCount > 0) {
        const externalDeviceIds = externalUserDevices.map(
          ed => `${ed.productCode}${ed.deviceCode}`
        ).join("、");
        logContent += `，删除外部用户设备关联数据(${deletedExternalDevicesCount}条)，设备ID: ${externalDeviceIds}`;
      }

      await models.SystemLog.create({
        logTime: new Date(),
        content: logContent,
        url: ctx.request.url,
        userId: (ctx.fs.api && ctx.fs.api.userId) || null,
        module: "用户管理",
      });
    } catch (logError) {
      // 日志记录失败不影响删除操作的成功响应
      ctx.fs.logger.error(`记录用户删除日志失败: ${logError}`);
    }

    ctx.status = 200;
    ctx.body = response;
  } catch (error) {
    await transaction.rollback();
    ctx.fs.logger.error(`删除用户失败: ${error}`);
    ctx.status = 500;
    ctx.body = { message: "删除用户失败" };
  }
}

/**
 * 重置密码
 */
async function resetPassword(ctx) {
  const transaction = await ctx.fs.dc.orm.transaction();
  try {
    const models = ctx.fs.dc.models;
    const { id } = ctx.params;
    const { password } = ctx.request.body;

    const user = await models.User.findByPk(id, { transaction });
    if (!user) {
      await transaction.rollback();
      ctx.status = 404;
      ctx.body = { message: "用户不存在" };
      return;
    }

    const hashedPassword = MD5(password).toString(Hex);
    await user.update({ password: hashedPassword }, { transaction });

    await transaction.commit();

    ctx.status = 200;
    ctx.body = { message: "密码重置成功" };
  } catch (error) {
    await transaction.rollback();
    ctx.fs.logger.error(`重置密码失败: ${error}`);
    ctx.status = 500;
    ctx.body = { message: "重置密码失败" };
  }
}

/**
 * 更新用户状态
 */
async function updateUserStatus(ctx) {
  const transaction = await ctx.fs.dc.orm.transaction();
  try {
    const models = ctx.fs.dc.models;
    const { id } = ctx.params;
    const { status } = ctx.request.body;

    const user = await models.User.findByPk(id, { transaction });
    if (!user) {
      await transaction.rollback();
      ctx.status = 404;
      ctx.body = { message: "用户不存在" };
      return;
    }

    await user.update({ enabled: status }, { transaction });

    await transaction.commit();

    ctx.status = 200;
    ctx.body = { message: "用户状态更新成功" };
  } catch (error) {
    await transaction.rollback();
    ctx.fs.logger.error(`更新用户状态失败: ${error}`);
    ctx.status = 500;
    ctx.body = { message: "更新用户状态失败" };
  }
}

/**
 * 批量删除用户
 */
async function batchDeleteUsers(ctx) {
  try {
    const models = ctx.fs.dc.models;
    const { ids } = ctx.request.body;

    await models.User.destroy({
      where: {
        id: {
          [Op.in]: ids,
        },
      },
    });

    ctx.status = 200;
    ctx.body = { message: "批量删除用户成功" };
  } catch (error) {
    ctx.fs.logger.error(`批量删除用户失败: ${error}`);
    ctx.status = 500;
    ctx.body = { message: "批量删除用户失败" };
  }
}

/**
 * 部门用户排序
 */
async function sortDepartmentUsers(ctx) {
  const transaction = await ctx.fs.dc.orm.transaction();
  try {
    const models = ctx.fs.dc.models;
    const { dataList } = ctx.request.body;

    if (!dataList || !Array.isArray(dataList)) {
      ctx.status = 400;
      ctx.body = { message: "排序数据不能为空" };
      return;
    }

    // 批量更新用户排序
    for (const item of dataList) {
      if (!item.id || item.sortIndex === undefined) {
        ctx.status = 400;
        ctx.body = { message: "排序数据格式错误" };
        return;
      }

      await models.User.update(
        { sortIndex: item.sortIndex },
        {
          where: { id: item.id },
          transaction,
        }
      );
    }

    await transaction.commit();

    ctx.status = 200;
    ctx.body = { message: "部门用户排序更新成功" };
  } catch (error) {
    await transaction.rollback();
    ctx.fs.logger.error(`部门用户排序失败: ${error}`);
    ctx.status = 500;
    ctx.body = { message: "部门用户排序失败" };
  }
}

/**
 * 获取职位列表
 */
async function getPosts(ctx) {
  try {
    const models = ctx.fs.dc.models;

    const posts = await models.TypePost.findAll({
      order: [["id", "ASC"]],
    });

    ctx.status = 200;
    ctx.body = {
      data: posts,
      total: posts.length,
    };
  } catch (error) {
    ctx.fs.logger.error(`获取职位列表失败: ${error}`);
    ctx.status = 500;
    ctx.body = { message: "获取职位列表失败" };
  }
}

/**
 * 获取角色列表
 */
async function getRolesList(ctx) {
  try {
    const models = ctx.fs.dc.models;
    const { orgId } = ctx.query;

    // 构建查询条件，包含角色组关联和用户关联
    const includeConditions = [
      {
        model: models.RoleGroup,
        attributes: ["id", "name"],
        required: true,
        where: { orgId: orgId },
      },
      {
        model: models.User,
        attributes: ["id", "name", "username"],
        through: { attributes: [] },
        required: false,
        include: [
          {
            model: models.Department,
            attributes: ["id", "name"],
            required: false,
          },
          {
            model: models.TypePost,
            attributes: ["id", "name"],
            required: false,
          },
        ],
      },
    ];

    const roles = await models.Role.findAll({
      attributes: ["id", "name", "portal"],
      include: includeConditions,
      order: [["id", "ASC"]],
    });

    ctx.status = 200;
    ctx.body = {
      data: roles,
      total: roles.length,
    };
  } catch (error) {
    ctx.fs.logger.error(`获取角色列表失败: ${error}`);
    ctx.status = 500;
    ctx.body = { message: "获取角色列表失败" };
  }
}

/**
 * 获取角色组列表
 */
async function getRoleGroups(ctx) {
  try {
    const models = ctx.fs.dc.models;
    const { page = 1, pageSize = 10, name, orgId } = ctx.query;

    const whereCondition = {};
    if (name) {
      whereCondition.name = {
        [Op.like]: `%${name}%`,
      };
    }
    if (orgId) {
      whereCondition.orgId = orgId;
    }

    const { count, rows } = await models.RoleGroup.findAndCountAll({
      where: whereCondition,
      include: [
        {
          model: models.Organization,
          attributes: ["id", "name"],
          required: false,
        },
      ],
      limit: parseInt(pageSize),
      offset: (parseInt(page) - 1) * parseInt(pageSize),
      order: [["id", "ASC"]],
    });

    ctx.status = 200;
    ctx.body = {
      data: rows,
      total: count,
      page: parseInt(page),
      pageSize: parseInt(pageSize),
    };
  } catch (error) {
    ctx.fs.logger.error(`获取角色组列表失败: ${error}`);
    ctx.status = 500;
    ctx.body = { message: "获取角色组列表失败" };
  }
}

module.exports = {
  getUsers,
  getAllUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  resetPassword,
  updateUserStatus,
  batchDeleteUsers,
  sortDepartmentUsers,
  getPosts,
  getRolesList,
  getRoleGroups,
};
