"use strict";

import moment from "moment";
import { ApiTable, EmisApiTable, basicAction } from "$utils";
import { toEvent, toException, connectText, qualityText } from "../components/common";
import {
  TYPE_FORMAT_MAP,
  TYPE_NAME_MAP,
  TASK_STATUS,
} from "../constants";

/* ---------------- 项目 ---------------- */

export const getEdgeProjects = () => (dispatch) =>
  basicAction({
    type: "get",
    dispatch,
    actionType: "EDGE_PROJECTS",
    url: ApiTable.getProjects,
    msg: { option: "查询项目列表" },
    reducer: { name: "edgeProjects", params: { noClear: true } },
  });

/* ---------------- 边缘设备 ---------------- */

const toRows = (data) =>
  Array.isArray(data) ? data : Array.isArray(data?.rows) ? data.rows : [];

const usedTotal = (percent, totalGb) =>
  !Number.isFinite(percent) || !Number.isFinite(totalGb)
    ? undefined
    : `${((totalGb * percent) / 100).toFixed(2)} / ${totalGb.toFixed(2)} GB`;

const toHealth = (d = {}) => ({
  cpu: d.cpu_percent,
  memPercent: d.memory_used_percent,
  memUsed: usedTotal(d.memory_used_percent, d.memory_total_gb),
  diskPercent: d.disk_used_percent,
  diskUsed: usedTotal(d.disk_used_percent, d.disk_total_gb),
  temperature: d.temperature_celsius,
});

// 只保留有值的字段，避免覆盖已有数据
const compact = (obj) =>
  Object.fromEntries(Object.entries(obj).filter(([, v]) => v != null));

// 详情接口不返回 online，用最后心跳时间判断（阈值同列表心跳规则 150s）
const isOnline = (d) => {
  if (typeof d.online === "boolean") return d.online;
  const ts = Date.parse(d.heartbeatAt || d.last_seen_at);
  return Number.isNaN(ts) ? undefined : Date.now() - ts < 150000;
};

const toDevice = (d) =>
  !d || typeof d !== "object"
    ? d
    : {
        ...d,
        heartbeatAt: d.heartbeatAt ?? d.last_seen_at,
        runtimeVersion: d.runtimeVersion ?? d.agent_version,
        modelVersion: d.modelVersion ?? d.model_version,
        firstRegisterAt: d.firstRegisterAt ?? d.first_registered_at ?? d.created_at,
        registrationMethod: d.registrationMethod ?? d.registration_method,
        registerAddress: d.registerAddress ?? d.last_registration_address,
        online: isOnline(d),
        health: { ...compact(toHealth(d)), ...(d.health || {}) },
      };


export const queryEdgeDevices = (params = {}) => (dispatch) =>
  basicAction({
    type: "get",
    dispatch,
    query: {
      projectId: params.projectId && params.projectId !== "__UNASSIGNED__" ? params.projectId : undefined,
      keyword: params.keyword,
      abnormal: params.abnormal,
    },
    actionType: "EDGE_DEVICES",
    url: EmisApiTable.edgeDevices,
    msg: { option: "查询边缘设备列表" },
    callback: (data) => toRows(data).map(toDevice),
    reducer: { name: "edgeDevices", params: { noClear: true } },
  });

// 设备详情
export const getEdgeDeviceDetail = (id) => (dispatch) =>
  basicAction({
    type: "get",
    dispatch,
    params: { deviceId: id },
    actionType: "EDGE_DEVICE_DETAIL",
    url: EmisApiTable.edgeDeviceDetail.replace("{deviceId}", id),
    msg: { option: "查询边缘设备详情" },
    callback: toDevice,
    reducer: { name: "edgeDeviceDetail", params: { noClear: true } },
  });

