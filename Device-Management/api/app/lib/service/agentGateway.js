"use strict";
const { URL } = require("url");
const { EventEmitter } = require("events");
const crypto = require("crypto");
const WebSocket = require("ws");
const MAX_SOCKET_BYTES = 1024 * 1024;
const MAX_INGEST_MESSAGES = 128;
const MAX_INGEST_BYTES = 4 * MAX_SOCKET_BYTES;
const MAX_REQUESTS = 256;
function fault(code, message) { return Object.assign(new Error(message), { code }); }
function close(socket, code, reason) { if (socket.readyState === WebSocket.OPEN) socket.close(code, reason); }

// Each device has one connection; persistence is ordered across reconnects.
class AgentHub extends EventEmitter {
  constructor(app) {
    super();
    // Each active terminal subscribes to the same hub; listeners are removed on close.
    this.setMaxListeners(0);
    this.app = app;
    this.sessions = new Map();
    this.requests = new Map();
    this.lifecycle = new Map();
  }
  isConnected(id) {
    const session = this.sessions.get(String(id));
    return !!session && session.socket.readyState === WebSocket.OPEN;
  }
  probe() {
    for (const [id, session] of this.sessions) {
      if (!session.alive) {
        this.detach(id, session, "Agent heartbeat timeout");
        session.socket.terminate();
        continue;
      }
      session.alive = false;
      try { session.socket.ping(); } catch (_) {
        this.detach(id, session, "Agent ping failed");
        session.socket.terminate();
      }
    }
  }
  ordered(id, action) {
    const previous = this.lifecycle.get(id) || Promise.resolve();
    const next = previous.then(action).catch(() => this.app.fs.logger.error("Agent 状态持久化失败"));
    this.lifecycle.set(id, next);
    next.then(() => { if (this.lifecycle.get(id) === next) this.lifecycle.delete(id); });
    return next;
  }
  send(id, cmd, values = {}) {
    const session = this.sessions.get(String(id));
    if (!session || session.socket.readyState !== WebSocket.OPEN) return false;
    // "cloud" is the existing Agent wire source, not a separate service.
    const data = JSON.stringify({ _from: "cloud", cmd, time: new Date().toISOString(), values });
    if (Buffer.byteLength(data) > MAX_SOCKET_BYTES || session.socket.bufferedAmount > MAX_SOCKET_BYTES) {
      throw fault("BUFFER_LIMIT", "Agent connection buffer limit reached");
    }
    session.socket.send(data, error => { if (error) close(session.socket, 1011, "write failed"); });
    return true;
  }
  request(id, cmd, values = {}, expectedCmd, timeout = 10000) {
    id = String(id);
    if (this.requests.size >= MAX_REQUESTS) return Promise.reject(fault("BUFFER_LIMIT", "Too many Agent requests"));
    return new Promise((resolve, reject) => {
      const requestId = crypto.randomBytes(16).toString("hex");
      const timer = setTimeout(() => {
        this.requests.delete(requestId);
        reject(fault("AGENT_TIMEOUT", "Agent response timed out"));
      }, Math.max(1, Math.min(Number(timeout) || 10000, 60000)));
      timer.unref();
      this.requests.set(requestId, { id, expectedCmd, resolve, reject, timer });
      try {
        if (!this.send(id, cmd, { ...values, requestId })) throw fault("DEVICE_OFFLINE", "Device is offline");
      } catch (error) { clearTimeout(timer); this.requests.delete(requestId); reject(error); }
    });
  }
  detach(id, session, reason) {
    if (this.sessions.get(id) !== session) return;
    this.sessions.delete(id);
    this.requests.forEach((pending, key) => {
      if (pending.id !== id) return;
      clearTimeout(pending.timer);
      this.requests.delete(key);
      pending.reject(fault("DEVICE_OFFLINE", reason));
    });
    this.emit("disconnect", id, reason);
    this.ordered(id, () => this.app.fs.agentPlatform.connected(id, false));
  }
  attach(id, socket) {
    id = String(id);
    const old = this.sessions.get(id);
    if (old) { this.detach(id, old, "Agent connection replaced"); close(old.socket, 1000, "replaced"); }
    const session = { socket, count: 0, bytes: 0, alive: true };
    this.sessions.set(id, session);
    socket.on("pong", () => { session.alive = true; });
    this.ordered(id, async () => {
      if (this.sessions.get(id) !== session) return;
      session.alive = true;
      await this.app.fs.agentPlatform.connected(id, true);
      if (this.sessions.get(id) === session && this.app.fs.agentPlatform.pending) await this.app.fs.agentPlatform.pending(id);
    });
    socket.on("message", (raw, flags) => {
      if (this.sessions.get(id) !== session) return;
      if (Buffer.byteLength(raw) > MAX_SOCKET_BYTES || (flags && flags.binary)) { close(socket, 1009, "invalid control frame"); return; }
      let message;
      try { message = JSON.parse(String(raw)); } catch (_) { close(socket, 1007, "invalid JSON"); return; }
      if (!message || message._from !== "agent" || typeof message.cmd !== "string" || !message.values || typeof message.values !== "object" || Array.isArray(message.values)) {
        close(socket, 1008, "invalid Agent envelope"); return;
      }
      const bytes = Buffer.byteLength(raw);
      if (session.count >= MAX_INGEST_MESSAGES || session.bytes + bytes > MAX_INGEST_BYTES) { close(socket, 1009, "ingest buffer limit"); return; }
      const response = this.requests.get(message.values.requestId);
      if (response && response.id === id && (!response.expectedCmd || response.expectedCmd === message.cmd)) {
        this.requests.delete(message.values.requestId);
        clearTimeout(response.timer);
        response.resolve(message.values);
      }
      this.emit("message", id, message);
      session.count++; session.bytes += bytes;
      this.ordered(id, () => this.app.fs.agentPlatform.receive(id, message)).then(() => { session.count--; session.bytes -= bytes; });
    });
    socket.on("close", () => this.detach(id, session, "Agent disconnected"));
    socket.on("error", () => { this.detach(id, session, "Agent connection error"); socket.terminate(); });
  }
}
module.exports = function setupAgentGateway(app) {
  if (!app || !app.server || !app.fs) return;
  const hub = app.fs.agentHub = new AgentHub(app);
  const healthTimer = setInterval(() => hub.probe(), 30000);
  healthTimer.unref();
  const wsServer = new WebSocket.Server({ noServer: true, clientTracking: false, maxPayload: MAX_SOCKET_BYTES });
  app.fs.api.logAttr["GET/agents/connect"] = { content: "连接 Agent 控制 WebSocket", visible: true };
  app.server.on("upgrade", async (request, socket, head) => {
    let path;
    try { path = new URL(request.url, "http://127.0.0.1").pathname; } catch (_) { return; }
    if (path !== "/api/v1/agents/connect") return;
    const reject = status => { if (!socket.destroyed) socket.end("HTTP/1.1 " + status + "\r\nConnection: close\r\n\r\n"); };
    const bearer = /^Bearer\s+(\S+)$/i.exec(String(request.headers.authorization || ""));
    if (!bearer) return reject("401 Unauthorized");
    const timer = setTimeout(() => socket.destroy(), 10000);
    timer.unref();
    try {
      const platform = app.fs.agentPlatform;
      if (!platform) return reject("503 Service Unavailable");
      await platform.ready;
      const device = await platform.authenticate(bearer[1]);
      if (!device) return reject("401 Unauthorized");
      const id = device.deviceId || device.device_id || device.id;
      if (!id) return reject("401 Unauthorized");
      if (!socket.destroyed) wsServer.handleUpgrade(request, socket, head, client => hub.attach(id, client));
    } catch (_) { reject("503 Service Unavailable"); }
    finally { clearTimeout(timer); }
  });
  app.server.on("close", () => {
    clearInterval(healthTimer);
    for (const [id, session] of hub.sessions) { hub.detach(id, session, "Gateway stopped"); session.socket.terminate(); }
  });
  return hub;
};
module.exports.AgentHub = AgentHub;

