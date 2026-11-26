/* eslint-disable*/

'use strict';

module.exports = dc => {
   const DataTypes = dc.ORM;
   const sequelize = dc.orm;
   const ReportFile = sequelize.define("reportFile", {
      id: {
         type: DataTypes.INTEGER,
         allowNull: false,
         defaultValue: null,
         comment: "id",
         primaryKey: true,
         field: "id",
         autoIncrement: true
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
      fileName: {
         type: DataTypes.STRING,
         allowNull: false,
         defaultValue: null,
         comment: "文件名称",
         primaryKey: false,
         field: "file_name",
         autoIncrement: false
      },
      url: {
         type: DataTypes.STRING,
         allowNull: false,
         defaultValue: null,
         comment: "文件路径",
         primaryKey: false,
         field: "url",
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
      startTime: {
         type: DataTypes.DATE,
         allowNull: false,
         defaultValue: null,
         comment: "开始时间",
         primaryKey: false,
         field: "start_time",
         autoIncrement: false
      },
   }, {
      tableName: "report_file",
      comment: "",
      indexes: []
   });
   dc.models.ReportFile = ReportFile;
   return ReportFile;
};