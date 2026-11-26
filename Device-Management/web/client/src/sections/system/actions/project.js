import { ApiTable, basicAction } from "$utils";

export function getProjects(params) {
  return (dispatch) =>
    basicAction({
      type: "get",
      query: params,
      dispatch: dispatch,
      actionType: "GET_PROJECTS",
      url: ApiTable.getProjects,
      msg: { option: "获取项目列表" },
      reducer: {
        name: "projects",
      },
    });
}

export function getProject(id) {
  return (dispatch) =>
    basicAction({
      type: "get",
      dispatch: dispatch,
      actionType: "GET_PROJECT",
      url: ApiTable.getProject.replace("{id}", id),
      msg: { option: "获取项目详情" },
    });
}

export function createProject(params) {
  return (dispatch) =>
    basicAction({
      type: "post",
      data: params,
      dispatch: dispatch,
      actionType: "CREATE_PROJECT",
      url: ApiTable.createProject,
      msg: { option: "新建项目" },
    });
}

export function modifyProject(id, params) {
  return (dispatch) =>
    basicAction({
      type: "put",
      data: params,
      dispatch: dispatch,
      actionType: "MODIFY_PROJECT",
      url: ApiTable.updateProject.replace("{id}", id),
      msg: { option: "编辑项目" },
    });
}

export function deleteProject(id) {
  return (dispatch) =>
    basicAction({
      type: "del",
      dispatch: dispatch,
      actionType: "DELETE_PROJECT",
      url: ApiTable.deleteProject.replace("{id}", id),
      msg: { option: "删除项目" },
    });
}

export function bindProjectDevices(params) {
  return (dispatch) =>
    basicAction({
      type: "post",
      data: params,
      dispatch: dispatch,
      actionType: "BIND_PROJECT_DEVICES",
      url: ApiTable.bindProjectDevices,
      msg: { option: "绑定项目设备" },
    });
}

export function unbindProjectDevice(id, deviceCode) {
  return (dispatch) =>
    basicAction({
      type: "del",
      dispatch: dispatch,
      query: { deviceCode },
      actionType: "UNBIND_PROJECT_DEVICE",
      url: ApiTable.unbindProjectDevice.replace("{id}", id),
      msg: { option: "解绑项目设备" },
    });
}

export function getAllProductLibrary() {
  return (dispatch) =>
    basicAction({
      type: "get",
      dispatch: dispatch,
      actionType: "GET_ALL_PRODUCT_LIBRARY",
      url: ApiTable.getAllProductLibrary,
      msg: { option: "获取全部产品" },
    });
}

export function bindRolesProject(params) {
  return (dispatch) =>
    basicAction({
      type: "post",
      data: params,
      dispatch: dispatch,
      actionType: "BIND_ROLES_PROJECT",
      url: ApiTable.bindRolesProject,
      msg: { option: "绑定角色-项目" },
    });
}

export function getProjectRoles(roleId) {
  return (dispatch) =>
    basicAction({
      type: "get",
      dispatch: dispatch,
      actionType: "GET_PROJECT_ROLES",
      url: ApiTable.getProjectRoles.replace("{roleId}", roleId),
      msg: { option: "获取角色项目" },
    });
}

export default {
  getProjects,
  getProject,
  createProject,
  modifyProject,
  deleteProject,
  bindProjectDevices,
  unbindProjectDevice,
  getAllProductLibrary,
  bindRolesProject,
};
