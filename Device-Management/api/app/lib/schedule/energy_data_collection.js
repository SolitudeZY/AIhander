const schedule = require('node-schedule');
const moment = require('moment');
const request = require('superagent');
let isDev = false;
// isDev = true;
module.exports = function (app, opts, ctx) {
   const energyDataCollection = app.fs.scheduleInit(
      {
         interval: '00 01 * * * *', //每一小时的零一分执行
         // interval: '00 */30 * * * *', // 每30分钟执行一次
         immediate: isDev,
         proRun: !isDev,
      },
      async () => {
         try {
            const { clickHouse } = app.fs;
            const sequelize = app.fs.dc.orm;
            const { energyManagementProjectId } = app.fs.api;
            const { models } = app.fs.dc;
            //标记开始时间
            const startTime = moment();
            //   console.log('开始了1', moment().format('YYYY-MM-DD HH:mm:ss'));
            const res = await getAllData(clickHouse.anxinyun, energyManagementProjectId);
            //   console.log('开始了2', moment().format('YYYY-MM-DD HH:mm:ss'));
            if (res && res.length) {
               res.sort((a, b) => a.Data - b.Data);
            }
            //   console.log('开始了3', moment().format('YYYY-MM-DD HH:mm:ss'));
            const structureData = await getStructureData(
               clickHouse.anxinyun,
               energyManagementProjectId
            );
            //   console.log('开始了4', moment().format('YYYY-MM-DD HH:mm:ss'));
            let deviceIdSet = new Set();
            let rslt = [];
            let recent1monthDeviceData = [];
            let themeDatas = await models.LatestTheme.findAll();
            for (let s = 0; s < res.length; s++) {
               let cur = res[s];
               deviceIdSet.add(cur.deviceId);
               if (deviceIdSet.size >= 500 || s == res.length - 1) {
                  const q = await getDeviceData(clickHouse.iot, deviceIdSet, themeDatas);
                  const p = await getRecent1monthDeviceData(clickHouse.dataAlarm, deviceIdSet);
                  rslt = rslt.concat(q);
                  recent1monthDeviceData = recent1monthDeviceData.concat(p);
                  deviceIdSet = new Set();
               }
            }
            //整理数据
            // console.log('rsltrsltrslt',rslt)
            const cData = classifyData(res, rslt);
            const { list, classifyList, rate, listData, classTotal, total } = cData;
            // console.log('rate',rate)
            let dataObj = {
               deviceData: res,
               structureData: structureData,
               // subordinateDevices: rslt,
               recent1monthDeviceData: recent1monthDeviceData,
               total: total,
               statusTotal: classTotal,
            };
            let redisData = JSON.stringify({
               dataObj,
               classifyList,
               statusList: list,
               rateList: rate,
               listData,
            });
            await app.redis.set('eneryData', redisData);
            //   //分别查近七天数据和近三十天的数据
            //   console.log('开始了5', moment().format('YYYY-MM-DD HH:mm:ss'));
            const sevenDaysData = await getChartData(
               energyManagementProjectId,
               true,
               clickHouse.dataAlarm
            );
            //   console.log('开始了6', moment().format('YYYY-MM-DD HH:mm:ss'));
            const thirtyDaysData = await getChartData(
               energyManagementProjectId,
               false,
               clickHouse.dataAlarm
            );
            const chartsData = classifyChartData(sevenDaysData, thirtyDaysData);
            const { _7daysData, _30daysData } = chartsData;
            let redisChartData = JSON.stringify({ _7daysData, _30daysData });
            await app.redis.set('redisChartData', redisChartData);
            console.log('共耗时', moment().diff(startTime, 's'), '秒');
         } catch (error) {
            console.error('失败原因', error);
         }
      }
   );
   return {
      energyDataCollection,
   };
};

