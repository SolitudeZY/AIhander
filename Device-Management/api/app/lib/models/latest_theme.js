/* eslint-disable*/

'use strict';

module.exports = dc => {
  const DataTypes = dc.ORM;
  const sequelize = dc.orm;
  const LatestTheme = sequelize.define("latestTheme", {
    sensorId: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: null,
      comment: null,
      primaryKey: true,
      field: "sensor_id",
      autoIncrement: false
    },
    collectTime: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "collect_time",
      autoIncrement: false
    },
    value: {
      type: DataTypes.DOUBLE,
      allowNull: true,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "value",
      autoIncrement: false
    }
  }, {
    tableName: "latest_theme",
    comment: "",
    indexes: []
  });
  dc.models.LatestTheme = LatestTheme;
  return LatestTheme;
};