"use strict";

import { ApiTable, basicAction } from "$utils";

export function getDevicesList(query) {
  return (dispatch) =>
    basicAction({
      type: "get",
      dispatch,
      query,
      actionType: "GET_DEVICES_LIST",
      url: `${ApiTable.getDevicesList}`,
      msg: { option: "获取设备列表" },
      reducer: {
        name: "devicesList",
        params: { noClear: true },
      },
    });
}

export function getDevicesSlim(query) {
  return (dispatch) =>
    basicAction({
      type: "get",
      dispatch,
      query,
      actionType: "GET_DEVICES_SLIM",
      url: `${ApiTable.getDevicesSlim}`,
      msg: { option: "获取设备简表" },
    });
}

export function modifyDevice(deviceCodes, data) {
  return (dispatch) =>
    basicAction({
      type: "put",
      dispatch,
      data,
      actionType: "PUT_MODIFY_DEVICE",
      url: `${ApiTable.modifyDevice.replace("{deviceCodes}", deviceCodes)}`,
      msg: { option: "" },
    });
}

export function addSubDevices(data) {
  return (dispatch) =>
    basicAction({
      type: "post",
      dispatch,
      data,
      actionType: "POST_ADD_SUB_DEVICES",
      url: `${ApiTable.subDevices}`,
      msg: { option: "新增子设备" },
    });
}

export function modifySubDevice(id, data) {
  return (dispatch) =>
    basicAction({
      type: "put",
      dispatch,
      data,
      actionType: "PUT_SUB_DEVICES",
      url: `${ApiTable.modifyDelDevices.replace("{id}", id)}`,
      msg: { option: "修改子设备" },
    });
}

export function delSubDevices(id) {
  return (dispatch) =>
    basicAction({
      type: "delete",
      dispatch,
      actionType: "DELETE_SUB_DEVICES",
      url: `${ApiTable.modifyDelDevices.replace("{id}", id)}`,
      msg: { option: "删除子设备" },
    });
}

export function getSubDevices(query) {
  return (dispatch) =>
    basicAction({
      type: "get",
      dispatch,
      query,
      actionType: "GET_SUB_DEVICES",
      url: `${ApiTable.subDevices}`,
      msg: { option: "获取子设备" },
      reducer: {
        name: "subDevices",
      },
    });
}

export function getCommandHistories(query) {
  return (dispatch) =>
    basicAction({
      type: "get",
      dispatch,
      query,
      actionType: "GET_COMMAND_HISTORIES",
      url: `${ApiTable.getCommandHistories}`,
      msg: { option: "获取下发历史" },
      reducer: {
        name: "commandHistories",
        params: { noClear: true },
      },
    });
}

export function getDiagnosticHistories(query) {
  return (dispatch) =>
    basicAction({
      type: "get",
      dispatch,
      query,
      actionType: "GET_DIAGNOSTIC_HISTORIES",
      url: `${ApiTable.getDiagnosticHistories}`,
      msg: { option: "获取诊断数据" },
      reducer: {
        name: "diagnosticHistories",
      },
    });
}

export function getSensorTypeModelMapping(query) {
  return (dispatch) =>
    basicAction({
      type: "get",
      dispatch,
      query,
      actionType: "GET_SENSOR_TYPE_MODEL_MAPPING",
      url: `${ApiTable.getSensorTypeModelMapping}`,
      msg: { option: "获取传感器型号对应表" },
    });
}

export function getDevicesCodeModelMapping() {
  return (dispatch) =>
    basicAction({
      type: "get",
      dispatch,
      actionType: "GET_DEVICES_CODE_MODEL_MAPPING",
      url: `${ApiTable.getDevicesCodeModelMapping}`,
      msg: { option: "获取设备型号编码对应表" },
      reducer: {
        name: "devicesCodeModelMapping",
        params: { noClear: true },
      },
    });
}

export function issueCommand(data) {
  return (dispatch) =>
    basicAction({
      type: "post",
      dispatch,
      data,
      actionType: "POST_ISSUE_COMMAND",
      url: `${ApiTable.issueCommand}`,
      msg: { option: "下发指令" },
    });
}

export function issueSubCommand(deviceCode, query) {
  return (dispatch) =>
    basicAction({
      type: "post",
      dispatch,
      query,
      actionType: "POST_ISSUE_SUB_COMMAND",
      url: `${ApiTable.issueSubCommand.replace("{deviceCode}", deviceCode)}`,
      msg: { option: "下发子设备指令" },
    });
}

export function otaDevice(data) {
  return (dispatch) =>
    basicAction({
      type: "post",
      dispatch,
      data,
      actionType: "POST_OTA_DEVICE",
      url: `${ApiTable.otaDevice}`,
      msg: { option: "下发固件" },
    });
}

export function clearAll(data) {
  return (dispatch) =>
    basicAction({
      type: "post",
      dispatch,
      data,
      actionType: "CLEAR_ALL",
      url: `${ApiTable.clearAll}`,
      msg: { option: "清除全部通道" },
    });
}

export function distributeConf(data) {
  return (dispatch) =>
    basicAction({
      type: "post",
      dispatch,
      data,
      actionType: "DISTRIBUTE_CONF",
      url: `${ApiTable.distributeConf}`,
      msg: { option: "统一下发配置" },
    });
}

export function getSubDevicesData(data) {
  return (dispatch) =>
    basicAction({
      type: "post",
      dispatch,
      data,
      actionType: "GET_SUB_DEVICES_DATA",
      url: `${ApiTable.getSubDevicesData}`,
      msg: { option: "获取子设备数据" },
      reducer: {
        name: "subDevicesDatas",
      },
    });
}

export function getFormulaData() {
  return (dispatch) =>
    basicAction({
      type: "get",
      dispatch,
      actionType: "GET_FORMULA_DATA",
      url: `${ApiTable.getFormulaData}`,
      msg: { option: "获取传感器型号对应表" },
    });
}

export function importSubDevices(data) {
  return (dispatch) =>
    basicAction({
      type: "post",
      dispatch,
      data,
      actionType: "POST_IMPORT_SUB_DEVICES",
      url: `${ApiTable.importSubDevices}`,
      msg: { option: "导入子设备" },
    });
}

export function addExternalUserDevices(data) {
  return (dispatch) =>
    basicAction({
      type: "post",
      dispatch,
      data, // 直接传数组：[{ model, productCode, deviceIds }, ...]
      actionType: "POST_EXTERNAL_USER_ADD_DEVICES",
      url: `${ApiTable.externalUserAddDevices}`,
      msg: { option: "外部用户添加设备" },
    });
}

export function removeExternalUserDevices(data) {
  return (dispatch) =>
    basicAction({
      type: "post",
      dispatch,
      data,
      actionType: "DELETE_EXTERNAL_USER_REMOVE_DEVICES",
      url: `${ApiTable.removeExternalUserDevices}`,
      msg: { option: "" },
    });
}
