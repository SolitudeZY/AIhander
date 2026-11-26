"use strict";

const appPackageManagement = require("../../controllers/firmwareUpgrade/app-package-management");

module.exports = function (app, router) {
  app.fs.api.logAttr["GET/firmware-upgrade/app-install-applications"] = { content: "获取APP应用列表", visible: true };
  router.get("/firmware-upgrade/app-install-applications", appPackageManagement.listApplications);
  app.fs.api.logAttr["POST/firmware-upgrade/app-install-applications"] = { content: "新增APP应用", visible: true };
  router.post("/firmware-upgrade/app-install-applications", appPackageManagement.createApplication);
  app.fs.api.logAttr["PUT/firmware-upgrade/app-install-applications/:id"] = { content: "编辑APP应用", visible: true };
  router.put("/firmware-upgrade/app-install-applications/:id", appPackageManagement.updateApplication);
  app.fs.api.logAttr["DELETE/firmware-upgrade/app-install-applications/:id"] = { content: "删除APP应用", visible: true };
  router.delete("/firmware-upgrade/app-install-applications/:id", appPackageManagement.removeApplication);

  app.fs.api.logAttr["GET/firmware-upgrade/app-install-packages"] = { content: "获取APP安装包列表", visible: true };
  router.get("/firmware-upgrade/app-install-packages", appPackageManagement.listPackages);
  app.fs.api.logAttr["POST/firmware-upgrade/app-install-packages"] = { content: "新增APP安装包", visible: true };
  router.post("/firmware-upgrade/app-install-packages", appPackageManagement.createPackage);
  app.fs.api.logAttr["PUT/firmware-upgrade/app-install-packages/:id"] = { content: "编辑APP安装包", visible: true };
  router.put("/firmware-upgrade/app-install-packages/:id", appPackageManagement.updatePackage);
  app.fs.api.logAttr["DELETE/firmware-upgrade/app-install-packages/:id"] = { content: "删除APP安装包", visible: true };
  router.delete("/firmware-upgrade/app-install-packages/:id", appPackageManagement.removePackage);
};
