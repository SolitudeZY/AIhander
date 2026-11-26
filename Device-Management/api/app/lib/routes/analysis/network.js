'use strict';
const network = require('../../controllers/analysis/network');

module.exports = function (app, router, opts) {
   app.fs.api.logAttr['GET/organizations/:pepProjectId/struc'] = { content: '获取项目下的结构物信息', visible: true };
   router.get('/organizations/:pepProjectId/struc', network.getOrganizationsStruc)

   app.fs.api.logAttr['GET/things/:iotaThingId/deploy'] = { content: '获取设备部署信息', visible: true };
   router.get('/things/:iotaThingId/deploy', network.getThingsDeploy)

   app.fs.api.logAttr['GET/meta/things/:iotaThingId/devices'] = { content: '获取部署设备原型', visible: true };
   router.get('/meta/things/:iotaThingId/devices', network.getDeviceMetaDeployed)

   app.fs.api.logAttr['GET/metrics/things/:iotaThingId/devices/link_status'] = { content: '获取设备在线状态/以结构物id集体获取', visible: true };
   router.get('/metrics/things/:iotaThingId/devices/link_status', network.iotaLinkStatus)

   app.fs.api.logAttr['GET/meta/things/:iotaThingId/devices'] = { content: '原始数据查询失败', visible: false };
   router.get('/meta/things/:iotaThingId/devices', network.findDeviceMetaDeployed)

   app.fs.api.logAttr['POST/sensors/last/data'] = { content: '原始数据查询失败', visible: true };
   router.post('/sensors/last/data', network.findSensorLastData)

   app.fs.api.logAttr['POST/devices/alarms'] = { content: '获取多个设备的告警信息', visible: false };
   router.post('/devices/alarms', network.findAlarmsDevices)

   app.fs.api.logAttr['POST/devices/cardStatus'] = { content: '获取物联网卡状态', visible: false };
   router.post('/devices/cardStatus', network.findDevicesCardStatus);

   app.fs.api.logAttr['GET/metrics/devices/:deviceId/link_status'] = { content: '获取设备在线状态/以设备id单个获取', visible: false };
   router.get('/metrics/devices/:deviceId/link_status', network.getDevicesLlinkStatus);

   app.fs.api.logAttr['GET/device/:deviceId/alarms'] = { content: '获取设备告警信息', visible: true };
   router.get('/device/:deviceId/alarms', network.findAlarmsDevice);
   
   app.fs.api.logAttr['GET/thing/status'] = { content: '获取设备在离线', visible: true };
   router.get('/thing/status', network.getThingStatus);

   //空开设备查询状态和开关设备
   app.fs.api.logAttr['POST/capabilities/invoke'] = { content: '及时采集', visible: true };
   router.post('/capabilities/invoke', network.createInvoke);
}