/* eslint-disable*/

'use strict';

module.exports = dc => {
   const DataTypes = dc.ORM;
   const sequelize = dc.orm;
   const Leakage = sequelize.define("leakage", {
      deviceId: {
         type: DataTypes.STRING,
         allowNull: false,
         defaultValue: null,
         comment: "设备UUID",
         primaryKey: true,
         field: "device_id",
         autoIncrement: false,
         unique: "leakage_device_id_uindex"
      },
      structId: {
         type: DataTypes.INTEGER,
         allowNull: true,
         defaultValue: null,
         comment: "结构物ID",
         primaryKey: false,
         field: "struct_id",
         autoIncrement: false
      },
      deviceName: {
         type: DataTypes.STRING,
         allowNull: true,
         defaultValue: null,
         comment: "设备名称",
         primaryKey: false,
         field: "device_name",
         autoIncrement: false
      },
      structName: {
         type: DataTypes.STRING,
         allowNull: true,
         defaultValue: null,
         comment: "结构物名称",
         primaryKey: false,
         field: "struct_name",
         autoIncrement: false
      },
      slop: {
         type: DataTypes.DOUBLE,
         allowNull: true,
         defaultValue: null,
         comment: "最近一日斜率",
         primaryKey: false,
         field: "slop",
         autoIncrement: false
      },
      intercept: {
         type: DataTypes.DOUBLE,
         allowNull: true,
         defaultValue: null,
         comment: "截距",
         primaryKey: false,
         field: "intercept",
         autoIncrement: false
      },
      daysToLeak: {
         type: DataTypes.DOUBLE,
         allowNull: true,
         defaultValue: null,
         comment: "漏光天数",
         primaryKey: false,
         field: "days_to_leak",
         autoIncrement: false
      },
      analysisDate: {
         type: DataTypes.DATE,
         allowNull: true,
         defaultValue: null,
         comment: "分析日期",
         primaryKey: false,
         field: "analysis_date",
         autoIncrement: false
      },
      trends: {
         type: DataTypes.JSON,
         allowNull: true,
         defaultValue: null,
         comment: "趋势数据",
         primaryKey: false,
         field: "trends",
         autoIncrement: false
      },
      status: {
         type: DataTypes.INTEGER,
         allowNull: false,
         defaultValue: "0",
         comment: "状态（0-未确认（疑似漏电）1-确认（待维修）2-误报）",
         primaryKey: false,
         field: "status",
         autoIncrement: false
      },
      stationId: {
         type: DataTypes.INTEGER,
         allowNull: true,
         defaultValue: null,
         comment: null,
         primaryKey: false,
         field: "station_id",
         autoIncrement: false
      },
      stationName: {
         type: DataTypes.STRING,
         allowNull: true,
         defaultValue: null,
         comment: null,
         primaryKey: false,
         field: "station_name",
         autoIncrement: false
      },
      confirmTime: {
         type: DataTypes.DATE,
         allowNull: true,
         defaultValue: null,
         comment: "状态确认时间",
         primaryKey: false,
         field: "confirm_time",
         autoIncrement: false
      },
      avgSlop: {
         type: DataTypes.DOUBLE,
         allowNull: true,
         defaultValue: null,
         comment: "近10日二次滑动平均",
         primaryKey: false,
         field: "avg_slop",
         autoIncrement: false
      },
      currentPressure: {
         type: DataTypes.DOUBLE,
         allowNull: true,
         defaultValue: null,
         comment: null,
         primaryKey: false,
         field: "current_pressure",
         autoIncrement: false
      },
      daysToWarning: {
         type: DataTypes.DOUBLE,
         allowNull: true,
         defaultValue: null,
         comment: null,
         primaryKey: false,
         field: "days_to_warning",
         autoIncrement: false
      },
      alarmLevel: {
         type: DataTypes.INTEGER,
         allowNull: true,
         defaultValue: null,
         comment: null,
         primaryKey: false,
         field: "alarm_level",
         autoIncrement: false
      },
      suggestions: {
         type: DataTypes.STRING,
         allowNull: true,
         defaultValue: null,
         comment: null,
         primaryKey: false,
         field: "suggestions",
         autoIncrement: false
      },
      groupId: {
         type: DataTypes.INTEGER,
         allowNull: true,
         defaultValue: null,
         comment: null,
         primaryKey: false,
         field: "group_id",
         autoIncrement: false
      },
      isBase: {
         type: DataTypes.BOOLEAN,
         allowNull: true,
         defaultValue: null,
         comment: null,
         primaryKey: false,
         field: "is_base",
         autoIncrement: false
      }
   }, {
      tableName: "leakage",
      comment: "",
      indexes: []
   });
   dc.models.Leakage = Leakage;
   return Leakage;
};