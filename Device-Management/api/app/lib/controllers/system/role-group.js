"use strict";
const { Op } = require("sequelize");

/**
 * 获取角色组列表
 */
async function getRoleGroups(ctx) {
  try {
    const models = ctx.fs.dc.models;
    const { page = 1, pageSize = 10, orgId, keyword } = ctx.query;
    const p = parseInt(page) || 1;
    const size = Math.min(parseInt(pageSize) || 10, 100);

    const whereCondition = {};
    if (orgId) {
      whereCondition.orgId = orgId;
    }
    if (keyword) {
      whereCondition[Op.or] = [
        { name: { [Op.like]: `%${keyword}%` } },
        { description: { [Op.like]: `%${keyword}%` } },
      ];
    }

    const { count, rows } = await models.RoleGroup.findAndCountAll({
      where: whereCondition,
      attributes: ["id", "name", "orgId"],
      include: [
        {
          model: models.Organization,
          attributes: ["id", "name"],
          required: false,
        },
        {
          model: models.Role,
          attributes: ["id", "name", "portal"],
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
    ctx.fs.logger.error(`获取角色组列表失败: ${error}`);
    ctx.status = 500;
    ctx.body = { message: "获取角色组列表失败" };
  }
}

/**
 * 获取角色组详情
 */
async function getRoleGroup(ctx) {
  try {
    const models = ctx.fs.dc.models;
    const { id } = ctx.params;

    const roleGroup = await models.RoleGroup.findByPk(id, {
      include: [
        {
          model: models.Organization,
          attributes: ["id", "name"],
          required: false,
        },
        {
          model: models.Role,
          attributes: ["id", "name", "portal", "description"],
          required: false,
        },
      ],
    });

    if (!roleGroup) {
      ctx.status = 404;
      ctx.body = { message: "角色组不存在" };
      return;
    }

    ctx.status = 200;
    ctx.body = { data: roleGroup };
  } catch (error) {
    ctx.fs.logger.error(`获取角色组详情失败: ${error}`);
    ctx.status = 500;
    ctx.body = { message: "获取角色组详情失败" };
  }
}

/**
 * 创建角色组
 */
async function createRoleGroup(ctx) {
  const transaction = await ctx.fs.dc.orm.transaction();

  try {
    const models = ctx.fs.dc.models;
    const roleGroupData = ctx.request.body;

    const roleGroup = await models.RoleGroup.create(roleGroupData, {
      transaction,
    });

    await transaction.commit();

    ctx.status = 201;
    ctx.body = {
      message: "角色组创建成功",
      data: roleGroup,
    };
  } catch (error) {
    await transaction.rollback();
    ctx.fs.logger.error(`创建角色组失败: ${error}`);
    ctx.status = 500;
    ctx.body = { message: "创建角色组失败" };
  }
}

/**
 * 更新角色组
 */
async function updateRoleGroup(ctx) {
  const transaction = await ctx.fs.dc.orm.transaction();

  try {
    const models = ctx.fs.dc.models;
    const { id } = ctx.params;
    const roleGroupData = ctx.request.body;

    const roleGroup = await models.RoleGroup.findByPk(id, { transaction });
    if (!roleGroup) {
      await transaction.rollback();
      ctx.status = 404;
      ctx.body = { message: "角色组不存在" };
      return;
    }

    await roleGroup.update(roleGroupData, { transaction });

    await transaction.commit();

    ctx.status = 200;
    ctx.body = {
      message: "角色组更新成功",
      data: roleGroup,
    };
  } catch (error) {
    await transaction.rollback();
    ctx.fs.logger.error(`更新角色组失败: ${error}`);
    ctx.status = 500;
    ctx.body = { message: "更新角色组失败" };
  }
}

/**
 * 删除角色组
 */
async function deleteRoleGroup(ctx) {
  const transaction = await ctx.fs.dc.orm.transaction();

  try {
    const models = ctx.fs.dc.models;
    const { id } = ctx.params;

    const roleGroup = await models.RoleGroup.findByPk(id, { transaction });
    if (!roleGroup) {
      await transaction.rollback();
      ctx.status = 404;
      ctx.body = { message: "角色组不存在" };
      return;
    }

    await roleGroup.destroy({ transaction });

    await transaction.commit();

    ctx.status = 200;
    ctx.body = { message: "角色组删除成功" };
  } catch (error) {
    await transaction.rollback();
    ctx.fs.logger.error(`删除角色组失败: ${error}`);
    ctx.status = 500;
    ctx.body = { message: "删除角色组失败" };
  }
}

/**
 * 获取角色组的角色列表
 */
async function getRoleGroupRoles(ctx) {
  try {
    const models = ctx.fs.dc.models;
    const { id: orgId } = ctx.params;

    // 查询该组织下的所有角色组，并包含角色信息和用户信息
    const roleGroups = await models.RoleGroup.findAll({
      where: { orgId: orgId },
      include: [
        {
          model: models.Role,
          required: false,
          include: [
            {
              model: models.User,
              attributes: ["id", "name", "username"],
              through: { attributes: [] }, // 不返回中间表字段
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
          ],
        },
      ],
      order: [["id", "ASC"]],
    });

    ctx.status = 200;
    ctx.body = {
      data: roleGroups,
      total: roleGroups.length,
    };
  } catch (error) {
    console.error("获取组织角色组列表失败:", error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: "获取组织角色组列表失败",
    };
  }
}

/**
 * 获取角色组用户统计
 */
async function getRoleGroupUserStats(ctx) {
  try {
    const models = ctx.fs.dc.models;
    const { id } = ctx.params;

    // 获取角色组信息
    const roleGroup = await models.RoleGroup.findByPk(id, {
      include: [
        {
          model: models.Role,
          attributes: ["id", "name"],
          required: false,
          include: [
            {
              model: models.User,
              attributes: ["id", "name", "username"],
              required: false,
            },
          ],
        },
      ],
    });

    if (!roleGroup) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: "角色组不存在",
      };
      return;
    }

    // 统计用户数量
    let totalUsers = 0;
    const userStats = [];

    if (roleGroup.Roles) {
      roleGroup.Roles.forEach((role) => {
        if (role.Users) {
          const userCount = role.Users.length;
          totalUsers += userCount;
          userStats.push({
            roleId: role.id,
            roleName: role.name,
            userCount: userCount,
            users: role.Users.map((user) => ({
              id: user.id,
              name: user.name,
              username: user.username,
            })),
          });
        }
      });
    }

    ctx.status = 200;
    ctx.body = {
      success: true,
      data: {
        roleGroupId: roleGroup.id,
        roleGroupName: roleGroup.name,
        totalUsers: totalUsers,
        roleStats: userStats,
      },
    };
  } catch (error) {
    console.error("获取角色组用户统计失败:", error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: "获取角色组用户统计失败",
    };
  }
}

module.exports = {
  getRoleGroups,
  getRoleGroup,
  createRoleGroup,
  updateRoleGroup,
  deleteRoleGroup,
  getRoleGroupRoles,
  getRoleGroupUserStats,
};
