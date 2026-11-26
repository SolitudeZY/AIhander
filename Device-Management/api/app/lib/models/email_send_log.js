/* eslint-disable*/

'use strict';

module.exports = dc => {
  const DataTypes = dc.ORM;
  const sequelize = dc.orm;
  const EmailSendLog = sequelize.define("emailSendLog", {
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: null,
      comment: null,
      primaryKey: true,
      field: "id",
      autoIncrement: true,
      unique: "email_send_log_id_uindex"
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
    pushConfigId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "push_config_id",
      autoIncrement: false
    },
    tactics: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "tactics",
      autoIncrement: false
    },
    tacticsParams: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "tactics_params",
      autoIncrement: false
    },
    projectCorrelationId: {
      type: DataTypes.ARRAY(DataTypes.INTEGER),
      allowNull: false,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "project_correlation_id",
      autoIncrement: false
    },
    toPepUserIds: {
      type: DataTypes.ARRAY(DataTypes.INTEGER),
      allowNull: false,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "to_pep_user_ids",
      autoIncrement: false
    }
  }, {
    tableName: "email_send_log",
    comment: "",
    indexes: []
  });
  dc.models.EmailSendLog = EmailSendLog;
  return EmailSendLog;
};