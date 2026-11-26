'use strict';

const project = require('../../controllers/project');
const projectBind = require('../../controllers/project/bind')
const projectGroup = require('../../controllers/project/group')
const cache = require('../../middlewares/cache')

module.exports = function (app, router, opts) {
   app.fs.api.logAttr['GET/project/app_list'] = { content: '获取应用列表', visible: true };
   router.get('/project/app_list', cache({ interval: 60 * 3 }), project.appList);

   app.fs.api.logAttr['POST/project/bind'] = { content: '绑定安心云、项目管理项目', visible: true };
   router.post('/project/bind', projectBind.bindAnxin2pep);

   app.fs.api.logAttr['POST/project/anomalePoint'] = { content: '获取异常点位信息列表', visible: true };
   router.post('/project/anomalePoint', projectBind.AbnormalPointList);

   app.fs.api.logAttr['DELETE/project/bind/:bindId'] = { content: '删除安心云、项目管理项目绑定关系', visible: true };
   router.delete('/project/bind/:bindId', projectBind.del);

   app.fs.api.logAttr['GET/project/anxincloud'] = { content: '获取安心云项目', visible: true };
   router.get('/project/anxincloud', project.projectAnxincloud);

   app.fs.api.logAttr['GET/project/pmanage'] = { content: '获取PEP项目管理项目', visible: true };
   router.get('/project/pmanage', project.projectPManage);

   app.fs.api.logAttr['GET/project/poms'] = { content: '获取已绑定项目', visible: true };
   router.get('/project/poms', project.pomsProject);

   app.fs.api.logAttr['GET/project/status'] = { content: '获取项目状态列表', visible: true };
   router.get('/project/status', project.pepProjectConstrictionState);

   app.fs.api.logAttr['GET/project/structure'] = { content: '获取绑定项目下结构物', visible: true };
   router.get('/project/structure', project.strucWithPomsProject);

   app.fs.api.logAttr['GET/structure/station'] = { content: '获取对应结构物和重点测点', visible: true };
   router.get('/structure/station', project.getStructureStation);

   //  anomalePoint

   app.fs.api.logAttr['GET/project/group'] = { content: '获取项目分组', visible: true };
   router.get('/project/group', projectGroup.groupList);

   app.fs.api.logAttr['GET/project/group/:groupId/detail'] = { content: '获取项目分组详情', visible: true };
   router.get('/project/group/:groupId/detail', projectGroup.groupDetail);

   app.fs.api.logAttr['PUT/project/group'] = { content: '编辑项目分组', visible: true };
   router.put('/project/group', projectGroup.editGroup);

   app.fs.api.logAttr['DELETE/project/group'] = { content: '删除项目分组', visible: true };
   router.delete('/project/group', projectGroup.delGroup);

   app.fs.api.logAttr['GET/project/group/statistic'] = { content: '获取项目分组统计信息', visible: true };
   router.get('/project/group/statistic', projectGroup.groupStatistic);

   app.fs.api.logAttr['GET/project/group/statistic/online'] = { content: '获取项目分组在线率统计信息', visible: true };
   router.get('/project/group/statistic/online', projectGroup.groupStatisticOnline);

   app.fs.api.logAttr['GET/project/group/statistic/alarm'] = { content: '获取项目分组告警统计信息', visible: true };
   router.get('/project/group/statistic/alarm', projectGroup.groupStatisticAlarm);

   app.fs.api.logAttr['GET/project/group/list'] = { content: '获取分组项目信息', visible: true };
   router.get('/project/group/list', projectGroup.groupProject);

   app.fs.api.logAttr['GET/project/workOrders'] = { content: '获取项目工单信息', visible: true };
   router.get('/project/workOrders', projectGroup.getProjectWorkOrders);


   app.fs.api.logAttr['GET/project/workOrders/repairRank'] = { content: '获取工单修复信息', visible: true };
   router.get('project/workOrders/repairRank', projectGroup.getWorkOrdersRepairRank);

   app.fs.api.logAttr['GET/project/workOrders/avgTime'] = { content: '获取工单平均修复时长', visible: true };
   router.get('project/workOrders/avgTime', projectGroup.getworkOrdersAvgTimes);
};