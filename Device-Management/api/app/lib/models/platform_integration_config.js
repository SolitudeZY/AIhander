'use strict';

// 第三方平台对接配置（本期只有安心云），平台字段为后续扩展预留
module.exports = dc => {
  const DataTypes = dc.ORM;
  const sequelize = dc.orm;

  const PlatformIntegrationConfig = sequelize.define('platformIntegrationConfig', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, field: 'id' },
    platform: { type: DataTypes.STRING(32), allowNull: false, defaultValue: 'anxin', field: 'platform' },
    name: { type: DataTypes.STRING(64), field: 'name', comment: '接收平台名称' },
    kind: { type: DataTypes.STRING(32), defaultValue: 'anxin', field: 'kind', comment: 'anxin 安心云 / http 通用 HTTP' },
    credential: { type: DataTypes.STRING(512), field: 'credential', comment: '接口凭证' },
    scopeType: { type: DataTypes.STRING(16), allowNull: false, defaultValue: 'project', field: 'scope_type', comment: 'project/device' },
    projectId: { type: DataTypes.INTEGER, allowNull: true, field: 'project_id' },
    deviceCode: { type: DataTypes.STRING(128), field: 'device_code' },
    structId: { type: DataTypes.STRING(128), field: 'struct_id', comment: '安心云结构物 ID' },
    channel: { type: DataTypes.STRING(16), allowNull: false, defaultValue: 'http', field: 'channel', comment: 'http/mqtt' },
    pushUrl: { type: DataTypes.STRING(512), field: 'push_url' },
    // 结构物列表查询接口：配置后「对象关联」可按项目下拉选择结构物，未配置则手工填写
    structureApiUrl: { type: DataTypes.STRING(512), field: 'structure_api_url' },
    // 账号鉴权：配置后推送前先用账号换 token，供推送地址里的 {token} 占位符使用
    authUrl: { type: DataTypes.STRING(512), field: 'auth_url', comment: '鉴权接口地址' },
    authUsername: { type: DataTypes.STRING(128), field: 'auth_username' },
    authPassword: { type: DataTypes.STRING(255), field: 'auth_password' },
    tokenPath: { type: DataTypes.STRING(64), field: 'token_path', comment: 'token 在响应中的字段路径，如 data.access_token' },
    tokenTtl: { type: DataTypes.INTEGER, field: 'token_ttl', comment: 'token 有效期（秒）' },
    mqttBroker: { type: DataTypes.STRING(255), field: 'mqtt_broker' },
    mqttTopic: { type: DataTypes.STRING(255), field: 'mqtt_topic' },
    mqttClientId: { type: DataTypes.STRING(128), field: 'mqtt_client_id' },
    mqttUsername: { type: DataTypes.STRING(128), field: 'mqtt_username' },
    mqttPassword: { type: DataTypes.STRING(255), field: 'mqtt_password' },
    // 推送报文模板（原始文本）：对方给了报文就直接粘进来，占位符在推送时替换；为空则用内置告警字段
    pushPayloadTemplate: { type: DataTypes.TEXT, field: 'push_payload_template' },
    enabled: { type: DataTypes.BOOLEAN, defaultValue: true, field: 'enabled' },
    confirmCallback: { type: DataTypes.BOOLEAN, defaultValue: false, field: 'confirm_callback', comment: '是否接收外部平台确认回传' },
    createdBy: { type: DataTypes.INTEGER, field: 'created_by' },
  }, {
    tableName: 'platform_integration_config',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { unique: true, fields: ['platform', 'project_id', 'device_code'], name: 'platform_config_scope_uindex' },
    ],
  });

  dc.models.PlatformIntegrationConfig = PlatformIntegrationConfig;
  return PlatformIntegrationConfig;
};
