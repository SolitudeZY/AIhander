"use strict";

const api = require("../../controllers/firmwareUpgrade/edge-agent");
module.exports = (app, router) => {
  const routes = [
    ["get", "/edgeAgent/healthz", "health", "Agent平台健康检查"],
    ["delete", "/edgeAgent/system/database", "resetDatabase", "清理测试数据"],
    ["post", "/api/v1/agents/register", "registerAgent", "设备注册"],
    ["get", "/api/v1/agents/files/:id", "downloadAgentFile", "设备下载分配文件"],
    ["get", "/edgeAgent/devices", "listDevices", "查询边缘设备"],
    ["get", "/edgeAgent/devices/:id", "getDevice", "查询设备详情"],
    ["post", "/edgeAgent/devices/:id/exceptions/:exceptionID/acknowledge", "acknowledgeException", "确认设备异常"],
    ["get", "/edgeAgent/devices/:id/directories", "listDeviceDirectories", "查询设备目录"],
    ["put", "/edgeAgent/devices/:id/project", "assignDeviceProject", "分配项目"],
    ["delete", "/edgeAgent/devices/:id/project", "unassignDeviceProject", "解除项目关联"],
    ["get", "/edgeAgent/devices/:id/video-channels", "listVideoChannels", "查询通道"],
    ["post", "/edgeAgent/devices/:id/video-channels/test", "testVideoChannel", "测试视频连接"],
    ["post", "/edgeAgent/devices/:id/video-channels", "createVideoChannel", "新增通道"],
    ["put", "/edgeAgent/devices/:id/video-channels/:channelID", "updateVideoChannel", "修改通道"],
    ["delete", "/edgeAgent/devices/:id/video-channels/:channelID", "deleteVideoChannel", "删除通道"],
    ["get", "/edgeAgent/devices/:id/remote-sessions", "listRemoteSessions", "查询会话历史"],
    ["get", "/edgeAgent/remote-sessions/:sessionId", "getRemoteSession", "查询会话详情"],
    ["post", "/edgeAgent/devices/:id/reboot", "rebootDevice", "重启设备"],
    ["get", "/edgeAgent/devices/:id/operations/:operationID", "getDeviceOperation", "查询设备操作"],
    ["post", "/edgeAgent/devices/:id/files", "deliverDeviceFile", "投递文件"],
    ["get", "/edgeAgent/devices/:id/remote-files", "getRemoteFileInfo", "查询远程文件目录"],
    ["post", "/edgeAgent/devices/:id/remote-files", "uploadRemoteFile", "远程上传文件"],
    ["get", "/edgeAgent/devices/:id/remote-files/download", "downloadRemoteFile", "远程下载文件"],
    ["get", "/edgeAgent/files", "listFiles", "查询文件"],
    ["post", "/edgeAgent/files", "uploadFile", "上传文件"],
    ["get", "/edgeAgent/models", "listModels", "查询视觉模型"],
    ["post", "/edgeAgent/models", "createModel", "新增模型元数据"],
    ["get", "/edgeAgent/deployments", "listDeployments", "查询升级任务"],
    ["post", "/edgeAgent/deployments", "createDeployment", "创建升级任务"],
    ["delete", "/edgeAgent/deployments", "clearDeploymentHistory", "清理已结束任务"],
    ["get", "/edgeAgent/deployments/:id", "getDeployment", "查询任务详情"],
    ["post", "/edgeAgent/deployments/:id/redispatch", "redispatchDeployment", "重新下发任务"],
    ["get", "/edgeAgent/events/statistics", "getEventStatistics", "查询检测统计"],
    ["get", "/edgeAgent/events", "listEvents", "查询事件与异常"],
    ["get", "/edgeAgent/events/:deviceId/:rowId/image", "getEventImage", "查询证据图片"],
    ["get", "/edgeAgent/events/:deviceId/:rowId/evidence/:evidenceId", "getEventEvidence", "查询事件证据"],
    ["get", "/edgeAgent/events/:deviceId/:rowId", "getEventDetail", "查询事件详情"],
    ["post", "/edgeAgent/events/:deviceId/:rowId/review", "reviewEvent", "人工确认告警"],
    ["post", "/edgeAgent/events/:deviceId/:rowId/ai-review", "reviewEventWithAI", "AI 复核事件"],
    ["post", "/edgeAgent/events/:deviceId/:rowId/push", "retryEventPush", "重新推送告警"],
  ];
  for (const [method, path, handler, content] of routes) {
    app.fs.api.logAttr[method.toUpperCase() + path] = { content, visible: true };
    router[method](path, api[handler]);
  }
};
