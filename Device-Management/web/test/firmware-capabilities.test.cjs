const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const babel = require('@babel/core');

function load(get) {
  const filename = path.resolve(__dirname, '../client/src/sections/firmwareUpgrade/actions/firmwareUpgrade.js');
  const compiled = babel.transformSync(fs.readFileSync(filename, 'utf8'), { filename, configFile: false, babelrc: false,
    presets: [[require.resolve('@babel/preset-env'), { targets: { node: 'current' } }]] }).code;
  const exports = {}; const requests = [];
  vm.runInNewContext(compiled, { exports, require(name) {
    if (name === '$utils') return { ApiTable: { getFirmwareCapabilities: 'firmware/capabilities' } };
    if (name === '@peace/utils') return { Request: { get: (...args) => { requests.push(args); return get(...args); } } };
    throw new Error(name);
  } });
  return { action: exports.getFirmwareCapabilities, requests };
}

test('capability probe metadata is synchronous and sends no startup request', () => {
  const f = load(() => { throw new Error('must not send'); });
  const result = f.action()();
  assert.equal(result.actionType, 'GET_FIRMWARE_CAPABILITIES');
  assert.equal(typeof result.then, 'undefined'); assert.equal(f.requests.length, 0);
});

test('capability request keeps platform authentication and a bounded timeout', async () => {
  const data = { firmware: true, deviceTypes: false };
  const f = load(() => Promise.resolve(data));
  const result = await f.action()(action => action);
  assert.equal(f.requests[0][0], 'firmware/capabilities');
  assert.equal(f.requests[0][4], 'user'); assert.equal(f.requests[0][5], 30000);
  assert.equal(result.success, true); assert.equal(result.payload.data, data);
});

test('failed capability request returns inline warning data without a global error notification', async () => {
  const f = load(() => Promise.reject({ response: { body: { message: 'qa-only failure' } } }));
  const actions = [];
  const result = await f.action()(action => { actions.push(action); return action; });
  assert.equal(result.success, false); assert.match(result.payload.message, /无法确认固件服务/);
  assert.equal(actions.some(action => action.error || action.payload?.error), false);
});
