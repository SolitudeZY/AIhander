/* eslint-disable*/
'use strict';

module.exports = dc => {
   const DataTypes = dc.ORM;
   const sequelize = dc.orm;
   const AlarmDataContinuity = sequelize.define("alarmDataContinuity", {
      id: {
         type: DataTypes.INTEGER,
         allowNull: false,
         defaultValue: null,
         comment: null,
         primaryKey: true,
         field: "id",
         autoIncrement: true,
         unique: "alarm_data_continuity_id_uindex"
      },
      file: {
         type: DataTypes.TEXT,
         allowNull: false,
         defaultValue: null,
         comment: null,
         primaryKey: false,
         field: "file",
         autoIncrement: false
      },
      type: {
         type: DataTypes.INTEGER,
         allowNull: false,
         defaultValue: null,
         comment: null,
         primaryKey: false,
         field: "type",
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
      fileUrl: {
         type: DataTypes.STRING,
         allowNull: true,
         defaultValue: null,
         comment: null,
         primaryKey: false,
         field: "file_url",
         autoIncrement: false
      },
   }, {
      tableName: "alarm_data_continuity",
      comment: "",
      indexes: []
   });
   dc.models.AlarmDataContinuity = AlarmDataContinuity;
   return AlarmDataContinuity;
};