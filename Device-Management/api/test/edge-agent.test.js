"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { once } = require("node:events");
const { Readable } = require("node:stream");
const http = require("node:http");
const Koa = require("koa");
const bodyparser = require("koa-bodyparser");
const api = require("../app/lib/controllers/firmwareUpgrade/edge-agent");
const { fixture, matches } = require("./agent-platform-fixture.cjs");
const Sequelize = require("sequelize");

function context(f, body = {}, params = {}, query = {}, headers = {}) {
  const responseHeaders = {};
  return { app: f.app, fs: f.app.fs, request: { body }, params, query, path: "/edgeAgent/test", ip: "127.0.0.1", status: 0,
    get: name => headers[name.toLowerCase()] || "", set: (name, value) => { responseHeaders[name.toLowerCase()] = value; }, responseHeaders };
}
async function board(f, id = "board-1") {
  await f.service.register({ device_id: id, name: "kickpi", os: "linux", arch: "arm64", sku: "RK3576", runtime_version: "2.0", model_version: "2.0", address: "10.8.30.54", device_token: `${id}-test-token` }, "127.0.0.1");
}

test("confirmation responses resolve the original operator account for existing records in one query", async t => {
  const f = await fixture(t); await board(f);
  await f.service.receive("board-1", { cmd: "channelStatusChanged", values: { channelId: "camera-1", status: "offline" } });
  const fault = (await f.service.records("exception"))[0].data;
  await f.service.acknowledgeException("board-1", fault.id, 1);
  const queries = [];
  f.app.fs.dc.models.User = { findAll: async options => {
    queries.push(options);
    return [{ id: 1, username: "SuperAdmin", name: "超级管理员" }];
  } };
  // A second user's idempotent confirmation must still show the original operator.
  f.app.fs.api = { userId: 2 };
  let ctx = context(f, {}, { id: "board-1", exceptionID: fault.id });
  await api.acknowledgeException(ctx);
  assert.equal(ctx.status, 200);
  assert.equal(ctx.body.acknowledged_by, 1);
  assert.equal(ctx.body.acknowledged_by_username, "SuperAdmin");
  assert.equal(ctx.body.acknowledged_by_name, "超级管理员");
  assert.deepEqual(queries[0].attributes, ["id", "username", "name"]);
  await f.service.put("exception", "deleted-user", { ...fault, id: "deleted-user", acknowledged: true, acknowledged_by: 99 }, "board-1");
  queries.length = 0;
  ctx = context(f, {}, {}, { category: "exceptions", device_id: "board-1" });
  await api.listEvents(ctx);
  assert.equal(ctx.status, 200);
  assert.equal(queries.length, 1);
  assert.equal(ctx.body.items.find(item => item.id === fault.id).acknowledged_by_username, "SuperAdmin");
  const missing = ctx.body.items.find(item => item.id === "deleted-user");
  assert.equal(missing.acknowledged_by, 99);
  assert.equal(missing.acknowledged_by_username, "");
});

