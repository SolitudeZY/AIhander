"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const { Readable } = require("node:stream");
const qiniu = require("qiniu");
const { QiniuAgentStorage } = require("../app/lib/service/agentFileStorage");
const { hash } = require("../app/lib/service/agentPlatform");
const { fixture } = require("./agent-platform-fixture.cjs");

const options = { domain: "https://files.example.test", bucket: "test-models", accessKey: "test-ak", secretKey: "test-sk" };
function storage() {
  const adapter = new QiniuAgentStorage(options);
  const objects = new Map(); const deleted = [];
  adapter.uploader.putFile = (token, key, filename, extra, cb) => {
    fs.readFile(filename).then(data => { objects.set(key, data); cb(null, { key }, { statusCode: 200 }); }, error => cb(error));
  };
  adapter.manager.delete = (bucket, key, cb) => { deleted.push(key); objects.delete(key); cb(null, {}, { statusCode: 200 }); };
  return { adapter, objects, deleted };
}

test("Qiniu upload publishes persisted key/checksum after success and removes local temporary bytes", async t => {
  const f = await fixture(t); const s = storage(); f.service.fileStorage = s.adapter;
  const data = Buffer.from("model bytes 中文");
  const file = await f.service.storeFile(Readable.from([data]), "model.rknn");
  assert.equal(file.storage, "qiniu"); assert.equal(file.sha256, hash(data));
  assert.equal(file.size_bytes, data.length); assert.equal(file.storage_name, undefined);
  assert.deepEqual(s.objects.get(file.object_key), data);
  assert.equal((await f.service.get("file", file.id)).object_key, file.object_key);
  assert.deepEqual(await fs.readdir(path.join(f.directory, "uploads")), []);
  assert.equal(JSON.stringify(file).includes("token="), false);
  const signed = new URL(await f.service.fileDownloadURL(file));
  assert.equal(signed.hostname, "files.example.test"); assert.match(signed.searchParams.get("token"), /^test-ak:/);
  assert.ok(Math.abs(Number(signed.searchParams.get("e")) - Math.floor(Date.now() / 1000) - 7200) <= 1);
  await f.service.discardFile(file);
  assert.equal(s.objects.size, 0); assert.equal((await f.service.records("file")).length, 0);
});

test("Qiniu rejection yields 503 with no successful file record; DB failure compensates remote upload", async t => {
  const f = await fixture(t); const s = storage(); f.service.fileStorage = s.adapter;
  s.adapter.uploader.putFile = (token, key, filename, extra, cb) => cb(null, { error: "rejected" }, { statusCode: 403 });
  await assert.rejects(f.service.storeFile(Readable.from(["bytes"]), "bad.rknn"), { status: 503 });
  assert.equal((await f.service.records("file")).length, 0);
  assert.deepEqual(await fs.readdir(path.join(f.directory, "uploads")), []);
  const success = storage(); f.service.fileStorage = success.adapter; f.state.failKind = "file";
  await assert.rejects(f.service.storeFile(Readable.from(["bytes"]), "failed.rknn"), /database failure/);
  assert.equal(success.objects.size, 0); assert.equal(success.deleted.length, 1);
  assert.deepEqual(await fs.readdir(path.join(f.directory, "uploads")), []);
});

test("durable tasks and reconnect dispatch generate a new Qiniu signature, never persist expiring URLs", async t => {
  const f = await fixture(t); f.service.fileStorage = storage().adapter;
  await f.service.register({ device_id: "board", name: "kickpi", os: "linux", arch: "arm64", sku: "RK3576", runtime_version: "2", model_version: "2", address: "10.8.30.54" }, "127.0.0.1");
  f.state.online.add("board");
  const file = await f.service.storeFile(Readable.from(["bytes"]), "model.rknn");
  const task = (await f.service.createTasks({ file_id: file.id, device_ids: ["board"], target_path: "." })).tasks[0];
  const before = Date.now(); t.mock.method(Date, "now", () => before);
  await f.service.dispatch(task); const first = f.state.sent.at(-1).values.download_url;
  t.mock.method(Date, "now", () => before + 3600000);
  await f.service.pending("board"); const next = f.state.sent.at(-1).values.download_url;
  assert.notEqual(first, next);
  assert.equal(new URL(next).origin, options.domain);
  assert.equal((await f.service.get("task", task.id)).download_url, undefined);
});

test("Qiniu configuration rejects missing secrets and different buckets", () => {
  assert.throws(() => new QiniuAgentStorage({ ...options, secretKey: "" }), /secretKey/);
  assert.throws(() => new QiniuAgentStorage({ ...options, downloadTTL: 10 }), /有效期/);
  const s = new QiniuAgentStorage(options);
  assert.throws(() => s.downloadURL({ bucket: "other", object_key: "x" }), /不一致/);
  // The actual SDK signs the same URL: no real Qiniu requests are made.
  const manager = new qiniu.rs.BucketManager(new qiniu.auth.digest.Mac(options.accessKey, options.secretKey));
  const url = s.downloadURL({ bucket: options.bucket, object_key: "edge-agent/files/test" });
  assert.equal(url, manager.privateDownloadUrl(options.domain, "edge-agent/files/test", new URL(url).searchParams.get("e")));
});
