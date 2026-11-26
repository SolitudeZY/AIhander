import { ApiTable, basicAction } from "$utils";

// 获取组织列表
export function getOrganizations() {
  return (dispatch) =>
    basicAction({
      type: "get",
      dispatch,
      actionType: "GET_ORGANIZATIONS",
      url: ApiTable.getOrganizations,
      msg: {
        error: "获取组织信息失败",
      },
      reducer: {
        name: "organizations",
      },
    });
}

// 获取组织详情
export function getOrganization(orgId, user) {
  return (dispatch) =>
    basicAction({
      type: "get",
      dispatch,
      actionType: "GET_ORGANIZATION",
      url: ApiTable.getOrganization.replace("{id}", orgId),
      msg: {
        error: "获取组织详情失败",
      },
      reducer: {
        name: "authorData", // 使用authorData作为reducer名称以保持兼容性
        params: {
          noClear: true,
        },
      },
      callback: (res) => {
        // 返回组织详情对象，数据格式：{ id, name, departments, users }
        return res;
      },
    });
}

// 获取组织下的用户列表（保持向后兼容性）
// 保持向后兼容性的函数，内部调用getOrganization
export function getAuthorList(orgId) {
  return getOrganization(orgId);
}

export function getAuthors() {
  return (dispatch) =>
    basicAction({
      type: "get",
      dispatch,
      actionType: "GET_AUTHORLIST",
      url: ApiTable.getResources,
      msg: {
        error: "获取权限信息失败",
      },
      reducer: {
        name: "authors",
      },
    });
}

export function getAuthorByRole(roleId) {
  return (dispatch) =>
    basicAction({
      type: "get",
      dispatch,
      actionType: "GET_AUTHOR_BY_ROLEID",
      url: ApiTable.getResourceRoles.replace("{id}", roleId),
      msg: {
        error: "获取权限信息失败",
      },
      reducer: {
        name: "roleAuthor",
      },
    });
}

export function getRoles(params) {
  return (dispatch) =>
    basicAction({
      type: "get",
      dispatch,
      query: params,
      actionType: "GET_ROLES",
      url: ApiTable.getRolesList,
      msg: {
        error: "获取角色列表失败",
      },
      reducer: {
        name: "roles",
        params: {
          noClear: true,
        },
      },
    });
}

export function getPosts() {
  return (dispatch) =>
    basicAction({
      type: "get",
      dispatch,
      actionType: "GET_POSTS",
      url: ApiTable.getPostsUrl,
      msg: {
        error: "获取职位信息失败",
      },
      reducer: {
        name: "posts",
      },
    });
}

export function getRoleStructList(organizationId, params = {}) {
  return (dispatch) =>
    basicAction({
      type: "get",
      dispatch,
      query: params,
      actionType: "GET_ROLE_STRUCT_LIST",
      url: ApiTable.getStructsListWithoutIOTA.replace(
        "{organizationId}",
        organizationId
      ),
      msg: {
        error: "获取结构物列表失败",
      },
      reducer: {
        name: "roleStructList",
      },
    });
}

export default {
  getOrganizations,
  getOrganization,
  getAuthorList,
  getAuthors,
  getAuthorByRole,
  getRoles,
  getPosts,
  getRoleStructList,
};
