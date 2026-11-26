/**
 * 文件作用：
 * 保存边缘视觉模型的本地业务元数据，并关联 Node 平台文件 ID。
 *
 * 职责：
 * 1. 支持模型库列表和模型详情查询。
 * 2. 保存创建升级任务所需的模型名称、类型、版本和 Node 平台文件信息。
 *
 * 不负责：
 * 1. 不保存模型文件二进制内容，文件由 Node 的 AgentPlatform 管理。
 * 2. 不保存模型校验状态、操作列或其他评审后取消的页面字段。
 *
 * 维护说明：
 * 模型格式由文件名后缀自动推断；模型名称、类型和版本的业务校验由 API 控制器负责。
 */
"use strict";

module.exports = (dc) => {
  const DataTypes = dc.ORM;
  const sequelize = dc.orm;
  const EdgeVisualModel = sequelize.define(
    "edgeVisualModel",
    {
      id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
        field: "id",
      },
      modelName: {
        type: DataTypes.STRING(128),
        allowNull: false,
        field: "model_name",
        comment: "模型名称",
      },
      modelType: {
        type: DataTypes.STRING(64),
        allowNull: false,
        field: "model_type",
        comment: "识别类型",
      },
      version: {
        type: DataTypes.STRING(64),
        allowNull: false,
        field: "version",
        comment: "模型版本号",
      },
      modelFormat: {
        type: DataTypes.STRING(32),
        allowNull: false,
        field: "model_format",
        comment: "模型格式，由文件扩展名自动推断",
      },
      cloudFileId: {
        type: DataTypes.STRING(128),
        allowNull: false,
        unique: true,
        field: "cloud_file_id",
        comment: "Node 平台文件 ID",
      },
      fileName: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: "file_name",
        comment: "Node 平台文件名称",
      },
      fileSize: {
        type: DataTypes.BIGINT,
        allowNull: true,
        field: "file_size",
        comment: "文件大小，字节",
      },
      sha256: {
        type: DataTypes.STRING(128),
        allowNull: true,
        field: "sha256",
        comment: "Node 上传计算的 SHA-256 快照，Agent 下载校验",
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
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: "updated_at",
      },
    },
    {
      tableName: "edge_visual_model",
      comment: "边缘视觉模型元数据",
      indexes: [
        {
          unique: true,
          fields: ["model_name", "model_type", "version"],
        },
      ],
    },
  );
  dc.models.EdgeVisualModel = EdgeVisualModel;
  return EdgeVisualModel;
};
