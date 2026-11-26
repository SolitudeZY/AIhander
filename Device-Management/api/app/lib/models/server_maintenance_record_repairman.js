/* eslint-disable*/

'use strict';

module.exports = dc => {
  const DataTypes = dc.ORM;
  const sequelize = dc.orm;
  const ServerMaintenanceRecordRepairman = sequelize.define("serverMaintenanceRecordRepairman", {
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: null,
      comment: null,
      primaryKey: true,
      field: "id",
      autoIncrement: true
    },
    serverMaintenanceRecordId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "server_maintenance_record_id",
      autoIncrement: false,
      references: {
        key: "id",
        model: "serverMaintenanceRecord"
      }
    },
    pepUserId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "pep_user_id",
      autoIncrement: false
    }
  }, {
    tableName: "server_maintenance_record_repairman",
    comment: "",
    indexes: []
  });
  dc.models.ServerMaintenanceRecordRepairman = ServerMaintenanceRecordRepairman;
  return ServerMaintenanceRecordRepairman;
};