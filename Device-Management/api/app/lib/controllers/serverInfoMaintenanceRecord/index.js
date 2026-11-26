'use strict';
const moment = require('moment');

//请求数据
async function getServerInfoMaintenanceRecord(ctx) {
   const { clickHouse } = ctx.app.fs
   try {
      const query = ctx.query
      //console.log('query2', query)
      const { startTime, endTime, pageIndex, pageSize } = query
      //console.log('res67', startTime.length)
      const { models } = ctx.fs.dc
      let whereOption = {}
      if (startTime.length > 0 && endTime.length > 0) {
         whereOption = { maintenanceStartTime: { $between: [moment(startTime).format('YYYY-MM-DD HH:mm:ss'), moment(endTime).format('YYYY-MM-DD HH:mm:ss')] } }
      } else {
         whereOption = {}
      }
      let resCount = await models.ServerMaintenanceRecord.count({
         where: whereOption
      })
      let res = await models.ServerMaintenanceRecord.findAndCount({
         order: [['id', 'DESC']],
         attributes: ['id', 'sketch', 'reason', 'remark', 'maintenanceStartTime', 'maintenanceFinishTime', 'state'],
         offset: (pageIndex - 1) * pageSize,
         limit: pageSize,
         where: whereOption,
         include: [{
            attributes: ['id', 'serverMaintenanceRecordId', 'pepUserId'],
            model: models.ServerMaintenanceRecordRepairman
         }]
      })
      //console.log('res', res)
      const arrayUserId = []
      res.rows.forEach((item) => { item.serverMaintenanceRecordRepairmans.forEach((item1) => { arrayUserId.push(item1.pepUserId) }) })
      let userRes = []
      if (arrayUserId.length > 0) {
         const arrayUserIdCopy = [...new Set(arrayUserId)]
         // console.log(arrayUserIdCopy, 'arrayUserIdCopy')
         userRes = await clickHouse.pepEmis.query(`
         SELECT * FROM user 
            WHERE id IN (${[...arrayUserIdCopy].join(',')},-1)`).toPromise()
         //ctx.body = { count: resCount, res }
         //console.log('userRes', userRes)
      } else {
         const arrayUserIdCopy = [...new Set(arrayUserId)]
         //console.log(arrayUserIdCopy, 'arrayUserIdCopy')
         userRes = await clickHouse.pepEmis.query(`
            SELECT * FROM user 
               WHERE id IN (-1)`).toPromise()
      }
      const responseRes = res.rows.map((item) => {
         return {
            id: item.id,
            sketch: item.sketch,
            reason: item.reason,
            remark: item.remark,
            maintenanceStartTime: item.maintenanceStartTime,
            maintenanceFinishTime: item.maintenanceFinishTime,
            state: item.state,
            serverMaintenanceRecordRepairmans:
               item.serverMaintenanceRecordRepairmans.map((item1) => {
                  const nameArr = userRes.find((ac) => { return ac.id == item1.pepUserId })
                  return {
                     id: item1.id,
                     serverMaintenanceRecordId: item1.serverMaintenanceRecordId,
                     pepUserId: item1.pepUserId,
                     name: nameArr ? nameArr.name : ''
                  }
               })
         }
      })
      ctx.body = { count: resCount, responseRes }
      ctx.status = 200

   } catch (error) {
      ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`)
      ctx.status = 400
      ctx.body = {
         message: `获取服务器信息维护记录失败`
      }
   }
}


//编辑或者新增
async function editServerInfoMaintenanceRecord(ctx) {
   const transaction = await ctx.fs.dc.orm.transaction();
   const payload = ctx.request.body//前端传过来的参数
   const { models } = ctx.fs.dc
   const { id, msg, maintenanceFinishTime, maintenanceStartTime, reason, remark, sketch, state, repairman } = payload
   try {
      if (id) {
         //更新记录表
         await models.ServerMaintenanceRecord.update({
            maintenanceFinishTime, maintenanceStartTime, reason, remark, sketch, state,
         }, { where: { id } })
         //删除相关的维修人
         await models.ServerMaintenanceRecordRepairman.destroy({ where: { serverMaintenanceRecordId: id } })
         //重新创建相关的维修人
         const insertUserVal = repairman.map((item) => {
            return { serverMaintenanceRecordId: id, pepUserId: item }
         })
         await models.ServerMaintenanceRecordRepairman.bulkCreate(insertUserVal)
         await transaction.commit();
         ctx.status = 204
      } else {
         //没有传id,直接创建记录和相关的维修人
         const res = await models.ServerMaintenanceRecord.create({
            maintenanceFinishTime, maintenanceStartTime, reason, remark, sketch, state
         })
         if (repairman) {
            const insertUserVal = repairman.map((item) => {
               return {
                  serverMaintenanceRecordId: res.id, pepUserId: item
               }
            })
            await models.ServerMaintenanceRecordRepairman.bulkCreate(insertUserVal)
         }
         await transaction.commit();
         ctx.status = 204

      }
   } catch (error) {
      await transaction.rollback();
      ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`)
      ctx.status = 400
      ctx.body = {
         message: `${msg}失败`
      }
   }
}


//根据id删除
async function delServerInfoMaintenanceRecord(ctx) {
   const transaction = await ctx.fs.dc.orm.transaction();
   try {
      const { models } = ctx.fs.dc
      const params = ctx.params//接收前端传过来的id
      //console.log('params1', params)
      await models.ServerMaintenanceRecordRepairman.destroy({ where: { serverMaintenanceRecordId: params.id } })
      await models.ServerMaintenanceRecord.destroy({ where: { id: params.id } })
      await transaction.commit();
      ctx.status = 204
   }
   catch (error) {
      await transaction.rollback();
      ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`)
      ctx.status = 400
      ctx.body = {
         message: `删除服务器信息维护记录失败`
      }
   }


}


module.exports = {
   getServerInfoMaintenanceRecord, editServerInfoMaintenanceRecord, delServerInfoMaintenanceRecord
};