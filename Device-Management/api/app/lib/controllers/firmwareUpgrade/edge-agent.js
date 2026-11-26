"use strict";

const fs = require("fs");
const path = require("path");
const uploadMultipartFile = require("../../service/agentMultipartUpload");
const remoteFiles = require("../../service/agentRemoteFiles");
const { Op, literal } = require("sequelize");
const { fault, quality, time, uuid, stamp } = require("../../service/agentPlatform");
const { recordingSummary, recordingDetail, ABNORMAL_REASONS } = require("../../service/terminalRecording");
const { deliver } = require("../../service/alarmPush");
const aiReview = require("../../service/aiReview");

const text = value => String(value == null ? "" : value).trim();
const plain = row => row.toJSON ? row.toJSON() : row;
const models = ctx => ctx.fs.dc.models;
const SOURCE = "edge_cloud"; // Existing project bindings; no Cloud service remains.
const owner = ctx => (ctx.fs.api || {}).userId || null;
function number(value, name, max = Number.MAX_SAFE_INTEGER) {
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < 1 || n > max) throw fault(400, `${name}必须为正整数且不超过${max}`);
  return n;
}
function page(query, defaultSize = 10) {
  return { page: query.page ? number(query.page, "page") : 1, size: query.page_size || query.pageSize ? number(query.page_size || query.pageSize, "page_size", 100) : defaultSize };
}
function endpoint(fn) {
  return async ctx => {
    try {
      const platform = ctx.app.fs.agentPlatform;
      if (!platform) throw fault(503, "Agent平台尚未初始化");
      await platform.ready;
      ctx.status = 200;
      await fn(ctx, platform);
    } catch (error) {
      ctx.fs.logger.error(`Agent接口失败 path=${ctx.path} status=${error.status || 500}`);
      const protocolStatus = { DEVICE_OFFLINE: 503, AGENT_TIMEOUT: 504, BUFFER_LIMIT: 503 }[error.code];
      ctx.status = error.status || protocolStatus || (error.name === "SequelizeUniqueConstraintError" ? 409 : 500);
      ctx.body = { message: error.status || protocolStatus ? error.message : "处理失败，请检查数据库迁移、数据目录或服务日志" };
    }
  };
}

async function audit(ctx, content) {
  if (models(ctx).SystemLog) await models(ctx).SystemLog.create({ logTime: new Date(), content: String(content || "").slice(0, 255), url: ctx.path, userId: owner(ctx), module: "边缘设备管理" }, { logging: false }).catch(error => ctx.fs.logger.error(`记录边缘设备操作日志失败: ${error && error.message}`));
}
async function command(platform, deviceId, cmd, values = {}, expected = cmd, timeout = 10000) {
  await platform.device(deviceId);
  const result = await platform.hub.request(deviceId, cmd, values, expected, timeout);
  if (result.operate === false || result.err) {
    const message = String(result.err || "设备拒绝请求");
    throw fault(/revision|conflict|版本|存在/.test(message) ? 409 : 502, message);
  }
  return result;
}
function channelItem(platform, id, channel) {
  const uri = new URL(channel.rtspUrl);
  const username = decodeURIComponent(uri.username);
  const configured = Boolean(uri.password);
  uri.username = ""; uri.password = "";
  const status = channel.enabled === false ? { status: "disabled", inputFps: 0, detectionStatus: "stopped" } : platform.channelStatuses.get(`${id}:${channel.channelId}`) || {};
  return { id: channel.channelId, channel_id: channel.channelId, device_id: id, name: channel.name, rtsp_url: uri.toString(), model_name: channel.moduleName,
    enabled: channel.enabled, transport: text(channel.transport).toLowerCase() || "tcp", revision: channel.revision, username, password_configured: configured,
    status: !channel.enabled ? "disabled" : status.status || "unknown", input_fps: status.inputFps || 0, codec: status.codec || "", resolution: status.resolution || "",
    quality_status: quality(status), snapshot: status.snapshot || "", snapshot_mime_type: status.snapshotMimeType || "image/jpeg", picture_metrics: status.pictureMetrics || null,
    observed_at: status.observedAt || "", detection_status: status.detectionStatus || "unknown", error: status.err ? "视频流不可用，请检查设备及连接参数" : "" };
}
async function channels(platform, id, timeout) {
  const result = await command(platform, id, "channelList", {}, "channelListResult", timeout);
  const list = result.channels || [];
  for (const channel of list) await platform.syncChannelConfig(id, channel);
  return list;
}
function camera(body, saved) {
  let uri;
  try { uri = new URL(text(body.rtsp_url)); } catch (_) { throw fault(400, "无效RTSP地址"); }
  if (!["rtsp:", "rtsps:"].includes(uri.protocol) || !uri.hostname || uri.username || uri.password) throw fault(400, "RTSP地址必须有效，账号密码请使用独立字段");
  const transport = text(body.transport || (saved && saved.transport)).toLowerCase() || "tcp";
  if (!["tcp", "udp"].includes(transport)) throw fault(400, "transport必须为tcp或udp");
  uri.username = body.username === undefined && saved && saved.rtspUrl ? new URL(saved.rtspUrl).username : text(body.username);
  if (body.password !== undefined && body.password !== null) uri.password = String(body.password);
  else if (saved && saved.rtspUrl) {
    const old = new URL(saved.rtspUrl);
    if (uri.hostname === old.hostname && uri.username === old.username) uri.password = old.password;
  }
  return { rtspUrl: uri.toString(), transport };
}
function fileAPI(row) { const { cloudFileId, ...data } = plain(row); return { ...data, fileId: cloudFileId }; }
function taskAPI(row) { const { cloudDeploymentId, cloudFileId, ...data } = plain(row); return { ...data, deploymentId: cloudDeploymentId, fileId: cloudFileId }; }
function evidenceBase(data) {
  return `/edgeAgent/events/${encodeURIComponent(data.device_id)}/${data.agent_row_id}/evidence`;
}

const EVIDENCE_LABEL = { original: "原始截图", annotated: "标注图", video: "视频片段" };

// 证据列表：设备上报了多形态就按多形态返回，否则退回单张原图
function evidenceItems(data) {
  const base = evidenceBase(data);
  const raw = Array.isArray(data.evidence_items) ? data.evidence_items : [];
  if (raw.length) {
    return raw.map((e, i) => {
      const id = text(e.id) || String(i + 1);
      const kind = ["original", "annotated", "video"].includes(e.kind) ? e.kind : "original";
      return {
        id,
        kind,
        label: text(e.label) || EVIDENCE_LABEL[kind],
        mime_type: text(e.mime_type) || (kind === "video" ? "video/mp4" : "image/jpeg"),
        captured_at: text(e.captured_at) || text(data.alarm_time),
        meta: e.meta || null,
        url: `${base}/${encodeURIComponent(id)}`,
      };
    });
  }
  if (data.image || data.image_storage) {
    return [{
      id: "original",
      kind: "original",
      label: EVIDENCE_LABEL.original,
      mime_type: text(data.imageMimeType) || "image/jpeg",
      captured_at: text(data.alarm_time),
      meta: null,
      url: `${base}/original`,
    }];
  }
  return [];
}

