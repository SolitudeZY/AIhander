'use strict';

const push = require('../../controllers/push/config');

module.exports = function (app, router, opts) {
   app.fs.api.logAttr['GET/push'] = { content: '获取推送配置列表', visible: true };
   router.get('/push', push.list);

   app.fs.api.logAttr['POST/push'] = { content: '新增/编辑推送配置', visible: true };
   router.post('/push', push.edit);

   app.fs.api.logAttr['PUT/push/:pushId'] = { content: '更改推送配置状态（禁用或删除）', visible: true };
   router.put('/push/:pushId', push.state);
};