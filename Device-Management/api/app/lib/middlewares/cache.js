"use strict";
const moment = require("moment");

// 路由级别的中间件
function factory({
  mode = "memory", // 缓存方式
  interval = 60, // 缓存时间 s
  key = null, //TODO  key 可以是一个指定的 str 或者回调函数 参数为 ctx 以返回不同参数的缓存值
} = {}) {
  return async (ctx, next) => {
    try {
      const basePath = ctx.path;
      let redisKey;
      if (typeof key === "function") {
        redisKey = key(ctx);
      } else {
        const query = ctx.query || {};
        const keys = Object.keys(query).sort();
        const qs = keys
          .map(
            (k) => `${encodeURIComponent(k)}=${encodeURIComponent(query[k])}`
          )
          .join("&");
        redisKey = qs ? `${basePath}?${qs}` : basePath;
      }
      const expired = await ctx.redis.hget(redisKey, "expired");
      if (expired && moment().valueOf() <= moment(expired).valueOf()) {
        // 还没过期
        const data = JSON.parse(await ctx.redis.hmget(redisKey, "data"));
        ctx.status = parseInt(await ctx.redis.hmget(redisKey, "status"));
        ctx.body = data;
      } else {
        await next();
        if (ctx.status >= 200 && ctx.status < 400) {
          await ctx.redis.hmset(redisKey, {
            expired: moment().add(interval, "seconds"),
            data: JSON.stringify(ctx.body || ""),
            status: ctx.status,
          });
        } else if (expired) {
          const data = JSON.parse(await ctx.redis.hmget(redisKey, "data"));
          ctx.status = await ctx.redis.hmget(redisKey, "status");
          ctx.body = data;
        }
      }
    } catch (error) {
      console.error(error);
    }
  };
}

module.exports = factory;
