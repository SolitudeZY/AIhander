"use strict";

import { ApiTable, basicAction } from "$utils";
import { Request } from "@peace/utils";

export function getDeviceType(query) {
  //获取设备型号
  return (dispatch) =>
    basicAction({
      type: "get",
      dispatch: dispatch,
      query,
      actionType: "GET_DEVICE_TYPE",
      url: `${ApiTable.getDeviceType}`,
      msg: { option: "获取设备型号" },
      reducer: {
        name: "deviceType",
        params: { noClear: true },
      },
    });
}

export function getStruc(query) {
  //获取结构物以及设备类型
  return (dispatch) =>
    basicAction({
      type: "get",
      dispatch: dispatch,
      query,
      actionType: "GET_STRUC",
      url: `${ApiTable.getStruc}`,
      msg: { option: "获取结构物以及设备类型" },
      reducer: {
        name: "structAndDeviceType",
        params: { noClear: true },
      },
    });
}

export function getFirmware(query) {
  //获取固件包
  return (dispatch) =>
    basicAction({
      type: "get",
      dispatch: dispatch,
      query,
      actionType: "GET_FIRMWARE",
      url: `${ApiTable.getFirmware}`,
      msg: { option: "获取固件包" },
      reducer: {
        name: "firmware",
        params: { noClear: true },
      },
    });
}

export const getFirmwareCapabilities = () => (dispatch) => {
  if (typeof dispatch !== "function") return { actionType: "GET_FIRMWARE_CAPABILITIES" };
  return (async () => {
    dispatch({ type: "GET_FIRMWARE_CAPABILITIES_REQUESTING" });
    try {
      const data = await Request.get(ApiTable.getFirmwareCapabilities, undefined, null, null, "user", 30000);
      return dispatch({ type: "GET_FIRMWARE_CAPABILITIES_REQUEST_SUCCESS", success: true, payload: { data } });
    } catch (_) {
      // The page shows one inline warning; do not trigger global error toasts.
      return dispatch({ type: "GET_FIRMWARE_CAPABILITIES_REQUEST_ERROR", success: false, payload: { message: "无法确认固件服务状态，请稍后刷新重试" } });
    }
  })();
};

export function getdeviceMetaNameDict(query) {
  //获取固件包列表
  return (dispatch) =>
    basicAction({
      type: "get",
      dispatch: dispatch,
      query,
      actionType: "GET_DEVICE_META_NAME_DICT",
      url: `${ApiTable.getDeviceMetaNameDict}`,
      msg: { option: "获取固件包列表" },
      reducer: {
        name: "deviceMetaNameDict",
        params: { noClear: true },
      },
    });
}

export function getDeviceMetaModels(query) {
  //分页查询设备型号列表
  return (dispatch) =>
    basicAction({
      type: "get",
      dispatch,
      query,
      actionType: "GET_DEVICE_META_MODELS",
      url: `${ApiTable.getDeviceMetaModels}`,
      msg: { option: "分页查询设备型号列表" },
    });
}

export function addDeviceModels(data) {
  //新增设备型号下拉数据源
  return (dispatch) =>
    basicAction({
      type: "post",
      dispatch,
      data,
      actionType: "ADD_DEVICE_MODELS",
      url: `${ApiTable.addDeviceModels}`,
      msg: {},
    });
}

export function getVersionDict(query) {
  //获取版本号列表
  return (dispatch) =>
    basicAction({
      type: "get",
      dispatch: dispatch,
      query,
      actionType: "GET_VERSION_DICT",
      url: `${ApiTable.getVersionDict}`,
      msg: { option: "获取版本号列表" },
      reducer: {
        name: "versionDict",
        params: { noClear: true },
      },
    });
}

export function upgradeFirmware(query, data) {
  //增加/覆盖固件包
  return (dispatch) =>
    basicAction({
      type: "post",
      dispatch: dispatch,
      query,
      data,
      actionType: "UPGRADE_FIRMWARE",
      url: `${ApiTable.upgradeFirmware}`,
      msg: { option: "增加/覆盖固件包" },
    });
}