//将铺开的数据整理成项目下面结构物，结构下面对应的设备
const obtainData = (data, subordinateDevices) => {
   let map = new Map();
   data.forEach((item) => {
      let project = map.get(item.projectId);
      if (!project) {
         project = {
            projectId: item.projectId,
            projectName: item.projectName,
            structures: new Map(),
         };
         map.set(item.projectId, project);
      }

      let structure = project.structures.get(item.structureId);
      if (!structure) {
         structure = {
            structureId: item.structureId,
            structureName: item.structureName,
            iotaThingId: item.iota_thing_id,
            devices: [],
         };
         project.structures.set(item.structureId, structure);
      }

      structure.devices.push({
         deviceId: item.deviceId,
         deviceName: item.deviceName,
         data: item.Data,
         collectTime: item.CollectTime,
         subordinateDevices: subordinateDevices.filter((sub) => sub.toLayoutNodeId === item.deviceId),
      });
   });

   return Array.from(map.values()).map((project) => ({
      ...project,
      structures: Array.from(project.structures.values()),
   }));
};
//查询6个项目下所有的数据铺开的
async function getAllData (database, id) {
   const res =
      (await database
         .query(
            `
               WITH tmp AS (
                  SELECT tps.project AS projectId,tp.name as projectName, tps.structure AS structureId,
                  ts.name as structureName, ts.longitude as longitude, ts.latitude as latitude,
                  ts.iota_thing_id AS iota_thing_id, d.id AS deviceId, d.name AS deviceName
                  FROM t_project tp
                  INNER JOIN t_project_structure tps ON tp.id = tps.project
                  INNER JOIN t_structure ts ON ts.id = tps.structure
                  INNER JOIN iota.Device d ON d.thingId = toString(ts.iota_thing_id)
                  INNER JOIN iota.DeviceMeta dm ON dm.id = d.deviceMetaId AND dm.model='FS-YTHJC-DZ'
                  WHERE tps.project IN (${id})
            ),
            tmp2 AS (
                 SELECT 
               DeviceId, 
               CollectTime, 
               Power
            FROM (
         SELECT 
            DeviceId, 
            CollectTime, 
            Power, 
               ROW_NUMBER() OVER (PARTITION BY DeviceId ORDER BY CollectTime DESC) AS rn
            FROM fs_data_analysis.diagnosis_daily  final
         ) t
         WHERE t.rn = 1
            )
            SELECT t.projectId,
               t.projectName,
               t.structureId,
               t.structureName,
               t.longitude,
               t.latitude,
               t.iota_thing_id,
               t.deviceId,
               t.deviceName,
               t2.CollectTime,
               IF(t2.Power IS NULL, 0, t2.Power) AS Data
            FROM tmp t
            LEFT JOIN tmp2 t2 ON t2.DeviceId = t.deviceId;
               `
         )
         .toPromise()) || [];
   return res;
}
//获取所有项目
async function getStructureData (database, id) {
   const structureData =
      (await database
         .query(
            `
            SELECT tps.project AS projectId, tp.name as projectName,tps.structure AS structureId, ts.name as structureName,ts.longitude as longitude, ts.latitude as latitude
            FROM t_project tp
            INNER JOIN t_project_structure tps ON tp.id = tps.project
            INNER JOIN t_structure ts ON ts.id = tps.structure
            WHERE tps.project IN (${id})
            `
         )
         .toPromise()) || [];
   return structureData;
}
//获取设备关联关系
async function getDeviceData (database, deviceIdSet, themeDatas) {
   let data =
      (await database
         .query(
            ` 
               SELECT 
               ll.toLayoutNodeId as toLayoutNodeId,
               d.id as id,
               d.name as name,
               dm.name as modelName 
               FROM LayoutLink ll
               INNER JOIN Device d ON d.id=ll.fromLayoutNodeId
               INNER JOIN DeviceMeta dm ON dm.id=d.deviceMetaId
               where ll.toLayoutNodeId in ('${[...deviceIdSet].join("','")}')`
         )
         .toPromise()) || [];
   let deviceSensors = [];
   if (data && data.length) {
      let ids = data.map((item) => item.id);
      //按照500各一组查询
      for (let i = 0; i < ids.length; i += 500) {
         let idList = ids.slice(i, i + 500);
         let res = await database
            .query(
               `
                  SELECT
                     sensor,
                     iota_device_id
                  FROM anxinyun.t_device_sensor tds
                  WHERE tds.iota_device_id in ('${idList.join("','")}')
               `
            )
            .toPromise();
         //合并结果
         deviceSensors = deviceSensors.concat(res);
      }
   }
   let dataWithSensor = data.map((item) => {
      let sensor = deviceSensors.find((sensor) => sensor.iota_device_id === item.id);
      let themeData = {};
      // console.log('sensor', sensor);
      // console.log('themeDatas', themeDatas);
      if (sensor) {
         themeData = themeDatas.find(
            (theme) => theme.sensorId == `axy4_0:${sensor.sensor}`
         );
      }
      if (!sensor) {
         // console.log('nosensor');
      }
      if (!themeData) {
         // console.log('nothemeData');
      }
      return {
         ...item,
         sensor: sensor && sensor.sensor,
         value: (themeData && themeData.value),
         collectTime: (themeData && themeData.collectTime) || '-',
      };
   });
   return dataWithSensor;
}
//获取最近一个月的设备数据
async function getRecent1monthDeviceData (database, deviceIdSet) {
   const recent1monthDeviceData =
      (await database
         .query(
            ` 
               with tmp as (
                  SELECT *,row_number() over(partition by (ds.DeviceId,toYYYYMMDD(ds.CollectTime)) order by ds.CollectTime desc) rn
                     FROM fs_data_analysis.diagnosis_daily ds where DeviceId in ('${[...deviceIdSet].join(
               "','"
            )}')
                        AND CollectTime between '${moment()
               .subtract(1, 'months')
               .format('YYYY-MM-DD HH:mm:ss')}'
            AND '${moment().format('YYYY-MM-DD HH:mm:ss')}')
            SELECT * FROM tmp where rn=1
         `
         )
         .toPromise()) || [];
   return recent1monthDeviceData;
}
//归集数据
const classifyData = (faltData, relationData) => {
   const list = [
      { id: 1, name: '裂缝', total: 0, percent: 0 },
      { id: 2, name: '倾角', total: 0, percent: 0 },
      { id: 3, name: '其他', total: 0, percent: 0 },
   ];

   let health = 0;
   let charge = 0;
   let weakWaning = 0;
   let strongWarning = 0;
   let offline = 0;

   let total = 0;
   let classTotal = 0;
   let rate = [];
   const listData = obtainData(faltData, relationData);
   if (listData && listData.length) {
      listData.map((item) => {
         if (item.structures && item.structures.length) {
            let structuresLength = item.structures.length;
            let structuresOnline = 0;
            item.structures.map((item1) => {
               let onLineTotal = 0;
               //  let offlineTotal = 0;
               let allTotal = 0;
               let deviceTotal = 0;
               let deviceOnline = 0;
               if (item1.devices && item1.devices.length) {
                  item1.devices.map((item2) => {
                     deviceTotal += 1;
                     if (item2.data !== '') {
                        total += 1;
                        const data = item2.data;
                        //设备在线个数规则，当24h内一个设备下传感器在线数超70%，则判断该设备在线。
                        let sensorRate = 0;
                        let cur = item2.subordinateDevices;
                        let sensor = 0; //传感器总数
                        let sensorOnline = 0; //传感器在线数
                        if (cur && cur.length) {
                           //在线个数
                           for (let ii = 0; ii < cur.length; ii++) {
                              sensor += 1;
                              if (moment(cur[ii].collectTime).isAfter(moment().subtract(24, 'hours'))) {
                                 sensorOnline += 1;
                              }
                           }
                           sensorRate = sensorOnline / sensor;
                           if (sensorRate > 0.7) {
                              deviceOnline += 1;
                           } else {
                              if (item.projectId === 452) {
                                 // console.log('上饶离线传感器',item2,cur)
                              }
                           }
                        }

                        if (data > 0) {
                           onLineTotal += 1;
                        }
                        // if (data.powerstr <= 0) {
                        //    offlineTotal += 1;
                        // }
                        allTotal += 1;
                        if (data > 66) {
                           health += 1;
                        } else if (data > 33 && data <= 66) {
                           charge += 1;
                        } else if (data > 10 && data <= 33) {
                           weakWaning += 1;
                        } else if (data > 0 && data <= 10) {
                           strongWarning += 1;
                        } else if (data <= 0) {
                           offline += 1;
                        }

                        let existingRate = rate.find((r) => r.projectId === item.projectId);
                        if (!existingRate) {
                           // 新数据
                           let newData = {
                              projectId: item.projectId,
                              projectName: item.projectName,
                              onLine: data > 0 ? 1 : 0,
                              offline: data <= 0 ? 1 : 0,
                              normal: data > 66 ? 1 : 0,
                              charge: data > 33 && data <= 66 ? 1 : 0,
                              weakWarning: data > 10 && data <= 33 ? 1 : 0,
                              strongWarning: data > 0 && data <= 10 ? 1 : 0,
                              deviceOnline: deviceOnline,
                              deviceTotal: deviceTotal,
                              sensor: sensor,
                              sensorOnline: sensorOnline,
                              total: 1,
                           };
                           rate.push(newData);
                        } else {
                           // 已存在的数据，更新
                           existingRate.total++;
                           existingRate.deviceTotal++;
                           if (sensorRate > 0.7) {
                              existingRate.deviceOnline++;
                           }
                           existingRate.sensor += sensor;
                           existingRate.sensorOnline += sensorOnline;
                           if (data > 0) {
                              existingRate.onLine++;
                              if (data > 66) {
                                 existingRate.normal++;
                              } else if (data > 33 && data <= 66) {
                                 existingRate.charge++;
                              } else if (data > 10 && data <= 33) {
                                 existingRate.weakWarning++;
                              } else if (data > 0 && data <= 10) {
                                 existingRate.strongWarning++;
                              }
                           } else {
                              existingRate.offline++;
                           }

                        }
                     } else {
                        console.log('xxxx1')
                     }
                     if (item2.subordinateDevices && item2.subordinateDevices.length) {
                        let type = item2.subordinateDevices.map((qq) => qq.name);
                        if (
                           type &&
                           type.length === 3 &&
                           type.some((i1) => i1.includes('加速度')) &&
                           type.some((i1) => i1.includes('裂缝')) &&
                           type.some((i1) => i1.includes('倾角') || type.some((i1) => i1.includes('拉线')))
                        ) {
                           list[0].total += 1;
                        } else if (
                           type &&
                           type.length === 2 &&
                           type.some((i1) => i1.includes('加速度')) &&
                           type.some((i1) => i1.includes('倾角'))
                        ) {
                           list[1].total += 1;
                        } else if (type && type.length === 1) {
                           if (list.find((o) => o.name === item2.subordinateDevices[0].modelName)) {
                              list.find((o) => o.name === item2.subordinateDevices[0].modelName).total += 1;
                           } else {
                              list.push({
                                 id: item2.deviceId,
                                 name: item2.subordinateDevices[0].modelName,
                                 total: 1,
                              });
                           }
                           //其他情况统计为其他
                        } else {
                           list[2].total += 1;
                        }
                     } else {
                        //没有下属设备归集到其他
                        list[2].total += 1;
                     }
                     // //统计传感器个数
                     // if (item2.subordinateDevices && item2.subordinateDevices.length) {
                     //   item2.subordinateDevices.map((item3) => {
                     //     //在线规则,24h内有数据就是在线
                     //     if (
                     //       item3.collectTime != '-' &&
                     //       moment(item3.collectTime).isAfter(moment().subtract(24, 'hours'))
                     //     ) {
                     //       sensorOnline += 1;
                     //     }
                     //     sensor += 1;
                     //   });
                     // }
                  });
                  if (deviceOnline / (deviceTotal || 1) > 0.7) {
                     structuresOnline += 1;
                  } else {
                     if (item.projectId === 452) {
                        // console.log('上饶离线结构物',item1,item1.devices)
                     }
                  }
                  // //滑坡仪下面在线个数，整体下面设备在线率超过70，算滑坡仪在线
                  // if (allTotal && onLineTotal / allTotal > 0.7) {
                  //   structuresOnline += 1;
                  // }
               }
            });
            //整理滑坡仪
            let rateObj = rate.find((li) => li.projectId === item.projectId);
            if (rateObj) {
               rateObj.huapoyiOnlineCount = structuresOnline;
               rateObj.huapoyiCount = structuresLength;
            }
         }
      });
   }
   classTotal = list.reduce((p, c, i) => {
      p += c.total;
      return p;
   }, 0);
   const classifyList = [
      {
         id: 1,
         name: '电量充足',
         total: health,
         percent: total > 0 ? ((health / total) * 100).toFixed(0) : 0,
      },
      {
         id: 2,
         name: '需充电',
         stroke: '#E5E465',
         total: charge,
         percent: total > 0 ? ((charge / total) * 100).toFixed(0) : 0,
      },
      {
         id: 2,
         name: '弱预警',
         stroke: '#FDAD31',
         total: weakWaning,
         percent: total > 0 ? ((weakWaning / total) * 100).toFixed(0) : 0,
      },
      {
         id: 3,
         name: '强预警',
         stroke: '#FF9496',
         total: strongWarning,
         percent: total > 0 ? ((strongWarning / total) * 100).toFixed(0) : 0,
      },
      {
         id: 4,
         name: '离线',
         stroke: '#C3C3C3',
         total: offline,
         percent: total > 0 ? ((offline / total) * 100).toFixed(0) : 0,
      },
   ];
   list.forEach((ii) => {
      ii.percent = classTotal > 0 ? ((ii.total / classTotal) * 100).toFixed(0) : 0;
   });
   return {
      list,
      classifyList,
      rate,
      listData,
      total,
      classTotal,
   };
};
//获取图表的数据
async function getChartData (id, isSevenDay, database) {
   let startTime =
      isSevenDay === true
         ? moment().subtract(7, 'days').format('YYYY-MM-DD HH:mm:ss')
         : moment().subtract(30, 'days').format('YYYY-MM-DD HH:mm:ss');
   let endTime = moment().format('YYYY-MM-DD HH:mm:ss');
   const deviceList = await database
      .query(
         `
   SELECT d.id AS id
   FROM anxinyun.t_project tp
      INNER JOIN anxinyun.t_project_structure tps ON tp.id = tps.project
      INNER JOIN anxinyun.t_structure ts ON ts.id = tps.structure
      INNER JOIN iota.Device d ON d.thingId = toString(ts.iota_thing_id)
      INNER JOIN iota.DeviceMeta dm ON dm.id = d.deviceMetaId AND dm.model = 'FS-YTHJC-DZ'
   WHERE tps.project IN (${id})
 `
      )
      .toPromise();

   // 2. 获取日期范围
   const dateRange = await database
      .query(
         `
   SELECT arrayMap(x -> toDate(x), range(
    toUInt32(toDateTime('${moment(startTime).add(1, 'days').format('YYYY-MM-DD')}')),  
    toUInt32(toDateTime(today() + 1)),      
    86400                                  
)) AS dates
 `
      )
      .toPromise();
   const dateList = dateRange[0].dates || [];
   const batchSize = 500; // 每批次查询 100 个设备
   let latestData = [];
   for (let i = 0; i < deviceList.length; i += batchSize) {
      const batchDeviceIds = deviceList.slice(i, i + batchSize).map((device) => `'${device.id}'`);
      const query = `
     SELECT *
     FROM (
         SELECT *, 
                row_number() OVER (PARTITION BY ds.DeviceId, toDate(ds.CollectTime) ORDER BY ds.CollectTime DESC) AS rn
         FROM (
             SELECT * 
             FROM fs_data_analysis.diagnosis_daily 
             WHERE CollectTime BETWEEN '${startTime}' AND '${endTime}'
               AND DeviceId IN (${batchDeviceIds.join(',')})
         ) ds
     ) 
     WHERE rn = 1
   `;
      const batchResult = await database.query(query).toPromise();
      latestData = latestData.concat(batchResult);
   }

   // 4. 补齐数据
   let finalResult = [];
   for (const date of dateList) {
      for (const device of deviceList) {
         const latestRecord = latestData.find(
            (item) => item.DeviceId === device.id && moment(item.CollectTime).format('YYYY-MM-DD') === moment(date).format('YYYY-MM-DD')
         );
         if (latestRecord) {
            finalResult.push({ date, ...latestRecord, Data: latestRecord.Power || 0 });
         } else {
            // 如果没有找到数据，可以按逻辑补齐为 0 或前一天的数据
            finalResult.push({
               date,
               DeviceId: device.id,
               CollectTime: null,
               Data: 0, // 默认补齐电量为 0
            });
         }
      }
   }

   return finalResult;
}
//整理图表数据
const classifyChartData = (data1, data2) => {
   let _30days = [];
   let _7days = [];
   for (let i = 6; i >= 0; i--) {
      _7days.push({
         date: moment().subtract(i, 'days').format('YYYY-MM-DD'),
         normal: 0,
         charge: 0,
         offline: 0,
         strongWarning: 0,
         weakWarning: 0,
      });
   }
   for (let i = 30; i >= 0; i--) {
      _30days.push({
         date: moment().subtract(i, 'days').format('YYYY-MM-DD'),
         normal: 0,
         charge: 0,
         offline: 0,
         strongWarning: 0,
         weakWarning: 0,
      });
   }
   const _7daysData = matchData(_7days, data1);
   const _30daysData = matchData(_30days, data2);
   return {
      _7daysData,
      _30daysData,
   };
};
const matchData = (targetData, sourceData) => {
   // console.log(targetData,sourceData)
   targetData.forEach((item) => {
      let filterList = sourceData.filter((i) => moment(i.date).format('YYYY-MM-DD') == item.date);
      if (filterList && filterList.length) {
         filterList.forEach((i) => {
            const power = i.Data;
            if (power > 66) {
               item.normal += 1;
            } else if (power > 33 && power <= 66) {
               item.charge += 1;
            } else if (power > 10 && power <= 33) {
               item.weakWarning += 1;
            } else if (power <= 10 && power > 0) {
               item.strongWarning += 1;
            } else if (power <= 0) {
               item.offline += 1;
            }

         });
      }
   });
   return targetData;
};
