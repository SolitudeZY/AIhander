'use strict';
const moment = require('moment')

module.exports = function (app, opts) {
   const { models } = app.fs.dc
   const { clickHouse } = app.fs

   let constAlarmGroups = {
      1: '数据中断',
      2: '数据异常',
      3: '策略命中',
      4: '设备异常',
      5: '设备异常',
      'video': '视频异常',
      'app': '应用异常'
   }
   let constAlarmUrls = {
      1: '/problem/dataAlarm/dataLnterrupt',
      2: '/problem/dataAlarm/dataAbnormal',
      3: '/problem/dataAlarm/strategyHit',
      4: '/problem/deviceAlarm/deviceAbnormal',
      5: '/problem/deviceAlarm/deviceAbnormal',
      'video': '/problem/dataAlarm/videoAbnormal',
      'app': '/problem/useAlarm/useAbnormal'
   }
   async function sendAppearToWeb(datas, ttype, aboutProject) {
      try {
         let alarmTypee = null, jumpUrl = null//告警类型 跳转地址

         //项目信息
         //let { projects, pepProjects } = await getProjectsInfo(datas);

         //数据类区分alarmGroup
         if (ttype == 'data') {
            // let alarm_group = await clickHouse.anxinyun.query(
            //    `SELECT alarm_group FROM t_alarm_code WHERE code='${datas[0].alarmInfo.alarmCode}'`).toPromise();

            let typeId = datas[0].alarmInfo.typeId;//1,2,3,4,5
            alarmTypee = constAlarmGroups[typeId] || null
            jumpUrl = constAlarmUrls[typeId] || null
         } else {
            alarmTypee = constAlarmGroups[ttype]
            jumpUrl = constAlarmUrls[ttype]
         }

         let sendData = []
         datas.map(ld => {
            let item = aboutProject.pomsProject.find(p => p.id == ld.projectCorrelationId);
            sendData.push({
               projectCorrelationId: ld.projectCorrelationId,
               project: item.name || item.pepProject.projectName,//前者为自定义项目名称
               source: ld.alarmInfo.sourceName,
               alarmGroup: ld.alarmInfo.type,//异常类型
               time: ld.time,
               type: alarmTypee,//告警类型
               jumpUrl//跳转地址
            })
         })
         //app.socket.emit('alarmSendSocket', { type: 'alarmAppear', sendData })
         await socketThrottle('appear', sendData);
      } catch (err) {
         console.log(`告警(发现)推送失败, error: ${err}`);
      }
   }

   async function sendConfirmToWeb (logDatas, isAuto) {
      try {
         //用户信息
         let userName = null
         if (!isAuto) {
            let userPepRes = await clickHouse.pepEmis.query(
               `SELECT DISTINCT user.id AS id, "user"."name" AS name FROM user WHERE user.id=${logDatas[0].pepUserId}`).toPromise();
            userName = userPepRes.length ? userPepRes[0].name : null
         }

         //项目信息
         let { projects, pepProjects } = await getProjectsInfo(logDatas);
         let sendData = []
         logDatas.map(ld => {
            let pepPId = projects.find(p => p.id == ld.projectCorrelationId).pepProjectId;
            sendData.push({
               user: userName,
               projectCorrelationId: ld.projectCorrelationId,
               project: projects.find(p => p.id == ld.projectCorrelationId).name || pepProjects.find(pp => pp.id == pepPId).project_name,//前者为自定义项目名称
               source: ld.alarmInfo.source,
               type: ld.alarmInfo.type,
               time: ld.confirmTime,
               isAuto//是否为自动恢复,自动恢复时user为null
            })
         })
         //app.socket.emit('alarmSendSocket', { type: 'alarmConfirm', sendData })//小飞(处理人) 确认并关闭了A项目(项目) DTU设备(告警源) 状态异常(异常类型)的问题
         await socketThrottle('confirm', sendData);
      } catch (err) {
         console.log(`告警(确认)推送失败, error: ${err}`);
      }
   }

   async function getProjectsInfo (datas) {
      try {
         let pIds = datas.map(l => l.projectCorrelationId);//所有的项目的id
         let projects = await models.ProjectCorrelation.findAll({
            where: { id: { $in: pIds } },
            attributes: ['id', 'name', 'pepProjectId']
         });

         let pepPojectIds = new Set();
         for (let p of projects) {
            if (p.pepProjectId) {
               pepPojectIds.add(p.pepProjectId);
            }
         }
         console.log('项目id',`(${[...pepPojectIds].join(',')}, -1)`)
         let pepProjects = pepPojectIds.size ? await clickHouse.projectManage.query(`
              SELECT id, project_name FROM t_pim_project WHERE id IN (${[...pepPojectIds].join(',')}, -1)`
         ).toPromise() : [];

         return { projects, pepProjects };
      } catch (err) {
         console.log(`获取项目信息失败, error: ${err}`);
      }
   }

   async function sendNoticeToWeb (pepUsers, data) {
      try {
         let { cfgName, tactics, tacticsParams, projectCorrelationId, time } = data;
         //项目信息
         let { projects, pepProjects } = await getProjectsInfo([data]);
         let pepPId = projects.find(p => p.id == projectCorrelationId).pepProjectId;

         //需要 策略名称 处理人 项目 策略和参数 时间
         let sendData = [{
            pushConfig: { cfgName, tactics, tacticsParams },//策略信息
            pepUsers,
            projectCorrelationId: projectCorrelationId,
            project: projects.find(p => p.id == projectCorrelationId).name || pepProjects.find(pp => pp.id == pepPId).project_name,//前者为自定义项目名称
            time
         }]

         //app.socket.emit('alarmSendSocket', { type: 'alarmNotice', sendData })
         await socketThrottle('notice', sendData);
      } catch (err) {
         console.log(`推送通知失败, error: ${err}`);
      }
   }

   async function socketThrottle (type, dataList) {
      try {
         if (!msgSendObj.time || moment() > moment(msgSendObj.time).add(1, 'minute')) {//首次 || 跟上次时间间隔大于1分钟 直接发送
            msgSendObj.dataMap[type] = dataList;
            app.socket.emit('alarmSendSocket', { msgDataMap: msgSendObj.dataMap });//发送到前端

            msgSendObj.time = moment().format();//记录本次发送时间
            msgSendObj.dataMap = { appear: [], confirm: [], notice: [] }
            msgSendObj.toSend = false
         } else {//放进队列
            msgSendObj.dataMap[type] = msgSendObj.dataMap[type].concat(dataList);
            msgSendObj.toSend = true;//有待发送
         }
      } catch (err) {
         console.log(`推送节流失败, error: ${err}`);
      }
   }

   //全局变量
   let msgSendObj = {
      time: null,
      dataMap: { appear: [], confirm: [], notice: [] },
      toSend: false//有待发送
   }
   setInterval(async () => {
      if (msgSendObj.toSend) {//有待发送
         app.socket.emit('alarmSendSocket', { msgDataMap: msgSendObj.dataMap })//发送到前端

         msgSendObj.time = moment().format()
         msgSendObj.dataMap = { appear: [], confirm: [], notice: [] }
         msgSendObj.toSend = false
      }
   }, 60 * 1000)//1分钟

   return {
      sendAppearToWeb,//推送告警发现
      sendConfirmToWeb,//推送告警确认
      sendNoticeToWeb//推送通知
   }
}