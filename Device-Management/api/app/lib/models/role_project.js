"use strict";

module.exports = function (dc) {
  const RoleProject = dc.orm.define(
    "roleProject",
    {
      id: {
        field: "id",
        type: dc.ORM.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      roleId: {
        field: "role_id",
        type: dc.ORM.INTEGER,
        allowNull: false,
        references: {
          key: "id",
          model: "role",
        },
      },
      projectId: {
        field: "project_id",
        type: dc.ORM.INTEGER,
        allowNull: false,
      },
    },
    {
      tableName: "role_project",
      comment: "角色-项目关联关系",
    }
  );

  dc.models.RoleProject = RoleProject;
  return RoleProject;
};
