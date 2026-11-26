"use strict";

const projectManage = require("../../controllers/projectManage/index");

module.exports = function (app, router, opts) {
  // 轻量项目选项（下拉使用）
  app.fs.api.logAttr["GET/project-management/projects/options"] = {
    content: "获取项目选项",
    visible: true,
  };
  router.get(
    "/project-management/projects/options",
    projectManage.listProjectOptions
  );

  // 项目列表与详情
  app.fs.api.logAttr["GET/project-management/projects"] = {
    content: "获取项目列表",
    visible: true,
  };
  router.get("/project-management/projects", projectManage.listProjects);

  app.fs.api.logAttr["GET/project-management/projects/:id"] = {
    content: "获取项目详情",
    visible: true,
  };
  router.get("/project-management/projects/:id", projectManage.getProject);

  // 项目 CRUD
  app.fs.api.logAttr["POST/project-management/projects"] = {
    content: "创建项目",
    visible: true,
  };
  router.post("/project-management/projects", projectManage.createProject);

  app.fs.api.logAttr["PUT/project-management/projects/:id"] = {
    content: "更新项目",
    visible: true,
  };
  router.put("/project-management/projects/:id", projectManage.updateProject);

  app.fs.api.logAttr["DELETE/project-management/projects/:id"] = {
    content: "删除项目",
    visible: true,
  };
  router.delete(
    "/project-management/projects/:id",
    projectManage.deleteProject
  );

  // 设备绑定相关
  app.fs.api.logAttr["POST/project-management/projects/devices/bind"] = {
    content: "绑定项目设备",
    visible: true,
  };
  router.post(
    "/project-management/projects/devices/bind",
    projectManage.bindDevices
  );

  app.fs.api.logAttr["DELETE/project-management/projects/:id/devices"] = {
    content: "解绑项目设备",
    visible: true,
  };
  router.delete(
    "/project-management/projects/:id/devices",
    projectManage.unbindDevice
  );

  app.fs.api.logAttr["GET/project-management/projects/:id/devices"] = {
    content: "获取项目设备",
    visible: true,
  };
  router.get(
    "/project-management/projects/:id/devices",
    projectManage.getProjectDevices
  );

  // 角色绑定相关
  app.fs.api.logAttr["POST/project-management/projects/roles/bind"] = {
    content: "绑定角色项目",
    visible: true,
  };
  router.post(
    "/project-management/projects/roles/bind",
    projectManage.bindRolesProject
  );

  app.fs.api.logAttr["GET/project-management/roles/:roleId/projects"] = {
    content: "获取角色绑定项目",
    visible: true,
  };
  router.get(
    "/project-management/roles/:roleId/projects",
    projectManage.getProjectRoles
  );
};
