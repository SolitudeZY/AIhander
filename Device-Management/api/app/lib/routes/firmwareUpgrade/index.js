'use strict';

const firmwareUpgrade = require('../../controllers/firmwareUpgrade');

module.exports = function (app, router, opts) {
   router.get('/firmware/capabilities', firmwareUpgrade.getFirmwareCapabilities)
   app.fs.api.logAttr['GET/deviceType'] = { content: '获取设备型号', visible: true }
   router.get('/deviceType', firmwareUpgrade.getDeviceType)

   app.fs.api.logAttr['GET/structure'] = { content: '获取结构物相关', visible: true }
   router.get('/structure', firmwareUpgrade.getStruc)

   app.fs.api.logAttr['GET/firmware'] = { content: '获取固件包列表', visible: true }
   router.get('/firmware', firmwareUpgrade.getFirmwares)

   app.fs.api.logAttr['GET/firmware/deviceMetaNameDict'] = { content: '获取设备型号列表', visible: true }
   router.get('/firmware/deviceMetaNameDict', firmwareUpgrade.getdeviceMetaNameDict)

   app.fs.api.logAttr['GET/firmware/versionDict'] = { content: '获取版本号列表', visible: true }
   router.get('/firmware/versionDict', firmwareUpgrade.getVersionDict)

   // app.fs.api.logAttr['POST/upgradeFirmware'] = { content: '增加/覆盖固件包', visible: true }
   // router.post('/upgradeFirmware', firmwareUpgrade.firmwareUpgrades)

   app.fs.api.logAttr['DELETE/deleteFirmware'] = { content: '删除固件包', visible: true }
   router.delete('/deleteFirmware', firmwareUpgrade.deleteFirmware)

   app.fs.api.logAttr['POST/getThingMessages'] = { content: '获取设备信息', visible: true }
   router.post('/getThingMessages', firmwareUpgrade.getThingMessages)

   app.fs.api.logAttr['POST/distributeConfiguration'] = { content: '下发配置（单个或批量）', visible: true }
   router.post('/distributeConfiguration', firmwareUpgrade.distributeConfiguration)

   app.fs.api.logAttr['GET/zwy/structure'] = { content: '获取知物云结构物相关', visible: true }
   router.get('/zwy/structure', firmwareUpgrade.getZhiwuCloudStruct)

   app.fs.api.logAttr['GET/deviceMeta/models'] = { content: '分页查询设备型号列表', visible: true }
   router.get('/deviceMeta/models', firmwareUpgrade.getDeviceMetaModels)

   app.fs.api.logAttr['POST/add/deviceMeta/models'] = { content: '新增设备型号下拉数据源', visible: true }
   router.post('/add/deviceMeta/models', firmwareUpgrade.addDeviceModels)

}