test("exception confirmation is persisted, scoped, idempotent and clears only pending summary", async t => {
  const f = await fixture(t); await board(f); await board(f, "board-2"); f.state.online.add("board-1");
  f.app.fs.dc.models.ProjectDevice = { findOne: async () => null, findAll: async () => [] };
  f.app.fs.agentHub.request = async () => ({ channels: [] });
  await f.service.receive("board-1", { cmd: "channelStatusChanged", values: { channelId: "camera-old", status: "offline", observedAt: "2026-10-10T10:00:00Z" } });
  const fault = (await f.service.records("exception"))[0].data;
  let ctx = context(f, {}, { id: "board-1" }); await api.getDevice(ctx); assert.equal(ctx.body.abnormal, "存在异常");
  ctx = context(f, {}, { id: "board-1", exceptionID: fault.id }); await api.acknowledgeException(ctx); assert.equal(ctx.status, 401);
  f.app.fs.api = { userId: 7 };
  ctx = context(f, {}, { id: "board-2", exceptionID: fault.id }); await api.acknowledgeException(ctx); assert.equal(ctx.status, 404);
  ctx = context(f, {}, { id: "board-1", exceptionID: fault.id }); await api.acknowledgeException(ctx);
  assert.equal(ctx.status, 200); assert.equal(ctx.body.acknowledged, true); assert.equal(ctx.body.acknowledged_by, 7);
  assert.equal(ctx.body.status, "active"); assert.equal(ctx.body.ended_at, ""); assert.equal(ctx.body.result, "none");
  const confirmedAt = ctx.body.acknowledged_at;
  await api.acknowledgeException(ctx); assert.equal(ctx.body.acknowledged_at, confirmedAt);
  ctx = context(f, {}, { id: "board-1" }); await api.getDevice(ctx); assert.equal(ctx.body.abnormal, "正常");
  ctx = context(f); await api.listDevices(ctx); assert.equal(ctx.body.find(x => x.id === "board-1").abnormal, "正常");
  ctx = context(f, {}, {}, { category: "exceptions", status: "acknowledged" }); await api.listEvents(ctx); assert.equal(ctx.body.total, 1);
  await f.service.receive("board-1", { cmd: "channelStatusChanged", values: { channelId: "camera-old", status: "offline", observedAt: "2026-10-10T10:01:00Z" } });
  assert.equal((await f.service.records("exception")).length, 1);
  assert.equal((await f.service.get("exception", fault.id)).acknowledged, true);
  await f.service.receive("board-1", { cmd: "channelStatusChanged", values: { channelId: "camera-old", status: "running", qualityStatus: "normal", observedAt: "2026-10-10T10:02:00Z" } });
  assert.equal((await f.service.get("exception", fault.id)).status, "recovered");
  const recovery = (await f.service.records("exception")).find(x => x.data.record_type === "recovery").data;
  assert.equal(recovery.acknowledged, undefined);
  ctx = context(f, {}, { id: "board-1", exceptionID: recovery.id }); await api.acknowledgeException(ctx); assert.equal(ctx.status, 404);
  await f.service.receive("board-1", { cmd: "channelStatusChanged", values: { channelId: "camera-old", status: "offline", observedAt: "2026-10-10T10:03:00Z" } });
  ctx = context(f, {}, { id: "board-1" }); await api.getDevice(ctx); assert.equal(ctx.body.abnormal, "存在异常");
  const current = (await f.service.records("exception")).find(x => x.data.status === "active").data;
  assert.equal(current.acknowledged, undefined); assert.notEqual(current.id, fault.id);
});

test("acknowledged live stream faults do not hide a different new inference fault", async t => {
  const f = await fixture(t); await board(f); f.state.online.add("board-1");
  f.app.fs.dc.models.ProjectDevice = { findAll: async () => [] };
  f.app.fs.agentHub.request = async () => ({ channels: [{ channelId: "camera-1", enabled: true, revision: 1 }] });
  await f.service.receive("board-1", { cmd: "channelStatusChanged", values: { channelId: "camera-1", status: "offline", revision: 1, observedAt: "2026-10-10T10:00:00Z" } });
  const fault = (await f.service.records("exception"))[0].data;
  await f.service.acknowledgeException("board-1", fault.id, 7);
  const ctx = context(f); await api.listDevices(ctx); assert.equal(ctx.body[0].abnormal, "正常");
  await f.service.receive("board-1", { cmd: "channelStatusChanged", values: { channelId: "camera-1", status: "offline", detectionStatus: "error", revision: 1, observedAt: "2026-10-10T10:01:00Z" } });
  await api.listDevices(ctx); assert.equal(ctx.body[0].abnormal, "存在异常");
});

