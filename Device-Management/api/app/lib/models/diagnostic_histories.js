/* eslint-disable*/
'use strict';

module.exports = dc => {
   const DataTypes = dc.ORM;
   const sequelize = dc.orm;
   const DiagnosticHistories = sequelize.define("diagnosticHistories", {
      id: {
         type: DataTypes.INTEGER,
         allowNull: false,
         primaryKey: true,
         autoIncrement: true,
         field: "id",
      },
      deviceCode: {
         type: DataTypes.STRING,
         allowNull: false,
         field: "device_code",
         comment: "",
      },
      content: {
         type: DataTypes.JSONB,
         allowNull: true,
         field: "content",
         comment: "",
      },
      atTime: {
         type: DataTypes.DATE,
         allowNull: true,
         field: "at_time",
         comment: "",
      },
      createdAt: {
         type: DataTypes.DATE,
         allowNull: false,
         field: "created_at",
         comment: "",
      },
   }, {
      tableName: "diagnostic_histories",
      comment: "诊断历史",
      indexes: [
         {
            name: 'idx_diagnostic_histories_at_time',
            fields: ['at_time']
         },
         {
            name: 'idx_diagnostic_histories_device_code',
            fields: ['device_code']
         },
         {
            // 匹配诊断列表的 device_code 过滤及 created_at 倒序，避免单设备历史较多时额外排序。
            name: 'idx_diagnostic_histories_device_code_created_at',
            fields: ['device_code', 'created_at']
         },
      ]
   });
   dc.models.DiagnosticHistories = DiagnosticHistories;
   return DiagnosticHistories;
};
