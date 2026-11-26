/* eslint-disable*/

'use strict';

module.exports = dc => {
  const DataTypes = dc.ORM;
  const sequelize = dc.orm;
  const EquipmentMaintenanceRecordExecuteUser = sequelize.define("equipmentMaintenanceRecordExecuteUser", {
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: null,
      comment: null,
      primaryKey: true,
      field: "id",
      autoIncrement: true
    },
    equipmentMaintenanceRecordId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "equipment_maintenance_record_id",
      autoIncrement: false,
      references: {
        key: "id",
        model: "equipmentMaintenanceRecord"
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
    tableName: "equipment_maintenance_record_execute_user",
    comment: "",
    indexes: []
  });
  dc.models.EquipmentMaintenanceRecordExecuteUser = EquipmentMaintenanceRecordExecuteUser;
  return EquipmentMaintenanceRecordExecuteUser;
};