'use strict';
const moment = require('moment')
const RAW_DATA = 'rawData';
const VBRAW_DATA = 'vbRawData';
const ALARM = 'alarm';
const AlarmState = { Creation: 0, CountUpgrade: 1, LevelUpgrade: 2, AutoElimination: 3, ManElimination: 4 };

async function getOrganizationsStruc(ctx) {
   try {
      const { utils: { anxinStrucIdRange } } = ctx.app.fs
      const { pepProjectId } = ctx.params

      if (!pepProjectId) {
         throw '缺少参数 pepProjectId'
      }
      let anxinStruc = await anxinStrucIdRange({
         ctx, pepProjectId
      }) || []
      ctx.status = 200
      ctx.body = anxinStruc

   } catch (error) {
      ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
      ctx.status = 400;
      ctx.body = {
         message: '获取项目下的结构物信息失败'
      }
   }
}

async function getThingsDeploy(ctx) {
   let error = { name: 'FindError', message: '获取设备部署信息失败' };
   let rslt = null, errStatus = null;
   let { iotaThingId } = ctx.params;

   try {
      if (!iotaThingId) {
         throw '缺少参数 iotaThingId'
      }
      let iotaResponse = await ctx.app.fs.iotRequest.get(`things/${iotaThingId}/deploys`)
      rslt = JSON.parse(iotaResponse)
      error = null;

   } catch (err) {
      errStatus = err.status
      ctx.fs.logger.error(`path: ${ctx.path}, error: ${err}`);
   }
   if (error) {
      if (errStatus == 404) {
         ctx.status = 200;
         ctx.body = {
            'instances': null
         };
      } else {
         ctx.status = errStatus;
         ctx.body = error;
      }
   } else {
      ctx.status = 200;
      ctx.body = rslt
   }
}

async function getDeviceMetaDeployed(ctx) {
   let error = { name: 'FindError', message: '设备部署原型获取失败' };
   let rslt = null;
   const { iotaThingId } = ctx.params;
   try {
      if (!iotaThingId) {
         throw '缺少参数 iotaThingId'
      }
      let iotaResponse = await ctx.app.fs.iotRequest.get(`meta/things/${iotaThingId}/devices`);

      ctx.status = 200;
      ctx.body = JSON.parse(iotaResponse);
   } catch (err) {
      ctx.fs.logger.error(`path: ${ctx.path}, error: ${err}`);
   }
};

async function iotaLinkStatus(ctx, next) {
   let error = { name: 'CreateError', message: '命令下发失败' };
   const { iotaThingId } = ctx.params;
   let rslt = null;

   try {
      if (!iotaThingId) {
         throw '缺少参数 iotaThingId'
      }
      let iotaResponse = await ctx.app.fs.iotRequest.get(`metrics/things/${iotaThingId}/devices/link_status`);
      rslt = JSON.parse(iotaResponse);
      error = null;
   } catch (err) {
      ctx.fs.logger.error(`path: ${ctx.path}, error: ${err}`);
   }

   if (error) {
      ctx.status = 400;
      ctx.body = error;
   } else {
      ctx.status = 200;
      ctx.body = rslt;
   }
};



async function findDeviceMetaDeployed(ctx, next) {
   let rslt = null;
   const { iotaThingId } = ctx.params;
   try {
      let iotaResponse = await ctx.app.fs.iotRequest.get(`meta/things/${iotaThingId}/devices`)
      rslt = JSON.parse(iotaResponse)
      ctx.status = 200;
      ctx.body = rslt;
   } catch (err) {
      ctx.status = 400;
      ctx.body = {
         "name": "FindError",
         "message": "设备部署原型获取失败"
      }
   }

};
async function findDeviceLastData(ctx, deviceIds) {
   let rslt = [];
   const clientRaws = ctx.app.fs.esclient[RAW_DATA];
   const clientVbraws = ctx.app.fs.esclient[VBRAW_DATA];
   const now = moment().toISOString();
   if (deviceIds) {
      for (let id of deviceIds) {
         let params = {
            index: clientRaws.config.index,
            type: clientRaws.config.type,
            body: {
               query: {
                  constant_score: {
                     filter: {
                        bool: {
                           must: [
                              { term: { "iota_device": id } },
                              { range: { "collect_time": { lte: now, } } }
                           ]
                        }
                     }
                  }
               },
               sort: [
                  {
                     "collect_time": {
                        order: "desc"
                     }
                  }
               ],
               size: 1
            }
         };
         let res = await clientRaws.search(params);
         if (res.hits.hits.length == 0) {
            params.index = clientVbraws.config.index;
            params.type = clientVbraws.config.type;
            res = await clientVbraws.search(params);
         }

         let data = res.hits.hits.map(h => {
            let source = h._source;
            let data_ = source.data;
            if (params.index == clientVbraws.config.index) {
               let tempData = { "最大幅值": '_' };
               if (data_.raw && data_.raw.length) {
                  let maxAmplitude = data_.raw[0];
                  for (let v of data_.raw) {
                     if (maxAmplitude < v) {
                        maxAmplitude = v;
                     }
                  }
                  tempData['最大幅值'] = maxAmplitude + '（gal）';
               }
               data_ = tempData;
            }
            return {
               collectTime: source.collect_time,
               iotaDevice: source.iota_device,
               iotaDeviceName: source.iota_device_name,
               data: data_
            }
         });
         rslt.push({
            sensorId: id,
            data: data
         });
      }
   }
   return rslt;
}




