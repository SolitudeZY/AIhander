'use strict';
const fs = require('fs');
const moment = require('moment')
const { alarmConfirmLog } = require('./alarmConfirmLog');
async function deviceType (ctx) {
   try {
      const { models } = ctx.fs.dc;
      const { clickHouse } = ctx.app.fs
      const { database: anxinyun } = clickHouse.anxinyun.opts.config
      const { utils: { judgeSuper, anxinStrucIdRange } } = ctx.app.fs
      const { showAll } = ctx.query
      let anxinStruc = await anxinStrucIdRange({
         ctx,
      })
      const anxinStrucIds = anxinStruc.map(a => a.strucId)
      let whereOption = []
      if (!showAll) {
         whereOption.push(`INNER JOIN ${anxinyun}.t_video_ipc
         ON toString(${anxinyun}.t_video_ipc.channel_no) = camera_status_alarm.channel_no
         AND ${anxinyun}.t_video_ipc.serial_no = camera_status_alarm.serial_no
         ${`WHERE ${anxinyun}.t_video_ipc.structure IN (${anxinStrucIds.join(',')})`}`)
      }
      const kindRes = await clickHouse.vcmp.query(`
         SELECT DISTINCT
            camera_kind.id AS id,camera_kind.kind AS kind
         FROM camera_kind
         INNER JOIN camera
            ON camera_kind.id = camera.kind_id
         INNER JOIN camera_status_alarm
            ON camera.channel_no = camera_status_alarm.channel_no
            AND camera.serial_no = camera_status_alarm.serial_no
         ${whereOption}
      `).toPromise()
      ctx.status = 200;
      ctx.body = kindRes
   } catch (error) {
      ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
      ctx.status = 400;
      ctx.body = {
         message: typeof error == 'string' ? error : undefined
      }
   }
}

async function exceptionType (ctx) {
   try {
      const { models } = ctx.fs.dc;
      const { clickHouse } = ctx.app.fs
      const { database: anxinyun } = clickHouse.anxinyun.opts.config
      const { utils: { judgeSuper, anxinStrucIdRange } } = ctx.app.fs
      let anxinStruc = await anxinStrucIdRange({
         ctx,
      })
      const anxinStrucIds = anxinStruc.map(a => a.strucId)

      const statusRes = await clickHouse.vcmp.query(`
         SELECT DISTINCT
            camera_status.id AS statusId,camera_status.describe AS describe
         FROM camera_status
         INNER JOIN camera_status_alarm
            ON camera_status.id = camera_status_alarm.status_id
         INNER JOIN ${anxinyun}.t_video_ipc
            ON toString(${anxinyun}.t_video_ipc.channel_no) = camera_status_alarm.channel_no
            AND ${anxinyun}.t_video_ipc.serial_no = camera_status_alarm.serial_no
            ${`WHERE ${anxinyun}.t_video_ipc.structure IN (${anxinStrucIds.join(',')})`}
      `).toPromise()
      ctx.status = 200;
      ctx.body = statusRes
   } catch (error) {
      ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
      ctx.status = 400;
      ctx.body = {
         message: typeof error == 'string' ? error : undefined
      }
   }
}

