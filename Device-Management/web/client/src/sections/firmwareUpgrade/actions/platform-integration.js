"use strict";

import { basicAction, EmisApiTable } from "$utils";

/* ---------------- 接收平台 ---------------- */

export const queryPlatformConfigs = (params = {}) => (dispatch) =>
  basicAction({
    type: "get",
    dispatch,
    actionType: "PLATFORM_CONFIGS",
    url: EmisApiTable.platformConfigs,
    msg: { error: "查询接收平台失败" },
    reducer: { name: "platformConfigs", params: { noClear: true } },
  });

export const savePlatformConfig = (data = {}) => (dispatch) => {
  const isUpdate = Boolean(data.id);
  return basicAction({
    type: isUpdate ? "put" : "post",
    dispatch,
    params: isUpdate ? { configId: data.id } : undefined,
    data: {
      name: data.name,
      kind: data.kind,
      pushUrl: data.pushUrl,
      credential: data.credential,
      mqttBroker: data.mqttBroker,
      mqttTopic: data.mqttTopic,
      mqttClientId: data.mqttClientId,
      mqttUsername: data.mqttUsername,
      mqttPassword: data.mqttPassword,
      // 推送报文：整段 body 原文，留空则按内置告警字段下发
      pushPayloadTemplate: data.pushPayloadTemplate,
      confirmCallback: data.confirmCallback,
      enabled: data.enabled,
    },
    actionType: "PLATFORM_CONFIG_SAVE",
    url: isUpdate
      ? EmisApiTable.platformConfigDetail.replace("{configId}", data.id)
      : EmisApiTable.platformConfigs,
    msg: {
      success: isUpdate ? "接收平台已更新" : "接收平台已新增",
      error: "保存接收平台失败",
    },
    reducer: { name: "platformConfigSave", params: { noClear: true } },
  });
};

export const removePlatformConfig = (id) => (dispatch) =>
  basicAction({
    type: "del",
    dispatch,
    params: { configId: id },
    actionType: "PLATFORM_CONFIG_REMOVE",
    url: EmisApiTable.platformConfigDetail.replace("{configId}", id),
    msg: { success: "接收平台已删除", error: "删除接收平台失败" },
    reducer: { name: "platformConfigRemove", params: { noClear: true } },
  });

// 只探测推送地址可达性，不下发告警
export const testPlatformConfig = (id) => (dispatch) =>
  basicAction({
    type: "post",
    dispatch,
    params: { configId: id },
    actionType: "PLATFORM_CONFIG_TEST",
    url: EmisApiTable.platformConfigTest.replace("{configId}", id),
    msg: { error: "测试连接失败" },
    reducer: { name: "platformConfigTest", params: { noClear: true } },
  });

/* ---------------- 对象关联 ---------------- */

// 按项目查询安心云结构物，未配置接口时返回空列表，前端退回手工填写
export const queryPlatformStructures = (configId, projectId) => (dispatch) =>
  basicAction({
    type: "get",
    dispatch,
    params: { projectId },
    actionType: "PLATFORM_STRUCTURES",
    url: EmisApiTable.platformStructures.replace("{configId}", configId),
    msg: { error: "查询结构物失败" },
    reducer: { name: "platformStructures", params: { noClear: true } },
  });

export const queryPlatformMappings = () => (dispatch) =>
  basicAction({
    type: "get",
    dispatch,
    actionType: "PLATFORM_MAPPINGS",
    url: EmisApiTable.platformMappings,
    msg: { error: "查询对象关联失败" },
    reducer: { name: "platformMappings", params: { noClear: true } },
  });

export const savePlatformMapping = (data = {}) => (dispatch) => {
  const isUpdate = Boolean(data.id);
  return basicAction({
    type: isUpdate ? "put" : "post",
    dispatch,
    params: isUpdate ? { mappingId: data.id } : undefined,
    data: {
      platformConfigId: data.platformConfigId,
      projectId: data.projectId,
      deviceCode: data.deviceCode,
      channelName: data.channelName,
      structureName: data.structureName,
      structureId: data.structureId,
      sourceName: data.sourceName,
      sourceId: data.sourceId,
    },
    actionType: "PLATFORM_MAPPING_SAVE",
    url: isUpdate
      ? EmisApiTable.platformMappingDetail.replace("{mappingId}", data.id)
      : EmisApiTable.platformMappings,
    msg: {
      success: isUpdate ? "对象关联已更新" : "对象关联已新增",
      error: "保存对象关联失败",
    },
    reducer: { name: "platformMappingSave", params: { noClear: true } },
  });
};

export const removePlatformMapping = (id) => (dispatch) =>
  basicAction({
    type: "del",
    dispatch,
    params: { mappingId: id },
    actionType: "PLATFORM_MAPPING_REMOVE",
    url: EmisApiTable.platformMappingDetail.replace("{mappingId}", id),
    msg: { success: "对象关联已删除", error: "删除对象关联失败" },
    reducer: { name: "platformMappingRemove", params: { noClear: true } },
  });

/* ---------------- 推送订阅 ---------------- */

export const queryPlatformSubscriptions = () => (dispatch) =>
  basicAction({
    type: "get",
    dispatch,
    actionType: "PLATFORM_SUBSCRIPTIONS",
    url: EmisApiTable.platformSubscriptions,
    msg: { error: "查询推送订阅失败" },
    reducer: { name: "platformSubscriptions", params: { noClear: true } },
  });

export const savePlatformSubscription = (data = {}) => (dispatch) => {
  const isUpdate = Boolean(data.id);
  return basicAction({
    type: isUpdate ? "put" : "post",
    dispatch,
    params: isUpdate ? { subscriptionId: data.id } : undefined,
    data: {
      projectId: data.projectId,
      platformConfigId: data.platformConfigId,
      types: data.types,
      levels: data.levels,
      timings: data.timings,
      enabled: data.enabled,
    },
    actionType: "PLATFORM_SUBSCRIPTION_SAVE",
    url: isUpdate
      ? EmisApiTable.platformSubscriptionDetail.replace("{subscriptionId}", data.id)
      : EmisApiTable.platformSubscriptions,
    msg: {
      success: isUpdate ? "推送订阅已更新" : "推送订阅已新增",
      error: "保存推送订阅失败",
    },
    reducer: { name: "platformSubscriptionSave", params: { noClear: true } },
  });
};

export const removePlatformSubscription = (id) => (dispatch) =>
  basicAction({
    type: "del",
    dispatch,
    params: { subscriptionId: id },
    actionType: "PLATFORM_SUBSCRIPTION_REMOVE",
    url: EmisApiTable.platformSubscriptionDetail.replace("{subscriptionId}", id),
    msg: { success: "推送订阅已删除", error: "删除推送订阅失败" },
    reducer: { name: "platformSubscriptionRemove", params: { noClear: true } },
  });

/* ---------------- 推送记录 ---------------- */

export const queryPushRecords = (params = {}) => (dispatch) =>
  basicAction({
    type: "get",
    dispatch,
    query: {
      status: params.status,
      eventId: params.eventId,
      page: params.page || 1,
      pageSize: params.pageSize || 10,
    },
    actionType: "PLATFORM_PUSH_RECORDS",
    url: EmisApiTable.platformPushRecords,
    msg: { error: "查询推送记录失败" },
    reducer: { name: "platformPushRecords", params: { noClear: true } },
  });
