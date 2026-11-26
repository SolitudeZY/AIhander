/**
 * 文件作用：
 * 保存升级任务按设备拆分后的本地业务记录。
 *
 * 职责：
 * 1. 一台目标设备对应一条记录，支撑升级任务列表展示。
 * 2. 保存创建任务时的设备名称、模型名称和版本快照。
 *
 * 不负责：
 * 1. 状态、进度和协议明细存于同库 EdgeAgentRecord，由 Node 持久化 Agent 回执。
 * 2. 不保存升级操作列数据。
 *
 * 维护说明：
 * deployment ID 与 device code 保证每个设备的业务快照唯一；旧列名保留用于兼容历史数据。
 */
"use strict";

module.exports = (dc) => {
  const DataTypes = dc.ORM;
  const sequelize = dc.orm;
  const EdgeUpgradeTaskDevice = sequelize.define(
    "edgeUpgradeTaskDevice",
    {
      id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
        field: "id",
      },
      cloudDeploymentId: {
        type: DataTypes.STRING(128),
        allowNull: false,
        field: "cloud_deployment_id",
        comment: "Node deployment ID（沿用旧列名）",
      },
      projectId: {
        type: DataTypes.INTEGER,
        allowNull: false,
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
        allowNull: false,
        field: "device_name",
        comment: "设备名称快照",
      },
      visualModelId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "visual_model_id",
        comment: "本地视觉模型 ID",
      },
      modelName: {
        type: DataTypes.STRING(128),
        allowNull: false,
        field: "model_name",
        comment: "模型名称快照",
      },
      modelType: {
        type: DataTypes.STRING(64),
        allowNull: false,
        field: "model_type",
        comment: "模型类型快照",
      },
      modelVersion: {
        type: DataTypes.STRING(64),
        allowNull: false,
        field: "model_version",
        comment: "模型版本快照",
      },
      cloudFileId: {
        type: DataTypes.STRING(128),
        allowNull: false,
        field: "cloud_file_id",
        comment: "Node 文件 ID 快照（沿用旧列名）",
      },
      createdBy: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: "created_by",
        comment: "创建人 ID",
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: "created_at",
      },
    },
    {
      tableName: "edge_upgrade_task_device",
      comment: "边缘设备升级任务设备记录",
      updatedAt: false,
      indexes: [
        {
          unique: true,
          fields: ["cloud_deployment_id", "device_code"],
        },
        {
          fields: ["project_id", "created_at"],
        },
        {
          fields: ["device_code", "created_at"],
        },
      ],
    },
  );
  dc.models.EdgeUpgradeTaskDevice = EdgeUpgradeTaskDevice;
  return EdgeUpgradeTaskDevice;
};
