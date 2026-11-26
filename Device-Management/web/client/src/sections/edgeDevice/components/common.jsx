import moment from "moment";
import React from "react";
import { Tag, Tooltip } from "antd";

export const PageTitle = ({ title, en }) => (
  <div className="edge-page-title">
    {title}
    {en ? <small>{en}</small> : null}
  </div>
);

export const OnlineDot = ({ online, sub }) => (
  <span>
    <span
      style={{
        display: "inline-block",
        width: 7,
        height: 7,
        borderRadius: "50%",
        background: online ? "#52c41a" : "#ff4d4f",
        marginRight: 7,
      }}
    />
    {online ? "在线" : "离线"}
    {sub ? <div style={{ fontSize: 12, color: "#8c96a5", marginTop: 3 }}>{sub}</div> : null}
  </span>
);

export const abnormalColor = (value) => {
  if (value === "正常") return "green";
  if (value === "待分配") return "orange";
  return "red";
};

export const AbnormalTag = ({ value }) => <Tag color={abnormalColor(value)}>{value}</Tag>;

export const connectColor = (value) =>
  ({ 正常: "green", 重连中: "orange", 断流: "red", 停用: "default" }[value] || "default");

const CONNECT_TEXT = {
  running: "正常",
  online: "正常",
  offline: "断流",
  stopped: "停用",
  disabled: "停用",
  connecting: "重连中",
  reconnecting: "重连中",
};

const QUALITY_TEXT = {
  normal: "正常",
  black_screen: "黑屏",
  occlusion: "遮挡",
  blur: "模糊",
  brightness_abnormal: "亮度异常",
};

export const connectText = (value) => CONNECT_TEXT[value] || (value ? String(value) : "未知");

export const qualityText = (value) =>
  value && value !== "—" && value !== "unknown" ? QUALITY_TEXT[value] || String(value) : "";

export const qualityColor = (value) =>
  ({ 正常: "green", 黑屏: "red", 遮挡: "red", 模糊: "red", 亮度异常: "red", 无法检测: "red" }[value] ||
    "default");

export const toTimestamp = (ts) => (typeof ts === "number" ? ts : Date.parse(ts));

// 心跳时间相对描述
export const fromNow = (ts) => {
  const diff = Date.now() - toTimestamp(ts);
  if (Number.isNaN(diff)) return "—";
  if (diff < 60 * 1000) return "刚刚";
  if (diff < 60 * 60 * 1000) return `${Math.max(1, Math.round(diff / 60000))} 分钟前`;
  if (diff < 24 * 60 * 60 * 1000) return `${Math.round(diff / 3600000)} 小时前`;
  return `${Math.round(diff / 86400000)} 天前`;
};

// 距离某个时间点过了多少分钟
export const minutesSince = (ts) => {
  const t = toTimestamp(ts);
  return Number.isNaN(t) ? null : Math.max(1, Math.round((Date.now() - t) / 60000));
};

export const toRows = (data) =>
  Array.isArray(data) ? data : Array.isArray(data?.rows) ? data.rows : [];

export const MaskText = ({ value }) => (
  <Tooltip title="敏感凭证已脱敏">
    <span>{value || "********"}</span>
  </Tooltip>
);

export const DETECTION_TYPES = {
  landslide: "边坡位移",
  personIntrusion: "人员闯入",
  person_intrusion: "人员闯入",
  person: "人员闯入",
  screenAbnormal: "画面异常",
  screen_abnormal: "画面异常",
  picture: "画面异常",
};

export const eventLevel = (confidence) => {
  const value = Number(confidence);
  if (!Number.isFinite(value)) return "—";
  if (value >= 0.9) return "一级";
  if (value >= 0.75) return "二级";
  return "三级";
};

const eventImagePath = (deviceId, rowId) =>
  deviceId && rowId ? `/edgeAgent/events/${deviceId}/${rowId}/image` : "";

export const remoteFileUrl = (deviceId, downloadName) => {
  let token = "";
  try { token = JSON.parse(sessionStorage.getItem("user") || "{}").token || ""; } catch (_) { /* no login */ }
  const query = new URLSearchParams();
  if (token) query.set("token", token);
  if (downloadName != null) query.set("name", downloadName);
  const suffix = downloadName != null ? "/download" : "";
  return `/_api/edgeAgent/devices/${encodeURIComponent(deviceId)}/remote-files${suffix}${query.toString() ? `?${query}` : ""}`;
};