async function alarmList (ctx) {
   try {
      const { models } = ctx.fs.dc;
      const { clickHouse } = ctx.app.fs
      const { utils: { judgeSuper, anxinStrucIdRange } } = ctx.app.fs
      const { database: anxinyun } = clickHouse.anxinyun.opts.config
      const { pepProjectId, keywordTarget, keyword, state, kindId, sustainTimeStart, sustainTimeEnd, limit, page, statusId, toExport, startTime } = ctx.query

      let anxinStruc = await anxinStrucIdRange({
         ctx, pepProjectId, keywordTarget, keyword
      })
      const anxinStrucIds = anxinStruc.map(a => a.strucId)

      let cameraWhereOption = []
      if (keywordTarget == 'source' && keyword) {
         cameraWhereOption.push(`camera.name LIKE '%${keyword}%'`)
      }
      if (state) {
         if (state == 'new') {
            cameraWhereOption.push(`camera_status_alarm.confirm_time IS null`)
         } else if (state == 'histroy') {
            cameraWhereOption.push(`camera_status_alarm.confirm_time IS NOT null`)
         }
      }
      if (kindId) {
         let sql = `camera.kind_id = ${kindId}`
         if (kindId == 1314) {
            sql = `(camera.kind_id = ${kindId} OR camera.kind_id IS null)`
         }
         cameraWhereOption.push(sql)
      }


      let statusAlarmWhereOption = []
      if (sustainTimeStart && sustainTimeEnd) {
         let momentStart = moment(sustainTimeStart).format('YYYY-MM-DD HH:mm:ss')
         let momentEnd = moment(sustainTimeEnd).format('YYYY-MM-DD HH:mm:ss')
         statusAlarmWhereOption.push(`
            (
               camera_status_alarm.create_time
                  BETWEEN '${momentStart}' AND '${momentEnd}' 
                  OR 
                  camera_status_alarm.update_time BETWEEN '${momentStart}' AND '${momentEnd}' 
                  OR (
                     camera_status_alarm.create_time <= '${momentStart}' 
                     AND 
                     camera_status_alarm.update_time >= '${momentEnd}'
                  )
            )
         `)
      }
      if (statusId) {
         statusAlarmWhereOption.push(`camera_status_alarm.status_id = ${statusId}`)
      }
      if (startTime) {
         statusAlarmWhereOption.push(`camera_status_alarm.create_time  >= '${moment(startTime).format('YYYY-MM-DD HH:mm:ss')}'`)
      }

      const queryStr = `
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
                     ${cameraWhereOption.length ? 'AND ' + cameraWhereOption.join(' AND ') : ''}
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
                  ${!toExport && limit ? 'LIMIT ' + limit : ''}
                  ${!toExport && limit && page ? 'OFFSET ' + parseInt(limit) * parseInt(page) : ''}
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
            ${keywordTarget == 'struc' && keyword ? `AND anxinStruc.name LIKE '%${keyword}%'` : ''}
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
      if (toExport) {//数据导出相关
         await exportVideoAlarms(ctx, returnD);
      } else {
         ctx.status = 200;
         ctx.body = returnD
      }
   } catch (error) {
      ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
      ctx.status = 400;
      ctx.body = {
         message: typeof error == 'string' ? error : undefined
      }
   }
}

async function exportVideoAlarms (ctx, alarmList) {
   let accessType = { yingshi: "萤石云", nvr: "NVR", ipc: "IPC", cascade: "级联" }
   try {
      const { clickHouse, utils: { simpleExcelDown, getExportAlarmHeader } } = ctx.app.fs;
      const kindRes = await clickHouse.vcmp.query(`
      SELECT * FROM camera_kind
   `).toPromise()
      let header = await getExportAlarmHeader('video');
      let exportData = []
      for (let item of alarmList) {
         let projectNames = item.pomsProject.map(p => {
            return p.name || p.pepProject.projectName
         })
         let structNames = item.struc.map(str => str.name);
         item.projectName = projectNames.join('\r\n') || '无';//项目名称
         item.structureName = structNames.join('\r\n');//结构物名称
         item.stations = item.station.length ? item.station.map(st => st.position).join('\r\n') : '无';//位置信息
         item.cameraKindId = kindRes.find(k => k.value == item.cameraKindId) ? kindRes.find(k => k.value == item.cameraKindId).name : '其他';//设备类型 ??????????

         let time = moment(item.confirmTime || item.updateTime || moment().format("YYYY-MM-DD HH:mm:ss")).diff(moment(item.createTime), 'seconds')
         item.sustainTime = time < 60 ? '< 1分钟' : time > 3600 ? Math.floor(time / 3600) + '小时' + Math.floor((time - Math.floor(time / 3600) * 3600) / 60) + '分钟' : Math.floor((time - Math.floor(time / 3600) * 3600) / 60) + '分钟';

         item.venderName = item.platform ? '未知' : item.venderName;//设备厂家
         item.point = item.station.length ? item.station.map(st => st.name).join('\r\n') : '无';//测点
         item.platform = accessType[item.platform] || '无';//接入方式
         let resolves = item.resolve.map(rs => rs.resolve);
         item.resolve = resolves.join('\r\n');//解决方案

         item.updateTime = item.updateTime || '无';
         item.confirmContent = item.confirmContent || '无';
         item.confirmTime = item.confirmTime || '无';

         exportData.push(item)
      }
      const fileName = `视频异常列表_${moment().format('YYYYMMDDHHmmss')}` + '.xlsx'
      const filePath = await simpleExcelDown({ data: exportData, header, fileName: fileName })
      const fileData = fs.readFileSync(filePath);
      ctx.status = 200;
      ctx.set('Content-Type', 'application/x-xls');
      ctx.set('Content-disposition', 'attachment; filename=' + encodeURI(fileName));
      ctx.body = fileData;
   } catch (error) {
      ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
      ctx.status = 400;
      ctx.body = {
         message: typeof error == 'string' ? error : undefined
      }
   }
}
async function confirm (ctx) {
   try {
      const { alarmId, content, confirmPost } = ctx.request.body;
      // TODO: 以视频·应用的秘钥进行鉴权
      await ctx.app.fs.vcmpRequest.put('status/alarm/confirm', {
         data: {
            alarmId, content
         }
      })

      await alarmConfirmLog(ctx, confirmPost, content);//告警确认日志

      ctx.status = 204;
   } catch (error) {
      ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
      ctx.status = 400;
      ctx.body = {
         message: typeof error == 'string' ? error : undefined
      }
   }
}

let structsAche = {
   dataList: [],
   expireTime: null//10分钟更新一次结构物列表
}
async function getStructsAche (ctx) {
   const { utils: { getAxyStructs } } = ctx.app.fs
   try {
      if (!structsAche.dataList.length || moment() > moment(structsAche.expireTime)) {
         let structList = await getAxyStructs();
         structsAche.dataList = structList;
         structsAche.expireTime = moment().add(10, 'minute').format('YYYY-MM-DD HH:mm:ss');
      }
      return structsAche;
   } catch (err) {
      console.log(`获取结构物列表失败, error: ${err}`);
   }
}

async function alarmAdded (ctx) {
   try {
      const { models } = ctx.fs.dc;
      const { clickHouse } = ctx.app.fs
      const { utils: { sendAppearToWeb } } = ctx.app.fs

      let structsAche = await getStructsAche(ctx);
      if (structsAche) {
         let anxinStruc = structsAche.dataList;//结构物列表
         const { serial_no, channel_no, create_time, description, status_id } = ctx.request.body;

         let belongToStruct = await clickHouse.anxinyun.query(
            `SELECT name, structure FROM t_video_ipc WHERE serial_no='${serial_no}' and channel_no=${parseInt(channel_no)}`).toPromise()
         let structId = belongToStruct.length ? belongToStruct[0].structure : null

         if (structId) {
            let exist = anxinStruc.find(s => s.strucId == structId);
            if (exist) {
               let projects = exist.pomsProject.filter(d => !d.del).map(p => p.id);
               let datas = projects.map(d => {//需要 项目,告警源,异常类型,时间
                  return {
                     projectCorrelationId: d,
                     alarmInfo: { messageMode: 'AlarmGeneration', sourceName: belongToStruct[0].name, status_id, type: description },//AlarmGeneration代表告警首次产生
                     time: create_time,
                     type: description
                  }
               })
               let rslt = await models.AlarmAppearRecord.bulkCreate(datas, { returning: true });
               let dynamics = rslt.map(r => {
                  return {
                     time: r.time,
                     alarmAppearId: r.id,
                     projectCorrelationId: r.projectCorrelationId,
                     type: 1//发现
                  }
               })
               await models.LatestDynamicList.bulkCreate(dynamics);

               //消息推送到前端
               if (datas.length) {
                  await sendAppearToWeb(datas, 'video', exist);
               }
            }
         }
         ctx.status = 200;
      } else {
         ctx.status = 400;
         ctx.body = {
            message: `获取结构物列表失败`
         }
      }
   } catch (error) {
      ctx.fs.logger.error(`path: ${ctx.path}, error: error`);
      ctx.status = 400;
      ctx.body = {
         message: typeof error == 'string' ? error : undefined
      }
   }
}

async function vcmpAppAuthToken (ctx) {
   try {
      const { models } = ctx.fs.dc;
      const { utils: { vcmpAuth } } = ctx.app.fs

      const token = await vcmpAuth()

      ctx.status = 200;
      ctx.body = { token }
   } catch (error) {
      ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
      ctx.status = 400;
      ctx.body = {
         message: typeof error == 'string' ? error : undefined
      }
   }
}

module.exports = {
   deviceType,
   alarmList,
   confirm,
   alarmAdded,
   vcmpAppAuthToken,
   exceptionType
};