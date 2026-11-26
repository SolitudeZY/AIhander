"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const http = require("node:http");
const { once } = require("node:events");
const Koa = require("koa");
const { AgentPlatform } = require("../app/lib/service/agentPlatform");
const { QiniuAgentStorage } = require("../app/lib/service/agentFileStorage");
const api = require("../app/lib/controllers/firmwareUpgrade/edge-agent");
const { fixture } = require("./agent-platform-fixture.cjs");
const { migrateEvidence } = require("../app/lib/service/agentEvidenceMigration");

const options = { domain: "https://files.example.test", bucket: "evidence-test", accessKey: "test-ak", secretKey: "test-sk" };
const alarm = { rowId: 93, channelId: "camera", detectionType: "landslide", confidence: 0.8, alarmTime: "2026-10-12T17:02:23+08:00", imageMimeType: "image/jpeg", image: Buffer.from("original image bytes").toString("base64") };
async function setup(t) {
  const f = await fixture(t);
  await f.service.register({ device_id: "board", name: "kickpi", os: "linux", arch: "arm64", sku: "RK3576", runtime_version: "2", model_version: "2", address: "10.8.30.54" }, "127.0.0.1");
  const storage = new QiniuAgentStorage(options);
  const objects = new Map();
  storage.uploader.put = (token, key, bytes, extra, cb) => {
    assert.equal(extra.mimeType, alarm.imageMimeType);
    objects.set(key, Buffer.from(bytes)); cb(null, { key }, { statusCode: 200 });
  };
  storage.manager.delete = (bucket, key, cb) => { objects.delete(key); cb(null, {}, { statusCode: 200 }); };
  f.service.fileStorage = storage;
  return { ...f, storage, objects };
}
function ctx(f) {
  return { app: f.app, fs: f.app.fs, params: { deviceId: "board", rowId: "93" }, path: "/edgeAgent/events/board/93/image", headers: {},
    set(name, value) { this.headers[name] = value; }, redirect(url) { this.status = 302; this.location = url; } };
}
const report = s => s.receive("board", { cmd: "alarmReport", values: { alarms: [alarm] } });

test("Qiniu evidence survives an empty replacement Pod and download signatures refresh", async t => {
  const f = await setup(t); await report(f.service);
  const row = await f.service.get("alarm", "board:93");
  assert.equal(row.image_storage.storage, "qiniu");
  assert.match(row.image_storage.object_key, /^edge-agent\/alarms\/.+\.jpg$/);
  assert.equal(row.image_storage.object_url, options.domain + "/" + row.image_storage.object_key);
  assert.deepEqual(f.objects.get(row.image_storage.object_key), Buffer.from(alarm.image, "base64"));
  assert.equal(JSON.stringify(row).includes("token="), false);
  assert.equal(row.upload_status, "uploaded");
  assert.equal(f.state.sent[0].cmd, "alarmReportResult");
  assert.deepEqual(await fs.readdir(path.join(f.directory, "alarms")), []);
  const replacement = new AgentPlatform(f.app, { dataDir: path.join(f.directory, "replacement"), fileStorage: f.storage });
  f.app.fs.agentPlatform = replacement; await replacement.ready;
  const before = Date.now(); t.mock.method(Date, "now", () => before);
  const first = ctx(f); await api.getEventImage(first);
  assert.equal(first.status, 302); assert.equal(new URL(first.location).hostname, "files.example.test");
  assert.equal(first.headers["Cache-Control"], "private, no-store");
  t.mock.method(Date, "now", () => before + 3600000);
  const second = ctx(f); await api.getEventImage(second);
  assert.notEqual(first.location, second.location);
  await report(replacement); assert.equal(f.objects.size, 1);
  const detail = ctx(f); await api.getEventDetail(detail);
  assert.equal(detail.body.image_url, "/edgeAgent/events/board/93/image");
});

test("Qiniu upload failure does not acknowledge; database failure cleans remote bytes and retry succeeds", async t => {
  const f = await setup(t); const upload = f.storage.uploader.put;
  f.storage.uploader.put = (token, key, data, extra, cb) => cb(null, {}, { statusCode: 403 });
  await assert.rejects(report(f.service), { status: 503 });
  assert.equal(f.state.sent.length, 0); assert.equal(await f.service.get("alarm", "board:93"), null);
  f.storage.uploader.put = upload; f.state.failKind = "alarm";
  await assert.rejects(report(f.service), /database failure/);
  assert.equal(f.state.sent.length, 0); assert.equal(f.objects.size, 0);
  f.state.failKind = null; await report(f.service);
  assert.equal(f.objects.size, 1); assert.equal(f.state.sent.length, 1);
});