export const eventImageSrc = (row) => {
  const path = eventImagePath(row?.deviceId, row?.rowId);
  if (!path) return "";
  let token = "";
  try {
    token = JSON.parse(sessionStorage.getItem("user") || "null")?.token || "";
  } catch (e) {
    token = "";
  }
  return `/_api${path}${token ? `?token=${encodeURIComponent(token)}` : ""}`;
};

// 任意证据（原图 / 标注图 / 视频片段）的统一访问地址
export const evidenceSrc = (deviceId, rowId, evidenceId) => {
  if (!deviceId || rowId === undefined || rowId === null) return "";
  let token = "";
  try {
    token = JSON.parse(sessionStorage.getItem("user") || "null")?.token || "";
  } catch (e) {
    token = "";
  }
  const path = `/edgeAgent/events/${encodeURIComponent(deviceId)}/${rowId}/evidence/${encodeURIComponent(evidenceId || "original")}`;
  return `/_api${path}${token ? `?token=${encodeURIComponent(token)}` : ""}`;
};

// 证据状态：已上传 / 上传中 / 缺失
export const EVIDENCE_STATUS_TEXT = { uploaded: "已上传", uploading: "上传中", missing: "缺失" };
export const evidenceStatusText = (value) => EVIDENCE_STATUS_TEXT[value] || "缺失";

const UPLOAD_STATUS_TEXT = { uploaded: "已上传", not_uploaded: "未上传" };

const uploadStatusText = (value) => UPLOAD_STATUS_TEXT[value] || value || "";

// 时间脉络
const timelineTime = (value) => (value ? moment(value).format("YYYY-MM-DD HH:mm:ss") : "");
const toTimeline = (d = {}) => {
  if (Array.isArray(d.timeline) && d.timeline.length) {
    return d.timeline.map((node) => ({
      title: node.title ?? node.name ?? node.label ?? "",
      desc: node.desc ?? node.description ?? "",
      time: timelineTime(node.time ?? node.at ?? ""),
    }));
  }
  const extra = d.timeline || {};
  const at = (value) => (value ? moment(value).format("YYYY-MM-DD HH:mm") : "");
  const status = toUploadStatus(d);
  return [
    { title: "事件发生", time: at(d.alarm_time ?? d.alarmTime) },
    { title: "平台接收", time: at(d.received_at ?? d.receivedAt) },
    {
      title: status === "uploaded" ? "证据已上传" : status === "not_uploaded" ? "证据未上传" : "证据上传",
      time: at(extra.uploaded_at ?? extra.uploadedAt ?? d.uploaded_at),
    },
  ];
};

const toUploadStatus = (d = {}) => d.upload_status ?? d.uploadStatus ?? "";

