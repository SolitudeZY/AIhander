"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { TerminalRecording, RecordingWriter, recordingDetail, MAX_BYTES } = require("../app/lib/service/terminalRecording");

function prompt(recorder) { recorder.feed("output", "edgeops@board:~$ "); }
const turn = () => new Promise(resolve => setImmediate(resolve));

function startCommand(r, id, command, at = "2026-09-22T08:00:00.000Z") {
  r.command({ state: "started", command_id: String(id), command, started_at: at });
}
function finishCommand(r, id, code, duration = 250) {
  r.command({ state: "finished", command_id: String(id), ended_at: new Date(Date.parse("2026-09-22T08:00:00.000Z") + duration).toISOString(), exit_code: code, duration_ms: duration });
}

test("execution results persist real per-command times and codes without duplicating submitted input", () => {
  const r = new TerminalRecording();
  prompt(r); r.feed("input", "ls\r");
  startCommand(r, 1, "ls"); finishCommand(r, 1, 0, 0);
  r.feed("output", "\r\nedgeops@board:~$ "); r.feed("input", "false\r");
  startCommand(r, 2, "false"); finishCommand(r, 2, 1);
  r.document.shellExitCode = 7;
  r.end("cloud_closed");
  const rows = recordingDetail(r.document).commands;
  assert.equal(rows.length, 2);
  assert.deepEqual(rows.map(c => [c.command, c.status, c.durationMs, c.exitCode]), [["ls", "succeeded", 0, 0], ["false", "failed", 250, 1]]);
  assert.equal(rows[0].startedAt, "2026-09-22T08:00:00.000Z");
  assert.equal(rows[1].endedAt, "2026-09-22T08:00:00.250Z");
});

test("unmatched, repeated, malformed and interrupted results never fabricate a successful command", () => {
  const r = new TerminalRecording();
  startCommand(r, 1, "sleep 10");
  finishCommand(r, 2, 0);
  finishCommand(r, 1, 999);
  finishCommand(r, 1, 0, -1);
  assert.equal(recordingDetail(r.document).commands[0].status, "running");
  r.end("browser_error");
  const row = recordingDetail(r.document).commands[0];
  assert.equal(row.status, "interrupted"); assert.equal(row.exitCode, null); assert.equal(row.durationMs, null);
  // Startup reconciliation changes recording.state for sessions lost on restart.
  r.document.events[0].status = "running";
  assert.equal(recordingDetail(r.document).commands[0].status, "interrupted");
  const other = new TerminalRecording();
  startCommand(other, 1, "false"); finishCommand(other, 1, 1);
  startCommand(other, 1, "true"); finishCommand(other, 1, 0);
  assert.equal(recordingDetail(other.document).commands.length, 1);
  assert.equal(recordingDetail(other.document).commands[0].exitCode, 1);
});

// 本文件中的 SuperSecret / PRIVATE KEY 片段均为合成测试输入，不包含真实密钥。
test("command metadata is redacted and bounded just like input, including multiline secrets", () => {
  for (const command of ["curl --password SuperSecret", "token=SuperSecret", "echo ok\npassword=SuperSecret", "-----BEGIN PRIVATE KEY-----\nSuperSecret", "x".repeat(9000)]) {
    const r = new TerminalRecording();
    startCommand(r, 1, command); finishCommand(r, 1, 1);
    const text = JSON.stringify(r.document);
    assert.ok(!text.includes("SuperSecret")); assert.ok(text.length < 2000);
    assert.equal(recordingDetail(r.document).commands[0].redacted, true);
  }
  const r = new TerminalRecording();
  prompt(r); r.feed("input", "\x1b[A\r");
  startCommand(r, 1, "echo hidden-history"); finishCommand(r, 1, 0);
  assert.ok(!JSON.stringify(r.document).includes("hidden-history"));
});

