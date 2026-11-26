"use strict";

module.exports = function (dc) {
  const RoleGroup = dc.orm.define(
    "roleGroup",
    {
      id: {
        field: "id",
        type: dc.ORM.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      name: {
        field: "name",
        type: dc.ORM.STRING,
        allowNull: false,
      },
      orgId: {
        field: "org",
        type: dc.ORM.INTEGER,
        allowNull: false,
      },
    },
    {
      tableName: "role_group",
    }
  );

  dc.models.RoleGroup = RoleGroup;

  return RoleGroup;
};
