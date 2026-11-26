'use strict';

const record = require('../../controllers/record');

module.exports = function (app, router, opts) {
   app.fs.api.logAttr['GET/record'] = { content: '获取服务记录列表', visible: true };
   router.get('/record', record.getRecord);

   app.fs.api.logAttr['PUT/record'] = { content: '新增/编辑服务记录', visible: true };
   router.put('/record', record.addRecord);

   app.fs.api.logAttr['DELETE/record/:id'] = { content: '删除服务记录', visible: true };
   router.del('/record/:id', record.delRecord);


   app.fs.api.logAttr['GET/respond-record'] = { content: '获取响应记录数据', visible: true };
   router.get('/respond-record', record.respondRecord);

};