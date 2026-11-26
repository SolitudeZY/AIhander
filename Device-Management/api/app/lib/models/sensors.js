/* eslint-disable*/

'use strict';

module.exports = dc => {
  const DataTypes = dc.ORM;
  const sequelize = dc.orm;
  const Sensors = sequelize.define("sensors", {
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: null,
      comment: null,
      primaryKey: true,
      field: "id",
      autoIncrement: true,
      unique: "sensors_id_uindex"
    },
    name: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "name",
      autoIncrement: false
    },
    modelId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "model_id",
      autoIncrement: false,
      references: {
        key: "id",
        model: "sensorTypeModelMapping"
      }
    },
    manufacturer: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null,
      comment: "厂家",
      primaryKey: false,
      field: "manufacturer",
      autoIncrement: false
    },
    picture: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: null,
      comment: "图片",
      primaryKey: false,
      field: "picture",
      autoIncrement: false
    },
    createTime: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "create_time",
      autoIncrement: false
    },
    updateTime: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "update_time",
      autoIncrement: false
    }
  }, {
    tableName: "sensors",
    comment: "",
    indexes: []
  });
  dc.models.Sensors = Sensors;
  return Sensors;
};