// 证据状态三态：已上传 / 上传中 / 缺失
function uploadStatusOf(data) {
  if (text(data.upload_status) === "uploading") return "uploading";
  return evidenceItems(data).length ? "uploaded" : "missing";
}

function eventAPI(data) {
  const { image, imageMimeType, image_storage, ...item } = data;
  const evidence = evidenceItems(data);
  return {
    ...item,
    // image_url 保持原契约（单张原图），evidence_items 提供多形态证据
    ...(image || image_storage ? { image_url: `/edgeAgent/events/${encodeURIComponent(data.device_id)}/${data.agent_row_id}/image` } : {}),
    upload_status: uploadStatusOf(data),
    evidence_items: evidence,
  };
}
async function eventResponses(platform, items) {
  const ids = [...new Set(items.filter(item => !text(item.model_version)).map(item => item.device_id).filter(Boolean))];
  const devices = ids.length ? await platform.records("device", { id: { [Op.in]: ids } }) : [];
  const versions = new Map(devices.map(row => [row.id, text(row.data.model_version)]));
  // Older Agents can omit the event version. Resolve it for display only so
  // historical records retain their original reported metadata.
  return items.map(item => eventAPI({ ...item, model_version: text(item.model_version) || versions.get(item.device_id) || "" }));
}
function exceptionAPI(data) { return { ...data, duration_seconds: Math.max(0, Math.floor((Date.parse(data.ended_at || stamp()) - Date.parse(data.started_at)) / 1000)) }; }

// 把人工复核、AI 复核、最近一次推送结果合并进事件对象；列表用批量查询，避免 N+1
async function attachReviewState(ctx, items) {
  if (!items || !items.length) return items;
  const ids = items.map(item => item.validation_id).filter(Boolean);
  if (!ids.length) return items;
  const [reviews, pushes] = await Promise.all([
    models(ctx).EdgeEventReview.findAll({ where: { eventId: { [Op.in]: ids } }, logging: false }),
    models(ctx).AlarmPushRecord.findAll({ where: { eventId: { [Op.in]: ids } }, order: [["id", "DESC"]], logging: false }),
  ]);
  const reviewMap = new Map(reviews.map(row => [row.eventId, row]));
  // 按事件聚合最近一次投递批次：多平台里部分失败要能显示成「部分失败」
  const grouped = new Map();
  for (const row of pushes) {
    if (!grouped.has(row.eventId)) grouped.set(row.eventId, []);
    grouped.get(row.eventId).push(row);
  }
  const pushMap = new Map();
  for (const [key, list] of grouped) {
    const latest = list.reduce((a, b) => (Number(b.id) > Number(a.id) ? b : a));
    const batch = latest.batch ? list.filter(row => row.batch === latest.batch) : [latest];
    const count = status => batch.filter(row => row.status === status).length;
    const success = count("success");
    const failed = count("failed");
    const skipped = count("skipped");
    const status = failed && success ? "partial" : failed ? "failed" : success ? "success" : "skipped";
    const errors = [...new Set(batch.map(row => row.errorMsg).filter(Boolean))];
    pushMap.set(key, {
      status,
      channel: latest.channel || latest.platform,
      time: latest.updated_at || latest.created_at,
      error: errors.join("；") || null,
      total: batch.length,
      success,
      failed,
      skipped,
    });
  }
  for (const item of items) {
    const key = item.validation_id;
    const review = reviewMap.get(key);
    const push = pushMap.get(key);
    item.alarm_id = key;
    // 边缘事件目前全部按告警处理；后续若引入"事件不成告警"规则，在这里判定
    item.has_alarm = true;
    item.ai_review_status = review ? review.aiStatus : "pending";
    item.ai_review_result = review ? review.aiResult : null;
    item.ai_review_reason = review ? review.aiReason : null;
    item.ai_model_version = review ? review.aiModelVersion : null;
    item.ai_executed_at = review ? review.aiExecutedAt : null;
    item.ai_review_error = review ? review.aiError : null;
    item.ai_attempt = review ? Number(review.aiAttempt) || 0 : 0;
    item.ai_history = review && Array.isArray(review.aiHistory) ? review.aiHistory : [];
    item.manual_review_result = review ? review.manualResult : null;
    item.manual_review_remark = review ? review.manualRemark : null;
    item.confirm_user_name = review ? review.confirmUserName : null;
    item.confirm_time = review ? review.confirmTime : null;
    item.confirm_source = review ? review.confirmSource : null;
    item.push_status = push ? push.status : "unconfigured";
    item.push_channel = push ? push.channel : null;
    item.push_time = push ? push.time : null;
    item.push_error = push ? push.error : null;
    item.push_summary = push
      ? { total: push.total, success: push.success, failed: push.failed, skipped: push.skipped }
      : null;
  }
  return items;
}
async function exceptionResponses(ctx, items) {
  const ids = [...new Set(items.map(item => Number(item.acknowledged_by)).filter(id => Number.isSafeInteger(id) && id > 0))];
  const User = models(ctx).User;
  const users = ids.length && User ? await User.findAll({ where: { id: { [Op.in]: ids } }, attributes: ["id", "username", "name"], raw: true, logging: false }) : [];
  const operators = new Map(users.map(user => [String(user.id), user]));
  return items.map(item => {
    const user = operators.get(String(item.acknowledged_by));
    return { ...exceptionAPI(item), acknowledged_by_username: user ? user.username : "", acknowledged_by_name: user ? user.name : "" };
  });
}

