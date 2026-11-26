"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const WebSocket = require("ws");
const setup = require("../app/lib/service/terminalGateway");
const setupAgentGateway = require("../app/lib/service/agentGateway");
const controller = require("../app/lib/controllers/firmwareUpgrade/edge-agent");
const { emptyRecording } = require("../app/lib/service/terminalRecording");

async function until(predicate, timeout = 4000) {
  const start = Date.now();
  while (!predicate()) {
    if (Date.now() - start > timeout) throw new Error("test condition timed out");
    await new Promise(resolve => setTimeout(resolve, 10));
  }
}
async function listen(server) {
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  return server.address().port;
}
function copy(value) { return JSON.parse(JSON.stringify(value)); }

async function fixture(t, options = {}) {
  const rows = options.rows || [];
  const logs = [];
  const frames = [];
  const sockets = [];
  let connections = 0;
  let failedUpdates = 0;
  const models = {
    Project: {}, User: { findByPk: async () => ({ id: 7, name: "测试操作人" }) },
    ProjectDevice: { findOne: async () => ({ projectId: 5 }) },
    UserToken: { findOne: async query => query.where.token === "platform-private-token" ? ({ userInfo: { id: 7 }, expired: new Date(Date.now() + 3600000) }) : null },
    SystemLog: { create: async row => logs.push(copy(row)) },
    EdgeRemoteSession: {
      async update(values) {
        if (options.reconcileFails) throw new Error("sensitive SQL must not be logged");
        for (const row of rows.filter(r => !r.endedAt)) {
          row.endedAt = values.endedAt;
          row.endReason = values.endReason;
          if (row.recording) row.recording.state = "partial";
        }
      },
      async create(values) {
        if (options.createGate) await options.createGate;
        if (options.createFails) throw new Error("sensitive SQL must not be logged");
        const row = { id: rows.length + 1, endedAt: null, ...copy(values) };
        rows.push(row);
        return { ...row, async update(update) {
          if (options.saveFails) { failedUpdates++; throw new Error("private failing SQL"); }
          Object.assign(row, copy(update));
        } };
      },
      async findByPk(id) { return rows.find(row => row.id === id); },
      async findAndCountAll(query) {
        assert.deepEqual(query.attributes.exclude, ["recording"]);
        assert.equal(query.attributes.include[0][0].val, '"edgeRemoteSession"."recording" - \'events\'');
        const selected = rows.map(row => {
          const { recording, ...meta } = row;
          if (recording) { const { events, ...recordingMeta } = recording; meta.recordingMeta = recordingMeta; }
          return meta;
        });
        return { count: rows.length, rows: selected };
      },
    },
  };
  const server = http.createServer();
  const app = { server, fs: { api: { userId: 999, logAttr: {} }, dc: { models }, logger: { error: text => logs.push(text) }, agentPlatform: {
    authenticate: async token => token === "device-secret" ? { id: "board" } : null,
    connected: async () => {}, receive: async () => {}, pending: async () => {},
  } } };
  setupAgentGateway(app);
  setup(app);
  const port = await listen(server);
  const agent = new WebSocket(`ws://127.0.0.1:${port}/api/v1/agents/connect`, { headers: { Authorization: "Bearer device-secret" } });
  sockets.push(agent);
  const sendAgent = (cmd, values) => agent.send(JSON.stringify({ _from: "agent", cmd, time: new Date().toISOString(), values }));
  agent.on("error", () => {});
  agent.on("message", raw => {
    const wire = JSON.parse(String(raw));
    assert.equal(wire._from, "cloud");
    const message = { type: wire.cmd.replace("terminal.", ""), ...wire.values };
    if (message.type === "input") message.data = Buffer.from(message.data, "base64").toString("utf8");
    frames.push(message);
    const reply = (cmd, values) => sendAgent(`terminal.${cmd}`, { session_id: message.session_id, ...values });
    if (message.type === "open") {
      connections++;
      reply("opened", { pid: 1 });
      reply("output", { data: Buffer.from("edgeops@board:~$ ").toString("base64") });
    } else if (message.type === "input") {
      if (options.commandResults) reply("command", { command_id: "1", state: "started", command: message.data.trim(), started_at: "2026-09-22T08:00:00.000Z" });
      reply("output", { data: Buffer.from(message.data.replace(/\r/g, "\r\n") + "Linux 中文\r\nedgeops@board:~$ ").toString("base64") });
      if (options.commandResults) reply("command", { command_id: "1", state: "finished", ended_at: "2026-09-22T08:00:00.123Z", duration_ms: 123, exit_code: 1 });
    } else if (message.type === "close") reply("exited", { exit_code: 0 });
  });
  await new Promise(resolve => agent.on("open", resolve));
  t.after(async () => {
    sockets.forEach(socket => socket.terminate());
    await new Promise(resolve => server.close(resolve));
  });
  async function connect(device = "board", auth = true) {
    const socket = new WebSocket(`ws://127.0.0.1:${port}/api/v1/terminal/connect?device_id=${device}&purpose=${encodeURIComponent("排查视频流")}`);
    sockets.push(socket);
    const messages = [];
    socket.on("message", raw => messages.push(JSON.parse(String(raw))));
    socket.on("error", () => {});
    await new Promise(resolve => socket.on("open", resolve));
    if (auth) socket.send(JSON.stringify({ type: "auth", token: "platform-private-token" }));
    return { socket, messages, send: value => socket.send(JSON.stringify(value)) };
  }
  const ctx = params => ({ params, query: {}, fs: app.fs, app });
  return { rows, logs, frames, connect, ctx, models, agent, app, connections: () => connections, failedUpdates: () => failedUpdates };
}

