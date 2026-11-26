/* eslint-disable*/

'use strict';

module.exports = dc => {
   const DataTypes = dc.ORM;
   const sequelize = dc.orm;
   const ReportAutomatic = sequelize.define("reportAutomatic", {
      id: {
         type: DataTypes.INTEGER,
         allowNull: false,
         defaultValue: null,
         comment: "id",
         primaryKey: true,
         field: "id",
         autoIncrement: true
      },
      reportName: {
         type: DataTypes.STRING,
         allowNull: true,
         defaultValue: null,
         comment: "",
         primaryKey: false,
         field: "report_name",
         autoIncrement: false
      },
      xmName: {
         type: DataTypes.STRING,
         allowNull: true,
         defaultValue: null,
         comment: "",
         primaryKey: false,
         field: "xm_name",
         autoIncrement: false
      },
      projectId: {
         type: DataTypes.INTEGER,
         allowNull: false,
         defaultValue: null,
         comment: "项目id",
         primaryKey: false,
         field: "project_id",
         autoIncrement: false
      },
      projectName: {
         type: DataTypes.STRING,
         allowNull: false,
         defaultValue: null,
         comment: "",
         primaryKey: false,
         field: "project_name",
         autoIncrement: false
      },
      reportType: {
         type: DataTypes.STRING,
         allowNull: false,
         defaultValue: null,
         comment: "报表类型",
         primaryKey: false,
         field: "report_type",
         autoIncrement: false
      },
      reportPicPath: {
         type: DataTypes.STRING,
         allowNull: true,
         defaultValue: null,
         comment: "",
         primaryKey: false,
         field: "reportpic_path",
         autoIncrement: false
      },
      framer: {
         type: DataTypes.STRING,
         allowNull: true,
         defaultValue: null,
         comment: "",
         primaryKey: false,
         field: "framer",
         autoIncrement: false
      },
      auditor: {
         type: DataTypes.STRING,
         allowNull: true,
         defaultValue: null,
         comment: "",
         primaryKey: false,
         field: "auditor",
         autoIncrement: false
      },
      ratifier: {
         type: DataTypes.STRING,
         allowNull: true,
         defaultValue: null,
         comment: "",
         primaryKey: false,
         field: "ratifier",
         autoIncrement: false
      },
      coverTime: {
         type: DataTypes.DATE,
         allowNull: true,
         defaultValue: null,
         comment: "",
         primaryKey: false,
         field: "cover_time",
         autoIncrement: false
      },
      structId: {
         type: DataTypes.ARRAY(DataTypes.INTEGER),
         allowNull: false,
         defaultValue: null,
         comment: "",
         primaryKey: false,
         field: "struct_id",
         autoIncrement: false
      },
      structList: {
         type: DataTypes.JSON,
         allowNull: true,
         defaultValue: null,
         comment: "",
         primaryKey: false,
         field: "struct_list",
         autoIncrement: false
      },
      projectOverview: {
         type: DataTypes.STRING,
         allowNull: true,
         defaultValue: null,
         comment: "",
         primaryKey: false,
         field: "project_overview",
         autoIncrement: false
      },
      reportStartTime: {
         type: DataTypes.DATE,
         allowNull: true,
         defaultValue: null,
         comment: "开始时间",
         primaryKey: false,
         field: "report_start_time",
         autoIncrement: false
      },
      reportEndTime: {
         type: DataTypes.DATE,
         allowNull: true,
         defaultValue: null,
         comment: "开始时间",
         primaryKey: false,
         field: "report_end_time",
         autoIncrement: false
      },
      time: {
         type: DataTypes.DATE,
         allowNull: true,
         defaultValue: null,
         comment: "",
         primaryKey: false,
         field: "time",
         autoIncrement: false
      },
      factors: {
         type: DataTypes.JSON,
         allowNull: true,
         defaultValue: null,
         comment: "",
         primaryKey: false,
         field: "factors",
         autoIncrement: false
      },
      overview: {
         type: DataTypes.STRING,
         allowNull: true,
         defaultValue: null,
         comment: "",
         primaryKey: false,
         field: "overview",
         autoIncrement: false
      },
      monitoringBasis: {
         type: DataTypes.STRING,
         allowNull: true,
         defaultValue: null,
         comment: "",
         primaryKey: false,
         field: "monitoring_basis",
         autoIncrement: false
      },
      runState: {
         type: DataTypes.STRING,
         allowNull: true,
         defaultValue: null,
         comment: "",
         primaryKey: false,
         field: "run_state",
         autoIncrement: false
      },
      eventName: {
         type: DataTypes.STRING,
         allowNull: true,
         defaultValue: null,
         comment: "事件名称",
         primaryKey: false,
         field: "event_name",
         autoIncrement: false
      },
      eventSummary: {
         type: DataTypes.STRING,
         allowNull: true,
         defaultValue: null,
         comment: "事件简述",
         primaryKey: false,
         field: "event_summary",
         autoIncrement: false
      }
   }, {
      tableName: "report_automatic",
      comment: "",
      indexes: []
   });
   dc.models.ReportAutomatic = ReportAutomatic;
   return ReportAutomatic;
};