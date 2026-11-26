'use strict';

import { ApiTable, basicAction } from '$utils'

export function getConsoleToollink () {   //获取常用工具
   return dispatch => basicAction({
      type: 'get',
      dispatch: dispatch,
      actionType: 'GET_CONSLE_TOOLLINK',
      url: `${ApiTable.consoleToollink}`,
      msg: { option: '获取常用工具' },
      reducer: { name: '' }
   });
}

export function putConsoleToollink (data) {   //编辑常用工具
   return dispatch => basicAction({
      type: 'put',
      dispatch: dispatch,
      data,
      actionType: 'PUT_CONSLE_TOOLLINK',
      url: `${ApiTable.consoleToollink}`,
      msg: { option: '编辑常用工具' },
      reducer: { name: '' }
   });
}
export function deleteConsoleToollink (orgId) {   //删除常用工具
   return dispatch => basicAction({
      type: 'delete',
      dispatch: dispatch,
      actionType: 'DELETE_CONSLE_TOOLLINK',
      url: `${ApiTable.deleteConsoleToollink.replace('{linkId}', orgId)}`,
      msg: { option: '删除常用工具' },
      reducer: { name: '' }
   });
}

export function getConsoleCount (query) {   //工作台数量查询
   return dispatch => basicAction({
      type: 'get',
      dispatch: dispatch,
      query,
      actionType: 'GET_CONSLE_COUNT',
      url: `${ApiTable.getConsoleCount}`,
      msg: { option: '工作台数量查询' },
      reducer: { name: '' }
   });
}

export function getConsoleUser (query) {   //查询关联人员,web应用
   return dispatch => basicAction({
      type: 'get',
      dispatch: dispatch,
      query,
      actionType: 'GET_CONSLE_USER',
      url: `${ApiTable.getConsoleUser}`,
      msg: { option: '查询关联人员,web应用' },
      reducer: { name: '' }
   });
}

export function getConsoleAbnormal (query) {   //项目概览异常查询
   return dispatch => basicAction({
      type: 'get',
      dispatch: dispatch,
      query,
      actionType: 'GET_CONSLE_ABNORMAL',
      url: `${ApiTable.getConsoleAbnormal}`,
      msg: { option: '项目概览异常查询' },
      reducer: { name: '' }
   });
}

export function getDataAlarmsAggDay (query) {   //查询BI分析数据-数据
   return dispatch => basicAction({
      type: 'get',
      dispatch: dispatch,
      query,
      actionType: 'GET_DATA_ALARMS_AGG_DAY',
      url: `${ApiTable.getDataAlarmsAggDay}`,
      msg: { option: '查询BI分析数据' },
      reducer: { name: '' }
   });
}

export function getVideoAlarmsAggDay (query) {   //查询BI分析数据-视频异常
   return dispatch => basicAction({
      type: 'get',
      dispatch: dispatch,
      query,
      actionType: 'GET_VIDEO_ALARMS_AGG_DAY',
      url: `${ApiTable.getVideoAlarmsAggDay}`,
      msg: { option: '查询BI分析视频数据' },
      reducer: { name: '' }
   });
}

export function getAppAlarmsAggDay (query) {   //查询BI分析数据-应用
   return dispatch => basicAction({
      type: 'get',
      dispatch: dispatch,
      query,
      actionType: 'GET_APP_ALARMS_AGG_DAY',
      url: `${ApiTable.getAppAlarmsAggDay}`,
      msg: { option: '查询BI分析应用数据' },
      reducer: { name: '' }
   });
}

export function getAlarmsHandleStatistics (query) {   //查询BI分析数据-问题处理效率分析
   return dispatch => basicAction({
      type: 'get',
      dispatch: dispatch,
      query,
      actionType: 'GET_ALARMS_HANDLE_STATISTICS',
      url: `${ApiTable.getAlarmsHandleStatistics}`,
      msg: { option: '查询BI问题处理效率分析' },
      reducer: { name: '' }
   });
}

export function getLatestDynamic (query) {   //查询最新动态
   return dispatch => basicAction({
      type: 'get',
      dispatch: dispatch,
      query,
      actionType: 'GET_LATEST_DYNAMIC',
      url: `${ApiTable.getLatestDynamic}`,
      msg: { option: '查询最新动态' },
      reducer: { name: '' }
   });
}

export function getAlarmData (query = {}) {   //查询数据告警
   return dispatch => basicAction({
      type: 'get',
      dispatch: dispatch,
      query,
      actionType: 'GET_ALARM_DATA',
      url: `${ApiTable.getAlarmData}`,
      msg: { error: '查询数据告警失败' },
      reducer: { name: '' }
   });
}

export function getAlarmUse (query = {}) {   //查询视频告警
   return dispatch => basicAction({
      type: 'get',
      dispatch: dispatch,
      query,
      actionType: 'GET_ALARM_USE',
      url: `${ApiTable.getAlarmUse}`,
      msg: { error: '查询应用告警失败' },
      reducer: { name: '' }
   });
}

export function getStatisticOnline (query = {}) {   //查询数据在线率
   return dispatch => basicAction({
      type: 'get',
      dispatch: dispatch,
      query,
      actionType: 'GET_STATISTICS_ONLINE',
      url: `${ApiTable.getStatisticOnline}`,
      msg: { error: '查询数据在线率失败' },
      reducer: { name: 'statisticOnline' }
   });
}

export function getStrucSeries (query = {}) {   //查询数据连续率
   return dispatch => basicAction({
      type: 'get',
      dispatch: dispatch,
      query,
      actionType: 'GET_STRUC_SERIES',
      url: `${ApiTable.getStrucSeries}`,
      msg: { error: '查询数据连续率失败' },
      reducer: { name: 'strucSeries' }
   });
}