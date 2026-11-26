const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const babel = require("@babel/core");

function load(relative, user = null, action = options => options) {
  const filename = path.resolve(__dirname, "../client/src", relative);
  const compiled = babel.transformSync(fs.readFileSync(filename, "utf8"), {
    filename, configFile: false, babelrc: false,
    presets: [[require.resolve("@babel/preset-env"), { targets: { node: "current" } }], require.resolve("@babel/preset-react")],
  }).code;
  const exports = {};
  vm.runInNewContext(compiled, { exports, URL, URLSearchParams, sessionStorage: { getItem: () => user }, require(name) {
    if (name === "moment") return require("moment");
    if (name === "react") return {};
    if (name === "antd" || name === "@peace/utils") return { ProxyRequest: class {}, customWebUtils: class {} };
    if (name === "$utils") return { ApiTable: {}, EmisApiTable: { edgeDeviceChannels: "edgeAgent/devices/{deviceId}/video-channels", edgeExceptionAcknowledge: "edgeAgent/devices/{deviceId}/exceptions/{exceptionId}/acknowledge" }, basicAction: action };
    if (name === "../components/common") return load("sections/edgeDevice/components/common.jsx");
    if (name === "../constants") return {};
    if (name === "./edgeDevice") return load("sections/edgeDevice/actions/edgeDevice.js");
    throw new Error(`Unexpected dependency: ${name}`);
  } });
  return exports;
}

test("authenticated upload and event image both target the platform Agent API", () => {
  const common = load("sections/edgeDevice/components/common.jsx", JSON.stringify({ token: "platform token/&" }));
  assert.equal(common.edgeFileUploadUrl(), "/_api/edgeAgent/files?token=platform%20token%2F%26");
  assert.equal(common.eventImageSrc({ deviceId: "board-1", rowId: 3 }), "/_api/edgeAgent/events/board-1/3/image?token=platform%20token%2F%26");
  assert.equal(load("sections/edgeDevice/components/common.jsx", "malformed").edgeFileUploadUrl(), "/_api/edgeAgent/files");
});

test("remote file URLs use the direct device endpoint and encode authenticated download names", () => {
  const common = load("sections/edgeDevice/components/common.jsx", JSON.stringify({ token: "platform token/&" }));
  assert.equal(common.remoteFileUrl("board-1"), "/_api/edgeAgent/devices/board-1/remote-files?token=platform+token%2F%26");
  const url = new URL(common.remoteFileUrl("board:1", "日志 &.txt"), "http://test");
  assert.equal(url.pathname, "/_api/edgeAgent/devices/board%3A1/remote-files/download");
  assert.equal(url.searchParams.get("name"), "日志 &.txt");
  assert.equal(url.searchParams.get("token"), "platform token/&");
});

test("model selector fetches every page within the API limit, including models after the first 100", async () => {
  const calls = [];
  const models = Array.from({ length: 205 }, (_, id) => ({ id: id + 1, modelName: `model-${id + 1}` }));
  const actions = load("sections/edgeDevice/actions/edgeDevice.js", null, options => {
    calls.push(options.query);
    const { page, pageSize } = options.query;
    assert.ok(pageSize <= 100);
    return Promise.resolve({ success: true, payload: { data: { count: models.length, rows: models.slice((page - 1) * pageSize, page * pageSize) } } });
  });
  const result = await actions.queryVisionModelOptions()(() => {});
  assert.equal(result.payload.data.rows.length, 205);
  assert.equal(result.payload.data.rows[204].id, 205);
  assert.deepEqual(calls.map(call => call.page), [1, 2, 3]);
});

test("model selector stops on page failure and metadata probing stays synchronous", async () => {
  let calls = 0;
  const failed = { success: false, payload: { message: "test-only" } };
  const actions = load("sections/edgeDevice/actions/edgeDevice.js", null, () => { calls++; return Promise.resolve(failed); });
  const metadata = actions.queryVisionModelOptions()();
  assert.equal(typeof metadata.then, "undefined"); assert.equal(calls, 0);
  assert.equal(await actions.queryVisionModelOptions()(() => {}), failed);
  assert.equal(calls, 1);
});

test("HTTPS terminal uses the device site and local HTTP development keeps its API endpoint", () => {
  const { terminalServerRoot } = load("sections/edgeDevice/hooks/useTerminalSocket.js");
  const site = { protocol: "https:", origin: "https://dvcplttest.anxinyun.cn" };
  assert.equal(terminalServerRoot("https://pomsapitest.anxinyun.cn", site), site.origin);
  assert.equal(terminalServerRoot("", site), site.origin);
  assert.equal(terminalServerRoot("http://localhost:4700/", { protocol: "http:", origin: "http://localhost:5700" }), "http://localhost:4700");
});