// 视频通道
const toChannel = (d = {}) => ({
  id: d.id ?? d.channel_id ?? d.channelId ?? d.code ?? "-",
  deviceId: d.device_id ?? d.deviceId,
  name: d.name ?? d.channel_name ?? d.id ?? "-",
  rtsp: d.rtsp_url ?? d.rtsp ?? "",
  modelName: d.model_name ?? d.modelName ?? "",
  enabled: d.enabled ?? d.isActive ?? false,
  transport: String(d.transport || "tcp").trim().toLowerCase(),
  revision: d.revision,
  syncStatus: d.sync_status ?? d.syncStatus,
  connect: connectText(d.status ?? d.connect),
  status: d.status ?? d.status_code ?? d.connect,
  fps: d.input_fps ?? d.fps ?? "—",
  codec: d.codec ?? "—",
  resolution: d.resolution ?? "—",
  quality: qualityText(d.quality_status ?? d.quality),
  username: d.username,
  passwordConfigured: d.password_configured ?? d.passwordConfigured,
  lastTestAt: d.last_test_at ?? d.lastTestAt,
  lastTestDurationMs: d.last_test_duration_ms ?? d.lastTestDurationMs,
  snapshot: d.snapshot ?? "",
  snapshotMimeType: d.snapshot_mime_type ?? "image/jpeg",
  pictureMetrics: d.picture_metrics ?? null,
  observedAt: d.observed_at ?? d.observedAt,
});

export const getEdgeDeviceChannels = (id) => (dispatch) =>
  basicAction({
    type: "get",
    dispatch,
    actionType: "EDGE_DEVICE_CHANNELS",
    url: EmisApiTable.edgeDeviceChannels.replace("{deviceId}", id),
    msg: { error: "获取视频通道失败" },
    callback: (data) => toRows(data).map(toChannel),
    reducer: { name: "edgeDeviceChannels", params: { noClear: true } },
  });

// 设备异常
export const acknowledgeEdgeException = (deviceId, exceptionId) => dispatch =>
  basicAction({
    type: "post", dispatch, actionType: "ACKNOWLEDGE_EDGE_EXCEPTION",
    url: EmisApiTable.edgeExceptionAcknowledge.replace("{deviceId}", encodeURIComponent(deviceId)).replace("{exceptionId}", encodeURIComponent(exceptionId)),
    msg: { success: "异常已确认", error: "确认异常失败" },
  });

export const queryEdgeExceptions = (deviceId, params = {}) => (dispatch) =>
  basicAction({
    type: "get",
    dispatch,
    query: {
      device_id: deviceId,
      category: "exceptions",
      type: params.type,
      status: params.status,
      page: params.page || 1,
      page_size: params.pageSize || 10,
    },
    actionType: "EDGE_EXCEPTIONS",
    url: EmisApiTable.edgeEvents,
    msg: { error: "查询异常与恢复记录失败" },
    callback: (data) => {
      const rows = Array.isArray(data) ? data : data?.items || data?.rows || [];
      const items = rows.map(toException);
      return { items, total: Array.isArray(data) ? items.length : Number(data?.total ?? items.length) };
    },
    reducer: { name: "edgeExceptions", params: { noClear: true } },
  });

// 远程会话历史
const SESSION_STATUS_TEXT = {
  active: "进行中",
  ended: "正常结束",
  abnormal: "异常结束",
};
const toSession = (d = {}) => {
  const seconds = Number(d.durationSeconds) || 0;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return {
    id: d.id,
    sessionId: d.sessionId,
    deviceCode: d.deviceCode,
    deviceName: d.deviceName,
    operator: d.operatorName || d.operator || "—",
    purpose: d.purpose,
    statusCode: d.status,
    status: SESSION_STATUS_TEXT[d.status] || d.status || "—",
    active: d.status === "active",
    startedAt: d.startedAt ? moment(d.startedAt).format("YYYY-MM-DD HH:mm:ss") : "—",
    endedAt: d.endedAt ? moment(d.endedAt).format("YYYY-MM-DD HH:mm:ss") : "—",
    duration: hours ? `${hours} 时 ${minutes} 分` : `${minutes} 分 ${seconds % 60} 秒`,
    endReason: d.endReason,
    recording: d.recording || null,
    commands: (d.commands || d.recording?.inputs || []).map((c) => ({

      time: c.startedAt || c.submittedAt
        ? moment(c.startedAt || c.submittedAt).format("YYYY-MM-DD HH:mm:ss")
        : c.time || c.occurredAt || c.at || "",      command: c.command || c.input || c.content || "",
      cost: c.durationMs ?? c.cost ?? c.duration ?? "",
      code: c.exitCode ?? c.code ?? "",      result: c.result || c.status || "",
    })),
  };
};

