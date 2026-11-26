const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

test('Web server registers routes on modern Node and serves API root without upstream requests', () => {
  const script = `
    process.argv=[process.execPath,'server.js'];
    const assert=require('node:assert/strict');
    const errors=[];
    const loggerModule=require.resolve('fs-logger');require(loggerModule);
    require.cache[loggerModule].exports=app=>{
      app.fs=app.fs||{};
      app.fs.logger={log(level,...args){if(level==='error')errors.push(args)},error(...args){errors.push(args)}};
      return function*(ctx,next){ctx.fs=ctx.fs||{};ctx.fs.logger=app.fs.logger;yield next();};
    };
    (async()=>{
      const probe=require('node:net').createServer().listen(0,'127.0.0.1');
      await require('node:events').once(probe,'listening');
      const port=probe.address().port;await new Promise(resolve=>probe.close(resolve));
      require('./config').port=port;
      const app=require('./server');
      try {
        assert.deepEqual(errors,[],'middleware registration failed');
        const response=await fetch('http://127.0.0.1:'+port+'/api/root');
        assert.equal(response.status,200);
        const result=await response.json();
        assert.equal(result.root,'http://127.0.0.1:4700');
        assert.deepEqual(errors,[]);
        console.log('WEB_STARTUP_OK');
      } finally {app.socket.close();app.server.closeAllConnections?.()}
    })().catch(error=>{console.error(error);process.exitCode=1});
  `;
  const env = { PATH: process.env.PATH, SystemRoot: process.env.SystemRoot, NODE_ENV: 'production' };
  for (const name of ['API_URL','API_POMS_URL','CRAW_API','API_EMIS_URL','WEB_EMIS_URL','WEB_OA_URL','API_ANXINYUN_URL','POMS_MONITOR','DC_WEB','NETWORK_WEB','IOT_VIDEO_WEB']) env[name]='http://127.0.0.1:4700';
  Object.assign(env,{ANXINCLOUD_QINIU_ACCESSKEY:'test-ak',ANXINCLOUD_QINIU_SECRETKEY:'test-sk',ANXINCLOUD_QINIU_BUCKET_RESOURCE:'test-only',ANXINCLOUD_QINIU_DOMAIN_QNDMN_RESOURCE:'https://files.example.test'});
  const result=spawnSync(process.execPath,['-e',script],{cwd:path.join(__dirname,'..'),env,encoding:'utf8',timeout:15000});
  assert.equal(result.status,0,result.stderr+result.stdout);
  assert.match(result.stdout,/WEB_STARTUP_OK/);
});
