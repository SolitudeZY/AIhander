'use strict';
const moment = require('moment');

async function list (ctx) {
   try {
      const { models } = ctx.fs.dc;
      const { userId, pepUserId } = ctx.fs.api
      const linkListRes = await models.QuickLink.findAll({
         attributes: { exclude: ['userId'] },
         where: {
            userId,
         }
      })

      ctx.status = 200;
      ctx.body = linkListRes
   } catch (error) {
      ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
      ctx.status = 400;
      ctx.body = {
         message: typeof error == 'string' ? error : undefined
      }
   }
}

async function edit (ctx) {
   try {
      const { models } = ctx.fs.dc;
      const { userId, pepUserId } = ctx.fs.api
      const { linkId, name, link } = ctx.request.body

      if (!name || !link) {
         throw '请将参数填写完整'
      }

      let findOption = {
         where: {
            userId: userId,
            $or: [{
               name,
            }, {
               link,
            }]
         }
      }
      if (linkId) {
         findOption.where.id = { $ne: linkId }
      }
      const existRes = await models.QuickLink.findOne(findOption)
      if (existRes) {
         throw '已有相同名称/地址的工具'
      }
      if (linkId) {
         await models.QuickLink.update({
            name,
            link,
         }, {
            where: {
               id: linkId
            }
         })

      } else {
         await models.QuickLink.create({
            userId,
            name,
            link,
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

async function del (ctx) {
   try {
      const { models } = ctx.fs.dc;
      const { userId, pepUserId } = ctx.fs.api
      const { linkId } = ctx.params

      await models.QuickLink.destroy({
         where: {
            id: linkId,
            userId,
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




async function count (ctx) {
   try {
      const { models } = ctx.fs.dc;
      const { userId, pepUserId, userInfo = {}, pepUserInfo } = ctx.fs.api
      const { clickHouse } = ctx.app.fs
      const { utils: { judgeSuper, anxinStrucIdRange, pomsProjectRange } } = ctx.app.fs
      const { database: anxinyun } = clickHouse.anxinyun.opts.config
      const { pepProjectId } = ctx.request.query


      let anxinStruc = await anxinStrucIdRange({
         ctx, pepProjectId
      })
      let pomsProject = await pomsProjectRange({
         ctx, pepProjectId,
      })
      const pomsProjectIds = pomsProject.map(p => p.id)

      if (anxinStruc.length) {

         const anxinStrucIds = anxinStruc.map(a => a.strucId) || []
         let dataFront = new moment(); //验证前时间
         //剩余数据,设备告警
         const dataAlarm = await clickHouse.dataAlarm.query(`
             SELECT 
             AlarmGroup,COUNT(AlarmId) AS count
             FROM 
               alarms
            WHERE
              alarms.StructureId IN (${anxinStrucIds.join(",")})
              AND
              State < 3
            GROUP BY AlarmGroup
         `).toPromise();


         //剩余数据告警
         let dataSurplus = 0
         //剩余设备告警
         let toolSurplus = 0

         for (let p of dataAlarm) {
            if (p.AlarmGroup < 4) {
               dataSurplus = dataSurplus + p.count
            }
            if (p.AlarmGroup > 3) {
               toolSurplus = toolSurplus + p.count
            }
         }

         const dataAlarmToday = await clickHouse.dataAlarm.query(`
         SELECT 
         AlarmGroup,COUNT(StartTime) AS count
         FROM 
           alarms
         WHERE
          alarms.StructureId IN (${anxinStrucIds.join(",")})
          AND
          StartTime BETWEEN '${moment().startOf('day').format('YYYY-MM-DD HH:mm:ss')}' AND '${moment().endOf('day').format('YYYY-MM-DD HH:mm:ss')}'
          GROUP BY AlarmGroup
     `).toPromise()
         //今日新增数据告警
         let dataNewAdd = 0
         //今日新增设备告警
         let toolNewAdd = 0
         for (let p of dataAlarmToday) {
            if (p.AlarmGroup < 4) dataNewAdd = dataNewAdd + p.count
            if (p.AlarmGroup > 3) toolNewAdd = toolNewAdd + p.count
         }

         //今日确认数据告警
         const dataConfirme = await clickHouse.dataAlarm.query(`
               SELECT 
               AlarmGroup,COUNT(EndTime) AS count
               FROM 
                 alarms
               WHERE
                alarms.StructureId IN (${anxinStrucIds.join(",")})
                AND
                EndTime BETWEEN '${moment().startOf('day').format('YYYY-MM-DD HH:mm:ss')}' AND '${moment().endOf('day').format('YYYY-MM-DD HH:mm:ss')}'              
                AND
                State > 2
                GROUP BY AlarmGroup
            `).toPromise()


         //今日确认数据告警
         let dataConfirmeToday = 0
         //今日确认设备告警
         let toolConfirmeToday = 0
         for (let p of dataConfirme) {
            if (p.AlarmGroup < 4) dataConfirmeToday = dataConfirmeToday + p.count
            if (p.AlarmGroup > 3) toolConfirmeToday = toolConfirmeToday + p.count
         }


         let findOption = {
            where: {
               '$app->projectCorrelations.id$': {
                  $in: pomsProjectIds
               }
            },
            attributes: ['createTime', 'confirmTime'],
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

         let dataAfter = new moment();  //验证后时间
         let dataduration = moment.duration(dataAfter.diff(dataFront))._data.milliseconds

         let yingyongFront = new moment(); //验证前时间

         //应用总告警
         let listRes = await models.AppAlarm.findAndCountAll(findOption)

         //剩余应用告警
         let appSurplus = 0
         //今日新增应用告警
         let appNewAdd = 0
         //今日确认应用告警
         let appConfirme = 0

         for (let p of listRes.rows) {
            if (!p.dataValues.confirmTime) appSurplus++
            if (p.dataValues.createTime && moment(moment().startOf('day').format('YYYY-MM-DD HH:mm:ss')).isBefore(p.dataValues.createTime) && moment(p.dataValues.createTime).isBefore(moment().endOf('day').format('YYYY-MM-DD HH:mm:ss'))) appNewAdd++
            if (p.dataValues.confirmTime && moment(moment().startOf('day').format('YYYY-MM-DD HH:mm:ss')).isBefore(p.dataValues.confirmTime) && moment(p.dataValues.confirmTime).isBefore(moment().endOf('day').format('YYYY-MM-DD HH:mm:ss'))) appConfirme++
         }

         let yingyongAfter = new moment();  //验证后时间
         let yingyongduration = moment.duration(yingyongAfter.diff(yingyongFront))._data.milliseconds

         let videoFront = new moment(); //验证前时间

         const alarmRes = anxinStrucIds.length ? await clickHouse.vcmp.query(
            `
            SELECT         
            cameraAlarm.cameraId AS cameraId,
            cameraAlarm.cameraName AS cameraName,
            cameraAlarm.cameraKindId AS cameraKindId,
            cameraAlarm.statusId AS statusId,
            cameraAlarm.venderId AS venderId,
            cameraAlarm.venderName AS venderName,
               cameraAlarm.cameraSerialNo AS cameraSerialNo,
               cameraAlarm.cameraChannelNo AS cameraChannelNo,
            cameraAlarm.alarmId AS alarmId,
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
                     camera.name AS cameraName,
                     camera.kind_id AS cameraKindId,
                     camera.vender_id AS venderId,
                     camera.yingshi_secret_id AS yingshiSecretId,
                     vender.name AS venderName,
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
                    -- AND camera_status_alarm.create_time  >= '${moment().startOf("day").format('YYYY-MM-DD HH:mm:ss')}'
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
         ).toPromise() : []

         let returnD = []
         let positionD = {}
         // 每个设备一个告警
         for (let a of alarmRes) {
            if (positionD[a.cameraId]) {
               let curD = returnD[positionD[a.cameraId].positionReturnD]
               if (a.resolveId && !curD.resolve.some(r => r.id == a.resolveId)) {
                  curD.resolve.push({
                     id: a.resolveId,
                     resolve: a.resolve
                  })
               }
               if (a.strucId && !curD.struc.some(s => s.id == a.strucId)) {
                  curD.struc.push({
                     id: a.strucId,
                     projectId: a.projectId,
                     name: a.strucName
                  })
               }
               if (a.anxinStationId && !curD.station.some(s => s.id == a.anxinStationId)) {
                  curD.station.push({
                     id: a.anxinStationId,
                     name: a.anxinStationName,
                     position: a.anxinIpcPosition
                  })
               }
            } else {
               let d = {
                  cameraId: a.cameraId,
                  cameraName: a.cameraName,
                  statusId: a.statusId,
                  camerOnline: a.cameraOnline,
                  cameraSerialNo: a.cameraSerialNo,
                  cameraChannelNo: a.cameraChannelNo,
                  autoRestore: a.autoRestore,
                  createTime: a.createTime,
                  updateTime: a.updateTime,
                  platform: a.platform,
                  statusDescribe: a.statusDescribe,
                  alarmId: a.alarmId,
                  confirmContent: a.confirmContent,
                  confirmTime: a.confirmTime,

                  venderId: a.venderId,
                  venderName: a.venderName,
                  cameraKindId: a.cameraKindId,
                  yingshiToken: a.yingshiToken,

                  resolve: [],
                  struc: [],
                  station: []
               }

               // pep 项目
               d.pomsProject = (
                  anxinStruc.find(as => as.strucId == a.strucId) ||
                  {
                     pomsProject: [

                     ]
                  }
               ).pomsProject

               if (a.resolveId) {
                  d.resolve.push({
                     id: a.resolveId,
                     resolve: a.resolve
                  })
               }
               if (a.strucId) {
                  d.struc.push({
                     id: a.strucId,
                     projectId: a.projectId,
                     name: a.strucName
                  })
               }
               if (a.anxinStationId) {
                  d.station.push({
                     id: a.anxinStationId,
                     name: a.anxinStationName,
                     position: a.anxinIpcPosition
                  })
               }
               returnD.push(d)
               positionD[a.cameraId] = {
                  positionReturnD: returnD.length - 1
               }
            }
         }

         //剩余视频告警
         let videoSurplus = 0
         //今日新增视频告警
         let videoNewAdd = 0
         //今日确认视频告警
         let videoConfirme = 0

         for (let p of returnD) {
            if (!p.confirmTime) videoSurplus++
            if (p.createTime && moment(moment().startOf('day').format('YYYY-MM-DD HH:mm:ss')).isBefore(p.createTime) && moment(p.createTime).isBefore(moment().endOf('day').format('YYYY-MM-DD HH:mm:ss'))) videoNewAdd++
            if (p.confirmTime && moment(moment().startOf('day').format('YYYY-MM-DD HH:mm:ss')).isBefore(p.confirmTime) && moment(p.confirmTime).isBefore(moment().endOf('day').format('YYYY-MM-DD HH:mm:ss'))) videoConfirme++
         }

         let videoAfter = new moment();  //验证后时间
         let videoduration = moment.duration(videoAfter.diff(videoFront))._data.milliseconds

         let findOptions = {
            where: {
               del: false,

            },
            attributes: ['pepProjectId']
         }
         if (!userInfo.role.includes('SuperAdmin') && !userInfo.role.includes('admin')) {
            findOptions.where.id = { $in: userInfo.correlationProject }
         }
         const projects = await models.ProjectCorrelation.findAndCountAll(findOptions)
         let pepProjectIds = new Set()

         for (let p of projects.rows) {
            if (p.pepProjectId) {
               pepProjectIds.add(p.pepProjectId)
            }
         }
         const pepProjectRes = pepProjectIds.size ?
            await clickHouse.projectManage.query(
               `
               SELECT 
               t_pim_project.id AS id, 
               t_pim_project.isdelete AS isdelete
            FROM t_pim_project 
               WHERE id IN (${[...pepProjectIds].join(',')}, -1)
               `
            ).toPromise() :
            []


         for (let p of projects.rows) {
            const corPro = pepProjectRes.find(pp => pp.id == p.pepProjectId) || {}
            p.dataValues.pepProjectIsDelete = corPro.isdelete

         }


         ctx.status = 200;
         ctx.body = {

            dataSurplus: dataSurplus + toolSurplus,
            dataNewAdd: dataNewAdd + toolNewAdd,
            dataConfirme: dataConfirmeToday + toolConfirmeToday,


            videoSurplus: videoSurplus,
            videoNewAdd: videoNewAdd,
            videoConfirme: videoConfirme,


            appSurplus: appSurplus,
            appNewAdd: appNewAdd,
            appConfirme: appConfirme,

            projects: projects.rows.filter(v => v.dataValues.pepProjectIsDelete !== 1).length,

         }
      } else {
         ctx.body = {
            dataAlarm: 0,
         }
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


module.exports = {
   list, edit, del, count
};