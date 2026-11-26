// 组织管理路由
const organizationController = require("../../controllers/system/organization");
// 部门管理路由
const departmentController = require("../../controllers/system/department");
// 用户管理路由
const userController = require("../../controllers/system/user");
// 角色管理路由
const roleController = require("../../controllers/system/role");
// 角色组管理路由
const roleGroupController = require("../../controllers/system/role-group");
// 权限资源管理路由
const resourceController = require("../../controllers/system/resource");
// 系统日志管理路由
const systemLogController = require("../../controllers/system/system-log");
const cache = require("../../middlewares/cache");

module.exports = function (app, router, opts) {
  app.fs.api.logAttr["GET/system/organizations"] = {
    content: "获取组织列表",
    visible: false,
  };
  router.get("/system/organizations", organizationController.getOrganizations);

  app.fs.api.logAttr["GET/system/organizations/tree"] = {
    content: "获取组织树",
    visible: false,
  };
  router.get(
    "/system/organizations/tree",
    cache({ interval: 60 * 3 }),
    organizationController.getOrganizationTree
  );

  app.fs.api.logAttr["GET/system/organizations/:id"] = {
    content: "获取组织详情",
    visible: false,
  };
  router.get(
    "/system/organizations/:id",
    organizationController.getOrganization
  );

  app.fs.api.logAttr["POST/system/organizations"] = {
    content: "创建组织",
    visible: true,
  };
  router.post(
    "/system/organizations",
    organizationController.createOrganization
  );

  app.fs.api.logAttr["PUT/system/organizations/:id"] = {
    content: "更新组织",
    visible: true,
  };
  router.put(
    "/system/organizations/:id",
    organizationController.updateOrganization
  );

  app.fs.api.logAttr["DELETE/system/organizations/:id"] = {
    content: "删除组织",
    visible: true,
  };
  router.delete(
    "/system/organizations/:id",
    organizationController.deleteOrganization
  );

  app.fs.api.logAttr["GET/system/departments"] = {
    content: "获取部门列表",
    visible: false,
  };
  router.get("/system/departments", departmentController.getDepartments);

  app.fs.api.logAttr["GET/system/departments/tree"] = {
    content: "获取部门树",
    visible: false,
  };
  router.get(
    "/system/departments/tree",
    cache({ interval: 60 * 3 }),
    departmentController.getDepartmentTree
  );

  app.fs.api.logAttr["GET/system/departments/:id"] = {
    content: "获取部门详情",
    visible: false,
  };
  router.get("/system/departments/:id", departmentController.getDepartment);

  app.fs.api.logAttr["POST/system/departments"] = {
    content: "创建部门",
    visible: true,
  };
  router.post("/system/departments", departmentController.createDepartment);

  app.fs.api.logAttr["PUT/system/departments/:id"] = {
    content: "更新部门",
    visible: true,
  };
  router.put("/system/departments/:id", departmentController.updateDepartment);

  app.fs.api.logAttr["DELETE/system/departments/:id"] = {
    content: "删除部门",
    visible: true,
  };
  router.delete(
    "/system/departments/:id",
    departmentController.deleteDepartment
  );

  app.fs.api.logAttr["POST/system/departments/sort"] = {
    content: "部门排序",
    visible: true,
  };
  router.post("/system/departments/sort", departmentController.sortDepartments);

  app.fs.api.logAttr["GET/system/list/users"] = {
    content: "获取用户列表",
    visible: false,
  };
  router.get("/system/list/users", userController.getUsers);

  app.fs.api.logAttr["GET/system/users/all"] = {
    content: "获取所有用户列表",
    visible: false,
  };
  router.get("/system/users/all", userController.getAllUsers);

  app.fs.api.logAttr["GET/system/users/postitions"] = {
    content: "获取职位列表",
    visible: false,
  };
  router.get("/system/users/postitions", userController.getPosts);

  app.fs.api.logAttr["GET/system/users/:id"] = {
    content: "获取用户详情",
    visible: false,
  };
  router.get("/system/users/:id", userController.getUser);

  app.fs.api.logAttr["POST/system/add/users"] = {
    content: "创建用户",
    visible: true,
  };
  router.post("/system/add/users", userController.createUser);

  app.fs.api.logAttr["PUT/system/users/:id"] = {
    content: "更新用户",
    visible: true,
  };
  router.put("/system/users/:id", userController.updateUser);

  app.fs.api.logAttr["DELETE/system/users/:id"] = {
    content: "删除用户",
    visible: true,
  };
  router.delete("/system/users/:id", userController.deleteUser);

  app.fs.api.logAttr["PUT/system/users/:id/reset-password"] = {
    content: "重置用户密码",
    visible: true,
  };
  router.put("/system/users/:id/reset-password", userController.resetPassword);

  app.fs.api.logAttr["PUT/system/users/:id/status"] = {
    content: "更新用户状态",
    visible: true,
  };
  router.put("/system/users/:id/status", userController.updateUserStatus);

  app.fs.api.logAttr["DELETE/system/users/batch"] = {
    content: "批量删除用户",
    visible: true,
  };
  router.delete("/system/users/batch", userController.batchDeleteUsers);

  app.fs.api.logAttr["POST/system/users/sort"] = {
    content: "部门用户排序",
    visible: true,
  };
  router.post("/system/users/sort", userController.sortDepartmentUsers);

  app.fs.api.logAttr["GET/system/rolesList"] = {
    content: "获取角色列表",
    visible: false,
  };
  router.get("/system/rolesList", userController.getRolesList);

  app.fs.api.logAttr["GET/system/users/rolesGroups"] = {
    content: "获取角色组列表",
    visible: false,
  };
  router.get("/system/users/rolesGroups", userController.getRoleGroups);

  app.fs.api.logAttr["GET/system/roles"] = {
    content: "获取角色列表，包含查询功能",
    visible: false,
  };
  router.get("/system/roles", roleController.getRoles);

  app.fs.api.logAttr["GET/system/roles/:id"] = {
    content: "获取角色详情",
    visible: false,
  };
  router.get("/system/roles/:id", roleController.getRole);

  app.fs.api.logAttr["POST/system/roles"] = {
    content: "创建角色",
    visible: true,
  };
  router.post("/system/roles", roleController.createRole);

  app.fs.api.logAttr["PUT/system/roles/:id"] = {
    content: "更新角色",
    visible: true,
  };
  router.put("/system/roles/:id", roleController.updateRole);

  app.fs.api.logAttr["DELETE/system/roles/:id"] = {
    content: "删除角色",
    visible: true,
  };
  router.delete("/system/roles/:id", roleController.deleteRole);

  app.fs.api.logAttr["GET/system/roles/:id/users"] = {
    content: "获取角色用户列表",
    visible: false,
  };
  router.get("/system/roles/:id/users", roleController.getRoleUsers);

  app.fs.api.logAttr["POST/system/roles/:roleId/users"] = {
    content: "修改角色关联用户",
    visible: true,
  };
  router.post("/system/roles/:roleId/users", roleController.updateRoleUsers);

  app.fs.api.logAttr["DELETE/system/role/:roleId/users/remove"] = {
    content: "删除角色关联用户",
    visible: true,
  };
  router.post("/system/role/:roleId/users/remove", roleController.delRoleUsers);

  app.fs.api.logAttr["POST/system/departments/:depId/users"] = {
    content: "批量修改部门关联用户",
    visible: true,
  };
  router.post(
    "/system/departments/:depId/users",
    departmentController.updateDepartmentUsers
  );

  app.fs.api.logAttr["POST/system/roles/:roleId/permissions"] = {
    content: "修改角色权限",
    visible: true,
  };
  router.post("/system/roles/:roleId/permissions", roleController.updateAuth);

  app.fs.api.logAttr["GET/system/role-groups"] = {
    content: "获取角色组列表",
    visible: false,
  };
  router.get("/system/role-groups", roleGroupController.getRoleGroups);

  app.fs.api.logAttr["GET/system/role-groups/:id"] = {
    content: "获取角色组详情",
    visible: false,
  };
  router.get("/system/role-groups/:id", roleGroupController.getRoleGroup);

  app.fs.api.logAttr["POST/system/role-groups"] = {
    content: "创建角色组",
    visible: true,
  };
  router.post("/system/role-groups", roleGroupController.createRoleGroup);

  app.fs.api.logAttr["PUT/system/role-groups/:id"] = {
    content: "更新角色组",
    visible: true,
  };
  router.put("/system/role-groups/:id", roleGroupController.updateRoleGroup);

  app.fs.api.logAttr["DELETE/system/role-groups/:id"] = {
    content: "删除角色组",
    visible: true,
  };
  router.delete("/system/role-groups/:id", roleGroupController.deleteRoleGroup);

  app.fs.api.logAttr["GET/system/role-groups/:id/roles"] = {
    content: "获取角色组角色列表",
    visible: false,
  };
  router.get(
    "/system/role-groups/:id/roles",
    roleGroupController.getRoleGroupRoles
  );

  app.fs.api.logAttr["GET/system/role-groups/:id/user-stats"] = {
    content: "获取角色组用户统计",
    visible: false,
  };
  router.get(
    "/system/role-groups/:id/user-stats",
    roleGroupController.getRoleGroupUserStats
  );

  app.fs.api.logAttr["GET/system/resources"] = {
    content: "获取权限列表",
    visible: false,
  };
  router.get(
    "/system/resources",
    cache({ interval: 60 * 10 }),
    resourceController.getResources
  );

  app.fs.api.logAttr["GET/system/resources/tree"] = {
    content: "获取资源树",
    visible: false,
  };
  router.get(
    "/system/resources/tree",
    cache({ interval: 60 * 10 }),
    resourceController.getResourceTree
  );

  app.fs.api.logAttr["GET/system/resources/:id"] = {
    content: "获取资源详情",
    visible: false,
  };
  router.get("/system/resources/:id", resourceController.getResource);

  app.fs.api.logAttr["POST/system/resources"] = {
    content: "创建资源",
    visible: true,
  };
  router.post("/system/resources", resourceController.createResource);

  app.fs.api.logAttr["PUT/system/resources/:id"] = {
    content: "更新资源",
    visible: true,
  };
  router.put("/system/resources/:id", resourceController.updateResource);

  app.fs.api.logAttr["DELETE/system/resources/:id"] = {
    content: "删除资源",
    visible: true,
  };
  router.delete("/system/resources/:id", resourceController.deleteResource);

  app.fs.api.logAttr["DELETE/system/resources/batch"] = {
    content: "批量删除资源",
    visible: true,
  };
  router.delete(
    "/system/resources/batch",
    resourceController.batchDeleteResources
  );

  app.fs.api.logAttr["GET/system/resources/:id/roles"] = {
    content: "获取角色权限列表",
    visible: false,
  };
  router.get(
    "/system/resources/:id/roles",
    resourceController.getResourceRoles
  );

  // 系统日志相关路由
  app.fs.api.logAttr["POST/system/create/logs"] = {
    content: "创建系统日志",
    visible: false,
  };
  router.post("/system/create/logs", systemLogController.createSystemLog);

  app.fs.api.logAttr["GET/system/logLists"] = {
    content: "获取系统日志列表",
    visible: false,
  };
  router.get("/system/logLists", systemLogController.getSystemLogs);

  app.fs.api.logAttr["GET/system/logs/:id"] = {
    content: "获取系统日志详情",
    visible: false,
  };
  router.get("/system/logs/:id", systemLogController.getSystemLog);

  app.fs.api.logAttr["DELETE/system/logs/batch"] = {
    content: "批量删除系统日志",
    visible: true,
  };
  router.delete(
    "/system/logs/batch",
    systemLogController.batchDeleteSystemLogs
  );

  app.fs.api.logAttr["POST/system/logs/clear"] = {
    content: "清空系统日志",
    visible: true,
  };
  router.post("/system/logs/clear", systemLogController.clearSystemLogs);
};
