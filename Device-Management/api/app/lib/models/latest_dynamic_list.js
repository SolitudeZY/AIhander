/* eslint-disable*/

'use strict';

module.exports = dc => {
  const DataTypes = dc.ORM;
  const sequelize = dc.orm;
  const LatestDynamicList = sequelize.define("latestDynamicList", {
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: null,
      comment: null,
      primaryKey: true,
      field: "id",
      autoIncrement: true,
      unique: "latest_dynamic_list_id_uindex"
    },
    time: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "time",
      autoIncrement: false
    },
    alarmAppearId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "alarm_appear_id",
      autoIncrement: false
    },
    emailSendId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "email_send_id",
      autoIncrement: false
    },
    alarmConfirmId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "alarm_confirm_id",
      autoIncrement: false
    },
    projectCorrelationId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "project_correlation_id",
      autoIncrement: false
    },
    type: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null,
      comment: '1:发现,2:通知,3:处置,4:确认',
      primaryKey: false,
      field: "type",
      autoIncrement: false
    }
  }, {
    tableName: "latest_dynamic_list",
    comment: "",
    indexes: []
  });
  dc.models.LatestDynamicList = LatestDynamicList;
  return LatestDynamicList;
};