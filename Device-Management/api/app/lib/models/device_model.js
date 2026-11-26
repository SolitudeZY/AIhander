/* eslint-disable*/
'use strict';

module.exports = dc => {
  const DataTypes = dc.ORM;
  const sequelize = dc.orm;
  const DeviceModel = sequelize.define("deviceModel", {
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: null,
      comment: null,
      primaryKey: true,
      field: "id",
      autoIncrement: true,
      unique: "device_model_pk"
    },
    modelName: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "model_name",
      autoIncrement: false
    },
   
  }, {
    tableName: "device_model",
    comment: "",
    indexes: []
  });
  dc.models.DeviceModel = DeviceModel;
  return DeviceModel;
};