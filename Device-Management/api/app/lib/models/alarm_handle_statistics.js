/* eslint-disable*/

'use strict';

module.exports = dc => {
  const DataTypes = dc.ORM;
  const sequelize = dc.orm;
  const AlarmHandleStatistics = sequelize.define("alarmHandleStatistics", {
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: null,
      comment: null,
      primaryKey: true,
      field: "id",
      autoIncrement: true,
      unique: "alarm_handle_statistics_id_uindex"
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
    projectCorrelationId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "project_correlation_id",
      autoIncrement: false
    },
    day1: {
      type: DataTypes.DOUBLE,
      allowNull: true,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "day1",
      autoIncrement: false
    },
    day3: {
      type: DataTypes.DOUBLE,
      allowNull: true,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "day3",
      autoIncrement: false
    },
    day7: {
      type: DataTypes.DOUBLE,
      allowNull: true,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "day7",
      autoIncrement: false
    },
    day15: {
      type: DataTypes.DOUBLE,
      allowNull: true,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "day15",
      autoIncrement: false
    },
    day30: {
      type: DataTypes.DOUBLE,
      allowNull: true,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "day30",
      autoIncrement: false
    },
    day30m: {
      type: DataTypes.DOUBLE,
      allowNull: true,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "day30m",
      autoIncrement: false
    }
  }, {
    tableName: "alarm_handle_statistics",
    comment: "",
    indexes: []
  });
  dc.models.AlarmHandleStatistics = AlarmHandleStatistics;
  return AlarmHandleStatistics;
};