/* eslint-disable*/

'use strict';

module.exports = dc => {
  const DataTypes = dc.ORM;
  const sequelize = dc.orm;
  const AlarmConfirmLog = sequelize.define("alarmConfirmLog", {
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: null,
      comment: null,
      primaryKey: true,
      field: "id",
      autoIncrement: true,
      unique: "alarm_confirm_log_id_uindex"
    },
    pepUserId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "pep_user_id",
      autoIncrement: false
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
    confirmTime: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "confirm_time",
      autoIncrement: false
    },
    confirmContent: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "confirm_content",
      autoIncrement: false
    }
  }, {
    tableName: "alarm_confirm_log",
    comment: "",
    indexes: []
  });
  dc.models.AlarmConfirmLog = AlarmConfirmLog;
  return AlarmConfirmLog;
};