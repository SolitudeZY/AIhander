"use strict";
const Hex = require("crypto-js/enc-hex");
const MD5 = require("crypto-js/md5");
const moment = require("moment");
const uuid = require("uuid");
const { Op } = require("sequelize");

/**
 * 用户登录
 */
async function login(ctx, next) {
  try {
    const models = ctx.fs.dc.models;
    const params = ctx.request.body;
    const { username, password } = params;

    if (!username || !password) {
      ctx.status = 400;
      ctx.body = { message: "用户名和密码不能为空" };
      return;
    }

    let user = await models.User.findOne({
      where: { username: username, enabled: true },
      include: [
        {
          model: models.Department,
          attributes: ["id", "name", "orgId"],
        },
        {
          model: models.Organization,
          attributes: ["id", "name"],
        },
        {
          model: models.TypePost,
          attributes: ["id", "name", "code"],
        },
        {
          model: models.Role,
          through: { attributes: [] },
          include: [
            {
              model: models.RoleGroup,
              attributes: ["id", "name"],
            },
            {
              model: models.Resource,
              through: { attributes: [] },
              attributes: ["code", "name"],
              required: false,
            },
            {
              model: models.Project,
              through: { attributes: [] },
              attributes: ["id", "name"],
              required: false,
            },
          ],
        },
      ],
    });

    if (!user) {
      user = await models.User.findOne({
        where: { name: username, enabled: true },
        include: [
          {
            model: models.Department,
            attributes: ["id", "name", "orgId"],
          },
          {
            model: models.Organization,
            attributes: ["id", "name"],
          },
          {
            model: models.TypePost,
            attributes: ["id", "name", "code"],
          },
          {
            model: models.Role,
            through: { attributes: [] },
            include: [
              {
                model: models.RoleGroup,
                attributes: ["id", "name"],
              },
              {
                model: models.Resource,
                through: { attributes: [] },
                attributes: ["code", "name"],
                required: false,
              },
              {
                model: models.Project,
                through: { attributes: [] },
                attributes: ["id", "name"],
                required: false,
              },
            ],
          },
        ],
      });
    }

    if (!user) {
      ctx.status = 400;
      ctx.body = { message: "用户不存在或已被禁用" };
      return;
    }

    // 验证密码
    const hashedPassword = MD5(password).toString(Hex);
    if (user.password !== hashedPassword) {
      ctx.status = 400;
      ctx.body = { message: "密码错误" };
      return;
    }

    // 生成token
    const token = uuid.v4();
    const expired = moment().add(24, "hours").toDate();

    const allResources = new Set();
    const projectMap = new Map();
    if (user.roles && user.roles.length > 0) {
      user.roles.forEach((role) => {
        if (role.resources && role.resources.length > 0) {
          role.resources.forEach((resource) => {
            allResources.add(resource.code);
          });
        }
        if (role.projects && role.projects.length > 0) {
          role.projects.forEach((project) => {
            if (!projectMap.has(project.id)) {
              projectMap.set(project.id, {
                id: project.id,
                name: project.name,
              });
            }
          });
        }
      });
    }
    const resources = Array.from(allResources);
    const roleNames =
      user.roles && user.roles.length > 0
        ? user.roles.map((role) => role.name)
        : [];
    let userProjects = Array.from(projectMap.values());

    const depName = user.department ? user.department.name || "" : "";
    const roleGroupNames =
      (user.roles || [])
        .map((r) => (r.roleGroup ? r.roleGroup.name : ""))
        .filter(Boolean) || [];
    const isExternal =
      depName === "外部注册用户" || roleGroupNames.includes("外部注册用户");
    const userType = isExternal ? "external" : "internal";
    if (isExternal) {
      const ownProjects = await models.Project.findAll({
        where: { createBy: user.id },
        attributes: ["id", "name"],
      });
      userProjects = ownProjects.map((p) => ({ id: p.id, name: p.name }));
    } else {
      const allProjects = await models.Project.findAll({
        attributes: ["id", "name"],
      });
      userProjects = allProjects.map((p) => ({ id: p.id, name: p.name }));
    }

    const userInfo = {
      token: token,
      id: user.id,
      name: user.name,
      username: user.username,
      orgId: user.orgId,
      depId: user.depId,
      postId: user.postId,
      orgRole: user.orgRole,
      userType,
      department: user.department
        ? [
            {
              id: user.department.id,
              name: user.department.name,
              orgId: user.department.orgId,
            },
          ]
        : null,
      organization: user.organization
        ? [
            {
              id: user.organization.id,
              name: user.organization.name,
            },
          ]
        : null,
      typePost: user.typePost
        ? [
            {
              id: user.typePost.id,
              name: user.typePost.name,
              code: user.typePost.code,
            },
          ]
        : null,
      projects: userProjects,
      roles:
        user.roles && user.roles.length > 0
          ? user.roles.map((role) => ({
              id: role.id,
              name: role.name,
              portal: role.portal,
              group: role.roleGroup
                ? {
                    id: role.roleGroup.id,
                    name: role.roleGroup.name,
                  }
                : null,
            }))
          : [],
    };

    // 保存token（包含完整信息用于后续验证）
    await models.UserToken.create({
      token: token,
      userInfo: userInfo,
      expired: expired,
    });

    ctx.status = 200;
    ctx.body = {
      authorized: true,
      token: token,
      userInfo: userInfo,
      resources: resources, // 资源权限与userInfo同级
      roleNames: roleNames, // 用户所有角色名称
      expired: expired,
    };
  } catch (error) {
    ctx.fs.logger.error(`登录失败: ${error}`);
    ctx.status = 500;
    ctx.body = { message: "登录失败，请稍后重试" };
  }
}

