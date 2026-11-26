'use strict';
const moment = require('moment');

async function personnelApp (ctx) {
   try {
      const models = ctx.fs.dc.models;
      const { clickHouse } = ctx.app.fs
      const sequelize = ctx.fs.dc.orm;
      const { userId, pepUserId, userInfo, pepUserInfo } = ctx.fs.api
      const { pepId } = ctx.query

      const excludeField = ['lastInTime', 'inTimes', 'onlineDuration', 'lastInAddress', 'deleted', 'updateTime']

      let findOption = {
         attributes: {
            exclude: excludeField,
            // include: [[sequelize.fn('array_length', sequelize.col('role')), 'roleCount']]
         },
         where: {
            deleted: false,
            $or: [{
               $not: {
                  role: { $contained: ['SuperAdmin', 'admin'] }
               }
            },
            sequelize.where(sequelize.fn('cardinality', sequelize.col('role')), 0)],
            // $not: {
            //    role: { $contained: ['SuperAdmin', 'admin'] }
            // }
         },
         order: [['updateTime', 'DESC']]
      }

      const userRes = await models.User.findAndCountAll(findOption)

      const adminRes = await models.User.findAll({
         where: {
            role: { $contains: ['admin'] }
         },
         attributes: {
            exclude: excludeField,
         },
         order: [['updateTime', 'DESC']]
      })

      let userIds = new Set()
      let pomsProjectIds = new Set()
      for (let u of userRes.rows.concat(adminRes)) {
         userIds.add(u.pepUserId)
         for (let pid of u.correlationProject) {
            pomsProjectIds.add(pid)
         }
      }
      // 查用户所属的项企pep的部门、人员信息
      let userPepRes = userIds.size ?
         await clickHouse.pepEmis.query(`
            SELECT DISTINCT 
               user.id AS id, "user"."name" AS name, department.name AS depName, department.id AS depId 
            FROM department_user 
               LEFT JOIN user 
                  ON department_user.user=user.id 
               LEFT JOIN department 
                  ON department.id=department_user.department 
            WHERE 
                  user.id IN (${[...userIds].join(',')}, -1) 
               AND department.delete='0'`
         ).toPromise() :
         []

      // 查用户绑定的当前系统的项目 id
      let pomsProjectRes = await models.ProjectCorrelation.findAll({
         where: {
            id: { $in: [...pomsProjectIds] },
            // del: false
         }
      })
      // 获取响应的绑定的 项企项目的 id
      let pepPojectIds = new Set()
      for (let p of pomsProjectRes) {
         if (p.pepProjectId && !isNaN(p.pepProjectId)) {
            pepPojectIds.add(p.pepProjectId)
         }
      }

      // 查对应的项企项目信息
      let pepProjectRes = pepPojectIds.size ?
         await clickHouse.projectManage.query(`
            SELECT id, project_name, isdelete FROM t_pim_project WHERE id IN (${[...pepPojectIds].join(',')}, -1)
         `).toPromise() :
         []

      // 遍历用户并将查到的信息拼合
      for (let u of userRes.rows.concat(adminRes)) {
         // 用户信息
         const corUsers = userPepRes.filter(up => up.id == u.pepUserId)
         u.dataValues.name = corUsers.length ? corUsers[0].name : ''
         u.dataValues.departments = corUsers.length ? corUsers.map(cu => {
            return {
               name: cu.depName,
               id: cu.depId
            }
         }) : []
         // pep项目信息
         u.dataValues.correlationProject = u.dataValues.correlationProject.map(cpid => {
            let returnData = {
               id: cpid,
            }
            const corPomsProject = pomsProjectRes.find(ppr => ppr.id == cpid)
            if (corPomsProject) {
               returnData.name = corPomsProject.name
               returnData.del = corPomsProject.del
               if (corPomsProject.pepProjectId) {
                  returnData.pepProjectId = corPomsProject.pepProjectId
                  const corPepProject = pepProjectRes.find(ppr => ppr.id == corPomsProject.pepProjectId)
                  if (corPepProject) {
                     returnData.pepProjectName = corPepProject.project_name
                     returnData.pepIsdelete = corPepProject.isdelete
                  }
               }
            }
            return returnData
         })
      }




      let findOptions = {
         where: {
            del: false
         },
         order: [['updateTime', 'desc']],
         attributes: ['id', 'pepProjectId', 'name', 'anxinProjectId'],
         distinct: true,
         include: {
            model: models.App,
         }
      }
      if (!userInfo.role.includes('SuperAdmin') && !userInfo.role.includes('admin')) {
         findOptions.where.id = { $in: userInfo.correlationProject }
      }
      if (pepId) {
         findOptions.where.id = { $in: pepId.split(',') }
      }

      const proRes = await models.ProjectCorrelation.findAndCountAll(findOptions)

      let pepProjectIds = new Set()
      let anxinProjectIds = new Set()
      for (let p of proRes.rows) {
         if (p.pepProjectId) {
            pepProjectIds.add(p.pepProjectId)
         }
         for (let ap of p.anxinProjectId) {
            if (ap) {
               anxinProjectIds.add(ap)
            }
         }
      }
      const pepProjectRess = pepProjectIds.size ?
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

      for (let p of proRes.rows) {
         const corPro = pepProjectRess.find(pp => pp.id == p.pepProjectId) || {}
         p.dataValues.pepProjectName = corPro.project_name
         p.dataValues.pepProjectIsDelete = corPro.isdelete

         delete p.dataValues.anxinProjectId
      }

      let webApp = []
      let appproRes = proRes.rows.filter(v => v.dataValues.pepProjectIsDelete != 1).map(r => {
         if (r.dataValues.apps.length > 0) {
            r.dataValues.apps.map(vv => {
               if (!webApp.map(n => n.name).includes(vv.dataValues.name)) {
                  webApp.push({ name: vv.dataValues.name, url: vv.dataValues.url })
               }
            })
         }
      })


      let personnel = userRes.rows.filter(r => r.correlationProject.length > 0)

      if (pepId) {
         let pepIds = pepId.split(',')
         personnel = personnel.filter(r => r.dataValues.correlationProject.map(v => v.id).some(pepId => pepIds.includes(pepId)))
      }

      ctx.status = 200
      ctx.body = {
         personnel: personnel.map(v => ({ name: v.dataValues.name, department: v.dataValues.departments.map(r => r.name) })),
         webApp: webApp
      }
   } catch (error) {
      ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
      ctx.status = 400;
      ctx.body = {

      }
   }
}

