"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const WebSocket = require("ws");
const setup = require("../app/lib/service/agentGateway");
async function until(predicate, timeout = 3000) {
  const start = Date.now();
  while (!predicate()) {
    if (Date.now() - start > timeout) throw new Error("condition timed out");
    await new Promise(resolve => setTimeout(resolve, 5));
  }
}
async function fixture(t, hooks = {}) {
  const events = [];
  const server = http.createServer();
  const clients = [];
  const platform = {
    ready: Promise.resolve(),
    authenticate: async token => token === "valid-a" ? { id: "a" } : token === "valid-b" ? { id: "b" } : null,
    connected: async (id, value) => events.push(["connected", id, value]),
    pending: async id => events.push(["pending", id]),
    receive: async (id, message) => events.push(["received", id, message.cmd]),
    ...hooks,
  };
  const app = { server, fs: { agentPlatform: platform, api: { logAttr: {} }, logger: { error: () => events.push(["storage_error"]) } } };
  const hub = setup(app);
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const root = "ws://127.0.0.1:" + server.address().port;
  async function connect(token = "valid-a") {
    const socket = new WebSocket(root + "/api/v1/agents/connect", { headers: { Authorization: "Bearer " + token } });
    clients.push(socket);
    socket.on("error", () => {});
    const messages = [];
    socket.on("message", raw => messages.push(JSON.parse(String(raw))));
    await new Promise((resolve, reject) => { socket.once("open", resolve); socket.once("error", reject); });
    return { socket, messages, send: (cmd, values = {}) => socket.send(JSON.stringify({ _from: "agent", cmd, time: new Date().toISOString(), values })) };
  }
  t.after(async () => {
    clients.forEach(socket => socket.terminate());
    for (const session of hub.sessions.values()) session.socket.terminate();
    await new Promise(resolve => server.close(resolve));
  });
  return { hub, app, connect, events, clients, root };
}
test("device Bearer auth rejects invalid tokens before upgrading", async t => {
  const f = await fixture(t);
  await assert.rejects(f.connect("invalid"), /401/);
  assert.equal(f.hub.sessions.size, 0);
  assert.deepEqual(f.events, []);
});

test("unresponsive Agent is removed and pending control requests fail on liveness timeout", async t => {
  const f = await fixture(t); await f.connect();
  await until(() => f.events.some(e => e[0] === "pending"));
  const pending = f.hub.request("a", "channelList", {}, "channelListResult");
  const rejected = assert.rejects(pending, /heartbeat timeout/);
  f.hub.sessions.get("a").alive = false;
  f.hub.probe();
  await rejected;
  assert.equal(f.hub.isConnected("a"), false);
  await until(() => f.events.some(e => e[0] === "connected" && e[2] === false));
});
test("request routes canonical source and matches both device and command before resolving", async t => {
  const f = await fixture(t);
  const a = await f.connect();
  const b = await f.connect("valid-b");
  const response = f.hub.request("a", "channelList", {}, "channelList");
  await until(() => a.messages.length === 1);
  const wire = a.messages[0];
  assert.deepEqual(Object.keys(wire).sort(), ["_from", "cmd", "time", "values"]);
  assert.equal(wire._from, "cloud");
  assert.equal(wire.cmd, "channelList");
  let resolved = false;
  response.then(() => { resolved = true; });
  b.send("channelList", { requestId: wire.values.requestId, channels: ["wrong-device"] });
  a.send("channelTest", { requestId: wire.values.requestId });
  await until(() => f.events.filter(event => event[0] === "received").length === 2);
  assert.equal(resolved, false);
  a.send("channelList", { requestId: wire.values.requestId, channels: ["correct"] });
  const values = await response;
  assert.deepEqual(values.channels, ["correct"]);
  assert.equal(f.hub.requests.size, 0);
});
test("timeouts and disconnects reject requests and release correlation state", async t => {
  const f = await fixture(t);
  const a = await f.connect();
  await assert.rejects(f.hub.request("a", "channelList", {}, "channelList", 20), error => error.code === "AGENT_TIMEOUT");
  assert.equal(f.hub.requests.size, 0);
  const response = f.hub.request("a", "channelList", {});
  const rejection = assert.rejects(response, error => error.code === "DEVICE_OFFLINE");
  a.socket.close();
  await rejection;
  assert.equal(f.hub.requests.size, 0);
  await assert.rejects(f.hub.request("offline", "channelList"), error => error.code === "DEVICE_OFFLINE");
});
test("reconnect ignores stale closes and persists disconnect before new connection", async t => {
  const f = await fixture(t);
  const first = await f.connect();
  await until(() => f.events.some(event => event[0] === "pending"));
  const oldSession = f.hub.sessions.get("a");
  const second = await f.connect();
  await until(() => f.events.filter(event => event[0] === "pending").length === 2);
  f.hub.detach("a", oldSession, "late close");
  assert.equal(f.hub.isConnected("a"), true);
  assert.equal(f.hub.sessions.get("a").socket.readyState, WebSocket.OPEN);
  const lifecycle = f.events.filter(event => event[0] === "connected").map(event => event[2]);
  assert.deepEqual(lifecycle, [true, false, true]);
  assert.equal(second.socket.readyState, WebSocket.OPEN);
  await until(() => first.socket.readyState === WebSocket.CLOSED);
});
test("inbound telemetry persists in order and offline follows pending writes", async t => {
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  const order = [];
  const f = await fixture(t, {
    connected: async (id, online) => order.push(online ? "online" : "offline"),
    receive: async (id, message) => { if (message.cmd === "first") await gate; order.push(message.cmd); },
  });
  const a = await f.connect();
  a.send("first"); a.send("second");
  await until(() => f.hub.sessions.get("a").count === 2);
  a.socket.close();
  await until(() => !f.hub.isConnected("a"));
  assert.deepEqual(order, ["online"]);
  release();
  await until(() => order.length === 4);
  assert.deepEqual(order, ["online", "first", "second", "offline"]);
});
test("malformed and oversized control envelopes close the device", async t => {
  const f = await fixture(t);
  const first = await f.connect();
  first.socket.send(JSON.stringify({ _from: "setUp", cmd: "ping", values: {} }));
  await until(() => first.socket.readyState === WebSocket.CLOSED);
  const second = await f.connect();
  second.send("ping", { data: "x".repeat(1024 * 1024) });
  await until(() => second.socket.readyState === WebSocket.CLOSED);
  assert.equal(f.hub.isConnected("a"), false);
});
test("ingest queue is bounded while persistence is unavailable", async t => {
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  const f = await fixture(t, { receive: async () => gate });
  const a = await f.connect();
  for (let i = 0; i < 129; i++) a.send("ping");
  await until(() => a.socket.readyState === WebSocket.CLOSED);
  release();
  await until(() => f.hub.lifecycle.size === 0);
});

