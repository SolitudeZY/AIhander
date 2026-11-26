"use strict";
// Integration smoke uses the real locally built Go Agent, not a protocol emulator.
// Build ../FirmwareUpgrade/bin/node-agent-migration/agent.exe (Windows), or set
// EDGE_AGENT_SMOKE_BINARY to a host-compatible Agent binary before running.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const fsp = require("node:fs/promises");
const path = require("node:path");
const os = require("node:os");
const http = require("node:http");
const { Readable } = require("node:stream");
const { spawn } = require("node:child_process");
const { once } = require("node:events");
const Koa = require("koa");
const { Op } = require("sequelize");
const { AgentPlatform, hash } = require("../app/lib/service/agentPlatform");
const setupAgentGateway = require("../app/lib/service/agentGateway");
const controller = require("../app/lib/controllers/firmwareUpgrade/edge-agent");

const binary = process.env.EDGE_AGENT_SMOKE_BINARY || path.resolve(__dirname,
  "../../../FirmwareUpgrade/bin/node-agent-migration/" + (process.platform === "win32" ? "agent.exe" : "agent"));
function matches(row, where) {
  return Reflect.ownKeys(where || {}).every(key => {
    const value = String(key).split(".").reduce((entry, field) => entry?.[field], row);
    const expected = where[key];
    if (expected && typeof expected === "object" && expected[Op.in]) return expected[Op.in].includes(value);
    if (expected && typeof expected === "object" && expected[Op.ne] !== undefined) return value !== expected[Op.ne];
    return expected === value;
  });
}
function database() {
  let rows = new Map();
  const model = {
    async findOne(options) { return (await this.findAll(options))[0] || null; },
    async findAll({ where, limit } = {}) {
      const selected = [...rows.values()].filter(row => matches(row, where));
      return structuredClone(limit === undefined ? selected : selected.slice(0, limit));
    },
    async upsert(row) {
      const key = row.kind + ":" + row.id;
      rows.set(key, structuredClone({ ...row, createdAt: rows.get(key)?.createdAt || new Date().toISOString() }));
    },
    async destroy({ where }) {
      for (const [key, row] of rows) if (matches(row, where)) rows.delete(key);
    },
  };
  const orm = {
    async transaction(callback) {
      const snapshot = structuredClone(rows);
      try { return await callback({}); } catch (error) { rows = snapshot; throw error; }
    },
    async query() {},
  };
  return { models: { EdgeAgentRecord: model }, orm };
}
async function until(check, diagnostics, timeout = 15000) {
  const start = Date.now();
  while (!(await check())) {
    if (Date.now() - start > timeout) throw new Error("Go Agent smoke timed out: " + diagnostics());
    await new Promise(resolve => setTimeout(resolve, 50));
  }
}
test("real Go Agent registers, reports heartbeat, resumes a file task and validates reboot IDs without rebooting", {
  skip: !fs.existsSync(binary) ? "Build a host-compatible Agent or set EDGE_AGENT_SMOKE_BINARY" : false,
  timeout: 30000,
}, async t => {
  const directory = await fsp.mkdtemp(path.join(os.tmpdir(), "node-go-agent-smoke-"));
  const downloads = [];
  const commands = [];
  const errors = [];
  const koa = new Koa();
  koa.use(require("koa-range"));
  require("../app/lib/service/agentDownloads")(koa);
  const app = { server: null, fs: { api: { logAttr: {} }, dc: database(), logger: { error: message => errors.push(message) } } };
  koa.fs = app.fs;
  let logs = "";
  let agent;
  t.after(async () => {
    if (agent && agent.exitCode === null && agent.signalCode === null) {
      const stopped = once(agent, "exit");
      agent.kill();
      await stopped;
    }
    if (app.fs.agentHub) for (const session of app.fs.agentHub.sessions.values()) session.socket.terminate();
    if (app.server?.listening) await new Promise(resolve => app.server.close(resolve));
    await fsp.rm(directory, { recursive: true, force: true });
  });
  koa.use(async ctx => {
    ctx.fs = app.fs;
    if (ctx.path === "/api/v1/agents/register" && ctx.method === "POST") {
      const parts = [];
      for await (const part of ctx.req) parts.push(part);
      ctx.request.body = JSON.parse(Buffer.concat(parts).toString("utf8"));
      await controller.registerAgent(ctx);
    } else if (ctx.path.startsWith("/api/v1/agents/files/") && ctx.method === "GET") {
      ctx.params = { id: decodeURIComponent(ctx.path.slice("/api/v1/agents/files/".length)) };
      await controller.downloadAgentFile(ctx);
      downloads.push({ status: ctx.status, range: ctx.get("Range") });
    } else ctx.status = 404;
  });
  koa.on("error", error => errors.push(error.message));
  app.server = http.createServer(koa.callback());
  await new Promise(resolve => app.server.listen(0, "127.0.0.1", resolve));
  const root = "http://127.0.0.1:" + app.server.address().port;
  const platform = app.fs.agentPlatform = new AgentPlatform(app, { dataDir: path.join(directory, "platform"), publicURL: root });
  await platform.ready;
  const hub = setupAgentGateway(app);
  hub.on("message", (id, message) => commands.push({ id, cmd: message.cmd }));
  const received = path.join(directory, "received");
  await fsp.mkdir(received);
  const config = {
    server_url: root, device_name: "Node-Go-smoke", device_interface: "",
    state_file: path.join(directory, "agent-state.json"), database_file: path.join(directory, "agent.db"),
    allowed_target_dir: received, heartbeat_interval_seconds: 1, websocket_reconnect_max_seconds: 1,
    file_download_timeout_seconds: 10, detector_ws_url: "ws://127.0.0.1:1",
    setup_listen: "127.0.0.1:0", setup_token: "local-smoke", terminal: { enabled: false, max_sessions: 1 },
    sku: "SMOKE", runtime_version: "smoke-1", model_version: "smoke-1", address: "127.0.0.1",
    allow_remote_reboot: false,
  };
  const configFile = path.join(directory, "config.json");
  await fsp.writeFile(configFile, JSON.stringify(config));
  agent = spawn(binary, ["-config", configFile], { cwd: directory, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
  let spawnError;
  agent.on("error", error => { spawnError = error; });
  const collect = data => { logs = (logs + data.toString("utf8")).slice(-10000); };
  agent.stdout.on("data", collect); agent.stderr.on("data", collect);
  const diagnostics = () => JSON.stringify({ exitCode: agent.exitCode, spawnError: spawnError?.message, errors, logs });
  await until(() => commands.some(message => message.cmd === "heartbeat" || message.cmd === "ping"), diagnostics);
  const identity = JSON.parse(await fsp.readFile(config.state_file, "utf8"));
  assert.ok(identity.device_id);
  assert.ok(hub.isConnected(identity.device_id));
  assert.equal((await platform.authenticate(identity.token)).id, identity.device_id);
  await until(async () => Number.isFinite((await platform.device(identity.device_id)).cpu_percent), diagnostics);
  const contents = Buffer.from("real Go Agent download test: 中文 model bytes\n".repeat(400));
  const file = await platform.storeFile(Readable.from([contents.subarray(0, 100), contents.subarray(100)]), "smoke-model.bin");
  assert.equal(file.sha256, hash(contents));
  // A real .part file forces the Go downloader's Range continuation path.
  await fsp.writeFile(path.join(received, file.original_name + ".part"), contents.subarray(0, 123));
  const deployment = await platform.createTasks({ file_id: file.id, device_ids: [identity.device_id], target_path: ".", target_is_directory: true });
  assert.equal(deployment.task_count, 1);
  const task = deployment.tasks[0];
  assert.equal(await platform.dispatch(task), true);
  await until(async () => ["succeeded", "failed"].includes((await platform.get("task", task.id)).status), diagnostics);
  const stored = await platform.get("task", task.id);
  assert.equal(stored.status, "succeeded", diagnostics());
  assert.equal(stored.progress, 100);
  assert.deepEqual(await fsp.readFile(path.join(received, file.original_name)), contents);
  assert.ok(downloads.some(request => request.status === 206 && request.range === "bytes=123-"), diagnostics());
  assert.ok(commands.some(message => message.cmd === "task.status"));
  // Exercise the real Node controller -> WebSocket -> Go validator. Remote
  // reboot stays disabled, so the OS reboot function cannot run on any host.
  const deviceId = identity.device_id;
  const rebootContext = key => ({ app, fs: app.fs, request: { body: { confirm: true, idempotencyKey: key } },
    params: { id: deviceId }, query: {}, path: `/edgeAgent/devices/${deviceId}/reboot`, ip: "127.0.0.1", status: 0,
    get: () => "", set: () => {} });
  let reboot = rebootContext("smoke-reboot-key-1");
  await controller.rebootDevice(reboot);
  assert.equal(reboot.body.error_code, "disabled", "valid Node ID must pass Agent validation before the disabled check");
  assert.equal(reboot.status, 403);
  assert.match(reboot.body.id, /^[a-f0-9]{32}$/);
  const failedId = reboot.body.id;
  assert.equal(reboot.body.status, "failed");
  reboot = rebootContext("smoke-reboot-key-1"); await controller.rebootDevice(reboot);
  assert.equal(reboot.body.id, failedId);
  reboot = rebootContext("smoke-reboot-key-2"); await controller.rebootDevice(reboot);
  assert.notEqual(reboot.body.id, failedId); assert.equal(reboot.body.error_code, "disabled");
  assert.ok(commands.some(message => message.cmd === "deviceRebootResult"));
  assert.deepEqual(errors, []);
});

