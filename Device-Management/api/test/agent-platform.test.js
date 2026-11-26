"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { Readable } = require("node:stream");
const { Op } = require("sequelize");
const { AgentPlatform, hash, quality } = require("../app/lib/service/agentPlatform");

const { fixture } = require("./agent-platform-fixture.cjs");

const registration = (id = "board-1") => ({ device_id: id, name: "kickpi", os: "linux", arch: "arm64", sku: "RK3576", runtime_version: "2.0", model_version: "2.0", address: "10.8.30.54", device_token: "migrated-board-token" });

test("heartbeat persists temperature and clears unavailable readings without affecting other metrics", async t => {
  const { service } = await fixture(t);
  await service.register(registration(), "10.8.30.54");
  for (const temperature of [53.234, 0, undefined, "invalid", null]) {
    await service.receive("board-1", { cmd: "heartbeat", values: { cpu_percent: 30.5923303265385, temperature_celsius: temperature } });
    const device = await service.device("board-1");
    assert.equal(device.temperature_celsius, Number.isFinite(temperature) ? temperature : null);
    assert.equal(device.cpu_percent, 30.5923303265385);
    assert.ok(device.last_seen_at);
  }
});

test("registration keeps a migrated token and metadata, authenticates without exposing token hash", async t => {
  const { service: s, state } = await fixture(t);
  const first = await s.register(registration(), "10.8.30.54");
  assert.equal(first.device_token, "migrated-board-token");
  const persisted = await s.get("device", first.device_id);
  assert.equal(persisted.token_hash, hash(first.device_token));
  assert.equal((await s.authenticate(first.device_token)).id, first.device_id);
  assert.equal(await s.authenticate("incorrect-token"), null);
  const view = await s.device(first.device_id);
  assert.equal(view.token_hash, undefined);
  assert.equal(view.device_token, undefined);
  const second = await s.register({ ...registration(), name: "renamed" }, "10.8.30.55");
  assert.equal(second.device_token, first.device_token);
  assert.equal((await s.device(first.device_id)).created_at, persisted.created_at);
  await assert.rejects(s.register({ ...registration(), device_token: "incorrect-token" }, "10.8.30.54"), error => error.status === 401);
  assert.equal((await s.authenticate(first.device_token)).name, "renamed");
  assert.equal(state.locks.length, 3);
  await assert.rejects(s.register({ ...registration(), device_token: "" }, "10.8.30.54"), error => error.status === 401);
  await assert.rejects(s.register({ ...registration(), token: "different-token" }, "10.8.30.54"), error => error.status === 400);
  assert.equal((await s.authenticate(first.device_token)).id, first.device_id);
});

test("streamed uploads persist checksum and safe name, remove empty and failed writes", async t => {
  const { service: s, state, directory } = await fixture(t);
  const contents = Buffer.from("model bytes");
  const file = await s.storeFile(Readable.from([contents.subarray(0, 3), contents.subarray(3)]), "C:\\incoming\\model.rknn");
  assert.equal(file.original_name, "model.rknn");
  assert.equal(file.sha256, hash(contents));
  assert.equal(file.size_bytes, contents.length);
  assert.deepEqual(await fs.readFile(path.join(directory, "uploads", file.storage_name)), contents);
  assert.equal((await s.get("file", file.id)).sha256, file.sha256);
  await assert.rejects(s.storeFile(Readable.from([]), "empty.rknn"), error => error.status === 400);
  state.failKind = "file";
  await assert.rejects(s.storeFile(Readable.from([Buffer.from("orphan")]), "orphan.rknn"), /database failure/);
  state.failKind = null;
  await assert.rejects(s.storeFile(Readable.from([Buffer.allocUnsafe(512 * 1024 * 1024 + 1)]), "huge.rknn"), error => error.status === 413);
  assert.deepEqual(await fs.readdir(path.join(directory, "uploads")), [file.storage_name]);
});

test("alarm acknowledgement follows durable save, retries deduplicate, save failure produces no ack", async t => {
  const { service: s, state, directory } = await fixture(t);
  await s.register(registration(), "10.8.30.54");
  const alarm = { rowId: 1, channelId: "camera-1", detectionType: "landslide", confidence: 0.95, alarmTime: "2026-10-10T10:00:00+08:00", modelVersion: "", imageMimeType: "image/png", image: Buffer.from("evidence").toString("base64") };
  await s.receive("board-1", { cmd: "alarmReport", values: { alarms: [alarm] } });
  const stored = await s.get("alarm", "board-1:1");
  assert.equal(stored.model_version, "");
  assert.equal(stored.upload_status, "uploaded");
  assert.equal(stored.alarm_time, "2026-10-10T02:00:00.000Z");
  assert.equal(await fs.readFile(path.join(directory, "alarms", stored.image), "utf8"), "evidence");
  assert.deepEqual(state.sent[0], { id: "board-1", cmd: "alarmReportResult", values: { operate: true, rowIds: [1] } });
  await s.receive("board-1", { cmd: "alarmReport", values: { alarms: [alarm] } });
  assert.equal((await s.records("alarm")).length, 1);
  state.failKind = "alarm";
  const count = state.sent.length;
  await assert.rejects(s.receive("board-1", { cmd: "alarmReport", values: { alarms: [{ ...alarm, rowId: 2 }] } }), /database failure/);
  assert.equal(state.sent.length, count);
  assert.equal(await s.get("alarm", "board-1:2"), null);
});