async function problem (ctx) {
   try {
      const { models } = ctx.fs.dc;
      const { clickHouse } = ctx.app.fs
      const { utils: { pomsProjectRange, anxinStrucIdRange } } = ctx.app.fs
      const { database: anxinyun } = clickHouse.anxinyun.opts.config

      const { pepProjectId, limit = 50, page = 0 } = ctx.query

      let anxinStruc = await anxinStrucIdRange({
         ctx, pepProjectId
      })
      let pomsProject = await pomsProjectRange({
         ctx, pepProjectId,
      })
      const pomsProjectIds = pomsProject.map(p => p.id)
      let whereOption = []

      if (anxinStruc.length) {
         const anxinStrucIds = anxinStruc.map(a => a.strucId)
         whereOption.push(`alarms.StructureId IN (${anxinStrucIds.join(",")}, -1)`)
         const alarmRes = await clickHouse.dataAlarm.query(`
            SELECT 
               AlarmId,State,AlarmGroup,AlarmGroupUnit,SourceName,StartTime,${anxinyun}.t_alarm_group_unit.name AS typeName
            FROM  alarms 
            LEFT JOIN ${anxinyun}.t_alarm_group_unit
             ON ${anxinyun}.t_alarm_group_unit.id = alarms.AlarmGroupUnit
            ${whereOption.length ? 'WHERE ' + whereOption.join(' AND ') + ' AND ' + 'alarms.State < 3' : ''}
            ${limit ? 'LIMIT ' + limit : ''}
            ${limit && page ? 'OFFSET ' + parseInt(limit) * parseInt(page) : ''}
         `).toPromise();
         alarmRes.forEach(ar => {
            switch (ar.AlarmGroup) {
               case 1:
                  ar.groupName = '数据中断'
                  ar.url = '/problem/dataAlarm/dataLnterrupt'
                  break;
               case 2:
                  ar.groupName = '数据异常'
                  ar.url = '/problem/dataAlarm/dataAbnormal'
                  break;
               case 3:
                  ar.groupName = '策略命中'
                  ar.url = '/problem/dataAlarm/strategyHit'
                  break;
               default:
                  ar.groupName = '设备异常'
                  ar.url = '/problem/deviceAlarm/deviceAbnormal'
                  break;
            }
         })





         const video = anxinStrucIds.length ? await clickHouse.vcmp.query(
            `
            SELECT         
                  cameraAlarm.cameraId AS cameraId,
                  cameraAlarm.cameraName AS cameraName,
                  cameraAlarm.alarmId AS alarmId,
                  cameraAlarm.createTime AS createTime,              
                  cameraAlarm.confirmTime AS confirmTime
               FROM
                  (
                     SELECT
                           camera.id AS cameraId,                      
                           camera.name AS cameraName,
                           camera_status_alarm.id AS alarmId,
                           camera_status_alarm.create_time AS createTime,
                           camera_status_alarm.platform AS platform,
                           camera_status_alarm.status_id AS statusId,
                           camera_status_alarm.serial_no AS cameraSerialNo,
                           camera_status_alarm.channel_no AS cameraChannelNo,                     
                           camera_status_alarm.confirm_time AS confirmTime
                        FROM camera_status_alarm
                        INNER JOIN camera
                           ON camera.serial_no = camera_status_alarm.serial_no
                           AND camera.channel_no = camera_status_alarm.channel_no                    
                        WHERE 
                           camera.delete = '0' 
                           AND camera.recycle_time is null
                        AND alarmId IN (
                           SELECT camera_status_alarm.id AS alarmId 
                           FROM camera_status_alarm
                           RIGHT JOIN ${anxinyun}.t_video_ipc
                              ON toString(${anxinyun}.t_video_ipc.channel_no) = camera_status_alarm.channel_no
                              AND ${anxinyun}.t_video_ipc.serial_no = camera_status_alarm.serial_no
                              ${`WHERE ${anxinyun}.t_video_ipc.structure IN (${anxinStrucIds.join(',')}, -1)`}
                        )
                        ${limit ? 'LIMIT ' + limit : ''}
                        ${limit && page ? 'OFFSET ' + parseInt(limit) * parseInt(page) : ''}
                  ) AS cameraAlarm
               LEFT JOIN camera_status
                  ON cameraAlarm.platform = camera_status.platform
                  AND cameraAlarm.statusId = camera_status.id
               LEFT JOIN camera_status_resolve
                  ON camera_status_resolve.status_id = camera_status.id
               LEFT JOIN ${anxinyun}.t_video_ipc AS anxinIpc
                  ON toString(anxinIpc.channel_no) = cameraAlarm.cameraChannelNo
                  AND anxinIpc.serial_no = cameraAlarm.cameraSerialNo
               LEFT JOIN ${anxinyun}.t_video_ipc_station AS anxinIpcStation
                  ON anxinIpcStation.ipc = anxinIpc.id
               WHERE 
                 cameraAlarm.confirmTime  is null
            `
         ).toPromise() : []

         let returnD = []
         let positionD = {}
         // 每个设备一个告警
         for (let a of video) {
            if (!positionD[a.cameraId]) {
               let d = {
                  cameraId: a.cameraId,
                  SourceName: a.cameraName,
                  StartTime: a.createTime,
                  alarmId: a.alarmId,
               }
               returnD.push(d)
               positionD[a.cameraId] = {
                  positionReturnD: returnD.length - 1
               }
            }
         }
         returnD.forEach(v => {
            v.groupName = '视频异常'
            v.url = '/problem/dataAlarm/videoAbnormal'
         })



         let findOption = {
            where: {
               '$app->projectCorrelations.id$': {
                  $in: pomsProjectIds
               },
               confirmTime: null
            },
            attributes: ['createTime', 'type'],
            include: [{
               model: models.App,
               where: {

               },
               attributes: ['id', 'name'],
               include: [{
                  model: models.ProjectCorrelation,
                  where: {

                  },
                  attributes: ['id'],
               }]
            }]
         }
         const listRes = await models.AppAlarm.findAndCountAll(findOption)
         let app = listRes.rows.map(v => ({ StartTime: v.createTime, SourceName: v.app.name, type: v.type }))
         let typeData = { element: '元素异常', apiError: "接口报错", timeout: '加载超时' }
         app.forEach(v => {
            v.groupName = '应用异常'
            v.url = '/problem/useAlarm/useAbnormal',
               v.typeName = typeData[v.type]
         })

         let sum = [...alarmRes, ...returnD, ...app]
         sum.sort((a, b) => {
            if (moment(a.StartTime).isBefore(b.StartTime)) {
               return 1
            } else {
               return -1
            }
         })
         ctx.status = 200;
         ctx.body = sum
      } else {
         ctx.body = []
      }
      ctx.status = 200;
   } catch (error) {
      ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`)
      ctx.status = 400;
      ctx.body = {
         message: typeof error == 'string' ? error : undefined
      }
   }
}

async function getAlarmData (ctx) {
   try {
      const { models } = ctx.fs.dc;
      const { clickHouse } = ctx.app.fs
      const { utils: { judgeSuper, anxinStrucIdRange } } = ctx.app.fs
      const { database: anxinyun } = clickHouse.anxinyun.opts.config

      const { pepProjectId, startTime } = ctx.query

      let anxinStruc = await anxinStrucIdRange({ ctx, pepProjectId })
      let whereOption = []
      if (anxinStruc.length) {
         const anxinStrucIds = anxinStruc.map(a => a.strucId)
         whereOption.push(`alarms.StructureId IN (${anxinStrucIds.join(",")})`)

         if (startTime) {
            whereOption.push(`alarms.StartTime  >= '${moment(startTime).format('YYYY-MM-DD HH:mm:ss')}'`)
         }

         const alarmRes = await clickHouse.dataAlarm.query(`
            SELECT 
              alarm.alarms.State AS State,
              SourceName, StartTime, EndTime,AlarmGroup,AlarmGroupUnit,
              alarms.StructureId AS StructureId,
              ${anxinyun}.t_structure.name AS StructureName
               FROM 
                 alarms 
              LEFT JOIN ${anxinyun}.t_structure 
               ON ${anxinyun}.t_structure.id = alarms.StructureId
            ${whereOption.length ? 'WHERE ' + whereOption.join(' AND ') : ''}
              
         `).toPromise();

         alarmRes.forEach(ar => {
            ar.pomsProject = (
               anxinStruc.find(as => as.strucId == ar.StructureId) ||
               {
                  pomsProject: [
                     // TODO: 开发临时添加
                  ]
               }
            ).pomsProject
         })

         ctx.status = 200;
         ctx.body = alarmRes
      } else {
         ctx.body = []
      }
      ctx.status = 200;
   } catch (error) {
      ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
      ctx.status = 400;
      ctx.body = {
         message: typeof error == 'string' ? error : undefined
      }
   }
}

async function getAlarmVideo (ctx) {
   try {
      const { models } = ctx.fs.dc;
      const { clickHouse } = ctx.app.fs
      const { utils: { judgeSuper, anxinStrucIdRange } } = ctx.app.fs
      const { database: anxinyun } = clickHouse.anxinyun.opts.config
      const { pepProjectId, startTime } = ctx.query

      let anxinStruc = await anxinStrucIdRange({ ctx, pepProjectId })
      const anxinStrucIds = anxinStruc.map(a => a.strucId)
      let statusAlarmWhereOption = []
      if (startTime) {
         statusAlarmWhereOption.push(`camera_status_alarm.create_time  >= '${moment(startTime).format('YYYY-MM-DD HH:mm:ss')}'`)
      }
      const queryStr = `
         SELECT         
            cameraAlarm.cameraId AS cameraId,
            cameraAlarm.venderId AS venderId,
               cameraAlarm.cameraSerialNo AS cameraSerialNo,
               cameraAlarm.cameraChannelNo AS cameraChannelNo,
            cameraAlarm.alarmId AS alarmId,
            cameraAlarm.statusId AS statusId,
            cameraAlarm.createTime AS createTime,
            cameraAlarm.updateTime AS updateTime,
            cameraAlarm.platform AS platform,
            cameraAlarm.confirmContent AS confirmContent,
            cameraAlarm.confirmTime AS confirmTime,
            ${'cameraAlarm.autoRestore AS autoRestore,'}
            camera_status_resolve.id AS resolveId,
            camera_status.describe AS statusDescribe,
            camera_status_resolve.resolve AS resolve,
            "gbCamera".online AS cameraOnline,
            secret_yingshi.token AS yingshiToken,
               anxinIpc.name AS anxinIpcPosition,
               anxinStation.id AS anxinStationId,
               anxinStation.name AS anxinStationName,
               anxinStruc.name AS strucName,
               anxinStruc.id AS strucId
         FROM
            (
               SELECT
                     camera.id AS cameraId,
                     camera.gb_id AS gbId,
                     camera.vender_id AS venderId,
                     camera.yingshi_secret_id AS yingshiSecretId,
                     camera_status_alarm.id AS alarmId,
                     camera_status_alarm.create_time AS createTime,
                     camera_status_alarm.update_time AS updateTime,
                     camera_status_alarm.platform AS platform,
                     camera_status_alarm.status_id AS statusId,
                     camera_status_alarm.serial_no AS cameraSerialNo,
                     camera_status_alarm.channel_no AS cameraChannelNo,
                     camera_status_alarm.confirm AS confirmContent,
                     ${'camera_status_alarm.auto_restore AS autoRestore,'}
                     camera_status_alarm.confirm_time AS confirmTime
                  FROM camera_status_alarm
                  INNER JOIN camera
                     ON camera.serial_no = camera_status_alarm.serial_no
                     AND camera.channel_no = camera_status_alarm.channel_no
                  LEFT JOIN vender
                     ON vender.id = camera.vender_id
                  WHERE 
                     camera.delete = '0' 
                     AND camera.recycle_time is null
                     ${statusAlarmWhereOption.length ? 'AND ' + statusAlarmWhereOption.join(' AND ') : ''}
                  AND alarmId IN (
                     SELECT camera_status_alarm.id AS alarmId 
                     FROM camera_status_alarm
                     RIGHT JOIN ${anxinyun}.t_video_ipc
                        ON toString(${anxinyun}.t_video_ipc.channel_no) = camera_status_alarm.channel_no
                        AND ${anxinyun}.t_video_ipc.serial_no = camera_status_alarm.serial_no
                        ${`WHERE ${anxinyun}.t_video_ipc.structure IN (${anxinStrucIds.join(',')})`}
                  )
            ) AS cameraAlarm
         LEFT JOIN camera_status
            ON cameraAlarm.platform = camera_status.platform
            AND cameraAlarm.statusId = camera_status.id
         LEFT JOIN camera_status_resolve
            ON camera_status_resolve.status_id = camera_status.id
         LEFT JOIN "gbCamera"
            ON "gbCamera".id = cameraAlarm.gbId
         LEFT JOIN "secret_yingshi"
            ON "secret_yingshi".id = cameraAlarm.yingshiSecretId

         LEFT JOIN ${anxinyun}.t_video_ipc AS anxinIpc
            ON toString(anxinIpc.channel_no) = cameraAlarm.cameraChannelNo
            AND anxinIpc.serial_no = cameraAlarm.cameraSerialNo
         LEFT JOIN ${anxinyun}.t_structure AS anxinStruc
            ON anxinStruc.id = anxinIpc.structure
            AND anxinStruc.id IN (${anxinStrucIds.join(',')})
          
         LEFT JOIN ${anxinyun}.t_video_ipc_station AS anxinIpcStation
            ON anxinIpcStation.ipc = anxinIpc.id
         LEFT JOIN ${anxinyun}.t_sensor AS anxinStation
            ON anxinStation.id = anxinIpcStation.station
      `
      const alarmRes = anxinStrucIds.length ? await clickHouse.vcmp.query(
         queryStr
      ).toPromise() : []
      let returnD = []
      let positionD = {}
      // 每个设备一个告警
      for (let a of alarmRes) {
         if (positionD[a.cameraId]) {
         } else {
            let d = {
               createTime: a.createTime,
               confirmTime: a.confirmTime,
               statusId: a.statusId,
            }
            returnD.push(d)
            positionD[a.cameraId] = {
               positionReturnD: returnD.length - 1
            }
         }
      }

      ctx.status = 200;
      ctx.body = returnD

   } catch (error) {
      ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
      ctx.status = 400;
      ctx.body = {
         message: typeof error == 'string' ? error : undefined
      }
   }
}

async function getAlarmUse (ctx) {
   try {
      const models = ctx.fs.dc.models;
      const { clickHouse } = ctx.app.fs
      const { utils: { anxinStrucIdRange, pomsProjectRange } } = ctx.app.fs
      const { pepProjectId, startTime } = ctx.query

      let pomsProject = await pomsProjectRange({
         ctx, pepProjectId,
         keywordTarget: 'pepProject',
      })
      const pomsProjectIds = pomsProject.map(p => p.id)
      let findOption = {
         distinct: true,
         where: {},
         include: [{
            model: models.App,
            where: {},
            attributes: {
               exclude: ['projectId']
            },
            include: [{
               model: models.ProjectCorrelation,
               where: {},
               attributes: {
                  exclude: ['createTime', 'createUser', 'anxinProjectId',]
               },
            }]
         }]
      }
      if (startTime) {
         findOption.where.createTime = { $gt: moment(startTime).format('YYYY-MM-DD HH:mm:ss') }
      }
      findOption.include[0].include[0].where.id = { $in: pomsProjectIds }
      const listRes = await models.AppAlarm.findAll(findOption)
      for (let lr of listRes) {
         if (lr.app && lr.app.projectCorrelations) {
            for (let p of lr.app.projectCorrelations) {
               let corProjectCorrelations = pomsProject.find(pr => pr.id == p.id)
               if (corProjectCorrelations) {
                  p.dataValues = corProjectCorrelations
               }
            }
         }
      }
      ctx.status = 200;
      ctx.body = listRes

   } catch (error) {
      ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
      ctx.status = 400;
      ctx.body = {
         message: typeof error == 'string' ? error : undefined
      }
   }
}

async function getStatisticOnline (ctx) {
   try {
      const { models } = ctx.fs.dc;
      const { clickHouse } = ctx.app.fs
      const { utils: { judgeSuper, anxinStrucIdRange } } = ctx.app.fs
      const { database: anxinyun } = clickHouse.anxinyun.opts.config
      const { pepProjectId } = ctx.query

      let anxinStruc = await anxinStrucIdRange({ ctx, pepProjectId })
      if (anxinStruc.length) {
         const anxinStrucIds = anxinStruc.map(a => a.strucId)
         // 查在线率
         const strucOnlineClient = ctx.app.fs.esclient.strucOnline

         const onlineRes = anxinStrucIds.length ?
            await strucOnlineClient.search({
               index: strucOnlineClient.config.index,
               type: strucOnlineClient.config.type,
               body: {
                  "query": {
                     "bool": {
                        "filter": [
                           {
                              "range": {
                                 "collect_time": {
                                    "gte": `${moment().subtract(32, 'hours').format('YYYY-MM-DDTHH:mm:ss.SSS')}Z`,
                                    // "gte": "2023-08-24T08:00:00.000Z",
                                 }
                              }
                           },
                           {
                              "terms": {
                                 "structure": anxinStrucIds,
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
            : {
               hits: {
                  hits: []
               }
            }

         for (let struc of anxinStruc) {
            let curOnline =
               onlineRes.hits.hits
                  .filter((h) => h._source.structure == struc.strucId)
                  // .sort((a, b) => {
                  //    return a._source.collect_time - b._source.collect_time
                  // })
                  .map(s => {
                     return {
                        ...s._source,
                        rate: s._source.online / s._source.total * 100
                     }
                  })
            struc.online = curOnline
         }

         ctx.status = 200;
         ctx.body = anxinStruc;
      } else {
         ctx.status = 200;
         ctx.body = [];
      }

   } catch (error) {
      ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
      ctx.status = 400;
      ctx.body = {
         message: typeof error == 'string' ? error : undefined
      }
   }
}

async function getStrucSeries (ctx) {
   try {
      const { models } = ctx.fs.dc;
      const { clickHouse } = ctx.app.fs
      const { utils: { judgeSuper, anxinStrucIdRange } } = ctx.app.fs
      const { database: anxinyun } = clickHouse.anxinyun.opts.config
      const { pepProjectId, strucId } = ctx.query

      let anxinStruc = await anxinStrucIdRange({ ctx, pepProjectId })
      if (anxinStruc.length) {
         const anxinStrucIds = [strucId ? strucId : anxinStruc[0].strucId]
         // 查在线率
         const strucSeriesClient = ctx.app.fs.esclient.strucSeries

         const seriesRes = anxinStrucIds.length ?
            await strucSeriesClient.search({
               index: strucSeriesClient.config.index,
               type: strucSeriesClient.config.type,
               body: {
                  "query": {
                     "bool": {
                        "filter": [
                           {
                              "range": {
                                 "collect_time": {
                                    "gte": `${moment().subtract(32, 'hours').format('YYYY-MM-DDTHH:mm:ss.SSS')}Z`,
                                    // "gte": "2023-08-24T08:00:00.000Z",
                                 }
                              }
                           },
                           {
                              "terms": {
                                 "structure": anxinStrucIds,
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
            : {
               hits: {
                  hits: []
               }
            }

         const sensor = anxinStrucIds.length ? await clickHouse.anxinyun.query(
            `SELECT
                     id,structure,name
                     FROM t_sensor
                     INNER JOIN t_structure
                        ON t_structure.id = t_sensor.structure
                     WHERE 
                     t_sensor.structure IN (${anxinStrucIds.join(',')})`
         ).toPromise() : []

         for (let data of sensor) {
            let curSeries =
               seriesRes.hits.hits
                  .filter((h) => h._source.sensor == data.id)
                  .map(s => {
                     return {
                        ...s._source,
                     }
                  })
            let struc = anxinStruc.find((h) => h.strucId == data.structure)
            data.series = curSeries
            data.struc = struc
         }

         ctx.status = 200;
         ctx.body = {
            sensor: sensor || [],
            anxinStruc: anxinStruc || []
         };
      } else {
         ctx.status = 200;
         ctx.body = {
            sensor: [],
            anxinStruc: []
         };
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
   personnelApp,
   problem,
   getAlarmData,
   getAlarmVideo,
   getAlarmUse,
   getStatisticOnline,
   getStrucSeries,

}