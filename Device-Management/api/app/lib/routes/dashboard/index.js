const dashboard = require('../../controllers/dashboard');

module.exports = function (app, router, opts) {
   app.fs.api.logAttr['GET/projects'] = { content: '获取项目列表', visible: true };
   router.get('/projects', dashboard.getProjects);

   app.fs.api.logAttr['POST/stats/work-orders/count'] = { content: '统计工单数', visible: true };
   router.post('/stats/work-orders/count', dashboard.statWorkOrdersCount(opts.autoDispatchOrderUserId));

   app.fs.api.logAttr['POST/stats/work-orders/count/by-project'] = { content: '按项目统计工单数', visible: true };
   router.post('/stats/work-orders/count/by-project', dashboard.statWorkOrdersCountByProject(opts.autoDispatchOrderUserId));

   app.fs.api.logAttr['POST/stats/work-orders/elapse-deviation/by-project'] = { content: '按项目统计工单耗时偏差', visible: true };
   router.post('/stats/work-orders/elapse-deviation/by-project', dashboard.statWorkOrdersElapseDeviationByProject(opts.autoDispatchOrderUserId));

   app.fs.api.logAttr['POST/work-orders/unresolved'] = { content: '获取未解决工单', visible: true };
   router.post('/work-orders/unresolved', dashboard.getWorkOrdersUnresolved(opts.autoDispatchOrderUserId));

   app.fs.api.logAttr['POST/work-orders/resolved'] = { content: '标记工单已解决', visible: true };
   router.post('/work-orders/resolved', dashboard.workOrdersResolved);

   app.fs.api.logAttr['GET/work-orders/:procInstId/details'] = { content: '获取工单详情', visible: true };
   router.get('/work-orders/:procInstId/details', dashboard.getWorkOrdersDetails);

   app.fs.api.logAttr['POST/work-orders/overtime'] = { content: '获取超时工单', visible: true };
   router.post('/work-orders/overtime', dashboard.getWorkOrdersOvertime(opts.autoDispatchOrderUserId));

   app.fs.api.logAttr['POST/stats/work-orders/elapse/by-project'] = { content: '按项目统计工单耗时', visible: true };
   router.post('/stats/work-orders/elapse/by-project', dashboard.statWorkOrdersElapseByProject(opts.autoDispatchOrderUserId));
}
