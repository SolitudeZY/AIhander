"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const { once } = require("node:events");
const Koa = require("koa");
const firmware = require("../app/lib/controllers/firmwareUpgrade");

test("firmware read routes return configuration guidance when legacy upstream is absent", async t => {
  const logs = [];
  const app = new Koa(); app.fs = {};
  app.use(async ctx => {
    ctx.fs = { logger: { error: value => logs.push(value) } };
    const handlers = { "/firmware": firmware.getFirmwares, "/firmware/deviceMetaNameDict": firmware.getdeviceMetaNameDict, "/firmware/versionDict": firmware.getVersionDict };
    await handlers[ctx.path](ctx);
  });
  const server = http.createServer(app.callback()); server.listen(0, "127.0.0.1"); await once(server, "listening");
  t.after(async () => { server.closeAllConnections?.(); await new Promise(resolve => server.close(resolve)); });
  for (const route of ["/firmware", "/firmware/deviceMetaNameDict", "/firmware/versionDict"]) {
    const response = await fetch(`http://127.0.0.1:${server.address().port}${route}`);
    assert.equal(response.status, 503);
    assert.match((await response.json()).message, /API_CRAW_URL/);
  }
  assert.equal(logs.some(value => value.includes("TypeError")), false);
});

test("configured firmware reads preserve legacy results and use upstream token instead of platform token", async () => {
  const calls = [];
  const ctx = { query: { token: "platform-only", tokenup: "upstream-only", page: 2 }, app: { fs: { craw: { get: async (path, options) => {
    calls.push({ path, options });
    return JSON.stringify(path.endsWith("/list") && path === "firmwareupgrade/list" ? { total: 1, data: [{ filename: "firmware.bin", version: "2.0", device_meta_id: 12 }] } : { data: ["2.0"] });
  } } } }, fs: { logger: { error() {} } } };
  await firmware.getFirmwares(ctx);
  assert.equal(ctx.status, 200); assert.equal(ctx.body.total, 1);
  assert.equal(ctx.body.data[0].firmwareName, "firmware.bin");
  assert.equal(calls[0].options.query.token, "upstream-only");
  await firmware.getVersionDict(ctx);
  assert.equal(ctx.status, 200); assert.equal(ctx.body[0].value, "2.0");
  assert.equal(calls[1].options.query.token, "upstream-only");
});

test("firmware capabilities reflect initialized services without querying them", async () => {
  for (const [firmwareAvailable, deviceTypesAvailable] of [[false, false], [true, false], [true, true]]) {
    const unavailableQuery = () => { throw new Error("capabilities must not query services"); };
    const ctx = { app: { fs: {
      ...(firmwareAvailable ? { craw: { get: unavailableQuery } } : {}),
      ...(deviceTypesAvailable ? { clickHouse: { iot: { query: unavailableQuery } } } : {}),
    } } };
    await firmware.getFirmwareCapabilities(ctx);
    assert.equal(ctx.status, 200);
    assert.deepEqual(ctx.body, { firmware: firmwareAvailable, deviceTypes: deviceTypesAvailable });
  }
});

test("missing ClickHouse returns 503 before device-type database lookup", async () => {
  const ctx = { app: { fs: {} }, fs: { dc: { models: { DeviceModel: { findAll: async () => { throw new Error("must not query"); } } } }, logger: { error() {} } } };
  await firmware.getDeviceType(ctx);
  assert.equal(ctx.status, 503);
  assert.match(ctx.body.message, /ClickHouse/);
});
