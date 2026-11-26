/* eslint-disable */
"use strict";

module.exports = (dc) => {
  const DataTypes = dc.ORM;
  const sequelize = dc.orm;

  const AppInstallPackage = sequelize.define(
    "appInstallPackage",
    {
      id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
        field: "id",
        comment: "安装包版本主键ID",
      },
      appId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "app_id",
        comment: "所属应用ID，关联app_install_application.id",
      },
      version: {
        type: DataTypes.STRING(100),
        allowNull: false,
        field: "version",
        comment: "应用版本号，同一应用内唯一",
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: "description",
        comment: "版本说明",
      },
      packageName: {
        type: DataTypes.STRING(255),
        allowNull: false,
        field: "package_name",
        comment: "APK安装包文件名",
      },
      packageUrl: {
        type: DataTypes.STRING(1000),
        allowNull: false,
        field: "package_url",
        comment: "APK安装包存储地址",
      },
      onlineTime: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: "online_time",
        comment: "上线时间",
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
      tableName: "app_install_package",
      comment: "APP安装包版本",
      indexes: [
        { fields: ["app_id"] },
        { fields: ["online_time"] },
        { unique: true, fields: ["app_id", "version"] },
      ],
    },
  );

  dc.models.AppInstallPackage = AppInstallPackage;
  return AppInstallPackage;
};
