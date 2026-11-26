"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const http = require("node:http");
const { AgentPlatform } = require("../app/lib/service/agentPlatform");
const setupTerminal = require("../app/lib/service/terminalGateway");

async function directory(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "agent-startup-diagnostics-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  return root;
}
function app(models, logs) {
  return { server: http.createServer(), fs: { dc: { models }, api: { logAttr: {} }, logger: { error: message => logs.push(message) } } };
}
test("Agent startup retains DB failure and logs its code without private SQL or credentials", async t => {
  const root = await directory(t), logs = [];
  const failure = Object.assign(new Error("postgres://private:SuperSecret@db/tenant; private SQL"), { original: { code: "42501" } });
  const platform = new AgentPlatform(app({ EdgeAgentRecord: { findOne: async () => { throw failure; } } }, logs), { dataDir: root });
  await assert.rejects(platform.ready, error => error === failure);
  assert.match(logs.join("\n"), /stage=database.*code=42501/);
  assert.doesNotMatch(logs.join("\n"), /SuperSecret|private SQL|postgres:/);
});
test("Agent startup distinguishes an unwritable directory from a database query failure", async t => {
  const root = await directory(t), logs = [];
  await fs.writeFile(path.join(root, "uploads"), "blocks directory creation");
  let queried = false;
  const platform = new AgentPlatform(app({ EdgeAgentRecord: { findOne: async () => { queried = true; } } }, logs), { dataDir: root });
  await assert.rejects(platform.ready);
  assert.equal(queried, false);
  assert.match(logs.join("\n"), /stage=uploads-directory.*code=(EEXIST|ENOTDIR)/);
});
test("Agent startup reports a missing ORM model separately from a missing SQL table", async t => {
  const logs = [];
  const platform = new AgentPlatform(app({}, logs), { dataDir: await directory(t) });
  await assert.rejects(platform.ready, { code: "MODEL_NOT_LOADED" });
  assert.match(logs.join("\n"), /stage=database.*code=MODEL_NOT_LOADED/);
});
test("Terminal startup reports SQLSTATE without leaking SQL or connection credentials", async () => {
  const logs = [];
  setupTerminal(app({ EdgeRemoteSession: { update: async () => {
    throw Object.assign(new Error("private SQL with SuperSecret"), { parent: { code: "42703" } });
  } } }, logs));
  await new Promise(resolve => setImmediate(resolve));
  assert.match(logs.join("\n"), /stage=session-reconcile.*code=42703/);
  assert.doesNotMatch(logs.join("\n"), /private SQL|SuperSecret/);
});
