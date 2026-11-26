/* eslint-disable*/

'use strict';

module.exports = dc => {
  const DataTypes = dc.ORM;
  const sequelize = dc.orm;
  const TemperatureAutoDetail = sequelize.define("temperatureAutoDetail", {
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: null,
      comment: null,
      primaryKey: true,
      field: "id",
      autoIncrement: true,
      unique: "temperature_auto_detail_id_uindex"
    },
    modelNo: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null,
      comment: "模块号",
      primaryKey: false,
      field: "model_no",
      autoIncrement: false
    },
    currentStep: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null,
      comment: "0，下发333.1，加速度，2下发444(温补)",
      primaryKey: false,
      field: "current_step",
      autoIncrement: false
    },
    currentStepTry: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null,
      comment: "当前步骤尝试次数",
      primaryKey: false,
      field: "current_step_try",
      autoIncrement: false
    },
    needTemperature: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: null,
      comment: "是否需要温补",
      primaryKey: false,
      field: "need_temperature",
      autoIncrement: false
    },
    temperatureAutoId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "temperature_auto_id",
      autoIncrement: false,
      references: {
        key: "id",
        model: "temperature_auto"
      }
    },
    result: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null,
      comment: "下发命令的结果",
      primaryKey: false,
      field: "result",
      autoIncrement: false
    },
    deviceId: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null,
      comment: "设备id",
      primaryKey: false,
      field: "device_id",
      autoIncrement: false
    },
  }, {
    tableName: "temperature_auto_detail",
    comment: "",
    indexes: []
  });
  dc.models.TemperatureAutoDetail = TemperatureAutoDetail;
  return TemperatureAutoDetail;
};