/* eslint-disable*/

'use strict';

module.exports = dc => {
   const DataTypes = dc.ORM;
   const sequelize = dc.orm;
   const MaintenanceRecord = sequelize.define("maintenanceRecord", {
      id: {
         type: DataTypes.INTEGER,
         allowNull: false,
         defaultValue: null,
         comment: null,
         primaryKey: true,
         field: "id",
         autoIncrement: true,
         unique: "maintenance_record_id_uindex"
      },
      sketch: {
         type: DataTypes.STRING,
         allowNull: false,
         defaultValue: null,
         comment: "简述",
         primaryKey: false,
         field: "sketch",
         autoIncrement: false
      },
      occurrenceTime: {
         type: DataTypes.DATE,
         allowNull: true,
         defaultValue: null,
         comment: "发生时间",
         primaryKey: false,
         field: "occurrence_time",
         autoIncrement: false
      },
      solvingTime: {
         type: DataTypes.DATE,
         allowNull: true,
         defaultValue: null,
         comment: "解决时间",
         primaryKey: false,
         field: "solving_time",
         autoIncrement: false
      },
      interruptDuration: {
         type: DataTypes.INTEGER,
         allowNull: true,
         defaultValue: null,
         comment: "中断时长 / 秒",
         primaryKey: false,
         field: "interrupt_duration",
         autoIncrement: false
      },
      type: {
         type: DataTypes.STRING,
         allowNull: true,
         defaultValue: null,
         comment: "故障类型",
         primaryKey: false,
         field: "type",
         autoIncrement: false
      },
      record: {
         type: DataTypes.STRING,
         allowNull: true,
         defaultValue: null,
         comment: "故障记录",
         primaryKey: false,
         field: "record",
         autoIncrement: false
      },
      files: {
         type: DataTypes.JSONB,
         allowNull: true,
         defaultValue: null,
         comment: "文件",
         primaryKey: false,
         field: "files",
         autoIncrement: false
      },
   }, {
      tableName: "maintenance_record",
      comment: "",
      indexes: []
   });
   dc.models.MaintenanceRecord = MaintenanceRecord;
   return MaintenanceRecord;
};