export const getEdgeDeviceSessions = (id, params = {}) => (dispatch) =>
  basicAction({
    type: "get",
    dispatch,
    query: { page: params.page || 1, pageSize: params.pageSize || 10 },
    actionType: "EDGE_DEVICE_SESSIONS",
    url: EmisApiTable.edgeDeviceSessions.replace("{deviceId}", id),
    msg: { error: "获取远程会话失败" },
    callback: (data) => {
      const rows = toRows(data).map(toSession);
      return { rows, total: Number(Array.isArray(data) ? rows.length : data?.count ?? rows.length) };
    },
    reducer: { name: "edgeDeviceSessions", params: { noClear: true } },
  });

// 远程会话详情
export const getEdgeSessionDetail = (sessionId) => (dispatch) =>
  basicAction({
    type: "get",
    dispatch,
    actionType: "EDGE_SESSION_DETAIL",
    url: EmisApiTable.edgeSessionDetail.replace("{sessionId}", sessionId),
    msg: { error: "获取会话详情失败" },
    callback: (data) => toSession(data || {}),
    reducer: { name: "edgeSessionDetail", params: { noClear: true } },
  });

// 设备审计
export const getEdgeDeviceAudits = (id, params = {}) => (dispatch) =>
  basicAction({
    type: "get",
    dispatch,
    query: {
      page: params.page || 1,
      pageSize: params.pageSize || 10,
      content: params.content || id,
    },
    actionType: "EDGE_DEVICE_AUDITS",
    url: ApiTable.getSystemLog,
    msg: { error: "获取操作审计失败" },
    reducer: { name: "edgeDeviceAudits", params: { noClear: true } },
  });

// 分配 / 调整所属项目
// data: { projectId }
export const assignEdgeDeviceProject = (id, projectId) => (dispatch) =>
  basicAction({
    type: "put",
    dispatch,
    params: { deviceId: id },
    data: { projectId: Number(projectId) },
    actionType: "EDGE_ASSIGN_PROJECT",
    url: EmisApiTable.edgeAssignProject.replace("{deviceId}", id),
    msg: { option: projectId ? "分配边缘设备项目" : "调整边缘设备项目" },
    reducer: { name: "edgeAssignProject", params: { noClear: true } },
  });

// 重启设备
export const rebootEdgeDevice = (id, idempotencyKey) => (dispatch) =>
  basicAction({
    type: "post",
    dispatch,
    data: { confirm: true, idempotencyKey },
    actionType: "EDGE_REBOOT",
    url: EmisApiTable.edgeReboot.replace("{deviceId}", id),
    msg: { option: "重启边缘设备" },
    reducer: { name: "edgeReboot", params: { noClear: true } },
  });

// 重启结果轮询
export const getEdgeDeviceOperation = (id, operationId) => (dispatch) =>
  basicAction({
    type: "get",
    dispatch,
    actionType: "EDGE_DEVICE_OPERATION",
    url: EmisApiTable.edgeDeviceOperation.replace("{deviceId}", id).replace("{operationId}", operationId),
    msg: { error: "查询设备操作结果失败" },
    reducer: { name: "edgeDeviceOperation", params: { noClear: true } },
  });

/* ---------------- 视频通道 ---------------- */
// RTSP 连通性测试
export const testEdgeChannel = (deviceId, payload = {}) => (dispatch) =>
  basicAction({
    type: "post",
    dispatch,
    data: payload,
    actionType: "EDGE_TEST_CHANNEL",
    url: EmisApiTable.edgeChannelTest.replace("{deviceId}", deviceId),
    msg: { option: "测试视频连接" },
    reducer: { name: "edgeTestChannel", params: { noClear: true } },
  });

