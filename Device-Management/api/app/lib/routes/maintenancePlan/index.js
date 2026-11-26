'use strict';

const maintenancePlan = require('../../controllers/maintenancePlan');

module.exports = function (app, router, opts) {
   app.fs.api.logAttr['GET/maintenancePlan'] = { content: '获取维护计划列表', visible: true };
   router.get('/maintenancePlan', maintenancePlan.getMaintenancePlan);

   app.fs.api.logAttr['DELETE/maintenancePlan'] = { content: '删除维护计划列表', visible: true };
   router.del('/maintenancePlan', maintenancePlan.delMaintenancePlan);

   app.fs.api.logAttr['POST/maintenancePlan'] = { content: '编辑或者添加维护计划列表', visible: true };
   router.post('/maintenancePlan', maintenancePlan.editMaintenancePlan);

};