test("direct Agent WebSocket preserves UTF-8 traffic and persists redacted detail after close", async t => {
  const f = await fixture(t);
  const browser = await f.connect();
  browser.send({ type: "auth", token: "platform-private-token" });
  await until(() => browser.messages.some(m => m.type === "output"));
  browser.send({ type: "input", data: "uname -a\r" });
  await until(() => browser.messages.some(m => m.data && m.data.includes("Linux")));
  browser.send({ type: "input", data: "curl --password SuperSecret\r" });
  await until(() => browser.messages.some(m => m.data && m.data.includes("SuperSecret")));
  browser.send({ type: "resize", cols: 160, rows: 50 });
  browser.send({ type: "close" });
  await until(() => f.rows[0] && f.rows[0].endedAt);
  const saved = f.rows[0];
  assert.equal(saved.operatorId, 7);
  assert.equal(saved.purpose, "排查视频流");
  assert.match(saved.cloudSessionId, /^[a-f0-9]{32}$/);
  assert.ok(f.frames.some(m => m.type === "resize" && m.cols === 160));
  assert.ok(f.frames.some(m => m.data === "curl --password SuperSecret\r"));
  assert.ok(!JSON.stringify([saved, f.logs]).includes("SuperSecret"));
  assert.ok(!JSON.stringify([saved, f.logs]).includes("platform-private-token"));
  const detail = f.ctx({ sessionId: saved.id });
  await controller.getRemoteSession(detail);
  assert.equal(detail.status, 200);
  assert.equal(detail.body.commands[0].command, "uname -a");
  assert.equal(detail.body.commands[0].exitCode, null);
  assert.equal(detail.body.recording.shellExitCode, 0);
  assert.equal(detail.body.recordingSummary.state, "complete");
  assert.equal(detail.body.operatorName, "测试操作人");
  assert.ok(detail.body.recording.events.some(e => e.text.includes("Linux 中文")));
  const list = f.ctx({ id: "board" });
  await controller.listRemoteSessions(list);
  assert.equal(list.status, 200);
  assert.equal(list.body.rows[0].recordingSummary.inputCount, 2);
  assert.ok(!("recording" in list.body.rows[0]));
  assert.ok(!("commands" in list.body.rows[0]));
});

test("command result frames are persisted and returned by detail without forwarding raw command metadata", async t => {
  const f = await fixture(t, { commandResults: true });
  const browser = await f.connect();
  browser.send({ type: "auth", token: "platform-private-token" });
  await until(() => browser.messages.some(m => m.type === "output"));
  browser.send({ type: "input", data: "false\r" });
  await until(() => browser.messages.some(m => m.data?.includes("Linux")));
  browser.send({ type: "close" });
  await until(() => f.rows[0]?.endedAt);
  const ctx = f.ctx({ sessionId: f.rows[0].id });
  await controller.getRemoteSession(ctx);
  assert.equal(ctx.body.commands.length, 1);
  assert.equal(ctx.body.commands[0].status, "failed");
  assert.equal(ctx.body.commands[0].durationMs, 123);
  assert.equal(ctx.body.commands[0].exitCode, 1);
  assert.ok(!browser.messages.some(m => m.type === "command"));
});

