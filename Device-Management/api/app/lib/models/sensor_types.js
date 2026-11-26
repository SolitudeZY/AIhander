/* eslint-disable*/

'use strict';

module.exports = dc => {
  const DataTypes = dc.ORM;
  const sequelize = dc.orm;
  const SensorTypes = sequelize.define("sensorTypes", {
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: null,
      comment: null,
      primaryKey: true,
      field: "id",
      autoIncrement: true,
      unique: "sensor_types_id_uindex"
    },
    sensorKey: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null,
      comment: "传感器类型key",
      primaryKey: false,
      field: "sensor_key",
      autoIncrement: false
    },
    sensorName: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null,
      comment: "类型名称",
      primaryKey: false,
      field: "sensor_name",
      autoIncrement: false
    }
  }, {
    tableName: "sensor_types",
    comment: "传感器类型表",
    indexes: []
  });
  dc.models.SensorTypes = SensorTypes;
  return SensorTypes;
};