test("disabling an uppercase TCP legacy channel preserves credentials and closes active faults", async t => {
  const f = await fixture(t); await board(f);
  const saved = { channelId: "camera-1", name: "channl", rtspUrl: "rtsp://tester:secret@camera.test/live", enabled: true, moduleName: "model.rknn", transport: "TCP", revision: 1 };
  await f.service.receive("board-1", { cmd: "channelStatusChanged", values: { channelId: saved.channelId, status: "offline", detectionStatus: "error", observedAt: "2026-10-10T10:00:00Z" } });
  let sent;
  f.app.fs.agentHub.request = async (id, cmd, values) => {
    if (cmd === "channelList") return { channels: [saved] };
    sent = values;
    return { operate: true, channel: { ...values, revision: 2 }, status: "stopped" };
  };
  const ctx = context(f, { name: saved.name, rtsp_url: "rtsp://camera.test/live", username: "admin", enabled: false, transport: "TCP", expected_revision: 1, model_name: saved.moduleName }, { id: "board-1", channelID: saved.channelId });
  await api.updateVideoChannel(ctx);
  assert.equal(ctx.status, 200);
  assert.equal(sent.transport, "tcp");
  assert.equal(sent.rtspUrl, saved.rtspUrl);
  assert.equal(sent.enabled, false);
  assert.equal(ctx.body.error, "");
  assert.equal(ctx.body.quality_status, "unknown");
  const faults = await f.service.records("exception");
  assert.equal(faults.length, 2);
  assert.ok(faults.every(row => row.data.status === "closed" && row.data.result === "none"));
  assert.ok(faults.every(row => row.data.record_type === "exception"));
});

test("querying an already disabled channel closes stale faults without making the device abnormal", async t => {
  const f = await fixture(t); await board(f); f.state.online.add("board-1");
  await f.service.receive("board-1", { cmd: "channelStatusChanged", values: { channelId: "camera-1", status: "offline", observedAt: "2026-10-10T10:00:00Z" } });
  f.app.fs.dc.models.ProjectDevice = { findAll: async () => [] };
  f.app.fs.agentHub.request = async () => ({ channels: [{ channelId: "camera-1", name: "temporary", rtspUrl: "rtsp://camera.test/live", moduleName: "model.rknn", enabled: false, transport: "UDP", revision: 2 }] });
  const ctx = context(f); await api.listDevices(ctx);
  assert.equal(ctx.status, 200);
  assert.equal(ctx.body[0].abnormal, "正常");
  assert.equal((await f.service.records("exception"))[0].data.status, "closed");
});

test("channel update preserves omitted password, redacts credentials and enforces optimistic revision", async t => {
  const f = await fixture(t); await board(f);
  const saved = { channelId: "camera-1", name: "camera", rtspUrl: "rtsp://tester:secret@camera.test/live", enabled: true, moduleName: "model.rknn", revision: 3 };
  const requests = [];
  f.app.fs.agentHub.request = async (deviceId, cmd, values) => {
    requests.push({ deviceId, cmd, values });
    return cmd === "channelList" ? { channels: [saved] } : { channel: { ...values, revision: 4 } };
  };
  let ctx = context(f, { name: "renamed", rtsp_url: "rtsp://camera.test/live", username: "operator", enabled: true, expected_revision: 3 }, { id: "board-1", channelID: "camera-1" });
  await api.updateVideoChannel(ctx);
  assert.equal(ctx.status, 200);
  assert.equal(requests[1].values.rtspUrl, saved.rtspUrl);
  assert.equal(ctx.body.rtsp_url, "rtsp://camera.test/live");
  assert.equal(ctx.body.password_configured, true);
  assert.equal(JSON.stringify(ctx.body).includes("secret"), false);
  ctx = context(f, { name: "renamed", rtsp_url: "rtsp://camera.test/live", username: "operator", enabled: true, expected_revision: 2 }, { id: "board-1", channelID: "camera-1" });
  await api.updateVideoChannel(ctx); assert.equal(ctx.status, 409);
  ctx = context(f, { name: "new", rtsp_url: "rtsp://tester:secret@camera.test/live", model_name: "model.rknn", enabled: true }, { id: "board-1" });
  await api.createVideoChannel(ctx); assert.equal(ctx.status, 400);
  ctx = context(f, { name: "new", rtsp_url: "rtsp://camera.test/live", username: "operator", model_name: "../escape.rknn", enabled: true }, { id: "board-1" });
  await api.createVideoChannel(ctx); assert.equal(ctx.status, 400);
});

