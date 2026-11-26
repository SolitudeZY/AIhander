"use strict";
const { Op } = require("sequelize");

/**
 * 获取部门列表
 */
async function getDepartments(ctx) {
  try {
    const models = ctx.fs.dc.models;
    const { page = 1, pageSize = 10, name, orgId } = ctx.query;
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

    const { count, rows } = await models.Department.findAndCountAll({
      where: whereCondition,
      attributes: ["id", "name", "orgId", "parentId", "sortIndex"],
      include: [
        {
          model: models.Organization,
          attributes: ["id", "name"],
        },
        {
          model: models.User,
          as: "members",
          attributes: ["id", "name", "username"],
          where: { enabled: true },
          required: false,
        },
      ],
      limit: size,
      offset: (p - 1) * size,
      distinct: true,
      subQuery: false,
      order: [
        ["sortIndex", "ASC"],
        ["id", "ASC"],
      ],
    });

    ctx.status = 200;
    ctx.body = {
      data: rows,
      total: count,
      page: p,
      pageSize: size,
    };
  } catch (error) {
    ctx.fs.logger.error(`获取部门列表失败: ${error}`);
    ctx.status = 500;
    ctx.body = { message: "获取部门列表失败" };
  }
}

/**
 * 获取部门详情
 */
async function getDepartment(ctx) {
  try {
    const models = ctx.fs.dc.models;
    const { id } = ctx.params;

    const department = await models.Department.findByPk(id, {
      include: [
        {
          model: models.Organization,
          attributes: ["id", "name"],
        },
        {
          model: models.User,
          as: "members",
          attributes: ["id", "name", "username", "orgRole"],
          include: [
            {
              model: models.TypePost,
              attributes: ["id", "name", "code"],
            },
          ],
        },
      ],
    });

    if (!department) {
      ctx.status = 404;
      ctx.body = { message: "部门不存在" };
      return;
    }

    ctx.status = 200;
    ctx.body = department;
  } catch (error) {
    ctx.fs.logger.error(`获取部门详情失败: ${error}`);
    ctx.status = 500;
    ctx.body = { message: "获取部门详情失败" };
  }
}

/**
 * 创建部门
 */
async function createDepartment(ctx) {
  const transaction = await ctx.fs.dc.orm.transaction();
  try {
    const models = ctx.fs.dc.models;
    const { name, orgId, parentId } = ctx.request.body;

    if (!name || !orgId) {
      ctx.status = 400;
      ctx.body = { message: "部门名称和组织ID不能为空" };
      return;
    }

    // 检查组织是否存在
    const organization = await models.Organization.findByPk(orgId);
    if (!organization) {
      ctx.status = 400;
      ctx.body = { message: "指定的组织不存在" };
      return;
    }

    // 检查同一组织下部门名称是否已存在
    const existingDept = await models.Department.findOne({
      where: { name: name, orgId: orgId },
    });

    if (existingDept) {
      ctx.status = 400;
      ctx.body = { message: "该组织下部门名称已存在" };
      return;
    }

    // 获取同一组织下当前最大的 sortIndex 值
    const maxSortIndexResult = await models.Department.findOne({
      where: { orgId: orgId },
      attributes: [
        [
          ctx.fs.dc.orm.fn("MAX", ctx.fs.dc.orm.col("sort_index")),
          "maxSortIndex",
        ],
      ],
      raw: true,
    });

    // 计算新的 sortIndex，如果没有现有部门则从 1 开始，否则在最大值基础上加 1
    const newSortIndex = (maxSortIndexResult.maxSortIndex || 0) + 1;

    const department = await models.Department.create(
      {
        name: name,
        orgId: orgId,
        parentId: parentId || null,
        sortIndex: newSortIndex,
      },
      { transaction }
    );

    await transaction.commit();

    // 返回包含关联信息的部门数据
    const result = await models.Department.findByPk(department.id, {
      include: [
        {
          model: models.Organization,
          attributes: ["id", "name"],
        },
      ],
    });

    ctx.status = 201;
    ctx.body = result;
  } catch (error) {
    await transaction.rollback();
    ctx.fs.logger.error(`创建部门失败: ${error}`);
    ctx.status = 500;
    ctx.body = { message: "创建部门失败" };
  }
}

/**
 * 更新部门
 */