const CHANNEL_FIELDS = ["name", "rtsp_url", "username", "password", "enabled", "transport"];
const cleanChannelPayload = (channel = {}) => {
  const payload = {};
  CHANNEL_FIELDS.forEach((key) => {
    const value = channel[key];
    if (key === "enabled") {
      if (value !== undefined) payload.enabled = Boolean(value);
      return;
    }
    const text = value === undefined || value === null ? "" : String(value).trim();
    if (text && text !== "********" && text !== "—") payload[key] = key === "transport" ? text.toLowerCase() : text;
  });
  // 修改通道需带当前版本号，避免覆盖别人的修改
  const modelName = channel.model_name ?? channel.modelName;
  if (modelName && String(modelName).trim()) payload.model_name = String(modelName).trim();
  if (channel.revision !== undefined && channel.revision !== null) {
    payload.expected_revision = channel.revision;
  }
  return payload;
};

const toVideoChannelRequest = (channel = {}, isUpdate = false) => {
  const payload = {
    name: channel.name,
    rtsp_url: channel.rtsp_url ?? channel.rtspUrl ?? channel.rtsp,
    model_name: channel.model_name ?? channel.modelName,
    username: channel.username ?? "",
    transport: String(channel.transport || "tcp").trim().toLowerCase(),
    enabled: channel.enabled !== false,
  };

  if (isUpdate) {
    payload.expected_revision = Number(channel.expected_revision ?? channel.revision);
  }

  return payload;
};

export const saveEdgeChannel = (id, channel = {}) => (dispatch) => {
  const isUpdate = Boolean(channel.id);
  const data = toVideoChannelRequest(channel, isUpdate);
  const requiredFields = ["name", "rtsp_url", "model_name"];
  const missingField = requiredFields.find((field) => !data[field]);
  if (missingField) {
    return Promise.resolve({ success: false, message: "通道名称、RTSP 地址和模型名称不能为空" });
  }
  if (isUpdate && (!Number.isInteger(data.expected_revision) || data.expected_revision <= 0)) {
    return Promise.resolve({ success: false, message: "视频通道版本已失效，请刷新后重试" });
  }

  return basicAction({
    type: isUpdate ? "put" : "post",
    dispatch,
    data: cleanChannelPayload(channel),
    actionType: "EDGE_SAVE_CHANNEL",
    url: isUpdate
      ? `${EmisApiTable.edgeDeviceChannels.replace("{deviceId}", id)}/${channel.id}`
      : EmisApiTable.edgeDeviceChannels.replace("{deviceId}", id),
    msg: { success: isUpdate ? "修改通道成功" : "新增通道成功", error: "保存通道失败" },
    reducer: { name: "edgeSaveChannel", params: { noClear: true } },
  });
};

export const toggleEdgeChannel = (id, channel, enabled) => (dispatch) => {
  const data = toVideoChannelRequest({ ...channel, enabled }, true);
  if (!channel?.id || !data.name || !data.rtsp_url || !data.model_name) {
    return Promise.resolve({ success: false, message: "视频通道配置不完整，请刷新后重试" });
  }
  if (!Number.isInteger(data.expected_revision) || data.expected_revision <= 0) {
    return Promise.resolve({ success: false, message: "视频通道版本已失效，请刷新后重试" });
  }

  return basicAction({
    type: "put",
    dispatch,
    data,
    actionType: "EDGE_TOGGLE_CHANNEL",
    url: `${EmisApiTable.edgeDeviceChannels.replace("{deviceId}", id)}/${channel.id}`,
    msg: { success: enabled ? "通道已启用" : "通道已停用", error: "通道启停失败" },
    reducer: { name: "edgeToggleChannel", params: { noClear: true } },
  });
};

