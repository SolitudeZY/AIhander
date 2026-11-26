'use strict';
const moment = require('moment')

async function groupList(ctx) {
   try {
      const { models } = ctx.fs.dc;
      const { userId } = ctx.fs.api
      const res = await models.ProjectGroup.findAll({
         where: {
            pomsUserId: userId
         },
         order: [['id', 'DESC']]
      })

      ctx.status = 200;
      ctx.body = res
   } catch (error) {
      ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
      ctx.status = 400;
      ctx.body = {
         message: typeof error == 'string' ? error : undefined
      }
   }
}

async function groupDetail(ctx) {
   try {
      const { models } = ctx.fs.dc;
      const { groupId } = ctx.params

      const res = await models.ProjectGroup.findOne({
         where: {
            id: groupId
         }
      })

      ctx.status = 200;
      ctx.body = res
   } catch (error) {
      ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
      ctx.status = 400;
      ctx.body = {
         message: typeof error == 'string' ? error : undefined
      }
   }
}

async function editGroup(ctx) {
   try {
      const { models } = ctx.fs.dc;
      const { userId } = ctx.fs.api
      const { id, name, pomsProjectIds = [], percentage } = ctx.request.body

      if (!name || !pomsProjectIds || !pomsProjectIds.length) {
         throw '参数错误！'
      }

      let repeatNameRes = await models.ProjectGroup.findOne({
         where: {
            pomsUserId: userId,
            name,
         }
      })
      let repeatProjectRes = await models.ProjectGroup.findOne({
         where: {
            pomsUserId: userId,
            pomsProjectIds
         }
      })
      if (repeatNameRes && (!id || (id && repeatNameRes.id != id))) {
         throw '已有相同名称的分组信息!'
      }
      if (repeatProjectRes && (!id || (id && repeatProjectRes.id != id))) {
         throw '已有相同项目的分组信息!'
      }

      if (id) {
         await models.ProjectGroup.update({
            name,
            pomsProjectIds,
            percentage
         }, {
            where: {
               id
            }
         })
      } else {
         await models.ProjectGroup.create({
            name,
            pomsProjectIds,
            pomsUserId: userId,
            percentage
         })
      }

      ctx.status = 204;
   } catch (error) {
      ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
      ctx.status = 400;
      ctx.body = {
         message: typeof error == 'string' ? error : undefined
      }
   }
}

async function delGroup(ctx) {
   try {
      const { models } = ctx.fs.dc;

      await models.ProjectGroup.destroy({
         where: {
            id: ctx.query.groupId
         }
      })

      ctx.status = 204;
   } catch (error) {
      ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
      ctx.status = 400;
      ctx.body = {
         message: typeof error == 'string' ? error : undefined
      }
   }
}