test("initial DB failure rejects session before opening upstream or forwarding input", async t => {
  const f = await fixture(t, { createFails: true });
  const b = await f.connect();
  if (b.socket.readyState === WebSocket.OPEN) b.send({ type: "input", data: "dangerous\r" });
  await until(() => b.messages.some(m => m.code === "RECORDING_UNAVAILABLE"));
  assert.equal(f.connections(), 0);
  assert.equal(f.frames.length, 0);
    assert.ok(f.logs.some(line => typeof line === "string" && line.includes("stage=session-create") && line.includes("device=\"board\"")));
    assert.ok(f.logs.some(line => typeof line === "string" && line.includes("stage=closed:recording_failed")));
  assert.ok(!JSON.stringify(f.logs).includes("sensitive SQL"));
});

test("close during initial DB creation finalizes record without opening shell", async t => {
  let release;
  let started = false;
  const f = await fixture(t, { createGate: { then(resolve) { started = true; new Promise(r => { release = r; }).then(resolve); } } });
  const b = await f.connect();
  await until(() => started);
  b.socket.close();
  await until(() => b.socket.readyState === WebSocket.CLOSED);
  assert.equal(f.connections(), 0);
  release();
  await until(() => f.rows[0] && f.rows[0].endedAt);
  assert.equal(f.connections(), 0);
  assert.equal(f.rows[0].recording.inputCount, 0);
});

test("DB save failure notifies and closes client; error logs contain no SQL or input", async t => {
  const f = await fixture(t, { saveFails: true });
  const b = await f.connect();
  await until(() => b.messages.some(m => m.type === "output"));
  b.send({ type: "input", data: "password=SuperSecret\r" });
  await until(() => b.messages.some(m => m.code === "RECORDING_UNAVAILABLE"));
  await until(() => b.socket.readyState === WebSocket.CLOSED);
  assert.ok(f.failedUpdates() >= 1);
  assert.ok(!JSON.stringify(f.logs).includes("SuperSecret"));
  assert.ok(!JSON.stringify(f.logs).includes("private failing SQL"));
});

test("duplicate device is rejected and authenticated operator is used", async t => {
  const f = await fixture(t);
  const first = await f.connect();
  await until(() => first.messages.some(m => m.type === "opened"));
  const second = await f.connect();
  await until(() => second.messages.some(m => m.code === "SESSION_CONFLICT"));
  first.socket.close();
  await until(() => f.rows[0].endedAt);
  assert.equal(f.rows[0].operatorId, 7);
  assert.ok(f.logs.filter(l => typeof l === "object").every(l => l.userId === 7));
});

test("startup marks orphan recordings partial and preserves legacy unavailable records", async t => {
  const rows = [
    { id: 1, deviceCode: "old", startedAt: new Date(), recording: emptyRecording() },
    { id: 2, deviceCode: "old", startedAt: new Date(), recording: null },
  ];
  const f = await fixture(t, { rows });
  const current = f.ctx({ sessionId: 1 });
  await controller.getRemoteSession(current);
  assert.equal(current.body.status, "abnormal");
  assert.equal(current.body.recordingSummary.state, "partial");
  const legacy = f.ctx({ sessionId: 2 });
  await controller.getRemoteSession(legacy);
  assert.equal(legacy.body.recordingSummary.state, "unavailable");
  assert.deepEqual(legacy.body.commands, []);
  assert.equal(legacy.body.recording, null);
});

test("controller separates validation, missing records and storage failure", async t => {
  const f = await fixture(t);
  const invalid = f.ctx({ sessionId: "bad" });
  await controller.getRemoteSession(invalid); assert.equal(invalid.status, 400);
  const missing = f.ctx({ sessionId: 100 });
  await controller.getRemoteSession(missing); assert.equal(missing.status, 404);
  f.models.EdgeRemoteSession.findByPk = async () => { throw new Error("private SQL"); };
  const failed = f.ctx({ sessionId: 100 });
  await controller.getRemoteSession(failed); assert.equal(failed.status, 500);
  assert.ok(!JSON.stringify([failed.body, f.logs]).includes("private SQL"));
  const list = f.ctx({ id: "board" }); list.query.status = "invalid";
  await controller.listRemoteSessions(list); assert.equal(list.status, 400);
});

