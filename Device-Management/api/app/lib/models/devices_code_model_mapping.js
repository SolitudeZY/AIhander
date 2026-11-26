/* eslint-disable*/
'use strict';

module.exports = dc => {
   const DataTypes = dc.ORM;
   const sequelize = dc.orm;
   const DevicesCodeModelMapping = sequelize.define("devicesCodeModelMapping", {
      id: {
         type: DataTypes.INTEGER,
         allowNull: false,
         primaryKey: true,
         autoIncrement: true,
         field: "id",
      },
      deviceType: {
         type: DataTypes.STRING,
         allowNull: false,
         field: "device_type",
         comment: "设备类型",
      },
      deviceModel: {
         type: DataTypes.STRING,
         allowNull: false,
         field: "device_model",
         comment: "设备型号",
      },
      deviceName: {
         type: DataTypes.STRING,
         allowNull: false,
         field: "device_name",
         comment: "设备名称",
      },
      deviceCode: {
         type: DataTypes.STRING,
         allowNull: false,
         field: "device_code",
         comment: "设备编码",
      }
   }, {
      tableName: "devices_code_model_mapping",
      comment: "设备型号编码对应表",
      indexes: []
   });
   dc.models.DevicesCodeModelMapping = DevicesCodeModelMapping;
   return DevicesCodeModelMapping;
};