async function groupStatistic(ctx) {
   try {
      const { models } = ctx.fs.dc;
      const { userId } = ctx.fs.api
      const { pomsU } = ctx.query
      const { clickHouse } = ctx.app.fs
      const { utils: { judgeSuper, anxinStrucIdRange, parseProcessData, parseJsonString } } = ctx.app.fs
      const sequelize = ctx.fs.dc.orm
      const { database: camWorkflow } = clickHouse.camWorkflow.opts.config

      let userId_ = pomsU || userId
      const progectGroupList = await models.ProjectGroup.findAll({
         where: {
            pomsUserId: userId_
         }
      })
      // 获取在途的运维中台售后问题处理工单数据
      console.log('xx111',moment().format('YYYY-MM-DD HH:mm:ss'))

      // const formRes = await clickHouse.pepEmis.query(
      //    `SELECT 
      //          story.id AS historyId,
      //          story.procinst_id as procinstId,
      //          story.apply_user AS pepUserId,
      //          story.form_data AS formData,
      //          story.submit_form_data AS submitFormData,
      //          story.create_at as createTime,
      //          fform.form_schema AS formSchema,
      //          fprocess.name AS processName,
      //          procin.state_ AS state,
      //          procin.end_time_ as endTime,
      //          fform.id AS formId,
      //          fversion.id AS versionId,
      //          fgroup.name AS groupName 
      //       FROM 
      //          workflow_process_history AS story
      //       INNER JOIN workflow_process_version AS fversion
      //          ON fversion.id = story.version_id
      //       INNER JOIN workflow_process_form AS fform
      //          ON fform.id = fversion.form_id
      //       INNER JOIN workflow_process AS fprocess
      //          ON fprocess.id = fform.process_id
      //       INNER JOIN workflow_group AS fgroup
      //          ON fgroup.id = fprocess.group_id
      //       INNER JOIN ${camWorkflow}.act_hi_procinst AS procin
      //          ON procin.id_ = story.procinst_id
      //            WHERE  procin.end_time_  is  null
      //            AND procin.state_='ACTIVE'
      //          AND fprocess.name = '运维中台售后问题处理工单'`
      // ).toPromise()
      const allProcinsts= await clickHouse.pepEmis.query(`
            SELECT
               id_
            FROM ${camWorkflow}.act_hi_procinst AS procin
             WHERE  procin.end_time_  is  null
               AND procin.business_key_='903' --运维中台售后问题处理工单
                 AND procin.state_='ACTIVE'
         `).toPromise();
      let formRes=[];
      //分批执行
      const batchSize = 100;
      for(let i = 0; i < allProcinsts.length; i += batchSize){
         const batch = allProcinsts.slice(i, i + batchSize);
         const batchFormRes = await clickHouse.pepEmis.query(`
            SELECT  story.form_data as formData,
            fform.form_schema as formSchema
            FROM workflow_process_history AS story
             INNER JOIN workflow_process_version AS fversion
                  ON fversion.id = story.version_id
             INNER JOIN workflow_process_form AS fform
                  ON fform.id = fversion.form_id
             WHERE story.procinst_id IN (${batch.map(procinst => `'${procinst.id_}'`).join(',')})
         `).toPromise();
         formRes.push(...batchFormRes);
      }
      // 获取全部的 poms 项目id 并构建关系
      let pomsProjectIds = new Set()
      for (let group of progectGroupList) {
         for (let projectId of group.pomsProjectIds) {
            pomsProjectIds.add(projectId)
         }
      }
      let pomsProjectIdArr = Array.from(pomsProjectIds)

      const groupProjectRes = await models.ProjectCorrelation.findAll({
         where: {
            id: { $in: pomsProjectIdArr }
         }
      })

      // 获取所有的 安心云项目id
      let anxinProjectIds = new Set()
      let pepmProjectIds = new Set()
      for (let project of groupProjectRes) {
         for (let projectId of project.anxinProjectId) {
            anxinProjectIds.add(projectId)
         }
         if (project.pepProjectId) {
            pepmProjectIds.add(project.pepProjectId)
         }
      }
      let anxinProjectIdArr = Array.from(anxinProjectIds)
      let pepmProjectIdArr = Array.from(pepmProjectIds)

      // 查询pepm项目的客户等级
      let pepmCustomerLevelRes = pepmProjectIdArr.length ? await clickHouse.projectManage.query(
         `
            SELECT t_rpm_customer_level.id AS id, t_rpm_customer_level.name AS name, t_pim_project.id AS projectId
               FROM t_pim_project
                  LEFT JOIN t_rpm_customer
                     ON t_rpm_customer.id = t_pim_project.related_customers_id
                  LEFT JOIN t_rpm_customer_level
                     ON t_rpm_customer_level.id = t_rpm_customer.level
               WHERE t_pim_project.id IN (${pepmProjectIdArr.join(',')},-1)
         `
      ).toPromise() : []
      // pepmCustomerLevelRes = pepmCustomerLevelRes.filter(item => item && item.id > 0)

      // 统计安心云项目下的结构物 
      const strucRes = anxinProjectIdArr.length ? await clickHouse.anxinyun.query(
         `
            SELECT 
               DISTINCT t_structure.id AS strucId, 
               t_project.id AS projectId, 
               t_structure.name AS strucName,
               project_state
            FROM 
               t_project 
            LEFT JOIN
               t_project_structure
                  ON t_project_structure.project = t_project.id
            LEFT JOIN
               t_project_structuregroup
                  ON t_project_structuregroup.project = t_project.id
            LEFT JOIN 
               t_structuregroup_structure
                  ON t_structuregroup_structure.structuregroup = t_project_structuregroup.structuregroup
            LEFT JOIN
               t_project_construction
                  ON t_project_construction.project = t_project.id
            LEFT JOIN
               t_structure_site
                  ON t_structure_site.siteid = t_project_construction.construction
            RIGHT JOIN
               t_structure
                  ON t_structure.id = t_project_structure.structure
                  OR t_structure.id = t_structuregroup_structure.structure
                  OR t_structure.id = t_structure_site.structid
            WHERE 
               project_state != -1 
                  AND
               t_project.id IN (${anxinProjectIdArr.join(',')},-1)
            `
      ).toPromise() : []

      let strucIds = new Set()
      for (let struc of strucRes) {
         strucIds.add(struc.strucId)
      }

      let strucIdArr = Array.from(strucIds)
      const deviceOffTimeRes = strucIdArr.length ? await models.StructureOff.findAll({
         where: {
            structure: { $in: strucIdArr }
         }
      }) : []
      const alarmRes = strucIdArr.length ? await clickHouse.dataAlarm.query(
         `
           SELECT StructureId,count(StructureId) AS alarmCount
            FROM alarms
            WHERE StructureId IN (${strucIdArr.join(',')}, -1)
               AND AlarmGroupUnit = 8
               AND StartTime >= '${moment().subtract(1, 'days').format('YYYY-MM-DD HH:mm:ss')}'
            group by StructureId 
         `
      ).toPromise() : []

      let rslt = []
      // progectGroupList 是自定义分组信息
      for (let pg of progectGroupList) {
         let strucCount = 0
         let maxOffLineTime = 0
         let todayAlarms = 0
         let pepmCustomerLevels = []
         let activeOrderCount = 0//流转工单数量(未完成的)
         if (pg.pomsProjectIds && pg.pomsProjectIds.length) {
            for (let i of pg.pomsProjectIds) {
               if (formRes && formRes.length > 0) {
                  for (let f of formRes) {
                     const parseData = f.formSchema && parseProcessData({
                        formSchema: parseJsonString(f.formSchema),
                        formData: parseJsonString(f.formData)
                     })
                     if (parseData && parseData.pomsProjectId.value === i) {
                        activeOrderCount += 1
                     }
                  }
               }
            }

         }
         // groupProjectRes 是poms项目信息
         let anxinProjectCount = groupProjectRes.reduce((count, gp) => {
            if (pg.pomsProjectIds.some(id => gp.id == id)) {
               // 如果 pg 分组信息 存储的 pomsProjectIds 运维项目id 和 真正的 groupProjectRes 运维项目id 相等
               // gp.anxinProjectId 就是对应的 安心云的项目 id 集
               count += gp.anxinProjectId.length
               //
               let strucIdArr_ =
                  strucRes.filter(s => gp.anxinProjectId.includes(s.projectId))
               strucCount += strucIdArr_.length
               //所有结构物的告警
               const ss = alarmRes.filter(p => strucIdArr_.some(q => q.strucId == p.StructureId))
               todayAlarms = ss.reduce((p, c) => {
                  return p + c.alarmCount
               }, 0)
               //
               if (gp.pepProjectId) {
                  let corLevel = pepmCustomerLevelRes.find(p => p.projectId == gp.pepProjectId)
                  if (corLevel && corLevel.id > 0) {
                     pepmCustomerLevels.push(corLevel)
                  }
               }
               //
               for (let { dataValues: off } of deviceOffTimeRes) {
                  if (strucIdArr_.some((s) => s.strucId == off.structure)) {
                     if (off.offline > maxOffLineTime) {
                        maxOffLineTime = off.offline
                     }
                  }
               }
            }
            return count
         }, 0)
         pepmCustomerLevels.sort((a, b) => a.id - b.id)
         rslt.unshift({
            ...pg.dataValues,
            strucCount,
            todayAlarms,
            maxOffLineTime,
            anxinProjectCount,
            level: pepmCustomerLevels.length ? pepmCustomerLevels[0] : null,
            activeOrderCount
         })
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

async function groupStatisticOnline(ctx) {
   try {
      const { models } = ctx.fs.dc;
      const { userId } = ctx.fs.api
      const { groupId } = ctx.query
      const sequelize = ctx.fs.dc.orm
      const { clickHouse } = ctx.app.fs

      const pomsProjectRes = await sequelize.query(`
         SELECT project_correlation.anxin_project_id
            FROM project_group
            JOIN project_correlation 
               ON project_correlation.id = ANY(project_group.poms_project_ids)
            WHERE project_group.id = ${groupId};
      `)

      const anxinProjectIds = new Set()
      for (let pomsProject of (pomsProjectRes[0] || [])) {
         for (let pid of pomsProject.anxin_project_id)
            anxinProjectIds.add(pid)
      }

      // 统计安心云项目下的结构物 
      const strucRes = anxinProjectIds.size ? await clickHouse.anxinyun.query(
         `
            SELECT 
               DISTINCT t_structure.id AS id, 
               t_project.id AS projectId, 
               t_structure.name AS name,
               project_state
            FROM 
               t_project 
            LEFT JOIN
               t_project_structure
                  ON t_project_structure.project = t_project.id
            LEFT JOIN
               t_project_structuregroup
                  ON t_project_structuregroup.project = t_project.id
            LEFT JOIN 
               t_structuregroup_structure
                  ON t_structuregroup_structure.structuregroup = t_project_structuregroup.structuregroup
            LEFT JOIN
               t_project_construction
                  ON t_project_construction.project = t_project.id
            LEFT JOIN
               t_structure_site
                  ON t_structure_site.siteid = t_project_construction.construction
            RIGHT JOIN
               t_structure
                  ON t_structure.id = t_project_structure.structure
                  OR t_structure.id = t_structuregroup_structure.structure
                  OR t_structure.id = t_structure_site.structid
            WHERE 
               project_state != -1 
                  AND
               t_project.id IN (${[...anxinProjectIds].join(',')},-1)
            `
      ).toPromise() : []

      let strucIds = new Set()
      for (let struc of strucRes) {
         strucIds.add(struc.id)
      }
      let strucIdArr = Array.from(strucIds)

      // 查中断时间
      const maxOfflineTimeRes = strucIdArr.length ?
         await models.StructureOff.findAll({
            where: {
               structure: { $in: strucIdArr },
               state: 0,
               offline: { $gt: 720 }
            }
         }) : []

      // 查在线率
      const strucOnlineClient = ctx.app.fs.esclient.strucOnline
      let arr = [1, 2, 3, 4, 5, 6, 7]
      let onlineRes = {
         hits: {
            hits: []
         }
      }
      if (strucIdArr.length) {
         for (let i = 0; i < arr.length; i++) {
            const res = await strucOnlineClient.search({
               index: strucOnlineClient.config.index,
               type: strucOnlineClient.config.type,
               body: {
                  "query": {
                     "bool": {
                        "filter": [
                           {
                              "range": {
                                 "collect_time": {
                                    "gte": `${moment().subtract(24 * (i + 1) + 8, 'hours').format('YYYY-MM-DDTHH:mm:ss.SSS')}Z`,
                                    // "gte": "2023-08-24T08:00:00.000Z",
                                    "lt": `${moment().subtract(8 + 24 * i, 'hours').format('YYYY-MM-DDTHH:mm:ss.SSS')}Z`
                                 }
                              }
                           },
                           {
                              "terms": {
                                 "structure": strucIdArr,
                                 // "structure": [1, 2, 3]
                              }
                           }
                        ]
                     }
                  },
                  "sort": [
                     {
                        "collect_time": {
                           "order": "asc"
                        }
                     }
                  ],
                  "size": 10000
               }
            })
            onlineRes.hits.hits = [...onlineRes.hits.hits, ...res.hits.hits]

         }
      }


      for (let struc of strucRes) {
         let curOnline =
            onlineRes.hits.hits
               .filter((h) => h._source.structure == struc.id)
               // .sort((a, b) => {
               //    return a._source.collect_time - b._source.collect_time
               // })
               .map(s => {
                  return {
                     ...s._source,
                     rate: s._source.online / s._source.total * 100
                  }
               })
         let curOffline = maxOfflineTimeRes.find((o) => o.structure == struc.id)
         struc.online = curOnline
         struc.offline = curOffline || {}
      }

      ctx.status = 200;
      ctx.body = strucRes;
   } catch (error) {
      ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
      ctx.status = 400;
      ctx.body = {
         message: typeof error == 'string' ? error : undefined
      }
   }
}

async function groupStatisticAlarm(ctx) {
   try {
      const { models } = ctx.fs.dc;

      const { groupId } = ctx.query
      const sequelize = ctx.fs.dc.orm
      const { clickHouse } = ctx.app.fs

      const pomsProjectRes = await sequelize.query(`
         SELECT project_correlation.anxin_project_id
            FROM project_group
            JOIN project_correlation 
               ON project_correlation.id = ANY(project_group.poms_project_ids)
            WHERE project_group.id = ${groupId};
      `)

      const anxinProjectIds = new Set()
      for (let pomsProject of (pomsProjectRes[0] || [])) {
         for (let pid of pomsProject.anxin_project_id)
            anxinProjectIds.add(pid)
      }

      // 统计安心云项目下的结构物 
      const strucRes = anxinProjectIds.size ? await clickHouse.anxinyun.query(
         `
            SELECT 
               DISTINCT t_structure.id AS id, 
               t_project.id AS projectId, 
               t_structure.name AS name,
               project_state
            FROM 
               t_project 
            LEFT JOIN
               t_project_structure
                  ON t_project_structure.project = t_project.id
            LEFT JOIN
               t_project_structuregroup
                  ON t_project_structuregroup.project = t_project.id
            LEFT JOIN 
               t_structuregroup_structure
                  ON t_structuregroup_structure.structuregroup = t_project_structuregroup.structuregroup
            LEFT JOIN
               t_project_construction
                  ON t_project_construction.project = t_project.id
            LEFT JOIN
               t_structure_site
                  ON t_structure_site.siteid = t_project_construction.construction
            RIGHT JOIN
               t_structure
                  ON t_structure.id = t_project_structure.structure
                  OR t_structure.id = t_structuregroup_structure.structure
                  OR t_structure.id = t_structure_site.structid
            WHERE 
               project_state != -1 
                  AND
               t_project.id IN (${[...anxinProjectIds].join(',')},-1)
            `
      ).toPromise() : []

      let strucIds = new Set()
      for (let struc of strucRes) {
         strucIds.add(struc.id)
      }
      let strucIdArr = Array.from(strucIds)

      // 查一周内超阈值告警的个数
      const alarmRes = strucIdArr.length ? await clickHouse.dataAlarm.query(
         `
           SELECT StructureId,count(StructureId) AS alarmCount
            FROM alarms
            WHERE StructureId IN (${strucIdArr.join(',')}, -1)
               AND AlarmGroupUnit = 8
               AND StartTime >= '${moment().subtract(7, 'days').format('YYYY-MM-DD HH:mm:ss')}'
            group by StructureId 
         `
      ).toPromise() : []

      const alarmDealRes = strucIdArr.length ? await clickHouse.dataAlarm.query(
         `
           SELECT StructureId,count(StructureId) AS alarmCount
            FROM alarms
            WHERE StructureId IN (${strucIdArr.join(',')}, -1)
               AND AlarmGroupUnit = 8 
               AND State = 4
               AND StartTime >= '${moment().subtract(30, 'days').format('YYYY-MM-DD HH:mm:ss')}'
            group by StructureId 
         `
      ).toPromise() : []

      for (let struc of strucRes) {
         let corAlarm = alarmRes.find((o) => o.StructureId == struc.id)
         let corDealAlarm = alarmDealRes.find((o) => o.StructureId == struc.id)
         struc.alarmCount = corAlarm ? corAlarm.alarmCount : 0
         struc.dealAlarmCount = corDealAlarm ? corDealAlarm.alarmCount : 0
      }
      strucRes.sort((a, b) => b.alarmCount - a.alarmCount)

      ctx.status = 200;
      ctx.body = strucRes;
      // ctx.body = [{
      //    id: 1,
      //    name: '测试结构物1',
      //    alarmCount: 128,
      //    dealAlarmCount: 23
      // }];
   } catch (error) {
      ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
      ctx.status = 400;
      ctx.body = {
         message: typeof error == 'string' ? error : undefined
      }
   }
}

async function groupProject(ctx) {
   try {
      const { models } = ctx.fs.dc;

      const { groupId } = ctx.query
      const { clickHouse } = ctx.app.fs
      const findOne = await models.ProjectGroup.findOne({ where: { id: groupId } })
      const proRes = await models.ProjectCorrelation.findAll({ where: { id: { $in: findOne.pomsProjectIds } } })
      let pepProjectIds = new Set()

      for (let p of proRes) {
         if (p.pepProjectId) {
            pepProjectIds.add(p.pepProjectId)
         }
      }

      const pepProjectRes = pepProjectIds.size ?
         await clickHouse.projectManage.query(
            `
         SELECT 
            t_pim_project.id AS id, 
            t_pim_project.project_name AS project_name, 
            t_pim_project.isdelete AS isdelete,
            t_pim_project_construction.construction_status_id AS construction_status_id, 
            t_pim_project_state.construction_status AS construction_status 
         FROM t_pim_project 
            LEFT JOIN t_pim_project_construction 
               ON t_pim_project.id = t_pim_project_construction.project_id 
            LEFT JOIN t_pim_project_state 
               ON t_pim_project_construction.construction_status_id = t_pim_project_state.id 
            WHERE id IN (${[...pepProjectIds].join(',')}, -1)
         `
         ).toPromise() :
         []

      for (let p of proRes) {
         const corPro = pepProjectRes.find(pp => pp.id == p.pepProjectId) || {}
         p.dataValues.pepProjectName = corPro.project_name
      }
      ctx.status = 200;
      ctx.body = proRes;
   } catch (error) {
      ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
      ctx.status = 400;
      ctx.body = {
         message: typeof error == 'string' ? error : undefined
      }
   }
}


async function getProjectWorkOrders(ctx) {
   try {
      // 计算一个月前的日期
      const oneMonthAgo = moment().subtract(1, 'months').toDate()
      const { models } = ctx.fs.dc
      const sequelize = ctx.fs.dc.ORM
      const { projectIds } = ctx.query
      if (projectIds && projectIds.length) {
         const projectIdsArr = projectIds.split(',').map(Number)
         const res = await models.FormDataTable.findAll({
            attributes: [
               'projectId',
               [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
            ],
            where: {
               projectId: {
                  $in: projectIdsArr,
               },
               startTime: {
                  $gte: oneMonthAgo,
               },
            },
            group: ['projectId'],
            order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']],
         })
         ctx.body = res
         ctx.status = 200
      } else {
         ctx.body = '没有查询到数据'
         ctx.status = 204
      }

   } catch (error) {
      ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
      ctx.status = 400;
      ctx.body = {
         message: typeof error == 'string' ? error : undefined
      }
   }
}

async function getWorkOrdersRepairRank(ctx) {
   try {
      const oneMonthAgo = moment().subtract(1, 'months').toDate()
      const { models } = ctx.fs.dc
      const sequelize = ctx.fs.dc.ORM
      const { projectIds } = ctx.query

      if (projectIds && projectIds.length) {
         const res = await models.FormDataTable.findAll({
            where: {
               projectId: {
                  $in: projectIds.split(',').map(Number)
               },
               startTime: {
                  $gte: oneMonthAgo,
               }
            },
            order: [
               [sequelize.literal('(EXTRACT(EPOCH FROM "end_time" - "start_time"))'), 'DESC']
            ]
         })
         ctx.body = res
         ctx.status = 200
      } else {
         ctx.body = '没有查询到信息'
         ctx.status = 204
      }






   } catch (error) {
      ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
      ctx.status = 400;
      ctx.body = {
         message: typeof error == 'string' ? error : undefined
      }
   }
}

async function getworkOrdersAvgTimes(ctx) {
   try {
      // 计算一个月前的日期
      const oneMonthAgo = moment().subtract(1, 'months').toDate()
      const { models } = ctx.fs.dc
      const sequelize = ctx.fs.dc.ORM
      const { projectIds } = ctx.query
      if (projectIds && projectIds.length) {

         const res = await models.FormDataTable.findAll({
            where: {
               projectId: {
                  $in: projectIds.split(',').map(Number)
               },
               startTime: {
                  $gte: oneMonthAgo,
               }
            },
            attributes: [
               'project_id',
               [
                  sequelize.literal('AVG(EXTRACT(EPOCH FROM "end_time" + INTERVAL \'8 hours\' - "start_time"))'),
                  'avgTime',
               ],
            ],
            group: ['project_id'],
            order: [[sequelize.literal('AVG(EXTRACT(EPOCH FROM "end_time" + INTERVAL \'8 hours\' - "start_time"))'), 'DESC']],
            limit: 5,
         })
         ctx.body = res
         ctx.status = 200
      } else {
         ctx.body = '没有查询到信息'
         ctx.status = 204
      }
   } catch (error) {
      ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
      ctx.status = 400;
      ctx.body = {
         message: typeof error == 'string' ? error : undefined
      }
   }

}

module.exports = {
   groupList,
   groupDetail,
   editGroup,
   delGroup,
   groupStatistic,
   groupStatisticOnline,
   groupStatisticAlarm,
   groupProject,
   getProjectWorkOrders,
   getWorkOrdersRepairRank,
   getworkOrdersAvgTimes
};