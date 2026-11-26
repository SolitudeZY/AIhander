'use strict';

import { ApiTable, basicAction } from '$utils'

export function getProjectPoms (query) {       //获取已绑定项目
   return dispatch => basicAction({
      type: 'get',
      dispatch: dispatch,
      query,
      actionType: 'GET_PROJECT_POMS',
      url: `${ApiTable.getProjectPoms}`,
      msg: { option: '获取已绑定项目' },
      reducer: { name: '' }
   });
}


export function getAlarmLnspection (query) {   //查询应用巡检信息
   return dispatch => basicAction({
      type: 'get',
      dispatch: dispatch,
      query,
      actionType: 'GET_ALARM_LNICSPECTION',
      url: `${ApiTable.getAlarmLnspection}`,
      msg: { option: '查询应用巡检信息' },
      reducer: { name: '' }
   });
}


export function putAlarmApplicationNoted (data) {   //预览状态
   return dispatch => basicAction({
      type: 'put',
      dispatch: dispatch,
      data,
      actionType: 'PUT-AIARM-APPLICATIO-NNOTED',
      url: `${ApiTable.putAlarmApplicationNoted}`,
      msg: { option: '预览' },
      reducer: { name: '' }
   });
}

export function getAlarmLnspectionApi (query) {   //查询应用接口/元素错误信息
   return dispatch => basicAction({
      type: 'get',
      dispatch: dispatch,
      query,
      actionType: 'GET_ALARM_LNICSPECTION-API',
      url: `${ApiTable.getAlarmLnspectionApi}`,
      msg: { option: '查询应用接口/元素错误信息' },
      reducer: { name: '' }
   });
}

export function postApiConfirm (data) {   //确认应用接口/元素错误信息
   return dispatch => basicAction({
      type: 'post',
      dispatch: dispatch,
      data,
      actionType: 'POST-API-CONFIRM',
      url: `${ApiTable.postApiConfirm}`,
      msg: { option: '添加确认信息' },
      reducer: { name: '' }
   });
}

export function getAlarmDataGroup (query) {   //获取数据告警分类
   return dispatch => basicAction({
      type: 'get',
      dispatch: dispatch,
      query,
      actionType: 'GET_ALARM_DATA_GROUP',
      url: `${ApiTable.getAlarmDataGroup}`,
      msg: { option: '获取数据告警分类' },
      reducer: { name: 'alarmDataGroup' }
   });
}


export function getAlarmDataList (query) {   //查询数据告警列表
   return dispatch => basicAction({
      type: 'get',
      dispatch: dispatch,
      query,
      actionType: 'GET_ALARM_DATA_LIST',
      url: `${ApiTable.getAlarmDataList}`,
      msg: { option: '查询数据告警列表' },
      reducer: { name: '' }
   });
}

export function getAlarmDataDetail (query) {   //查询数据告警详情
   return dispatch => basicAction({
      type: 'get',
      dispatch: dispatch,
      query,
      actionType: 'GET_ALARM_DATA_DATAIL',
      url: `${ApiTable.getAlarmDataDetail}`,
      msg: { option: '查询数据告警详情' },
      reducer: { name: '' }
   });
}

export function getAlarmDataDetailAgg (query) {   //查询数据告警详情聚集数据
   return dispatch => basicAction({
      type: 'get',
      dispatch: dispatch,
      query,
      actionType: 'GET_ALARM_DATA_DATAIL_AGG',
      url: `${ApiTable.getAlarmDataDetailAgg}`,
      msg: { option: '查询数据告警详情聚集数据' },
      reducer: { name: '' }
   });
}

export function putAlarmdataConfirm (data) {   //确认数据告警
   return dispatch => basicAction({
      type: 'put',
      dispatch: dispatch,
      data,
      actionType: 'PUT-AIARM-DATA-CONFIRM',
      url: `${ApiTable.putAlarmdataConfirm}`,
      msg: { option: '确认数据告警' },
      reducer: { name: '' }
   });
}

export function getAlarmVideoList (query) {   //查询视频告警列表
   return dispatch => basicAction({
      type: 'get',
      dispatch: dispatch,
      query,
      actionType: 'GET_ALARM_VIDEO_LIST',
      url: `${ApiTable.getAlarmVideoList}`,
      msg: { option: '查询视频告警列表' },
      reducer: { name: '' }
   });
}



export function getAlarmVideoDeviceKind (query) {   //查询视频设备类型
   return dispatch => basicAction({
      type: 'get',
      dispatch: dispatch,
      query,
      actionType: 'GET_ALARM_VIDEO_DEVICE_KIND',
      url: `${ApiTable.getAlarmVideoDeviceKind}`,
      msg: { option: '查询视频设备类型' },
      reducer: { name: '' }
   });
}

export function getAlarmVideoExceptionType () {   //查询视频异常类型
   return dispatch => basicAction({
      type: 'get',
      dispatch: dispatch,
      actionType: 'GET_ALARM_VIDEO_EXCEPTION_TYPE',
      url: `${ApiTable.getAlarmVideoExceptionType}`,
      msg: { option: '查询视频异常类型' },
      reducer: { name: '' }
   });
}

export function putAlarmVideoConfirm (data) {   //确认视频告警
   return dispatch => basicAction({
      type: 'put',
      dispatch: dispatch,
      data,
      actionType: 'PUT-AIARM-VIDEO-CONFIRM',
      url: `${ApiTable.putAlarmVideoConfirm}`,
      msg: { option: '确认视频告警' },
      reducer: { name: '' }
   });
}

export function getVcmpAuth () {   //获取视频平台应用鉴权token
   return dispatch => basicAction({
      type: 'get',
      dispatch: dispatch,
      actionType: 'GET_VCMP_AUTH',
      url: `${ApiTable.getVcmpAuth}`,
      msg: { option: '获取视频平台应用鉴权token' },
      reducer: { name: '' }
   });
}

export function getExceptionTypeCheck (query = {}) {
   return dispatch => basicAction({
      type: 'get',
      dispatch: dispatch,
      query,
      actionType: 'GET_VCMP_AUTH',
      url: `${ApiTable.exceptionTypeCheck}`,
      msg: { error: '获取用户的数据异常勾选信息' },
      reducer: { name: '' }
   });
}

export function postExceptionTypeCheck (data = {}) {
   return dispatch => basicAction({
      type: 'post',
      dispatch: dispatch,
      data,
      actionType: 'POST_EXCEPTION_TYPE_CHECK',
      url: `${ApiTable.exceptionTypeCheck}`,
      msg: { option: '存储用户的数据异常勾选信息' },
      reducer: { name: '' }
   });
}

export function getLeakageList (query = {}) {
   return dispatch => basicAction({
      type: 'get',
      dispatch: dispatch,
      query,
      actionType: 'GET_LEAKAGE_LIST',
      url: `${ApiTable.leackageList}`,
      msg: { option: '获取漏液信息' },
      reducer: { name: 'leakageList', noClear: true }
   });
}

export function getLeakageGroup (query = {}) {
   return dispatch => basicAction({
      type: 'get',
      dispatch: dispatch,
      query,
      actionType: 'GET_LEAKAGE_GROUP',
      url: `${ApiTable.leackageGroup}`,
      msg: { option: '获取漏液信息' },
      reducer: { name: 'leakageGroup', noClear: true }
   });
}

export function upLeakageStatus (data = {}) {
   return dispatch => basicAction({
      type: 'post',
      dispatch: dispatch,
      data,
      actionType: 'UP_LEAKAGE_STATUS',
      url: `${ApiTable.leackagestatus}`,
      msg: { option: '更改异常状态' },
      reducer: { name: '' }
   });
}