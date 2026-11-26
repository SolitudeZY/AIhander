/* eslint-disable*/
'use strict';

module.exports = dc => {
   const DataTypes = dc.ORM;
   const sequelize = dc.orm;
   const ProductLibrary = sequelize.define("productLibrary", {
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
         comment: "产品名称",
      },
      model: {
         type: DataTypes.STRING,
         allowNull: false,
         field: "model",
         comment: "设备型号",
      },
      picture: {
         type: DataTypes.STRING,
         allowNull: false,
         field: "picture",
         comment: "产品图片",
      },
      productCode: {
         type: DataTypes.STRING,
         allowNull: false,
         field: "product_code",
         comment: "产品编码",
      },
      productType: {
         type: DataTypes.STRING,
         allowNull: true,
         field: "product_type",
         comment: "产品类型",
      },
      configParams: {
         type: DataTypes.JSONB,
         allowNull: true,
         field: "config_params",
         comment: "配置参数",
      },
   }, {
      tableName: "product_library",
      comment: "产品库",
      indexes: []
   });
   dc.models.ProductLibrary = ProductLibrary;
   return ProductLibrary;
};