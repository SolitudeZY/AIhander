'use strict';

const toolLink = require('../../controllers/control/toolLink');
const analysis = require('../../controllers/control/analysis');
const csData = require('../../controllers/control/data');

module.exports = function (app, router, opts) {
   app.fs.api.logAttr['GET/console/toollink'] = { content: '获取常用工具', visible: true };
   router.get('/console/toollink', toolLink.list);

   app.fs.api.logAttr['PUT/console/toollink'] = { content: '编辑常用工具', visible: true };
   router.put('/console/toollink', toolLink.edit);

   app.fs.api.logAttr['DELETE/console/toollink/:linkId'] = { content: '删除常用工具', visible: true };
   router.del('/console/toollink/:linkId', toolLink.del);

   app.fs.api.logAttr['GET/console/count'] = { content: '工作台查询告警数量', visible: true };
   router.get('/console/count', toolLink.count);

   app.fs.api.logAttr['GET/analysis/userlist'] = { content: '查询关联人员,web应用', visible: true };
   router.get('/analysis/userlist', analysis.personnelApp);

   app.fs.api.logAttr['GET/analysis/problem'] = { content: '查询异常&问题', visible: true };
   router.get('/analysis/problem', analysis.problem);


   //BI分析模块
   app.fs.api.logAttr['GET/data/alarms/agg/day'] = { content: '查询BI分析数据-数据', visible: false };
   router.get('/data/alarms/agg/day', csData.getDataAlarmsAggDay);

   app.fs.api.logAttr['GET/app/alarms/agg/day'] = { content: '查询BI分析数据-应用异常', visible: false };
   router.get('/app/alarms/agg/day', csData.getAppAlarmsAggDay);

   app.fs.api.logAttr['GET/video/alarms/agg/day'] = { content: '查询BI分析数据-视频异常', visible: false };
   router.get('/video/alarms/agg/day', csData.getVideoAlarmsAggDay);

   app.fs.api.logAttr['GET/alarms/handle/statistics'] = { content: '查询BI分析数据-问题处理效率分析', visible: false };
   router.get('/alarms/handle/statistics', csData.getAlarmsHandleStatistics);

   //最新动态
   app.fs.api.logAttr['GET/latest/dynamic'] = { content: '查询最新动态', visible: false };
   router.get('/latest/dynamic', csData.getLatestDynamic);

   app.fs.api.logAttr['GET/alarm/data'] = { content: '查询数据告警', visible: false };
   router.get('/alarm/data', analysis.getAlarmData);

   app.fs.api.logAttr['GET/alarm/use'] = { content: '查询应用告警', visible: false };
   router.get('/alarm/use', analysis.getAlarmUse);

   app.fs.api.logAttr['GET/StatisticOnline'] = { content: '查询数据在线率', visible: false };
   router.get('/StatisticOnline', analysis.getStatisticOnline);

   app.fs.api.logAttr['GET/strucSeries'] = { content: '查询数据在线率', visible: false };
   router.get('/strucSeries', analysis.getStrucSeries);

   
};