/* ---------------- 视觉模型库 ---------------- */
export const queryVisionModels = (params = {}) => (dispatch) =>
  basicAction({
    type: "get",
    dispatch,
    query: {
      page: params.page || 1,
      pageSize: params.pageSize || 10,
      keyword: params.keyword,
      modelType: params.type,
    },
    actionType: "EDGE_VISION_MODELS",
    url: EmisApiTable.edgeModels,
    msg: { option: "查询视觉模型列表" },
    reducer: { name: "edgeVisionModels", params: { noClear: true } },
  });

// Selector data spans multiple pages; keep each request within the API limit.
export const queryVisionModelOptions = () => (dispatch) => {
  // The layout calls action()() synchronously to discover action metadata.
  if (typeof dispatch !== "function") return { actionType: "EDGE_VISION_MODEL_OPTIONS" };
  return (async () => {
    const rows = [];
    for (let page = 1; ; page++) {
      const result = await queryVisionModels({ page, pageSize: 100 })(dispatch);
      if (!result?.success) return result;
      const data = result.payload?.data || {};
      const batch = data.rows || [];
      rows.push(...batch);
      const count = Number(data.count ?? rows.length);
      if (!batch.length || rows.length >= count) return { success: true, payload: { data: { count, rows } } };
    }
  })();
};

// 上传模型
export const uploadVisionModel = (payload = {}) => (dispatch) => {
  const { type, version, fileId, fileName, fileSize, sha256 } = payload;
  if (!type || !version) {
    return Promise.resolve({ success: false, message: "识别类型与版本号必填" });
  }
  if (!fileId) {
    return Promise.resolve({ success: false, message: "文件 ID 不能为空" });
  }
  return basicAction({
    type: "post",
    dispatch,
    data: {
      modelName: payload.modelName || TYPE_NAME_MAP[type] || "",
      modelType: type,
      version,
      modelFormat: payload.modelFormat || TYPE_FORMAT_MAP[type] || "",
      fileId: String(fileId),
      fileName: fileName || null,
      fileSize: fileSize || null,
      sha256: sha256 || null,
    },
    actionType: "EDGE_UPLOAD_MODEL",
    url: EmisApiTable.edgeModels,
    msg: { option: "新增视觉模型" },
    reducer: { name: "edgeUploadModel", params: { noClear: true } },
  });
};

// 下发视觉模型升级任务

export const dispatchVisionModelUpgrade = (payload = {}) => (dispatch) => {
  const { modelId, modelName, version, projectId, targetPath, deviceCodes = [], targetIsDirectory = true } = payload;
  if (!modelId) return Promise.resolve({ success: false, message: "模型 ID 不能为空" });
  if (!projectId) return Promise.resolve({ success: false, message: "所属项目不能为空" });
  if (!targetPath) return Promise.resolve({ success: false, message: "目标路径不能为空" });
  if (!Array.isArray(deviceCodes) || !deviceCodes.length) {
    return Promise.resolve({ success: false, message: "请至少选择一台目标设备" });
  }
  return basicAction({
    type: "post",
    dispatch,
    data: {
      projectId,
      modelId,
      modelName,
      version,
      targetPath,
      deviceCodes,
      targetIsDirectory,
    },
    actionType: "EDGE_DISPATCH_UPGRADE",
    url: EmisApiTable.edgeUpgradeTasks,
    msg: { option: "下发视觉模型升级任务" },
    reducer: { name: "edgeDispatchUpgrade", params: { noClear: true } },
  });
};

/* ---------------- 事件与告警 ---------------- */

export const queryEdgeEvents = (params = {}) => (dispatch) =>
  basicAction({
    type: "get",
    dispatch,
    query: {
      device_id: params.deviceId,
      channel_id: params.channelId,
      // 项目筛选必须下推
      project_id: params.projectId,
      detection_type: params.detectionType,
      category: params.category,
      type: params.type,
      status: params.status,
      record_type: params.recordType,
      evidence_status: params.evidenceStatus,
      start_time: params.startTime,
      end_time: params.endTime,
      min_confidence: params.minConfidence,
      page: params.page || 1,
      page_size: params.pageSize || 30,
    },
    actionType: "EDGE_EVENTS",
    url: EmisApiTable.edgeEvents,
    msg: { error: "查询事件与告警失败" },
    callback: (data) => {
      const rows = Array.isArray(data) ? data : data?.items || data?.rows || [];
      const items = rows.map((row) => row.record_type ? toException(row) : toEvent(row));
      const total = Array.isArray(data) ? items.length : Number(data?.total ?? items.length);
      return { items, total };
    },
    reducer: { name: "edgeEvents", params: { noClear: true } },
  });

