"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const path = require("node:path");

function load(extra = {}) {
  const script = `process.argv=[process.execPath,'config-test.js']; const c=require('./config'); const o=c.mws.at(-1).opts; console.log(JSON.stringify({port:c.port,db:c.dc.url,local:o.edgeAgentLocal,exclude:o.exclude,camunda:o.camundarest,redis:o.redis,storage:c.edgeAgentStorage?.bucket,mws:c.mws.length,upstreams:o.pssaRequest}));`;
  return spawnSync(process.execPath, ["-e", script], {
    cwd: path.join(__dirname, ".."), encoding: "utf8",
    env: { PATH: process.env.PATH, SystemRoot: process.env.SystemRoot, NODE_ENV: "development", EDGE_AGENT_LOCAL: "true", POMS_DB: "postgres://test:test@127.0.0.1:1/test_only", ...extra },
  });
}
test("local Agent profile loads DB, Redis, auth and Qiniu without unrelated service parameters", () => {
  const result = load({ ANXINCLOUD_QINIU_DOMAIN_QNDMN_RESOURCE: "https://files.example.test", ANXINCLOUD_QINIU_BUCKET_RESOURCE: "test-only", ANXINCLOUD_QINIU_ACCESSKEY: "test-ak", ANXINCLOUD_QINIU_SECRETKEY: "test-sk" });
  assert.equal(result.status, 0, result.stderr);
  const config = JSON.parse(result.stdout.trim().split(/\r?\n/).at(-1));
  assert.equal(config.local, true); assert.deepEqual(config.exclude, []);
  assert.equal(config.db, "postgres://test:test@127.0.0.1:1/test_only");
  assert.equal(config.camunda, undefined); assert.equal(config.storage, "test-only");
  assert.equal(config.redis.host, "localhost"); assert.equal(config.mws, 1);
});
test("default/full platform validation still requires Camunda and local Qiniu mode requires keys", () => {
  for (const env of [{ EDGE_AGENT_LOCAL: "false" }, { NODE_ENV: "production" }]) {
    const result = load(env); assert.notEqual(result.status, 0); assert.match(result.stderr, /FS_CAMUNDA_HOST/);
  }
  const qiniu = load(); assert.notEqual(qiniu.status, 0); assert.match(qiniu.stderr, /QINIU_DOMAIN/);
  const local = load({ EDGE_AGENT_FILE_STORAGE: "local" }); assert.equal(local.status, 0, local.stderr);
  assert.equal(JSON.parse(local.stdout.trim().split(/\r?\n/).at(-1)).storage, undefined);
});

test("local profile enables only the explicitly configured legacy firmware upstream", () => {
  const absent = load({ EDGE_AGENT_FILE_STORAGE: "local" });
  const present = load({ EDGE_AGENT_FILE_STORAGE: "local", API_CRAW_URL: "http://firmware.example.test/v1" });
  assert.equal(absent.status, 0); assert.equal(present.status, 0);
  assert.deepEqual(JSON.parse(absent.stdout.trim().split(/\r?\n/).at(-1)).upstreams, []);
  assert.deepEqual(JSON.parse(present.stdout.trim().split(/\r?\n/).at(-1)).upstreams, [{ name: "craw", root: "http://firmware.example.test/v1", dataWord: "text" }]);
});

test("real scaffold local startup with DB/Redis/logger substitutes registers login/Agent routes and keeps user authentication", t => {
  const fs = require("node:fs");
  const dataDir = fs.mkdtempSync(path.join(require("node:os").tmpdir(), "agent-local-boot-"));
  t.after(() => fs.rmSync(dataDir, { recursive: true, force: true }));
  const script = `
    process.argv=[process.execPath,'start-agent.js'];
    const assert=require('node:assert/strict');
    require('sequelize').prototype.query=async()=>[];
    const Redis=require.resolve('ioredis');require(Redis);
    require.cache[Redis].exports=class extends require('node:events').EventEmitter {};
    const logger=require.resolve('fs-logger');require(logger);
    require.cache[logger].exports=app=>{
      app.fs=app.fs||{};app.fs.logger={log(){},error(){},debug(){},info(){}};
      return function*(ctx,next){ctx.fs=ctx.fs||{};ctx.fs.logger=app.fs.logger;yield next();};
    };
    (async()=>{
      const probe=require('node:net').createServer().listen(0,'127.0.0.1');
      await require('node:events').once(probe,'listening');
      const port=probe.address().port;await new Promise(r=>probe.close(r));
      require('./config').port=port;
      const app=require('./start-agent');
      const base='http://127.0.0.1:'+port;
      await app.fs.agentPlatform.ready;
      assert.equal((await fetch(base+'/healthz')).status,200);
      const login=await fetch(base+'/auth/login',{method:'POST',headers:{'content-type':'application/json'},body:'{}'});
      assert.equal(login.status,400);
      const invalidRegister=await fetch(base+'/auth/register',{method:'POST',headers:{'content-type':'application/json'},body:'{}'});
      assert.equal(invalidRegister.status,400);
      app.fs.dc.orm.transaction=async()=>{throw Object.assign(new Error('test-only'),{name:'SequelizeConnectionError'});};
      const unavailableRegister=await fetch(base+'/auth/register',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({name:'测试',username:'test_only',password:'test_only'})});
      assert.equal(unavailableRegister.status,503);
      assert.match((await unavailableRegister.json()).message,/数据库/);
      assert.equal((await fetch(base+'/edgeAgent/devices')).status,401);
      assert.equal((await fetch(base+'/firmware/capabilities')).status,401);
      assert.ok(app.router.stacks.some(s=>s.path==='/firmware/capabilities'));
      assert.ok(app.router.stacks.some(s=>s.path==='/api/v1/agents/register'));
      assert.ok(app.fs.agentHub);
      console.log('LOCAL_SCAFFOLD_OK');
      await app.fs.dc.orm.close();
      app.socket.close();
      app.server.closeAllConnections?.();
      process.exitCode=0;
    })().catch(err=>{console.error(err);process.exit(1)});
  `;
  const result = spawnSync(process.execPath, ["-e", script], {
    cwd: path.join(__dirname, ".."), encoding: "utf8", timeout: 20000,
    env: { PATH: process.env.PATH, SystemRoot: process.env.SystemRoot, NODE_ENV: "development", EDGE_AGENT_LOCAL: "true", EDGE_AGENT_FILE_STORAGE: "local", EDGE_AGENT_DATA_DIR: dataDir, POMS_DB: "postgres://test:test@127.0.0.1:1/test_only", IOTA_REDIS_SERVER_PORT: "1" },
  });
  assert.equal(result.status, 0, result.stderr + result.stdout.slice(-2000));
  assert.match(result.stdout, /LOCAL_SCAFFOLD_OK/);
});