const api = {};
const pendingFaults = rows => rows.filter(row => row.data.acknowledged !== true);
api.health = endpoint(async (ctx, platform) => { ctx.body = { status: "ok", service: "node-agent", connected: platform.hub.sessions.size }; });
api.registerAgent = endpoint(async (ctx, platform) => { ctx.body = await platform.register(ctx.request.body || {}, ctx.ip); });
api.listDevices = endpoint(async (ctx, platform) => {
  const [records, bindings, faults] = await Promise.all([platform.records("device"), models(ctx).ProjectDevice.findAll({ where: { sourceSystem: SOURCE }, include: [{ model: models(ctx).Project, attributes: ["id", "name"] }] }), platform.records("exception", { "data.status": "active", "data.record_type": "exception" })]);
  const bound = new Map(bindings.map(row => [row.deviceCode, row]));
  const items = [];
  // Bound concurrency and a shared 2s list budget for live channel counts.
  const deadline = Date.now() + 2000;
  for (let offset = 0; offset < records.length; offset += 8) {
    await Promise.all(records.slice(offset, offset + 8).map(async row => {
      const device = await platform.device(row.id);
      const active = faults.filter(row => row.deviceId === device.id);
      device.channel_count = null; device.abnormal = pendingFaults(active).length ? "存在异常" : "正常";
      if (device.online && Date.now() < deadline) {
        try {
          const list = await channels(platform, row.id, Math.max(1, deadline - Date.now()));
          device.channel_count = list.length; device.channel_count_observed_at = stamp();
          // Confirmed disabled configurations may have closed old faults.
          const current = await platform.records("exception", { deviceId: device.id, "data.status": "active", "data.record_type": "exception" });
          const acknowledged = new Set(current.filter(row => row.data.acknowledged === true).map(row => `${row.data.channel_id}:${row.data.type}`));
          device.abnormal = pendingFaults(current).length ? "存在异常" : "正常";
          for (const c of list) {
            if (c.enabled === false) continue;
            const s = platform.channelStatuses.get(`${row.id}:${c.channelId}`) || {};
            const streamBad = s.err || ["offline", "error", "reconnecting"].includes(s.status) || !["normal", "unknown"].includes(quality(s));
            if ((streamBad && !acknowledged.has(`${c.channelId}:channel_abnormal`)) || (s.detectionStatus === "error" && !acknowledged.has(`${c.channelId}:detection_abnormal`))) device.abnormal = "存在异常";
          }
        } catch (_) { device.abnormal = "存在异常"; }
      }
      const binding = bound.get(row.id);
      const project = binding && (binding.project || binding.Project);
      items.push({ ...device, projectId: binding ? binding.projectId : null, projectName: project ? project.name : null });
    }));
  }
  const q = ctx.query || {};
  ctx.body = items.filter(item => (!q.projectId || String(item.projectId) === String(q.projectId)) && (!q.keyword || [item.id, item.name, item.agent_version].some(v => text(v).toLowerCase().includes(text(q.keyword).toLowerCase()))) && (!q.abnormal || (q.abnormal === "normal" ? item.abnormal === "正常" : item.abnormal !== "正常")));
});
api.getDevice = endpoint(async (ctx, platform) => {
  const item = await platform.device(ctx.params.id);
  const binding = await models(ctx).ProjectDevice.findOne({ where: { deviceCode: item.id, sourceSystem: SOURCE }, include: [{ model: models(ctx).Project, attributes: ["id", "name"] }] });
  const project = binding && (binding.project || binding.Project);
  const faults = await platform.records("exception", { deviceId: item.id, "data.status": "active", "data.record_type": "exception" });
  ctx.body = { ...item, abnormal: pendingFaults(faults).length ? "存在异常" : "正常", projectId: binding ? binding.projectId : null, projectName: project ? project.name : null };
});
api.acknowledgeException = endpoint(async (ctx, platform) => {
  const operatorId = owner(ctx);
  if (!operatorId) throw fault(401, "请先登录后确认异常");
  const item = await platform.acknowledgeException(ctx.params.id, text(ctx.params.exceptionID), operatorId);
  ctx.body = (await exceptionResponses(ctx, [item]))[0];
  await audit(ctx, `确认设备异常：${ctx.params.id}/${item.id}`);
});
api.listDeviceDirectories = endpoint(async (ctx, platform) => { ctx.body = await command(platform, ctx.params.id, "directory.list", {}, "directory.list.response"); });
api.assignDeviceProject = endpoint(async (ctx, platform) => {
  const projectId = number((ctx.request.body || {}).projectId, "projectId");
  const device = await platform.device(ctx.params.id);
  const project = await models(ctx).Project.findByPk(projectId);
  if (!project) throw fault(404, "项目不存在");
  await ctx.fs.dc.orm.transaction(async transaction => {
    const [row] = await models(ctx).ProjectDevice.findOrCreate({ where: { deviceCode: device.id, sourceSystem: SOURCE }, defaults: { projectId, createdAt: new Date(), updatedAt: new Date() }, transaction });
    await row.update({ projectId, updatedAt: new Date() }, { transaction });
  });
  await audit(ctx, `分配边缘设备：${device.name} -> ${project.name}`);
  ctx.body = { deviceCode: device.id, deviceName: device.name, projectId, projectName: project.name };
});
api.unassignDeviceProject = endpoint(async ctx => {
  await models(ctx).ProjectDevice.destroy({ where: { deviceCode: ctx.params.id, sourceSystem: SOURCE } });
  await audit(ctx, `解除边缘设备项目关联：${ctx.params.id}`); ctx.status = 204; ctx.body = null;
});
api.listModels = endpoint(async ctx => {
  const q = ctx.query || {}; const p = page(q); const where = {};
  if (q.modelType) where.modelType = q.modelType;
  if (q.keyword) where[Op.or] = [{ modelName: { [Op.like]: `%${q.keyword}%` } }, { version: { [Op.like]: `%${q.keyword}%` } }];
  const result = await models(ctx).EdgeVisualModel.findAndCountAll({ where, offset: (p.page - 1) * p.size, limit: p.size, order: [["createdAt", "DESC"], ["id", "DESC"]] });
  ctx.body = { count: result.count, rows: result.rows.map(fileAPI) };
});
api.createModel = endpoint(async (ctx, platform) => {
  const b = ctx.request.body || {};
  if (!text(b.modelName) || !text(b.modelType) || !text(b.version) || !text(b.fileId)) throw fault(400, "模型名称、类型、版本和文件ID不能为空");
  const file = await platform.get("file", b.fileId);
  if (!file) throw fault(404, "模型文件不存在");
  const format = path.extname(file.original_name).slice(1).toLowerCase();
  if (!["rknn", "onnx"].includes(format)) throw fault(400, "模型文件必须为rknn或onnx");
  const modelName = text(b.modelName);
  const modelType = text(b.modelType);
  const version = text(b.version);
  const now = new Date();
  let row;
  try {
    row = await models(ctx).EdgeVisualModel.create({ modelName, modelType, version, modelFormat: format,
      cloudFileId: file.id, fileName: file.original_name, fileSize: file.size_bytes, sha256: file.sha256, createdBy: owner(ctx), createdAt: now, updatedAt: now });
  } catch (error) {
    if (error.name === "SequelizeUniqueConstraintError") {
      const duplicate = await models(ctx).EdgeVisualModel.findOne({
        where: { modelName, modelType, version },
        attributes: ["id"],
      });
      if (duplicate) throw fault(409, `识别类型“${modelType}”的模型版本“${version}”已存在，请更换版本号后重试`);
    }
    throw error;
  }
  await audit(ctx, `新增视觉模型：${row.modelName} ${row.version}`);
  ctx.status = 201; ctx.body = fileAPI(row);
});
api.createDeployment = endpoint(async (ctx, platform) => {
  const b = ctx.request.body || {}; const modelId = number(b.modelId, "modelId"); const projectId = number(b.projectId, "projectId");
  const model = await models(ctx).EdgeVisualModel.findByPk(modelId);
  if (!model) throw fault(404, "模型不存在");
  const ids = [...new Set(b.deviceCodes || b.deviceIds || [])];
  if (!ids.length) throw fault(400, "请选择目标设备");
  const bindings = await models(ctx).ProjectDevice.findAll({ where: { projectId, sourceSystem: SOURCE, deviceCode: { [Op.in]: ids } } });
  if (bindings.length !== ids.length) throw fault(400, "目标设备必须属于当前项目");
  const result = await ctx.fs.dc.orm.transaction(async transaction => {
    const created = await platform.createTasks({ name: model.modelName, version: model.version, file_id: model.cloudFileId, device_ids: ids, target_path: text(b.targetPath), target_is_directory: b.targetIsDirectory !== false }, "model", transaction);
    const rows = await Promise.all(ids.map(async deviceCode => ({ cloudDeploymentId: created.id, projectId, deviceCode, deviceName: (await platform.device(deviceCode)).name,
      visualModelId: model.id, modelName: model.modelName, modelType: model.modelType, modelVersion: model.version, cloudFileId: model.cloudFileId, createdBy: owner(ctx), createdAt: new Date() })));
    await models(ctx).EdgeUpgradeTaskDevice.bulkCreate(rows, { transaction });
    return created;
  });
  for (const task of result.tasks) await platform.dispatch(task);
  await audit(ctx, `创建模型升级任务：${model.modelName} ${model.version}，设备${ids.length}台`);
  ctx.status = 201; ctx.body = { id: result.id, taskCount: result.task_count, deviceCount: ids.length };
});
api.listDeployments = endpoint(async (ctx, platform) => {
  const q = ctx.query || {}; const p = page(q); const where = {};
  if (q.projectId) where.projectId = number(q.projectId, "projectId");
  if (q.modelId) where.visualModelId = number(q.modelId, "modelId");
  if (q.taskId) where.cloudDeploymentId = q.taskId;
  if (q.startTime || q.endTime) {
    where.createdAt = {};
    if (q.startTime) where.createdAt[Op.gte] = new Date(time(q.startTime));
    if (q.endTime) where.createdAt[Op.lte] = new Date(time(q.endTime));
  }
  // Status comes from persisted task records, never N HTTP calls to another service.
  if (q.status) {
    const status = { "成功": "succeeded", "失败": "failed", "已下发": "pending" }[q.status];
    const filter = status || { [Op.in]: ["downloading", "verifying", "installing"] };
    const records = await platform.records("task", { "data.status": filter });
    where[Op.or] = records.filter(r => !q.taskId || r.data.deployment_id === q.taskId)
      .map(r => ({ cloudDeploymentId: r.data.deployment_id, deviceCode: r.deviceId }));
  }
  const result = await models(ctx).EdgeUpgradeTaskDevice.findAndCountAll({ where,
    include: [{ model: models(ctx).Project, attributes: ["id", "name"] }, { model: models(ctx).EdgeVisualModel, attributes: ["id", "modelName", "version"] }, { model: models(ctx).User, as: "creator", attributes: ["id", "name", "username"] }],
    offset: (p.page - 1) * p.size, limit: p.size, order: [["createdAt", "DESC"], ["id", "DESC"]] });
  const tasks = await platform.records("task", { "data.deployment_id": { [Op.in]: result.rows.map(r => r.cloudDeploymentId) } });
  const states = new Map(tasks.map(row => [`${row.data.deployment_id}:${row.deviceId}`, row.data]));
  const labels = { succeeded: "成功", failed: "失败", pending: "已下发" };
  ctx.body = { count: result.count, rows: result.rows.map(row => { const task = states.get(`${row.cloudDeploymentId}:${row.deviceCode}`); return { ...taskAPI(row), status: task ? labels[task.status] || "执行中" : "历史状态未迁入", dispatchedAt: row.createdAt, initiator: row.creator && (row.creator.name || row.creator.username) || row.createdBy || "-" }; }) };
});
api.getDeployment = endpoint(async (ctx, platform) => {
  const records = await platform.records("task", { "data.deployment_id": ctx.params.id });
  if (!records.length) throw fault(404, "任务不存在");
  const rows = await models(ctx).EdgeUpgradeTaskDevice.findAll({ where: { cloudDeploymentId: ctx.params.id }, include: [{ model: models(ctx).Project, attributes: ["id", "name"] }] });
  ctx.body = { id: ctx.params.id, rows: rows.map(taskAPI), deployment: { source: "node", name: records[0].data.name, version: records[0].data.version, createdAt: records[0].data.created_at, tasks: records.map(r => r.data) } };
});
api.redispatchDeployment = endpoint(async (ctx, platform) => {
  const records = await platform.records("task", { "data.deployment_id": ctx.params.id });
  if (!records.length) throw fault(404, "任务不存在");
  let dispatched = 0;
  for (const row of records) {
    if (["downloading", "verifying", "installing"].includes(row.data.status)) continue;
    const task = { ...row.data, status: "pending", progress: 0, message: "等待重发", updated_at: stamp() };
    await platform.put("task", row.id, task, row.deviceId);
    if (await platform.dispatch(task)) dispatched++;
  }
  await audit(ctx, `重新下发升级任务：${ctx.params.id}`); ctx.body = { id: ctx.params.id, dispatched };
});
api.clearDeploymentHistory = endpoint(async (ctx, platform) => {
  const rows = await platform.records("task"); const groups = new Map();
  for (const row of rows) { const list = groups.get(row.data.deployment_id) || []; list.push(row); groups.set(row.data.deployment_id, list); }
  const ids = [...groups].filter(([, list]) => list.every(row => ["succeeded", "failed"].includes(row.data.status))).map(([id]) => id);
  await ctx.fs.dc.orm.transaction(async transaction => {
    await platform.model.destroy({ where: { kind: "task", "data.deployment_id": { [Op.in]: ids } }, transaction });
    await models(ctx).EdgeUpgradeTaskDevice.destroy({ where: { cloudDeploymentId: { [Op.in]: ids } }, transaction });
  });
  ctx.body = { deleted_deployments: ids.length };
});
api.listVideoChannels = endpoint(async (ctx, platform) => { ctx.body = (await channels(platform, ctx.params.id)).map(c => channelItem(platform, ctx.params.id, c)); });
async function saveChannel(ctx, platform, update) {
  const b = ctx.request.body || {}; const id = ctx.params.id;
  let saved;
  if (update) {
    saved = (await channels(platform, id)).find(c => c.channelId === ctx.params.channelID);
    if (!saved) throw fault(404, "通道不存在");
    if (number(b.expected_revision, "expected_revision") !== saved.revision) throw fault(409, "通道版本冲突，请刷新");
  }
  const model = text(b.model_name || (saved && saved.moduleName));
  if (!text(b.name) || !/^[^/\\]+\.(rknn|onnx)$/i.test(model) || typeof b.enabled !== "boolean") throw fault(400, "通道名称、模型文件名和enabled不合法");
  const values = { channelId: update ? saved.channelId : `CH-${uuid()}`, name: text(b.name), enabled: b.enabled, moduleName: model, ...camera(b, saved), expectedRevision: update ? saved.revision : 0 };
  const result = await command(platform, id, "channelSet", values);
  const c = result.channel || { ...values, revision: result.revision || (update ? saved.revision + 1 : 1) };
  await platform.syncChannelConfig(id, c);
  ctx.status = update ? 200 : 201; ctx.body = channelItem(platform, id, c);
  await audit(ctx, `${update ? "修改" : "新增"}视频通道：${id}/${c.channelId}`);
}
api.createVideoChannel = endpoint((ctx, platform) => saveChannel(ctx, platform, false));
api.updateVideoChannel = endpoint((ctx, platform) => saveChannel(ctx, platform, true));
api.deleteVideoChannel = endpoint(async (ctx, platform) => {
  const revision = number((ctx.request.body || {}).expected_revision || ctx.query.expected_revision, "expected_revision");
  ctx.body = await command(platform, ctx.params.id, "channelDelete", { channelId: ctx.params.channelID, expectedRevision: revision });
  await audit(ctx, `删除视频通道：${ctx.params.id}/${ctx.params.channelID}`);
});
api.testVideoChannel = endpoint(async (ctx, platform) => {
  const b = ctx.request.body || {}; let saved;
  if (b.channel_id) saved = (await channels(platform, ctx.params.id)).find(c => c.channelId === b.channel_id);
  if (b.channel_id && !saved) throw fault(404, "通道不存在");
  await platform.device(ctx.params.id);
  const probe = camera({ ...b, rtsp_url: b.rtsp_url || (saved ? new URL(saved.rtspUrl).toString().replace(/\/\/[^@/]+@/, "//") : "") }, saved);
  const result = await platform.hub.request(ctx.params.id, "channelTest", { channelId: b.channel_id || "", ...probe }, "channelTestResult", 15000);
  ctx.body = result;
  ctx.status = { timeout: 504, probe_unavailable: 502, probe_failed: 502 }[result.error_code] || 200;
});
api.listFiles = endpoint(async (ctx, platform) => { ctx.body = (await platform.records("file")).map(r => r.data); });
api.uploadFile = endpoint(async (ctx, platform) => {
  const file = await uploadMultipartFile(ctx.req, platform);
  ctx.status = 201; ctx.body = file; await audit(ctx, `上传文件：${file.original_name} (${file.id})`);
});
api.downloadAgentFile = endpoint(async (ctx, platform) => {
  const bearer = /^Bearer\s+(\S+)$/i.exec(ctx.get("Authorization"));
  const device = bearer && await platform.authenticate(bearer[1]);
  if (!device) throw fault(401, "invalid device token");
  const assignments = await platform.records("task", { deviceId: device.id, "data.file_id": ctx.params.id }, { limit: 1 });
  if (!assignments.length) throw fault(403, "文件未分配给该设备");
  const file = await platform.get("file", ctx.params.id);
  if (!file) throw fault(404, "文件不存在");
  if (file.storage === "qiniu") {
    ctx.set("Cache-Control", "no-store");
    ctx.set("Location", await platform.fileDownloadURL(file));
    ctx.body = null;
    ctx.status = 307;
    return;
  }
  const filename = path.join(platform.root, "uploads", file.storage_name);
  const stat = await fs.promises.stat(filename).catch(() => { throw fault(404, "文件内容缺失"); });
  ctx.type = "application/octet-stream";
  ctx.set("Accept-Ranges", "bytes");
  const range = ctx.get("Range"); let start = 0; let end = stat.size - 1;
  if (range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (!match || (!match[1] && !match[2])) { ctx.set("Content-Range", `bytes */${stat.size}`); throw fault(416, "无效Range"); }
    if (!match[1]) start = Math.max(0, stat.size - Number(match[2]));
    else { start = Number(match[1]); if (match[2]) end = Math.min(end, Number(match[2])); }
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end || start >= stat.size) { ctx.set("Content-Range", `bytes */${stat.size}`); throw fault(416, "Range超出文件大小"); }
    ctx.status = 206; ctx.set("Content-Range", `bytes ${start}-${end}/${stat.size}`);
  }
  ctx.set("Content-Length", String(end - start + 1)); ctx.body = fs.createReadStream(filename, { start, end });
});
api.deliverDeviceFile = endpoint(async (ctx, platform) => {
  const b = ctx.request.body || {};
  const result = await platform.createTasks({ file_id: text(b.fileId), device_ids: [ctx.params.id], name: text(b.name), target_path: text(b.targetPath), target_is_directory: true }, "file");
  for (const task of result.tasks) await platform.dispatch(task);
  ctx.status = 201; ctx.body = { id: result.id, task_count: result.task_count };
  await audit(ctx, `投递文件：${ctx.params.id}/${b.fileId}`);
});
api.getRemoteFileInfo = endpoint(async (ctx, platform) => {
  ctx.body = await remoteFiles.info(platform, ctx.params.id);
});
api.uploadRemoteFile = endpoint(async (ctx, platform) => {
  const result = await remoteFiles.upload(platform, ctx.params.id, ctx.req);
  ctx.status = 201; ctx.body = result;
  await audit(ctx, `远程文件上传：${ctx.params.id}/${result.name}，${result.size} 字节`);
});
api.downloadRemoteFile = endpoint(async (ctx, platform) => {
  const result = await remoteFiles.download(platform, ctx.params.id, ctx.query.name);
  ctx.type = "application/octet-stream";
  ctx.set("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(result.name)}`);
  ctx.set("Content-Length", String(result.size));
  ctx.set("Cache-Control", "private, no-store");
  // Destroying an unread stream must release the device transfer as well.
  ctx.res.once("close", () => { result.body.destroy(); result.cleanup(); });
  ctx.body = result.body;
  result.body.once("end", () => {
    audit(ctx, `远程文件下载：${ctx.params.id}/${result.name}，${result.size} 字节`).catch(() => {});
  });
});
// 设备端历史上报过多种 detection_type 写法，库里是并存状态；
// 筛选按别名集合匹配，否则下拉选「人员闯入」只能查到其中一种。
const DETECTION_TYPE_ALIASES = {
  landslide: ["landslide", "slope_deform", "slope"],
  person_intrusion: ["person_intrusion", "personIntrusion", "person"],
  picture: ["picture", "screen_abnormal", "screenAbnormal"],
};

async function eventFilter(query = {}, ctx) {
  const where = {}; const exception = query.category === "exceptions" || query.type || query.status || query.record_type;
  if (query.category && !["exceptions", "detections"].includes(query.category)) throw fault(400, "category不合法");
  if (query.category === "detections" && exception) throw fault(400, "异常筛选需要category=exceptions");
  if (query.device_id) where.deviceId = query.device_id;
  if (query.channel_id) where["data.channel_id"] = query.channel_id;
  // 项目筛选要落到设备集合上：事件只存 deviceId（设备编码），项目关系在 ProjectDevice
  if (query.project_id) {
    const projectId = number(query.project_id, "project_id");
    const devices = await models(ctx).ProjectDevice.findAll({
      where: { projectId, sourceSystem: SOURCE },
      attributes: ["deviceCode"],
      raw: true,
      logging: false,
    });
    const ids = devices.map(row => row.deviceCode);
    // 同时指定了设备时取交集，避免两个条件互相覆盖
    where.deviceId = where.deviceId ? { [Op.in]: ids.filter(id => String(id) === String(where.deviceId)) } : { [Op.in]: ids };
  }
  if (exception) {
    for (const [key, options] of Object.entries({ type: ["device_offline", "channel_abnormal", "detection_abnormal", "auto_recover"], status: ["active", "recovered", "closed", "acknowledged"], record_type: ["exception", "recovery"] })) {
      if (key === "status" && query.status === "acknowledged") { where["data.acknowledged"] = true; continue; }
      if (query[key]) { if (!options.includes(query[key])) throw fault(400, `${key}不合法`); where[`data.${key}`] = query[key]; }
    }
  } else {
    if (query.detection_type) {
      const aliases = DETECTION_TYPE_ALIASES[query.detection_type] || [query.detection_type];
      where["data.detection_type"] = aliases.length > 1 ? { [Op.in]: aliases } : aliases[0];
    }
    if (query.min_confidence !== undefined && query.min_confidence !== "") {
      const n = Number(query.min_confidence); if (!Number.isFinite(n) || n < 0 || n > 1) throw fault(400, "min_confidence不合法");
      where["data.confidence"] = { [Op.gte]: n };
    }
    if (query.evidence_status) {
      if (!["uploaded", "not_uploaded"].includes(query.evidence_status)) throw fault(400, "evidence_status不合法");
      // 「无证据」要同时兜住历史数据里的 missing，否则筛出来是 0 条但列表里明明有
      where["data.upload_status"] = query.evidence_status === "uploaded" ? "uploaded" : { [Op.in]: ["not_uploaded", "missing"] };
    }
  }
  if (query.start_time || query.end_time) {
    const range = {};
    if (query.start_time) range[Op.gte] = time(query.start_time);
    if (query.end_time) range[Op.lte] = time(query.end_time);
    if (query.start_time && query.end_time && range[Op.gte] > range[Op.lte]) throw fault(400, "开始时间不能晚于结束时间");
    if (exception) where[Op.or] = [
      { "data.record_type": "exception", "data.started_at": range },
      { "data.record_type": "recovery", "data.ended_at": range },
    ];
    else where["data.alarm_time"] = range;
  }
  return { kind: exception ? "exception" : "alarm", where };
}
api.listEvents = endpoint(async (ctx, platform) => {
  const p = page(ctx.query, 30); const filter = await eventFilter(ctx.query, ctx);
  const eventTime = filter.kind === "alarm" ? "data->>'alarm_time'" : "CASE WHEN data->>'record_type'='recovery' THEN data->>'ended_at' ELSE data->>'started_at' END";
  const result = await platform.model.findAndCountAll({ where: { kind: filter.kind, ...filter.where }, order: [[literal(eventTime), "DESC"], ["deviceId", "ASC"], ["id", "DESC"]], limit: p.size, offset: (p.page - 1) * p.size, logging: false });
  const items = filter.kind === "alarm" ? await eventResponses(platform, result.rows.map(r => r.data)) : await exceptionResponses(ctx, result.rows.map(r => r.data));
  if (filter.kind === "alarm") await attachReviewState(ctx, items);
  ctx.body = { items, total: result.count, page: p.page, page_size: p.size, has_more: p.page * p.size < result.count };
});
api.getEventStatistics = endpoint(async (ctx, platform) => {
  const filter = await eventFilter(ctx.query, ctx);
  if (filter.kind !== "alarm") throw fault(400, "统计仅支持检测事件");
  // Aggregate in PostgreSQL, without loading evidence or all alarm rows.
  const q = platform.model;
  const count = await q.count({ where: { kind: "alarm", ...filter.where }, logging: false });
  const withImage = await q.count({ where: { kind: "alarm", [Op.and]: [filter.where, { "data.upload_status": "uploaded" }] }, logging: false });
  const rows = await q.findAll({ where: { kind: "alarm", ...filter.where }, attributes: ["deviceId"], group: ["deviceId"], raw: true, logging: false });
  const orm = ctx.fs.dc.ORM;
  const types = await q.findAll({ where: { kind: "alarm", ...filter.where }, attributes: [[orm.literal("data->>'detection_type'"), "detection_type"], [orm.fn("COUNT", orm.col("id")), "count"]], group: [orm.literal("data->>'detection_type'")], limit: 50, raw: true, logging: false });
  const dates = await q.findAll({ where: { kind: "alarm", ...filter.where }, attributes: [[orm.fn("MIN", orm.literal("data->>'alarm_time'")), "first_alarm_time"], [orm.fn("MAX", orm.literal("data->>'alarm_time'")), "last_alarm_time"]], raw: true, logging: false });
  ctx.body = { total: count, with_image: withImage, device_count: rows.length, first_alarm_time: dates[0].first_alarm_time || "", last_alarm_time: dates[0].last_alarm_time || "", by_detection_type: types.map(r => ({ ...r, count: Number(r.count) })), type_limit: 50 };
});
api.getEventDetail = endpoint(async (ctx, platform) => {
  const row = await platform.get("alarm", `${ctx.params.deviceId}:${number(ctx.params.rowId, "rowId")}`);
  if (!row) throw fault(404, "事件不存在");
  const data = (await eventResponses(platform, [row]))[0];
  await attachReviewState(ctx, [data]);
  ctx.body = data;
});

// 人工确认告警：三分类结论，首次确认生效；确认为真实告警时触发安心云推送
api.reviewEvent = endpoint(async (ctx, platform) => {
  const deviceId = ctx.params.deviceId;
  const rowId = number(ctx.params.rowId, "rowId");
  const eventId = `${deviceId}:${rowId}`;
  const body = ctx.request.body || {};
  const result = String(body.result || "");
  if (!["real", "invalid", "unknown"].includes(result)) throw fault(400, "确认结果只能是 real / invalid / unknown");
  const remark = String(body.remark || "").slice(0, 500);
  // 来源：本平台页面确认 / 安心云回传 / 其他外部接口
  const source = ["web", "anxin", "api"].includes(String(body.source || "")) ? String(body.source) : "web";

  const row = await platform.get("alarm", eventId);
  if (!row) throw fault(404, "事件不存在");

  const [review] = await models(ctx).EdgeEventReview.findOrCreate({
    where: { eventId },
    defaults: { eventId, deviceId, rowId, aiStatus: "pending" },
    logging: false,
  });
  if (review.manualResult) {
    // 同一告警只按首次有效确认生效：同结论视为重复请求，直接返回既有记录，不重复推送
    if (review.manualResult === result) {
      ctx.body = {
        review: review.toJSON(),
        push: { status: "skipped", message: "重复确认，已按首次结论生效，未重复同步" },
        duplicated: true,
      };
      return;
    }
    throw fault(409, "该告警已有有效人工结论，按首次确认生效，不能覆盖");
  }

  const apiUser = ctx.fs.api || {};
  const operatorId = owner(ctx);
  // 鉴权中间件只放了 userId，确认人得回查用户表
  let confirmUserName = apiUser.userName || apiUser.name || (apiUser.user && apiUser.user.name) || null;
  if (!confirmUserName && operatorId && models(ctx).User) {
    const user = await models(ctx).User.findOne({ where: { id: operatorId }, attributes: ["name"], raw: true, logging: false });
    confirmUserName = user ? user.name : null;
  }
  review.manualResult = result;
  review.manualRemark = remark || null;
  review.confirmTime = new Date();
  review.confirmUserId = operatorId;
  review.confirmUserName = confirmUserName;
  review.confirmSource = source;
  await review.save({ logging: false });
  const confirmUser = confirmUserName || (operatorId ? `用户#${operatorId}` : "未知");
  // 换行压成空格，避免日志表格里显示断裂；长度受 content varchar(255) 约束
  const remarkText = String(remark || "").replace(/\s+/g, " ").trim();
  await audit(ctx, `确认告警 ${eventId}：${result}（来源 ${source}，确认人 ${confirmUser}）${remarkText ? `，备注：${remarkText.slice(0, 150)}` : ""}`);

  let push = { status: "skipped", message: "无需推送" };
  if (result === "real") {
    const binding = await models(ctx).ProjectDevice.findOne({
      where: { deviceCode: deviceId },
      include: [{ model: models(ctx).Project, attributes: ["id", "name"] }],
      logging: false,
    });
    const project = binding ? binding.Project || binding.project : null;
    push = await deliver({
      models: models(ctx),
      event: row,
      eventId,
      project: project ? { id: project.id, name: project.name } : null,
      deviceName: row.device_name,
      operatorId,
    });
    await audit(ctx, `推送安心云 ${eventId}：${push.status}`);
  }

  ctx.body = { review: review.toJSON(), push };
});
// 触发 AI 复核：设备上报时自动触发，这里用于补跑历史事件或失败后重试
api.reviewEventWithAI = endpoint(async (ctx, platform) => {
  const eventId = `${ctx.params.deviceId}:${number(ctx.params.rowId, "rowId")}`;
  const row = await platform.get("alarm", eventId);
  if (!row) throw fault(404, "事件不存在");
  if (!platform.aiReviewConfig) throw fault(503, "未配置 AI 复核服务");
  const review = await aiReview.review({ models: models(ctx), platform, config: platform.aiReviewConfig, eventId, data: row });
  ctx.body = {
    ai_review_status: review.aiStatus,
    ai_review_result: review.aiResult,
    ai_review_reason: review.aiReason,
    ai_model_version: review.aiModelVersion,
    ai_executed_at: review.aiExecutedAt,
    ai_review_error: review.aiError,
    ai_attempt: review.aiAttempt,
    ai_history: review.aiHistory,
  };
});
// 重新推送：已确认为真实告警后补推一次，用于下发失败或对方恢复后重试
api.retryEventPush = endpoint(async (ctx, platform) => {
  const eventId = `${ctx.params.deviceId}:${number(ctx.params.rowId, "rowId")}`;
  const row = await platform.get("alarm", eventId);
  if (!row) throw fault(404, "事件不存在");
  const review = await models(ctx).EdgeEventReview.findOne({ where: { eventId }, logging: false });
  if (!review || review.manualResult !== "real") throw fault(400, "只有人工确认为真实告警的事件可以重新推送");
  const binding = await models(ctx).ProjectDevice.findOne({
    where: { deviceCode: ctx.params.deviceId },
    include: [{ model: models(ctx).Project, attributes: ["id", "name"] }],
    logging: false,
  });
  const project = binding ? binding.Project || binding.project : null;
  const push = await deliver({
    models: models(ctx),
    event: row,
    eventId,
    project: project ? { id: project.id, name: project.name } : null,
    deviceName: row.device_name,
    operatorId: owner(ctx),
  });
  await audit(ctx, `重新推送 ${eventId}：${push.status}`);
  ctx.body = { push };
});
// 证据文件：原始截图 / 标注图 / 视频片段，统一按证据 ID 取
api.getEventEvidence = endpoint(async (ctx, platform) => {
  const row = await platform.get("alarm", `${ctx.params.deviceId}:${number(ctx.params.rowId, "rowId")}`);
  if (!row) throw fault(404, "事件不存在");
  const id = text(ctx.params.evidenceId) || "original";
  const list = Array.isArray(row.evidence_items) ? row.evidence_items : [];
  let hit = list.find(item => text(item.id) === id);
  if (!hit && id === "original" && (row.image || row.image_storage)) {
    hit = { file: row.image, storage: row.image_storage, mime_type: row.imageMimeType };
  }
  if (!hit) throw fault(404, "证据不存在");
  ctx.set("Cache-Control", "private, no-store");
  if (hit.storage && hit.storage.storage === "qiniu") {
    if (!platform.fileStorage) throw fault(503, "请配置七牛告警图片存储");
    ctx.redirect(platform.fileStorage.downloadURL(hit.storage));
    return;
  }
  const file = text(hit.file);
  if (!file) throw fault(404, "证据文件缺失");
  const full = path.join(platform.root, "alarms", file);
  await fs.promises.access(full).catch(() => { throw fault(404, "证据文件缺失"); });
  ctx.type = text(hit.mime_type) || text(hit.mimeType) || "image/jpeg";
  ctx.body = fs.createReadStream(full);
});
api.getEventImage = endpoint(async (ctx, platform) => {
  const row = await platform.get("alarm", `${ctx.params.deviceId}:${number(ctx.params.rowId, "rowId")}`);
  if (!row || (!row.image && !row.image_storage)) throw fault(404, "证据不存在");
  if (row.image_storage && row.image_storage.storage === "qiniu") {
    if (!platform.fileStorage) throw fault(503, "请配置七牛告警图片存储");
    ctx.set("Cache-Control", "private, no-store");
    ctx.redirect(platform.fileStorage.downloadURL(row.image_storage));
    return;
  }
  const file = path.join(platform.root, "alarms", row.image);
  await fs.promises.access(file).catch(() => { throw fault(404, "证据文件缺失"); });
  ctx.type = row.imageMimeType; ctx.body = fs.createReadStream(file);
});
api.rebootDevice = endpoint(async (ctx, platform) => {
  const b = ctx.request.body || {}; const deviceId = ctx.params.id;
  const key = ctx.get("Idempotency-Key") || b.idempotencyKey || ctx.query.idempotencyKey;
  if (b.confirm !== true || !/^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/.test(key || "")) throw fault(400, "需要confirm=true及有效Idempotency-Key");
  await platform.device(deviceId);
  const operation = await ctx.fs.dc.orm.transaction(async transaction => {
    await ctx.fs.dc.orm.query("SELECT pg_advisory_xact_lock(hashtextextended(:id,0))", { replacements: { id: deviceId }, transaction, logging: false });
    const replay = await platform.records("operation", { deviceId, "data.idempotency_key": key }, { transaction, limit: 1 });
    if (replay.length) return { existing: true, data: replay[0].data };
    const active = await platform.records("operation", { deviceId, "data.status": { [Op.in]: ["requested", "accepted", "unknown"] } }, { transaction, limit: 1 });
    if (active.length) throw fault(409, "设备已有未完成的重启操作");
    if (!platform.hub.isConnected(deviceId)) throw fault(503, "设备离线");
    // Existing Agents require 32 characters for reboot IDs; other platform IDs
    // retain their UUID format. Store and send the same ID for receipt lookup.
    const id = uuid().replace(/-/g, ""); const now = stamp(); const data = { id, device_id: deviceId, idempotency_key: key, type: "reboot", status: "requested", message: "等待设备确认", boot_id: "", created_at: now, updated_at: now };
    await platform.put("operation", id, data, deviceId, transaction); return { data };
  });
  if (!operation.existing) {
    try {
      const result = await platform.hub.request(deviceId, "deviceReboot", { operation_id: operation.data.id }, "deviceRebootResult");
      if (result.operation_id !== operation.data.id) throw fault(502, "无效设备确认");
      await platform.receive(deviceId, { cmd: "deviceRebootResult", values: result });
      ctx.status = result.status === "accepted" ? 202 : { disabled: 403, busy: 409, unsupported: 422 }[result.error_code] || 502;
    } catch (error) {
      const saved = await platform.get("operation", operation.data.id);
      if (saved.status === "requested") await platform.put("operation", saved.id, { ...saved, status: "unknown", message: "设备确认未收到，请查询操作结果", updated_at: stamp() }, deviceId);
      ctx.status = error.status || 504;
    }
    await audit(ctx, `请求重启设备：${deviceId}，操作${operation.data.id}`);
  }
  const saved = await platform.get("operation", operation.data.id); const { idempotency_key, boot_id, ...item } = saved;
  ctx.body = item; ctx.set("Location", `/edgeAgent/devices/${encodeURIComponent(deviceId)}/operations/${saved.id}`);
});
api.getDeviceOperation = endpoint(async (ctx, platform) => {
  const row = await platform.get("operation", ctx.params.operationID);
  if (!row || row.device_id !== ctx.params.id) throw fault(404, "操作不存在");
  const { idempotency_key, boot_id, ...item } = row; ctx.body = item;
});
api.listRemoteSessions = endpoint(async ctx => {
  const q = ctx.query || {}; const p = page(q); const where = { deviceCode: ctx.params.id };
  if (q.operatorId) where.operatorId = number(q.operatorId, "operatorId");
  if (q.startTime) where.startedAt = { [Op.gte]: new Date(time(q.startTime)) };
  if (q.endTime) where.endedAt = { [Op.lte]: new Date(time(q.endTime)) };
  if (q.status) {
    if (!["active", "ended", "abnormal"].includes(q.status)) throw fault(400, "status不合法");
    if (q.status === "active") where.endedAt = null;
    else { where.endedAt = { ...(where.endedAt || {}), [Op.not]: null }; where.endReason = { [q.status === "abnormal" ? Op.in : Op.notIn]: ABNORMAL_REASONS }; }
  }
  const result = await models(ctx).EdgeRemoteSession.findAndCountAll({ where, attributes: { exclude: ["recording"], include: [[literal('"edgeRemoteSession"."recording" - \'events\''), "recordingMeta"]] }, include: [{ model: models(ctx).Project, attributes: ["id", "name"] }], offset: (p.page - 1) * p.size, limit: p.size, order: [["startedAt", "DESC"]] });
  ctx.body = { count: result.count, rows: await Promise.all(result.rows.map(row => serializeSession(ctx, row, false))) };
});
async function serializeSession(ctx, row, detail) {
  const r = plain(row); const operator = r.operatorId && models(ctx).User ? await models(ctx).User.findByPk(r.operatorId, { attributes: ["name", "username"] }) : null;
  const { cloudSessionId, recording, recordingMeta, ...data } = r;
  return { ...data, sessionId: cloudSessionId, status: !r.endedAt ? "active" : ABNORMAL_REASONS.includes(r.endReason) ? "abnormal" : "ended", operatorName: operator ? operator.name || operator.username : null,
    durationSeconds: Math.max(0, Math.floor((new Date(r.endedAt || Date.now()) - new Date(r.startedAt)) / 1000)), ...(detail ? recordingDetail(recording) : { recordingSummary: recordingSummary(recordingMeta) }) };
}
api.getRemoteSession = endpoint(async ctx => {
  const row = await models(ctx).EdgeRemoteSession.findByPk(number(ctx.params.sessionId, "sessionId"), { include: [{ model: models(ctx).Project, attributes: ["id", "name"] }] });
  if (!row) throw fault(404, "会话不存在"); ctx.body = await serializeSession(ctx, row, true);
});
api.resetDatabase = endpoint(async (ctx, platform) => {
  if ((ctx.request.body || {}).confirm !== true) throw fault(400, "清理数据需要confirm=true");
  if (platform.hub.sessions.size) throw fault(409, "请先断开设备连接再清理测试数据");
  await ctx.fs.dc.orm.transaction(async transaction => {
    await models(ctx).EdgeUpgradeTaskDevice.destroy({ where: {}, transaction });
    await models(ctx).EdgeVisualModel.destroy({ where: {}, transaction });
    await platform.model.destroy({ where: {}, transaction });
  });
  ctx.body = { cleared: true }; await audit(ctx, "清理Agent平台测试数据");
});
module.exports = api;
