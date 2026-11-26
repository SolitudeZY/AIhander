"use strict";
import { Roles, System, Setup, Set, Cacl } from "./containers/index.js";

export default [
  {
    type: "inner",
    route: {
      path: "/install",
      key: "install",
      breadcrumb: "设置",
      // 不设置 component 则面包屑禁止跳转
      childRoutes: [
        // 移除了system路由配置，让导航直接指向独立的system模块
      ],
    },
  },
];
