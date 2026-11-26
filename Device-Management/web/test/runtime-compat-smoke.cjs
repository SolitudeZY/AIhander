'use strict';

// Real production scaffold and HTTP route; no browser build or upstream calls.
const assert = require('assert').strict;
const http = require('http');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.join(__dirname, '..');
process.env.NODE_ENV = 'production';
for (const name of ['API_URL','API_POMS_URL','CRAW_API','API_EMIS_URL','WEB_EMIS_URL','WEB_OA_URL','API_ANXINYUN_URL','POMS_MONITOR','DC_WEB','NETWORK_WEB','IOT_VIDEO_WEB']) process.env[name] = 'http://127.0.0.1:4700';
Object.assign(process.env, { ANXINCLOUD_QINIU_ACCESSKEY: 'test-ak', ANXINCLOUD_QINIU_SECRETKEY: 'test-sk', ANXINCLOUD_QINIU_BUCKET_RESOURCE: 'test-only', ANXINCLOUD_QINIU_DOMAIN_QNDMN_RESOURCE: 'https://files.example.test' });
process.env.EDGE_AGENT_API_URL = 'https://device.example.test';
process.argv = [process.execPath, path.join(root, 'server.js')];
function syntax(directory) {
  for (const name of fs.readdirSync(directory)) {
    const filename = path.join(directory, name);
    if (fs.statSync(filename).isDirectory()) syntax(filename);
    else if (/\.js$/.test(name)) new vm.Script(fs.readFileSync(filename, 'utf8'), { filename });
  }
}
const errors = [];
const logger = require.resolve('fs-logger');
require(logger);
require.cache[logger].exports = app => {
  app.fs = app.fs || {};
  app.fs.logger = { log(level, ...args) { if (level === 'error') errors.push(args); }, error(...args) { errors.push(args); } };
  return function*(ctx, next) { ctx.fs = ctx.fs || {}; ctx.fs.logger = app.fs.logger; yield next(); };
};
(async () => {
  syntax(path.join(root, 'middlewares'));
  syntax(path.join(root, 'routes'));
  for (const name of ['server.js','config.js','client/index.js']) new vm.Script(fs.readFileSync(path.join(root, name), 'utf8'), { filename: name });
  const config = require('../config');
  const probe = require('net').createServer();
  await new Promise((resolve, reject) => { probe.once('error', reject); probe.listen(0, '127.0.0.1', resolve); });
  config.port = probe.address().port;
  await new Promise(resolve => probe.close(resolve));
  const app = require('../server');
  try {
    if (!app.server.listening) await new Promise(resolve => app.server.once('listening', resolve));
    const response = await new Promise((resolve, reject) => {
      const request = http.get('http://127.0.0.1:' + app.server.address().port + '/api/root', res => {
        let body = ''; res.setEncoding('utf8');
        res.on('data', chunk => { body += chunk; });
        res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(body) }));
        res.on('error', reject);
      });
      request.setTimeout(5000, () => request.destroy(new Error('HTTP timeout')));
      request.on('error', reject);
    });
    assert.equal(response.status, 200);
    assert.equal(response.body.root, 'http://127.0.0.1:4700');
    assert.equal(response.body.edgeAgentApiUrl, 'https://device.example.test');
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ node: process.version, syntax: 'Web server/routes/middleware', startup: 'production scaffold', apiRoot: 'HTTP 200', upstream: 'none' }));
  } finally { app.socket.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
