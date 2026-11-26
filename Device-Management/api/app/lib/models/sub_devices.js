/* eslint-disable*/
'use strict';

module.exports = dc => {
   const DataTypes = dc.ORM;
   const sequelize = dc.orm;
   const SubDevices = sequelize.define("subDevices", {
      id: {
         type: DataTypes.INTEGER,
         allowNull: false,
         primaryKey: true,
         autoIncrement: true,
         field: "id",
      },
      name: {
         type: DataTypes.STRING,
         allowNull: false,
         field: "name",
         comment: "",
      },
      deviceCode: {
         type: DataTypes.STRING,
         allowNull: false,
         field: "device_code",
         comment: "",
      },
      deviceType: {
         type: DataTypes.STRING,
         allowNull: false,
         field: "device_type",
         comment: "",
      },
      axyModel: {
         type: DataTypes.STRING,
         allowNull: true,
         field: "axy_model",
         comment: "",
      },
      moduleNo: {
         type: DataTypes.STRING,
         allowNull: true,
         field: "module_no",
         comment: "",
      },
      channelNo: {
         type: DataTypes.INTEGER,
         allowNull: true,
         field: "channel_no",
         comment: "",
      },
      subChannelNo: {
         type: DataTypes.INTEGER,
         allowNull: true,
         field: "sub_channel_no",
         comment: "",
      },
      protocolNo: {
         type: DataTypes.STRING,
         allowNull: true,
         field: "protocol_no",
         comment: "",
      },
      threshold:{
         type: DataTypes.JSONB,
         allowNull: true,
         field: "threshold",
         comment: "",
      },
      formulaId: {
         type: DataTypes.INTEGER,
         allowNull: true,
         field: "formula_id",
         comment: "",
      },
      calcParam1: {
         type: DataTypes.DECIMAL,
         allowNull: true,
         field: "calc_param1",
         comment: "",
      },
      calcParam2: {
         type: DataTypes.DECIMAL,
         allowNull: true,
         field: "calc_param2",
         comment: "",
      },
      calcParam3: {
         type: DataTypes.DECIMAL,
         allowNull: true,
         field: "calc_param3",
         comment: "",
      },
      calcParam4: {
         type: DataTypes.DECIMAL,
         allowNull: true,
         field: "calc_param4",
         comment: "",
      },
      extraParams: {
         type: DataTypes.JSONB,
         allowNull: true,
         field: "extra_params",
         comment: "",
      },
      dcmParams:{
         type: DataTypes.JSONB,
         allowNull: true,
         field: "dcm_params",
      },
      createdAt: {
         type: DataTypes.DATE,
         allowNull: false,
         field: "created_at",
         comment: "",
      },
      updatedAt: {
         type: DataTypes.DATE,
         allowNull: true,
         field: "updated_at",
         comment: "",
      },
      commandId: {
         type: DataTypes.INTEGER,
         allowNull: true,
         field: "command_id",
         comment: "",
      },
      sync: {
         type: DataTypes.BOOLEAN,
         allowNull: false,
         defaultValue: false,
         field: "sync",
         comment: "",
      },
      isDeleted: {
         type: DataTypes.BOOLEAN,
         allowNull: false,
         defaultValue: false,
         field: "is_deleted",
         comment: "",
      },
   }, {
      tableName: "sub_devices",
      comment: "子设备",
      indexes: [
         {
            name: 'idx_sub_devices_device_code',
            fields: ['device_code']
         },
      ]
   });
   dc.models.SubDevices = SubDevices;
   return SubDevices;
};