'use strict';
const moment = require('moment')

async function getMaintenceRecordRank (ctx) {
   const sequelize = ctx.fs.dc.orm
   const Sequelize = ctx.fs.dc.ORM;
   const { clickHouse } = ctx.app.fs
   const models = ctx.fs.dc.models
   const { startTime, endTime } = ctx.query

   try {
      const res = await sequelize.query(`
      SELECT emrp.project_id,count(1)
FROM equipment_maintenance_record 
    RIGHT JOIN equipment_maintenance_record_project emrp
        on equipment_maintenance_record.id = emrp.equipment_maintenance_record_id
        where report_time BETWEEN :startTime AND :endTime
GROUP BY emrp.project_id
      `
         , {
            replacements: {
               startTime: moment(startTime).format('YYYY-MM-DD HH:mm:ss'),
               endTime: moment(endTime).format('YYYY-MM-DD HH:mm:ss ')
            }
            //, type: sequelize.QueryTypes.SELECT
         }
      )
      //查询equipment_maintenance_record返回的结果[{project_id: 22, count: 1}]
      let projectList = []
      //存project的id
      let projectIdList = []
      // console.log('resssss', res)
      if (res.length > 0) {
         res[0].forEach((item) => {
            projectList.push({ project_id: item.project_id, count: Number(item.count) })
            projectIdList.push(item.project_id)
         })
      }
      const projectNameList = await models.ProjectCorrelation.findAll({
         attributes:
            ['id', 'name'],
         where: {
            id: { $in: projectIdList },
            name: {
               [Sequelize.Op.not]: null//有name的结果
            }
            // del: false
         }
      }) || []
      //在ProjectCorrelation中查不到名字，去clickHouse中去查
      const projectNameList1 = await models.ProjectCorrelation.findAll({
         attributes:
            ['id', 'name', 'pepProjectId'],
         where: {
            id: { $in: projectIdList },
            name: {
               [Sequelize.Op.eq]: null//无name的结果
            }
            // del: false
         }
      })
      //存放需要去查询clickHouse的id
      let idList = new Set()
      if (projectNameList1.length) {
         projectNameList1.forEach((item) => {
            idList.add(item.pepProjectId)
         })
      }
      //pepProject名称
      const projectManageName = idList.size ? await clickHouse.projectManage.query(`
         SELECT id,project_name  FROM t_pim_project
           WHERE id IN (${[...idList].join(',')}, -1)
      `).toPromise() : []
      // if (projectList.length) {
      //    projectList.forEach((item) => {
      //       projectManageName
      //    })
      // }
      //存的是{id,projectName}
      let project = []
      if (projectNameList1.length && projectManageName.length) {
         projectManageName.forEach((item) => {
            const pepObj = projectNameList1.find((item1) => { return item1.pepProjectId === item.id })
            project.push({ id: pepObj.id, projectName: item.project_name })
         })
      }
      const resAll = project.concat(projectNameList)
      let mergedArray = []
      if (resAll.length && projectList) {
         mergedArray = projectList.map(obj1 => {
            const matchingObj = resAll.find(obj2 => obj2.id === obj1.project_id);
            return { id: obj1.project_id, pepProjectId: matchingObj.id, projectName: matchingObj.projectName || matchingObj.dataValues.name, count: obj1.count };
         });
      }
      // console.log('ididididid', resAll)
      // console.log('ididididid', project)
      // console.log('ididididid', projectManageName)
      // console.log('ididididid', projectNameList)
      // console.log('ididididid', projectList)

      ctx.status = 200
      ctx.body = mergedArray
   } catch (error) {
      ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
      ctx.status = 400;
      ctx.body = {
         message: '查询维修记录排名失败'
      }
   }
}


