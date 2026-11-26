'use strict';
const fs = require('fs');
const request = require('superagent');
const moment = require('moment');
const { alarmConfirmLog } = require('./alarmConfirmLog');
async function groupList (ctx) {
   try {
      const { models } = ctx.fs.dc;
      const { clickHouse } = ctx.app.fs

      const { database: dataAlarm } = clickHouse.dataAlarm.opts.config
      const { showAll } = ctx.query
      const groupRes = await clickHouse.anxinyun.query(`
         SELECT * FROM t_alarm_group
      `).toPromise();

      let whereOption = []
      if (!showAll) {
         whereOption.push(` INNER JOIN ${dataAlarm}.alarms
         ON t_alarm_group_unit.id = ${dataAlarm}.alarms.AlarmGroupUnit`)
      }

      for (let g of groupRes) {
         g.unit = await clickHouse.anxinyun.query(`
            SELECT DISTINCT
               t_alarm_group_unit.id AS id,t_alarm_group_unit.name AS name,t_alarm_group_unit.group_id AS groupId
            FROM t_alarm_group_unit
           ${whereOption}
            WHERE group_id = ${g.id} 
         `).toPromise();
      }
      ctx.status = 200;
      ctx.body = groupRes
   } catch (error) {
      ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
      ctx.status = 400;
      ctx.body = {
         message: typeof error == 'string' ? error : undefined
      }
   }
}

