'use strict';

const means = require('../../controllers/means/index');

module.exports = function (app, router, opts) {

   app.fs.api.logAttr['GET/file/list'] = { content: '获取文件夹列表', visible: true };
   router.get('/file/list', means.fileList);

   app.fs.api.logAttr['POST/file/addEdit'] = { content: '添加/编辑文件夹', visible: true };
   router.post('/file/addEdit', means.addEditFile);

   app.fs.api.logAttr['DELETE/file/del/:id'] = { content: '删除文件夹', visible: true };
   router.del('/file/del/:id', means.delFile);

   app.fs.api.logAttr['POST/file'] = { content: '添加文件', visible: true };
   router.post('/file', means.addFile);

   app.fs.api.logAttr['GET/file'] = { content: '获取文件列表', visible: true };
   router.get('/file', means.folderFileList);

   app.fs.api.logAttr['DELETE/file/:id'] = { content: '删除文件夹', visible: true };
   router.del('/file/:id', means.delfolderFile);

   app.fs.api.logAttr['POST/attachments/:p'] = { content: '上传文件', visible: true };
   router.post('/attachments/:p', means.upload);
};