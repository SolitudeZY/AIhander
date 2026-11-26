/* eslint-disable*/
'use strict';

module.exports = dc => {
   const DataTypes = dc.ORM;
   const sequelize = dc.orm;
   const AppAlarm = sequelize.define("appAlarm", {
      id: {
         type: DataTypes.INTEGER,
         allowNull: false,
         defaultValue: null,
         comment: null,
         primaryKey: true,
         field: "id",
         autoIncrement: true,
         unique: "app_alarm_id_uindex"
      },
      serialNumber: {
         type: DataTypes.STRING,
         allowNull: true,
         defaultValue: null,
         comment: "自定义编号",
         primaryKey: false,
         field: "serial_number",
         autoIncrement: false
      },
      projectAppId: {
         type: DataTypes.INTEGER,
         allowNull: true,
         defaultValue: null,
         comment: "对应的项目id",
         primaryKey: false,
         field: "project_app_id",
         autoIncrement: false,
         references: {
            key: "id",
            model: "app"
         }
      },
      appDomain: {
         type: DataTypes.STRING,
         allowNull: true,
         defaultValue: null,
         comment: "应用域名",
         primaryKey: false,
         field: "app_domain",
         autoIncrement: false
      },
      alarmContent: {
         type: DataTypes.STRING,
         allowNull: true,
         defaultValue: null,
         comment: "告警信息",
         primaryKey: false,
         field: "alarm_content",
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
      updateTime: {
         type: DataTypes.DATE,
         allowNull: true,
         defaultValue: null,
         comment: null,
         primaryKey: false,
         field: "update_time",
         autoIncrement: false
      },
      confirm: {
         type: DataTypes.STRING,
         allowNull: true,
         defaultValue: null,
         comment: "确认信息",
         primaryKey: false,
         field: "confirm",
         autoIncrement: false
      },
      router: {
         type: DataTypes.STRING,
         allowNull: true,
         defaultValue: null,
         comment: "路由",
         primaryKey: false,
         field: "router",
         autoIncrement: false
      },
      statusCode: {
         type: DataTypes.STRING,
         allowNull: true,
         defaultValue: null,
         comment: "状态码",
         primaryKey: false,
         field: "status_code",
         autoIncrement: false
      },
      screenshot: {
         type: DataTypes.STRING,
         allowNull: true,
         defaultValue: null,
         comment: null,
         primaryKey: false,
         field: "screenshot",
         autoIncrement: false
      },
      confirmTime: {
         type: DataTypes.DATE,
         allowNull: true,
         defaultValue: null,
         comment: "确认时间",
         primaryKey: false,
         field: "confirm_time",
         autoIncrement: false
      },
      confirmAuto: {
         type: DataTypes.BOOLEAN,
         allowNull: true,
         defaultValue: null,
         comment: "是否自动恢复",
         primaryKey: false,
         field: "confirm_auto",
         autoIncrement: false
      },
      type: {
         type: DataTypes.STRING,
         allowNull: true,
         defaultValue: null,
         comment: null,
         primaryKey: false,
         field: "type",
         autoIncrement: false
      }
   }, {
      tableName: "app_alarm",
      comment: "",
      indexes: []
   });
   dc.models.AppAlarm = AppAlarm;
   return AppAlarm;
};