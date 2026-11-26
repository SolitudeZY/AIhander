'use strict';

const paramTemplates = require('../../controllers/firmwareUpgrade/param-templates');

module.exports = function (app, router, opts) {
  app.fs.api.logAttr['GET/firmware-upgrade/param-templates'] = { content: '获取参数模板列表', visible: true };
  router.get('/firmware-upgrade/param-templates', paramTemplates.list);

  app.fs.api.logAttr['GET/firmware-upgrade/param-template-histories'] = { content: '获取参数模板历史记录', visible: true };
  router.get('/firmware-upgrade/param-template-histories', paramTemplates.historyList);

  app.fs.api.logAttr['GET/firmware-upgrade/param-template-histories/:id'] = { content: '获取参数模板历史详情', visible: true };
  router.get('/firmware-upgrade/param-template-histories/:id', paramTemplates.historyDetail);

  app.fs.api.logAttr['POST/firmware-upgrade/param-templates'] = { content: '新增参数模板', visible: true };
  router.post('/firmware-upgrade/param-templates', paramTemplates.create);

  app.fs.api.logAttr['PUT/firmware-upgrade/param-templates/:id'] = { content: '更新参数模板', visible: true };
  router.put('/firmware-upgrade/param-templates/:id', paramTemplates.update);

  app.fs.api.logAttr['DELETE/firmware-upgrade/param-templates/:id'] = { content: '删除参数模板', visible: true };
  router.delete('/firmware-upgrade/param-templates/:id', paramTemplates.remove);

  app.fs.api.logAttr['GET/firmware-upgrade/param-templates/resolve'] = { content: '解析参数模板（按产品与模式）', visible: true };
  router.get('/firmware-upgrade/param-templates/resolve', paramTemplates.resolve);
};
