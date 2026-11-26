"use strict";

// Browser terminal frames map directly to the authenticated Agent control hub.
// "cloud_error" is the historical recording category, retained for UI/history.
const { URL } = require("url");
const crypto = require("crypto");
const { literal } = require("sequelize");
const WebSocket = require("ws");
const { TerminalRecording, RecordingWriter, emptyRecording } = require("./terminalRecording");
const startupDiagnostic = require("./startupDiagnostics");
const TERMINAL_PATH = "/terminal/connect";
const MAX_PENDING_MESSAGES = 32;
const MAX_PENDING_BYTES = 64 * 1024;
const MAX_SOCKET_BYTES = 1024 * 1024;

function normalize(value) { return String(value == null ? "" : value).trim(); }
function isTerminalUpgrade(requestUrl) {
  try { const path = new URL(requestUrl, "http://127.0.0.1").pathname; return path === TERMINAL_PATH || path === `/api/v1${TERMINAL_PATH}`; }
  catch (_) { return false; }
}
function sendJson(socket, payload) {
  if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(payload), () => {});
}
function parseMessage(message) {
  try { return JSON.parse(Buffer.isBuffer(message) ? message.toString("utf8") : String(message)); }
  catch (_) { return null; }
}
function closeSocket(socket, code, reason) {
  if (!socket) return;
  if (socket.readyState === WebSocket.OPEN) socket.close(code, reason);
  else if (socket.readyState === WebSocket.CONNECTING) socket.terminate();
}
async function saveSystemLog(app, content, operatorId) {
  try {
    const SystemLog = app.fs.dc.models.SystemLog;
    if (SystemLog) await SystemLog.create({ logTime: new Date(), content, url: TERMINAL_PATH, userId: operatorId || null, module: "边缘设备 Terminal" }, { logging: false });
  } catch (_) { app.fs.logger.error("记录 Terminal 系统日志失败"); }
}
async function resolveOperatorId(app, token) {
  if (!normalize(token)) return null;
  try {
    const UserToken = app.fs.dc.models.UserToken;
    if (!UserToken) return null;
    const row = await UserToken.findOne({ where: { token: normalize(token) }, attributes: ["userInfo", "expired"], logging: false });
    if (!row || !row.expired || !Number.isFinite(Date.parse(row.expired)) || new Date(row.expired) <= new Date()) return null;
    return (row.userInfo || {}).id || null;
  } catch (_) { app.fs.logger.error("解析 Terminal 用户身份失败"); return null; }
}
async function createRemoteSession(app, deviceCode, purpose) {
  const models = app.fs.dc.models;
  const binding = await models.ProjectDevice.findOne({ where: { deviceCode, sourceSystem: "edge_cloud" }, attributes: ["projectId"], logging: false });
  return models.EdgeRemoteSession.create({
    projectId: binding ? binding.projectId : null, deviceCode, operatorId: null,
    purpose: normalize(purpose).slice(0, 64) || "terminal", startedAt: new Date(), createdAt: new Date(), recording: emptyRecording(),
  }, { logging: false });
}
// The existing gateway is single-instance. Reconcile before accepting any new sessions.
async function reconcileSessions(app) {
  try {
    if (!app.fs.dc.models.EdgeRemoteSession) throw Object.assign(new Error("EdgeRemoteSession model is not loaded"), { code: "MODEL_NOT_LOADED" });
    await app.fs.dc.models.EdgeRemoteSession.update({
      endedAt: new Date(), endReason: "gateway_restart",
      recording: literal(`CASE WHEN recording IS NULL THEN NULL ELSE jsonb_set(recording, '{state}', '"partial"'::jsonb) END`),
    }, { where: { endedAt: null }, logging: false });
    return true;
  } catch (error) { app.fs.logger.error(`初始化 Terminal 会话记录失败 ${startupDiagnostic(error, "session-reconcile", "EdgeRemoteSession")}`); return false; }
}
function registerTerminalConnection(app, client, requestUrl, ready, activeDevices) {
  const query = new URL(requestUrl, "http://127.0.0.1").searchParams;
  const deviceCode = normalize(query.get("device_id"));
  const hub = app.fs.agentHub;
  const reject = (code, message) => {
    app.fs.logger.error(`Terminal rejected device=${JSON.stringify(deviceCode)} code=${code}`);
    sendJson(client, { type: "error", code, message }); closeSocket(client, 1008, code);
  };
  if (!deviceCode) return reject("BAD_REQUEST", "device_id is required");
  if (!hub || !hub.isConnected(deviceCode)) return reject("DEVICE_OFFLINE", "Agent is offline");
  if (activeDevices.has(deviceCode)) return reject("SESSION_CONFLICT", "device already has a terminal session");
  activeDevices.add(deviceCode);
  let session = null;
  let recorder = null;
  let writer = null;
  let operatorId = null;
  let authenticating = false;
  let authenticated = false;
  let shellStarted = false;
  const agentSessionId = crypto.randomBytes(16).toString("hex");
  const logStage = (stage) => (app.fs.logger.info || app.fs.logger.error).call(app.fs.logger, `Terminal device=${JSON.stringify(deviceCode)} session=${agentSessionId} stage=${stage}`);
  logStage("browser_connected");
  let resolveAuth;
  const authReady = new Promise(resolve => { resolveAuth = resolve; });
  let closed = false;
  let closeReason = null;
  let sessionTimer = null;
  let openTimer = null;
  let exitTimer = null;
  const authTimer = setTimeout(() => {
    sendJson(client, { type: "error", code: "UNAUTHORIZED", message: "terminal authentication timed out" });
    finish("browser_error");
  }, 10000);
  authTimer.unref();
  let pendingBytes = 0;
  const pending = [];
  let initialized;
  const recordingFailure = () => {
    app.fs.logger.error("Terminal 会话记录不可用");
    sendJson(client, { type: "error", code: "RECORDING_UNAVAILABLE", message: "会话记录不可用，终端已断开" });
    finish("recording_failed");
  };
  const finish = (reason) => {
    if (closed) return;
    closed = true;
    closeReason = reason;
    logStage(`closed:${reason}`);
    pending.length = 0;
    pendingBytes = 0;
    clearTimeout(sessionTimer);
    clearTimeout(authTimer);
    clearTimeout(openTimer);
    clearTimeout(exitTimer);
    resolveAuth(false);
    hub.removeListener("message", onAgentMessage);
    hub.removeListener("disconnect", onDisconnect);
    if (shellStarted) {
      try { hub.send(deviceCode, "terminal.close", { session_id: agentSessionId }); } catch (_) { /* Agent disconnected */ }
    }
    closeSocket(client, reason === "recording_failed" ? 1011 : 1000, "terminal closed");
    // Initialization can still be creating the record; finalize it after that completes.
    Promise.resolve(initialized).then(async () => {
      if (writer) await writer.close(closeReason, operatorId);
      else if (session) await session.update({ endedAt: new Date(), endReason: closeReason }, { logging: false });
      if (session) await saveSystemLog(app, `Terminal 会话结束：会话 ${session.id}，原因 ${closeReason}`, operatorId);
    }).catch(() => app.fs.logger.error("结束 Terminal 会话记录失败"))
      .then(() => activeDevices.delete(deviceCode));
  };
  const forward = (message) => {
    if (closed || !shellStarted) return;
    const parsed = parseMessage(message);
    if (!parsed) return;
    let command, values = { session_id: agentSessionId };
    if (parsed.type === "auth") return;
    if (parsed.type === "input") {
      if (typeof parsed.data !== "string") return finish("browser_error");
      command = "terminal.input";
      values.data = Buffer.from(parsed.data, "utf8").toString("base64");
    } else if (parsed.type === "resize") {
      if (!Number.isInteger(parsed.cols) || !Number.isInteger(parsed.rows) || parsed.cols <= 0 || parsed.rows <= 0 || parsed.cols > 1000 || parsed.rows > 1000) return finish("browser_error");
      command = "terminal.resize";
      values.cols = parsed.cols; values.rows = parsed.rows;
    } else if (parsed.type === "close") {
      try { hub.send(deviceCode, "terminal.close", values); } catch (_) { finish("cloud_error"); return; }
      if (!exitTimer) { exitTimer = setTimeout(() => finish("browser_closed"), 3000); exitTimer.unref(); }
      return;
    }
    else return finish("browser_error");
    try {
      if (!hub.send(deviceCode, command, values)) { finish("cloud_error"); return; }
      if (parsed.type === "input") recorder.feed("input", parsed.data);
    } catch (_) { finish("buffer_limit"); }
  };
  const authenticate = async token => {
    if (authenticated || authenticating || closed) return;
    authenticating = true;
    const id = await resolveOperatorId(app, token);
    if (closed) return;
    if (!id) {
      sendJson(client, { type: "error", code: "UNAUTHORIZED", message: "terminal auth failed" });
      finish("browser_error"); return;
    }
    operatorId = id;
    authenticated = true;
    logStage("authenticated");
    clearTimeout(authTimer);
    resolveAuth(true);
  };
  const onDisconnect = id => {
    if (id !== deviceCode) return;
    sendJson(client, { type: "error", code: "DEVICE_OFFLINE", message: "Agent disconnected" });
    finish("cloud_error");
  };
  const onAgentMessage = (id, message) => {
    if (closed || !shellStarted || !writer || id !== deviceCode || !message.cmd.startsWith("terminal.")) return;
    const values = message.values;
    if (values.session_id !== agentSessionId) return;
    const type = message.cmd.slice("terminal.".length);
    const outbound = { type, session_id: agentSessionId };
    if (type === "opened") {
      logStage("agent_opened");
      clearTimeout(openTimer);
      openTimer = null;
      outbound.pid = values.pid;
      writer.update({ cloudSessionId: agentSessionId });
    } else if (type === "command") { recorder.command(values); return; }
    else if (type === "output") {
      if (typeof values.data !== "string") { finish("cloud_error"); return; }
      outbound.sequence = values.sequence;
      outbound.data = Buffer.from(values.data || "", "base64").toString("utf8");
      recorder.feed("output", outbound.data);
    } else if (type === "exited") {
      outbound.exit_code = values.exit_code;
      if (Number.isInteger(values.exit_code)) { recorder.document.shellExitCode = values.exit_code; writer.changed(); }
    } else if (type === "error") { outbound.message = values.message; }
    else return;
    if (client.bufferedAmount > MAX_SOCKET_BYTES) return finish("buffer_limit");
    sendJson(client, outbound);
    if (type === "exited") finish("browser_closed");
    if (type === "error" && openTimer) finish("cloud_error");
  };
  hub.on("message", onAgentMessage);
  hub.on("disconnect", onDisconnect);
  if (query.get("token")) authenticate(query.get("token"));
  client.on("message", message => {
    if (closed) return;
    const parsed = parseMessage(message);
    if (parsed && parsed.type === "auth") { authenticate(parsed.token); return; }
    if (shellStarted) return forward(message);
    const bytes = Buffer.byteLength(message);
    if (pending.length >= MAX_PENDING_MESSAGES || pendingBytes + bytes > MAX_PENDING_BYTES) {
      sendJson(client, { type: "error", code: "BUFFER_LIMIT", message: "终端连接尚未就绪，输入缓冲已满" });
      finish("buffer_limit");
      return;
    }
    pending.push(message);
    pendingBytes += bytes;
  });
  client.on("close", code => finish(code === 1006 ? "browser_error" : "browser_closed"));
  client.on("error", () => finish("browser_error"));
  initialized = (async () => {
    if (!(await ready)) { recordingFailure(); return; }
    if (!(await authReady)) return;
    if (closed) return;
    try {
      session = await createRemoteSession(app, deviceCode, query.get("purpose"));
      recorder = new TerminalRecording();
      writer = new RecordingWriter(session, recorder, recordingFailure);
      if (operatorId) writer.update({ operatorId });
    } catch (error) {
      app.fs.logger.error(`Terminal device=${JSON.stringify(deviceCode)} session=${agentSessionId} ${startupDiagnostic(error, "session-create", "EdgeRemoteSession")}`);
      recordingFailure(); return;
    }
    if (closed) return;
    const dimension = (key, fallback) => { const value = Number(query.get(key)); return Number.isInteger(value) && value > 0 && value <= 1000 ? value : fallback; };
    try {
      shellStarted = true;
      if (!hub.send(deviceCode, "terminal.open", { session_id: agentSessionId, shell: normalize(query.get("shell")), cols: dimension("cols", 120), rows: dimension("rows", 35) })) throw new Error("offline");
      logStage("terminal_open_sent");
      openTimer = setTimeout(() => {
        sendJson(client, { type: "error", code: "AGENT_TIMEOUT", message: "Agent terminal did not open" });
        finish("cloud_error");
      }, 10000);
      openTimer.unref();
    } catch (_) {
      sendJson(client, { type: "error", code: "DEVICE_OFFLINE", message: "Agent terminal unavailable" });
      finish("cloud_error"); return;
    }
    const minutes = Number(query.get("duration_minutes"));
    if (Number.isInteger(minutes) && minutes > 0) {
      sessionTimer = setTimeout(() => {
        sendJson(client, { type: "error", code: "SESSION_EXPIRED", message: "远程会话已到期" });
        finish("expired");
      }, Math.min(minutes, 1440) * 60000);
      sessionTimer.unref();
    }
    const messages = pending.splice(0);
    pendingBytes = 0;
    messages.forEach(forward);
    saveSystemLog(app, `Terminal 会话建立：会话 ${session.id}`, operatorId);
  })().catch(recordingFailure);
}
module.exports = function setupTerminalGateway(app) {
  if (!app || !app.server || !app.fs) return;
  const activeDevices = new Set();
  const ready = reconcileSessions(app);
  const webSocketServer = new WebSocket.Server({ noServer: true, clientTracking: false, maxPayload: MAX_PENDING_BYTES });
  app.fs.api.logAttr["GET/terminal/connect"] = { content: "连接 Terminal WebSocket Gateway", visible: true };
  app.server.on("upgrade", (request, socket, head) => {
    if (!isTerminalUpgrade(request.url)) return;
    (app.fs.logger.info || app.fs.logger.error).call(app.fs.logger, "Terminal stage=upgrade_received");
    webSocketServer.handleUpgrade(request, socket, head, client => {
      registerTerminalConnection(app, client, request.url, ready, activeDevices);
    });
  });
};
