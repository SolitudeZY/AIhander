/* eslint-disable */
"use strict";

module.exports = (dc) => {
  const DataTypes = dc.ORM;
  const sequelize = dc.orm;

  const AppInstallApplication = sequelize.define(
    "appInstallApplication",
    {
      id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
        field: "id",
        comment: "应用主键ID",
      },
      name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        field: "name",
        comment: "应用名称，全局唯一",
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: "created_at",
        comment: "创建时间",
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: "updated_at",
        comment: "更新时间",
      },
    },
    {
      tableName: "app_install_application",
      comment: "APP安装包管理应用",
      indexes: [{ unique: true, fields: ["name"] }],
    },
  );

  dc.models.AppInstallApplication = AppInstallApplication;
  return AppInstallApplication;
};
