/* eslint-disable*/

'use strict';

module.exports = dc => {
  const DataTypes = dc.ORM;
  const sequelize = dc.orm;
  const AlarmAppearRecord = sequelize.define("alarmAppearRecord", {
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: null,
      comment: null,
      primaryKey: true,
      field: "id",
      autoIncrement: true,
      unique: "alarm_appear_record_id_uindex"
    },
    projectCorrelationId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "project_correlation_id",
      autoIncrement: false
    },
    alarmInfo: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "alarm_info",
      autoIncrement: false
    },
    time: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "time",
      autoIncrement: false
    },
    type: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null,
      comment: "数据告警:data,设备告警:device,应用告警:application",
      primaryKey: false,
      field: "type",
      autoIncrement: false
    }
  }, {
    tableName: "alarm_appear_record",
    comment: "",
    indexes: []
  });
  dc.models.AlarmAppearRecord = AlarmAppearRecord;
  return AlarmAppearRecord;
};