// 人工确认告警：result = real / invalid / unknown
export const confirmEdgeEvent = (event = {}, payload = {}) => (dispatch) => {
  // 布局层启动时会把 action 以无参方式调用一次以读取 actionType，这里要提前返回
  if (typeof dispatch !== "function") return { actionType: "EDGE_EVENT_CONFIRM" };
  if (!event.deviceId || event.rowId === undefined || event.rowId === null) {
    return Promise.resolve({ success: false, message: "事件信息不完整，请刷新后重试" });
  }
  return basicAction({
    type: "post",
    dispatch,
    data: {
      result: payload.result,
      remark: payload.remark,
    },
    actionType: "EDGE_EVENT_CONFIRM",
    url: EmisApiTable.edgeEventReview
      .replace("{deviceId}", encodeURIComponent(event.deviceId))
      .replace("{rowId}", event.rowId),
    msg: { option: "确认告警", error: "确认告警失败" },
    reducer: { name: "edgeEventConfirm", params: { noClear: true } },
  });
};

export const getEdgeEventStatistics = (params = {}) => (dispatch) =>  basicAction({
    type: "get",
    dispatch,
    actionType: "EDGE_EVENT_STATISTICS",
    url: EmisApiTable.edgeEventStatistics,
    msg: { error: "查询事件统计失败" },
    reducer: { name: "edgeEventStatistics", params: { noClear: true } },
  });

// 触发 / 重试 AI 复核
export const reviewEdgeEventWithAI = (event = {}) => (dispatch) => {
  if (typeof dispatch !== "function") return { actionType: "EDGE_EVENT_AI_REVIEW" };
  if (!event.deviceId || event.rowId === undefined || event.rowId === null) {
    return Promise.resolve({ success: false, message: "事件信息不完整，请刷新后重试" });
  }
  return basicAction({
    type: "post",
    dispatch,
    data: {},
    actionType: "EDGE_EVENT_AI_REVIEW",
    url: EmisApiTable.edgeEventAIPreview
      .replace("{deviceId}", encodeURIComponent(event.deviceId))
      .replace("{rowId}", event.rowId),
    msg: { option: "AI 复核", error: "AI 复核失败" },
    reducer: { name: "edgeEventAiReview", params: { noClear: true } },
  });
};

// 重新推送已确认真实的告警
export const pushEdgeEvent = (event = {}) => (dispatch) => {
  if (typeof dispatch !== "function") return { actionType: "EDGE_EVENT_PUSH" };
  if (!event.deviceId || event.rowId === undefined || event.rowId === null) {
    return Promise.resolve({ success: false, message: "事件信息不完整，请刷新后重试" });
  }
  return basicAction({
    type: "post",
    dispatch,
    data: {},
    actionType: "EDGE_EVENT_PUSH",
    url: EmisApiTable.edgeEventPush
      .replace("{deviceId}", encodeURIComponent(event.deviceId))
      .replace("{rowId}", event.rowId),
    msg: { option: "重新推送", error: "重新推送失败" },
    reducer: { name: "edgeEventPush", params: { noClear: true } },
  });
};

/* ---------------- 升级任务 ---------------- */
// 汇总任务状态（FR-UPGRADE：执行中/成功/失败）
export function summarizeTaskStatus(rows) {
  const statuses = rows.map((r) => r.execStatus);
  const all = (s) => statuses.every((x) => x === s);
  const has = (s) => statuses.includes(s);
  if (all("成功")) return TASK_STATUS.success;
  if (all("失败")) return TASK_STATUS.failed;
  if (has("执行中") || has("已下发")) return TASK_STATUS.running;
  // if (statuses.every((s) => s === "等待下发")) return TASK_STATUS.waiting;
  // if ((has("成功") || has("失败")) && !has("执行中") && !has("已下发")) {
  //   return has("成功") ? TASK_STATUS.partialFailed : TASK_STATUS.failed;
  // }
  return TASK_STATUS.running;
}

