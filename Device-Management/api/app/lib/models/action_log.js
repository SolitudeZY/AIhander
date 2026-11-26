/* eslint-disable*/
'use strict';

module.exports = dc => {
  const DataTypes = dc.ORM;
  const sequelize = dc.orm;
  const ActionLog = sequelize.define("actionLog", {
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: null,
      comment: null,
      primaryKey: true,
      field: "id",
      autoIncrement: true,
      unique: "action_log_id_uindex"
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "user_id",
      autoIncrement: false,
      references: {
        key: "id",
        model: "user"
      }
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
    action: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null,
      comment: "动态内容",
      primaryKey: false,
      field: "action",
      autoIncrement: false
    },
    expandParams: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "expand_params",
      autoIncrement: false
    }
  }, {
    tableName: "action_log",
    comment: "",
    indexes: []
  });
  dc.models.ActionLog = ActionLog;
  return ActionLog;
};