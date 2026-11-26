/* eslint-disable*/
'use strict';

module.exports = dc => {
   const DataTypes = dc.ORM;
   const sequelize = dc.orm;
   const Devices = sequelize.define("devices", {
      deviceCode: {
         type: DataTypes.STRING,
         allowNull: false,
         primaryKey: true,
         field: "device_code",
      },
      productCode: {
         type: DataTypes.STRING,
         allowNull: false,
         field: "product_code",
         comment: "",
      },
      protocol: {
         type: DataTypes.STRING,
         allowNull: false,
         field: "protocol",
         comment: "",
      },
      commMode: {
         type: DataTypes.STRING,
         allowNull: false,
         field: "comm_mode",
         comment: "",
      },
      tags: {
         type: DataTypes.STRING,
         allowNull: true,
         field: "tags",
         comment: "",
      },
      createdAt: {
         type: DataTypes.DATE,
         allowNull: true,
         field: "created_at",
         comment: "",
      },
      updatedAt: {
         type: DataTypes.DATE,
         allowNull: true,
         field: "updated_at",
         comment: "",
      },
      configParams: {
         type: DataTypes.JSONB,
         allowNull: true,
         field: "config_params",
         comment: "",
      },
      picture: {
         type: DataTypes.STRING,
         allowNull: true,
         field: "picture",
         comment: "设备安装图",
      },
      subDevices: {
         type: DataTypes.JSONB,
         allowNull: true,
         field: "sub_devices",
         comment: "已下发的子设备，用于拓扑图展示",
      },
   }, {
      tableName: "devices",
      comment: "设备列表",
      indexes: []
   });
   dc.models.Devices = Devices;
   return Devices;
};