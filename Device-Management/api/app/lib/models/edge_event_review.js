'use strict';

// 事件人工复核 + AI 复核结果，1 个事件 1 条
module.exports = dc => {
  const DataTypes = dc.ORM;
  const sequelize = dc.orm;

  const EdgeEventReview = sequelize.define('edgeEventReview', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, field: 'id' },
    eventId: { type: DataTypes.STRING(128), allowNull: false, unique: true, field: 'event_id' },
    deviceId: { type: DataTypes.STRING(128), allowNull: false, field: 'device_id' },
    rowId: { type: DataTypes.INTEGER, field: 'row_id' },

    aiStatus: { type: DataTypes.STRING(24), field: 'ai_status', comment: 'waiting_evidence/pending/running/done/failed' },
    aiResult: { type: DataTypes.STRING(16), field: 'ai_result', comment: 'real/invalid/unknown' },
    aiReason: { type: DataTypes.TEXT, field: 'ai_reason' },
    aiModelVersion: { type: DataTypes.STRING(64), field: 'ai_model_version' },
    aiExecutedAt: { type: DataTypes.DATE, field: 'ai_executed_at' },
    aiError: { type: DataTypes.TEXT, field: 'ai_error' },
    // 执行次数与历史结果：重试要保留每次的结论，只覆盖最新态
    aiAttempt: { type: DataTypes.INTEGER, defaultValue: 0, field: 'ai_attempt' },
    aiHistory: { type: DataTypes.JSONB, defaultValue: [], field: 'ai_history' },

    manualResult: { type: DataTypes.STRING(16), field: 'manual_result', comment: 'real/invalid/unknown' },
    manualRemark: { type: DataTypes.STRING(500), field: 'manual_remark' },
    confirmUserId: { type: DataTypes.INTEGER, field: 'confirm_user_id' },
    confirmUserName: { type: DataTypes.STRING(64), field: 'confirm_user_name' },
    confirmTime: { type: DataTypes.DATE, field: 'confirm_time' },
    confirmSource: { type: DataTypes.STRING(16), field: 'confirm_source' },
  }, {
    tableName: 'edge_event_review',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  });

  dc.models.EdgeEventReview = EdgeEventReview;
  return EdgeEventReview;
};
