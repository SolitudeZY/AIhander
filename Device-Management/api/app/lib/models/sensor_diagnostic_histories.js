/* eslint-disable*/

'use strict';

module.exports = dc => {
  const DataTypes = dc.ORM;
  const sequelize = dc.orm;
  const SensorDiagnosticHistories = sequelize.define("sensorDiagnosticHistories", {
    id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      defaultValue: null,
      comment: null,
      primaryKey: true,
      field: "id",
      autoIncrement: true
    },
    deviceCode: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "device_code",
      autoIncrement: false
    },
    channelNo: {
      type: DataTypes.BIGINT,
      allowNull: true,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "channel_no",
      autoIncrement: false
    },
    subChannelNo: {
      type: DataTypes.BIGINT,
      allowNull: true,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "sub_channel_no",
      autoIncrement: false
    },
    data: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "data",
      autoIncrement: false
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "created_at",
      autoIncrement: false
    }
  }, {
    tableName: "sensor_diagnostic_histories",
    comment: "",
    indexes: []
  });
  dc.models.SensorDiagnosticHistories = SensorDiagnosticHistories;
  return SensorDiagnosticHistories;
};