async function list (ctx) {
   try {
      const { models } = ctx.fs.dc;
      const { clickHouse } = ctx.app.fs
      const { utils: { judgeSuper, anxinStrucIdRange } } = ctx.app.fs
      const { database: anxinyun } = clickHouse.anxinyun.opts.config

      const { timestamps, pepProjectId, keywordTarget, keyword, groupId, groupUnitId, sustainTimeStart, sustainTimeEnd,
         limit, page, state, onlineState, toExport } = ctx.query
      // console.log('xxxx11',moment().format('YYYY-MM-DD HH:mm:ss'))
      let anxinStruc = await anxinStrucIdRange({
         ctx, pepProjectId, keywordTarget, keyword
      })
      // console.log('xxxx11',moment().format('YYYY-MM-DD HH:mm:ss'))
      let whereOption = []
      if (anxinStruc.length) {
         const anxinStrucIds = anxinStruc.map(a => a.strucId)
         whereOption.push(`alarms.StructureId IN (${anxinStrucIds.join(",")})`)

         if (groupId) {
            whereOption.push(`alarms.AlarmGroup IN (${groupId})`)
         }
         if (groupUnitId) {
            whereOption.push(`alarms.AlarmGroupUnit IN (${groupUnitId})`)
         }
         // 测试代码
         // whereOption.push(`alarms.AlarmGroupUnit = 47`);
         // whereOption.push(`alarms.AlarmCode = '30200001'`);
         if (sustainTimeStart && sustainTimeEnd) {
            let momentStart = moment(sustainTimeStart).format('YYYY-MM-DD HH:mm:ss')
            let momentEnd = moment(sustainTimeEnd).format('YYYY-MM-DD HH:mm:ss')
            whereOption.push(`
               (
                  alarms."StartTime"
                     BETWEEN '${momentStart}' AND '${momentEnd}' 
                     OR 
                     "alarms"."EndTime" BETWEEN '${momentStart}' AND '${momentEnd}' 
                     OR (
                        "alarms"."StartTime" <= '${momentStart}' 
                        AND 
                        "alarms"."EndTime" >= '${momentEnd}'
                     )
               )
            `)
         }
         if (keywordTarget == 'source' && keyword) {
            whereOption.push(`SourceName LIKE '%${keyword}%'`)
         }
         if (state) {
            if (state == 'new') {
               whereOption.push(`alarms.State < 3`)
            } else if (state == 'histroy') {
               whereOption.push(`alarms.State >= 3`)
            }
         }
         if (onlineState) {
            if (onlineState == 'online') {
               whereOption.push(`DeviceStatus.Status = ${1}`)
            } else if (onlineState == 'offline') {
               whereOption.push(`DeviceStatus.Status = ${0}`)
            }
         }

         // let alarmQueryOptionStr = `
         //    FROM 
         //       alarms 
         //       ${timestamps ? `LEFT JOIN (
         //          SELECT DeviceId, any(Status) AS Status,max(Time) FROM DeviceStatus GROUP BY DeviceId 
         //       ) AS DeviceStatus
         //          ON DeviceStatus.DeviceId = alarms.SourceId`: ''}
         //    LEFT JOIN ${anxinyun}.t_structure 
         //       ON ${anxinyun}.t_structure.id = alarms.StructureId
         //    LEFT JOIN ${anxinyun}.t_alarm_code
         //       ON ${anxinyun}.t_alarm_code.code = alarms.AlarmTypeCode
         //    LEFT JOIN ${anxinyun}.t_alarm_type
         //       ON ${anxinyun}.t_alarm_type.id = alarms.AlarmTypeId
         //    ${whereOption.length ? 'WHERE ' + whereOption.join(' AND ') : ''}
         // `
         let alarmQueryOptionStr = `
         FROM 
            alarms  FINAL
         ${whereOption.length ? 'WHERE ' + whereOption.join(' AND ') : ''}
      `
         // const alarmQuery = `
         //    SELECT
         //       alarms.AlarmId AS AlarmId,
         //       alarms.State AS State,
         //       SourceName, StartTime, EndTime,
         //       alarms.CurrentLevel AS CurrentLevel,
         //       SourceTypeId,
         //       AlarmAdviceProblem, AlarmGroup, AlarmGroupUnit,AlarmCode, AlarmAdviceProblem,
         //       alarms.StructureId AS StructureId,
         //       ${timestamps ? `DeviceStatus.Status AS DeviceStatus,` : ''}
         //       ${anxinyun}.t_structure.name AS StructureName,
         //       ${anxinyun}.t_structure.longitude AS StructureLongitude,
         //       ${anxinyun}.t_structure.latitude AS StructureLatitude,
         //       ${anxinyun}.t_alarm_code.name AS AlarmCodeName,
         //       AlarmContent,
         //       Project,
         //       AlarmCount AS detailCount
         //    ${alarmQueryOptionStr}
         //    ORDER BY alarms.StartTime DESC
         //    ${!toExport && limit ? 'LIMIT ' + limit : ''}
         //    ${!toExport && limit && page ? 'OFFSET ' + parseInt(limit) * parseInt(page) : ''}
         // `

         const alarmQuery = `
         SELECT
            alarms.AlarmId AS AlarmId,
            alarms.State AS State,
            SourceName, StartTime, EndTime,
            alarms.CurrentLevel AS CurrentLevel,
            alarms.SourceId AS SourceId,
            SourceTypeId,
            AlarmAdviceProblem, AlarmGroup, AlarmGroupUnit,AlarmCode, AlarmAdviceProblem,
            alarms.StructureId AS StructureId,
            AlarmContent,
            Project,
            AlarmCount AS detailCount
         ${alarmQueryOptionStr}
         ORDER BY alarms.StartTime DESC
         ${!toExport && limit ? 'LIMIT ' + limit : ''}
         ${!toExport && limit && page ? 'OFFSET ' + parseInt(limit) * parseInt(page) : ''}
      `
         // console.log('alarmQuery', alarmQuery);
         // console.log('xxxx12',moment().format('YYYY-MM-DD HH:mm:ss'))
         const alarmRess = await clickHouse.dataAlarm.query(alarmQuery).toPromise();
         // console.log('xxxx12',moment().format('YYYY-MM-DD HH:mm:ss'))
         const alarmCodeRslt=await clickHouse.anxinyun.query(`SELECT code,name  FROM t_alarm_code`).toPromise();
         let sourceId=alarmRess.map(item=>item.SourceId);
         let StructureInfo= await clickHouse.anxinyun.query(`SELECT id, name,longitude,latitude 
            FROM t_structure 
            WHERE id IN (${[...alarmRess.map(item=>"'" + item.StructureId + "'"),-1].join(',')})`).toPromise();
         //设备最新状态
         let deviceStatus =[];
         //如果没有分页需要分批查询,in数组长度限制
         if(timestamps){
            if(toExport){
               const batchSize = 500;
               for(let i = 0; i < sourceId.length; i += batchSize){
                  let sourceIdBatch=sourceId.slice(i, i + batchSize)
                  let  res=await models.LatestStatus.findAll({
                     attributes: ['deviceId', 'status'],
                     where:{
                        deviceId:{$in:sourceIdBatch}
                     }
                  })
                  deviceStatus=deviceStatus.concat(res)
               }
            }else{
               deviceStatus= await models.LatestStatus.findAll({
                  where:{
                     deviceId:{$in:sourceId}
                  }
               })
            }
         }
       
         let alarmRes=alarmRess.map(item=>{
            return {
               ...item,
               DeviceStatus:timestamps? Number((deviceStatus.find(s=>s.deviceId==item.SourceId) || {}).status):'',
               StructureName:(StructureInfo.find(s=>s.id==item.StructureId) || {}).name,
               StructureLongitude:(StructureInfo.find(s=>s.id==item.StructureId) || {}).longitude,
               StructureLatitude:(StructureInfo.find(s=>s.id==item.StructureId) || {}).latitude,
               AlarmCodeName:(alarmCodeRslt.find(s=>s.code==item.AlarmCode) || {}).name
            }
         })
         // TODO lukai 说这里要加也不知道啥时候加
         // ,
         // ${anxinyun}.t_alarm_type.old_name AS alarmTypeOldName

         // State = 3 是 自动恢复 / 4 是 人工恢复 / 其他数字 是 需要恢复
         // state = 2 是 等级提升 / 1 是持续产生 / 0 是首次产生

         // SourceType   0: 'DTU' / 1: '传感器' / 2: '测点'

         const countAlarmQuery = `
            SELECT 
                count(alarms.AlarmId) AS count
            ${alarmQueryOptionStr}
         `
         // console.log('countAlarmQuery', countAlarmQuery);
         const countAlarm = await clickHouse.dataAlarm.query(countAlarmQuery).toPromise();

         const confirmedAlarm = alarmRes
            .filter(ar => ar.State && ar.State > 2)
            .map(ar => "'" + ar.AlarmId + "'")
         const confirmedAlarmDetailMax = confirmedAlarm.length ?
            await clickHouse.dataAlarm.query(`
               SELECT 
                  max(Time) AS Time, AlarmId , max(Content) AS Content
               FROM 
                  alarm_details
               WHERE
                  AlarmId IN (${confirmedAlarm.join(',')})
               GROUP BY AlarmId
            `).toPromise() :
            [];

         /** 231019 alarm 表有 AlarmCount 字段 ，
          * alarmDetailCount就不需要计算查询了
         */
         // const detailCountAlarm = alarmRes
         // .map(ar => "'" + ar.AlarmId + "'")
         // const alarmDetailCount = detailCountAlarm.length ? await clickHouse.dataAlarm.query(`
         //    SELECT 
         //       count(Time) AS count, AlarmId
         //    FROM 
         //       alarm_details
         //    WHERE
         //       AlarmId IN (${detailCountAlarm.join(',')})
         //       AND AlarmState < 3
         //    GROUP BY AlarmId
         // `).toPromise() : []


         alarmRes.forEach(ar => {
            ar.pomsProject = (
               anxinStruc.find(as => as.strucId == ar.StructureId) ||
               {
                  pomsProject: [
                     // TODO: 开发临时添加
                  ]
               }
            ).pomsProject

            // 最新告警详情 - 确认信息
            let corConfirmedData = (confirmedAlarmDetailMax.find(cdm => cdm.AlarmId == ar.AlarmId) || {});

            ar.confirmedContent = corConfirmedData.Content || null
            ar.confirmedTime = corConfirmedData.Time || null

            // // 告警详情的数量
            // ar.detailCount = (alarmDetailCount.find(adc => adc.AlarmId == ar.AlarmId) || { count: 0 }).count
         })

         if (toExport) {
            await exportDataAlarms(ctx, alarmRes, groupId);
         } else {
            ctx.status = 200;
            ctx.body = {
               count: countAlarm[0].count,
               rows: alarmRes
            }
         }
      } else {
         ctx.body = {
            count: 0,
            rows: []
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
 
async function getAlarmGroups (ctx) {
   try {
      const { clickHouse } = ctx.app.fs
      const groupRes = await clickHouse.anxinyun.query(`
   SELECT * FROM t_alarm_group
`).toPromise();

      for (let g of groupRes) {
         g.unit = await await clickHouse.anxinyun.query(`
   SELECT * FROM t_alarm_group_unit WHERE group_id = ${g.id}
   `).toPromise();
      }
      return groupRes
   } catch (error) {
      ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
      ctx.status = 400;
      ctx.body = {
         message: typeof error == 'string' ? error : undefined
      }
   }
}
async function exportDataAlarms (ctx, alarmList, groupId) {
   try {
      const { utils: { simpleExcelDown, getExportAlarmHeader } } = ctx.app.fs;
      let header = await getExportAlarmHeader(groupId);
      let alarmGroups = await getAlarmGroups(ctx);

      let ggroups = []
      alarmGroups.filter(ag => groupId.split(',').indexOf(ag.id + '') != -1).map(g => {
         g.unit.map(u => {
            ggroups.push(u)
         })
      })

      let exportData = []
      for (let item of alarmList) {
         let projectNames = item.pomsProject.map(p => {
            return p.name || p.pepProject.projectName
         })
         item.projectName = projectNames.join('\r\n') || '无';//项目名称

         let ycType = ggroups.find(r => r.id == item.AlarmGroupUnit) ? ggroups.find(r => r.id == item.AlarmGroupUnit).name : '无';//异常类型
         //AlarmGroupUnit中断类型
         item.AlarmGroupUnit = ycType;

         //type异常类型
         item.type = groupId == "4,5" ? item.DeviceStatus == 0 ? "离线" : '' : ycType;

         //Strategy策略类型
         item.Strategy = ycType;
         //State命中状态
         item.State = item.State == 3 || item.State == 4 ? "历史" : "当前"

         //station位置信息
         item.station = item.StructureLongitude && item.StructureLatitude ? item.StructureLongitude + '. ' + item.StructureLatitude : "无";

         //venderName设备厂家
         item.venderName = item.platform ? '未知' : item.venderName ? item.venderName : "无";//存疑 参考前端得到

         let time = moment(item.confirmedTime || item.EndTime || moment().format("YYYY-MM-DD HH:mm:ss")).diff(moment(item.StartTime), 'seconds')
         item.sustainTime = time < 60 ? '< 1分钟' : time > 3600 ? Math.floor(time / 3600) + '小时' + Math.floor((time - Math.floor(time / 3600) * 3600) / 60) + '分钟' : Math.floor((time - Math.floor(time / 3600) * 3600) / 60) + '分钟';

         item.AlarmCodeName = item.AlarmCodeName || '无';
         item.EndTime = item.EndTime || '无';
         item.confirmedContent = item.confirmedContent || '无';
         item.confirmedTime = item.confirmedTime || '无';

         exportData.push(item)
      }
      let ttype = groupId == '1' ? '数据中断' : groupId == '2' ? '数据异常' : groupId == '3' ? '策略命中' : '设备异常';//数据类告警类别
      const fileName = `数据异常列表_${ttype}_${moment().format('YYYYMMDDHHmmss')}` + '.xlsx'
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
async function detail (ctx) {
   try {
      const { models } = ctx.fs.dc;
      const { clickHouse } = ctx.app.fs
      const { alarmId, limit, page } = ctx.query

      const detailRes = await clickHouse.dataAlarm.query(`
         SELECT * FROM alarm_details 
            WHERE AlarmId = '${alarmId}' 
            ORDER BY Time ASC  
            ${limit ? 'LIMIT ' + limit : ''}
            ${limit && page ? 'OFFSET ' + parseInt(limit) * parseInt(page) : ''}
      `).toPromise()

      // const count = await clickHouse.dataAlarm.query(`
      //    SELECT count(*) AS count FROM alarm_details 
      //       WHERE AlarmId = '${alarmId}' 
      // `).toPromise()

      ctx.status = 200;
      // ctx.body = {
      //    count: count[0].count,
      //    rows: detailRes
      // }
      ctx.body = detailRes
   } catch (error) {
      ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
      ctx.status = 400;
      ctx.body = {
         message: typeof error == 'string' ? error : undefined
      }
   }
}

function confirm (opts) {
   return async function (ctx) {
      try {
         const { models } = ctx.fs.dc;
         const { utils: { kfkSendAsync } } = ctx.app.fs
         const { clickHouse } = ctx.app.fs
         const { content = '', alarmId, confirmPost } = ctx.request.body;
         // 发送告警恢复通知
         // Topic: alarm
         /*
          *  {
          *      messageMode: "AlarmManElimination",
          *      sourceId: "",
          *      alarmTypeCode: "",
          *      sponsor: userId，
          *      content: "确认消息"，
          *      time: "YYYY-MM-DDTHH:mm:ss.SSSZ"
          *  }
         */

         const alarmRes = await clickHouse.dataAlarm.query(`
            SELECT * FROM alarms FINAL WHERE AlarmId IN (${alarmId.map(a => `'${a}'`).join(',')})
         `).toPromise();

         if (!alarmRes.length) {
            throw '没有查询到对应的告警信息'
         }

         const [corAlarm] = alarmRes
         if ([3, 4].some(s => s == corAlarm.State)) {
            throw '告警信息已确认'
         }
         for (let corAlarm of alarmRes) {
            if ([3, 4].some(s => s == corAlarm.State)) {
               continue
            }
            const message = {
               messageMode: "AlarmManElimination",
               sourceId: corAlarm.SourceId,
               alarmTypeCode: corAlarm.AlarmTypeCode,
               sponsor: opts.anxinCloud.confirmAlarmAnxinUserId,
               content: content,
               time: moment().toISOString()
            };

            const payloads = [{
               topic: `${opts.kafka.topicPrefix}_alarm`,
               messages: [JSON.stringify(message)],
               partition: 0
            }];

            await kfkSendAsync(payloads)
         }

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
}


async function detailAggregation (ctx) {
   try {
      const { models } = ctx.fs.dc;
      const { alarmId } = ctx.query
      const { clickHouse } = ctx.app.fs

      const alarmDetailAggRes = await clickHouse.dataAlarm.query(`
         SELECT 
            formatDateTime(Time,'%F %H') hours, count(AlarmId) count 
         FROM 
            alarm_details 
         WHERE 
            AlarmId='${alarmId}'
         GROUP BY 
            hours;  
      `).toPromise();

      ctx.status = 200;
      ctx.body = alarmDetailAggRes
   } catch (error) {
      ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
      ctx.status = 400;
      ctx.body = {
         message: typeof error == 'string' ? error : undefined
      }
   }
}

async function alarmCount (ctx) {
   try {
      const { models } = ctx.fs.dc;
      const { clickHouse } = ctx.app.fs

      const alarmUnconfirmedAggRes = await clickHouse.dataAlarm.query(`
         SELECT count(AlarmId) count, AlarmGroup from alarms GROUP BY AlarmGroup;
      `).toPromise();

      ctx.status = 200;
      ctx.body = alarmUnconfirmedAggRes
   } catch (error) {
      ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
      ctx.status = 400;
      ctx.body = {
         message: typeof error == 'string' ? error : undefined
      }
   }
}

module.exports = {
   list,
   detail,
   groupList,
   confirm,
   detailAggregation,
   alarmCount,
};