test("replayed legacy evidence moves to Qiniu while preserving event metadata", async t => {
  const f = await setup(t); f.service.fileStorage = null; await report(f.service);
  const old = await f.service.get("alarm", "board:93");
  old.custom_note = "keep"; await f.service.put("alarm", "board:93", old, "board");
  f.service.fileStorage = f.storage; await report(f.service);
  const migrated = await f.service.get("alarm", "board:93");
  assert.equal(migrated.image_storage.storage, "qiniu");
  assert.equal(migrated.custom_note, "keep"); assert.equal(migrated.received_at, old.received_at);
  assert.equal(f.objects.size, 1);
});

test("legacy local evidence still streams, and a missing Qiniu adapter cannot fall back to Pod disk", async t => {
  const f = await setup(t); f.service.fileStorage = null; await report(f.service);
  const local = ctx(f); await api.getEventImage(local);
  assert.equal(local.status, 200); assert.equal(local.type, "image/jpeg");
  const chunks = []; for await (const bytes of local.body) chunks.push(bytes);
  assert.deepEqual(Buffer.concat(chunks), Buffer.from(alarm.image, "base64"));
  f.service.fileStorage = f.storage; await report(f.service); f.service.fileStorage = null;
  const missing = ctx(f); await api.getEventImage(missing);
  assert.equal(missing.status, 503);
});

test("migration inspects without writes, preserves metadata and recovers a missing image from an exported source", async t => {
  const f = await setup(t); f.service.fileStorage = null; await report(f.service);
  const row = await f.service.get("alarm", "board:93"); f.service.fileStorage = f.storage;
  const before = JSON.stringify(row);
  assert.equal((await migrateEvidence(f.service, "board:93")).status, "ready");
  assert.equal(JSON.stringify(await f.service.get("alarm", "board:93")), before);
  assert.equal(f.objects.size, 0);
  await fs.unlink(path.join(f.directory, "alarms", row.image));
  assert.equal((await migrateEvidence(f.service, "board:93", { apply: true })).status, "missing_file");
  const exported = path.join(f.directory, "export.jpg"); await fs.writeFile(exported, Buffer.from(alarm.image, "base64"));
  assert.equal((await migrateEvidence(f.service, "board:93", { apply: true, imageFile: exported })).status, "migrated");
  assert.equal((await f.service.get("alarm", "board:93")).received_at, row.received_at);
  assert.equal((await migrateEvidence(f.service, "board:93", { apply: true })).status, "already_qiniu");
  assert.equal(f.objects.size, 1);
});

test("history image follows a freshly signed Qiniu redirect through the existing Web proxy", async t => {
  const f = await setup(t); await report(f.service);
  const instances = [];
  const start = async koa => {
    const server = http.createServer(koa.callback()); instances.push(server);
    server.listen(0, "127.0.0.1"); await once(server, "listening");
    return `http://127.0.0.1:${server.address().port}`;
  };
  t.after(async () => { for (const server of instances) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); } });
  const bucket = new Koa();
  bucket.use(ctx => {
    assert.equal(ctx.query.token, "object-signature");
    assert.equal(ctx.query.platformToken, undefined);
    ctx.type = "image/jpeg"; ctx.body = Buffer.from(alarm.image, "base64");
  });
  const bucketRoot = await start(bucket);
  f.storage.downloadURL = row => bucketRoot + "/" + row.object_key + "?token=object-signature";
  const backend = new Koa(); backend.fs = f.app.fs;
  backend.use(async ctx => { ctx.fs = f.app.fs; ctx.params = { deviceId: "board", rowId: "93" }; await api.getEventImage(ctx); });
  const backendRoot = await start(backend);
  const direct = await fetch(backendRoot + "/edgeAgent/events/board/93/image", { redirect: "manual" });
  assert.equal(direct.status, 302); assert.match(direct.headers.get("location"), /object-signature/);
  const web = new Koa();
  require("../../web/middlewares/proxy").entry(web, null, { host: backendRoot, match: /^\/_api\// });
  const root = await start(web);
  const response = await fetch(root + "/_api/edgeAgent/events/board/93/image?platformToken=test-private-token");
  assert.equal(response.status, 200); assert.match(response.headers.get("content-type"), /^image\/jpeg/);
  assert.deepEqual(Buffer.from(await response.arrayBuffer()), Buffer.from(alarm.image, "base64"));
});
