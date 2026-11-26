'use strict';
const moment = require('moment');

//BI分析-数据
async function getDataAlarmsAggDay (ctx) {
   try {
      const { utils: { anxinStrucIdRange } } = ctx.app.fs
      const { pepProjectId } = ctx.query

      let dataAbnormal = [], dataInterrupt = [], policyHit = [], deviceAbnormal = [];
      let anxinStruc = await anxinStrucIdRange({
         ctx, pepProjectId
      })
      let whereOption = []
      if (anxinStruc.length) {
         const anxinStrucIds = anxinStruc.map(a => a.strucId)
         whereOption.push(`alarms.StructureId IN (${anxinStrucIds.join(",")})`)

         let start = moment().add(-1, 'year').format('YYYY-MM-DD HH:mm:ss');//最近一年
         whereOption.push(`alarms.StartTime >= '${start}'`)

         let alarmQueryOptionStr = `
            FROM alarms 
            ${whereOption.length ? 'WHERE ' + whereOption.join(' AND ') : ''}
         `
         dataAbnormal = await queryAlarm(ctx, alarmQueryOptionStr, [2]);//数据异常
         dataInterrupt = await queryAlarm(ctx, alarmQueryOptionStr, [1]);//数据中断
         policyHit = await queryAlarm(ctx, alarmQueryOptionStr, [3]);//策略命中
         deviceAbnormal = await queryAlarm(ctx, alarmQueryOptionStr, [4, 5]);//设备异常
      }
      ctx.status = 200;
      ctx.body = { dataAbnormal, dataInterrupt, policyHit, deviceAbnormal };
   } catch (error) {
      ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
      ctx.status = 400;
      ctx.body = {
         message: typeof error == 'string' ? error : undefined
      }
   }
}

async function queryAlarm (ctx, alarmQueryOptionStr, type) {
   const { clickHouse } = ctx.app.fs
   try {
      const alarmRes = await clickHouse.dataAlarm.query(`
      select days day, sum(count) total, sum(done) done from (

      SELECT formatDateTime(StartTime,'%F') days, count(AlarmId) count, 0 done from
         (SELECT 
            alarms.AlarmId AS AlarmId, 
            alarms.State AS State, 
            StartTime, 
            AlarmGroup
         ${alarmQueryOptionStr} and alarms.AlarmGroup in [${type}]) group by days

         union all (SELECT formatDateTime(StartTime,'%F') days, 0 count, count(AlarmId) done from
         (SELECT 
            alarms.AlarmId AS AlarmId, 
            alarms.State AS State, 
            StartTime, 
            AlarmGroup
         ${alarmQueryOptionStr} and alarms.AlarmGroup in [${type}] and alarms.State > 2) group by days)
         
         ) group by days ORDER BY days
      `).toPromise();
      return alarmRes;
   } catch (error) {
      ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
      ctx.status = 400;
      ctx.body = {
         message: typeof error == 'string' ? error : undefined
      }
   }
}

//BI分析-应用异常
async function getAppAlarmsAggDay (ctx) {
   try {
      const models = ctx.fs.dc.models;
      const { utils: { pomsProjectRange } } = ctx.app.fs
      const { pepProjectId } = ctx.query

      let pomsProject = await pomsProjectRange({
         ctx, pepProjectId
      })
      const pomsProjectIds = pomsProject.map(p => p.id)
      let findOption = {
         where: {
            createTime: { $gte: moment().add(-1, 'year').format() },//最近一年
         },
         attributes: ['id', 'createTime', 'confirmTime'],
         include: [{
            model: models.App,
            attributes: ['id'],
            include: [{
               model: models.ProjectCorrelation,
               attributes: ['id']
            }]
         }]
      }
      findOption.where['$app->projectCorrelations.id$'] = {
         $in: pomsProjectIds
      }
      const listRes = await models.AppAlarm.findAll(findOption)
      let aggDayMap = [];
      for (let a of listRes) {
         let exist = aggDayMap.find(ad => ad.day == moment(a.createTime).format('YYYY-MM-DD'));
         if (exist) {
            exist.total++;//总数
            if (a.confirmTime) {
               exist.done++;//已恢复
            }
         } else {
            aggDayMap.push({ day: moment(a.createTime).format('YYYY-MM-DD'), total: 1, done: a.confirmTime ? 1 : 0 });
         }
      }
      aggDayMap.sort((a, b) => moment(a.day) - moment(b.day));//升序
      ctx.status = 200;
      ctx.body = aggDayMap;
   } catch (error) {
      ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
      ctx.status = 400;
      ctx.body = {
         message: typeof error == 'string' ? error : undefined
      }
   }
}