test("testing a saved channel reuses its credentials and transport without leaking them", async t => {
  const f = await fixture(t); await board(f);
  const saved = { channelId: "camera-1", name: "camera", rtspUrl: "rtsp://tester:secret@camera.test/live", enabled: true, moduleName: "model.rknn", transport: "udp", revision: 3 };
  f.app.fs.agentHub.request = async (id, cmd, values) => {
    if (cmd === "channelList") return { channels: [saved] };
    assert.equal(cmd, "channelTest");
    assert.equal(values.rtspUrl, saved.rtspUrl);
    assert.equal(values.transport, "udp");
    return { success: true, codec: "h264", duration_ms: 12 };
  };
  const ctx = context(f, { channel_id: "camera-1" }, { id: "board-1" });
  await api.testVideoChannel(ctx); assert.equal(ctx.status, 200);
  assert.equal(JSON.stringify(ctx.body).includes("secret"), false);
});

test("events validate pagination, filtering and image projection without returning image storage names", async t => {
  const f = await fixture(t);
  for (let id = 1; id <= 3; id++) await f.service.put("alarm", `board-1:${id}`, { device_id: "board-1", agent_row_id: id, confidence: id / 3, alarm_time: `2026-10-10T10:00:0${id}.000Z`, image: id === 3 ? "private-image.png" : "", imageMimeType: "image/png" }, "board-1");
  let ctx = context(f, {}, {}, { page: "1", page_size: "1", min_confidence: "0.5" });
  await api.listEvents(ctx);
  assert.equal(ctx.status, 200); assert.equal(ctx.body.total, 2); assert.equal(ctx.body.has_more, true); assert.equal(ctx.body.items.length, 1);
  ctx = context(f, {}, { deviceId: "board-1", rowId: "3" });
  await api.getEventDetail(ctx);
  assert.equal(ctx.body.image_url, "/edgeAgent/events/board-1/3/image"); assert.equal(ctx.body.image, undefined);
  for (const query of [{ page: "0" }, { page_size: "101" }, { min_confidence: "2" }, { category: "detections", status: "active" }, { start_time: "2026-10-10T10:00:00" }, { start_time: "2026-10-10T11:00:00Z", end_time: "2026-10-10T10:00:00Z" }]) {
    ctx = context(f, {}, {}, query); await api.listEvents(ctx); assert.equal(ctx.status, 400, JSON.stringify(query));
  }
});

test("event list and detail fill missing model versions from the device without rewriting history", async t => {
  const f = await fixture(t); await board(f);
  for (const [id, version] of [[1, ""], [2, "1.5"], [3, "  "]]) {
    await f.service.put("alarm", `board-1:${id}`, { device_id: "board-1", agent_row_id: id, model_version: version, alarm_time: "2026-10-10T10:00:00Z" }, "board-1");
  }
  const missing = { device_id: "removed-board", agent_row_id: 1, model_version: "" };
  await f.service.put("alarm", "removed-board:1", missing, "removed-board");
  let ctx = context(f); await api.listEvents(ctx);
  assert.equal(ctx.status, 200);
  const items = new Map(ctx.body.items.map(row => [`${row.device_id}:${row.agent_row_id}`, row]));
  assert.equal(items.get("board-1:1").model_version, "2.0");
  assert.equal(items.get("board-1:2").model_version, "1.5");
  assert.equal(items.get("board-1:3").model_version, "2.0");
  assert.equal(items.get("removed-board:1").model_version, "");
  const device = await f.service.get("device", "board-1");
  await f.service.put("device", "board-1", { ...device, model_version: "3.0" }, "board-1");
  ctx = context(f, {}, { deviceId: "board-1", rowId: "1" }); await api.getEventDetail(ctx);
  assert.equal(ctx.body.model_version, "3.0");
  assert.equal((await f.service.get("alarm", "board-1:1")).model_version, "");
  ctx = context(f, {}, { deviceId: "board-1", rowId: "2" }); await api.getEventDetail(ctx);
  assert.equal(ctx.body.model_version, "1.5");
  assert.equal(JSON.stringify(ctx.body).includes("token_hash"), false);
});

