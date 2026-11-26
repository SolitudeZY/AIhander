/* eslint-disable*/

'use strict';

module.exports = dc => {
  const DataTypes = dc.ORM;
  const sequelize = dc.orm;
  const AbnReportParams = sequelize.define("abnReportParams", {
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: null,
      comment: null,
      primaryKey: true,
      field: "id",
      autoIncrement: true
    },
    sensorId: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "sensor_id",
      autoIncrement: false
    },
    sensorLocationDescription: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "sensor_location_description",
      autoIncrement: false
    },
    factor: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "factor",
      autoIncrement: false
    },
    factorId: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "factor_id",
      autoIncrement: false
    },
    abnTypeId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "abn_type",
      autoIncrement: false,
      references: {
        key: "id",
        model: "abnType"
      }
    },
    params: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "params",
      autoIncrement: false
    },
    enabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "enabled",
      autoIncrement: false
    },
    itemIndex: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "item_index",
      autoIncrement: false
    }
  }, {
    tableName: "abn_report_params",
    comment: "",
    indexes: []
  });
  dc.models.AbnReportParams = AbnReportParams;
  return AbnReportParams;
};