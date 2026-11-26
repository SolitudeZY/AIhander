/* eslint-disable*/

'use strict';

module.exports = dc => {
  const DataTypes = dc.ORM;
  const sequelize = dc.orm;
  const MaintenanceRecordExecuteUser = sequelize.define("maintenanceRecordExecuteUser", {
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: null,
      comment: null,
      primaryKey: true,
      field: "id",
      autoIncrement: true,
      unique: "maintenance_record_execute_user_id_uindex"
    },
    maintenanceRecordId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "maintenance_record_id",
      autoIncrement: false,
      references: {
        key: "id",
        model: "maintenanceRecord"
      }
    },
    pepUserId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "pep_user_id",
      autoIncrement: false
    }
  }, {
    tableName: "maintenance_record_execute_user",
    comment: "",
    indexes: []
  });
  dc.models.MaintenanceRecordExecuteUser = MaintenanceRecordExecuteUser;
  return MaintenanceRecordExecuteUser;
};