const formatDuration = (value) => {
  if (value == null || value === "") return "";
  const seconds = Number(value);
  if (!Number.isFinite(seconds) || seconds < 0) return String(value);
  if (seconds < 60) return `${seconds} 秒`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)} 分 ${Math.round(seconds % 60)} 秒`;
  return `${Math.floor(seconds / 3600)} 时 ${Math.floor((seconds % 3600) / 60)} 分`;
};

// 异常与恢复记录
const confirmationOperatorLabel = (d) => {
  const username = d.acknowledged_by_username;
  const name = d.acknowledged_by_name;
  if (username) return name && name !== username ? `${username}（${name}）` : username;
  return name || (d.acknowledged_by ? `用户 ${d.acknowledged_by}` : "—");
};
export const toException = (d = {}) => ({
  ...d,
  acknowledgedByLabel: confirmationOperatorLabel(d),
  typeLabel: EXCEPTION_TYPES[d.type] || d.type || "—",
  recordTypeLabel: ({ exception: "异常", recovery: "恢复" })[d.record_type] || "—",
  statusLabel: d.acknowledged ? "已确认" : ({ active: "进行中", recovered: "已恢复", closed: "已关闭" })[d.status] || "—",
  resultLabel: ({ passed: "通过", failed: "失败", none: "暂无结果" })[d.result] || "—",
  actionLabel: ({ reconnect_channel: "重连通道", restart_agent: "重启 Agent", reboot_device: "整机重启", none: "未执行恢复动作" })[d.action] || "—",
  startedAtLabel: d.started_at ? moment(d.started_at).format("YYYY-MM-DD HH:mm:ss") : "—",
  triggeredAtLabel: d.triggered_at ? moment(d.triggered_at).format("YYYY-MM-DD HH:mm:ss") : "—",
  durationLabel: d.duration_seconds == null ? "—" : `${d.duration_seconds} 秒`,
  id: d.id ?? d.exception_id ?? `${d.type ?? ""}-${d.started_at ?? d.startedAt ?? ""}`,
  recordType: d.record_type ?? d.recordType ?? "",
  type: d.type ?? d.exception_type ?? d.exceptionType ?? d.detection_type ?? d.detectionType ?? "",
  target: d.target ?? d.object ?? d.channel_id ?? d.channelId ?? "",
  reason: d.reason ?? d.cause ?? "",
  startedAt: d.started_at ?? d.startedAt ? moment(d.started_at ?? d.startedAt).format("YYYY-MM-DD HH:mm") : "",
  duration: formatDuration(d.duration_seconds ?? d.durationSeconds ?? d.duration),
  status: d.status ?? "",
  result: d.result ?? d.self_check_result ?? d.selfCheckResult ?? "",
  triggeredAt:
    d.triggered_at ?? d.triggeredAt ? moment(d.triggered_at ?? d.triggeredAt).format("YYYY-MM-DD HH:mm") : "",
  triggerReason: d.trigger_reason ?? d.triggerReason ?? "",
  action: d.action ?? d.recovery_action ?? d.recoveryAction ?? "",
  beforeState: d.before_state ?? d.beforeState ?? "",
  afterSelfCheck: d.after_self_check ?? d.afterSelfCheck ?? "",
  rebooted: d.rebooted,
  relatedId: d.related_id ?? d.relatedId ?? 0,
});

export const toEvent = (d = {}) => {
  const deviceId = d.device_id ?? d.deviceId;
  const rowId = d.agent_row_id ?? d.agentRowId ?? (Number.isFinite(Number(d.id)) ? d.id : "");
  const eventId = d.event_id ?? d.eventId ?? (rowId !== "" ? `${deviceId}:${rowId}` : d.id || "-");
  const alarmTime = d.alarm_time ?? d.alarmTime;
  const rawItems = Array.isArray(d.evidence_items) ? d.evidence_items : [];
  const evidenceItems = rawItems.map((item) => ({
    ...item,
    captured_at: item.captured_at ? moment(item.captured_at).format("YYYY-MM-DD HH:mm:ss") : "",
    // 统一走带 token 的访问地址，避免私有图片 401
    src: evidenceSrc(deviceId, rowId, item.id),
  }));
  const hasImage = evidenceItems.some((item) => item.kind !== "video") || Boolean(d.image_url ?? d.imageUrl);
  const hasEvidence = evidenceItems.length > 0;
  const uploadStatus = d.upload_status ?? d.uploadStatus ?? (hasEvidence ? "uploaded" : "missing");
  return {
    id: eventId,
    deviceId,
    rowId,
    deviceName: d.device_name ?? d.deviceName ?? deviceId,
    channelId: d.channel_id ?? d.channelId ?? "-",
    channelName: d.channel_id ?? d.channelId ?? "-",
    typeCode: d.detection_type ?? d.detectionType,
    type: DETECTION_TYPES[d.detection_type ?? d.detectionType] || d.detection_type || d.detectionType || "-",
    confidence: d.confidence,
    level: eventLevel(d.confidence),
    verifyMark: d.validation_id ?? d.validationId ?? d.verify_flag ?? d.verifyFlag ?? d.verify_code ?? d.verifyCode ?? "",
    occurredAt: alarmTime ? moment(alarmTime).format("YYYY-MM-DD HH:mm") : "-",
    receivedAt: d.received_at ?? d.receivedAt,
    modelVersion: d.model_version ?? d.modelVersion ?? "",
    timeline: toTimeline(d),
    uploadStatus,
    uploadStatusText: evidenceStatusText(uploadStatus),
    validationId: d.validation_id ?? d.validationId ?? `${deviceId}:${rowId}`,
    hasImage,
    hasEvidence,
    imagePath: d.image_url ?? d.imageUrl,
    evidenceItems,
    evidence: {
      items: evidenceItems,
      imageUrls: evidenceItems.filter((item) => item.kind !== "video").map((item) => item.src),
      images: evidenceItems.filter((item) => item.kind !== "video").length,
      videos: evidenceItems.filter((item) => item.kind === "video").length,
    },
    alarmId: d.alarm_id ?? d.alarmId ?? "",
    hasAlarm: d.has_alarm ?? d.hasAlarm ?? true,
    aiReview: {
      status: d.ai_review_status || (d.ai_review_result ? "done" : "pending"),
      result: d.ai_review_result ?? d.aiReviewResult,
      reason: d.ai_review_reason ?? d.aiReviewReason,
      modelVersion: d.ai_model_version ?? d.aiModelVersion,
      executedAt: d.ai_executed_at || d.aiExecutedAt
        ? moment(d.ai_executed_at ?? d.aiExecutedAt).format("YYYY-MM-DD HH:mm")
        : "",
      error: d.ai_review_error ?? d.aiReviewError,
      attempt: Number(d.ai_attempt ?? d.aiAttempt ?? 0),
      history: Array.isArray(d.ai_history ?? d.aiHistory) ? (d.ai_history ?? d.aiHistory) : [],
    },
    status: d.status,
    manualReview: {
      result: d.manual_review_result ?? d.manualReviewResult,
      remark: d.manual_review_remark ?? d.manualReviewRemark,
      userName: d.confirm_user_name ?? d.confirmUserName,
      time: d.confirm_time ? moment(d.confirm_time).format("YYYY-MM-DD HH:mm") : d.confirmTime,
      source: d.confirm_source ?? d.confirmSource ?? "web",

      confirmed: Boolean(d.confirm_time ?? d.confirmTime),
    },
    push: {
      status: d.push_status ?? d.pushStatus ?? "unconfigured",
      platform: d.push_platform ?? d.pushPlatform,
      channel: d.push_channel ?? d.pushChannel,
      time: d.push_time ? moment(d.push_time).format("YYYY-MM-DD HH:mm") : d.pushTime,
      error: d.push_error ?? d.pushError,
      summary: d.push_summary ?? d.pushSummary ?? null,
    },
  };
};

/* ---------------- 复核与推送状态 ---------------- */

export const REVIEW_RESULT_TEXT = { real: "真实告警", invalid: "无效告警", unknown: "无法判断" };
export const REVIEW_RESULT_COLOR = { real: "red", invalid: "green", unknown: "orange" };

// AI 复核结果：失败不能显示成无效告警，这是需求里的硬约束
export const aiReviewView = (ai = {}) => {
  if (ai.status === "failed") return { text: "复核失败", color: "red" };
  if (ai.status === "running") return { text: "复核中", color: "blue" };
  if (ai.status === "waiting_evidence") return { text: "等待证据", color: "default" };
  if (ai.status === "done" && ai.result) {
    return { text: REVIEW_RESULT_TEXT[ai.result] || ai.result, color: REVIEW_RESULT_COLOR[ai.result] || "default" };
  }
  return { text: "待复核", color: "default" };
};

export const manualReviewView = (manual = {}) => {
  if (!manual.result) {
    // 有确认动作但没存下结论的历史数据，要和「还没人确认」区分开
    return manual.confirmed ? { text: "未记录结论", color: "orange" } : { text: "待人工确认", color: "default" };
  }
  return {
    text: REVIEW_RESULT_TEXT[manual.result] || manual.result,
    color: REVIEW_RESULT_COLOR[manual.result] || "default",
  };
};

export const pushStatusView = (push = {}) => {
  const status = push.status || "unconfigured";
  if (status === "success") return { text: "已推送", color: "green" };
  if (status === "pending") return { text: "推送中", color: "blue" };
  if (status === "failed") return { text: "推送失败", color: "red" };
  if (status === "skipped") return { text: "未推送", color: "default" };
  if (status === "partial") return { text: "部分失败", color: "red" };
  return { text: "未配置", color: "default" };
};

export const EXCEPTION_TYPES = {
  device_offline: "设备离线",
  channel_abnormal: "通道异常",
  detection_abnormal: "识别异常",
  auto_recover: "自动恢复",
};



// 文件上传与设备管理请求使用同一平台 API，并带上当前登录令牌。
export const edgeFileUploadUrl = () => {
  let token = "";
  try {
    token = JSON.parse(sessionStorage.getItem("user") || "null")?.token || "";
  } catch (_) {
    token = "";
  }
  return `/_api/edgeAgent/files${token ? `?token=${encodeURIComponent(token)}` : ""}`;
};