export function deleteFirmware(query) {
  //删除固件包
  return (dispatch) =>
    basicAction({
      type: "delete",
      dispatch: dispatch,
      query,
      actionType: "DELETE_FIRMWARE",
      url: `${ApiTable.deleteFirmware}`,
      msg: { option: "删除固件包" },
    });
}

export function getThingMessages(data) {
  //获取固件包信息
  return (dispatch) =>
    basicAction({
      type: "post",
      dispatch: dispatch,
      data,
      actionType: "GET_THING_MESSAGES",
      url: `${ApiTable.getThingMessages}`,
      msg: { option: "获取设备信息" },
    });
}

export function distributeConfiguration(query, data) {
  //下发配置
  return (dispatch) =>
    basicAction({
      type: "post",
      dispatch: dispatch,
      query,
      data,
      actionType: "DISTRIBUTE_CONNFIGURATION",
      url: `${ApiTable.distributeConfiguration}`,
      msg: { option: "下发配置" },
    });
}

export function getZwyStruc(query) {
  //获取知物云结构物以及设备类型
  return (dispatch) =>
    basicAction({
      type: "get",
      dispatch: dispatch,
      query,
      actionType: "GET_ZWY_STRUC",
      url: `${ApiTable.getZwyStruc}`,
      msg: { option: "获取知物云结构物以及设备类型" },
      reducer: {
        name: "zwyStructAndDeviceType",
        params: { noClear: true },
      },
    });
}

export function getParamTemplates(query) {
  //获取参数模板
  return (dispatch) =>
    basicAction({
      type: "get",
      dispatch: dispatch,
      query,
      actionType: "GET_PARAM_TEMPLATES",
      url: `${ApiTable.paramTemplates}`,
      msg: { option: "获取参数模板" },
      reducer: {
        name: "paramTemplates",
        params: { noClear: true },
      },
    });
}

export function getParamTemplateHistories(query) {
  return (dispatch) =>
    basicAction({
      type: "get",
      dispatch,
      query,
      actionType: "GET_PARAM_TEMPLATE_HISTORIES",
      url: `${ApiTable.paramTemplateHistories}`,
      msg: { option: "获取参数模板历史记录" },
    });
}

export function getParamTemplateHistoryDetail(id) {
  return (dispatch) =>
    basicAction({
      type: "get",
      dispatch,
      actionType: "GET_PARAM_TEMPLATE_HISTORY_DETAIL",
      url: `${ApiTable.paramTemplateHistoryById.replace("{id}", id)}`,
      msg: { option: "获取参数模板历史详情" },
    });
}

export function updateParamTemplate(id, data) {
  //更新参数模板
  return (dispatch) =>
    basicAction({
      type: "put",
      dispatch: dispatch,
      data,
      actionType: "UPDATE_PARAM_TEMPLATE",
      url: `${ApiTable.paramTemplateById.replace("{id}", id)}`,
      msg: { option: "更新参数模板" },
    });
}

export function deleteParamTemplate(id) {
  //删除参数模板
  return (dispatch) =>
    basicAction({
      type: "delete",
      dispatch: dispatch,
      actionType: "DELETE_PARAM_TEMPLATE",
      url: `${ApiTable.paramTemplateById.replace("{id}", id)}`,
      msg: { option: "删除参数模板" },
    });
}

export function createParamTemplate(data) {
  //创建参数模板
  return (dispatch) =>
    basicAction({
      type: "post",
      dispatch: dispatch,
      data,
      actionType: "CREATE_PARAM_TEMPLATE",
      url: `${ApiTable.paramTemplates}`,
      msg: { option: "创建参数模板" },
    });
}

export function getParamTemplatesResolve(query) {
  return (dispatch) =>
    basicAction({
      type: "get",
      dispatch: dispatch,
      query,
      actionType: "GET_PARAM_TEMPLATES_RESOLVE",
      url: `${ApiTable.paramTemplatesResolve}`,
      msg: { option: "解析参数模板" },
    });
}
