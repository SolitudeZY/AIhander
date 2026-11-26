/* eslint-disable*/

'use strict';

module.exports = dc => {
  const DataTypes = dc.ORM;
  const sequelize = dc.orm;
  const EquipmentMaintenanceRecordProject = sequelize.define("equipmentMaintenanceRecordProject", {
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
    projectId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "project_id",
      autoIncrement: false
    }
  }, {
    tableName: "equipment_maintenance_record_project",
    comment: "",
    indexes: []
  });
  dc.models.EquipmentMaintenanceRecordProject = EquipmentMaintenanceRecordProject;
  return EquipmentMaintenanceRecordProject;
};