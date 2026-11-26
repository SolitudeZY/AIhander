import { Organization, Members, Roles, Log, Project } from "./containers";

export default [
  {
    type: "inner",
    route: {
      path: "/system",
      key: "system",
      breadcrumb: "系统",
      childRoutes: [
        {
          path: "/systemManagement",
          key: "systemManagement",
          breadcrumb: "系统管理",
          childRoutes: [
            {
              path: "/organizationalManagement",
              key: "organizationalManagement",
              component: Organization,
              breadcrumb: "组织管理",
            },
            {
              path: "/userManagement",
              key: "userManagement",
              component: Members,
              breadcrumb: "用户管理",
            },
            {
              path: "/roleManagement",
              key: "roleManagement",
              component: Roles,
              breadcrumb: "角色管理",
            },
            {
              path: "/projectManagement",
              key: "projectManagement",
              component: Project,
              breadcrumb: "项目管理",
            },
            {
              path: "/systemLog",
              key: "systemLog",
              component: Log,
              breadcrumb: "系统日志",
            },
          ],
        },
      ],
    },
  },
];