/**
 * 用户登出
 */
async function logout(ctx) {
  try {
    const models = ctx.fs.dc.models;
    const { token } = ctx.request.body;

    if (token) {
      await models.UserToken.destroy({
        where: { token: token },
      });
    }

    ctx.status = 200;
    ctx.body = { message: "登出成功" };
  } catch (error) {
    ctx.fs.logger.error(`登出失败: ${error}`);
    ctx.status = 500;
    ctx.body = { message: "登出失败" };
  }
}

/**
 * 验证token并获取用户信息
 */
async function verifyToken(ctx) {
  try {
    const models = ctx.fs.dc.models;
    const token = ctx.request.headers.authorization
      ? ctx.request.headers.authorization.replace("Bearer ", "")
      : null;

    if (!token) {
      ctx.status = 401;
      ctx.body = { message: "Token不能为空" };
      return;
    }

    const userToken = await models.UserToken.findOne({
      where: {
        token: token,
        expired: {
          [Op.gt]: new Date(),
        },
      },
    });

    if (!userToken) {
      ctx.status = 401;
      ctx.body = { message: "Token无效或已过期" };
      return;
    }

    ctx.status = 200;
    ctx.body = {
      valid: true,
      userInfo: userToken.userInfo,
      expired: userToken.expired,
    };
  } catch (error) {
    ctx.fs.logger.error(`Token验证失败: ${error}`);
    ctx.status = 500;
    ctx.body = { message: "Token验证失败" };
  }
}

/**
 * 刷新token
 */
async function refreshToken(ctx) {
  try {
    const models = ctx.fs.dc.models;
    const token = ctx.request.headers.authorization
      ? ctx.request.headers.authorization.replace("Bearer ", "")
      : null;

    if (!token) {
      ctx.status = 401;
      ctx.body = { message: "Token不能为空" };
      return;
    }

    const userToken = await models.UserToken.findOne({
      where: { token: token },
    });

    if (!userToken) {
      ctx.status = 401;
      ctx.body = { message: "Token无效" };
      return;
    }

    // 生成新token
    const newToken = uuid.v4();
    const newExpired = moment().add(24, "hours").toDate();

    // 更新token
    await userToken.update({
      token: newToken,
      expired: newExpired,
    });

    ctx.status = 200;
    ctx.body = {
      token: newToken,
      expired: newExpired,
    };
  } catch (error) {
    ctx.fs.logger.error(`Token刷新失败: ${error}`);
    ctx.status = 500;
    ctx.body = { message: "Token刷新失败" };
  }
}

/**
 * 修改密码
 */
async function changePassword(ctx) {
  try {
    const models = ctx.fs.dc.models;
    const { oldPassword, newPassword } = ctx.request.body;
    const userInfo = ctx.state.user; // 从中间件获取用户信息

    if (!oldPassword || !newPassword) {
      ctx.status = 400;
      ctx.body = { message: "旧密码和新密码不能为空" };
      return;
    }

    const user = await models.User.findByPk(userInfo.id);
    if (!user) {
      ctx.status = 404;
      ctx.body = { message: "用户不存在" };
      return;
    }

    // 验证旧密码
    const hashedOldPassword = MD5(oldPassword).toString(Hex);
    if (user.password !== hashedOldPassword) {
      ctx.status = 400;
      ctx.body = { message: "旧密码错误" };
      return;
    }

    // 更新密码
    const hashedNewPassword = MD5(newPassword).toString(Hex);
    await user.update({ password: hashedNewPassword });

    ctx.status = 200;
    ctx.body = { message: "密码修改成功" };
  } catch (error) {
    ctx.fs.logger.error(`修改密码失败: ${error}`);
    ctx.status = 500;
    ctx.body = { message: "修改密码失败" };
  }
}

