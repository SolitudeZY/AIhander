
const schedule = require('node-schedule');
const moment = require('moment')
const request = require('superagent');

let isDev = false
// isDev = true

module.exports = function (app, opts, ctx) {
   const certRemainUp = app.fs.scheduleInit(
      {
         interval: '30 30 0 * * *',
         immediate: isDev,
         proRun: !isDev,
      },
      async () => {
         try {
            const { models } = app.fs.dc
            const certs = await models.Cert.findAll({})

            for (let c of certs) {
               let remain = moment(c.dayEnd).diff(moment(), 'days') + 1
               await models.Cert.update({
                  remain,
               }, {
                  where: {
                     id: c.id
                  }
               })
            }

         } catch (error) {
            console.error('证书过期时间计算失误', error)
         }
      }
   );
   return {
      certRemainUp,
   }
}