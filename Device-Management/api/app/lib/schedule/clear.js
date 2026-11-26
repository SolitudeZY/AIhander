
const schedule = require('node-schedule');
const moment = require('moment')
const request = require('superagent');

let isDev = false
// isDev = true

module.exports = function (app, opts, ctx) {
   const clear = app.fs.scheduleInit(
      {
         interval: '30 30 3 */3 * *',
         immediate: isDev,
         proRun: !isDev,
      },
      async () => {
         try {
            const { models } = app.fs.dc

            // 获取一个月前的日期
            const oneMonthAgo = moment().subtract(1, 'months').toDate();
            const clearModels = [{
               n: 'AlarmAppearRecord',
               tk: 'time'
            }, {
               n: 'LatestDynamicList',
               tk: 'time'
            }, {
               n: 'AlarmConfirmLog',
               tk: 'confirmTime'
            }]

            for (let m of clearModels) {
               await models[m.n].destroy({
                  where: {
                     [m.tk]: {
                        $lt: oneMonthAgo
                     }
                  }
               })
            }

         } catch (error) {
            console.error('定时清理最新动态数据失误', error)
         }
      }
   );
   return {
      clear,
   }
}