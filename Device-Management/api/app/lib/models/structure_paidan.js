/* eslint-disable*/

'use strict';

module.exports = dc => {
  const DataTypes = dc.ORM;
  const sequelize = dc.orm;
  const StructurePaidan = sequelize.define("structurePaidan", {
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: null,
      comment: null,
      primaryKey: true,
      field: "id",
      autoIncrement: true,
      unique: "t_structure_paidan_id_uindex"
    },
    pid: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: null,
      comment: "运维项目id",
      primaryKey: false,
      field: "pid",
      autoIncrement: false
    },
    did: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: null,
      comment: "表单id",
      primaryKey: false,
      field: "did",
      autoIncrement: false
    },
    stationids: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: null,
      comment: "测点/传感器id",
      primaryKey: false,
      field: "stationids",
      autoIncrement: false
    },
    atype: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: null,
      comment: "异常类型（zd：数据中断；mc：毛刺；qs：趋势；ly：漏液）",
      primaryKey: false,
      field: "atype",
      autoIncrement: false
    },
    start: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: null,
      comment: "派单时间",
      primaryKey: false,
      field: "start",
      autoIncrement: false
    },
    complete: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: null,
      comment: "处理完成时间",
      primaryKey: false,
      field: "complete",
      autoIncrement: false
    },
    suggestion: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
      comment: "处理意见",
      primaryKey: false,
      field: "suggestion",
      autoIncrement: false
    },
    comted: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: null,
      comment: "是否处理",
      primaryKey: false,
      field: "comted",
      autoIncrement: false
    },
    closed: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: null,
      comment: "表单是否关闭",
      primaryKey: false,
      field: "closed",
      autoIncrement: false
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: null,
      primaryKey: false,
      field: "title",
      autoIncrement: false,
    },
  }, {
    tableName: "t_structure_paidan",
    comment: "",
    indexes: []
  });
  dc.models.StructurePaidan = StructurePaidan;
  return StructurePaidan;
};