async function getMaintenceTotal (ctx) {
   const sequelize = ctx.fs.dc.orm
   const Sequelize = ctx.fs.dc.ORM;
   const { clickHouse } = ctx.app.fs
   const models = ctx.fs.dc.models
   const { startTime, endTime } = ctx.query
   try {
      //所有维修记录
      const res = await sequelize.query(`
      SELECT emrp.project_id,
      count(case when record.status in ('维修中','待维修','维修完成') then record.id end)  incomplete,
      count(case when record.status in ('维修完成') then record.id end) completed
 FROM equipment_maintenance_record  record
     RIGHT JOIN equipment_maintenance_record_project emrp
         on record.id = emrp.equipment_maintenance_record_id
         where report_time BETWEEN :startTime AND :endTime
 GROUP BY emrp.project_id
         `
         , {
            replacements: {
               startTime: moment(startTime).format('YYYY-MM-DD HH:mm:ss '),
               endTime: moment(endTime).format('YYYY-MM-DD HH:mm:ss ')
            }
            //, type: sequelize.QueryTypes.SELECT
         }
      )
      //查询equipment_maintenance_record返回的结果[{project_id: 22,status:'' count: 1}]
      let projectList = []
      //存project的id
      let projectIdList = new Set()
      // console.log('resssss', res)
      if (res.length > 0) {
         res[0].forEach((item) => {
            projectList.push({ project_id: item.project_id, 'incomplete': Number(item.incomplete), completed: Number(item.completed) })
            projectIdList.add(item.project_id)
         })
      }
      // const result = projectList.reduce((acc, curr) => {
      //    if (curr.status === '待维修' || curr.status === '维修中') {
      //       const existingItem = acc.find(item => item.project_id === curr.project_id && item.status === '异常数');
      //       if (existingItem) {
      //          existingItem.count += curr.count;
      //       } else {
      //          acc.push({ project_id: curr.project_id, status: '异常数', count: curr.count });
      //       }
      //    } else if (curr.status === '维修完成') {
      //       const existingItem = acc.find(item => item.project_id === curr.project_id && item.status === '维修数');
      //       if (existingItem) {
      //          existingItem.count += curr.count;
      //       } else {
      //          acc.push({ project_id: curr.project_id, status: '维修数', count: curr.count });
      //       }
      //    }
      //    return acc;
      // }, [])
      //console.log('resssssresult', result)
      const projectNameList = await models.ProjectCorrelation.findAll({
         attributes:
            ['id', 'name'],
         where: {
            id: { $in: [...projectIdList] },
            name: {
               [Sequelize.Op.not]: null//有name的结果
            }
            // del: false
         }
      }) || []
      //在ProjectCorrelation中查不到名字，去clickHouse中去查
      const projectNameList1 = await models.ProjectCorrelation.findAll({
         attributes:
            ['id', 'name', 'pepProjectId'],
         where: {
            id: { $in: [...projectIdList] },
            name: {
               [Sequelize.Op.eq]: null//无name的结果
            }
            // del: false
         }
      })
      //存放需要去查询clickHouse的id
      let idList = new Set()
      if (projectNameList1.length) {
         projectNameList1.forEach((item) => {
            idList.add(item.pepProjectId)
         })
      }
      //pepProject名称
      const projectManageName = idList.size ? await clickHouse.projectManage.query(`
         SELECT id,project_name  FROM t_pim_project
           WHERE id IN (${[...idList].join(',')}, -1)
      `).toPromise() : []
      let project = []
      if (projectNameList1.length && projectManageName.length) {
         projectManageName.forEach((item) => {
            const pepObj = projectNameList1.find((item1) => { return item1.pepProjectId === item.id })
            project.push({ id: pepObj.id, projectName: item.project_name })
         })
      }
      //pg的数据和clcikHouse的数据（名字）合并
      const resAll = project.concat(projectNameList)
      let mergedArray = []
      if (resAll.length && projectList) {
         mergedArray = projectList.map(obj1 => {
            const matchingObj = resAll.find(obj2 => obj2.id === obj1.project_id)
            return {
               id: obj1.project_id, incomplete: obj1.incomplete, completed: obj1.completed, pepProjectId: matchingObj.id,
               projectName: matchingObj.projectName || matchingObj.dataValues.name
            }
         });
      }

      // console.log('ididididid', resAll)
      // console.log('ididididid', project)
      // console.log('ididididid', projectManageName)
      // console.log('ididididid', projectNameList)
      // console.log('ididididid', projectList)
      ctx.status = 200
      ctx.body = mergedArray
   } catch (error) {
      ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
      ctx.status = 400;
      ctx.body = {
         message: '查询维修记录统计失败'
      }
   }


}
async function getEquipmentCategory (ctx) {
   const { startTime, endTime } = ctx.query
   const Sequelize = ctx.fs.dc.ORM
   const models = ctx.fs.dc.models
   try {
      const res = await models.EquipmentMaintenanceRecord.findAll({
         attributes: [
            'equipment_category',
            [Sequelize.fn('COUNT', Sequelize.col('equipment_category')), 'count']
         ],
         where: { reportTime: { $between: [moment(startTime).format('YYYY-MM-DD HH:mm:ss '), moment(endTime).format('YYYY-MM-DD HH:mm:ss ')] } },
         group: ['equipment_category']
      })
      ctx.status = 200
      ctx.body = res

   } catch (error) {
      ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
      ctx.status = 400;
      ctx.body = {
         message: '查询设备类型失败'
      }
   }
}


async function getStatus (ctx) {
   const { startTime, endTime } = ctx.query
   const Sequelize = ctx.fs.dc.ORM
   const models = ctx.fs.dc.models
   try {
      const res = await models.EquipmentMaintenanceRecord.findAll({
         attributes: [
            'status',
            [Sequelize.fn('COUNT', Sequelize.col('status')), 'count']
         ],
         where: { reportTime: { $between: [moment(startTime).format('YYYY-MM-DD HH:mm:ss '), moment(endTime).format('YYYY-MM-DD HH:mm:ss ')] } },
         group: ['status']
      })
      ctx.status = 200
      ctx.body = res

   } catch (error) {
      ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
      ctx.status = 400;
      ctx.body = {
         message: '查询设备类型失败'
      }
   }
}



module.exports = {
   getMaintenceRecordRank, getMaintenceTotal, getEquipmentCategory, getStatus
}