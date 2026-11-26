

'use strict';

const application = require('../../controllers/alarm/app');
const dataAlarm = require('../../controllers/alarm/data');
const videoAlarm = require('../../controllers/alarm/video')
const service = require('../../controllers/alarm/service')
const dataContinuity = require('../../controllers/alarm/dataContinuity')
const leakage = require('../../controllers/alarm/leakage');

module.exports = function (app, router, opts) {
   // 应用告警
   app.fs.api.logAttr['POST/alarm/application/inspection'] = { content: '保存应用巡检信息', visible: true };
   router.post('/alarm/application/inspection', application.inspection);

   app.fs.api.logAttr['GET/alarm/application/inspection'] = { content: '查询应用巡检信息', visible: true };
   router.get('/alarm/application/inspection', application.inspectionList);

   app.fs.api.logAttr['PUT/alarm/application/noted'] = { content: '保存检验状态', visible: true };
   router.put('/alarm/application/noted', application.notedInspection);

   app.fs.api.logAttr['POST/alarm/application/api'] = { content: '保存应用接口/元素错误信息', visible: true };
   router.post('/alarm/application/api', application.apiError);

   app.fs.api.logAttr['GET/alarm/application/api'] = { content: '查询应用接口/元素错误信息', visible: true };
   router.get('/alarm/application/api', application.apiErrorList);

   app.fs.api.logAttr['POST/alarm/application/api_confirm'] = { content: '确认应用接口/元素错误信息', visible: true };
   router.post('/alarm/application/api_confirm', application.confirmApiError);

   // 数据告警
   app.fs.api.logAttr['GET/alarm/data/group'] = { content: '获取数据告警分类', visible: true };
   router.get('/alarm/data/group', dataAlarm.groupList);

   app.fs.api.logAttr['GET/alarm/data/count'] = { content: '查询数据告警未确认数量', visible: true };
   router.get('/alarm/data/count', dataAlarm.alarmCount);

   app.fs.api.logAttr['GET/alarm/data/list'] = { content: '查询数据告警列表', visible: true };
   router.get('/alarm/data/list', dataAlarm.list);

   app.fs.api.logAttr['GET/alarm/data/detail'] = { content: '查询数据告警详情', visible: true };
   router.get('/alarm/data/detail', dataAlarm.detail);

   app.fs.api.logAttr['GET/alarm/data/detail_agg'] = { content: '查询数据告警详情聚集数据', visible: true };
   router.get('/alarm/data/detail_agg', dataAlarm.detailAggregation);

   app.fs.api.logAttr['PUT/alarm/data/confirm'] = { content: '确认数据告警', visible: true };
   router.put('/alarm/data/confirm', dataAlarm.confirm(opts));

   // 视频告警
   app.fs.api.logAttr['GET/alarm/video/device_kind'] = { content: '查询视频设备类型', visible: true };
   router.get('/alarm/video/device_kind', videoAlarm.deviceType);

   app.fs.api.logAttr['GET/alarm/video/list'] = { content: '查询视频告警列表', visible: true };
   router.get('/alarm/video/list', videoAlarm.alarmList);

   app.fs.api.logAttr['PUT/alarm/video/confirm'] = { content: '确认视频告警信息', visible: true };
   router.put('/alarm/video/confirm', videoAlarm.confirm);

   app.fs.api.logAttr['POST/alarm/video/added_log'] = { content: '新增视频告警记录', visible: true };
   router.post('/alarm/video/added_log', videoAlarm.alarmAdded);

   app.fs.api.logAttr['GET/vcmp/auth'] = { content: '获取视频平台应用鉴权token', visible: true };
   router.get('/vcmp/auth', videoAlarm.vcmpAppAuthToken);

   app.fs.api.logAttr['GET/alarm/video/exceptionType'] = { content: '查询视频异常类型', visible: true };
   router.get('/alarm/video/exceptionType', videoAlarm.exceptionType);


   app.fs.api.logAttr['POST/alarm/service/api'] = { content: '保存服务异常信息', visible: true };
   router.post('/alarm/service/api', service.serviceError);

   // app.fs.api.logAttr['GET/alarm/service/api'] = { content: '查询服务异常信息', visible: true };
   // router.get('/alarm/service/api', service.serviceErrorList);

   app.fs.api.logAttr['POST/data/continuity/api'] = { content: '保存数据连续性监控信息', visible: true };
   router.post('/data/continuity/api', dataContinuity.postDataContinuity);

   // app.fs.api.logAttr['GET/alarm/service/api'] = { content: '查询服务异常信息', visible: true };
   // router.get('/alarm/service/api', service.serviceErrorList);

   app.fs.api.logAttr['POST/alarm/service/api'] = { content: '保存服务异常信息', visible: true };
   router.post('/alarm/service/api', service.serviceError);

   // app.fs.api.logAttr['GET/alarm/service/api'] = { content: '查询服务异常信息', visible: true };
   // router.get('/alarm/service/api', service.serviceErrorList);

   app.fs.api.logAttr['GET/data/continuity/type_list'] = { content: '获取数据连续性监控信息类型', visible: true };
   router.get('/data/continuity/type_list', dataContinuity.dataContinuityTypeList);

   app.fs.api.logAttr['GET/data/continuity'] = { content: '获取数据连续性监控信息', visible: true }
   router.get('/data/continuity', dataContinuity.dataContinuityList);

   app.fs.api.logAttr['GET/data/continuity/:continuityId/detail'] = { content: '获取数据连续性监控信息详细', visible: true }
   router.get('/data/continuity/:continuityId/detail', dataContinuity.dataContinuityDetail);


   app.fs.api.logAttr['GET/exception/type/check'] = { content: '获取用户的数据异常勾选信息', visible: true };
   router.get('/exception/type/check', service.getExceptionTypeCheck);

   app.fs.api.logAttr['POST/exception/type/check'] = { content: '存储用户的数据异常勾选信息', visible: true };
   router.post('/exception/type/check', service.postExceptionTypeCheck);

   // 漏液告警
   app.fs.api.logAttr['GET/alarm/leakage/list'] = { content: '查询漏液信息列表', visible: true };
   router.get('/alarm/leakage/list', leakage.list);

   app.fs.api.logAttr['POST/alarm/leakage/status'] = { content: '更改漏液信息状态', visible: true };
   router.post('/alarm/leakage/status', leakage.status);

   app.fs.api.logAttr['GET/alarm/leakage/group'] = { content: '漏液信息按结构物分组列表', visible: true };
   router.get('/alarm/leakage/group', leakage.groupList);
};
