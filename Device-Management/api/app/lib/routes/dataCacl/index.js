
'use strict';

const dataCacl = require('../../controllers/dataCacl');

module.exports = function (app, router, opts) {
   app.fs.api.logAttr['GET/abnormal/methods'] = { content: '获取异常识别算法', visible: true }
   router.get('/abnormal/methods', dataCacl.findAbnMethods)

   app.fs.api.logAttr['GET/struct/abnormal/params'] = { content: '获取结构物下异常识别参数配置列表', visible: false }
   router.get('/struct/abnormal/params', dataCacl.findAbnParamList)

   app.fs.api.logAttr['POST/struct/abnormal/params'] = { content: '新增异常识别参数配置', visible: true }
   router.post('/struct/abnormal/params', dataCacl.createAbnParam)

   app.fs.api.logAttr['PUT/batch/switch/:ids'] = { content: '异常参数批量配置', visible: true }
   router.put('/batch/switch/:ids', dataCacl.batchSwitch)

   app.fs.api.logAttr['DELETE/delete/abnormal/params/:ids'] = { content: '删除异常识别参数配置', visible: true }
   router.del('delete/abnormal/params/:ids', dataCacl.deleteAbnParam)

   app.fs.api.logAttr['PUT/edit/abnormal/params/:ids'] = { content: '修改异常识别参数配置', visible: true }
   router.put('/edit/abnormal/params/:ids', dataCacl.updateAbnParam)

   app.fs.api.logAttr['POST/struct/:id/abnTask/result/:start/:end'] = { content: '获取异常数据识别任务结果', visible: true }
   router.post('/struct/:id/abnTask/result/:start/:end', dataCacl.getAbnTaskResult)

}