test("completed video probe failure is a result, missing probe and timeout return real HTTP errors", async t => {
  const f = await fixture(t); await board(f);
  for (const [result, status] of [[{ success: false, message: "video connection failed" }, 200], [{ success: false, error_code: "probe_unavailable" }, 502], [{ success: false, error_code: "timeout" }, 504]]) {
    f.app.fs.agentHub.request = async () => result;
    const ctx = context(f, { rtsp_url: "rtsp://camera.test/live" }, { id: "board-1" });
    await api.testVideoChannel(ctx); assert.equal(ctx.status, status); assert.equal(ctx.body.success, false);
  }
});

test("deployment status filtering selects matching devices and respects a supplied deployment ID", async t => {
  const f = await fixture(t);
  const rows = [
    { id: 1, cloudDeploymentId: "deploy-1", deviceCode: "board-1" },
    { id: 2, cloudDeploymentId: "deploy-1", deviceCode: "board-2" },
    { id: 3, cloudDeploymentId: "deploy-2", deviceCode: "board-1" },
  ];
  f.app.fs.dc.models.EdgeUpgradeTaskDevice = { findAndCountAll: async options => {
    const found = rows.filter(row => matches(row, options.where));
    return { count: found.length, rows: found };
  } };
  for (const [id, deployment, device, status] of [["t1", "deploy-1", "board-1", "failed"], ["t2", "deploy-1", "board-2", "succeeded"], ["t3", "deploy-2", "board-1", "failed"]]) {
    await f.service.put("task", id, { deployment_id: deployment, status }, device);
  }
  let ctx = context(f, {}, {}, { status: "失败", taskId: "deploy-1" });
  await api.listDeployments(ctx);
  assert.equal(ctx.status, 200); assert.equal(ctx.body.count, 1); assert.equal(ctx.body.rows[0].deviceCode, "board-1");
  ctx = context(f, {}, {}, { status: "失败", taskId: "deploy-absent" });
  await api.listDeployments(ctx); assert.equal(ctx.body.count, 0);
});

test("mixed exception time filtering uses recovery completion and evidence statistics retain filters", async t => {
  const f = await fixture(t);
  const base = { device_id: "board-1", channel_id: "c1", started_at: "2026-10-09T00:00:00Z", ended_at: "2026-10-10T10:00:00Z", status: "recovered" };
  await f.service.put("exception", "e1", { ...base, record_type: "exception" }, "board-1");
  await f.service.put("exception", "r1", { ...base, record_type: "recovery" }, "board-1");
  const ctx = context(f, {}, {}, { category: "exceptions", start_time: "2026-10-10T00:00:00Z", end_time: "2026-10-10T23:00:00Z" });
  await api.listEvents(ctx); assert.equal(ctx.body.total, 1); assert.equal(ctx.body.items[0].record_type, "recovery");
  await f.service.put("alarm", "a1", { upload_status: "uploaded" }, "board-1");
  await f.service.put("alarm", "a2", { upload_status: "not_uploaded" }, "board-1");
  f.app.fs.dc.ORM = Sequelize;
  f.model.findAll = async () => [{ first_alarm_time: "", last_alarm_time: "", count: 1 }];
  const stats = context(f, {}, {}, { evidence_status: "not_uploaded" });
  await api.getEventStatistics(stats); assert.equal(stats.body.total, 1); assert.equal(stats.body.with_image, 0);
});

test("event statistics use database aggregates and normalize count values", async t => {
  const f = await fixture(t); f.app.fs.dc.ORM = Sequelize;
  let countCall = 0, aggregateCall = 0;
  f.model.count = async () => ++countCall === 1 ? 3 : 2;
  f.model.findAll = async options => {
    aggregateCall++;
    if (options.group?.[0] === "deviceId") return [{ deviceId: "board-1" }, { deviceId: "board-2" }];
    if (options.limit === 50) return [{ detection_type: "landslide", count: "3" }];
    return [{ first_alarm_time: "2026-10-10T10:00:00Z", last_alarm_time: "2026-10-10T11:00:00Z" }];
  };
  const ctx = context(f); await api.getEventStatistics(ctx);
  assert.equal(ctx.status, 200); assert.equal(ctx.body.total, 3); assert.equal(ctx.body.with_image, 2); assert.equal(ctx.body.device_count, 2);
  assert.equal(ctx.body.by_detection_type[0].count, 3); assert.equal(aggregateCall, 3);
});

