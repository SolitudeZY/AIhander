'use strict';
const moment = require('moment');

//设备维护记录
async function getEquipment (ctx) {
   try {
      const { models } = ctx.fs.dc
      const sequelize = ctx.fs.dc.ORM
      const { clickHouse } = ctx.app.fs
      const { startTime, endTime, pageSize, pageIndex, projectId } = ctx.query

      let whereOption = {}
      if (projectId) {
         whereOption.projectId = projectId
      } else {
         whereOption = undefined
      }

      let resCount = await models.EquipmentMaintenanceRecord.count({
         include: [{
            model: models.EquipmentMaintenanceRecordProject,
            where: whereOption
         }],
         where: {
            reportTime: { $between: [moment(startTime).format('YYYY-MM-DD HH:mm:ss'), moment(endTime).format('YYYY-MM-DD HH:mm:ss')] }
            // $and: [
            //    sequelize.where(sequelize.fn('date', sequelize.col('report_time')), '>=', moment(startTime).format('YYYY-MM-DD HH:mm:ss')),
            //    sequelize.where(sequelize.fn('date', sequelize.col('report_time')), '<=', moment(endTime).format('YYYY-MM-DD HH:mm:ss')),
            // ],
         }
      })
      const res = await models.EquipmentMaintenanceRecord.findAll({
         order: [['id', 'DESC']],
         attributes: ['id', 'equipmentType', 'equipmentCategory', 'maintenanceReason', 'solution', 'reportTime', 'completedTime', 'status'],
         offset: (pageIndex - 1) * pageSize,
         limit: pageSize,
         include: [{
            attributes: ['id', 'equipmentMaintenanceRecordId', 'projectId'],
            model: models.EquipmentMaintenanceRecordProject,
            where: whereOption

         },
         {
            attributes: ['id', 'equipmentMaintenanceRecordId', 'pepUserId'],
            model: models.EquipmentMaintenanceRecordExecuteUser
         }
         ],
         where: {
            reportTime: { $between: [moment(startTime).format('YYYY-MM-DD HH:mm:ss'), moment(endTime).format('YYYY-MM-DD HH:mm:ss')] }
            // $and: [
            //    sequelize.where(sequelize.fn('date', sequelize.col('report_time')), '>=', moment(startTime).format('YYYY-MM-DD HH:mm:ss')),
            //    sequelize.where(sequelize.fn('date', sequelize.col('report_time')), '<=', moment(endTime).format('YYYY-MM-DD HH:mm:ss')),
            // ],
         }
      })
      //用户id
      const arrayUserId = []

      res.forEach((item) => { item.equipmentMaintenanceRecordExecuteUsers.forEach((item1) => { arrayUserId.push(item1.pepUserId) }) })
      const arrayUserIdCopy = [...new Set(arrayUserId)]
      // (${[...pepProjectIds].join(',')}, -1)
      let userRes = []
      if (arrayUserIdCopy.length > 0) {
         userRes = await clickHouse.pepEmis.query(`
         SELECT * FROM user 
            WHERE id IN (${[...arrayUserIdCopy].join(',')},-1) 
      `).toPromise()
      }
      const lastRes = res.map((item) => {
         return {
            reportTime: item.reportTime,
            completedTime: item.completedTime,
            equipmentCategory: item.equipmentCategory,
            equipmentType: item.equipmentType,
            id: item.id,
            maintenanceReason: item.maintenanceReason,
            solution: item.solution,
            status: item.status,
            equipmentMaintenanceRecordExecuteUsers:
               item.equipmentMaintenanceRecordExecuteUsers.map((item1) => {
                  const userArr = userRes.find((ac) => { return ac.id == item1.pepUserId })
                  return {
                     id: item1.id,
                     pepUserId: item1.pepUserId,
                     name: userArr ? userArr.name : ''
                  }
               }),
            equipmentMaintenanceRecordProjects: item.equipmentMaintenanceRecordProjects
         }
      })
      ctx.body = { result: lastRes, resCount }
      ctx.status = 200
   } catch (error) {
      ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`)
      ctx.status = 400
      ctx.body = {
         message: `查询设备维护记录失败`
      }
   }
}
//编辑和新增
async function editEquipment (ctx) {
   const transaction = await ctx.fs.dc.orm.transaction();
   const query = ctx.request.body
   try {
      const { models } = ctx.fs.dc
      const sequelize = ctx.fs.dc.ORM

      const { id, completedTime, deviceType, model, reason, reportTime, solution, status, solver, projectId } = query
      if (id) {
         await models.EquipmentMaintenanceRecord.update({
            equipmentType: model,
            equipmentCategory: deviceType,
            maintenanceReason: reason,
            solution: solution,
            reportTime,
            completedTime,
            status
         }, { where: { id } })
         await models.EquipmentMaintenanceRecordExecuteUser.destroy({ where: { equipmentMaintenanceRecordId: id } })
         await models.EquipmentMaintenanceRecordProject.destroy({ where: { equipmentMaintenanceRecordId: id } })
         if (solver) {
            const insertUserVal = solver.map((item) => {
               return {
                  equipmentMaintenanceRecordId: id, pepUserId: item
               }
            })
            await models.EquipmentMaintenanceRecordExecuteUser.bulkCreate(insertUserVal)
         }

         await models.EquipmentMaintenanceRecordProject.create({
            equipmentMaintenanceRecordId: id, projectId
         })


      } else {
         const equipment = await models.EquipmentMaintenanceRecord.create({
            equipmentType: model,
            equipmentCategory: deviceType,
            maintenanceReason: reason,
            solution: solution,
            reportTime,
            completedTime,
            status
         })
         await models.EquipmentMaintenanceRecordProject.create({
            equipmentMaintenanceRecordId: equipment.id, projectId
         })
         if (solver) {
            const insertUserVal = solver.map((item) => {
               return {
                  equipmentMaintenanceRecordId: equipment.id, pepUserId: item
               }
            })
            await models.EquipmentMaintenanceRecordExecuteUser.bulkCreate(insertUserVal)
         }
      }

      await transaction.commit();
      ctx.status = 204
   } catch (error) {
      await transaction.rollback();
      ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`)
      ctx.status = 400
      ctx.body = {
         message: `${query.msg}失败`
      }
   }
}
//删除
async function delEquipment (ctx) {
   const transaction = await ctx.fs.dc.orm.transaction();
   try {
      const params = ctx.params
      const { models } = ctx.fs.dc
      await models.EquipmentMaintenanceRecordExecuteUser.destroy({ where: { equipmentMaintenanceRecordId: params.id } })
      await models.EquipmentMaintenanceRecordProject.destroy({ where: { equipmentMaintenanceRecordId: params.id } })
      await models.EquipmentMaintenanceRecord.destroy({ where: { id: params.id } })
      ctx.status = 204
      await transaction.commit();
   } catch (error) {
      await transaction.rollback();
      ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`)
      ctx.status = 400
      ctx.body = {
         message: `删除维护记录失败`
      }
   }
}

module.exports = {
   getEquipment, editEquipment, delEquipment
};