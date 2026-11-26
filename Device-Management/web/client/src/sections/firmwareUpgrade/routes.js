import {
  FirmwareLibrary,
  DeviceManagement,
  Product,
  DeviceDetail,
  DeviceList,
  ParamTemplates,
  ParamTemplateHistory,
  AppPackageManagement,
  PlatformIntegration,
} from "./containers";

export default [
  {
    type: "inner",
    route: {
      path: "/device",
      key: "device",
      breadcrumb: "设备",
      // 不设置 component 则面包屑禁止跳转
      childRoutes: [
        {
          path: "/firmwareUpgrade",
          key: "firmwareUpgrade",
          breadcrumb: "设备管理",
          childRoutes: [
            {
              path: "/firmwareLibrary",
              key: "firmwareLibrary",
              component: FirmwareLibrary,
              breadcrumb: "固件库",
            },
            {
              path: "/appPackageManagement",
              key: "appPackageManagement",
              component: AppPackageManagement,
              breadcrumb: "APP安装包管理",
            },
            {
              path: "/paramTemplates",
              key: "paramTemplates",
              component: ParamTemplates,
              breadcrumb: "参数模板",
            },
            {
              path: "/paramTemplateHistory",
              key: "paramTemplateHistory",
              component: ParamTemplateHistory,
              breadcrumb: "参数模板历史记录",
            },
            // {
            //     path: '/DeviceManagement',
            //     key: 'deviceManagement',
            //     component: DeviceManagement,
            //     breadcrumb: '固件升级',
            // },
            {
              path: "/productLibrary",
              key: "productLibrary",
              component: Product,
              breadcrumb: "产品库",
            },
            {
              path: "/deviceList",
              key: "deviceList",
              component: DeviceList,
              breadcrumb: "设备列表",
            },
            {
              path: "/deviceDetail",
              key: "deviceDetail",
              component: DeviceDetail,
              // breadcrumb: '设备详情',
            },
          ],
        },
        {
          path: "/platformIntegration",
          key: "platformIntegration",
          breadcrumb: "对接管理",
          childRoutes: [
            {
              path: "/platformConfig",
              key: "platformConfig",
              component: PlatformIntegration,
              breadcrumb: "平台对接",
            },
          ],
        },
      ],
    },
  },
];
