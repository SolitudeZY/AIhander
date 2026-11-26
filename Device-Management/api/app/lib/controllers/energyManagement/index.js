'use strict';
const moment = require('moment')

async function getDeviceStatistics(ctx) {
   try {
      let res = await ctx.app.redis.get('eneryData')
      ctx.status = 200
      ctx.body = res ? JSON.parse(res) : { message: '暂无数据' }

   } catch (error) {
      ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
      ctx.status = 400;
      ctx.body = {
         message: '获取设备统计数据失败'
      }
   }
}

async function getEchartsData(ctx) {
   try {
      const { isSevenDay } = ctx.query
      let rslt = []
      const data = await ctx.app.redis.get('redisChartData')
      if(data){
         const res = JSON.parse(data)
         if (isSevenDay==='true') {
            rslt = res._7daysData
         } else {
            rslt = res._30daysData
         }
      }else{
         rslt={message:'暂无数据'} 
      }
      ctx.status = 200
      ctx.body = rslt
   } catch (error) {
      ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
      ctx.status = 400;
      ctx.body = {
         message: '按天获取设备状态失败'
      }
   }
}







module.exports = {
   getDeviceStatistics,
   getEchartsData

}