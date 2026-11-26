/* eslint-disable*/
'use strict';

module.exports = dc => {
  const DataTypes = dc.ORM;
  const sequelize = dc.orm;
  const AlarmDataContinuityType = sequelize.define("alarmDataContinuityType", {
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: null,
      comment: null,
      primaryKey: true,
      field: "id",
      autoIncrement: true,
      unique: "alarm_data_continuity_type_id_uindex"
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "name",
      autoIncrement: false
    },
    typeNumber: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "type_number",
      autoIncrement: false
    }
  }, {
    tableName: "alarm_data_continuity_type",
    comment: "",
    indexes: []
  });
  dc.models.AlarmDataContinuityType = AlarmDataContinuityType;
  return AlarmDataContinuityType;
};