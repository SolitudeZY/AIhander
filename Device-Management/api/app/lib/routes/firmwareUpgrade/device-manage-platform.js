"use strict";

const deviceManagePlatform = require("../../controllers/firmwareUpgrade/device-manage-platform");

module.exports = function (app, router, opts) {
  app.fs.api.logAttr["GET/device-manage-platform/get-devices"] = {
    content: "获取设备列表",
    visible: true,
  };
  router.get(
    "/device-manage-platform/get-devices",
    deviceManagePlatform.getDevices,
  );

  app.fs.api.logAttr["PUT/device-manage-platform/:deviceCodes/devices"] = {
    content: "修改设备信息",
    visible: true,
  };
  router.put(
    "/device-manage-platform/:deviceCodes/devices",
    deviceManagePlatform.modifyDevice,
  );

  app.fs.api.logAttr["POST/device-manage-platform/sub-devices"] = {
    content: "新增子设备",
    visible: true,
  };
  router.post(
    "/device-manage-platform/sub-devices",
    deviceManagePlatform.addSubDevices,
  );
  app.fs.api.logAttr["POST/device-manage-platform/sub-devices/import"] = {
    content: "导入子设备",
    visible: true,
  };
  router.post(
    "/device-manage-platform/sub-devices/import",
    deviceManagePlatform.importSubDevices,
  );

  app.fs.api.logAttr["PUT/device-manage-platform/:id/sub-devices"] = {
    content: "修改子设备",
    visible: true,
  };
  router.put(
    "/device-manage-platform/:id/sub-devices",
    deviceManagePlatform.modifySubDevice,
  );

  app.fs.api.logAttr["DELETE/device-manage-platform/:id/sub-devices"] = {
    content: "删除子设备",
    visible: true,
  };
  router.delete(
    "/device-manage-platform/:id/sub-devices",
    deviceManagePlatform.delSubDevices,
  );

  app.fs.api.logAttr["GET/device-manage-platform/sub-devices"] = {
    content: "获取子设备",
    visible: true,
  };
  router.get(
    "/device-manage-platform/sub-devices",
    deviceManagePlatform.getSubDevices,
  );

  app.fs.api.logAttr["GET/device-manage-platform/sub-devices/by-device-code"] =
    {
      content: "根据设备编码获取子设备",
      visible: true,
    };
  router.get(
    "/device-manage-platform/sub-devices/by-device-code",
    deviceManagePlatform.getSubDevicesByDeviceCode,
  );

  app.fs.api.logAttr["GET/device-manage-platform/command-histories"] = {
    content: "获取下发历史",
    visible: true,
  };
  router.get(
    "/device-manage-platform/command-histories",
    deviceManagePlatform.getCommandHistories,
  );

  app.fs.api.logAttr["GET/device-manage-platform/diagnostic-histories"] = {
    content: "获取诊断数据",
    visible: true,
  };
  router.get(
    "/device-manage-platform/diagnostic-histories",
    deviceManagePlatform.getDiagnosticHistories,
  );

  app.fs.api.logAttr["GET/device-manage-platform/sensor-type-model-mapping"] = {
    content: "获取传感器型号对应表",
    visible: true,
  };
  router.get(
    "/device-manage-platform/sensor-type-model-mapping",
    deviceManagePlatform.getSensorTypeModelMapping,
  );

  app.fs.api.logAttr["GET/device-manage-platform/devices-code-model-mapping"] =
    { content: "获取设备型号编码对应表", visible: true };
  router.get(
    "/device-manage-platform/devices-code-model-mapping",
    deviceManagePlatform.getDevicesCodeModelMapping,
  );

  app.fs.api.logAttr["POST/device-manage-platform/issue/batch"] = {
    content: "下发指令",
    visible: true,
  };
  router.post(
    "/device-manage-platform/issue/batch",
    deviceManagePlatform.issueCommand,
  );

  app.fs.api.logAttr["POST/device-manage-platform/issue_sensor/:deviceCode"] = {
    content: "下发子设备指令",
    visible: true,
  };
  router.post(
    "/device-manage-platform/issue_sensor/:deviceCode",
    deviceManagePlatform.issueSubCommand,
  );

  app.fs.api.logAttr["POST/device-manage-platform/ota/batch"] = {
    content: "下发固件",
    visible: true,
  };
  router.post(
    "/device-manage-platform/ota/batch",
    deviceManagePlatform.otaDevice,
  );

  app.fs.api.logAttr["POST/issue/clear_all_channels"] = {
    content: "清除全部通道号",
    visible: true,
  };
  router.post(
    "/issue/clear_all_channels",
    deviceManagePlatform.clearAllChannels,
  );

  app.fs.api.logAttr["POST/issue/overall"] = {
    content: "统一下发配置",
    visible: true,
  };
  router.post("/issue/overall", deviceManagePlatform.distributeConf);

  app.fs.api.logAttr["POST/device-manage-platform/ota/sub-device-data"] = {
    content: "获取子设备数据",
    visible: true,
  };
  router.post(
    "/device-manage-platform/ota/sub-device-data",
    deviceManagePlatform.getSubDevicesData,
  );

  app.fs.api.logAttr[
    "GET/device-manage-platform/ota/sub-device-config-formula"
  ] = { content: "获取子设备配置公式", visible: true };
  router.get(
    "/device-manage-platform/ota/sub-device-config-formula",
    deviceManagePlatform.getFormulaData,
  );

  app.fs.api.logAttr["POST/device-manage-platform/external-user/devices"] = {
    content: "外部用户添加设备",
    visible: true,
  };
  router.post(
    "/device-manage-platform/external-user/devices",
    deviceManagePlatform.addExternalUserDevices,
  );

  app.fs.api.logAttr[
    "POST/device-manage-platform/external-user/devices/unbind"
  ] = { content: "外部用户解绑设备", visible: true };
  router.post(
    "/device-manage-platform/external-user/devices/unbind",
    deviceManagePlatform.removeExternalUserDevices,
  );

  app.fs.api.logAttr["GET/device-manage-platform/get-devices-slim"] = {
    content: "获取设备简表",
    visible: true,
  };
  router.get(
    "/device-manage-platform/get-devices-slim",
    deviceManagePlatform.getDevicesSlim,
  );
};
