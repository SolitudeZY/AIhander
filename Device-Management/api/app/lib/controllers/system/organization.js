"use strict";
const { Op } = require("sequelize");

/**
 * 获取组织列表
 */
async function getOrganizations(ctx) {
  try {
    const models = ctx.fs.dc.models;
    const { page = 1, pageSize = 10, name } = ctx.query;
    const p = parseInt(page) || 1;
    const size = Math.min(parseInt(pageSize) || 10, 100);

    const whereCondition = {};
    if (name) {
      whereCondition.name = {
        [Op.like]: `%${name}%`,
      };
    }

    const { count, rows } = await models.Organization.findAndCountAll({
      where: whereCondition,
      attributes: ["id", "name"],
      include: [
        {
          model: models.Department,
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
    ctx.fs.logger.error(`获取组织列表失败: ${error}`);
    ctx.status = 500;
    ctx.body = { message: "获取组织列表失败" };
  }
}

/**
 * 获取组织详情
 */
async function getOrganization(ctx) {
  try {
    const models = ctx.fs.dc.models;
    const { id } = ctx.params;

    const organizationBasic = await models.Organization.findByPk(id, {
      attributes: ["id", "name"],
    });

    if (!organizationBasic) {
      ctx.status = 404;
      ctx.body = { message: "组织不存在" };
      return;
    }

    const departments = await models.Department.findAll({
      where: { orgId: id },
      attributes: ["id", "name", "parentId", "sortIndex"],
      order: [["sortIndex", "ASC"], ["id", "ASC"]],
    });

    const deptIds = departments.map((d) => d.id);

    const deptMembers =
      deptIds.length > 0
        ? await models.User.findAll({
            where: { depId: { [Op.in]: deptIds } },
            attributes: ["id", "name", "username", "postId", "enabled", "depId"],
            include: [
              {
                model: models.TypePost,
                attributes: ["id", "name", "code", "allowSetNum"],
              },
              {
                model: models.Role,
                attributes: ["id", "name", "portal"],
                through: { attributes: [] },
                required: false,
                include: [
                  {
                    model: models.RoleGroup,
                    attributes: ["id", "name"],
                    required: false,
                  },
                ],
              },
            ],
          })
        : [];

    const membersByDep = {};
    for (const m of deptMembers) {
      const dep = m.depId;
      if (!membersByDep[dep]) membersByDep[dep] = [];
      membersByDep[dep].push(m);
    }

    const orgUsers = await models.User.findAll({
      where: { orgId: id },
      attributes: ["id", "name", "username", "depId", "postId"],
      include: [
        {
          model: models.TypePost,
          attributes: ["id", "name", "code", "allowSetNum"],
        },
        {
          model: models.Role,
          attributes: ["id", "name", "portal"],
          through: { attributes: [] },
          required: false,
          include: [
            {
              model: models.RoleGroup,
              attributes: ["id", "name"],
              required: false,
            },
          ],
        },
      ],
    });

    const roleGroups = await models.RoleGroup.findAll({
      where: { orgId: id },
      attributes: ["id", "name"],
      include: [
        {
          model: models.Role,
          attributes: ["id", "name", "portal"],
          required: false,
        },
      ],
    });

    const result = organizationBasic.toJSON();
    result.departments = departments.map((d) => {
      const jd = d.toJSON();
      jd.members = (membersByDep[jd.id] || []).map((u) => u.toJSON());
      return jd;
    });
    result.users = orgUsers.map((u) => u.toJSON());
    result.roleGroups = roleGroups.map((rg) => rg.toJSON());

    ctx.status = 200;
    ctx.body = result;
  } catch (error) {
    ctx.fs.logger.error(`获取组织详情失败: ${error}`);
    ctx.status = 500;
    ctx.body = { message: "获取组织详情失败" };
  }
}

/**
 * 创建组织
 */
async function createOrganization(ctx) {
  const transaction = await ctx.fs.dc.orm.transaction();
  try {
    const models = ctx.fs.dc.models;
    const { name } = ctx.request.body;

    if (!name) {
      ctx.status = 400;
      ctx.body = { message: "组织名称不能为空" };
      return;
    }

    // 检查组织名称是否已存在
    const existingOrg = await models.Organization.findOne({
      where: { name: name },
    });

    if (existingOrg) {
      ctx.status = 400;
      ctx.body = { message: "组织名称已存在" };
      return;
    }

    const organization = await models.Organization.create(
      {
        name: name,
      },
      { transaction }
    );

    await transaction.commit();

    ctx.status = 201;
    ctx.body = organization;
  } catch (error) {
    await transaction.rollback();
    ctx.fs.logger.error(`创建组织失败: ${error}`);
    ctx.status = 500;
    ctx.body = { message: "创建组织失败" };
  }
}

/**
 * 更新组织
 */
async function updateOrganization(ctx) {
  const transaction = await ctx.fs.dc.orm.transaction();
  try {
    const models = ctx.fs.dc.models;
    const { id } = ctx.params;
    const { name } = ctx.request.body;

    if (!name) {
      ctx.status = 400;
      ctx.body = { message: "组织名称不能为空" };
      return;
    }

    const organization = await models.Organization.findByPk(id);
    if (!organization) {
      ctx.status = 404;
      ctx.body = { message: "组织不存在" };
      return;
    }

    // 检查组织名称是否已存在（排除当前组织）
    const existingOrg = await models.Organization.findOne({
      where: {
        name: name,
        id: { [Op.ne]: id },
      },
    });

    if (existingOrg) {
      ctx.status = 400;
      ctx.body = { message: "组织名称已存在" };
      return;
    }

    await organization.update({ name }, { transaction });
    await transaction.commit();

    ctx.status = 200;
    ctx.body = organization;
  } catch (error) {
    await transaction.rollback();
    ctx.fs.logger.error(`更新组织失败: ${error}`);
    ctx.status = 500;
    ctx.body = { message: "更新组织失败" };
  }
}

/**
 * 删除组织
 */
async function deleteOrganization(ctx) {
  const transaction = await ctx.fs.dc.orm.transaction();
  try {
    const models = ctx.fs.dc.models;
    const { id } = ctx.params;

    const organization = await models.Organization.findByPk(id);
    if (!organization) {
      ctx.status = 404;
      ctx.body = { message: "组织不存在" };
      return;
    }

    // 检查是否有关联的部门
    const departmentCount = await models.Department.count({
      where: { orgId: id },
    });

    if (departmentCount > 0) {
      ctx.status = 400;
      ctx.body = { message: "该组织下还有部门，无法删除" };
      return;
    }

    // 检查是否有关联的用户
    const userCount = await models.User.count({
      where: { orgId: id },
    });

    if (userCount > 0) {
      ctx.status = 400;
      ctx.body = { message: "该组织下还有用户，无法删除" };
      return;
    }

    await organization.destroy({ transaction });
    await transaction.commit();

    ctx.status = 200;
    ctx.body = { message: "删除成功" };
  } catch (error) {
    await transaction.rollback();
    ctx.fs.logger.error(`删除组织失败: ${error}`);
    ctx.status = 500;
    ctx.body = { message: "删除组织失败" };
  }
}

/**
 * 获取组织树形结构
 */
async function getOrganizationTree(ctx) {
  try {
    const models = ctx.fs.dc.models;

    const organizations = await models.Organization.findAll({
      include: [
        {
          model: models.Department,
          attributes: ["id", "name", "parentId", "sortIndex"],
          include: [
            {
              model: models.User,
              as: "members",
              attributes: ["id", "name", "username"],
              where: { enabled: true },
              required: false,
            },
          ],
        },
      ],
      order: [
        ["id", "ASC"],
        [models.Department, "sortIndex", "ASC"],
        [models.Department, "id", "ASC"],
      ],
    });

    // 构建部门树形结构
    const buildDepartmentTree = (departments, parentId = null) => {
      return departments
        .filter((dept) => dept.parentId === parentId)
        .map((dept) => ({
          ...dept.toJSON(),
          children: buildDepartmentTree(departments, dept.id),
        }));
    };

    const result = organizations.map((org) => ({
      ...org.toJSON(),
      Departments: buildDepartmentTree(org.Departments),
    }));

    ctx.status = 200;
    ctx.body = result;
  } catch (error) {
    ctx.fs.logger.error(`获取组织树形结构失败: ${error}`);
    ctx.status = 500;
    ctx.body = { message: "获取组织树形结构失败" };
  }
}

module.exports = {
  getOrganizations,
  getOrganization,
  createOrganization,
  updateOrganization,
  deleteOrganization,
  getOrganizationTree,
};
