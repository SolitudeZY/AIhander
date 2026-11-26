
'use strict';

const monitor = require('../../controllers/monitor');

module.exports = function (app, router, opts) {

   app.fs.api.logAttr['GET/project/allStructures'] = { content: '获取对应项目的结构物', visible: true };
   router.get('/project/allStructures', monitor.getStructures);

   
   app.fs.api.logAttr['GET/structure/factors'] = { content: '获取对应的监测因素', visible: true };
   router.get('structure/factors', monitor.getFactors);

   app.fs.api.logAttr['GET/structure/factors/sensors'] = { content: '获取对应的点位', visible: true };
   router.get('structure/factors/sensors', monitor.getSensors);

   app.fs.api.logAttr['GET/structure/factors/sensors/data'] = { content: '获取对应点位的设备(图)', visible: true };
   router.get('structure/factors/sensors/data', monitor.getMonitorDataServer);

   app.fs.api.logAttr['GET/structure/factors/sensors/data/detail'] = { content: '获取对应点位的设备（表格数据）', visible: true };
   router.get('structure/factors/sensors/data/detail', monitor.getMonitorData);


   app.fs.api.logAttr['POST/structure/stations/vibration/raws'] = { content: '获取多测点的振动原始数据', visible: true };
   router.post('structure/stations/vibration/raws', monitor.findVibRaws)


   app.fs.api.logAttr['POST/structure/stations/vibration/ffts'] = { content: '获取多测点的振动频谱数据', visible: true };
   router.post('structure/stations/vibration/ffts', monitor.findVibFfts)
}