// 发起人/操作人姓名
export const getEdgeUserDict = () => (dispatch) =>
  basicAction({
    type: "get",
    dispatch,
    query: { page: 1, pageSize: 200 },
    actionType: "EDGE_USER_DICT",
    url: ApiTable.getUsers,
    msg: { option: "查询用户列表" },
    reducer: { name: "edgeUserDict", params: { noClear: true } },
  });

export const queryUpgradeDeviceRows = (params = {}) => (dispatch) =>
  basicAction({
    type: "get",
    dispatch,
    query: {
      page: params.page || 1,
      pageSize: params.pageSize || 10,
      projectId: params.projectId,
      modelId: params.modelId,
      taskId: params.taskId,
      status: params.status,
      startTime: params.startTime,
      endTime: params.endTime,
    },
    actionType: "EDGE_UPGRADE_ROWS",
    url: `${EmisApiTable.edgeUpgradeTasks}`,
    msg: { option: "查询升级任务" },
    reducer: { name: "edgeUpgradeRows", params: { noClear: true } },
  });

export const getUpgradeTaskDetail = (deploymentId) => (dispatch) =>
  basicAction({
    type: "get",
    dispatch,
    actionType: "EDGE_UPGRADE_DETAIL",
    url: `${EmisApiTable.edgeUpgradeTaskDetail}`.replace("{deploymentId}", deploymentId),
    msg: { option: "查询升级任务详情" },
    reducer: { name: "edgeUpgradeDetail", params: { noClear: true } },
  });

export const redispatchUpgradeTask = (deploymentId) => (dispatch) =>
  basicAction({
    type: "post",
    dispatch,
    actionType: "EDGE_REDISPATCH",
    url: `${EmisApiTable.edgeRedispatch}`.replace("{deploymentId}", deploymentId),
    msg: { option: "重新下发升级任务" },
    reducer: { name: "edgeRedispatch", params: { noClear: true } },
  });

export const clearUpgradeTaskHistory = () => (dispatch) =>
  basicAction({
    type: "del",
    dispatch,
    actionType: "EDGE_CLEAR_UPGRADE_HISTORY",
    url: EmisApiTable.edgeClearDeploymentHistory,
    msg: { option: "清理已结束升级任务历史" },
    reducer: { name: "edgeClearUpgradeHistory", params: { noClear: true } },
  });

/* ---------------- 远程运维 ---------------- */

export const createEdgeRemoteSession = (id, values = {}) => () =>
  Promise.resolve().then(() => {
    const purpose = String(values.purpose || "").trim();
    const durationMinutes = Number(values.durationMinutes);

    if (!id) {
      return { success: false, message: "设备 ID 不能为空" };
    }
    if (!Number.isInteger(durationMinutes) || durationMinutes <= 0) {
      return { success: false, message: "会话时长必须为正整数" };
    }
    if (!purpose) {
      return { success: false, message: "运维目的不能为空" };
    }

    // 远程会话由 Terminal WebSocket 建立，Gateway 连接成功后写入 edge_remote_session。
    return {
      success: true,
      payload: {
        deviceId: id,
        durationMinutes,
        purpose,
        shell: values.shell || undefined,
      },
    };
  });




// 文件投递到设备
export const transferEdgeFile = (id, payload = {}) => (dispatch) =>
  basicAction({
    type: "post",
    dispatch,
    data: {
      fileId: payload.fileId,
      targetPath: payload.targetPath,
      name: payload.fileName,
    },
    actionType: "EDGE_FILE_DELIVER",
    url: EmisApiTable.edgeDeviceFileDeliver.replace("{deviceId}", id),
    msg: { option: "投递文件到设备" },
    reducer: { name: "edgeFileDeliver", params: { noClear: true } },
  });