test("tasks retain device ownership and terminal status; reconnect dispatch preserves recorded progress", async t => {
  const { service: s, state } = await fixture(t);
  await s.register(registration(), "10.8.30.54");
  await s.register(registration("board-2"), "10.8.30.55");
  const file = await s.storeFile(Readable.from([Buffer.from("model")]), "model.rknn");
  const deployment = await s.createTasks({ file_id: file.id, device_ids: ["board-1", "board-1"], target_path: "/opt/edge/models" });
  assert.equal(deployment.task_count, 1);
  const id = deployment.tasks[0].id;
  await s.receive("board-2", { cmd: "task.status", values: { task_id: id, status: "failed", progress: 100 } });
  assert.equal((await s.get("task", id)).status, "pending");
  await s.receive("board-1", { cmd: "task.status", values: { task_id: id, status: "downloading", progress: 42 } });
  await s.pending("board-1");
  assert.equal((await s.get("task", id)).progress, 42);
  assert.equal(state.sent[0].cmd, "task.assign");
  assert.equal(state.sent[0].values.download_url, `http://platform.test:4700/api/v1/agents/files/${file.id}`);
  await s.receive("board-1", { cmd: "task.status", values: { task_id: id, status: "succeeded", progress: 150, result_output: "ok" } });
  await s.receive("board-1", { cmd: "task.status", values: { task_id: id, status: "downloading", progress: 1 } });
  assert.equal((await s.get("task", id)).status, "succeeded");
  assert.equal((await s.get("task", id)).progress, 100);
  const sent = state.sent.length;
  await s.pending("board-1");
  assert.equal(state.sent.length, sent);
});

test("temporary send-buffer exhaustion leaves an accepted task durable for retry", async t => {
  const { service, app } = await fixture(t);
  await service.register(registration(), "10.8.30.54");
  const file = await service.storeFile(Readable.from([Buffer.from("model")]), "model.rknn");
  const deployment = await service.createTasks({ file_id: file.id, device_ids: ["board-1"], target_path: "/opt/edge/models" });
  app.fs.agentHub.send = () => { throw Object.assign(new Error("buffer full"), { code: "BUFFER_LIMIT" }); };
  assert.equal(await service.dispatch(deployment.tasks[0]), false);
  assert.equal((await service.get("task", deployment.tasks[0].id)).status, "pending");
});

test("channel exception lifecycle ignores stale and unknown observations and creates linked recovery", async t => {
  const { service: s } = await fixture(t);
  const receive = (values, timestamp) => s.receive("board-1", { cmd: "channelStatusChanged", values: { channelId: "camera-1", observedAt: timestamp, ...values } });
  await receive({ status: "offline", recoveryAction: "reconnect_channel" }, "2026-10-10T10:00:00Z");
  await receive({ status: "offline" }, "2026-10-10T10:01:00Z");
  assert.equal((await s.records("exception")).length, 1);
  await receive({ status: "running" }, "2026-10-10T10:02:00Z");
  assert.equal((await s.records("exception"))[0].data.status, "active");
  await receive({ status: "running", qualityStatus: "normal" }, "2026-10-10T09:59:00Z");
  assert.equal((await s.records("exception"))[0].data.status, "active");
  await receive({ status: "running", qualityStatus: "normal" }, "2026-10-10T10:03:00Z");
  const records = await s.records("exception");
  assert.equal(records.length, 2);
  const original = records.find(row => row.data.record_type === "exception").data;
  const recovered = records.find(row => row.data.record_type === "recovery").data;
  assert.equal(original.status, "recovered");
  assert.equal(original.action, "reconnect_channel");
  assert.equal(recovered.related_id, original.id);
  assert.equal(recovered.rebooted, false);
  await receive({ status: "offline" }, "2026-10-10T10:00:30Z");
  assert.equal((await s.records("exception")).length, 2);
});

