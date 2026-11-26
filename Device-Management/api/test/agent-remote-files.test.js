"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const { once } = require("node:events");
const Koa = require("koa");
const bodyparser = require("koa-bodyparser");
const WebSocket = require("ws");
const setupAgentGateway = require("../app/lib/service/agentGateway");
const api = require("../app/lib/controllers/firmwareUpgrade/edge-agent");
const remote = require("../app/lib/service/agentRemoteFiles");
const { fixture } = require("./agent-platform-fixture.cjs");

async function setup(t) {
  const f = await fixture(t);
  const board = { device_id: "board", name: "kickpi", os: "linux", arch: "arm64", sku: "RK3576", runtime_version: "2", model_version: "2", address: "10.8.30.54", device_token: "board-test-token" };
  await f.service.register(board, "127.0.0.1");
  // Any call into persistent/cloud model storage is a regression.
  f.service.fileStorage = { upload() { throw Error("must not use Qiniu"); } };
  f.service.storeFile = () => { throw Error("must not use model upload"); };
  f.app.fs.agentPlatform = { authenticate: async token => token === board.device_token ? board : null, connected: async () => {}, receive: async () => {} };
  const koa = new Koa(); koa.fs = f.app.fs;
  const audit = []; f.app.fs.dc.models.SystemLog = { create: async value => audit.push(value) };
  koa.use(bodyparser());
  koa.use(async ctx => {
    ctx.fs = f.app.fs; ctx.params = { id: "board" };
    if (ctx.path.endsWith("download")) await api.downloadRemoteFile(ctx);
    else if (ctx.method === "POST") await api.uploadRemoteFile(ctx);
    else await api.getRemoteFileInfo(ctx);
  });
  const server = http.createServer(koa.callback());
  f.app.fs.api = { logAttr: {}, userId: 7 };
  setupAgentGateway({ server, fs: f.app.fs });
  f.app.fs.agentPlatform = f.service;
  // Gateway authenticates against the real platform, but presence updates are not relevant here.
  f.service.connected = async () => {}; f.service.receive = async () => {};
  server.listen(0, "127.0.0.1"); await once(server, "listening");
  const root = `http://127.0.0.1:${server.address().port}`;
  const agent = new WebSocket(root.replace("http", "ws") + "/api/v1/agents/connect", { headers: { Authorization: "Bearer " + board.device_token } });
  const files = new Map(); const pending = new Map(); const frames = [];
  const state = { rejectChunk: false };
  agent.on("message", raw => {
    const msg = JSON.parse(String(raw)); const v = msg.values; frames.push(msg);
    const cmd = msg.cmd.replace("file.transfer.", ""); let result = { operate: true, requestId: v.requestId };
    if (cmd === "info") Object.assign(result, { directory: "/home/kickpi/testAgent/files", max_bytes: remote.LIMIT });
    else if (cmd === "upload.begin") { pending.set(v.transfer_id, { name: v.name, bytes: [] }); }
    else if (cmd === "upload.chunk") {
      if (state.rejectChunk) result = { ...result, operate: false, err: "write failed" };
      else { const p = pending.get(v.transfer_id); const bytes = Buffer.from(v.data, "base64"); p.bytes.push(bytes); result.offset = v.offset + bytes.length; }
    } else if (cmd === "upload.finish") {
      const p = pending.get(v.transfer_id); const bytes = Buffer.concat(p.bytes); files.set(p.name, bytes); pending.delete(v.transfer_id);
      Object.assign(result, { name: p.name, size: bytes.length, directory: "/home/kickpi/testAgent/files" });
    } else if (cmd === "abort") pending.delete(v.transfer_id);
    else if (cmd === "download.begin") {
      if (!files.has(v.name)) Object.assign(result, { operate: false, err: "file not found" });
      else { pending.set(v.transfer_id, { name: v.name }); Object.assign(result, { size: files.get(v.name).length, directory: "/home/kickpi/testAgent/files" }); }
    } else if (cmd === "download.chunk") {
      const p = pending.get(v.transfer_id); const bytes = files.get(p.name).subarray(v.offset, v.offset + 65536);
      Object.assign(result, { data: bytes.toString("base64"), offset: v.offset + bytes.length, eof: v.offset + bytes.length === files.get(p.name).length });
    }
    agent.send(JSON.stringify({ _from: "agent", cmd: msg.cmd + ".result", values: result }));
  });
  await once(agent, "open");
  t.after(async () => { agent.terminate(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); });
  return { ...f, root, frames, files, pending, state, audit };
}
function multipart(bytes, name = "test.bin", extra = false) {
  const boundary = "remote-test-boundary";
  const head = Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${name}"\r\nContent-Type: application/octet-stream\r\n\r\n`);
  const tail = Buffer.from(`\r\n${extra ? `--${boundary}\r\nContent-Disposition: form-data; name="other"; filename="bad"\r\n\r\nbad\r\n` : ""}--${boundary}--\r\n`);
  return { body: Buffer.concat([head, bytes, tail]), headers: { "content-type": `multipart/form-data; boundary=${boundary}` }, method: "POST" };
}
test("HTTP upload and download relay binary chunks on the authenticated Agent socket without Qiniu or tasks", async t => {
  const f = await setup(t); const url = f.root + "/edgeAgent/devices/board/remote-files";
  const info = await fetch(url); assert.equal((await info.json()).directory, "/home/kickpi/testAgent/files");
  const bytes = Buffer.alloc(190000); for (let i = 0; i < bytes.length; i++) bytes[i] = i % 251;
  const upload = await fetch(url, multipart(bytes)); assert.equal(upload.status, 201); assert.equal((await upload.json()).size, bytes.length);
  assert.deepEqual(f.files.get("test.bin"), bytes); assert.equal(f.pending.size, 0);
  const response = await fetch(url + "/download?name=test.bin");
  assert.equal(response.status, 200); assert.equal(response.headers.get("content-length"), String(bytes.length));
  assert.deepEqual(Buffer.from(await response.arrayBuffer()), bytes);
  assert.equal(f.frames.every(frame => frame.cmd.startsWith("file.transfer.")), true);
  assert.equal((await f.service.records("file")).length, 0); assert.equal((await f.service.records("task")).length, 0);
  assert.ok(f.audit.some(row => row.content.includes("远程文件上传")));
});
test("rejected chunks and multiple multipart files clean staging and never publish a partial file", async t => {
  const f = await setup(t); const url = f.root + "/edgeAgent/devices/board/remote-files";
  f.state.rejectChunk = true;
  let response = await fetch(url, multipart(Buffer.from("data")));
  assert.equal(response.status, 502); assert.equal(f.pending.size, 0); assert.equal(f.files.size, 0);
  f.state.rejectChunk = false;
  response = await fetch(url, multipart(Buffer.from("data"), "test.bin", true));
  assert.equal(response.status, 400); assert.equal(f.pending.size, 0); assert.equal(f.files.size, 0);
  response = await fetch(url, multipart(Buffer.from("retry")));
  assert.equal(response.status, 201); assert.equal(f.files.get("test.bin").toString(), "retry");
});
test("download validates the name, reports missing files and releases an unread download lock", async t => {
  const f = await setup(t); f.files.set("log.txt", Buffer.from("logs"));
  assert.throws(() => remote.filename("../etc/passwd"), { status: 400 });
  assert.equal(remote.filename("日志.txt"), "日志.txt");
  const first = await remote.download(f.service, "board", "log.txt");
  await assert.rejects(remote.download(f.service, "board", "log.txt"), { status: 409 });
  first.body.destroy(); await first.cleanup();
  await assert.rejects(remote.download(f.service, "board", "missing"), { status: 502 });
  const second = await remote.download(f.service, "board", "log.txt");
  const chunks = []; for await (const chunk of second.body) chunks.push(chunk);
  assert.equal(Buffer.concat(chunks).toString(), "logs");
});
