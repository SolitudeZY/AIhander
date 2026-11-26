'use strict';
const moment = require('moment');

module.exports = function (app, opts) {
   const { models } = app.fs.dc
   const { clickHouse } = app.fs
   const { database: anxinyun } = clickHouse.anxinyun.opts.config
   const alarmHandleStatistics = app.fs.scheduleInit(
      {
         interval: '0 18 1 ? * 1',//每周一1点18触发
         // immediate: true,
         proRun: true,
      },
      async () => {
         try {
            let anxinStruc = await getAxyStructs()
            let pomsProject = await pomsProjectRange()
            if (anxinStruc.length) {
               let { dataSum, dataMaps } = await getDataAlarms(anxinStruc);//数据告警
               let appAlarms = await getAppAlarms(pomsProject);//应用告警
               let videoAlarms = await getVideoAlarms(anxinStruc);//视频告警


               let time = moment().format()
               //算全局
               //let dataArrToSave = []
               let dataMap = calculate(dataMaps, appAlarms, videoAlarms)
               let sum = dataSum + appAlarms.length + videoAlarms.length;
               if (sum) {
                  let data = {
                     time: time,
                     projectCorrelationId: null,//全局
                     day1: parseFloat((100 * dataMap.day1 / sum).toFixed(2)),
                     day3: parseFloat((100 * dataMap.day3 / sum).toFixed(2)),
                     day7: parseFloat((100 * dataMap.day7 / sum).toFixed(2)),
                     day15: parseFloat((100 * dataMap.day15 / sum).toFixed(2)),
                     day30: parseFloat((100 * dataMap.day30 / sum).toFixed(2)),
                     day30m: parseFloat((100 * dataMap.day30m / sum).toFixed(2)),
                  }
                  await models.AlarmHandleStatistics.create(data)
               }

               //算单个项目
               pomsProject.map(async p => {
                  let pid = p.id;
                  //let pid = 11
                  let pAnxinStruc = await getAxyStructs(pid)
                  let pPomsProject = await pomsProjectRange(pid)
                  if (pAnxinStruc.length) {
                     let { dataSum, dataMaps } = await getDataAlarms(pAnxinStruc);//数据告警
                     let pAppAlarms = await getAppAlarms(pPomsProject);//应用告警
                     let pVideoAlarms = await getVideoAlarms(pAnxinStruc);//视频告警
                     let pDataMap = calculate(dataMaps, pAppAlarms, pVideoAlarms)
                     let sm = dataSum + pAppAlarms.length + pVideoAlarms.length;
                     if (sm) {
                        let data = {
                           time: time,
                           projectCorrelationId: pid,//单个项目
                           day1: parseFloat((100 * pDataMap.day1 / sm).toFixed(2)),
                           day3: parseFloat((100 * pDataMap.day3 / sm).toFixed(2)),
                           day7: parseFloat((100 * pDataMap.day7 / sm).toFixed(2)),
                           day15: parseFloat((100 * pDataMap.day15 / sm).toFixed(2)),
                           day30: parseFloat((100 * pDataMap.day30 / sm).toFixed(2)),
                           day30m: parseFloat((100 * pDataMap.day30m / sm).toFixed(2)),
                        }
                        await models.AlarmHandleStatistics.create(data)
                     }
                  }
               })
               //算单个项目
               // pomsProject.map(p => {
               //    let pid = p.id;
               //    let pDataAlarms = dataAlarms.filter(da => da.pomsProject.indexOf(pid) != -1)
               //    let pAppAlarms = appAlarms.filter(aa => aa.app.projectCorrelations.map(ap => ap.id).indexOf(pid) != -1)
               //    let pVideoAlarms = videoAlarms.filter(va => va.pomsProject.indexOf(pid) != -1)

               //    let pDataMap = calculate(pDataAlarms, pAppAlarms, pVideoAlarms)
               //    let sm = pDataAlarms.length + pAppAlarms.length + pVideoAlarms.length;
               //    if (sm) {
               //       dataArrToSave.push({
               //          time: time,
               //          projectCorrelationId: pid,//单个项目
               //          day1: parseFloat((100 * pDataMap.day1 / sum).toFixed(2)),
               //          day3: parseFloat((100 * pDataMap.day3 / sum).toFixed(2)),
               //          day7: parseFloat((100 * pDataMap.day7 / sum).toFixed(2)),
               //          day15: parseFloat((100 * pDataMap.day15 / sum).toFixed(2)),
               //          day30: parseFloat((100 * pDataMap.day30 / sum).toFixed(2)),
               //          day30m: parseFloat((100 * pDataMap.day30m / sum).toFixed(2)),
               //       })
               //    }
               // })
               //await models.AlarmHandleStatistics.bulkCreate(dataArrToSave)
            }
         } catch (error) {
            console.error(error);
         }
      }
   )

   function calculate(dataMaps, appAlarms, videoAlarms) {
      try {
         let { day1, day3, day7, day15, day30, day30m } = dataMaps;
         //算全局
         let dataMap = {
            day1: day1[0].count,//当日处理
            day3: day3[0].count,//3日内
            day7: day7[0].count,//7日内
            day15: day15[0].count,//15日内
            day30: day30[0].count,//30日内
            day30m: day30m[0].count//超过30日
         }
         // dataAlarms.filter(d => d.State > 3).map(da => {
         //    let range = moment(da.confirmTime).diff(moment(da.StartTime), 'day')
         //    if (range <= 1) {
         //       dataMap.day1++
         //    } else if (range > 1 && range <= 3) {
         //       dataMap.day3++
         //    } else if (range > 3 && range <= 7) {
         //       dataMap.day7++
         //    } else if (range > 7 && range <= 15) {
         //       dataMap.day15++
         //    } else if (range > 15 && range <= 30) {
         //       dataMap.day30++
         //    } else if (range > 30) {
         //       dataMap.day30m++
         //    }
         // })
         appAlarms.filter(d => d.confirmTime).map(da => {
            let range = moment(da.confirmTime).diff(moment(da.createTime), 'day')
            if (range < 1) {
               dataMap.day1++
            } else if (range >= 1 && range < 3) {
               dataMap.day3++
            } else if (range >= 3 && range < 7) {
               dataMap.day7++
            } else if (range >= 7 && range < 15) {
               dataMap.day15++
            } else if (range >= 15 && range < 30) {
               dataMap.day30++
            } else if (range >= 30) {
               dataMap.day30m++
            }
         })
         videoAlarms.filter(d => d.confirmTime || d.autoRestore).map(da => {
            let range = moment(da.confirmTime).diff(moment(da.createTime), 'day')
            if (range < 1) {
               dataMap.day1++
            } else if (range >= 1 && range < 3) {
               dataMap.day3++
            } else if (range >= 3 && range < 7) {
               dataMap.day7++
            } else if (range >= 7 && range < 15) {
               dataMap.day15++
            } else if (range >= 15 && range < 30) {
               dataMap.day30++
            } else if (range >= 30) {
               dataMap.day30m++
            }
         })
         return dataMap;
      } catch (error) {
         console.error(error);
      }
   }

   function getStr(alarmQueryOptionStr, paramStr) {
      return `
      select count(AlarmId) count from
      (SELECT 
      alarms.AlarmId AS AlarmId, 
      alarms.State AS State, 
      alarms.StructureId AS StructureId,
      StartTime, EndTime
      ${alarmQueryOptionStr}) where State>2 and ${paramStr}`
   }

   async function getDataAlarms(anxinStruc) {
      try {
         const anxinStrucIds = anxinStruc.map(a => a.strucId)
         let whereOption = []
         whereOption.push(`alarms.StructureId IN (${anxinStrucIds.join(",")})`)

         let start = moment().add(-1, 'year').format('YYYY-MM-DD HH:mm:ss');//最近一年
         whereOption.push(`alarms.StartTime >= '${start}'`)

         let alarmQueryOptionStr = `FROM alarms
               LEFT JOIN ${anxinyun}.t_structure 
               ON ${anxinyun}.t_structure.id = alarms.StructureId
               ${whereOption.length ? 'WHERE ' + whereOption.join(' AND ') : ''}`

         console.log('开始查数据-数据-数据类告警---' + moment().format('YYYY-MM-DD HH:mm:ss'))

         const alarmRes = await clickHouse.dataAlarm.query(`
               select count(AlarmId) count from
               (SELECT 
               alarms.AlarmId AS AlarmId, 
               alarms.State AS State, 
               alarms.StructureId AS StructureId,
               StartTime, EndTime
               ${alarmQueryOptionStr})`).toPromise();

         let day1Str = getStr(alarmQueryOptionStr, 'Date(EndTime) - Date(StartTime)<=1');
         let day1 = await clickHouse.dataAlarm.query(day1Str).toPromise();

         let day3Str = getStr(alarmQueryOptionStr, 'Date(EndTime) - Date(StartTime)>1 and Date(EndTime) - Date(StartTime)<=3');
         let day3 = await clickHouse.dataAlarm.query(day3Str).toPromise();

         let day7Str = getStr(alarmQueryOptionStr, 'Date(EndTime) - Date(StartTime)>3 and Date(EndTime) - Date(StartTime)<=7');
         let day7 = await clickHouse.dataAlarm.query(day7Str).toPromise();

         let day15Str = getStr(alarmQueryOptionStr, 'Date(EndTime) - Date(StartTime)>7 and Date(EndTime) - Date(StartTime)<=15');
         let day15 = await clickHouse.dataAlarm.query(day15Str).toPromise();

         let day30Str = getStr(alarmQueryOptionStr, 'Date(EndTime) - Date(StartTime)>15 and Date(EndTime) - Date(StartTime)<=30');
         let day30 = await clickHouse.dataAlarm.query(day30Str).toPromise();

         let day30mStr = getStr(alarmQueryOptionStr, 'Date(EndTime) - Date(StartTime)>30');
         let day30m = await clickHouse.dataAlarm.query(day30mStr).toPromise();

         // console.log('数据-数据-数据告警查询结束---' + moment().format('YYYY-MM-DD HH:mm:ss') + `---一共${alarmRes.length}条`)

         // const confirmedAlarm = alarmRes.filter(ar => ar.State && ar.State > 2).map(ar => "'" + ar.AlarmId + "'");
         // const confirmedAlarmDetailMax = confirmedAlarm.length ?
         //    await clickHouse.dataAlarm.query(`
         //          SELECT 
         //             max(Time) AS Time, AlarmId
         //          FROM 
         //             alarm_details
         //          WHERE
         //             AlarmId IN (${confirmedAlarm.join(',')})
         //          GROUP BY AlarmId
         //       `).toPromise() : [];

         // alarmRes.forEach(ar => {
         //    ar.pomsProject = (
         //       anxinStruc.find(as => as.strucId == ar.StructureId) ||
         //       {
         //          pomsProject: [
         //             // TODO: 开发临时添加
         //          ]
         //       }
         //    ).pomsProject.map(p => p.id)

         //    // 最新告警详情 - 确认信息
         //    let corConfirmedData = (confirmedAlarmDetailMax.find(cdm => cdm.AlarmId == ar.AlarmId) || {});
         //    ar.confirmTime = corConfirmedData.Time || ar.EndTime
         // })
         return { dataSum: alarmRes[0].count, dataMaps: { day1, day3, day7, day15, day30, day30m } };
      } catch (error) {
         console.error(error);
      }
   }

   async function getAppAlarms(pomsProject) {
      try {
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

         console.log('开始查应用-应用-应用告警---' + moment().format('YYYY-MM-DD HH:mm:ss'))
         const listRes = await models.AppAlarm.findAll(findOption)
         console.log('应用-应用-应用告警查询结束---' + moment().format('YYYY-MM-DD HH:mm:ss') + `---一共${listRes.length}条`)

         return listRes
      } catch (error) {
         console.error(error);
      }
   }
   async function getVideoAlarms(anxinStruc) {
      try {
         const anxinStrucIds = anxinStruc.map(a => a.strucId)
         let statusAlarmWhereOption = []
         let start = moment().add(-1, 'year').format('YYYY-MM-DD HH:mm:ss');//最近一年
         statusAlarmWhereOption.push(`camera_status_alarm.create_time >= '${start}'`)

         console.log('开始查视频-视频-视频告警---' + moment().format('YYYY-MM-DD HH:mm:ss'))
         const alarmRes = anxinStrucIds.length ? await clickHouse.vcmp.query(
            `
            SELECT         
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
                           camera.delete = false 
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
   
               LEFT JOIN ${anxinyun}.t_video_ipc AS anxinIpc
                  ON toString(anxinIpc.channel_no) = cameraAlarm.cameraChannelNo
                  AND anxinIpc.serial_no = cameraAlarm.cameraSerialNo
               LEFT JOIN ${anxinyun}.t_structure AS anxinStruc
                  ON anxinStruc.id = anxinIpc.structure
                  AND anxinStruc.id IN (${anxinStrucIds.join(',')})
               LEFT JOIN ${anxinyun}.t_video_ipc_station AS anxinIpcStation
                  ON anxinIpcStation.ipc = anxinIpc.id
            `).toPromise() : []

         console.log('视频-视频-视频告警查询结束---' + moment().format('YYYY-MM-DD HH:mm:ss') + `---一共${alarmRes.length}条`)
         let returnD = []
         let positionD = {}
         // 每个设备一个告警
         for (let a of alarmRes) {
            if (positionD[a.cameraId]) {
            } else {
               let d = {
                  cameraId: a.cameraId,
                  autoRestore: a.autoRestore,
                  createTime: a.createTime,
                  alarmId: a.alarmId,
                  confirmTime: a.confirmTime,
               }
               // pep 项目
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
         return returnD;
      } catch (error) {
         console.error(error);
      }
   }
   async function pomsProjectRange(pepProjectId) {
      try {
         const { pepProjectRes, bindRes } = await pomsWithPepRangeParams(pepProjectId)
         let pomsProject = []
         for (let b of bindRes) {
            if (b.pepProjectId) {
               let corPepProject = pepProjectRes.find(pp => pp.id == b.pepProjectId) || {}
               pomsProject.push({
                  ...b.dataValues,
                  pepProject: corPepProject
               })
            } else {
               pomsProject.push({
                  ...b.dataValues
               })
            }
         }
         return pomsProject
      } catch (error) {
         console.error(error);
      }
   }

   async function pomsWithPepRangeParams(pepProjectId) {
      try {
         let findOption = {
            where: {
               del: false
            }
         }
         if (pepProjectId) {
            // 有 特定的项目id 就按此查询
            findOption.where.id = pepProjectId
         }
         const bindRes = await models.ProjectCorrelation.findAll(findOption);
         // 获取不重复的 项企项目id
         let pepProjectIds = []
         for (let b of bindRes) {
            if (b.pepProjectId) {
               pepProjectIds.push(b.pepProjectId)
            }
         }
         // 查询项企项目的信息
         const pepProjectRes = pepProjectIds.length ?
            await clickHouse.projectManage.query(
               `SELECT
               t_pim_project.id AS id, 
               t_pim_project.project_name AS projectName, 
               t_pim_project.isdelete AS isdelete,
               t_pim_project_construction.construction_status_id AS constructionStatusId, 
               t_pim_project_state.construction_status AS constructionStatus 
            FROM 
               t_pim_project 
            LEFT JOIN t_pim_project_construction 
               ON t_pim_project.id = t_pim_project_construction.project_id 
            LEFT JOIN t_pim_project_state 
               ON t_pim_project_construction.construction_status_id = t_pim_project_state.id 
            WHERE 
               id IN (${pepProjectIds.join(',')})`
            ).toPromise() : [];

         return {
            pepProjectRes, bindRes
         }

      } catch (error) {
         console.error(error);
      }
   }

   async function getAxyStructs(pepProjectId) {
      try {
         const { pepProjectRes, bindRes } = await pomsWithPepRangeParams(pepProjectId)
         // 获取不重复的 安心云项目 id
         const anxinProjectIds = [
            ...(bindRes).reduce(
               (arr, b) => {
                  for (let sid of b.anxinProjectId) {
                     arr.add(sid);
                  }
                  return arr;
               },
               new Set()
            )
         ]
         // 查询安心云项目及结构物信息
         const undelStrucRes = anxinProjectIds.length ?
            await clickHouse.anxinyun.query(
               `SELECT 
                  t_project.id AS projectId, 
                  t_structure.id AS strucId, 
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
                  t_project.id IN (${anxinProjectIds.join(',')})`).toPromise() : []

         // 构建安心云结构物和项企项目的关系
         // 并保存信息至数据
         let undelStruc = []
         for (let s of undelStrucRes) {
            let corStruc = undelStruc.find(us => us.strucId == s.strucId)
            if (corStruc) {
               if (!corStruc.project.some(cp => cp.id == s.projectId)) {
                  corStruc.project.push({
                     id: s.projectId
                  })
               }
            } else {
               corStruc = {
                  strucId: s.strucId,
                  strucName: s.strucName,
                  projectId: s.projectId,
                  project: [{
                     id: s.projectId,
                  }],
                  pomsProject: []
               }
               undelStruc.push(corStruc)
            }
            for (let { dataValues: br } of bindRes) {
               if (br.anxinProjectId.some(braId => braId == s.projectId)) {
                  let corPepProject = pepProjectRes.find(pp => pp.id == br.pepProjectId)
                  let corPomsProject = corStruc.pomsProject.find(cp => cp.id == br.id)

                  if (corPomsProject) {
                     // poms 的 project 和 pep 的 project 是一对一的关系 所以这个情况不用处理
                  } else {
                     corStruc.pomsProject.push({
                        ...br,
                        pepProject: corPepProject
                     })
                  }

               }
            }
         }
         return undelStruc
      } catch (error) {
         console.error(error);
      }
   }
   return {
      alarmHandleStatistics
   }
}