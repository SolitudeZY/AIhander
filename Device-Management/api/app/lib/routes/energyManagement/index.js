'use strict';

const energyManagement = require('../../controllers/energyManagement');

module.exports = function (app, router, opts) {
   app.fs.api.logAttr['GET/energy/management'] = { content: '获取设备统计数据', visible: true };
   router.get('/energy/management', energyManagement.getDeviceStatistics);

   app.fs.api.logAttr['GET/energy/30daysOr7days'] = { content: '获取七天或者30天的设备数据', visible: true };
   router.get('/energy/30daysOr7days', energyManagement.getEchartsData);

}