test("failed startup recovery refuses new shells until restart", async t => {
  const f = await fixture(t, { reconcileFails: true });
  const b = await f.connect();
  await until(() => b.messages.some(m => m.code === "RECORDING_UNAVAILABLE"));
  assert.equal(f.connections(), 0);
  assert.equal(f.rows.length, 0);
});

test("input queue is bounded while storage is initializing", async t => {
  let release;
  const f = await fixture(t, { createGate: new Promise(resolve => { release = resolve; }) });
  const b = await f.connect();
  for (let i = 0; i < 33; i++) b.send({ type: "input", data: "x" });
  await until(() => b.messages.some(m => m.code === "BUFFER_LIMIT"));
  release();
  await until(() => f.rows[0] && f.rows[0].endedAt);
  assert.equal(f.connections(), 0);
  assert.equal(f.rows[0].endReason, "buffer_limit");
  assert.equal(f.rows[0].recording.state, "partial");
  assert.equal(f.rows[0].recording.inputCount, 0);
});

test("actual Sequelize model generates metadata-only list projection", async () => {
  const Sequelize = require("sequelize");
  const sequelize = new Sequelize("postgres://unused:unused@localhost/unused", { logging: false });
  const dc = { ORM: Sequelize, orm: sequelize, models: {} };
  const Session = require("../app/lib/models/edge_remote_session")(dc);
  const Project = sequelize.define("project", { name: Sequelize.STRING }, { timestamps: false });
  Session.belongsTo(Project, { foreignKey: "projectId" });
  const sql = [];
  sequelize.query = async (text, options) => { sql.push(text); return options.plain ? { count: 0 } : []; };
  const ctx = { params: { id: "board" }, query: {}, fs: { dc: { models: { EdgeRemoteSession: Session, Project } }, logger: { error: () => assert.fail("query failed") } }, app: { fs: { agentPlatform: { ready: Promise.resolve() } } } };
  await controller.listRemoteSessions(ctx);
  assert.equal(ctx.status, 200);
  const selected = sql.find(text => text.includes('AS "recordingMeta"'));
  assert.ok(selected.includes('"edgeRemoteSession"."recording" - \'events\' AS "recordingMeta"'));
  assert.ok(!selected.includes('"edgeRemoteSession"."recording",'));
  assert.ok(!selected.includes('"edgeRemoteSession".*'));
  await sequelize.close();
});

test("invalid platform token cannot open an Agent shell or create a session", async t => {
  const f = await fixture(t);
  const browser = await f.connect("board", false);
  browser.send({ type: "auth", token: "invalid-platform-token" });
  browser.send({ type: "input", data: "uname -a\r" });
  await until(() => browser.messages.some(message => message.code === "UNAUTHORIZED"));
  assert.equal(f.connections(), 0);
  assert.equal(f.rows.length, 0);
  assert.equal(f.frames.length, 0);
});

test("expired, missing-expiry and malformed-expiry user tokens cannot open a terminal", async t => {
  for (const expired of [new Date(Date.now() - 1000), null, "invalid-date"]) {
    const f = await fixture(t);
    f.models.UserToken.findOne = async () => ({ userInfo: { id: 7 }, expired });
    const browser = await f.connect();
    await until(() => browser.messages.some(message => message.code === "UNAUTHORIZED"));
    assert.equal(f.connections(), 0); assert.equal(f.rows.length, 0);
  }
});

test("Agent disconnect finalizes recording as partial and notifies the browser", async t => {
  const f = await fixture(t);
  const browser = await f.connect();
  await until(() => browser.messages.some(message => message.type === "opened"));
  f.agent.close();
  await until(() => f.rows[0].endedAt);
  assert.equal(f.rows[0].recording.state, "partial");
  assert.equal(f.rows[0].endReason, "cloud_error");
  assert.ok(browser.messages.some(message => message.code === "DEVICE_OFFLINE"));
});
