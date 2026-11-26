"use strict";
const fs = require("fs").promises;
const path = require("path");
const { fault } = require("./agentPlatform");

// Call with bytes exported from an Agent, or read the legacy Node alarms directory.
async function migrateEvidence(platform, key, { apply = false, sourceDir, imageFile } = {}) {
  const row = await platform.get("alarm", key);
  if (!row) throw fault(404, "事件不存在");
  if (row.image_storage && row.image_storage.storage === "qiniu") return { key, status: "already_qiniu" };
  if (!row.image && !imageFile) return { key, status: "no_image" };
  if (!imageFile && path.basename(row.image) !== row.image) throw fault(400, "旧证据文件名无效");
  const file = imageFile || path.join(sourceDir || path.join(platform.root, "alarms"), row.image);
  let bytes;
  try { bytes = await fs.readFile(file); }
  catch (error) { if (error.code === "ENOENT") return { key, status: "missing_file" }; throw error; }
  if (!bytes.length || bytes.length > 1024 * 1024) throw fault(400, "证据文件为空或超过1 MiB");
  const mime = row.imageMimeType;
  if (!["image/jpeg", "image/png"].includes(mime)) throw fault(400, "无效证据格式");
  if (!apply) return { key, status: "ready", bytes: bytes.length };
  if (!platform.fileStorage) throw fault(503, "请配置七牛告警图片存储");
  await platform.saveAlarm(row.device_id, { rowId: row.agent_row_id, image: bytes.toString("base64"), imageMimeType: mime }, row.alarm_time, key);
  return { key, status: "migrated", bytes: bytes.length };
}
module.exports = { migrateEvidence };
