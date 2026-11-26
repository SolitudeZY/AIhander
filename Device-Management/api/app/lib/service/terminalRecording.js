"use strict";

// Only this redacted, bounded document is persisted. Never log raw frames or ORM errors.
const MAX_BYTES = 1024 * 1024;
const MAX_EVENTS = 5000;
const MAX_LINE_BYTES = 8 * 1024;
const UNRESOLVED_MS = 5000;
const HIDDEN = "[输入内容已隐藏]";
const INTERACTIVE = "[交互输入未解析]";
const OUTPUT_HIDDEN = "[终端片段已隐藏]";
const SECRET = /(?:\b(?:password|passwd|pwd|(?:access[_-]?|refresh[_-]?)?token|secret|api[_-]?key|client[_-]?secret)\b["']?\s*(?:[:=]|\s+\S)|\b(?:authorization|proxy-authorization|cookie|set-cookie)\s*:|\b(?:passwd|chpasswd|sshpass)\b(?!\s*=)|[a-z][a-z0-9+.-]*:\/\/[^\s/]*@)/i;
const PASSWORD_PROMPT = /(?:password|passphrase|密码|口令)[^\r\n]*[:：>]\s*$/i;
const SHELL_PROMPT = /(?:^|\n)[^\r\n]{0,200}[$#] $/;
const PRIVATE_BEGIN = /-----BEGIN [A-Z ]*PRIVATE KEY-----/;
const PRIVATE_END = /-----END [A-Z ]*PRIVATE KEY-----/;
const ABNORMAL_REASONS = ["browser_error", "cloud_error", "recording_failed", "gateway_restart", "gateway_shutdown", "buffer_limit"];

function emptyRecording() {
  return { version: 1, format: "text", state: "recording", lastSavedAt: new Date().toISOString(), truncated: false, shellExitCode: null, inputCount: 0, eventCount: 0, events: [] };
}

function recordingSummary(recording) {
  return {
    available: !!recording,
    state: recording ? recording.state : "unavailable",
    inputCount: recording ? recording.inputCount || 0 : 0,
    eventCount: recording ? recording.eventCount || 0 : 0,
    lastSavedAt: recording ? recording.lastSavedAt || null : null,
    truncated: !!(recording && recording.truncated),
  };
}

function recordingDetail(recording) {
  return {
    recordingSummary: recordingSummary(recording),
    commands: recording ? recording.events.filter(e => e.direction === "command" || (e.direction === "input" && !e.commandId)).map((e, i) => ({
      id: i + 1, submittedAt: e.time, command: e.text, kind: e.kind || "input",
      commandId: e.commandId || null, startedAt: e.startedAt || null, endedAt: e.endedAt || null,
      status: e.status === "running" && recording.state !== "recording" ? "interrupted" : e.status || "submitted",
      durationMs: e.durationMs == null ? null : e.durationMs,
      exitCode: e.exitCode == null ? null : e.exitCode,
      redacted: e.redacted, eventSeq: e.seq,
    })) : [],
    recording: recording ? { version: recording.version, format: recording.format, shellExitCode: recording.shellExitCode, events: recording.events } : null,
  };
}

function lineState() {
  return { text: "", bytes: 0, since: 0, discard: false, uncertain: false, escape: "", privateKey: false, secretBlock: false, cr: false };
}

class TerminalRecording {
  constructor(onChange = () => { }, limits = {}) {
    this.document = emptyRecording();
    this.onChange = onChange;
    this.maxBytes = limits.maxBytes || MAX_BYTES;
    this.maxEvents = limits.maxEvents || MAX_EVENTS;
    this.eventBytes = 0;
    this.lines = { input: lineState(), output: lineState() };
    // A prompt is only a heuristic for input display, never proof of execution.
    this.shellReady = false;
    this.hideInput = false;
    this.hideOutput = false;
    this.alternateScreen = false;
    this.pendingInputs = [];
    this.activeCommand = null;
    this.lastCommandId = 0;
  }

  add(direction, text, redacted, kind, time, details = {}) {
    if (this.document.truncated) return;
    const event = { seq: this.document.events.length + 1, time: time || new Date().toISOString(), direction, text, redacted, ...details };
    if (kind) event.kind = kind;
    const bytes = Buffer.byteLength(JSON.stringify(event)) + 1;
    // Reserve room for metadata, including final state and timestamp changes.
    if (this.document.events.length >= this.maxEvents || this.eventBytes + bytes + 1024 > this.maxBytes) {
      this.document.truncated = true;
      this.document.state = "partial";
      this.clearRaw();
      this.onChange();
      return;
    }
    this.eventBytes += bytes;
    this.document.events.push(event);
    this.document.eventCount++;
    if (direction === "input") this.document.inputCount++;
    this.onChange(bytes);
    return event;
  }

  updateEvent(event, values) {
    const next = { ...event, ...values };
    const bytes = Buffer.byteLength(JSON.stringify(next)) - Buffer.byteLength(JSON.stringify(event));
    if (this.eventBytes + bytes + 1024 > this.maxBytes) {
      this.document.truncated = true;
      this.document.state = "partial";
      this.onChange();
      return false;
    }
    Object.assign(event, values);
    this.eventBytes += bytes;
    this.onChange(bytes);
    return true;
  }

  command(event) {
    if (!event || this.document.truncated) return;
    if (event.state === "ready") return;
    const id = Number(event.command_id);
    if (!Number.isSafeInteger(id) || id <= 0) return;
    if (event.state === "started") {
      if (id <= this.lastCommandId || !Number.isFinite(Date.parse(event.started_at))) return;
      this.lastCommandId = id;
      if (this.activeCommand) this.updateEvent(this.activeCommand, { status: "interrupted" });
      let raw = typeof event.command === "string" ? event.command : "";
      const index = this.pendingInputs.findIndex(input => !input.redacted && input.text.trim() === raw.trim());
      const input = index >= 0 ? this.pendingInputs.splice(index, 1)[0]
        : this.pendingInputs.length === 1 ? this.pendingInputs.shift() : null;
      if (!raw && input && !input.redacted) raw = input.text;
      const redacted = !raw || (input && input.redacted) || SECRET.test(raw) || PRIVATE_BEGIN.test(raw) || /[\x00-\x08\x0b-\x1f\x7f]/.test(raw) || Buffer.byteLength(raw) > MAX_LINE_BYTES;
      const entry = this.add("command", redacted ? (raw ? HIDDEN : INTERACTIVE) : raw, Boolean(redacted), "execution", input && input.time, {
        commandId: String(id), status: "running", startedAt: event.started_at,
        endedAt: null, durationMs: null, exitCode: null,
      });
      this.activeCommand = entry || null;
      if (entry && input) this.updateEvent(input, { commandId: String(id) });
      // Apply the same protection to echo/output as for submitted sensitive input.
      if (redacted) this.hideOutput = true;
    } else if (event.state === "finished") {
      const entry = this.activeCommand;
      if (!entry || entry.commandId !== String(id)) return;
      const start = Date.parse(entry.startedAt), end = Date.parse(event.ended_at);
      if (!Number.isFinite(end) || end < start || !Number.isSafeInteger(event.duration_ms) || event.duration_ms < 0 ||
        !Number.isInteger(event.exit_code) || event.exit_code < 0 || event.exit_code > 255 ||
        Math.abs(end - start - event.duration_ms) > 2) return;
      this.updateEvent(entry, { status: event.exit_code === 0 ? "succeeded" : "failed", endedAt: event.ended_at, durationMs: event.duration_ms, exitCode: event.exit_code });
      this.activeCommand = null;
    }
  }

  clearRaw() {
    this.lines = { input: lineState(), output: lineState() };
  }

  prompt(text) {
    if (PASSWORD_PROMPT.test(text)) {
      this.hideInput = true;
      this.shellReady = false;
    } else if (!this.alternateScreen && SHELL_PROMPT.test(text)) {
      this.shellReady = true;
      this.hideInput = false;
      this.hideOutput = false;
      this.lines.output.secretBlock = false;
      this.lines.input.secretBlock = false;
    }
  }

  complete(direction, time) {
    const line = this.lines[direction];
    const raw = line.text;
    const wasPrivate = line.privateKey;
    if (PRIVATE_BEGIN.test(raw)) line.privateKey = true;
    const secret = SECRET.test(raw);
    const privateText = wasPrivate || line.privateKey;
    const hidden = line.discard || line.uncertain || privateText || secret || line.secretBlock ||
      (direction === "input" ? this.hideInput || !this.shellReady : this.hideOutput);
    if (raw || line.discard || line.uncertain) {
      const interactive = direction === "input" && (line.uncertain || !this.shellReady);
      const text = hidden ? (direction === "input" ? (interactive && !this.hideInput ? INTERACTIVE : HIDDEN) : OUTPUT_HIDDEN) : raw;
      const event = this.add(direction, direction === "output" ? text + "\n" : text, hidden, direction === "input" ? (interactive ? "interactive" : "input") : undefined, time);
      if (direction === "input" && event) this.pendingInputs.push(event);
      if (direction === "input") {
        if (hidden) this.hideOutput = true; // Includes terminal echo of edits or passwords.
        this.shellReady = false;
      }
    }
    if (PRIVATE_END.test(raw)) line.privateKey = false;
    // Multiline secret values cannot be delimited reliably in arbitrary terminal text.
    // A blank line may itself be part of a secret value. Wait for a shell prompt.
    if (secret) line.secretBlock = true;
    if (SHELL_PROMPT.test(raw)) line.secretBlock = false;
    line.text = "";
    line.bytes = 0;
    line.since = 0;
    line.uncertain = false;
    line.discard = false;
  }

  feed(direction, data, now = Date.now()) {
    if (typeof data !== "string" || this.document.truncated) return;
    const time = new Date(now).toISOString();
    for (const ch of data) {
      if (this.document.truncated) break;
      const line = this.lines[direction];
      if (!line.since) line.since = now;
      // Stateful ANSI/OSC handling: never save escape payload, including split OSC.
      if (line.escape) {
        line.escape += ch;
        const esc = line.escape;
        if (esc === "\x1b[" || esc === "\x1b]" || esc === "\x1bP" || esc === "\x1b_") continue;
        if (esc.startsWith("\x1b[")) {
          if (/[\x40-\x7e]/.test(ch)) {
            if (direction === "output" && /\?104[79][hl]$/.test(esc)) this.alternateScreen = ch === "h";
            if (ch !== "m") line.uncertain = true;
            line.escape = "";
          }
        } else if (/^\x1b[\]P_]/.test(esc)) {
          if (ch === "\x07" || esc.endsWith("\x1b\\")) line.escape = "";
        } else {
          line.uncertain = true;
          line.escape = "";
        }
        if (line.escape.length > 512) {
          line.escape = "";
          line.discard = true;
        }
        continue;
      }
      if (ch === "\x1b") {
        line.escape = ch;
        if (direction === "input") { line.uncertain = true; this.hideOutput = true; }
        continue;
      }
      if (ch === "\r" || ch === "\n") {
        if (ch === "\n" && line.cr) { line.cr = false; continue; }
        this.complete(direction, time);
        line.cr = ch === "\r";
        continue;
      }
      line.cr = false;
      if ((ch < " " && !(direction === "output" && ch === "\t")) || ch === "\x7f") {
        // Tabs, backspace, Ctrl-C, editing and completion cannot be reconstructed safely.
        line.uncertain = true;
        if (direction === "input") this.hideOutput = true;
        continue;
      }
      if (!line.discard) {
        line.text += ch;
        line.bytes += Buffer.byteLength(ch);
        if (line.bytes > MAX_LINE_BYTES - (direction === "output" ? 1 : 0)) {
          line.text = "";
          line.discard = true;
          this.document.state = "partial";
          this.document.truncated = true;
          this.clearRaw();
          this.onChange();
        }
      }
    }
    if (direction === "output") {
      const line = this.lines.output;
      if (!line.discard && !line.escape && !line.privateKey) this.prompt(line.text);
    }
  }

  expire(now = Date.now()) {
    for (const direction of ["input", "output"]) {
      const line = this.lines[direction];
      if (line.since && now - line.since >= UNRESOLVED_MS && !line.discard) {
        // Do not emit an input as submitted until a newline has actually been forwarded.
        if (PRIVATE_BEGIN.test(line.text)) line.privateKey = true;
        line.text = "";
        line.discard = true;
        line.secretBlock = true;
        if (direction === "output") this.add(direction, OUTPUT_HIDDEN, true);
      }
    }
  }

  end(reason) {
    if (this.activeCommand) {
      this.updateEvent(this.activeCommand, { status: "interrupted" });
      this.activeCommand = null;
    }
    this.pendingInputs = [];
    const tail = this.lines.output;
    if (tail.text || tail.escape || tail.discard) this.add("output", OUTPUT_HIDDEN, true);
    this.clearRaw();
    this.document.state = this.document.truncated || ABNORMAL_REASONS.includes(reason) ? "partial" : "complete";
    this.onChange();
  }
}

// One write in flight plus one coalesced latest state; never enqueue a snapshot per frame.
class RecordingWriter {
  constructor(session, recorder, onFailure) {
    this.session = session;
    this.recorder = recorder;
    this.onFailure = onFailure;
    this.revision = 0;
    this.savedRevision = 0;
    this.bytes = 0;
    this.metadata = {};
    this.running = null;
    this.failed = false;
    this.stopped = false;
    recorder.onChange = bytes => this.changed(bytes);
    this.timer = setInterval(() => {
      recorder.expire();
      this.flush();
    }, 1000);
    this.timer.unref();
  }

  changed(bytes = 0) {
    this.revision++;
    this.bytes += bytes;
    if (this.bytes >= 16 * 1024) this.flush();
  }

  update(values) {
    Object.assign(this.metadata, values);
    this.changed();
  }

  flush() {
    if (this.running) return this.running;
    if (this.failed || this.savedRevision === this.revision) return Promise.resolve();
    this.running = (async () => {
      try {
        do {
          const revision = this.revision;
          this.bytes = 0;
          const recording = JSON.parse(JSON.stringify(this.recorder.document));
          recording.lastSavedAt = new Date().toISOString();
          await this.session.update({ ...this.metadata, recording }, { logging: false });
          this.recorder.document.lastSavedAt = recording.lastSavedAt;
          this.savedRevision = revision;
          // A busy stream waits for the timer/threshold, not an unbounded write loop.
        } while (this.stopped && this.savedRevision !== this.revision);
      } catch (_) {
        this.failed = true;
        clearInterval(this.timer);
        this.onFailure();
      }
    })().finally(() => { this.running = null; });
    return this.running;
  }

  async close(reason, operatorId) {
    clearInterval(this.timer);
    this.stopped = true;
    this.recorder.end(reason);
    this.update({ endedAt: new Date(), endReason: reason, operatorId });
    await this.flush();
    // If an earlier write failed, preserve its last committed prefix, mark partial if DB recovered.
    if (this.failed) {
      try {
        const recording = JSON.parse(JSON.stringify(this.recorder.document));
        recording.state = "partial";
        recording.lastSavedAt = new Date().toISOString();
        await this.session.update({ ...this.metadata, endReason: "recording_failed", recording }, { logging: false });
      } catch (_) { /* Startup reconciliation handles still-open persisted records. */ }
    }
  }
}

module.exports = { TerminalRecording, RecordingWriter, emptyRecording, recordingSummary, recordingDetail, ABNORMAL_REASONS, MAX_BYTES, MAX_EVENTS };
