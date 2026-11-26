import React from "react";
import {
  AlertOutlined,
  ApiOutlined,
  CodeOutlined,
  DatabaseOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import { isAuthorized } from "$utils";

export function getNavItem(user, dispatch) {
  const groups = [
    {
      itemKey: "firmwareUpgrade",
      text: "设备管理",
      icon: <SettingOutlined />,
      items: [
        isAuthorized("DEVICELIST") &&
          isAuthorized("VIEWDEVICELIST") && {
        itemKey: "deviceList",
        to: "/device/firmwareUpgrade/deviceList",
        text: "设备列表",
          },
        isAuthorized("EDGEDEVICE") &&
          isAuthorized("VIEWEDGEDEVICE") && {
            itemKey: "edgeDevices",
            to: "/device/edgeDevice/edgeDevices",
            text: "边缘设备",
          },
        isAuthorized("FIRMWARELIB") &&
          isAuthorized("VIEWFIRMWARELIST") && {
        itemKey: "firmwareLibrary",
        to: "/device/firmwareUpgrade/firmwareLibrary",
        text: "固件库",
          },
        isAuthorized("APPINSTALLPACKAGE") &&
          isAuthorized("VIEWAPPINSTALLPACKAGE") && {
            itemKey: "appPackageManagement",
            to: "/device/firmwareUpgrade/appPackageManagement",
            text: "APP安装包管理",
          },
        isAuthorized("PRODUCTLIB") &&
          (isAuthorized("VIEWPRODUCTLIST") || isAuthorized("VIEWSENSORLIST")) && {
            itemKey: "productLibrary",
            to: "/device/firmwareUpgrade/productLibrary",
            text: "产品库",
          },
        isAuthorized("PARAMETERTEMPLATE") &&
          isAuthorized("VIEWPARAMETERTEMPLATE") && {
            itemKey: "paramTemplates",
            to: "/device/firmwareUpgrade/paramTemplates",
            text: "参数模板",
          },
        isAuthorized("PARAMETERTEMPLATEHISTORY") && {
          itemKey: "paramTemplateHistory",
          to: "/device/firmwareUpgrade/paramTemplateHistory",
          text: "参数模板历史记录",
        },
      ].filter(Boolean),
    },
    {
      itemKey: "edgeDeviceModels",
      text: "模型管理",
      icon: <DatabaseOutlined />,
      items: [
        isAuthorized("VISIONMODEL") &&
          isAuthorized("VIEWVISIONMODEL") && {
            itemKey: "visionModels",
            to: "/device/edgeDevice/visionModels",
            text: "视觉模型库",
          },
      ].filter(Boolean),
    },
    {
      itemKey: "edgeDeviceEvents",
      text: "事件管理",
      icon: <AlertOutlined />,
      items: [
        isAuthorized("EVENTALARM") &&
          isAuthorized("VIEWEVENT") && {
            itemKey: "events",
            to: "/device/edgeDevice/events",
            text: "事件与告警",
          },
        isAuthorized("UPGRADETASK") &&
          isAuthorized("VIEWUPGRADETASK") && {
            itemKey: "upgradeTasks",
            to: "/device/edgeDevice/upgradeTasks",
            text: "升级任务",
          },
      ].filter(Boolean),
    },
    {
      itemKey: "platformIntegration",
      text: "对接管理",
      icon: <ApiOutlined />,
      items: [
        isAuthorized("PLATFORMINTEGRATION") && {
          itemKey: "platformConfig",
          to: "/device/platformIntegration/platformConfig",
          text: "平台对接",
        },
      ].filter(Boolean),
    },
  ]
    .filter((group) => group.items.length > 0)
    .map((group) => ({ ...group, to: group.items[0].to }));

  return groups.length
    ? [
        {
          itemKey: "device",
          text: "设备",
          icon: <CodeOutlined />,
          items: groups,
        },
      ]
    : [];
}