test("reboot is idempotent, private markers omitted, ownership checked and directory response matches Go", async t => {
  const f = await fixture(t); await board(f); f.state.online.add("board-1");
  let requests = 0;
  f.app.fs.agentHub.request = async (id, cmd, values, expected) => {
    if (cmd === "directory.list") { assert.equal(expected, "directory.list.response"); return { directories: ["/opt/edge/models"] }; }
    // Match the real Agent's existing 32-character operation ID contract.
    assert.match(values.operation_id, /^[a-f0-9]{32}$/);
    requests++; return { operation_id: values.operation_id, status: "accepted", boot_id: "boot-before" };
  };
  const body = { confirm: true, idempotencyKey: "reboot-id-123" };
  let ctx = context(f, body, { id: "board-1" }); await api.rebootDevice(ctx);
  assert.equal(ctx.status, 202); assert.equal(ctx.body.status, "accepted"); assert.equal(ctx.body.boot_id, undefined); assert.equal(ctx.body.idempotency_key, undefined);
  const operationId = ctx.body.id;
  assert.match(operationId, /^[a-f0-9]{32}$/);
  ctx = context(f, body, { id: "board-1" }); await api.rebootDevice(ctx); assert.equal(ctx.body.id, operationId); assert.equal(requests, 1);
  ctx = context(f, { confirm: true, idempotencyKey: "another-id-123" }, { id: "board-1" }); await api.rebootDevice(ctx); assert.equal(ctx.status, 409);
  ctx = context(f, {}, { id: "board-2", operationID: operationId }); await api.getDeviceOperation(ctx); assert.equal(ctx.status, 404);
  ctx = context(f, {}, { id: "board-1" }); await api.listDeviceDirectories(ctx); assert.equal(ctx.status, 200);
});

test("old failed UUID reboot remains queryable and is never redispatched by an idempotent replay", async t => {
  const f = await fixture(t); await board(f); f.state.online.add("board-1");
  const oldId = "c3848fef-02bf-4ab1-9f7a-378e169d50bc";
  const oldKey = "old-reboot-id-123";
  await f.service.put("operation", oldId, { id: oldId, device_id: "board-1", idempotency_key: oldKey, type: "reboot", status: "failed", error_code: "invalid_request" }, "board-1");
  let requests = 0;
  f.app.fs.agentHub.request = async (id, cmd, values) => {
    requests++; assert.match(values.operation_id, /^[a-f0-9]{32}$/);
    return { operation_id: values.operation_id, status: "accepted", boot_id: "boot-before" };
  };
  let ctx = context(f, { confirm: true, idempotencyKey: oldKey }, { id: "board-1" });
  await api.rebootDevice(ctx); assert.equal(ctx.body.id, oldId); assert.equal(ctx.body.status, "failed"); assert.equal(requests, 0);
  ctx = context(f, {}, { id: "board-1", operationID: oldId });
  await api.getDeviceOperation(ctx); assert.equal(ctx.status, 200); assert.equal(ctx.body.error_code, "invalid_request");
  ctx = context(f, { confirm: true, idempotencyKey: "new-reboot-id-123" }, { id: "board-1" });
  await api.rebootDevice(ctx); assert.equal(ctx.status, 202); assert.match(ctx.body.id, /^[a-f0-9]{32}$/); assert.equal(requests, 1);
  assert.equal((await f.service.get("operation", oldId)).status, "failed");
});

