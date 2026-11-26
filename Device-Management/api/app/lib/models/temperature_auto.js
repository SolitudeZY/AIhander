/* eslint-disable*/

'use strict';

module.exports = dc => {
  const DataTypes = dc.ORM;
  const sequelize = dc.orm;
  const TemperatureAuto = sequelize.define("temperatureAuto", {
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: null,
      comment: null,
      primaryKey: true,
      field: "id",
      autoIncrement: true,
      unique: "temperature_auto_id_uindex"
    },
    fileUrl: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "file_url",
      autoIncrement: false
    },
    resultUrl: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: null,
        comment: null,
        primaryKey: false,
        field: "result_url",
        autoIncrement: false
      },
    token: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "token",
      autoIncrement: false
    },
    createBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "create_by",
      autoIncrement: false
    },
    state: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "state",
      autoIncrement: false
    },
    createAt: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "create_at",
      autoIncrement: false
    }
  }, {
    tableName: "temperature_auto",
    comment: "",
    indexes: []
  });
  dc.models.TemperatureAuto = TemperatureAuto;
  return TemperatureAuto;
};