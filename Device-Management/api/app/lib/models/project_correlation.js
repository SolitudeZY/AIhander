/* eslint-disable*/

'use strict';

module.exports = dc => {
   const DataTypes = dc.ORM;
   const sequelize = dc.orm;
   const ProjectCorrelation = sequelize.define("projectCorrelation", {
      id: {
         type: DataTypes.INTEGER,
         allowNull: false,
         defaultValue: null,
         comment: null,
         primaryKey: true,
         field: "id",
         autoIncrement: true
      },
      anxinProjectId: {
         type: DataTypes.ARRAY(DataTypes.INTEGER),
         allowNull: false,
         defaultValue: null,
         comment: null,
         primaryKey: false,
         field: "anxin_project_id",
         autoIncrement: false
      },
      createTime: {
         type: DataTypes.DATE,
         allowNull: false,
         defaultValue: null,
         comment: null,
         primaryKey: false,
         field: "create_time",
         autoIncrement: false
      },
      createUser: {
         type: DataTypes.INTEGER,
         allowNull: false,
         defaultValue: null,
         comment: null,
         primaryKey: false,
         field: "create_user",
         autoIncrement: false
      },
      name: {
         type: DataTypes.STRING,
         allowNull: true,
         defaultValue: null,
         comment: null,
         primaryKey: false,
         field: "name",
         autoIncrement: false
      },
      pepProjectId: {
         type: DataTypes.INTEGER,
         allowNull: true,
         defaultValue: null,
         comment: null,
         primaryKey: false,
         field: "pep_project_id",
         autoIncrement: false
      },
      del: {
         type: DataTypes.BOOLEAN,
         allowNull: true,
         defaultValue: null,
         comment: null,
         primaryKey: false,
         field: "del",
         autoIncrement: false
      },
      updateTime: {
         type: DataTypes.DATE,
         allowNull: true,
         defaultValue: null,
         comment: null,
         primaryKey: false,
         field: "update_time",
         autoIncrement: false
      },
      mappingClass: {
         type: DataTypes.STRING,
         allowNull: true,
         defaultValue: null,
         comment: "映射分类参数 例如：智慧类：wisdom，监测类：monitor，其他：other",
         primaryKey: false,
         field: "mapping_class",
         autoIncrement: false
      },
      maintenanceEnd: {
         type: DataTypes.DATE,
         allowNull: true,
         defaultValue: null,
         comment: "维保结束时间",
         primaryKey: false,
         field: "maintenance_end",
         autoIncrement: false
      },
      maintenanceStart: {
         type: DataTypes.DATE,
         allowNull: true,
         defaultValue: null,
         comment: "维保开始时间",
         primaryKey: false,
         field: "maintenance_start",
         autoIncrement: false
      },
      isanchor: {
         type: DataTypes.BOOLEAN,
         allowNull: true,
         defaultValue: null,
         comment: "是否续签",
         primaryKey: false,
         field: "isanchor",
         autoIncrement: false
      },
      sendorders: {
         type: DataTypes.ARRAY(DataTypes.STRING),
         allowNull: true,
         defaultValue: null,
         comment: "自动派单",
         primaryKey: false,
         field: "sendorders",
         autoIncrement: false
      },
      percentage: {
         type: DataTypes.INTEGER,
         allowNull: true,
         defaultValue: null,
         comment: "项目中断百分比",
         primaryKey: false,
         field: "percentage",
         autoIncrement: false
      },
      strucId: {
         type: DataTypes.ARRAY(DataTypes.INTEGER),
         allowNull: true,
         defaultValue: null,
         comment: "选中作为选择重点测点的结构物",
         primaryKey: false,
         field: "struc_id",
         autoIncrement: false
      },
      strucSensor: {
         type: DataTypes.JSONB,
         allowNull: true,
         defaultValue: null,
         comment: "选中对应结构的重点测点",
         primaryKey: false,
         field: "struc_sensor",
         autoIncrement: false
      },
      dataInterrupt: {
         type: DataTypes.BOOLEAN,
         allowNull: true,
         defaultValue: null,
         comment: "数据中断",
         primaryKey: false,
         field: "Data_interrupt",
         autoIncrement: false
      },
      dataException: {
         type: DataTypes.BOOLEAN,
         allowNull: true,
         defaultValue: null,
         comment: "数据异常",
         primaryKey: false,
         field: "Data_exception",
         autoIncrement: false
      },
      influenceReporting: {
         type: DataTypes.JSONB,
         allowNull: true,
         defaultValue: null,
         comment: "影响出具报告",
         primaryKey: false,
         field: "Influence_reporting",
         autoIncrement: false
      },
      leakageAnomaly: {
         type: DataTypes.BOOLEAN,
         allowNull: true,
         defaultValue: null,
         comment: "漏液异常 ",
         primaryKey: false,
         field: "leakage_anomaly",
         autoIncrement: false
      },
      optionEditPepUser: {
         type: DataTypes.INTEGER,
         allowNull: true,
         defaultValue: null,
         comment: "最后修改的人的id",
         primaryKey: false,
         field: "option_edit_pep_user",
         autoIncrement: false
      },
      overException: {
         type: DataTypes.BOOLEAN,
         allowNull: true,
         defaultValue: null,
         comment: "数据超阈值",
         primaryKey: false,
         field: "Over_exception",
         autoIncrement: false
      },
      autoAssignedUserId: {
         type: DataTypes.INTEGER,
         allowNull: true,
         defaultValue: null,
         comment: "自动派单用户的id",
         primaryKey: false,
         field: "auto_assigned_user_id",
         autoIncrement: false
      },
      isPushProcessTicket: {
         type: DataTypes.BOOLEAN,
         allowNull: true,
         defaultValue: false,
         comment: "是否自动派单",
         primaryKey: false,
         field: "is_push_process_ticket",
         autoIncrement: false
      },
   }, {
      tableName: "project_correlation",
      comment: "",
      indexes: []
   });
   dc.models.ProjectCorrelation = ProjectCorrelation;
   return ProjectCorrelation;
};