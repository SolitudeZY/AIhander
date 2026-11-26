"use strict";
const { Op } = require("sequelize");

/**
 * 获取权限列表
 */
async function getResources(ctx) {
  try {
    const models = ctx.fs.dc.models;

    const resources = await models.Resource.findAll({
      attributes: ["code", "name", "parent_resource"],
      required: false,
      order: [["code", "ASC"]],
    });

    ctx.status = 200;
    ctx.body = {
      data: resources,
    };
  } catch (error) {
    ctx.fs.logger.error(`获取资源列表失败: ${error}`);
    ctx.status = 500;
    ctx.body = { message: "获取资源列表失败" };
  }
}

/**
 * 获取资源树
 */
async function getResourceTree(ctx) {
  try {
    const models = ctx.fs.dc.models;
    const { type } = ctx.query;

    const whereCondition = {};
    if (type) {
      whereCondition.type = type;
    }

    const resources = await models.Resource.findAll({
      where: whereCondition,
      order: [
        ["sortIndex", "ASC"],
        ["id", "ASC"],
      ],
    });

    // 构建树形结构
    const buildTree = (items, parentId = null) => {
      return items
        .filter((item) => item.parentId === parentId)
        .map((item) => ({
          ...item.toJSON(),
          children: buildTree(items, item.id),
        }));
    };

    const tree = buildTree(resources);

    ctx.status = 200;
    ctx.body = { data: tree };
  } catch (error) {
    ctx.fs.logger.error(`获取资源树失败: ${error}`);
    ctx.status = 500;
    ctx.body = { message: "获取资源树失败" };
  }
}

/**
 * 获取资源详情
 */
async function getResource(ctx) {
  try {
    const models = ctx.fs.dc.models;
    const { id } = ctx.params;

    const resource = await models.Resource.findByPk(id, {
      include: [
        {
          model: models.Resource,
          as: "parent",
          attributes: ["id", "name", "code"],
          required: false,
        },
        {
          model: models.Resource,
          as: "children",
          attributes: ["id", "name", "code", "type"],
          required: false,
        },
        {
          model: models.Role,
          attributes: ["id", "name", "portal"],
          through: { attributes: [] },
          required: false,
        },
      ],
    });

    if (!resource) {
      ctx.status = 404;
      ctx.body = { message: "资源不存在" };
      return;
    }

    ctx.status = 200;
    ctx.body = { data: resource };
  } catch (error) {
    ctx.fs.logger.error(`获取资源详情失败: ${error}`);
    ctx.status = 500;
    ctx.body = { message: "获取资源详情失败" };
  }
}

/**
 * 创建资源
 */
async function createResource(ctx) {
  try {
    const models = ctx.fs.dc.models;
    const resourceData = ctx.request.body;

    const resource = await models.Resource.create(resourceData);

    ctx.status = 201;
    ctx.body = {
      message: "资源创建成功",
      data: resource,
    };
  } catch (error) {
    ctx.fs.logger.error(`创建资源失败: ${error}`);
    ctx.status = 500;
    ctx.body = { message: "创建资源失败" };
  }
}

/**
 * 更新资源
 */
async function updateResource(ctx) {
  try {
    const models = ctx.fs.dc.models;
    const { id } = ctx.params;
    const resourceData = ctx.request.body;

    const resource = await models.Resource.findByPk(id);
    if (!resource) {
      ctx.status = 404;
      ctx.body = { message: "资源不存在" };
      return;
    }

    await resource.update(resourceData);

    ctx.status = 200;
    ctx.body = {
      message: "资源更新成功",
      data: resource,
    };
  } catch (error) {
    ctx.fs.logger.error(`更新资源失败: ${error}`);
    ctx.status = 500;
    ctx.body = { message: "更新资源失败" };
  }
}

/**
 * 删除资源
 */
async function deleteResource(ctx) {
  try {
    const models = ctx.fs.dc.models;
    const { id } = ctx.params;

    const resource = await models.Resource.findByPk(id);
    if (!resource) {
      ctx.status = 404;
      ctx.body = { message: "资源不存在" };
      return;
    }

    await resource.destroy();

    ctx.status = 200;
    ctx.body = { message: "资源删除成功" };
  } catch (error) {
    ctx.fs.logger.error(`删除资源失败: ${error}`);
    ctx.status = 500;
    ctx.body = { message: "删除资源失败" };
  }
}

/**
 * 批量删除资源
 */
async function batchDeleteResources(ctx) {
  try {
    const models = ctx.fs.dc.models;
    const { ids } = ctx.request.body;

    await models.Resource.destroy({
      where: {
        id: {
          [Op.in]: ids,
        },
      },
    });

    ctx.status = 200;
    ctx.body = { message: "批量删除资源成功" };
  } catch (error) {
    ctx.fs.logger.error(`批量删除资源失败: ${error}`);
    ctx.status = 500;
    ctx.body = { message: "批量删除资源失败" };
  }
}

/**
 * 获取角色权限列表
 */
async function getResourceRoles(ctx) {
  try {
    const models = ctx.fs.dc.models;
    const { id } = ctx.params;

    const role = await models.Role.findByPk(id);
    if (!role) {
      ctx.status = 404;
      ctx.body = { message: "角色不存在" };
      return;
    }

    const resources = await models.Resource.findAll({
      include: [
        {
          model: models.Role,
          where: { id: id },
          through: { attributes: [] },
          attributes: [],
        },
      ],
    });

    ctx.status = 200;
    ctx.body = {
      data: resources,
    };
  } catch (error) {
    ctx.fs.logger.error(`获取角色权限列表失败: ${error}`);
    ctx.status = 500;
    ctx.body = { message: "获取角色权限列表失败" };
  }
}

module.exports = {
  getResources,
  getResourceTree,
  getResource,
  createResource,
  updateResource,
  deleteResource,
  batchDeleteResources,
  getResourceRoles,
};
