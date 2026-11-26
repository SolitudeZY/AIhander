'use strict';
// https://github.com/luin/ioredis
const redis = require("ioredis")

module.exports = async function factory (app, opts) {
   let client = opts.redis.pwd ?
      new redis.Cluster([
         {
            host: opts.redis.host,
            port: opts.redis.port
         }
      ], {
         redisOptions: {
            password: opts.redis.pwd,
         },
      })
      : new redis(opts.redis.port, opts.redis.host, {
         password: opts.redis.pwd,
      });

   client.on("error", function (err) {
      app.fs.logger.error('info', '[FS-AUTH-REDIS]', `redis connect error. ${opts.redis.host + ':' + opts.redis.port}`);
      // console.error("Error :", err);
      // process.exit(-1);
   });

   client.on('connect', function () {
      console.info(`redis connect success ${opts.redis.host + ':' + opts.redis.port}`);
   })

   // 自定义方法
   async function hdelall (key) {
      const obj = await client.hgetall(key);
      await client.hdel(key, Object.keys(obj))
   }

   app.redis = client
   app.redisTools = {
      hdelall,
   }
}
