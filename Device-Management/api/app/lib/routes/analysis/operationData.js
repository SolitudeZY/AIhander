'use strict';
const operationData = require('../../controllers/analysis/operationData');

module.exports = function (app, router, opts) {
   app.fs.api.logAttr['GET/failureTime'] = { content: '获取故障发生时间', visible: true };
   router.get('/failureTime', operationData.getFailureTime)

   app.fs.api.logAttr['GET/systemAvailability'] = { content: '获取系统可用性', visible: true };
   router.get('/systemAvailability', operationData.getSystemAvailability)

   app.fs.api.logAttr['GET/problemType'] = { content: '获取故障类型', visible: true };
   router.get('/problemType', operationData.getProblemType)

   app.fs.api.logAttr['GET/operationsPersonnel'] = { content: '获取运维人员', visible: true };
   router.get('/operationsPersonnel', operationData.getOperationsPersonnel)
}