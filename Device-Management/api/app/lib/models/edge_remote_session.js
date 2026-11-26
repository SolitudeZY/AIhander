/**
 * 文件作用：
 * 保存边缘设备远程会话的开始和结束信息。
 *
 * 职责：
 * 1. 记录远程会话对应的项目、设备和操作人。
 * 2. 为系统日志提供远程会话的业务关联信息。
 *
 * 不负责：
 * 1. recording 仅保存有界脱敏文本，不保存原始 Terminal 字节流。
 * 2. 不替代现有系统日志表，不新增操作审计表。
 *
 * 维护说明：
 * Node 经共享 AgentHub 管理终端；cloudSessionId 是沿用旧列名的 Agent 会话关联标识。
 */
"use strict";

module.exports = (dc) => {
  const DataTypes = dc.ORM;
  const sequelize = dc.orm;
  const EdgeRemoteSession = sequelize.define(
    "edgeRemoteSession",
    {
      id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
        field: "id",
      },
      cloudSessionId: {
        type: DataTypes.STRING(128),
        allowNull: true,
        unique: true,
        field: "cloud_session_id",
        comment: "Agent 会话 ID（沿用旧列名）",
      },
      projectId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: "project_id",
        comment: "项目 ID",
      },
      deviceCode: {
        type: DataTypes.STRING(128),
        allowNull: false,
        field: "device_code",
        comment: "设备 ID",
      },
      deviceName: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: "device_name",
        comment: "设备名称快照",
      },
      operatorId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: "operator_id",
        comment: "操作人 ID",
      },
      purpose: {
        type: DataTypes.STRING(64),
        allowNull: false,
        defaultValue: "terminal",
        field: "purpose",
        comment: "会话用途",
      },
      startedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: "started_at",
      },
      endedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: "ended_at",
      },
      endReason: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: "end_reason",
        comment: "结束原因",
      },
      recording: {
        type: DataTypes.JSONB,
        allowNull: true,
        field: "recording",
        comment: "有界脱敏会话记录；NULL 表示旧会话未录制",
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: "created_at",
      },
    },
    {
      tableName: "edge_remote_session",
      comment: "边缘设备远程会话",
      updatedAt: false,
    },
  );
  dc.models.EdgeRemoteSession = EdgeRemoteSession;
  return EdgeRemoteSession;
};
