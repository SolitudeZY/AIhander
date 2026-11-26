/* eslint-disable*/
"use strict";

module.exports = (dc) => {
  const DataTypes = dc.ORM;
  const sequelize = dc.orm;
  const Project = sequelize.define(
    "project",
    {
      id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
        field: "id",
        comment: "项目ID",
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
        field: "name",
        comment: "项目名称",
      },
      longitude: {
        type: DataTypes.DOUBLE,
        allowNull: true,
        field: "longitude",
        comment: "经度",
      },
      latitude: {
        type: DataTypes.DOUBLE,
        allowNull: true,
        field: "latitude",
        comment: "纬度",
      },
      locationName: {
        type: DataTypes.STRING,
        allowNull: true,
        field: "location_name",
        comment: "定位位置名称",
      },
      focusDeviceCodes: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: "focus_device_codes",
        comment: "关注设备，deviceCode以英文逗号分隔的字符串",
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: "description",
        comment: "项目描述（文本，不限制字数）",
      },
      createBy: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: "create_by",
        comment: "创建人ID",
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: "created_at",
        comment: "创建时间",
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: "updated_at",
        comment: "更新时间",
      },
    },
    {
      tableName: "projects",
      comment: "项目管理",
    }
  );
  dc.models.Project = Project;
  return Project;
};
