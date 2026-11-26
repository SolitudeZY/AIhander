/* eslint-disable*/

'use strict';

module.exports = dc => {
   const DataTypes = dc.ORM;
   const sequelize = dc.orm;
   const EquipmentMaintenanceRecord = sequelize.define("equipmentMaintenanceRecord", {
      id: {
         type: DataTypes.INTEGER,
         allowNull: false,
         defaultValue: null,
         comment: null,
         primaryKey: true,
         field: "id",
         autoIncrement: true
      },
      equipmentType: {
         type: DataTypes.STRING,
         allowNull: true,
         defaultValue: null,
         comment: null,
         primaryKey: false,
         field: "equipment_type",
         autoIncrement: false
      },
      equipmentCategory: {
         type: DataTypes.STRING,
         allowNull: true,
         defaultValue: null,
         comment: null,
         primaryKey: false,
         field: "equipment_category",
         autoIncrement: false
      },
      maintenanceReason: {
         type: DataTypes.STRING,
         allowNull: true,
         defaultValue: null,
         comment: null,
         primaryKey: false,
         field: "maintenance_reason",
         autoIncrement: false
      },
      solution: {
         type: DataTypes.STRING,
         allowNull: true,
         defaultValue: null,
         comment: null,
         primaryKey: false,
         field: "solution",
         autoIncrement: false
      },
      reportTime: {
         type: DataTypes.DATE,
         allowNull: true,
         defaultValue: null,
         comment: null,
         primaryKey: false,
         field: "report_time",
         autoIncrement: false
      },
      completedTime: {
         type: DataTypes.DATE,
         allowNull: true,
         defaultValue: null,
         comment: null,
         primaryKey: false,
         field: "completed_time",
         autoIncrement: false
      },
      status: {
         type: DataTypes.STRING,
         allowNull: true,
         defaultValue: null,
         comment: null,
         primaryKey: false,
         field: "status",
         autoIncrement: false
      }
   }, {
      tableName: "equipment_maintenance_record",
      comment: "",
      indexes: []
   });
   dc.models.EquipmentMaintenanceRecord = EquipmentMaintenanceRecord;
   return EquipmentMaintenanceRecord;
};