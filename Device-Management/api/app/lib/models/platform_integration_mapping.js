'use strict';

// 对象关联：本平台项目/设备/通道 → 外部平台结构物与告警源
module.exports = dc => {
  const DataTypes = dc.ORM;
  const sequelize = dc.orm;

  const PlatformIntegrationMapping = sequelize.define('platformIntegrationMapping', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, field: 'id' },
    platformConfigId: { type: DataTypes.INTEGER, allowNull: false, field: 'platform_config_id' },
    projectId: { type: DataTypes.INTEGER, allowNull: false, field: 'project_id' },
    deviceCode: { type: DataTypes.STRING(128), field: 'device_code' },
    channelName: { type: DataTypes.STRING(128), field: 'channel_name', comment: '视频通道名称' },
    structureName: { type: DataTypes.STRING(128), field: 'structure_name' },
    structureId: { type: DataTypes.STRING(128), field: 'structure_id' },
    sourceName: { type: DataTypes.STRING(128), field: 'source_name', comment: '外部告警源名称' },
    sourceId: { type: DataTypes.STRING(128), field: 'source_id', comment: '外部告警源 ID' },
  }, {
    tableName: 'platform_integration_mapping',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { unique: true, fields: ['platform_config_id', 'project_id', 'device_code', 'channel_name'], name: 'platform_mapping_uindex' },
    ],
  });

  dc.models.PlatformIntegrationMapping = PlatformIntegrationMapping;
  return PlatformIntegrationMapping;
};
