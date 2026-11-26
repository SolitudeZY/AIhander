'use strict';

import { ApiTable, basicAction } from '$utils'

export function getProjectGroup () {
   return (dispatch) => basicAction({
      type: "get",
      dispatch: dispatch,
      actionType: "GET_PROJECT_GROPUP",
      url: `${ApiTable.projectGroup}`,
      msg: { error: "获取项目分组失败" },
      reducer: { name: "projectGroup", params: { noClear: true } },
   });
}

export function getProjectGroupDetail (groupId) {
   return (dispatch) => basicAction({
      type: "get",
      dispatch: dispatch,
      actionType: "GET_PROJECT_GROPUP_DETAIL",
      url: `${ApiTable.groupProjectDetail.replace(':groupId', groupId)}`,
      msg: { error: "获取项目分组详情失败" },
      reducer: {
         name: "projectGroupDetail", params: {
            // noClear: true
         }
      },
   });
}

export function editProjectGroup (data) {
   return (dispatch) => basicAction({
      type: "put",
      data,
      dispatch: dispatch,
      actionType: "EDIT_PROJECT_GROPUP",
      url: `${ApiTable.projectGroup}`,
      msg: { option: (data?.id ? '编辑' : '添加') + "项目分组" },
   });
}

export function delProjectGroup (id) {
   return (dispatch) => basicAction({
      type: "del",
      dispatch: dispatch,
      actionType: "DEL_PROJECT_GROPUP",
      url: `${ApiTable.projectGroup}?groupId=${id}`,
      msg: { option: "删除项目分组" },
   });
}

export function groupStatistic ({ userId } = {}) {
   return (dispatch) => basicAction({
      type: "get",
      dispatch: dispatch,
      actionType: "GET_GROPUP_STATISTICS",
      url: `${ApiTable.groupStatistic}?pomsU=${userId || ''}`,
      msg: { error: "获取项目分组统计信息失败" },
      reducer: { name: "groupStatistic", params: { noClear: true } },
   });
}

export function groupStatisticOnline (query = {}) {
   return (dispatch) => basicAction({
      type: "get",
      dispatch: dispatch,
      query,
      actionType: "GET_GROPUP_STATISTICS_ONLINE`",
      url: `${ApiTable.groupStatisticOnline}`,
      msg: { error: "获取项目分组在线率统计信息失败" },
      reducer: { name: "groupStatisticOnline", params: { noClear: true } },
   });
}


export function groupStatisticAlarm (query = {}) {
   return (dispatch) => basicAction({
      type: "get",
      dispatch: dispatch,
      query,
      actionType: "GET_STATISTICALARM",
      url: `${ApiTable.groupStatisticAlarm}`,
      msg: { error: "获取项目分组告警统计信息失败" },
      reducer: {
         name: "groupStatisticAlarm",
         params: { noClear: true }
      },
   });
}

export function groupProject (query = {}) {
   return (dispatch) => basicAction({
      type: "get",
      dispatch: dispatch,
      query,
      actionType: "GET_GROUP_PROJECT",
      url: `${ApiTable.groupProject}`,
      msg: { error: "获取分组项目信息失败" },
      reducer: {
         name: "groupProject",
         params: { noClear: true }
      },
   });
}


export function getProjectWorkOrders (query) {
   return (dispatch) => basicAction({
      type: "get",
      dispatch: dispatch,
      query,
      actionType: "GET_PROJECT_WORK_ORDERS",
      url: `${ApiTable.projectWordOrders}`,
      msg: { error: "获取项目工单信息失败" },
      reducer: {
         name: "projectWorkOrders",
         params: { noClear: true }
      },
   });
}


export function getWorkOrdersRepairRank (query) {
   return (dispatch) => basicAction({
      type: "get",
      dispatch: dispatch,
      query,
      actionType: "GET_WORK_ORDERS_REPAIR_RANK",
      url: `${ApiTable.wordOrdersRepairRank}`,
      msg: { error: "获取工单修复排名信息失败" },
      reducer: {
         name: "projectWorkOrders",
         params: { noClear: true }
      },
   });
}


export function getWorkOrdersAvgTimes (query) {
   return (dispatch) => basicAction({
      type: "get",
      dispatch: dispatch,
      query,
      actionType: "GET_WORK_ORDERS_AVG_TIMES",
      url: `${ApiTable.getWorkOrdersAvgTimes}`,
      msg: { error: "获取工单修复平均时长" },
      reducer: {
         name: "workOrdersAvgTimes",
         params: { noClear: true }
      },
   });
}

