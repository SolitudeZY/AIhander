const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const babel = require("@babel/core");
const { TerminalRecording, recordingDetail } = require("../../api/app/lib/service/terminalRecording");

// Exercise the actual action callback against the backend's detail projection.
const filename = path.resolve(__dirname, "../client/src/sections/edgeDevice/actions/edgeDevice.js");
const compiled = babel.transformSync(fs.readFileSync(filename, "utf8"), {
  filename, configFile: false, babelrc: false,
  presets: [[require.resolve("@babel/preset-env"), { targets: { node: "current" } }]],
}).code;
const exportsObject = {};
vm.runInNewContext(compiled, { exports: exportsObject, require(name) {
  if (name === "moment") return require("moment");
  if (name === "$utils") return { ApiTable: {}, EmisApiTable: { edgeSessionDetail: "/sessions/{sessionId}" }, basicAction: options => options.callback };
  if (name === "../components/common" || name === "../constants") return {};
  throw new Error(`Unexpected dependency: ${name}`);
} });
const convert = exportsObject.getEdgeSessionDetail(1)(() => {});

test("history preserves measured zero values, failed codes and start time from the detail contract", () => {
  const r = new TerminalRecording();
  for (const [id, command, exitCode, duration] of [[1, "true", 0, 0], [2, "false", 1, 250]]) {
    r.command({ state: "started", command_id: String(id), command, started_at: "2026-09-22T08:00:00Z" });
    r.command({ state: "finished", command_id: String(id), exit_code: exitCode, duration_ms: duration, ended_at: new Date(Date.parse("2026-09-22T08:00:00Z") + duration).toISOString() });
  }
  const result = convert(recordingDetail(r.document));
  assert.equal(result.commands[0].cost, 0);
  assert.equal(result.commands[0].code, 0);
  assert.equal(result.commands[0].result, "succeeded");
  assert.ok(result.commands[0].time.startsWith("2026-09-22"));
  assert.equal(result.commands[1].cost, 250);
  assert.equal(result.commands[1].code, 1);
  assert.equal(result.commands[1].result, "failed");
});

test("legacy input uses submittedAt and cannot acquire the session's exit code or duration", () => {
  const r = new TerminalRecording();
  r.feed("output", "edge@board:~$ "); r.feed("input", "ls\r", Date.parse("2026-09-22T08:00:00Z"));
  r.document.shellExitCode = 0;
  const result = convert({ ...recordingDetail(r.document), durationSeconds: 200 });
  assert.ok(result.commands[0].time.startsWith("2026-09-22"));
  assert.equal(result.commands[0].cost, "");
  assert.equal(result.commands[0].code, "");
  assert.equal(result.commands[0].result, "submitted");
});
