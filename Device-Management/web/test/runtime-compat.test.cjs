'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

test('deployment runtime starts production Web and serves API root', () => {
  const result = spawnSync(process.env.NODE_RUNTIME_BINARY || process.execPath, [path.join(__dirname, 'runtime-compat-smoke.cjs')], { cwd: path.join(__dirname, '..'), encoding: 'utf8', timeout: 15000 });
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /HTTP 200/);
});
