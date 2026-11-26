"use strict";

const fs = require("fs");
const fsp = fs.promises;
const path = require("path");
const crypto = require("crypto");
const { Op } = require("sequelize");
const { promisify } = require("util");
const pipeline = promisify(require("stream").pipeline);
const { Transform } = require("stream");
const startupDiagnostic = require("./startupDiagnostics");
const aiReview = require("./aiReview");

const stamp = () => new Date().toISOString();
const hash = value => crypto.createHash("sha256").update(value).digest("hex");
const uuid = require("uuid").v4;
function fault(status, message) { return Object.assign(new Error(message), { status }); }
function time(value) {
  // Require an explicit timezone, matching the Agent RFC3339 contract.
  if (typeof value !== "string" || !/(Z|[+-]\d\d:\d\d)$/.test(value) || !Number.isFinite(Date.parse(value))) throw fault(400, "时间必须为带时区的 RFC3339 格式");
  return new Date(value).toISOString();
}
function quality(s) {
  if (["normal", "black_screen", "occlusion", "blur", "brightness_abnormal"].includes(s.qualityStatus)) return s.qualityStatus;
  const m = s.pictureMetrics;
  if (!m) return "unknown";
  for (const name of ["black_screen", "occlusion", "blur", "brightness_abnormal"]) if (Number(m[name]) >= 80) return name;
  return "normal";
}

