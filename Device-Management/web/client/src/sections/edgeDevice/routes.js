import {
  EdgeDeviceList,
  EdgeDeviceDetail,
  VisionModels,
  EventAlarm,
  UpgradeTasks,
} from "./containers";


export default [
  {
    type: "inner",
    route: {
      path: "/device",
      key: "edgeDeviceRoot",
      breadcrumb: "设备",
      childRoutes: [
        {
          path: "/edgeDevice",
          key: "edgeDevice",
          breadcrumb: "边缘设备",
          childRoutes: [
            {
              path: "/edgeDevices",
              key: "edgeDevices",
              component: EdgeDeviceList,
              breadcrumb: "边缘设备",
            },
            {
              path: "/deviceDetail",
              key: "edgeDeviceDetail",
              component: EdgeDeviceDetail,
              breadcrumb: "设备详情",
            },
            {
              path: "/visionModels",
              key: "visionModels",
              component: VisionModels,
              breadcrumb: "视觉模型库",
            },
            {
              path: "/events",
              key: "events",
              component: EventAlarm,
              breadcrumb: "事件与告警",
            },
            {
              path: "/upgradeTasks",
              key: "upgradeTasks",
              component: UpgradeTasks,
              breadcrumb: "升级任务",
            },
          ],
        },
      ],
    },
  },
];
