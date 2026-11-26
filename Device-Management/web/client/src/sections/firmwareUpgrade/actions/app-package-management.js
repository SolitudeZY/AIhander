"use strict";

import { ApiTable, basicAction } from "$utils";

export function getAppInstallApplications() {
  return (dispatch) =>
    basicAction({
      type: "get",
      dispatch,
      actionType: "GET_APP_INSTALL_APPLICATIONS",
      url: ApiTable.appInstallApplications,
      msg: { option: "获取应用列表" },
    });
}

export function createAppInstallApplication(data) {
  return (dispatch) =>
    basicAction({
      type: "post",
      dispatch,
      data,
      actionType: "CREATE_APP_INSTALL_APPLICATION",
      url: ApiTable.appInstallApplications,
      msg: { option: "新增应用" },
    });
}

export function updateAppInstallApplication(id, data) {
  return (dispatch) =>
    basicAction({
      type: "put",
      dispatch,
      data,
      actionType: "UPDATE_APP_INSTALL_APPLICATION",
      url: ApiTable.appInstallApplicationById.replace("{id}", id),
      msg: { option: "编辑应用" },
    });
}

export function deleteAppInstallApplication(id) {
  return (dispatch) =>
    basicAction({
      type: "delete",
      dispatch,
      actionType: "DELETE_APP_INSTALL_APPLICATION",
      url: ApiTable.appInstallApplicationById.replace("{id}", id),
      msg: { option: "删除应用" },
    });
}

export function getAppInstallPackages(query) {
  return (dispatch) =>
    basicAction({
      type: "get",
      dispatch,
      query,
      actionType: "GET_APP_INSTALL_PACKAGES",
      url: ApiTable.appInstallPackages,
      msg: { option: "获取安装包列表" },
    });
}

export function createAppInstallPackage(data) {
  return (dispatch) =>
    basicAction({
      type: "post",
      dispatch,
      data,
      actionType: "CREATE_APP_INSTALL_PACKAGE",
      url: ApiTable.appInstallPackages,
      msg: { option: "新增安装包" },
    });
}

export function updateAppInstallPackage(id, data) {
  return (dispatch) =>
    basicAction({
      type: "put",
      dispatch,
      data,
      actionType: "UPDATE_APP_INSTALL_PACKAGE",
      url: ApiTable.appInstallPackageById.replace("{id}", id),
      msg: { option: "编辑安装包" },
    });
}

export function deleteAppInstallPackage(id) {
  return (dispatch) =>
    basicAction({
      type: "delete",
      dispatch,
      actionType: "DELETE_APP_INSTALL_PACKAGE",
      url: ApiTable.appInstallPackageById.replace("{id}", id),
      msg: { option: "删除安装包" },
    });
}
