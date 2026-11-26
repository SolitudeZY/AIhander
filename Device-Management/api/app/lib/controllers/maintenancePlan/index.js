'use strict';


//维护计划
async function getMaintenancePlan (ctx) {
   const query = ctx.query
   try {

      const { models } = ctx.fs.dc
      const { clickHouse } = ctx.app.fs
      //console.log('11121', query)
      let resCount = await models.MaintenancePlan.count({
         where: { type: query.type }
      })
      let option = {
         order: [['id', 'DESC']],
         attributes: ['id', 'missionName', 'remark', 'reason', 'planFinishTime', 'actualFinishTime', 'type', 'state', 'recordId'],
         where: { type: query.type },
         include: [{
            attributes: ['id', 'maintenancePlanId', 'pepUserId'],
            model: models.MaintenancePlanExecuteUser
         }]
      }
      if (query.pageIndex && query.pageSize) {
         option.offset = (query.pageIndex - 1) * query.pageSize
         option.limit = query.pageSize
      }

      if (query.recordId) {
         option.where.recordId = { $contains: [query.recordId] }
      }
      const res = await models.MaintenancePlan.findAndCount(option)
      //console.log('res1', res)
      const arrayUserId = []
      if (res.rows.length > 0) {
         res.rows.forEach((item) => { item.maintenancePlanExecuteUsers.forEach((item1) => { arrayUserId.push(item1.pepUserId) }) })
         const arrayUserIdCopy = [...new Set(arrayUserId)]
         //(${ [...pepProjectIds].join(',') }, -1)
         const userRes = await clickHouse.pepEmis.query(`
            SELECT * FROM user 
               WHERE id IN (${[...arrayUserIdCopy].join(',')},-1)`).toPromise()
         //console.log('userRes', userRes)
         //console.log('res.rows', res.rows)
         const responseRes = res.rows.map((item) => {
            return {
               id: item.id,
               missionName: item.missionName,
               remark: item.remark,
               reason: item.reason,
               planFinishTime: item.planFinishTime,
               actualFinishTime: item.actualFinishTime,
               type: item.type,
               state: item.state,
               recordId: item.recordId,
               maintenancePlanExecuteUsers:
                  item.maintenancePlanExecuteUsers.map((item1) => {
                     const nameArr = userRes.find((ac) => { return ac.id == item1.pepUserId })
                     return {
                        id: item1.id,
                        maintenancePlanId: item1.maintenancePlanId,
                        pepUserId: item1.pepUserId,
                        name: nameArr ? nameArr.name : ''
                     }
                  })
            }
         })
         ctx.body = { count: resCount, responseRes }
         //console.log('responseRes', responseRes)
         ctx.status = 200
      } else {
         ctx.body = { count: resCount, responseRes: [] }
         ctx.status = 200
      }



   } catch (error) {
      ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`)
      ctx.status = 400
      ctx.body = {
         message: `${query.msg}失败`
      }
   }
}


async function delMaintenancePlan (ctx) {
   const transaction = await ctx.fs.dc.orm.transaction();
   try {
      const { models } = ctx.fs.dc
      const query = ctx.query
      const { responseId } = query
      //console.log('queryzz', [...responseId])
      await models.MaintenancePlanExecuteUser.destroy({ where: { maintenancePlanId: responseId } })
      await models.MaintenancePlan.destroy({ where: { id: responseId } })
      ctx.status = 204
      await transaction.commit();

   } catch (error) {
      await transaction.rollback();
      ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`)
      ctx.status = 400
      ctx.body = {
         message: '删除临时响应失败'
      }
   }
}

async function editMaintenancePlan (ctx) {
   const data = ctx.request.body
   const transaction = await ctx.fs.dc.orm.transaction();
   try {
      const { models } = ctx.fs.dc
      //console.log('data1', data)
      //存在id为编辑，否则是添加
      if (data.id) {
         if (data.type == 'temp') {
            await models.MaintenancePlan.update({
               actualFinishTime: data.actualFinishTime,
               missionName: data.missionName,
               remark: data.remark,
               reason: data.reason,
               recordId: data.recordId,
               planFinishTime: data.planFinishTime,
               state: data.state
            }, { where: { id: data.id } })
         } else {
            await models.MaintenancePlan.update({
               actualFinishTime: data.actualFinishTime,
               missionName: data.missionName,
               remark: data.remark,
               recordId: data.recordId,
               planFinishTime: data.planFinishTime,
               state: data.state
            }, { where: { id: data.id } })
         }
         //删除相关联的所有执行者
         await models.MaintenancePlanExecuteUser.destroy({ where: { maintenancePlanId: data.id } })
         //重新创建相关的执行者
         const insertVal = data.manger.map((item) => {
            return {
               maintenancePlanId: data.id, pepUserId: item
            }
         })
         await models.MaintenancePlanExecuteUser.bulkCreate(insertVal)

      } else {
         if (data.type == 'temp') {
            const plan = await models.MaintenancePlan.create({
               actualFinishTime: data.actualFinishTime,
               missionName: data.missionName,
               remark: data.remark,
               reason: data.reason,
               planFinishTime: data.planFinishTime,
               type: data.type,
               recordId: data.recordId,
               state: data.state
            })
            //console.log('data.manger',data.manger)
            const insertVal = data.manger.map((item) => {
               return {
                  maintenancePlanId: plan.id, pepUserId: item
               }
            })
            await models.MaintenancePlanExecuteUser.bulkCreate(insertVal)
         } else {
            //console.log('data.manger', data.manger)
            const plan = await models.MaintenancePlan.create({
               actualFinishTime: data.actualFinishTime,
               missionName: data.missionName,
               remark: data.remark,
               planFinishTime: data.planFinishTime,
               recordId: data.recordId,
               type: data.type,
               state: data.state
            })
            //console.log('planId1', plan.id)
            const insertVal = data.manger.map((item) => {
               return {
                  maintenancePlanId: plan.id, pepUserId: item
               }
            })
            await models.MaintenancePlanExecuteUser.bulkCreate(insertVal)
         }
      }
      ctx.status = 204
      await transaction.commit();
   }

   catch (error) {
      await transaction.rollback();
      ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`)
      ctx.status = 400
      ctx.body = {
         message: `${data.msg}失败`
      }
   }
}

module.exports = {
   getMaintenancePlan, delMaintenancePlan, editMaintenancePlan
}