//BI分析-视频异常
async function getVideoAlarmsAggDay (ctx) {
   try {
      const { clickHouse, utils: { anxinStrucIdRange } } = ctx.app.fs
      const { database: anxinyun } = clickHouse.anxinyun.opts.config
      const { pepProjectId } = ctx.query
      let anxinStruc = await anxinStrucIdRange({
         ctx, pepProjectId
      })
      const anxinStrucIds = anxinStruc.map(a => a.strucId)
      let statusAlarmWhereOption = []
      let start = moment().add(-1, 'year').format('YYYY-MM-DD HH:mm:ss');//最近一年
      statusAlarmWhereOption.push(`camera_status_alarm.create_time >= '${start}'`)

      const videoAlarms = anxinStrucIds.length ? await clickHouse.vcmp.query(
         `SELECT         
               cameraAlarm.cameraId AS cameraId,
               cameraAlarm.alarmId AS alarmId,
               cameraAlarm.createTime AS createTime,
               cameraAlarm.confirmTime AS confirmTime,
               ${'cameraAlarm.autoRestore AS autoRestore,'}
               anxinStruc.id AS strucId
            FROM
               (
                  SELECT
                        camera.id AS cameraId,
                        camera_status_alarm.id AS alarmId,
                        camera_status_alarm.create_time AS createTime,
                        camera_status_alarm.platform AS platform,
                        camera_status_alarm.status_id AS statusId,
                        camera_status_alarm.serial_no AS cameraSerialNo,
                        camera_status_alarm.channel_no AS cameraChannelNo,
                        ${'camera_status_alarm.auto_restore AS autoRestore,'}
                        camera_status_alarm.confirm_time AS confirmTime
                     FROM camera_status_alarm
                     INNER JOIN camera
                        ON camera.serial_no = camera_status_alarm.serial_no
                        AND camera.channel_no = camera_status_alarm.channel_no
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
                           ${`WHERE ${anxinyun}.t_video_ipc.structure IN (${anxinStrucIds.join(',')}, -1)`}
                     )
               ) AS cameraAlarm
            LEFT JOIN camera_status
               ON cameraAlarm.platform = camera_status.platform
               AND cameraAlarm.statusId = camera_status.id
            LEFT JOIN camera_status_resolve
               ON camera_status_resolve.status_id = camera_status.id

            LEFT JOIN ${anxinyun}.t_video_ipc AS anxinIpc
               ON toString(anxinIpc.channel_no) = cameraAlarm.cameraChannelNo
               AND anxinIpc.serial_no = cameraAlarm.cameraSerialNo
            LEFT JOIN ${anxinyun}.t_structure AS anxinStruc
               ON anxinStruc.id = anxinIpc.structure
               AND anxinStruc.id IN (${anxinStrucIds.join(',')}, -1)
            LEFT JOIN ${anxinyun}.t_video_ipc_station AS anxinIpcStation
               ON anxinIpcStation.ipc = anxinIpc.id
         `).toPromise() : []

      let returnD = []
      let positionD = {}
      // 每个设备一个告警
      for (let a of videoAlarms) {
         if (positionD[a.cameraId]) {
         } else {
            let d = {
               cameraId: a.cameraId,
               autoRestore: a.autoRestore,
               createTime: a.createTime,
               alarmId: a.alarmId,
               confirmTime: a.confirmTime,
            }
            d.pomsProject = (
               anxinStruc.find(as => as.strucId == a.strucId) ||
               {
                  pomsProject: [

                  ]
               }
            ).pomsProject.map(d => d.id)
            returnD.push(d)
            positionD[a.cameraId] = {
               positionReturnD: returnD.length - 1
            }
         }
      }
      let aggDayMap = [];
      for (let a of returnD) {
         let exist = aggDayMap.find(ad => ad.day == moment(a.createTime).format('YYYY-MM-DD'));
         if (exist) {
            exist.total++;//总数
            if (a.confirmTime || a.autoRestore) {
               exist.done++;//已恢复
            }
         } else {
            aggDayMap.push({ day: moment(a.createTime).format('YYYY-MM-DD'), total: 1, done: a.confirmTime || a.autoRestore ? 1 : 0 });
         }
      }
      ctx.status = 200;
      ctx.body = aggDayMap;
   } catch (error) {
      ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
      ctx.status = 400;
      ctx.body = {
         message: typeof error == 'string' ? error : undefined
      }
   }
}