class AgentPlatform {
  constructor(app, options = {}) {
    this.app = app;
    this.root = path.resolve(options.dataDir || process.env.EDGE_AGENT_DATA_DIR || "./data/edge-agent");
    this.publicURL = (options.publicURL || process.env.EDGE_AGENT_PUBLIC_URL || "").replace(/\/$/, "");
    this.fileStorage = options.fileStorage || null;
    this.aiReviewConfig = options.aiReview || null;
    this.channelStatuses = new Map();
    this.channelConfigs = new Map();
    this.ready = this.initialize();
    // Keep startup rejection handled until HTTP/WS consumers await it.
    this.ready.catch(error => app.fs.logger.error(`Agent 数据初始化失败 ${startupDiagnostic(error, this.initializationStage, "EdgeAgentRecord")}`));
  }
  get model() { return this.app.fs.dc.models.EdgeAgentRecord; }
  get hub() { return this.app.fs.agentHub; }
  async initialize() {
    this.initializationStage = "uploads-directory";
    await fsp.mkdir(path.join(this.root, "uploads"), { recursive: true });
    this.initializationStage = "alarms-directory";
    await fsp.mkdir(path.join(this.root, "alarms"), { recursive: true });
    // Fail early if migration wasn't applied. No automatic sync/alter in production.
    this.initializationStage = "database";
    if (!this.model) throw Object.assign(new Error("EdgeAgentRecord model is not loaded"), { code: "MODEL_NOT_LOADED" });
    await this.model.findOne({ where: { kind: "device" }, logging: false });
  }
  async get(kind, id, transaction) {
    const row = await this.model.findOne({ where: { kind, id: String(id) }, transaction, logging: false });
    return row ? row.data : null;
  }
  async put(kind, id, data, deviceId = null, transaction) {
    const existing = await this.model.findOne({ where: { kind, id: String(id) }, transaction, logging: false });
    await this.model.upsert({ kind, id: String(id), deviceId, data, createdAt: existing ? existing.createdAt : new Date(), updatedAt: new Date() }, { transaction, logging: false });
    return data;
  }
  async records(kind, where = {}, options = {}) {
    return this.model.findAll({ where: { kind, ...where }, order: [["createdAt", "DESC"], ["id", "DESC"]], logging: false, ...options });
  }
  async device(id) {
    const data = await this.get("device", id);
    if (!data) throw fault(404, "设备不存在");
    const { token_hash, ...item } = data;
    return { ...item, online: Boolean(this.hub && this.hub.isConnected(id)) };
  }
  async register(body, address) {
    await this.ready;
    for (const key of ["device_id", "name", "os", "arch", "sku", "runtime_version", "model_version", "address"]) {
      if (typeof body[key] !== "string" || !body[key].trim() || body[key].length > 255) throw fault(400, `${key}不能为空或过长`);
    }
    if (body.device_id.length > 128) throw fault(400, "device_id过长");
    if (body.device_token && body.token && body.device_token !== body.token) throw fault(400, "device_token与token不一致");
    const token = body.device_token || body.token || "";
    return this.app.fs.dc.orm.transaction(async transaction => {
      await this.app.fs.dc.orm.query("SELECT pg_advisory_xact_lock(hashtextextended(:id,0))", { replacements: { id: body.device_id }, transaction, logging: false });
      const existing = await this.get("device", body.device_id, transaction);
      if (existing && (!token || hash(token) !== existing.token_hash)) throw fault(401, "invalid existing device token");
      // Preserve provided tokens on first registration so migrated Agent state
      // doesn't need to be removed. Existing identities always require a token.
      const issued = token || crypto.randomBytes(32).toString("hex");
      const now = stamp();
      const data = { ...(existing || {}), id: body.device_id, token_hash: hash(issued), name: body.name, os: body.os, arch: body.arch,
        cpu_model: String(body.cpu_model || ""), agent_version: String(body.agent_version || ""), sku: body.sku,
        runtime_version: body.runtime_version, model_version: body.model_version, address: body.address,
        created_at: existing ? existing.created_at : now, first_registered_at: existing ? existing.created_at : now,
        last_seen_at: now, last_registration_address: address, registration_method: "agent" };
      await this.put("device", data.id, data, data.id, transaction);
      return { device_id: data.id, device_token: issued, token: issued };
    });
  }
  async authenticate(token) {
    await this.ready;
    if (!token) return null;
    const rows = await this.records("device", { "data.token_hash": hash(token) }, { limit: 1 });
    return rows[0] ? rows[0].data : null;
  }
  async connected(id, online) {
    if (!online) {
      for (const key of this.channelStatuses.keys()) if (key.startsWith(id + ":")) this.channelStatuses.delete(key);
      for (const key of this.channelConfigs.keys()) if (key.startsWith(id + ":")) this.channelConfigs.delete(key);
    }
    await this.observe(id, "", "device_offline", "device", online ? "online" : "offline", "设备控制连接中断", "none", online ? "设备已重新连接" : "", !online, stamp());
  }
  async receive(id, message) {
    const v = message.values || {};
    if (message.cmd === "heartbeat" || message.cmd === "ping") {
      const device = await this.get("device", id);
      if (!device) return;
      const now = stamp();
      device.last_seen_at = now;
      device.cpu_percent = v.cpu_percent;
      device.memory_total_gb = Number(v.memory_total_bytes || 0) / 1073741824;
      device.memory_used_percent = v.memory_used_percent;
      device.disk_total_gb = Number(v.disk_total_bytes || 0) / 1073741824;
      device.disk_used_percent = v.disk_used_percent;
      // Clear stale readings when an older Agent or unavailable sensor omits temperature.
      device.temperature_celsius = Number.isFinite(v.temperature_celsius) ? v.temperature_celsius : null;
      device.boot_id = v.boot_id || "";
      await this.put("device", id, device, id);
      if (v.reboot_result) await this.receive(id, { cmd: "deviceRebootResult", values: v.reboot_result });
      if (v.boot_id) {
        const operations = await this.records("operation", { deviceId: id, "data.status": { [Op.in]: ["accepted", "unknown"] } });
        for (const row of operations) if (row.data.boot_id && row.data.boot_id !== v.boot_id) await this.put("operation", row.id, { ...row.data, status: "succeeded", message: "设备已以新的启动标识恢复连接", updated_at: now }, id);
      }
    } else if (message.cmd === "alarmReport") {
      const ids = [];
      for (const alarm of v.alarms || []) {
        if (!Number.isSafeInteger(alarm.rowId) || alarm.rowId <= 0 || !alarm.channelId || !alarm.detectionType || !Number.isFinite(alarm.confidence) || alarm.confidence < 0 || alarm.confidence > 1) throw fault(400, "无效告警");
        const alarmTime = time(alarm.alarmTime);
        const key = `${id}:${alarm.rowId}`;
        await this.saveAlarm(id, alarm, alarmTime, key);
        ids.push(alarm.rowId);
      }
      this.hub.send(id, "alarmReportResult", { operate: true, rowIds: ids });
    } else if (message.cmd === "channelStatusChanged" || message.cmd === "channelSet") {
      if (message.cmd === "channelSet") {
        if (v.operate === true && v.channel) await this.syncChannelConfig(id, v.channel);
        return;
      }
      if (!v.channelId) return;
      const config = this.channelConfigs.get(`${id}:${v.channelId}`);
      if (config && Number.isSafeInteger(v.revision) && v.revision < config.revision) return;
      // A confirmed disabled configuration suppresses stopped-worker reports.
      // A newer revision can be an out-of-band re-enable; query the Agent again.
      if (config && config.enabled === false) {
        if (!Number.isSafeInteger(v.revision) || v.revision <= config.revision) return;
        const reply = await this.hub.request(id, "channelList", {}, "channelListResult");
        if (reply.operate === false) return;
        const channel = (reply.channels || []).find(c => c.channelId === v.channelId);
        if (!channel) return;
        await this.syncChannelConfig(id, channel);
        if (channel.enabled === false) return;
      }
      const observed = v.observedAt ? time(v.observedAt) : stamp();
      const key = `${id}:${v.channelId}`;
      const previous = this.channelStatuses.get(key);
      if (previous && previous.observedAt >= observed) return;
      const status = { ...v, observedAt: observed };
      const q = quality(status);
      const streamBad = ["offline", "error", "reconnecting"].includes(status.status);
      const qualityBad = !["normal", "unknown"].includes(q);
      if (streamBad || qualityBad || (status.status === "running" && q === "normal")) await this.observe(id, v.channelId, "channel_abnormal", v.channelId, status.status, streamBad ? "视频流中断" : `画面质量异常：${q}`, v.recoveryAction === "reconnect_channel" ? v.recoveryAction : "none", "视频流正常，画面质量检测通过", streamBad || qualityBad, observed);
      if (["running", "error"].includes(status.detectionStatus)) await this.observe(id, v.channelId, "detection_abnormal", v.modelVersion || v.channelId, status.detectionStatus, `视觉模型异常：${v.detectionErrorCode || "unknown"}`, "none", "视觉模型已完成一次成功推理", status.detectionStatus === "error", observed);
      // Publish only after persistence succeeds so a failed observation can
      // safely be retried with the same timestamp.
      this.channelStatuses.set(key, status);
    } else if (message.cmd === "task.status") {
      if (!["downloading", "verifying", "installing", "succeeded", "failed"].includes(v.status)) return;
      const task = await this.get("task", v.task_id);
      if (!task || task.device_id !== id || ["succeeded", "failed"].includes(task.status)) return;
      await this.put("task", v.task_id, { ...task, status: v.status, progress: Math.min(100, Math.max(0, Number(v.progress) || 0)), message: String(v.message || "").slice(0, 1000), result_output: String(v.result_output || "").slice(0, 64000), updated_at: stamp() }, id);
    } else if (message.cmd === "deviceRebootResult") {
      const op = await this.get("operation", v.operation_id);
      if (!op || op.device_id !== id || !["requested", "accepted", "unknown"].includes(op.status) || !["accepted", "failed", "unknown"].includes(v.status)) return;
      if (v.status === "accepted" && !v.boot_id) return;
      await this.put("operation", op.id, { ...op, status: v.status, boot_id: v.boot_id || op.boot_id || "", error_code: v.error_code || "", message: v.error_code || (v.status === "accepted" ? "设备已接受重启，等待新启动标识" : v.status), updated_at: stamp() }, id);
    }
  }
  async syncChannelConfig(deviceId, channel) {
    if (!channel.channelId || typeof channel.enabled !== "boolean" || !Number.isSafeInteger(channel.revision)) return;
    const key = `${deviceId}:${channel.channelId}`;
    const previous = this.channelConfigs.get(key);
    if (previous && channel.revision < previous.revision) return;
    if (previous && previous.revision === channel.revision && previous.enabled === channel.enabled) return;
    if (!channel.enabled) {
      const observed = stamp();
      for (const type of ["channel_abnormal", "detection_abnormal"]) {
        await this.observe(deviceId, channel.channelId, type, channel.channelId, "disabled", "", "none", "通道已停用，结束监测；未验证视频流或模型恢复", false, observed);
      }
      this.channelStatuses.set(key, { channelId: channel.channelId, revision: channel.revision, status: "disabled", detectionStatus: "stopped", qualityStatus: "unknown", inputFps: 0, observedAt: observed });
    } else if (previous && previous.enabled === false) this.channelStatuses.delete(key);
    this.channelConfigs.set(key, { enabled: channel.enabled, revision: channel.revision });
  }
  async observe(deviceId, channelId, type, target, state, reason, action, check, unhealthy, observedAt) {
    return this.app.fs.dc.orm.transaction(async transaction => {
    const key = `${deviceId}:${channelId}:${type}`;
    const healthKey = hash(key);
    const previous = await this.get("health", healthKey, transaction);
    if (previous && previous.observed_at >= observedAt) return;
    const active = await this.records("exception", { deviceId, "data.channel_id": channelId, "data.type": type, "data.status": "active", "data.record_type": "exception" }, { limit: 1, transaction, lock: true });
    if (unhealthy) {
      if (!active.length) {
        const id = uuid();
        await this.put("exception", id, { id, device_id: deviceId, channel_id: channelId, record_type: "exception", type, target, reason, started_at: observedAt, ended_at: "", status: "active", result: "none", triggered_at: observedAt, trigger_reason: reason, action, before_state: state, after_self_check: "", rebooted: false, related_id: "" }, deviceId, transaction);
      } else if (action !== "none") await this.put("exception", active[0].id, { ...active[0].data, action }, deviceId, transaction);
    } else if (active.length) {
      const closed = state === "disabled";
      const item = { ...active[0].data, status: closed ? "closed" : "recovered", result: closed ? "none" : "passed", ended_at: observedAt, after_self_check: check, action: action === "none" ? active[0].data.action : action };
      if (type === "channel_abnormal" && item.before_state === "running") item.action = "none";
      await this.put("exception", item.id, item, deviceId, transaction);
      if (!closed) {
        const id = uuid();
        const { acknowledged, acknowledged_at, acknowledged_by, ...recovery } = item;
        await this.put("exception", id, { ...recovery, id, record_type: "recovery", type: "auto_recover", related_id: item.id }, deviceId, transaction);
      }
    }
    await this.put("health", healthKey, { observed_at: observedAt }, deviceId, transaction);
    });
  }
  async acknowledgeException(deviceId, exceptionId, operatorId) {
    return this.app.fs.dc.orm.transaction(async transaction => {
      const row = await this.model.findOne({ where: { kind: "exception", id: exceptionId, deviceId }, transaction, lock: true, logging: false });
      if (!row || row.data.record_type !== "exception") throw fault(404, "异常记录不存在");
      if (row.data.acknowledged === true) return row.data;
      const item = { ...row.data, acknowledged: true, acknowledged_at: stamp(), acknowledged_by: operatorId };
      await this.put("exception", exceptionId, item, deviceId, transaction);
      return item;
    });
  }
  async pending(id) {
    const rows = await this.records("task", { deviceId: id, "data.status": { [Op.in]: ["pending", "downloading", "verifying", "installing"] } });
    for (const row of rows) await this.dispatch(row.data);
  }
  async saveAlarm(id, alarm, alarmTime, key) {
    let remote = null;
    let localFile = null;
    let saved = null;
    try {
      // Serialize retries and migration for the same durable event identity.
      await this.app.fs.dc.orm.transaction(async transaction => {
        await this.app.fs.dc.orm.query("SELECT pg_advisory_xact_lock(hashtextextended(:id,0))", { replacements: { id: `alarm:${key}` }, transaction, logging: false });
        const existing = await this.get("alarm", key, transaction);
        if (existing && (!this.fileStorage || (existing.image_storage && existing.image_storage.storage === "qiniu") || !alarm.image)) return;
        const now = stamp();
        let image = "";
        if (alarm.image) {
          if (!["image/jpeg", "image/png"].includes(alarm.imageMimeType)) throw fault(400, "无效证据格式");
          const bytes = Buffer.from(alarm.image, "base64");
          if (!bytes.length) throw fault(400, "证据图片不能为空");
          if (this.fileStorage) {
            remote = await this.fileStorage.uploadImage(bytes, uuid(), alarm.imageMimeType);
            image = remote.object_key;
          } else {
            image = hash(key) + (alarm.imageMimeType === "image/png" ? ".png" : ".jpg");
            localFile = path.join(this.root, "alarms", image);
            await fsp.writeFile(localFile, bytes, { mode: 0o600 });
          }
        }
        const device = await this.device(id);
        const item = existing || { device_id: id, device_name: device.name, agent_row_id: alarm.rowId, channel_id: alarm.channelId,
          model_version: alarm.modelVersion || "", detection_type: alarm.detectionType, confidence: alarm.confidence,
          alarm_time: alarmTime, received_at: now, validation_id: key,
          timeline: [{ title: "事件发生", time: alarmTime }, { title: "平台接收", time: now }, { title: image ? "证据上传" : "证据未上传", time: now }] };
        saved = { ...item, image, imageMimeType: alarm.imageMimeType || "", upload_status: image ? "uploaded" : "not_uploaded",
          ...(remote ? { image_storage: remote } : {}) };
        await this.put("alarm", key, saved, id, transaction);
      });
    } catch (error) {
      if (remote) await this.fileStorage.remove(remote).catch(() => this.app.fs.logger.error("数据库保存失败后清理七牛告警图片失败"));
      if (localFile) await fsp.unlink(localFile).catch(() => {});
      throw error;
    }
    // 证据落库后异步送 AI 复核：不阻塞设备上报，失败只落 ai_status=failed
    if (saved) this.reviewAlarm(key, saved);
  }
  // AI 复核
  reviewAlarm(key, data) {
    if (!this.aiReviewConfig) return null;
    try {
      return aiReview.enqueue({
        models: this.app.fs.dc.models,
        platform: this,
        config: this.aiReviewConfig,
        eventId: key,
        data: data || {},
      });
    } catch (error) {
      this.app.fs.logger.error(`AI 复核触发失败 ${key}：${(error && error.message) || error}`);
      return null;
    }
  }
  async fileDownloadURL(file) {
    if (file.storage === "qiniu") {
      if (!this.fileStorage) throw fault(503, "请配置七牛模型文件存储");
      return this.fileStorage.downloadURL(file);
    }
    if (!this.publicURL) throw fault(503, "请配置设备可访问的 EDGE_AGENT_PUBLIC_URL");
    return `${this.publicURL}/api/v1/agents/files/${encodeURIComponent(file.id)}`;
  }
  async dispatch(task) {
    const file = await this.get("file", task.file_id);
    if (!file) throw fault(404, "任务文件不存在，请重新上传");
    const downloadURL = await this.fileDownloadURL(file);
    try { return this.hub.send(task.device_id, "task.assign", { task_id: task.id, file_id: task.file_id, file_name: task.file_name,
      download_url: downloadURL, sha256: task.sha256 || "", target_path: task.target_path, target_is_directory: task.target_is_directory, version: task.version || "" });
    } catch (error) {
      if (error.code !== "BUFFER_LIMIT") throw error;
      // The task is already durable; reconnect or explicit redispatch retries it.
      this.app.fs.logger.error("Agent 下发缓冲已满，任务等待补发");
      return false;
    }
  }
  async createTasks(body, source = "platform", transaction) {
    if (!transaction) return this.app.fs.dc.orm.transaction(tx => this.createTasks(body, source, tx));
    const file = await this.get("file", body.file_id, transaction);
    if (!file) throw fault(404, "文件不存在，请重新上传 V1 测试文件");
    await this.fileDownloadURL(file);
    if (!Array.isArray(body.device_ids) || !body.device_ids.length || body.device_ids.length > 1000 || typeof body.target_path !== "string" || !body.target_path.trim()) throw fault(400, "目标设备与目标路径不能为空");
    const ids = [...new Set(body.device_ids)];
    const devices = await Promise.all(ids.map(id => this.device(id)));
    if (new Set(devices.map(d => `${d.os}/${d.arch}`)).size > 1) throw fault(400, "批量下发设备的系统和架构必须一致");
    const deploymentId = uuid();
    const tasks = [];
    for (const id of ids) {
      const taskId = uuid();
      const item = { id: taskId, deployment_id: deploymentId, device_id: id, file_id: file.id, file_name: file.original_name, sha256: file.sha256,
        name: body.name || file.original_name, version: body.version || "", target_path: body.target_path,
        target_is_directory: body.target_is_directory !== false, source, status: "pending", progress: 0, message: "等待设备连接", created_at: stamp(), updated_at: stamp() };
      await this.put("task", taskId, item, id, transaction);
      tasks.push(item);
    }
    return { id: deploymentId, task_count: tasks.length, tasks };
  }
  async storeFile(stream, filename) {
    await this.ready;
    const name = path.basename(String(filename || "file").replace(/\\/g, "/"));
    if (!name || name.length > 255) throw fault(400, "无效文件名");
    const id = uuid();
    const destination = path.join(this.root, "uploads", id);
    let size = 0;
    const digest = crypto.createHash("sha256");
    const meter = new Transform({ transform(chunk, encoding, callback) {
      size += chunk.length;
      if (size > 512 * 1024 * 1024) return callback(fault(413, "文件不能超过512 MiB"));
      digest.update(chunk); callback(null, chunk);
    } });
    let remote;
    try {
      await pipeline(stream, meter, fs.createWriteStream(destination, { flags: "wx", mode: 0o600 }));
      if (!size) throw fault(400, "文件不能为空");
      const item = { id, original_name: name, storage_name: id, size_bytes: size, sha256: digest.digest("hex"), created_at: stamp() };
      if (this.fileStorage) {
        remote = await this.fileStorage.upload(destination, id);
        Object.assign(item, remote);
        delete item.storage_name;
      } else item.storage = "local";
      await this.put("file", id, item);
      if (remote) await fsp.unlink(destination).catch(() => this.app.fs.logger.error("清理模型上传临时文件失败"));
      return item;
    } catch (error) {
      await fsp.unlink(destination).catch(() => {});
      if (remote) await this.fileStorage.remove(remote).catch(() => this.app.fs.logger.error("数据库保存失败后清理七牛模型对象失败"));
      throw error;
    }
  }
  async discardFile(file) {
    if (file.storage === "qiniu") await this.fileStorage.remove(file);
    else await fsp.unlink(path.join(this.root, "uploads", file.storage_name)).catch(error => { if (error.code !== "ENOENT") throw error; });
    await this.model.destroy({ where: { kind: "file", id: file.id } });
  }
}
module.exports = { AgentPlatform, fault, quality, time, hash, uuid, stamp };
