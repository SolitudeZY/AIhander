'use strict';

import { ApiTable, basicAction } from '$utils'

export function getProjectPoms (query) {//获取已绑定项目
   return (dispatch) => basicAction({
      type: "get",
      dispatch: dispatch,
      actionType: "GET_PROJECT_POMS",
      query: query,
      url: `${ApiTable.getProjectPoms}`,
      msg: { option: "获取已绑定项目" },
      reducer: { name: "ProjectPoms", params: { noClear: true } },
   });
}
export function getProjectAnxincloud (query) {//获取安心云项目
   return (dispatch) => basicAction({
      type: "get",
      dispatch: dispatch,
      actionType: "GET_PROJECT_ANXINCLOUD",
      query: query,
      url: `${ApiTable.getProjectAnxincloud}`,
      msg: { option: "获取安心云项目" },
      reducer: { name: "ProjectAnxincloud", params: { noClear: true } },
   });
}
export function getProjectPmanage (query) {//获取PEP项目管理项目
   return (dispatch) => basicAction({
      type: "get",
      dispatch: dispatch,
      actionType: "GET_PROJECT_PMANAGE",
      query: query,
      url: `${ApiTable.getProjectPmanage}`,
      msg: { option: "获取PEP项目管理项目" },
      reducer: { name: "ProjectPmanage", params: { noClear: true } },
   });
}
export function getProjectAppList (query) {//获取应用列表
   return (dispatch) => basicAction({
      type: "get",
      dispatch: dispatch,
      actionType: "GET_PROJECT_APPLIST",
      query: query,
      url: `${ApiTable.getProjectAppList}`,
      msg: { option: "获取应用列表" },
      reducer: { name: "ProjectAppList", params: { noClear: true } },
   });
}
export function postProjectBind (data) {//绑定安心云、项目管理项目
   let msg = ''
   if (data) {
      msg = data.msg
   }
   return (dispatch) =>
      basicAction({
         type: "post",
         dispatch: dispatch,
         data,
         actionType: "POST_PROJECT_BIND",
         url: `${ApiTable.postProjectBind}`,
         msg: { option: msg },
         reducer: { name: "" },
      });
}
export function deleteProjectBind (data) {//删除安心云、项目管理项目绑定关系
   let bindId = ''
   let msg = ''
   if (data) {
      bindId = data.bindId
      msg = data.msg
   }
   return (dispatch) =>
      basicAction({
         type: "del",
         dispatch: dispatch,
         actionType: "DEL_PROJECT_BIND",
         url: `${ApiTable.deleteProjectBind.replace("{bindId}", bindId)}`,
         msg: { option: msg }, //删除安心云、项目管理项目绑定关系
         reducer: {},
      });
}

export function getStructureStation (query={}) {//获取对应结构物和重点测点
   return (dispatch) => basicAction({
      type: "get",
      dispatch: dispatch,
      actionType: "GET_STRUCTURE_STATION",
      query: query,
      url: `${ApiTable.getStructureStation}`,
      msg: { option: "获取对应结构物和重点测点" },
      reducer: { name: "", params: { noClear: true } },
   });
}
/**获取异常点位信息列表 */
 export function AbnormalPointList (data) {
   return (dispatch) => basicAction({
      type: "post",
      dispatch: dispatch,
      actionType: "GET_ABNORMAL_POINT_LIST",
      data,
      url: `${ApiTable.AbnormalPointList}`,
      msg: { option: "获取异常点位信息列表" },
      // reducer: { name: "abnormalPointList", params: { noClear: true } },
      reducer: {},
   });
}