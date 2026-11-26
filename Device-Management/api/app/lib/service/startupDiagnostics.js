"use strict";

// Log diagnostic codes, never raw errors: database errors can contain SQL,
// connection URLs, passwords, or device tokens.
const hints = {
  "42P01": "检查 API 连接的数据库及 schema，业务表不存在",
  "42703": "检查目标库表结构，字段不存在",
  "42501": "检查 API 数据库账号的表权限及 schema 权限",
  "28P01": "检查 API 数据库账号认证配置",
  "3D000": "检查 API 配置的数据库名称",
  EACCES: "检查数据目录访问权限",
  EPERM: "检查数据目录访问权限",
  EROFS: "检查只读文件系统及持久目录挂载",
  EEXIST: "检查数据目录位置是否被文件占用",
  ENOTDIR: "检查数据目录路径中的文件与目录",
  ENOSPC: "检查数据目录可用空间",
  ECONNREFUSED: "检查数据库地址、端口及服务状态",
  ETIMEDOUT: "检查数据库网络及连接超时",
  MODEL_NOT_LOADED: "检查发布源码中的 ORM 模型文件及模型加载",
};
module.exports = function startupDiagnostic(error, stage, model) {
  const rawCode = error && ((error.original && error.original.code) || (error.parent && error.parent.code) || error.code);
  const code = typeof rawCode === "string" && /^(?:[A-Z0-9]{5}|E[A-Z0-9_]{2,30}|MODEL_NOT_LOADED)$/.test(rawCode) ? rawCode : "UNKNOWN";
  return `stage=${stage} model=${model} code=${code} hint=${hints[code] || "检查 API 数据库连接、部署源码和运行配置"}`;
};
