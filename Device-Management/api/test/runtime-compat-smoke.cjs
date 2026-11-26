"use strict";

// Run with the deployment Node binary. No node:test, real DB, Qiniu or board.
const assert = require("assert").strict;
const fs = require("fs");
const path = require("path");
const os = require("os");
const vm = require("vm");
const { serialize, deserialize } = require("v8");
const { Op } = require("sequelize");
const { Readable } = require("stream");
const root = path.join(__dirname, "..");

function checkSyntax(directory) {
  for (const name of fs.readdirSync(directory)) {
    const filename = path.join(directory, name);
    if (fs.statSync(filename).isDirectory()) checkSyntax(filename);
    else if (/\.js$/.test(name)) new vm.Script(fs.readFileSync(filename, "utf8"), { filename });
  }
}
function matches(row, where) {
  return Reflect.ownKeys(where || {}).every(key => {
    const actual = String(key).split(".").reduce((value, part) => value && value[part], row);
    const expected = where[key];
    if (expected && typeof expected === "object") {
      if (expected[Op.in]) return expected[Op.in].includes(actual);
      if (expected[Op.ne] !== undefined) return actual !== expected[Op.ne];
    }
    return actual === expected;
  });
}

async function terminalSmoke(app) {
  const WebSocket = require("ws");
  const models = app.fs.dc.models;
  const sessions = [];
  models.ProjectDevice = { findOne: async () => null };
  models.UserToken = { findOne: async ({ where }) => where.token === "qa-platform" ? { expired: new Date(Date.now() + 60000), userInfo: { id: 1 } } : null };
  models.EdgeRemoteSession = {
    async update() {},
    async create(values) { const row = { id: 1, ...values, async update(update) { Object.assign(row, update); } }; sessions.push(row); return row; },
  };
  const server = require("http").createServer();
  app.server = server;
  app.fs.api = { logAttr: {} };
  const hub = require("../app/lib/service/agentGateway")(app);
  require("../app/lib/service/terminalGateway")(app);
  const sockets = [];
  async function until(fn) {
    const deadline = Date.now() + 5000;
    while (!fn()) { if (Date.now() > deadline) throw new Error("WebSocket smoke timed out"); await new Promise(resolve => setTimeout(resolve, 10)); }
  }
  try {
    await new Promise((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
    const base = "ws://127.0.0.1:" + server.address().port;
    const agent = new WebSocket(base + "/api/v1/agents/connect", { headers: { Authorization: "Bearer qa-device" } });
    sockets.push(agent);
    agent.on("error", () => {});
    agent.on("message", raw => {
      const wire = JSON.parse(String(raw));
      if (wire.cmd === "terminal.open") {
        for (const cmd of ["opened", "output"]) agent.send(JSON.stringify({ _from: "agent", cmd: "terminal." + cmd, values: { session_id: wire.values.session_id, pid: 1, data: Buffer.from("qa@board:~$ ").toString("base64") } }));
      } else if (wire.cmd === "terminal.input") {
        agent.send(JSON.stringify({ _from: "agent", cmd: "terminal.output", values: { session_id: wire.values.session_id, data: Buffer.from("uname -a\r\nLinux 中文\r\nqa@board:~$ ").toString("base64") } }));
      } else if (wire.cmd === "terminal.close") agent.send(JSON.stringify({ _from: "agent", cmd: "terminal.exited", values: { session_id: wire.values.session_id, exit_code: 0 } }));
    });
    await until(() => hub.isConnected("smoke-board"));
    const browser = new WebSocket(base + "/terminal/connect?device_id=smoke-board");
    sockets.push(browser);
    const messages = [];
    browser.on("message", raw => messages.push(JSON.parse(String(raw))));
    browser.on("error", () => {});
    await new Promise((resolve, reject) => { browser.once("open", resolve); browser.once("error", reject); });
    browser.send(JSON.stringify({ type: "auth", token: "qa-platform" }));
    await until(() => messages.some(m => m.type === "output"));
    browser.send(JSON.stringify({ type: "input", data: "uname -a\r" }));
    await until(() => messages.some(m => m.data && m.data.includes("Linux 中文")));
    browser.send(JSON.stringify({ type: "close" }));
    await until(() => sessions[0] && sessions[0].endedAt);
    assert.equal(sessions[0].operatorId, 1);
    assert.equal(sessions[0].recording.state, "complete");
    assert.ok(sessions[0].recording.events.some(e => e.text.includes("Linux 中文")));
  } finally {
    sockets.forEach(socket => socket.terminate());
    await new Promise(resolve => server.close(resolve));
  }
}

(async () => {
  checkSyntax(path.join(root, "app"));
  for (const name of ["server.js", "start-agent.js", "config.js"]) new vm.Script(fs.readFileSync(path.join(root, name), "utf8"), { filename: name });
  require("../app/lib/service/legacyNodeCompat");
  for (const name of ["postgresCompat", "agentGateway", "terminalGateway", "agentDownloads", "agentMultipartUpload", "startupDiagnostics"]) require("../app/lib/service/" + name);
  require("../app/lib/controllers/auth");
  const api = require("../app/lib/controllers/firmwareUpgrade/edge-agent");
  const { AgentPlatform, hash, uuid } = require("../app/lib/service/agentPlatform");
  const { QiniuAgentStorage } = require("../app/lib/service/agentFileStorage");
  assert.ok(/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(uuid()));
  assert.notEqual(uuid(), uuid());
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "agent-runtime-smoke-"));
  let rows = new Map();
  const clone = value => deserialize(serialize(value));
  const model = {
    async findAll({ where, limit } = {}) { const found = [...rows.values()].filter(row => matches(row, where)); return clone(limit === undefined ? found : found.slice(0, limit)); },
    async findOne(options) { return (await this.findAll(options))[0] || null; },
    async upsert(row) { rows.set(`${row.kind}:${row.id}`, clone(row)); },
    async destroy({ where }) { for (const [key, row] of rows) if (matches(row, where)) rows.delete(key); },
  };
  const app = { fs: { logger: { error() {} }, dc: { models: { EdgeAgentRecord: model }, orm: {
    async transaction(callback) { const previous = clone(rows); try { return await callback({}); } catch (error) { rows = previous; throw error; } },
    async query() {},
  } }, agentHub: { isConnected: () => true, send: () => true } } };
  const s = new AgentPlatform(app, { dataDir: directory });
  app.fs.agentPlatform = s;
  const context = body => ({ app, fs: app.fs, params: { id: "smoke-board", channelID: "camera-1" }, query: {}, request: { body }, path: "/edgeAgent/test", status: 0, get: () => "", set() {} });
  try {
    await s.ready;
    await s.register({ device_id: "smoke-board", name: "QA", os: "linux", arch: "arm64", sku: "RK3576", runtime_version: "2", model_version: "2", address: "127.0.0.1", device_token: "qa-device" }, "127.0.0.1");
    const bytes = Buffer.from("model bytes 中文");
    const file = await s.storeFile(Readable.from([bytes]), "model.rknn");
    assert.equal(file.sha256, hash(bytes));
    assert.deepEqual(fs.readFileSync(path.join(directory, "uploads", file.storage_name)), bytes);
    const bad = new Readable({ read() { this.destroy(new Error("stream failure")); } });
    await assert.rejects(s.storeFile(bad, "failed.rknn"), /stream failure/);
    assert.equal(fs.readdirSync(path.join(directory, "uploads")).length, 1);
    const qiniu = new QiniuAgentStorage({ domain: "https://files.example.test", bucket: "test", accessKey: "test-ak", secretKey: "test-sk" });
    qiniu.uploader.putFile = (token, key, filename, extra, callback) => callback(null, { key }, { statusCode: 200 });
    const remote = await qiniu.upload(path.join(directory, "uploads", file.storage_name), file.id);
    assert.equal(remote.storage, "qiniu");
    assert.ok(new URL(qiniu.downloadURL(remote)).searchParams.get("token"));
    qiniu.uploader.putFile = (token, key, filename, extra, callback) => callback(null);
    await assert.rejects(qiniu.upload("unused", file.id), { status: 503 });
    qiniu.manager.delete = (bucket, key, callback) => callback(null, {}, { statusCode: 612 });
    await qiniu.remove(remote);
    qiniu.manager.delete = (bucket, key, callback) => callback(null);
    await assert.rejects(qiniu.remove(remote), { status: 503 });
    let saved = { channelId: "camera-1", name: "temp", rtspUrl: "rtsp://admin:qa-only@camera.test/live", transport: "TCP", enabled: true, moduleName: "model.rknn", revision: 1 };
    await s.receive("smoke-board", { cmd: "channelStatusChanged", values: { channelId: "camera-1", status: "offline", detectionStatus: "error", revision: 1, observedAt: new Date(Date.now() - 1000).toISOString() } });
    app.fs.agentHub.request = async (id, cmd, values) => {
      if (cmd === "channelList") return { operate: true, channels: [saved] };
      assert.equal(cmd, "channelSet"); assert.equal(values.transport, "tcp"); assert.equal(values.rtspUrl, saved.rtspUrl);
      saved = { ...saved, ...values, revision: 2 }; return { operate: true, channel: saved };
    };
    const ctx = context({ name: "temp", rtsp_url: "rtsp://camera.test/live", username: "admin", transport: "TCP", enabled: false, expected_revision: 1, model_name: "model.rknn" });
    await api.updateVideoChannel(ctx);
    assert.equal(ctx.status, 200); assert.equal(ctx.body.status, "disabled");
    const faults = await s.records("exception");
    assert.equal(faults.length, 2); assert.ok(faults.every(row => row.data.status === "closed"));
    app.fs.api = { userId: 7 };
    app.fs.dc.models.User = { findAll: async () => [{ id: 7, username: "SuperAdmin", name: "超级管理员" }] };
    const confirmation = context({}); confirmation.params.exceptionID = faults[0].id;
    await api.acknowledgeException(confirmation);
    assert.equal(confirmation.status, 200); assert.equal(confirmation.body.acknowledged, true);
    assert.equal(confirmation.body.acknowledged_by, 7);
    assert.equal(confirmation.body.acknowledged_by_username, "SuperAdmin");
    await s.discardFile(file);
    await terminalSmoke(app);
    console.log(JSON.stringify({ node: process.version, syntax: "all API source", modules: "loaded", uuid: "v4", upload: "success and stream failure cleanup", qiniu: "SDK signing and mocked success/error", channel: "disable and close faults", terminal: "authenticated local Agent/browser WebSocket and UTF-8 recording", persistence: "in memory", network: "loopback only" }));
  } finally {
    for (const name of ["uploads", "alarms"]) {
      const target = path.join(directory, name);
      if (!fs.existsSync(target)) continue;
      for (const file of fs.readdirSync(target)) fs.unlinkSync(path.join(target, file));
      fs.rmdirSync(target);
    }
    fs.rmdirSync(directory);
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
