'use strict';

const cert = require('../../controllers/service/cert');

module.exports = function (app, router, opts) {
   app.fs.api.logAttr['GET/cert'] = { content: '获取证书信息列表', visible: true };
   router.get('/cert', cert.list);

   app.fs.api.logAttr['POST/cert'] = { content: '编辑证书信息', visible: true };
   router.post('/cert', cert.edit);

   app.fs.api.logAttr['DELETE/cert'] = { content: '删除证书信息', visible: true };
   router.del('/cert', cert.del);

   app.fs.api.logAttr['GET/cert/notice'] = { content: '获取证书提醒信息列表', visible: true };
   router.get('/cert/notice', cert.noticeList);

   app.fs.api.logAttr['POST/cert/notice'] = { content: '编辑证书提醒信息', visible: true };
   router.post('/cert/notice', cert.noticeEdit);

   app.fs.api.logAttr['DELETE/cert/notice'] = { content: '删除证书提醒信息', visible: true };
   router.del('/cert/notice', cert.noticeDel);
};