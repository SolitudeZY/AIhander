'use strict';

const workOrder = require('../../controllers/workOrder');
const cache = require('../../middlewares/cache')

module.exports = function (app, router, opts) {
   app.fs.api.logAttr['GET/workflow/process/enabled'] = { content: '获取工作流可用表单', visible: true };
   router.get('/workflow/process/enabled', workOrder.getEnabledWorkflowProcess);

   app.fs.api.logAttr['GET/workflow/struc_paidan'] = { content: '获取表单派发状态等信息', visible: true };
   router.get('/workflow/struc_paidan', workOrder.padiDanList);

   // 单一数据源
   app.fs.api.logAttr['GET/basic-data/workflow/single/allProject'] = { content: '查询所有项目', visible: false };
   router.get('/basic-data/workflow/single/allProject', cache({ interval: 60 * 10 }), workOrder.basicDataAllProject);
};