async function server(t, f) {
  const koa = new Koa(); koa.fs = f.app.fs;
  koa.use(require("koa-range"));
  require("../app/lib/service/agentDownloads")(koa);
  koa.use(bodyparser());
  koa.use(async ctx => {
    ctx.fs = f.app.fs;
    if (ctx.path === "/edgeAgent/files") await api.uploadFile(ctx);
    else { ctx.params = { id: ctx.path.split("/").pop() }; await api.downloadAgentFile(ctx); }
  });
  const instance = http.createServer(koa.callback()); instance.listen(0, "127.0.0.1"); await once(instance, "listening");
  t.after(async () => { instance.closeAllConnections?.(); await new Promise(resolve => instance.close(resolve)); });
  return `http://127.0.0.1:${instance.address().port}`;
}
function uploadBody(files) {
  const boundary = "agent-contract-boundary";
  return { boundary, body: Buffer.from(files.map(({ field = "file", filename = "model.rknn", content = "model data" }) => `--${boundary}\r\nContent-Disposition: form-data; name="${field}"; filename="${filename}"\r\nContent-Type: application/octet-stream\r\n\r\n${content}\r\n`).join("") + `--${boundary}--\r\n`) };
}

test("Qiniu HTTP upload, device-authorized redirect, duplicate-file cleanup and upload rejection", async t => {
  const { QiniuAgentStorage } = require("../app/lib/service/agentFileStorage");
  const f = await fixture(t); await board(f);
  const storage = new QiniuAgentStorage({ domain: "https://files.example.test", bucket: "test-models", accessKey: "test-ak", secretKey: "test-sk" });
  storage.uploader.putFile = (token, key, filename, extra, cb) => cb(null, { key }, { statusCode: 200 });
  const removed = [];
  storage.manager.delete = (bucket, key, cb) => { removed.push(key); cb(null, {}, { statusCode: 200 }); };
  f.service.fileStorage = storage;
  const root = await server(t, f);
  async function upload(files) {
    const data = uploadBody(files);
    return fetch(`${root}/edgeAgent/files`, { method: "POST", headers: { "content-type": `multipart/form-data; boundary=${data.boundary}` }, body: data.body });
  }
  let response = await upload([{ content: "model data" }]); assert.equal(response.status, 201);
  const file = await response.json(); assert.equal(file.storage, "qiniu");
  const url = `${root}/api/v1/agents/files/${file.id}`;
  response = await fetch(url, { redirect: "manual" }); assert.equal(response.status, 401);
  response = await fetch(url, { redirect: "manual", headers: { Authorization: "Bearer board-1-test-token" } }); assert.equal(response.status, 403);
  await f.service.createTasks({ file_id: file.id, device_ids: ["board-1"], target_path: "." });
  response = await fetch(url, { redirect: "manual", headers: { Authorization: "Bearer board-1-test-token", Range: "bytes=3-" } });
  assert.equal(response.status, 307); assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(new URL(response.headers.get("location")).origin, "https://files.example.test");
  response = await upload([{}, {}]); assert.equal(response.status, 400); assert.equal(removed.length, 1);
  assert.equal((await f.service.records("file")).length, 1);
  storage.uploader.putFile = (token, key, filename, extra, cb) => cb(new Error("network error"));
  response = await upload([{}]); assert.equal(response.status, 503);
  assert.equal((await f.service.records("file")).length, 1);
});
test("multipart upload through Koa bodyparser persists actual bytes and rejects multiple files", async t => {
  const f = await fixture(t); const root = await server(t, f);
  let data = uploadBody([{ content: "actual model bytes" }]);
  let response = await fetch(`${root}/edgeAgent/files`, { method: "POST", headers: { "content-type": `multipart/form-data; boundary=${data.boundary}` }, body: data.body });
  assert.equal(response.status, 201); const file = await response.json(); assert.equal(file.size_bytes, 18);
  assert.equal((await f.service.get("file", file.id)).original_name, "model.rknn");
  data = uploadBody([{}, {}]);
  response = await fetch(`${root}/edgeAgent/files`, { method: "POST", headers: { "content-type": `multipart/form-data; boundary=${data.boundary}` }, body: data.body });
  assert.equal(response.status, 400); assert.equal((await f.service.records("file")).length, 1);
});

