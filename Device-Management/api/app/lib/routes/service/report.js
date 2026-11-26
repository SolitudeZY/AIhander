'use strict';

const report = require('../../controllers/service/report');

module.exports = function (app, router, opts) {
   app.fs.api.logAttr['GET/report/file'] = { content: '获取服务记录列表', visible: true };
   router.get('/report/file', report.getReportFile);

   app.fs.api.logAttr['POST/report/file'] = { content: '上传文件', visible: true };
   router.post('/report/file', report.postReportFile);

   app.fs.api.logAttr['DELETE/report/file/:id'] = { content: '删除报表文件', visible: true };
   router.del('/report/file/:id', report.delReportFile);

   app.fs.api.logAttr['GET/factor/list'] = { content: '获取监测因素信息', visible: true };
   router.get('/factor/list', report.getFactorList);

   app.fs.api.logAttr['POST/automatic/report'] = { content: '新增/编辑报表生成规则', visible: true };
   router.post('/automatic/report', report.postAutomaticReport);

   app.fs.api.logAttr['GET/automatic/report'] = { content: '获取报表生成规则', visible: true };
   router.get('/automatic/report', report.getAutomaticReport);

   app.fs.api.logAttr['DELETE/automatic/report/:id'] = { content: '删除报表规则', visible: true };
   router.del('/automatic/report/:id', report.delAutomaticReport);

   app.fs.api.logAttr['POST/generate/report'] = { content: '生成报表', visible: true };
   router.post('/generate/report', async (ctx, next) => {
      // 设置超时时间
      ctx.request.timeout = 1000 * 60 * 12;
      await next();
   }, report.postGenerateReport);
};