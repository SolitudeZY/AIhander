/* eslint-disable*/

'use strict';

module.exports = dc => {
  const DataTypes = dc.ORM;
  const sequelize = dc.orm;
  const ServerMaintenanceRecord = sequelize.define("serverMaintenanceRecord", {
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: null,
      comment: null,
      primaryKey: true,
      field: "id",
      autoIncrement: true
    },
    sketch: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null,
      comment: "简述",
      primaryKey: false,
      field: "sketch",
      autoIncrement: false
    },
    reason: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null,
      comment: "维修原因",
      primaryKey: false,
      field: "reason",
      autoIncrement: false
    },
    remark: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null,
      comment: "备注",
      primaryKey: false,
      field: "remark",
      autoIncrement: false
    },
    maintenanceStartTime: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
      comment: "维护开始时间",
      primaryKey: false,
      field: "maintenance_start_time",
      autoIncrement: false
    },
    maintenanceFinishTime: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
      comment: "维护结束时间",
      primaryKey: false,
      field: "maintenance_finish_time",
      autoIncrement: false
    },
    state: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null,
      comment: "完成状态  wait 待维修 / underway 维修中 / completed 维修完成 ",
      primaryKey: false,
      field: "state",
      autoIncrement: false
    }
  }, {
    tableName: "server_maintenance_record",
    comment: "",
    indexes: []
  });
  dc.models.ServerMaintenanceRecord = ServerMaintenanceRecord;
  return ServerMaintenanceRecord;
};