test("terminal selects a configured device API independently from the HTTPS site and POMS root", () => {
  const { terminalServerRoot } = load("sections/edgeDevice/hooks/useTerminalSocket.js");
  const page = { protocol: "https:", origin: "https://dvcplttest.anxinyun.cn" };
  assert.equal(terminalServerRoot("https://pomsapitest.anxinyun.cn", page, "https://dvcpltapitest.anxinyun.cn/"), "https://dvcpltapitest.anxinyun.cn");
  assert.equal(terminalServerRoot("http://localhost:4700", { protocol: "http:", origin: "http://localhost:5700" }, "http://10.8.30.29:4700"), "http://10.8.30.29:4700");
  assert.equal(terminalServerRoot("https://pomsapitest.anxinyun.cn", page, " "), page.origin);
  for (const invalid of ["http://device.example.test", "ws://device.example.test", "https://user:secret@device.example.test", "https://device.example.test?token=secret", "https://device.example.test#fragment", "not-a-url"]) {
    assert.equal(terminalServerRoot("https://pomsapitest.anxinyun.cn", page, invalid), "");
  }
});

test("merged exception projection retains raw recovery data and formatted UI fields", () => {
  const common = load("sections/edgeDevice/components/common.jsx");
  const item = common.toException({ id: "exception-1", type: "channel_abnormal", record_type: "recovery", status: "recovered", reason: "stream reconnected", started_at: "2026-10-10T10:00:00+08:00", duration_seconds: 30, action: "reconnect_channel", rebooted: false, related_id: "exception-0" });
  assert.equal(item.typeLabel, "通道异常");
  assert.equal(item.recordTypeLabel, "恢复");
  assert.equal(item.recordType, "recovery");
  assert.equal(item.durationLabel, "30 秒");
  assert.equal(item.relatedId, "exception-0");
  assert.equal(item.rebooted, false);
});

test("edge endpoint registry uses only Agent routes and retains platform action keys", () => {
  const { EmisApiTable } = load("utils/webapi.js");
  const edgeEntries = Object.entries(EmisApiTable).filter(([key]) => key.startsWith("edge"));
  assert.ok(edgeEntries.length >= 20);
  for (const [key, route] of edgeEntries) assert.ok(route.startsWith("edgeAgent/"), key);
  assert.equal(EmisApiTable.edgeAgentFileUpload, "edgeAgent/files");
  assert.equal(EmisApiTable.edgeUpgradeTasks, "edgeAgent/deployments");
});

test("channel enable toggle retains account, transport and revision without submitting a masked password", () => {
  const actions = load("sections/edgeDevice/actions/edgeDevice.js");
  const result = actions.toggleEdgeChannel("board-1", { id: "camera-1", name: "camera", rtsp: "rtsp://camera.test/live", modelName: "model.rknn", username: "operator", transport: "udp", revision: 3, passwordConfigured: true }, false)(() => {});
  assert.equal(result.data.username, "operator");
  assert.equal(result.data.transport, "udp");
  assert.equal(result.data.expected_revision, 3);
  assert.equal(result.data.enabled, false);
  assert.equal(result.data.password, undefined);
});

test("legacy uppercase transport is normalized across list, toggle and edit requests", () => {
  const actions = load("sections/edgeDevice/actions/edgeDevice.js");
  const channel = { id: "camera-1", name: "channl", rtsp_url: "rtsp://camera.test/live", modelName: "model.rknn", username: "admin", transport: " TCP ", revision: 1 };
  assert.equal(actions.toggleEdgeChannel("board-1", channel, false)(() => {}).data.transport, "tcp");
  assert.equal(actions.saveEdgeChannel("board-1", channel)(() => {}).data.transport, "tcp");
  const list = actions.getEdgeDeviceChannels("board-1")(() => {});
  assert.equal(list.callback([{ ...channel, transport: "UDP" }])[0].transport, "udp");
});

test("disabled fault is displayed as closed without claiming a successful recovery", () => {
  const common = load("sections/edgeDevice/components/common.jsx");
  const fault = common.toException({ status: "closed", result: "none", record_type: "exception" });
  assert.equal(fault.statusLabel, "已关闭");
  assert.equal(fault.resultLabel, "暂无结果");
  assert.equal(fault.recordTypeLabel, "异常");
});

test("confirmation operator displays account and name with a fallback for deleted users", () => {
  const common = load("sections/edgeDevice/components/common.jsx");
  assert.equal(common.toException({ acknowledged_by: 1, acknowledged_by_username: "SuperAdmin", acknowledged_by_name: "超级管理员" }).acknowledgedByLabel, "SuperAdmin（超级管理员）");
  assert.equal(common.toException({ acknowledged_by: 2, acknowledged_by_username: "tester", acknowledged_by_name: "tester" }).acknowledgedByLabel, "tester");
  assert.equal(common.toException({ acknowledged_by: 99 }).acknowledgedByLabel, "用户 99");
  assert.equal(common.toException({}).acknowledgedByLabel, "—");
});

test("exception acknowledgement uses the device-scoped endpoint and renders confirmed status", () => {
  const actions = load("sections/edgeDevice/actions/index.js");
  const request = actions.acknowledgeEdgeException("board-1", "exception-1")(() => {});
  assert.equal(request.type, "post");
  assert.equal(request.url, "edgeAgent/devices/board-1/exceptions/exception-1/acknowledge");
  const common = load("sections/edgeDevice/components/common.jsx");
  const item = common.toException({ status: "active", acknowledged: true, result: "none" });
  assert.equal(item.statusLabel, "已确认"); assert.equal(item.status, "active"); assert.equal(item.resultLabel, "暂无结果");
});
