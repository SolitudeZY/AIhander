'use strict';
const moment = require('moment');

async function getRecord (ctx) {
   try {
      const { redis } = ctx.app
      const { models } = ctx.fs.dc;
      const sequelize = ctx.fs.dc.ORM;
      const { clickHouse } = ctx.app.fs
      const { startTime, endTime, pageSize, pageIndex } = ctx.query

      let resCount = await models.MaintenanceRecord.count({
         where: {
            $and: [
               sequelize.where(sequelize.fn('date', sequelize.col('occurrence_time')), '>=', moment(startTime).format('YYYY-MM-DD')),
               sequelize.where(sequelize.fn('date', sequelize.col('occurrence_time')), '<=', moment(endTime).format('YYYY-MM-DD')),
            ]
         }
      })
      let recordRes = await models.MaintenanceRecord.findAndCountAll({
         order: [['id', 'DESC']],
         attributes: ['id', 'sketch', 'occurrenceTime', 'solvingTime', 'interruptDuration', 'type', 'record', 'files'],
         offset: (pageIndex - 1) * pageSize,
         limit: pageSize,
         where: {
            $and: [
               sequelize.where(sequelize.fn('date', sequelize.col('occurrence_time')), '>=', moment(startTime).format('YYYY-MM-DD')),
               sequelize.where(sequelize.fn('date', sequelize.col('occurrence_time')), '<=', moment(endTime).format('YYYY-MM-DD')),
            ]
         },
         include: [{
            attributes: ['id', 'maintenanceRecordId', 'pepUserId'],
            model: models.MaintenanceRecordExecuteUser
         }]
      })
      //console.log('recordRes', recordRes)
      const arrayUserId = []
      const recordId = []
      recordRes.rows.forEach((item) => {
         recordId.push(item.id)
         item.maintenanceRecordExecuteUsers.forEach((item1) => { arrayUserId.push(item1.pepUserId) })
      })
      const arrayUserIdCopy = [...new Set(arrayUserId)]
      // console.log('(' + arrayUserIdCopy.toString() + ')', '22222')
      let userRes = await redis.get('allUser')
      userRes = JSON.parse(userRes)
      userRes = userRes.filter((item) => {
         return arrayUserIdCopy.some((children) => { return children == item.id })
      })
      //console.log('userRes', userRes)
      let planList = await models.MaintenancePlan.findAll({
         where: { recordId: { $overlap: recordId } },
      })


      const res = await recordRes.rows.map((item) => {
         return {
            id: item.id,
            interruptDuration: item.interruptDuration,
            occurrenceTime: item.occurrenceTime,
            record: item.record,
            sketch: item.sketch,
            solvingTime: item.solvingTime,
            type: item.type,
            files: item.files || null,
            planList: planList.filter(v => v.recordId && v.recordId.includes(item.id)) || [],
            maintenanceRecordExecuteUsers:
               item.maintenanceRecordExecuteUsers.map((item1) => {
                  const userArr = userRes.find((ac) => { return ac.id == item1.pepUserId })
                  return {
                     id: item1.id,
                     maintenanceRecordId: item1.maintenanceRecordId,
                     pepUserId: item1.pepUserId,
                     name: userArr ? userArr.name : ''
                  }
               })
         }
      }
      )
      //console.log('res1', res)
      ctx.body = { count: resCount, res: res }
      ctx.status = 200
   } catch (error) {
      ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
      ctx.status = 400;
      ctx.body = {
         message: '获取服务记录失败'
      }
   }
}
//新增和编辑服务记录
async function addRecord (ctx) {
   const transaction = await ctx.fs.dc.orm.transaction();
   const { models } = ctx.fs.dc
   const params = ctx.request.body
   const { solvingTime, occurrencTime, sketch, record, settler, type, id, msg, files } = params
   const breakTime = (Date.parse(solvingTime) - Date.parse(occurrencTime)) / 1000
   let message = `${msg}失败`
   try {
      //中断时长
      //console.log('resss1', Date.parse(solvingTime), occurrencTime)
      const areArraysEqual = (arr1, arr2) => {
         // 首先检查两个数组的长度是否相同
         if (arr1.length !== arr2.length) {
            return false;
         }

         // 遍历第一个数组的每个元素
         return arr1.every(function (element) {
            // 检查第二个数组是否包含当前元素
            return arr2.includes(element);
         });
      }

      const findOne = await models.MaintenanceRecord.findOne({
         where: {
            solvingTime: solvingTime,
            occurrenceTime: occurrencTime,
            sketch: sketch,
            record: record,
            type: type,
         },
         include: [{
            attributes: ['id', 'maintenanceRecordId', 'pepUserId'],
            model: models.MaintenanceRecordExecuteUser,
            where: {
               pepUserId: { $in: settler }
            }
         }]
      })

      if (id && findOne && findOne.id !== id && areArraysEqual(findOne.files.map(v => v.name), files.map(v => v.name))) {
         message = '已有相同的一条数据'
         throw ''
      } else if (!id && findOne && areArraysEqual(findOne.files.map(v => v.name), files.map(v => v.name))) {
         message = '已有相同的一条数据'
         throw ''
      }



      if (id) {
         await models.MaintenanceRecord.update({
            solvingTime, occurrenceTime: occurrencTime, sketch, record, settler, type, interruptDuration: breakTime, files: files
         }, { where: { id } })
         await models.MaintenanceRecordExecuteUser.destroy({ where: { maintenanceRecordId: id } })
         const resArry = settler.map((item) => {
            return {
               maintenanceRecordId: id, pepUserId: item
            }
         })
         await models.MaintenanceRecordExecuteUser.bulkCreate(resArry)
      } else {
         const aa = await models.MaintenanceRecord.create({ solvingTime, occurrenceTime: occurrencTime, sketch, record, settler, type, interruptDuration: breakTime, files: files })
         const recordId = aa.id
         const resArry = settler.map((item) => {
            return {
               maintenanceRecordId: recordId, pepUserId: item
            }
         })
         await models.MaintenanceRecordExecuteUser.bulkCreate(resArry)
      }
      //console.log('params1', params)

      await transaction.commit();
      ctx.status = 200
   } catch (error) {
      await transaction.rollback();
      ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
      ctx.status = 400;
      ctx.body = {
         message: message
      }
   }
}
//删除服务记录
async function delRecord (ctx) {
   const transaction = await ctx.fs.dc.orm.transaction();
   const { models } = ctx.fs.dc
   const params = ctx.params
   try {
      await models.MaintenanceRecordExecuteUser.destroy({ where: { maintenanceRecordId: params.id } })
      await models.MaintenanceRecord.destroy({ where: { id: params.id } })
      await transaction.commit();
      ctx.status = 200
   } catch (error) {
      await transaction.rollback();
      ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`)
      ctx.status = 400
      ctx.body = {
         message: `删除服务记录失败`
      }
   }
}


async function respondRecord (ctx) {
   try {
      const { models } = ctx.fs.dc;
      let res = await models.MaintenanceRecord.findAll({
         order: [['id', 'DESC']],
         attributes: ['id', 'sketch', 'occurrenceTime'],
      })
      ctx.body = res
      ctx.status = 200
   } catch (error) {
      ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
      ctx.status = 400;
      ctx.body = {
         message: '获取响应记录数据失败'
      }
   }
}



module.exports = {
   getRecord,
   addRecord,
   delRecord,
   respondRecord
};