test("normal submitted input and Unicode output survive; no fabricated command result", () => {
  const r = new TerminalRecording();
  prompt(r);
  for (const ch of "uname -a\r") r.feed("input", ch);
  r.feed("output", "uname -a\r\nLinux 中文🙂\r\nedgeops@board:~$ ");
  r.document.shellExitCode = 7;
  r.end("cloud_closed");
  const detail = recordingDetail(r.document);
  assert.equal(detail.commands[0].command, "uname -a");
  assert.equal(detail.commands[0].status, "submitted");
  assert.equal(detail.commands[0].durationMs, null);
  assert.equal(detail.commands[0].exitCode, null);
  assert.equal(detail.recording.shellExitCode, 7);
  assert.ok(detail.recording.events.some(e => e.text.includes("Linux 中文🙂")));
  assert.equal(detail.recordingSummary.state, "complete");
});

test("credential fields, headers, commands and URLs are redacted at every frame split", () => {
  const samples = [
    'curl --password SuperSecret', 'TOKEN=SuperSecret', '{"refresh_token": "SuperSecret"}',
    'Authorization: Bearer SuperSecret', 'Proxy-Authorization: Basic SuperSecret', 'Cookie: x=SuperSecret',
    'Set-Cookie: id=SuperSecret', 'rtsp://tester:SuperSecret@192.168.1.10/live0',
    'https://example.test/?api_key=SuperSecret', 'sshpass -p SuperSecret ssh board',
    'chpasswd SuperSecret', 'client-secret: SuperSecret', 'pass\x1b[31mword=SuperSecret',
  ];
  for (const text of samples) {
    for (let split = 1; split < text.length; split++) {
      for (const direction of ["input", "output"]) {
        const r = new TerminalRecording();
        prompt(r);
        r.feed(direction, text.slice(0, split));
        r.feed(direction, text.slice(split) + "\n");
        r.end("browser_closed");
        assert.ok(!JSON.stringify(r.document).includes("SuperSecret"), `${direction} split ${split}: ${text}`);
      }
    }
  }
});

test("multiline JSON secret values and PEM fragments never persist raw material", () => {
  const r = new TerminalRecording();
  for (const ch of '{\n"password":\n\n"SuperSecret"\n}\n\n-----BEGIN OPENSSH PRIVATE KEY-----\nPrivateBody\n-----END OPENSSH PRIVATE KEY-----\n') r.feed("output", ch);
  const json = JSON.stringify(r.document);
  assert.ok(!json.includes("SuperSecret"));
  assert.ok(!json.includes("PrivateBody"));
});

test("password prompt, edits and alternate-screen input hide both input and echo", () => {
  for (const before of ["Password: ", "\x1b[?1049h", "ordinary application prompt: "]) {
    const r = new TerminalRecording();
    r.feed("output", before);
    r.feed("input", "SuperSecret\r");
    r.feed("output", "SuperSecret\r\n");
    r.end("browser_closed");
    assert.ok(!JSON.stringify(r.document).includes("SuperSecret"));
  }
  const r = new TerminalRecording();
  prompt(r);
  r.feed("input", "\x1b[A SuperSecret\r");
  r.feed("output", "SuperSecret\n");
  assert.ok(!JSON.stringify(r.document).includes("SuperSecret"));
  assert.equal(recordingDetail(r.document).commands[0].kind, "interactive");
});

test("pwd command is visible; pwd credential assignment is hidden", () => {
  const r = new TerminalRecording();
  prompt(r); r.feed("input", "pwd\r");
  r.feed("output", "\r\nedgeops@board:~$ "); r.feed("input", "pwd=SuperSecret\r");
  assert.equal(recordingDetail(r.document).commands[0].command, "pwd");
  assert.ok(!JSON.stringify(r.document).includes("SuperSecret"));
});

test("ordinary commands resume after a sensitive command returns to the shell prompt", () => {
  const r = new TerminalRecording();
  prompt(r); r.feed("input", "token=SuperSecret\r");
  r.feed("output", "\r\nedgeops@board:~$ ");
  r.feed("input", "uptime\r");
  r.feed("output", "uptime\n 12:00:00\tup 10 days\n");
  assert.equal(recordingDetail(r.document).commands[1].command, "uptime");
  assert.ok(r.document.events.some(e => e.text.includes("up 10 days")));
});

