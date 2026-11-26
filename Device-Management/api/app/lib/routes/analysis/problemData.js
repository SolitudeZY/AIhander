'use strict';
const problemData = require('../../controllers/analysis/problemData');

module.exports = function (app, router, opts) {
   app.fs.api.logAttr['GET/maintenceRecordRank'] = { content: '获取维修记录排名', visible: true };
   router.get('/maintenceRecordRank', problemData.getMaintenceRecordRank)

   app.fs.api.logAttr['GET/maintenceTotal'] = { content: '获取维修次数统计', visible: true };
   router.get('/maintenceTotal', problemData.getMaintenceTotal)

   app.fs.api.logAttr['GET/equipmentCategory'] = { content: '获取设备类型', visible: true };
   router.get('/equipmentCategory', problemData.getEquipmentCategory)

   app.fs.api.logAttr['GET/maintenanceStatus'] = { content: '获取状态', visible: true };
   router.get('/maintenanceStatus', problemData.getStatus)
}