/**
 * 获取用户信息
 */
async function getUserInfo(ctx) {
  try {
    const models = ctx.fs.dc.models;
    const token = ctx.request.headers.authorization
      ? ctx.request.headers.authorization.replace("Bearer ", "")
      : null;

    if (!token) {
      ctx.status = 401;
      ctx.body = { message: "Token不能为空" };
      return;
    }

    const userToken = await models.UserToken.findOne({
      where: {
        token: token,
        expired: {
          [Op.gt]: new Date(),
        },
      },
    });

    if (!userToken) {
      ctx.status = 401;
      ctx.body = { message: "Token无效或已过期" };
      return;
    }

    ctx.status = 200;
    ctx.body = {
      success: true,
      data: userToken.userInfo,
    };
  } catch (error) {
    ctx.fs.logger.error(`获取用户信息失败: ${error}`);
    ctx.status = 500;
    ctx.body = { message: "获取用户信息失败" };
  }
}

async function register(ctx) {
  let transaction;
  try {
    const models = ctx.fs.dc.models;
    const { username, password, name } = ctx.request.body || {};

    const asciiNoSpace = /^[\x21-\x7E]{1,50}$/;
    const noCn = /^[^\u4e00-\u9fa5]{1,50}$/;

    const nameOk =
      typeof name === "string" && name.length > 0 && name.length <= 50;
    const usernameOk =
      typeof username === "string" &&
      username.length > 0 &&
      username.length <= 50 &&
      asciiNoSpace.test(username) &&
      noCn.test(username);
    const passwordOk =
      typeof password === "string" &&
      password.length > 0 &&
      password.length <= 50 &&
      asciiNoSpace.test(password) &&
      noCn.test(password);

    if (!nameOk) {
      ctx.status = 400;
      ctx.body = { message: "用户名限五十个字符" };
      return;
    }
    if (!usernameOk) {
      ctx.status = 400;
      ctx.body = {
        message: "账号限制五十个英文、数字及特殊字符，不能包含空格和中文",
      };
      return;
    }
    if (!passwordOk) {
      ctx.status = 400;
      ctx.body = {
        message: "密码限制五十个英文、数字及特殊字符，不能包含空格和中文",
      };
      return;
    }

    transaction = await ctx.fs.dc.orm.transaction();
    const exist = await models.User.findOne({
      // Older registration swapped display name and account. Login retains a
      // fallback for those records, so reserve both account representations.
      where: { [Op.or]: [{ username: username }, { name: username }] },
      transaction,
    });
    if (exist) {
      await transaction.rollback();
      ctx.status = 409;
      ctx.body = { message: "该账号已存在" };
      return;
    }

    const org = (await models.Organization.findOne({ transaction })) || null;
    if (!org) {
      await transaction.rollback();
      ctx.status = 400;
      ctx.body = { message: "系统未初始化组织，请联系管理员" };
      return;
    }

    let dept = await models.Department.findOne({
      where: { name: "外部注册用户", orgId: org.id },
      transaction,
    });
    if (!dept) {
      let newDeptSortIndex = 1;
      const maxDeptSort = await models.Department.findOne({
        where: { orgId: org.id },
        attributes: [
          [
            models.Department.sequelize.fn(
              "MAX",
              models.Department.sequelize.col("sort_index")
            ),
            "maxSortIndex",
          ],
        ],
        transaction,
        raw: true,
      });
      if (maxDeptSort && maxDeptSort.maxSortIndex !== null) {
        newDeptSortIndex = maxDeptSort.maxSortIndex + 1;
      }
      dept = await models.Department.create(
        { name: "外部注册用户", orgId: org.id, sortIndex: newDeptSortIndex },
        { transaction }
      );
    }

    let group = await models.RoleGroup.findOne({
      where: { name: "外部注册用户", orgId: org.id },
      transaction,
    });
    if (!group) {
      group = await models.RoleGroup.create(
        { name: "外部注册用户", orgId: org.id },
        { transaction }
      );
    }

    let role = await models.Role.findOne({
      where: { name: "外部注册用户", groupId: group.id },
      transaction,
    });
    if (!role) {
      role = await models.Role.create(
        { name: "外部注册用户", portal: "CC", groupId: group.id },
        { transaction }
      );
    }

    const extRoleResourceCodes = [
      "DEVICELISTVIEWDETAILS",
      "VIEWDEVICELIST",
      "VIEWSUBDEVICES",
      "ADDSUBDEVICES",
      "ADDTAGS",
      "BATCHDISTRIBUTION",
      "CHANNELCONFIGURATIONISSUANCE",
      "CLEARALLCHANNELS",
      "DELETESUBDEVICES",
      "DEVICEINSTALLATIONDIAGRAM",
      "DEVICEPARAMETERCONFIGURATION",
      "DIAGNOSTICDATA",
      "HISTORYOFISSUANCE",
      "ISSUETHECOMMAND",
      "MODIFYSUBDEVICES",
      "UNIFIEDDISTRIBUTIONOFCONFIGURATION",
      "PROJECTMANAGEMENT",
      "VIEWPROJECTDATA",
      "ADDPROJECT",
      "EDITPROJECT",
      "DELETEPROJECT",
      "SYSTEMMANAGEMENT",
      "DEVICELIST",
      "DEVICE",
    ];
    const availableResources = await models.Resource.findAll({
      where: { code: { [Op.in]: extRoleResourceCodes } },
      attributes: ["code"],
      transaction,
    });
    const availableCodes = new Set(availableResources.map((r) => r.code));
    const existedRoleRes = await models.RoleResource.findAll({
      where: { roleId: role.id },
      attributes: ["resourceId"],
      transaction,
    });
    const existedCodes = new Set(existedRoleRes.map((r) => r.resourceId));
    const toBind = Array.from(availableCodes)
      .filter((code) => !existedCodes.has(code))
      .map((code) => ({ roleId: role.id, resourceId: code }));
    if (toBind.length > 0) {
      await models.RoleResource.bulkCreate(toBind, { transaction });
    }

    // 职位：一般成员
    let post = await models.TypePost.findOne({
      where: { name: "一般成员" },
      transaction,
    });
    if (!post) {
      post = await models.TypePost.findOne({ transaction });
    }
    if (!post) {
      await transaction.rollback();
      ctx.status = 400;
      ctx.body = { message: "系统未初始化职位，请联系管理员" };
      return;
    }

    const hashed = MD5(password).toString(Hex);
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
      transaction,
      raw: true,
    });
    if (maxSortIndexUser && maxSortIndexUser.maxSortIndex !== null) {
      nextSortIndex = maxSortIndexUser.maxSortIndex + 1;
    }
    const newUser = await models.User.create(
      {
        name: name,
        username: username,
        password: hashed,
        orgId: org.id,
        depId: dept.id,
        postId: post.id,
        enabled: true,
        regTime: new Date(),
        sortIndex: nextSortIndex,
      },
      { transaction }
    );

    await models.UserRole.create(
      { userId: newUser.id, roleId: role.id },
      { transaction }
    );

    await transaction.commit();
    ctx.status = 201;
    ctx.body = { message: "注册成功" };
  } catch (error) {
    if (transaction && !transaction.finished) {
      try {
        await transaction.rollback();
      } catch (rollbackError) {
        ctx.fs.logger.error(`注册事务回滚失败: ${rollbackError.name}`);
      }
    }
    const code = (error.original && error.original.code) || (error.parent && error.parent.code) || error.code;
    ctx.fs.logger.error(`注册失败: ${error.name}, code=${code || "unknown"}`);
    if (error.name === "SequelizeUniqueConstraintError") {
      ctx.status = 409;
      ctx.body = { message: "账号或注册信息已存在，请检查后重试" };
    } else if (/Connection|Acquire.*Timeout/.test(error.name) ||
               ["ETIMEDOUT", "ECONNREFUSED", "EHOSTUNREACH", "57014", "55P03", "40P01"].includes(code)) {
      ctx.status = 503;
      ctx.body = { message: "注册服务暂不可用，请检查数据库连接或稍后重试" };
    } else {
      ctx.status = 500;
      ctx.body = { message: "注册失败，请稍后重试" };
    }
  }
}

module.exports = {
  login,
  logout,
  verifyToken,
  refreshToken,
  changePassword,
  getUserInfo,
  register,
};