test("split OSC and malformed controls do not save terminal control payloads", () => {
  const r = new TerminalRecording();
  r.feed("output", "visible\x1b]52;c;Super");
  r.feed("output", "Secret\x1b");
  r.feed("output", "\\text\n");
  assert.equal(r.document.events[0].text, "visibletext\n");
  assert.ok(!JSON.stringify(r.document).includes("SuperSecret"));
});

test("timeout masks unresolved lines and continuation; closing never flushes raw tail", () => {
  const r = new TerminalRecording();
  r.feed("output", "-----BE", 1000);
  r.expire(7000);
  r.feed("output", "GIN PRIVATE KEY-----\nSuperSecret\n", 8000);
  r.feed("input", "UnsubmittedSecret", 8000);
  r.feed("output", "UnfinishedSecret", 8000);
  r.end("browser_closed");
  assert.ok(!JSON.stringify(r.document).includes("Secret"));
  assert.equal(recordingDetail(r.document).commands.length, 0);
});

test("event, line and serialized-byte bounds report partial without growing", () => {
  const r = new TerminalRecording(() => {}, { maxEvents: 3 });
  r.feed("output", "x\n".repeat(20000));
  assert.equal(r.document.events.length, 3);
  assert.equal(r.document.truncated, true);
  r.end("browser_closed");
  assert.equal(r.document.state, "partial");
  const big = new TerminalRecording();
  for (let i = 0; i < 1000; i++) big.feed("output", "中".repeat(2000) + "\n");
  assert.ok(Buffer.byteLength(JSON.stringify(big.document)) <= MAX_BYTES);
  assert.equal(big.document.truncated, true);
  const long = new TerminalRecording();
  long.feed("output", "x".repeat(100000));
  assert.equal(long.document.truncated, true);
  assert.equal(long.lines.output.text, "");
});

test("legacy history explicitly reports unavailable", () => {
  assert.deepEqual(recordingDetail(null), {
    recordingSummary: { available: false, state: "unavailable", inputCount: 0, eventCount: 0, lastSavedAt: null, truncated: false },
    commands: [], recording: null,
  });
});

test("writer coalesces in-flight updates and final save includes every accepted event", async () => {
  const writes = [];
  let release;
  let concurrent = 0;
  let peak = 0;
  const session = { async update(values) {
    peak = Math.max(peak, ++concurrent);
    writes.push(JSON.parse(JSON.stringify(values)));
    if (writes.length === 1) await new Promise(resolve => { release = resolve; });
    concurrent--;
  } };
  const r = new TerminalRecording();
  const w = new RecordingWriter(session, r, () => assert.fail("unexpected failure"));
  r.feed("output", "first\n");
  const initial = w.flush();
  for (let i = 0; i < 200; i++) r.feed("output", `line ${i}\n`);
  w.update({ operatorId: 9, cloudSessionId: "cloud-id" });
  const close = w.close("browser_closed", 9);
  release();
  await Promise.all([initial, close]);
  assert.equal(peak, 1);
  assert.equal(writes.length, 2);
  assert.equal(writes[1].recording.eventCount, 201);
  assert.equal(writes[1].recording.state, "complete");
  assert.equal(writes[1].operatorId, 9);
  assert.equal(writes[1].cloudSessionId, "cloud-id");
});

test("writer failure triggers disconnect once and preserves partial on recovery", async () => {
  const writes = [];
  let failures = 0;
  const r = new TerminalRecording();
  const w = new RecordingWriter({ async update(values) {
    writes.push(values);
    if (writes.length === 1) throw new Error("database failed with private SQL");
  } }, r, () => { failures++; });
  r.feed("output", "hello\n");
  await w.flush();
  await turn();
  await w.close("recording_failed", null);
  assert.equal(failures, 1);
  assert.equal(writes[1].recording.state, "partial");
  assert.equal(writes[1].endReason, "recording_failed");
});
