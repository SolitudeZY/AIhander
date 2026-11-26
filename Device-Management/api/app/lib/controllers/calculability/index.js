'use strict';
const moment = require('moment');


//系统可用性
async function getCalculability (ctx) {
   try {
      const { models } = ctx.fs.dc
      const query = ctx.query
      const sequelize = ctx.fs.dc.ORM;
      const { eTime, sTime } = query
      const timer = (new Date(eTime) - new Date(sTime)) / 1000  //时间之间的秒数
      //console.log('timer', timer)
      let recordRes = await models.MaintenanceRecord.findAndCount({
         attributes: ['occurrenceTime', 'solvingTime'],
         where: {
            occurrenceTime: { $between: [moment(sTime).format('YYYY-MM-DD HH:mm:ss'), moment(eTime).format('YYYY-MM-DD HH:mm:ss')] }
            // $and: [
            //    sequelize.where(sequelize.fn('timestamp', sequelize.col('occurrence_time')), '>=', moment(sTime).format('YYYY-MM-DD HH:mm:ss')),
            //    sequelize.where(sequelize.fn('timestamp', sequelize.col('occurrence_time')), '<=', moment(eTime).format('YYYY-MM-DD HH:mm:ss')),
            // ]
         }

      })
      let problemtime = 0
      recordRes.rows.forEach((item) => {
         let diff = (item.solvingTime - item.occurrenceTime) / 1000;
         problemtime += diff;
      })

      const abilty = (timer - problemtime) / timer

      ctx.status = 200
      ctx.body = abilty
   } catch (error) {
      ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`)
      ctx.status = 400
      ctx.body = {
         message: `查询系统可用性失败`
      }
   }
}

module.exports = {
   getCalculability
}