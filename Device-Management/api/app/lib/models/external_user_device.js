'use strict';

module.exports = dc => {
  const DataTypes = dc.ORM;
  const sequelize = dc.orm;
  const ExternalUserDevice = sequelize.define('externalUserDevice', {
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
      field: 'id',
      comment: '主键ID'
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'user_id',
      comment: '绑定的外部用户ID'
    },
    model: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'model',
      comment: '设备型号'
    },
    productCode: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'product_code',
      comment: '产品编码'
    },
    deviceCode: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'device_code',
      comment: '设备ID'
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'created_at',
      comment: '创建时间'
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'updated_at',
      comment: '更新时间'
    }
  }, {
    tableName: 'external_user_devices',
    comment: '外部注册用户-设备绑定表',
    indexes: [
      {
        name: 'idx_user',
        fields: ['user_id']
      },
      {
        name: 'idx_device',
        fields: ['device_code']
      },
      {
        name: 'idx_user_device',
        fields: ['user_id', 'device_code']
      },
      {
        name: 'uniq_user_product_device',
        unique: true,
        fields: ['user_id', 'product_code', 'device_code']
      }
    ]
  });
  dc.models.ExternalUserDevice = ExternalUserDevice;
  return ExternalUserDevice;
};