async function findSensorLastData(ctx) {
   try {
      const sensorIds = ctx.request.body
      let rslt = await findDeviceLastData(ctx, sensorIds);
      // let rslt = [{ sensorId: "2aa1cad1-a52d-4132-8d84-2475034d5bc8", data: [] },
      // { sensorId: "9f1702ff-560d-484e-8572-ef188ef73916", data: [] },
      // {
      //    sensorId: "360d9098-f2a5-4e1a-ab2b-0bcd3ddcef87", data: [{
      //       collectTime: "2021-07-12T05:30:44.000Z", data: { readingNumber: 228 },
      //       iotaDevice: "360d9098-f2a5-4e1a-ab2b-0bcd3ddcef87", iotaDeviceName: "水表"
      //    }]
      // },
      // { sensorId: "8c3a636b-9b62-4486-bf54-4ac835aee094", data: [] },
      // {
      //    sensorId: "9ea4d6cd-f0dc-4604-bb85-112f2591d644", data: [{
      //       collectTime: "2021-07-17T05:53:35.783Z", data: { DI4: 0, DI7: 0, DI5: 0, DI1: 1, DI6: 0, DI2: 1, DI8: 0, DI3: 1 },
      //       iotaDevice: "9ea4d6cd-f0dc-4604-bb85-112f2591d644", iotaDeviceName: "控制器"
      //    }]
      // },
      // { sensorId: "e18060b4-3c7f-4fad-8a1a-202b5c0bf00c", data: [] }
      // ]
      ctx.status = 200;
      ctx.body = rslt;
   } catch (error) {
      ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`)
      ctx.status = 400;
      ctx.body = {
         "name": "FindError",
         "message": "原始数据查询失败"
      }
   }
}


async function findAlarmsDevices(ctx, next) {
   let rslt = []
   const deviceIds = ctx.request.body
   const { limit, state } = ctx.query
   try {
      if (deviceIds.length) {
         for (let deviceId of deviceIds) {
            // es search
            const client = ctx.app.fs.esclient[ALARM];//准备查询
            let params = {
               index: client.config.index,
               type: client.config.type,
               size: limit || 9999,
               body: {
                  "query": {
                     "bool": {
                        "must": [
                           {
                              "match": {
                                 "source_id": deviceId
                              }
                           },
                           {
                              "terms": {
                                 "state": []
                              }
                           }
                        ]
                     }
                  },
                  "sort": [
                     {
                        "start_time": {
                           "order": "desc"
                        }
                     }
                  ]
               }
            }
            if (state == 'new') {
               let newState = [AlarmState.Creation, AlarmState.CountUpgrade, AlarmState.LevelUpgrade];
               params.body.query.bool.must[1].terms.state = newState;
            }
            let alarms = await client.search(params);
            function filterAlarmMsg(oriMsg) {
               let msg = [];
               for (let s of oriMsg) {
                  msg.push({
                     alarmContent: s._source.alarm_content,
                     alarmCount: s._source.alarm_count,
                     deviceId: s._source.source_id,
                     startTime: moment(s._source.start_time).format('YYYY-MM-DD HH:mm:ss'),
                     endTime: moment(s._source.end_time).format('YYYY-MM-DD HH:mm:ss'),
                  })
               }
               return msg;
            }
            rslt = rslt.concat(filterAlarmMsg(alarms.hits.hits));
         }
      }

      ctx.status = 200;
      ctx.body = rslt;
   } catch (error) {
      ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
      ctx.status = 400;
      ctx.body = {
         message: '告警信息查询失败'
      }
   }
}

async function findDevicesCardStatus(ctx, next) {

   try {
      let rlst = []
      const { clickHouse } = ctx.app.fs
      const { deviceIds } = ctx.request.body
      if (deviceIds && deviceIds.length) {
         const id = `(${deviceIds.map(id => `'${id}'`).join(',')})`
         rlst = await clickHouse.dataAlarm.query(`
         SELECT cs.DeviceId as deviceId,cs.Status as status,MAX(cs.Time) 
         FROM alarm.CardStatus cs 
         WHERE cs.DeviceId in ${id}
         GROUP BY cs.DeviceId,cs.Status`).toPromise()
      }

      ctx.status = 200;
      ctx.body = rlst;
   } catch (error) {
      ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
      ctx.status = 400;
      ctx.body = {
         message: '物联网卡状态查询失败'
      }
   }
}


async function getDevicesLlinkStatus(ctx, next) {
   let error = { name: 'CreateError', message: '命令下发失败' };
   const { deviceId } = ctx.params;
   let rslt = null;
   if (deviceId) {
      try {
         let iotaResponse = await ctx.app.fs.iotRequest.get(`metrics/devices/${deviceId}/link_status`);
         rslt = JSON.parse(iotaResponse)
         error = null;
      } catch (err) {
         ctx.fs.logger.error(`path: ${ctx.path}, error: ${err}`);
      }
   }
   if (error) {
      ctx.status = 400;
      ctx.body = error;
   } else {
      ctx.status = 200;
      ctx.body = rslt;
   }
};

async function findAlarmsDevice(ctx, next) {
   let error = { name: 'FindError', message: '告警信息获取失败' };
   let rslt = null;
   const { deviceId } = ctx.params;
   if (deviceId) {
      try {
         const { limit } = ctx.query;
         const client = ctx.app.fs.esclient[ALARM];//准备查询
         let params = {
            index: client.config.index,
            type: client.config.type,
            size: limit || 5,
            body: {
               "query": {
                  "bool": {
                     "must": [
                        {
                           "match": {
                              "source_id": deviceId
                           }
                        },
                        {
                           "terms": {
                              "state": []
                           }
                        }
                     ]
                  }
               },
               "sort": [
                  {
                     "start_time": {
                        "order": "desc"
                     }
                  }
               ]
            }
         }
         let newState = [AlarmState.Creation, AlarmState.CountUpgrade, AlarmState.LevelUpgrade];
         let historyState = [AlarmState.AutoElimination, AlarmState.ManElimination];
         params.body.query.bool.must[1].terms.state = newState;
         let newAlarms = await client.search(params);//查询
         params.body.query.bool.must[1].terms.state = historyState;
         params.size = 9999;
         let historyAlarm = await client.search(params);
         function filterAlarmMsg(oriMsg) {
            let msg = [];
            for (let s of oriMsg) {
               msg.push({
                  alarmContent: s._source.alarm_content,
                  alarmCount: s._source.alarm_count,
                  startTime: moment(s._source.start_time).format('YYYY-MM-DD HH:mm:ss'),
                  endTime: moment(s._source.end_time).format('YYYY-MM-DD HH:mm:ss'),
               })
            }
            return msg;
         }
         rslt = { new: filterAlarmMsg(newAlarms.hits.hits), history: filterAlarmMsg(historyAlarm.hits.hits) }
         error = null;
      } catch (err) {
         ctx.fs.logger.error(`path: ${ctx.path}, error: ${err}`);
      }
   }
   if (error) {
      ctx.status = 400;
      ctx.body = error;
   } else {
      ctx.status = 200;
      ctx.body = rslt;
   }
}
//查询智能，以及空开设备的开关
async function createInvoke(ctx, next) {
   let error = { name: 'CreateError', message: '命令下发失败' };
   const data = ctx.request.body
   let rslt = null
   if (data) {
      try {
         const dataToIota = data
         let iotaResponse = await ctx.app.fs.iotInvoke.post(`capabilities/invoke`, { data: dataToIota })
         rslt = iotaResponse
         error = null;
      } catch (err) {
         ctx.fs.logger.error(`path: ${ctx.path}, error: ${err}`);
      }
   }
   if (error) {
      ctx.status = 400;
      ctx.body = error;
   } else {
      ctx.status = 200;
      ctx.body = rslt;
   }
};


async function getThingStatus(ctx) {
   let res = []
   try {
      const { thingId } = ctx.query
      let res = await ctx.app.fs.craw.get('thing/status', { query: { thingId } })
      ctx.status = 200
      if (res) {
         ctx.body = JSON.parse(res)
      }
   } catch (error) {
      ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`)
      ctx.status = 200
      ctx.body = []
   }
}



module.exports = {
   getOrganizationsStruc,
   getThingsDeploy,
   getDeviceMetaDeployed,
   iotaLinkStatus,
   findSensorLastData,
   findDeviceMetaDeployed,
   findAlarmsDevices,
   findDevicesCardStatus,
   getDevicesLlinkStatus,
   findAlarmsDevice,
   createInvoke,
   getThingStatus,
   findDeviceLastData,
}