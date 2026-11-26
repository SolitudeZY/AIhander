'use strict';

const controller = require('../../controllers/platformIntegrations');

module.exports = function (app, router) {
   /* 接收平台 */
   app.fs.api.logAttr['GET/platformIntegrations/configs'] = { content: '查询接收平台', visible: true };
   router.get('/platformIntegrations/configs', controller.listConfigs);

   app.fs.api.logAttr['POST/platformIntegrations/configs'] = { content: '新增接收平台', visible: true };
   router.post('/platformIntegrations/configs', controller.saveConfig);

   app.fs.api.logAttr['PUT/platformIntegrations/configs/:configId'] = { content: '修改接收平台', visible: true };
   router.put('/platformIntegrations/configs/:configId', controller.saveConfig);

   app.fs.api.logAttr['DELETE/platformIntegrations/configs/:configId'] = { content: '删除接收平台', visible: true };
   router.delete('/platformIntegrations/configs/:configId', controller.removeConfig);

   app.fs.api.logAttr['POST/platformIntegrations/configs/:configId/test'] = { content: '测试接收平台连通性', visible: true };
   router.post('/platformIntegrations/configs/:configId/test', controller.testConfig);

   app.fs.api.logAttr['GET/platformIntegrations/configs/:configId/structures'] = { content: '查询结构物列表', visible: true };
   router.get('/platformIntegrations/configs/:configId/structures', controller.listStructures);

   /* 对象关联 */
   app.fs.api.logAttr['GET/platformIntegrations/mappings'] = { content: '查询对象关联', visible: true };
   router.get('/platformIntegrations/mappings', controller.listMappings);

   app.fs.api.logAttr['POST/platformIntegrations/mappings'] = { content: '新增对象关联', visible: true };
   router.post('/platformIntegrations/mappings', controller.saveMapping);

   app.fs.api.logAttr['PUT/platformIntegrations/mappings/:mappingId'] = { content: '修改对象关联', visible: true };
   router.put('/platformIntegrations/mappings/:mappingId', controller.saveMapping);

   app.fs.api.logAttr['DELETE/platformIntegrations/mappings/:mappingId'] = { content: '删除对象关联', visible: true };
   router.delete('/platformIntegrations/mappings/:mappingId', controller.removeMapping);

   /* 推送订阅 */
   app.fs.api.logAttr['GET/platformIntegrations/subscriptions'] = { content: '查询推送订阅', visible: true };
   router.get('/platformIntegrations/subscriptions', controller.listSubscriptions);

   app.fs.api.logAttr['POST/platformIntegrations/subscriptions'] = { content: '新增推送订阅', visible: true };
   router.post('/platformIntegrations/subscriptions', controller.saveSubscription);

   app.fs.api.logAttr['PUT/platformIntegrations/subscriptions/:subscriptionId'] = { content: '修改推送订阅', visible: true };
   router.put('/platformIntegrations/subscriptions/:subscriptionId', controller.saveSubscription);

   app.fs.api.logAttr['DELETE/platformIntegrations/subscriptions/:subscriptionId'] = { content: '删除推送订阅', visible: true };
   router.delete('/platformIntegrations/subscriptions/:subscriptionId', controller.removeSubscription);

   /* 推送记录 */
   app.fs.api.logAttr['GET/platformIntegrations/pushRecords'] = { content: '查询推送记录', visible: true };
   router.get('/platformIntegrations/pushRecords', controller.listPushRecords);
};