test("picture metrics use existing Agent four-index thresholds, quality-only recovery does not claim reconnect", async t => {
  const { service: s } = await fixture(t);
  assert.equal(quality({ pictureMetrics: { black_screen: 90 } }), "black_screen");
  assert.equal(quality({ pictureMetrics: { blur: 50 } }), "normal");
  await s.receive("board-1", { cmd: "channelStatusChanged", values: { channelId: "camera-1", status: "running", observedAt: "2026-10-10T10:00:00Z", pictureMetrics: { blur: 90 } } });
  await s.receive("board-1", { cmd: "channelStatusChanged", values: { channelId: "camera-1", status: "running", observedAt: "2026-10-10T10:01:00Z", recoveryAction: "reconnect_channel", qualityStatus: "normal" } });
  const recovery = (await s.records("exception")).find(row => row.data.record_type === "recovery").data;
  assert.equal(recovery.action, "none");
});

test("failed channel persistence allows retry of the same observation", async t => {
  const { service: s, state } = await fixture(t);
  const message = { cmd: "channelStatusChanged", values: { channelId: "camera-1", status: "offline", observedAt: "2026-10-10T10:00:00Z" } };
  state.failKind = "exception";
  await assert.rejects(s.receive("board-1", message), /database failure/);
  state.failKind = null;
  await s.receive("board-1", message);
  assert.equal((await s.records("exception")).length, 1);
});

test("confirmed disable closes only channel faults and ignores superseded telemetry until enabled", async t => {
  const { service: s } = await fixture(t);
  const report = values => s.receive("board-1", { cmd: "channelStatusChanged", values: { channelId: "camera-1", observedAt: "2026-10-10T10:00:00Z", ...values } });
  await report({ status: "offline", detectionStatus: "error", revision: 1 });
  await s.observe("board-1", "", "device_offline", "device", "offline", "offline", "none", "", true, "2026-10-10T10:00:00Z");
  await s.receive("board-1", { cmd: "channelSet", values: { operate: true, channel: { channelId: "camera-1", enabled: false, revision: 2 } } });
  let faults = (await s.records("exception")).map(row => row.data);
  assert.equal(faults.filter(x => x.status === "closed").length, 2);
  assert.equal(faults.find(x => x.type === "device_offline").status, "active");
  assert.ok(faults.filter(x => x.status === "closed").every(x => x.result === "none" && x.after_self_check.includes("停用")));
  const finished = faults.find(x => x.status === "closed").ended_at;
  await report({ status: "offline", detectionStatus: "error", revision: 1, observedAt: "2099-10-10T10:01:00Z" });
  await report({ status: "stopped", detectionStatus: "stopped", revision: 2, observedAt: "2099-10-10T10:02:00Z" });
  await s.receive("board-1", { cmd: "channelSet", values: { operate: true, channel: { channelId: "camera-1", enabled: false, revision: 2 } } });
  faults = (await s.records("exception")).map(row => row.data);
  assert.equal(faults.length, 3);
  assert.equal(faults.find(x => x.status === "closed").ended_at, finished);
  await s.receive("board-1", { cmd: "channelSet", values: { operate: false, channel: { channelId: "camera-1", enabled: true, revision: 3 } } });
  assert.equal(s.channelStatuses.get("board-1:camera-1").status, "disabled");
  await s.receive("board-1", { cmd: "channelSet", values: { operate: true, channel: { channelId: "camera-1", enabled: true, revision: 3 } } });
  await report({ status: "offline", revision: 2, observedAt: "2099-10-10T10:03:00Z" });
  assert.equal((await s.records("exception")).length, 3);
  await report({ status: "offline", revision: 3, observedAt: "2099-10-10T10:04:00Z" });
  assert.equal((await s.records("exception")).length, 4);
});

test("reboot success requires a new boot identifier and an operation owned by the reporting device", async t => {
  const { service: s } = await fixture(t);
  await s.register(registration(), "10.8.30.54");
  await s.put("operation", "op-1", { id: "op-1", device_id: "board-1", status: "requested" }, "board-1");
  await s.receive("board-2", { cmd: "deviceRebootResult", values: { operation_id: "op-1", status: "accepted", boot_id: "old" } });
  assert.equal((await s.get("operation", "op-1")).status, "requested");
  await s.receive("board-1", { cmd: "deviceRebootResult", values: { operation_id: "op-1", status: "accepted" } });
  assert.equal((await s.get("operation", "op-1")).status, "requested");
  await s.receive("board-1", { cmd: "deviceRebootResult", values: { operation_id: "op-1", status: "accepted", boot_id: "old" } });
  await s.receive("board-1", { cmd: "heartbeat", values: { boot_id: "old" } });
  assert.equal((await s.get("operation", "op-1")).status, "accepted");
  await s.receive("board-1", { cmd: "heartbeat", values: { boot_id: "new" } });
  assert.equal((await s.get("operation", "op-1")).status, "succeeded");
});