//BI分析-问题处置效率分析
async function getAlarmsHandleStatistics (ctx) {
   try {
      const { projectCorrelationId } = ctx.query
      const models = ctx.fs.dc.models;
      const data = await models.AlarmHandleStatistics.findAll({
         order: [['time', 'DESC']],
         where: projectCorrelationId ?
            {
               projectCorrelationId: { $in: projectCorrelationId.split(',') }
            }
            : {},
         limit: 1
      })
      ctx.status = 200;
      ctx.body = data;
   } catch (error) {
      ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
      ctx.status = 400;
      ctx.body = {
         message: typeof error == 'string' ? error : undefined
      }
   }
}
//最新动态
async function getLatestDynamic (ctx) {
   try {
      const { models } = ctx.fs.dc;
      const { limit, page, projectCorrelationId, types } = ctx.query;
      const { userInfo } = ctx.fs.api;
      const { clickHouse } = ctx.app.fs;

      let where = { type: { $in: types.split(',') } }//传类型选择
      if (!userInfo.role.includes('SuperAdmin') && !userInfo.role.includes('admin')) {
         where.projectCorrelationId = { $in: userInfo.correlationProject }
      }
      if (projectCorrelationId) {//查指定项目,控制台全局切换
         where.projectCorrelationId = projectCorrelationId
      }


      let news = await models.LatestDynamicList.findAll({//最新动态
         include: [{
            model: models.ProjectCorrelation,
            where: { del: false },
            attributes: ['id', 'name', 'pepProjectId'],
         }, {
            model: models.AlarmAppearRecord
         }, {
            model: models.EmailSendLog,
            include: [{
               model: models.AlarmPushConfig,
               attributes: ['id', 'name'],
            }]
         }, {
            model: models.AlarmConfirmLog
         }],
         where: where,
         offset: Number(page) * Number(limit),
         limit: Number(limit),
         order: [['time', 'desc']],
      });



      //查项目名称 查用户名
      let pepPojectIds = new Set(), notedUserIds = new Set(), emailSendPomsProjectIds = new Set();
      for (let p of news) {
         if (p.projectCorrelation && p.projectCorrelation.pepProjectId) {
            pepPojectIds.add(p.projectCorrelation.pepProjectId);
         }

         if (p.emailSendLog) {
            p.emailSendLog.toPepUserIds.map(u => {
               notedUserIds.add(u);//通知 接收人
            })
            p.emailSendLog.projectCorrelationId.forEach(pid => emailSendPomsProjectIds.add(pid))
         }
         if (p.alarmConfirmLog && p.alarmConfirmLog.pepUserId) {
            notedUserIds.add(p.alarmConfirmLog.pepUserId);//确认 操作者
         }
      }




      // EM 推送的特殊处理
      // 查找对应的 projectCorrelation
      const emailLogProjectCorrelationRes =
         emailSendPomsProjectIds.size ?
            await models.ProjectCorrelation.findAll({
               where: {
                  id: { $in: [...emailSendPomsProjectIds] }
               }
            }) : []




      for (let { dataValues: p } of emailLogProjectCorrelationRes) {
         if (p.pepProjectId) {
            pepPojectIds.add(p.pepProjectId)
         }
      }



      let pepProjects = pepPojectIds.size ? await clickHouse.projectManage.query(`
         SELECT id, project_name FROM t_pim_project WHERE id IN (${[...pepPojectIds].join(',')},-1)
      `).toPromise() : [];





      let userPepRes = notedUserIds.size ? await clickHouse.pepEmis.query(
         `SELECT DISTINCT user.id AS id, "user"."name" AS name FROM user WHERE user.id IN (${[...notedUserIds].join(',')},-1)
      `).toPromise() : []

      let appear = [], notice = [], confirm = [];
      news.map(d => {
         let projectName = d.projectCorrelation.name || pepProjects.find(pp => pp.id == d.projectCorrelation.pepProjectId).project_name;
         if (d.alarmAppearId) {
            appear.push({
               projectName,
               ...d.alarmAppearRecord.dataValues
            });
         }
         if (d.emailSendId) {
            notice.push({
               userName: userPepRes.filter(u => d.emailSendLog.toPepUserIds.indexOf(u.id) != -1),
               projectName: d.emailSendLog.projectCorrelationId.map(p => {
                  let projectName = ''
                  if (p.pepProjectId) {
                     projectName = pepProjects.find(pp => pp.id == p.pepProjectId).project_name
                  } else {
                     projectName = p.name
                  }
                  return projectName
               }).join('、'),
               ...d.emailSendLog.dataValues
            });
         }
         if (d.alarmConfirmId) {
            confirm.push({
               userName: d.alarmConfirmLog.pepUserId ? userPepRes.find(u => u.id == d.alarmConfirmLog.pepUserId).name : '自动恢复',
               projectName,
               ...d.alarmConfirmLog.dataValues
            });
         }
      })
      ctx.status = 200;
      ctx.body = {
         appear,//发现
         notice,//通知
         confirm//确认
      };
   } catch (error) {

      ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
      ctx.status = 400;
      ctx.body = {
         message: typeof error == 'string' ? error : undefined
      }
   }
}

module.exports = {
   getDataAlarmsAggDay,
   getAppAlarmsAggDay,
   getVideoAlarmsAggDay,
   getAlarmsHandleStatistics,
   getLatestDynamic

};