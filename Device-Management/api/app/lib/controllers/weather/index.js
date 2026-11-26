'use strict';

function realtime (opts) {
   return async (ctx, next) => {
      try {
         const { models } = ctx.fs.dc;
         const { location } = ctx.query
         let location_ = location || '114.298156,27.717683';//经纬度字符串

         const weatherRes = await ctx.app.fs.caiyunRequest.get(`${opts.caiyun.key}/${location_}/realtime`)
         let rslt = {}
         if (weatherRes.status == 'ok') {
            rslt = weatherRes.result
         }

         ctx.status = 200;
         ctx.body = rslt
      } catch (error) {
         ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
         ctx.status = 400;
         ctx.body = {
            message: typeof error == 'string' ? error : undefined
         }
      }
   }
}

module.exports = {
   realtime
}