test("multipart response completes when request closes before file consumption", async t => {
  const f = await fixture(t);
  const storeFile = f.service.storeFile.bind(f.service);
  f.service.storeFile = async (stream, filename) => {
    // IncomingMessage closes normally while the final file bytes are still buffered.
    stream.pause();
    await new Promise(resolve => setTimeout(resolve, 75));
    return storeFile(stream, filename);
  };
  const root = await server(t, f);
  const data = uploadBody([{ content: "x".repeat(8000) }]);
  const response = await fetch(`${root}/edgeAgent/files`, {
    method: "POST", headers: { "content-type": `multipart/form-data; boundary=${data.boundary}` },
    body: data.body, signal: AbortSignal.timeout(1500),
  });
  assert.equal(response.status, 201);
  const file = await response.json();
  assert.equal(file.size_bytes, 8000);
  assert.equal((await f.service.records("file")).length, 1);
});

test("multipart consumer rejection returns an error without waiting for unread file bytes", async t => {
  const f = await fixture(t); const root = await server(t, f);
  const data = uploadBody([{ filename: "x".repeat(256), content: "x".repeat(8000) }]);
  const response = await fetch(`${root}/edgeAgent/files`, {
    method: "POST", headers: { "content-type": `multipart/form-data; boundary=${data.boundary}` },
    body: data.body, signal: AbortSignal.timeout(1500),
  });
  assert.equal(response.status, 400);
  assert.equal((await response.json()).message, "无效文件名");
  assert.equal((await f.service.records("file")).length, 0);
});

test("aborting a partial HTTP upload removes temporary bytes and creates no file record", { timeout: 3000 }, async t => {
  const f = await fixture(t); const root = await server(t, f);
  let started, completed;
  const fileStarted = new Promise(resolve => { started = resolve; });
  const fileCompleted = new Promise(resolve => { completed = resolve; });
  const storeFile = f.service.storeFile.bind(f.service);
  f.service.storeFile = (stream, filename) => {
    started();
    const upload = storeFile(stream, filename);
    upload.then(completed, completed);
    return upload;
  };
  const data = uploadBody([{ content: "x".repeat(32000) }]);
  const request = http.request(`${root}/edgeAgent/files`, {
    method: "POST", headers: { "content-type": `multipart/form-data; boundary=${data.boundary}`, "content-length": data.body.length },
  });
  request.on("error", () => {});
  request.write(data.body.subarray(0, 8000));
  await fileStarted;
  request.destroy();
  await fileCompleted;
  assert.equal((await f.service.records("file")).length, 0);
  assert.deepEqual(await require("node:fs/promises").readdir(require("node:path").join(f.directory, "uploads")), []);
});

test("Agent download requires device token and assignment and supports resume and invalid ranges over HTTP", async t => {
  const f = await fixture(t); await board(f); await board(f, "board-2");
  const file = await f.service.storeFile(Readable.from([Buffer.from("0123456789")]), "model.rknn");
  await f.service.createTasks({ file_id: file.id, device_ids: ["board-1"], target_path: "/opt/edge/models" });
  const root = await server(t, f), url = `${root}/api/v1/agents/files/${file.id}`;
  let response = await fetch(url); assert.equal(response.status, 401);
  response = await fetch(url, { headers: { authorization: "Bearer board-2-test-token" } }); assert.equal(response.status, 403);
  response = await fetch(url, { headers: { authorization: "Bearer board-1-test-token", range: "bytes=3-6" } });
  assert.equal(response.status, 206); assert.equal(response.headers.get("content-range"), "bytes 3-6/10"); assert.equal(await response.text(), "3456");
  response = await fetch(url, { headers: { authorization: "Bearer board-1-test-token", range: "bytes=-2" } }); assert.equal(await response.text(), "89");
  response = await fetch(url, { headers: { authorization: "Bearer board-1-test-token", range: "bytes=100-" } }); assert.equal(response.status, 416); assert.equal(response.headers.get("content-range"), "bytes */10");
});
