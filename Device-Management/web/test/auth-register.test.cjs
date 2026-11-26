const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const babel = require('@babel/core');

function load(post) {
  const filename = path.resolve(__dirname, '../client/src/sections/auth/actions/auth.js');
  const source = fs.readFileSync(filename, 'utf8');
  const compiled = babel.transformSync(source, { filename, configFile: false, babelrc: false,
    presets: [[require.resolve('@babel/preset-env'), { targets: { node: 'current' } }]] }).code;
  const exports = {}; const calls = [];
  vm.runInNewContext(compiled, { exports, require(name) {
    if (name === '$utils') return { ApiTable: { register: 'auth/register' } };
    if (name === '@peace/utils') return { Request: { post: (...args) => { calls.push(args); return post(...args); } } };
    if (name === 'antd') return {};
    throw new Error('Unexpected dependency '+name);
  } });
  return { register: exports.register, calls };
}

test('registration uses a bounded request timeout and returns success after response', async () => {
  let complete; const pending = new Promise(resolve => { complete = resolve; });
  const f = load(() => pending); const actions = [];
  const params = { name: '测试', username: 'test_only', password: 'test_only' };
  const promise = f.register(params)(action => { actions.push(action); return action; });
  assert.equal(actions.length, 1); assert.equal(actions[0].type, 'REGISTER_USER_REQUESTING');
  assert.equal(f.calls[0][0], 'auth/register'); assert.equal(f.calls[0][1], params);
  assert.equal(f.calls[0][6], 30000);
  complete({ message: '注册成功' });
  const result = await promise; assert.equal(result.success, true);
  assert.equal(result.payload.data.message, '注册成功');
});

test('layout action metadata probing never submits registration or requires a dispatch', () => {
  const f = load(() => { throw new Error('must not send at startup'); });
  const metadata = f.register()();
  assert.equal(metadata.actionType, 'REGISTER_USER');
  assert.equal(typeof metadata.then, 'undefined');
  assert.equal(f.calls.length, 0);
});

test('database failure, network failure and timeout produce actionable results for the page', async () => {
  for (const [error, expected] of [
    [{ response: { body: { message: '注册服务暂不可用，请检查数据库连接或稍后重试' } } }, /数据库/],
    [new Error('network'), /网络/],
    [{ timeout: 30000 }, /先尝试登录确认/],
  ]) {
    const f = load(() => Promise.reject(error));
    const result = await f.register({})(action => action);
    assert.equal(result.success, false); assert.match(result.payload.message, expected);
  }
});
