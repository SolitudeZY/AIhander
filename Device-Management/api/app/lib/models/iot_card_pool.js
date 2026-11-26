/* eslint-disable*/

'use strict';

module.exports = dc => {
  const DataTypes = dc.ORM;
  const sequelize = dc.orm;
  const IotCardPool = sequelize.define("iotCardPool",{
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: null,
      comment: null,
      primaryKey: true,
      field: "id",
      autoIncrement: true,
      unique: "iot_card_pool_id_uindex"
    },
    anxinyunStructureId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null,
      comment: "安心云结构物id",
      primaryKey: false,
      field: "anxinyun_structure_id",
      autoIncrement: false
    },
    anxinyunStructureName: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
      comment: "安心云结构物名称",
      primaryKey: false,
      field: "anxinyun_structure_name",
      autoIncrement: false
    },
    cardNumber: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: null,
      comment: "物联网卡号",
      primaryKey: false,
      field: "card_number",
      autoIncrement: false
    },
    type: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
      comment: "套餐类型",
      primaryKey: false,
      field: "type",
      autoIncrement: false
    },
    total: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
      comment: "套餐余量",
      primaryKey: false,
      field: "total",
      autoIncrement: false
    },
    allowance: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
      comment: "套餐余额",
      primaryKey: false,
      field: "allowance",
      autoIncrement: false
    },
    status: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null,
      comment: "卡状态，0正常，1未激活，停机",
      primaryKey: false,
      field: "status",
      autoIncrement: false
    },
    activeTime: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
      comment: "激活时间",
      primaryKey: false,
      field: "active_time",
      autoIncrement: false
    },
    updateTime: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
      comment: "数据更新时间",
      primaryKey: false,
      field: "update_time",
      autoIncrement: false
    },
    yxbz: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: null,
      comment: "用于判断物联卡是否停用",
      primaryKey: false,
      field: "yxbz",
      autoIncrement: false
    },
    lng: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: null,
      comment: "",
      primaryKey: false,
      field: "lng",
      autoIncrement: false
    },
    lat: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: null,
      comment: "",
      primaryKey: false,
      field: "lat",
      autoIncrement: false
    },
    address: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: null,
      comment: "",
      primaryKey: false,
      field: "address",
      autoIncrement: false
    }
  }, {
    tableName: "iot_card_pool",
    comment: "",
    indexes: []
  });
  dc.models.IotCardPool = IotCardPool;
  return IotCardPool;
};