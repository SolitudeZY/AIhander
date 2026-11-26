"use strict";

const fs = require("fs");
const path = require("path");
// Simple KEY=value local file; explicit shell/VS Code values take precedence.
const envFile = path.join(__dirname, "agent-local.env");
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, "utf8").split(/\r?\n/)) {
    const match = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(line);
    if (match && process.env[match[1]] === undefined) process.env[match[1]] = match[2];
  }
}
// Opt-in local profile. Credentials stay in the private file or environment.
process.env.NODE_ENV = "development";
process.env.EDGE_AGENT_LOCAL = "true";
module.exports = require("./server");