async function updateDepartment(ctx) {
  const transaction = await ctx.fs.dc.orm.transaction();
  try {
    const models = ctx.fs.dc.models;
    const { id } = ctx.params;
    const { name, sortIndex } = ctx.request.body;

    if (!name) {
      ctx.status = 400;
      ctx.body = { message: "部门名称不能为空" };
      return;
    }

    const department = await models.Department.findByPk(id);
    if (!department) {
      ctx.status = 404;
      ctx.body = { message: "部门不存在" };
      return;
    }

    // 检查同一组织下部门名称是否已存在（排除当前部门）
    const existingDept = await models.Department.findOne({
      where: {
        name: name,
        orgId: department.orgId,
        id: { [Op.ne]: id },
      },
    });

    if (existingDept) {
      ctx.status = 400;
      ctx.body = { message: "该组织下部门名称已存在" };
      return;
    }

    await department.update(
      {
        name: name,
        sortIndex: sortIndex !== undefined ? sortIndex : department.sortIndex,
      },
      { transaction }
    );

    await transaction.commit();

    // 返回包含关联信息的部门数据
    const result = await models.Department.findByPk(id, {
      include: [
        {
          model: models.Organization,
          attributes: ["id", "name"],
        },
      ],
    });

    ctx.status = 200;
    ctx.body = result;
  } catch (error) {
    await transaction.rollback();
    ctx.fs.logger.error(`更新部门失败: ${error}`);
    ctx.status = 500;
    ctx.body = { message: "更新部门失败" };
  }
}

/**
 * 删除部门
 */
async function deleteDepartment(ctx) {
  const transaction = await ctx.fs.dc.orm.transaction();
  try {
    const models = ctx.fs.dc.models;
    const { id } = ctx.params;

    const department = await models.Department.findByPk(id);
    if (!department) {
      ctx.status = 404;
      ctx.body = { message: "部门不存在" };
      return;
    }

    // 检查是否有关联的用户
    const userCount = await models.User.count({
      where: { depId: id },
    });

    if (userCount > 0) {
      ctx.status = 400;
      ctx.body = { message: "该部门下还有用户，无法删除" };
      return;
    }

    await department.destroy({ transaction });
    await transaction.commit();

    ctx.status = 200;
    ctx.body = { message: "删除成功" };
  } catch (error) {
    await transaction.rollback();
    ctx.fs.logger.error(`删除部门失败: ${error}`);
    ctx.status = 500;
    ctx.body = { message: "删除部门失败" };
  }
}

/**
 * 获取部门树形结构
 */
async function getDepartmentTree(ctx) {
  try {
    const models = ctx.fs.dc.models;
    const { orgId } = ctx.query;

    const whereCondition = {};
    if (orgId) {
      whereCondition.orgId = orgId;
    }

    const departments = await models.Department.findAll({
      where: whereCondition,
      include: [
        {
          model: models.Organization,
          attributes: ["id", "name"],
        },
        {
          model: models.User,
          as: "members",
          attributes: ["id", "name", "username"],
          where: { enabled: true },
          required: false,
        },
      ],
      order: [
        ["sortIndex", "ASC"],
        ["id", "ASC"],
      ],
    });

    // 构建树形结构
    const buildTree = (departments, parentId = null) => {
      return departments
        .filter((dept) => dept.parentId === parentId)
        .map((dept) => ({
          ...dept.toJSON(),
          children: buildTree(departments, dept.id),
        }));
    };

    const tree = buildTree(departments);

    ctx.status = 200;
    ctx.body = tree;
  } catch (error) {
    ctx.fs.logger.error(`获取部门树形结构失败: ${error}`);
    ctx.status = 500;
    ctx.body = { message: "获取部门树形结构失败" };
  }
}

/**
 * 部门排序
 */
async function sortDepartments(ctx) {
  const transaction = await ctx.fs.dc.orm.transaction();
  try {
    const models = ctx.fs.dc.models;
    const { dataList } = ctx.request.body;

    if (!dataList || !Array.isArray(dataList)) {
      ctx.status = 400;
      ctx.body = { message: "排序数据不能为空" };
      return;
    }

    // 批量更新部门排序
    for (const item of dataList) {
      if (!item.id || item.sortIndex === undefined) {
        ctx.status = 400;
        ctx.body = { message: "排序数据格式错误" };
        return;
      }

      await models.Department.update(
        { sortIndex: item.sortIndex },
        {
          where: { id: item.id },
          transaction,
        }
      );
    }

    await transaction.commit();

    ctx.status = 200;
    ctx.body = { message: "部门排序更新成功" };
  } catch (error) {
    await transaction.rollback();
    ctx.fs.logger.error(`部门排序失败: ${error}`);
    ctx.status = 500;
    ctx.body = { message: "部门排序失败" };
  }
}

//批量修改部门关联用户
async function updateDepartmentUsers(ctx) {
  let error = { name: "updateError", message: "添加部门用户失败" };
  let { depId } = ctx.params;
  const models = ctx.fs.dc.models;
  const { userIds } = ctx.request.body;
  try {
    const department = await models.Department.findOne({
      where: { id: Number(depId) },
    });
    if (!department) {
      error = { name: "UpdateError", message: `部门不存在` };
      ctx.throw(400);
    }
    await models.User.update(
      { depId: Number(depId) },
      { where: { id: { $in: userIds } } }
    );
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

module.exports = {
  getDepartments,
  getDepartment,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  getDepartmentTree,
  sortDepartments,
  updateDepartmentUsers,
};
