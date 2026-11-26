"use strict";
const { Op } = require("sequelize");

/**
 * 获取角色列表
 */
async function getRoles(ctx) {
  try {
    const models = ctx.fs.dc.models;
    const { page = 1, pageSize = 10, groupId, portal, keyword } = ctx.query;
    const p = parseInt(page) || 1;
    const size = Math.min(parseInt(pageSize) || 10, 100);

    const whereCondition = {};
    if (groupId) {
      whereCondition.groupId = groupId;
    }
    if (portal) {
      whereCondition.portal = portal;
    }
    if (keyword) {
      whereCondition[Op.or] = [
        { name: { [Op.like]: `%${keyword}%` } },
        { description: { [Op.like]: `%${keyword}%` } },
      ];
    }

    const { count, rows } = await models.Role.findAndCountAll({
      where: whereCondition,
      attributes: ["id", "name", "portal"],
      include: [
        {
          model: models.RoleGroup,
          attributes: ["id", "name"],
          required: false,
        },
        {
          model: models.Resource,
          attributes: ["id", "name", "code", "type"],
          through: { attributes: [] },
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
    ctx.fs.logger.error(`获取角色列表失败: ${error}`);
    ctx.status = 500;
    ctx.body = { message: "获取角色列表失败" };
  }
}

/**
 * 获取角色详情
 */
async function getRole(ctx) {
  try {
    const models = ctx.fs.dc.models;
    const { id } = ctx.params;

    const role = await models.Role.findByPk(id, {
      include: [
        {
          model: models.RoleGroup,
          attributes: ["id", "name"],
          required: false,
        },
        {
          model: models.Resource,
          attributes: ["id", "name", "code", "type", "path"],
          through: { attributes: [] },
          required: false,
        },
      ],
    });

    if (!role) {
      ctx.status = 404;
      ctx.body = { message: "角色不存在" };
      return;
    }

    ctx.status = 200;
    ctx.body = { data: role };
  } catch (error) {
    ctx.fs.logger.error(`获取角色详情失败: ${error}`);
    ctx.status = 500;
    ctx.body = { message: "获取角色详情失败" };
  }
}

/**
 * 创建角色
 */
async function createRole(ctx) {
  let error = { name: "CreateError", message: "角色新增失败" };
  let newId = null;
  const { name, groupId } = ctx.request.body;
  const transaction = await ctx.fs.dc.orm.transaction();
  try {
    const models = ctx.fs.dc.models;
    if (!groupId || !name) {
      error = { name: "CreateError", message: `请求参数错误！` };
      ctx.throw(400);
    }
    let groupRole = await models.RoleGroup.findOne({
      where: { id: Number(groupId) },
    });
    if (groupRole) {
      const orgGroups = await models.RoleGroup.findAll({
        where: { orgId: groupRole.orgId },
      });
      const orgGroupIds = orgGroups.map((v) => v.id);
      //检查其他记录名称是否重复
      let hasName = await models.Role.findOne({
        where: { name: name, groupId: { $in: orgGroupIds } },
      });
      if (hasName) {
        error = { name: "CreateError", message: `角色名称已存在` };
        ctx.throw(400);
      }
      const newRole = await models.Role.create(
        {
          groupId: Number(groupId),
          name: name,
          portal: "CC",
        },
        { transaction }
      );
      newId = newRole.id;

      await transaction.commit();
      error = null;
    } else {
      error = { name: "NotFound", message: `不存在{id=${groupId}}的角色组` };
      ctx.throw(400);
    }
  } catch (err) {
    await transaction.rollback();
    ctx.fs.logger.error(`path: ${ctx.path}, error: ${err}`);
  }

  if (error) {
    ctx.status = 400;
    ctx.body = error;
  } else {
    ctx.status = 200;
    ctx.body = { id: newId };
  }
}

/**
 * 更新角色
 */
async function updateRole(ctx) {
  let error = { name: "UpdateError", message: "角色修改失败" };
  const { id: roleId } = ctx.params;
  const { name, groupId } = ctx.request.body;
  const transaction = await ctx.fs.dc.orm.transaction();

  try {
    const models = ctx.fs.dc.models;
    let role = await models.Role.findOne({
      where: { id: Number(roleId) },
    });

    if (role) {
      let groupRole = await models.RoleGroup.findOne({
        where: { id: groupId },
      });
      if (!groupRole) {
        error = { name: "UpdateError", message: `角色组不存在` };
        ctx.throw(400);
      }
      const orgGroups = await models.RoleGroup.findAll({
        where: { orgId: groupRole.orgId },
      });
      const orgGroupIds = orgGroups.map((v) => v.id);
      //检查其他记录名称是否重复
      let hasName = await models.Role.findOne({
        where: {
          name: name,
          groupId: { $in: orgGroupIds },
          id: { $not: Number(roleId) },
        },
      });
      if (hasName) {
        error = { name: "UpdateError", message: `角色名称已存在` };
        ctx.throw(400);
      }

      await models.Role.update(
        { name, groupId },
        {
          where: { id: Number(roleId) },
          transaction,
        }
      );

      await transaction.commit();
      error = null;
    } else {
      error = { name: "NotFound", message: `不存在{id=${roleId}}的角色` };
    }
  } catch (err) {
    await transaction.rollback();
    ctx.fs.logger.error(`path: ${ctx.path}, error: ${err}`);
  }

  if (error) {
    ctx.status = 400;
    ctx.body = error;
  } else {
    ctx.status = 204;
  }
}

/**
 * 删除角色
 */
async function deleteRole(ctx) {
  let error = { name: "DeleteError", message: "角色删除失败" };
  const { id: roleId } = ctx.params;
  const transaction = await ctx.fs.dc.orm.transaction();
  try {
    const models = ctx.fs.dc.models;

    let role = await models.Role.findOne({
      where: { id: roleId },
    });
    if (role) {
      await models.RoleResource.destroy({
        where: { roleId: roleId },
        transaction,
      });
      await models.UserRole.destroy({ where: { roleId: roleId }, transaction });
      await models.Role.destroy({ where: { id: roleId }, transaction });

      await transaction.commit();
      error = null;
    } else {
      error = { name: "NotFound", message: `不存在{id=${roleId}}的角色` };
    }
  } catch (err) {
    await transaction.rollback();
    ctx.fs.logger.error(`path: ${ctx.path}, error: ${err}`);
  }
  if (error) {
    ctx.status = 400;
    ctx.body = error;
  } else {
    ctx.status = 204;
  }
}

/**
 * 获取角色用户列表
 */
async function getRoleUsers(ctx) {
  try {
    const models = ctx.fs.dc.models;
    const { id } = ctx.params;
    const { page = 1, pageSize = 10 } = ctx.query;

    const role = await models.Role.findByPk(id);
    if (!role) {
      ctx.status = 404;
      ctx.body = { message: "角色不存在" };
      return;
    }

    const { count, rows } = await models.User.findAndCountAll({
      include: [
        {
          model: models.Role,
          where: { id },
          through: { attributes: [] },
          attributes: [],
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
    ctx.fs.logger.error(`获取角色用户列表失败: ${error}`);
    ctx.status = 500;
    ctx.body = { message: "获取角色用户列表失败" };
  }
}

//修改角色关联用户
async function updateRoleUsers(ctx) {
  let error = { name: "updateError", message: "修改角色关联用户失败" };
  let { roleId } = ctx.params;
  const models = ctx.fs.dc.models;
  const { userIds } = ctx.request.body;
  const transaction = await ctx.fs.dc.orm.transaction();
  try {
    const role = await models.Role.findOne({ where: { id: roleId } });
    if (!role) {
      error = { name: "UpdateError", message: `角色不存在` };
      ctx.throw(400);
    }
    await models.UserRole.destroy({ where: { roleId: roleId }, transaction });

    const dataToSave = userIds.map((v) => {
      return {
        roleId: roleId,
        userId: v,
      };
    });

    await models.UserRole.bulkCreate(dataToSave, { transaction });

    error = null;
    await transaction.commit();
  } catch (e) {
    await transaction.rollback();
    ctx.fs.logger.error(`path: ${ctx.path}, error: ${e}`);
  }

  if (error) {
    ctx.status = 400;
    ctx.body = error;
  } else {
    ctx.status = 204;
  }
}

//删除角色关联用户
async function delRoleUsers(ctx) {
  let error = { name: "updateError", message: "删除角色关联用户失败" };
  let { roleId } = ctx.params;
  const models = ctx.fs.dc.models;
  const { userIds } = ctx.request.body;
  try {
    const role = await models.Role.findOne({ where: { id: roleId } });
    if (!role) {
      error = { name: "UpdateError", message: `角色不存在` };
      ctx.throw(400);
    }
    await models.UserRole.destroy({
      where: { roleId: roleId, userId: { $in: userIds } },
    });
    error = null;
  } catch (e) {
    ctx.fs.logger.error(`path: ${ctx.path}, error: ${e}`);
  }

  if (error) {
    ctx.status = 400;
    ctx.body = error;
  } else {
    ctx.status = 204;
  }
}

// 修改角色权限
async function updateAuth(ctx) {
  let error = { name: "updateError", message: "修改角色权限失败" };
  let { roleId } = ctx.params;
  const models = ctx.fs.dc.models;
  const { resources } = ctx.request.body;
  const transaction = await ctx.fs.dc.orm.transaction();
  try {
    const role = await models.Role.findOne({ where: { id: roleId } });
    if (!role) {
      error = { name: "UpdateError", message: `角色不存在` };
      ctx.throw(400);
    }
    await models.RoleResource.destroy({
      where: { roleId: roleId },
      transaction,
    });

    const dataToSave = resources.map((s) => {
      return {
        roleId: roleId,
        resourceId: s,
      };
    });

    await models.RoleResource.bulkCreate(dataToSave, { transaction });

    error = null;
    await transaction.commit();
  } catch (e) {
    await transaction.rollback();
    ctx.fs.logger.error(`path: ${ctx.path}, error: ${e}`);
  }

  if (error) {
    ctx.status = 400;
    ctx.body = error;
  } else {
    ctx.status = 204;
  }
}

module.exports = {
  getRoles,
  getRole,
  createRole,
  updateRole,
  deleteRole,
  getRoleUsers,
  updateRoleUsers,
  delRoleUsers,
  updateAuth,
};
