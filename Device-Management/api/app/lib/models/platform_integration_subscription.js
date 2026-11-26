'use strict';

// 推送订阅：以项目为单位的告警类型/等级与推送时机
module.exports = dc => {
  const DataTypes = dc.ORM;
  const sequelize = dc.orm;

  const PlatformIntegrationSubscription = sequelize.define('platformIntegrationSubscription', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, field: 'id' },
    projectId: { type: DataTypes.INTEGER, allowNull: false, field: 'project_id' },
    platformConfigId: { type: DataTypes.INTEGER, allowNull: false, field: 'platform_config_id' },
    types: { type: DataTypes.JSONB, allowNull: false, defaultValue: [], field: 'types' },
    levels: { type: DataTypes.JSONB, allowNull: false, defaultValue: [], field: 'levels' },
    timings: { type: DataTypes.JSONB, allowNull: false, defaultValue: ['confirmed'], field: 'timings', comment: 'created/confirmed/recovered' },
    enabled: { type: DataTypes.BOOLEAN, defaultValue: true, field: 'enabled' },
  }, {
    tableName: 'platform_integration_subscription',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { unique: true, fields: ['project_id', 'platform_config_id'], name: 'platform_subscription_uindex' },
    ],
  });

  dc.models.PlatformIntegrationSubscription = PlatformIntegrationSubscription;
  return PlatformIntegrationSubscription;
};
