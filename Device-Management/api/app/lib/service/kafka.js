'use strict';
const moment = require('moment');
const Kafka = require('kafka-node');

module.exports = async function factory (app, opts) {
   try {
      const client = new Kafka.KafkaClient({ kafkaHost: opts.kafka.rootURL, fromOffset: true });
      const producer = new Kafka.HighLevelProducer(client);
      producer.on('error', function (err) {
         app.fs.logger.log('error', "[FS-KAFKA]", err);
      });
      producer.on("ready", function () {
         console.log('Kafka ready')
      })

      let groupId = 'group' + Math.random()
      let consumer = new Kafka.ConsumerGroup(Object.assign({}, { groupId, fromOffset: 'latest' }, { kafkaHost: opts.kafka.rootURL }), ['anxinyun_alarm'])

      // consumer.on('message', async function (message) {
      //    let msg = JSON.parse(message.value)
      //    await handleMsg(msg);
      // })

      const kafka = {
         producer: producer,
         configUpdateMessage: opts.configUpdateMessage || {}
      };

      app.fs.kafka = kafka;
      app.fs.logger.log('debug', "[FS-KAFKA]", "Init.Success");


      /*----------------------推送节流---20230103---------------------------------*/
      //全局变量
      let kafkaMsgObj = {
         time: null,
         dataMap: [],
         toHandle: false//有待处理
      }
      async function handleMsg (msg) {
         try {
            let { messageMode } = msg
            if (['AlarmGeneration', 'AlarmAutoElimination'].indexOf(messageMode) != -1) {
               if (!kafkaMsgObj.time || moment() > moment(kafkaMsgObj.time).add(2, 'minute')) {//首次 || 跟上次时间间隔大于2分钟 直接发送
                  let structsAche = await getStructsAche()
                  if (structsAche.dataList.length) {
                     await savePullAlarm(msg, structsAche.dataList)//直接给处理了

                     kafkaMsgObj.time = moment().format();//记录本次发送时间
                     kafkaMsgObj.dataMap = []
                     kafkaMsgObj.toHandle = false
                  }
               } else {//放进队列
                  kafkaMsgObj.dataMap.push(msg);
                  kafkaMsgObj.toHandle = true;//有待发送
               }
            }
         } catch (error) {
            console.error(error);
         }
      }
      setInterval(async () => {
         // if (kafkaMsgObj.toHandle) {//有待发送
         //    let structsAche = await getStructsAche()
         //    if (structsAche.dataList.length) {

         //       kafkaMsgObj.dataMap.forEach(async d => {
         //          await savePullAlarm(d, structsAche.dataList)
         //       })

         //       kafkaMsgObj.time = moment().format()
         //       kafkaMsgObj.dataMap = []
         //       kafkaMsgObj.toHandle = false
         //    } else {
         //       console.log(`获取结构物列表失败`);
         //    }
         // }
      }, 60 * 1000 * 2)//2分钟
      /*----------------------推送节流---20230103---------------------------------*/


      let structsAche = {
         dataList: [],
         expireTime: null//10分钟更新一次结构物列表
      }
      async function getStructsAche () {
         const { utils: { getAxyStructs } } = app.fs
         try {
            if (!structsAche.dataList.length || moment() > moment(structsAche.expireTime)) {
               let structList = await getAxyStructs();
               if (structList && structList.length) {
                  structsAche.dataList = structList;
                  structsAche.expireTime = moment().add(10, 'minute').format('YYYY-MM-DD HH:mm:ss');
               }
            }
            return structsAche;
         } catch (err) {
            console.log(`获取结构物列表失败, error: ${err}`);
         }
      }

      //保存告警[发现]
      let constAlarmGroups = {
         1: '数据中断',
         2: '数据异常',
         3: '策略命中',
         4: '设备异常',
         5: '设备异常'
      }
      async function savePullAlarm (msg, structs) {
         const { clickHouse, utils: { sendAppearToWeb, sendConfirmToWeb } } = app.fs
         try {
            let { messageMode, structureId, sourceName, alarmTypeCode, alarmCode, content, time } = msg;
            // let structsAche = await getStructsAche()
            // if (structsAche) {
            //let structs = structsAche.dataList;//结构物列表
            const { models } = app.fs.dc
            let exist = structs.find(s => s.strucId == structureId);
            if (exist) {
               let alarm_group = await clickHouse.anxinyun.query(
                  `SELECT alarm_group, alarm_group_unit FROM t_alarm_code WHERE code='${alarmCode}'`).toPromise()

               let type = null, typeId = null, alarmGroup = null;//告警类型 异常类型
               if (alarm_group && alarm_group.length && alarm_group[0].alarm_group) {
                  typeId = alarm_group[0].alarm_group;
                  type = constAlarmGroups[alarm_group[0].alarm_group];//告警类型
                  let gId = alarm_group[0].alarm_group_unit;
                  let alarm_group_unit = await clickHouse.anxinyun.query(
                     `SELECT name FROM t_alarm_group_unit WHERE id=${gId}`).toPromise();
                  alarmGroup = alarm_group_unit.length ? alarm_group_unit[0].name : null//异常类型
               }

               let projects = exist.pomsProject.filter(d => !d.del).map(p => p.id);
               if (messageMode == 'AlarmGeneration') {//告警产生--------------------------------------------------1
                  let datas = projects.map(d => {//需要 项目,告警源,异常类型,时间
                     return {
                        projectCorrelationId: d,
                        alarmInfo: { messageMode, sourceName, alarmTypeCode, alarmCode, content, type: alarmGroup, typeId },
                        time: time,
                        type//告警类型
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
                     await sendAppearToWeb(datas, 'data', exist);
                  }


               } else if (messageMode == 'AlarmAutoElimination') {//告警自动恢复------------------------------------2
                  let datas = projects.map(d => {
                     return {
                        pepUserId: null,
                        projectCorrelationId: d,
                        alarmInfo: { source: sourceName, type: alarmGroup },//包含告警id,type,source
                        confirmTime: time,
                        confirmContent: '自动恢复'
                     }
                  })
                  let rslt = await models.AlarmConfirmLog.bulkCreate(datas, { returning: true });
                  let dynamics = rslt.map(r => {
                     return {
                        time: r.confirmTime,
                        alarmConfirmId: r.id,
                        projectCorrelationId: r.projectCorrelationId,
                        type: 4//告警确认
                     }
                  })
                  await models.LatestDynamicList.bulkCreate(dynamics);


                  //消息推送到前端
                  if (datas.length) {
                     await sendConfirmToWeb(datas, true);
                  }
               }
            }
            // } else {
            //    console.log(`获取结构物列表失败`);
            // }
         } catch (error) {
            console.error(error);
         }
      }
   } catch (error) {
      console.log(error);
   }
}