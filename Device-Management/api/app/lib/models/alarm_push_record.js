'use strict';

// 每次向外部平台的投递记录，1 事件 × 1 平台 × 1 渠道 1 条
module.exports = dc => {
  const DataTypes = dc.ORM;
  const sequelize = dc.orm;

  const AlarmPushRecord = sequelize.define('alarmPushRecord', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, field: 'id' },
    eventId: { type: DataTypes.STRING(128), allowNull: false, field: 'event_id' },
    alarmId: { type: DataTypes.STRING(128), field: 'alarm_id' },
    platform: { type: DataTypes.STRING(32), allowNull: false, defaultValue: 'anxin', field: 'platform' },
    channel: { type: DataTypes.STRING(16), field: 'channel', comment: 'http/mqtt' },
    configId: { type: DataTypes.INTEGER, field: 'config_id' },
    // 一次投递批次：同一次确认/重推产生的多条记录共用一个批次，列表据此聚合出「部分失败」
    batch: { type: DataTypes.STRING(32), field: 'batch' },
    messageType: { type: DataTypes.STRING(24), defaultValue: 'alarm', field: 'message_type', comment: 'alarm/recovery' },
    requestBody: { type: DataTypes.JSONB, field: 'request_body' },
    status: { type: DataTypes.STRING(16), allowNull: false, defaultValue: 'pending', field: 'status', comment: 'pending/success/failed/skipped' },
    responseCode: { type: DataTypes.INTEGER, field: 'response_code' },
    responseBody: { type: DataTypes.TEXT, field: 'response_body' },
    errorMsg: { type: DataTypes.TEXT, field: 'error_msg' },
    durationMs: { type: DataTypes.INTEGER, field: 'duration_ms' },
    retryCount: { type: DataTypes.INTEGER, defaultValue: 0, field: 'retry_count' },
    operatorId: { type: DataTypes.INTEGER, field: 'operator_id' },
  }, {
    tableName: 'alarm_push_record',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { fields: ['event_id'], name: 'alarm_push_record_event_idx' },
    ],
  });

  dc.models.AlarmPushRecord = AlarmPushRecord;
  return AlarmPushRecord;
};
