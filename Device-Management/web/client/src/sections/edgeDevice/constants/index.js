"use strict";

// 所有者/管理员
export const EDGE_PERMISSIONS = {
  module: "EDGEDEVICE",
  view: "VIEWEDGEDEVICE",
  viewLog: "VIEWEDGEDEVICELOG",
  assignProject: "ASSIGNEDGEDEVICEPROJECT",
  reboot: "REBOOTEDGEDEVICE",
  remoteSession: "EDGEREMOTESESSION",
  fileTransfer: "EDGEFILETRANSFER",
};

export const MODEL_PERMISSIONS = {
  module: "VISIONMODEL",
  view: "VIEWVISIONMODEL",
  upload: "UPLOADVISIONMODEL",
  edit: "EDITVISIONMODEL",
  dispatchUpgrade: "UPGRADETASK",
};

export const EVENT_PERMISSIONS = {
  module: "EVENTALARM",
  view: "VIEWEVENT",
  viewEvidence: "VIEWEVENTEVIDENCE",
  viewResult: "VIEWEVENTRESULT",
};

export const UPGRADE_PERMISSIONS = {
  module: "UPGRADETASK",
  view: "VIEWUPGRADETASK",
  viewDetail: "VIEWUPGRADETASKDETAIL",
};

export const AUDIT_PERMISSIONS = {
  module: "OPERATIONAUDIT",
  view: "VIEWAUDIT",
  viewParam: "VIEWAUDITPARAM",
};

// 心跳规则
export const HEARTBEAT_INTERVAL_SECONDS = 30;
export const OFFLINE_THRESHOLD_SECONDS = 150;

export const ONLINE_STATUS = {
  online: "在线",
  offline: "离线",
};

export const ABNORMAL_STATUS = {
  normal: "正常",
  channelAbnormal: "通道异常",
  offline: "设备离线",
  streamBroken: "通道断流",
  versionMismatch: "版本不一致",
  unassigned: "待分配",
};

// 视频连接状态
export const CHANNEL_CONNECT = {
  normal: "正常",
  reconnecting: "重连中",
  broken: "断流",
  disabled: "停用",
};

// 画面质量状态
export const CHANNEL_QUALITY = {
  normal: "正常",
  black: "黑屏",
  blocked: "严重遮挡",
  blur: "严重模糊",
  brightness: "亮度异常",
  undetectable: "无法检测",
};

export const DETECTION_TYPE_OPTIONS = ["边坡位移", "人员闯入", "画面异常"];

// 事件类型下拉
export const DETECTION_TYPE_CODES = {
  边坡位移: "landslide",
  人员闯入: "person_intrusion",
  画面异常: "picture",
};

export const EXCEPTION_STATUS = {
  active: "进行中",
  recovered: "已恢复",
  closed: "已关闭",
};

// 异常与恢复记录
export const EXCEPTION_RECORD_TYPE = {
  exception: "异常",
  recovery: "恢复",
};

export const EXCEPTION_TYPES = {
  device_offline: "设备离线",
  channel_abnormal: "通道异常",
  detection_abnormal: "识别异常",
  auto_recover: "自动恢复",
};

export const RECOVERY_ACTION = {
  reconnect_channel: "通道重连",
  restart_agent: "重启 Agent",
  reboot_device: "整机重启",
  none: "未执行",
};

export const SELF_CHECK_RESULT = {
  passed: "自检通过",
  failed: "自检失败",
  none: "未执行",
};

// 升级任务状态
export const TASK_STATUS = {
  waiting: "等待下发",
  running: "执行中",
  success: "成功",
  succeeded: "成功",
  pending: "执行中",
  claimed: "执行中",
  downloading: "执行中",
  partialFailed: "部分失败",
  failed: "失败",
};

// 升级任务状态下拉
export const TASK_STATUS_OPTIONS = ["执行中", "成功", "失败"];

// 设备执行明细状态
export const EXEC_STATUS = {
  waiting: "等待下发",
  dispatched: "已下发",
  running: "执行中",
  success: "成功",
  failed: "失败",
};

export const TASK_STATUS_COLOR = {
  等待下发: "orange",
  执行中: "blue",
  成功: "green",
  部分失败: "red",
  失败: "red",
};

export const EXEC_STATUS_COLOR = {
  等待下发: "default",
  已下发: "orange",
  执行中: "blue",
  成功: "green",
  失败: "red",
};

// 识别类型
export const RECOGNITION_TYPES = {
  slope: "边坡位移",
  intrusion: "人员闯入",
  picture: "画面异常",
};


export const TYPE_FORMAT_MAP = {
  slope: "RKNN",
  intrusion: "RKNN",
  picture: "ONNX",
};


export const TYPE_NAME_MAP = {
  slope: "滑坡识别模型",
  intrusion: "人员闯入检测",
  picture: "画面质量检测",
};

