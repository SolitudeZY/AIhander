'use strict';

import { ApiTable, basicAction } from '$utils'

export function getOrganizationDeps (query) {//获取项企(PEP)全部部门及其下用户
    return (dispatch) => basicAction({
        type: "get",
        dispatch: dispatch,
        actionType: "GET_ORGANIZATIONDEPS",
        query: query,
        url: `${ApiTable.getOrganizationDeps}`,
        msg: { option: "获取项企(PEP)全部部门及其下用户" },
        reducer: { name: "OrganizationDeps", params: { noClear: true } },
    });
}

export function getOrganizationUser (query) {//获取成员列表
    return (dispatch) => basicAction({
        type: "get",
        dispatch: dispatch,
        actionType: "GET_ORGANIZATIONUSER",
        query: query,
        url: `${ApiTable.getOrganizationUser}`,
        msg: { option: "获取成员列表" },
        reducer: { name: "OrganizationUser", params: { noClear: true } },
    });
}
export function putOrganizationUser (data) {//更新成员状态
    let pomsUserId = ''
    let msg = ''
    if (data) {
        pomsUserId = data.pomsUserId
        msg = data.msg
    }
    return (dispatch) =>
        basicAction({
            type: "put",
            dispatch: dispatch,
            data,
            actionType: "PUT_ORGANIZATIONUSER",
            url: `${ApiTable.putOrganizationUser.replace("{pomsUserId}", pomsUserId)}`,
            msg: { option: msg }, //更新成员状态
            reducer: {},
        });
}

export function postOrganizationUser (data) {//添加/编辑成员
    let msg = ''
    if (data) {
        msg = data.msg
    }
    return (dispatch) =>
        basicAction({
            type: "post",
            dispatch: dispatch,
            data,
            actionType: "POST_ORGANIZATION_USER",
            url: `${ApiTable.postOrganizationUser}`,
            msg: { option: msg }, //添加/编辑成员
            reducer: { name: "" },
        });
}
export function deteleOrganizationAdmin (data) {//删除管理员
    let pomsUserId = ''
    let msg = ''
    if (data) {
        pomsUserId = data.id
        msg = data.msg
    }
    return (dispatch) =>
        basicAction({
            type: "del",
            dispatch: dispatch,
            actionType: "DEL_ORGANIZATION_ADMIN",
            url: `${ApiTable.deteleOrganizationAdmin.replace("{pomsUserId}", pomsUserId)}`,
            msg: { option: msg }, //删除管理员
            reducer: {},
        });
}

export function getResource(userId) {
    return dispatch => basicAction({
        type: 'get',
        dispatch: dispatch,
        actionType: 'GET_RESOURCE',
        url: `${ApiTable.getResource}`,
        msg: { error: '获取权限失败' },
        reducer: { name: 'resource' }
    });
}
export function getUserResource(userId) {
    return dispatch => basicAction({
        type: 'get',
        dispatch: dispatch,
        actionType: 'GET_USER_RESOURCE',
        url: `${ApiTable.getUserResource}?userId=${userId}`,
        msg: { error: '获取用户权限失败' },
        reducer: { name: 'userResource' }
    });
}
export function postUserRes(body) {
    return dispatch => basicAction({
        type: 'post',
        dispatch: dispatch,
        actionType: 'UPDATE_USER_RESOURCE',
        url: `${ApiTable.postUserRes}`,
        data: body,
        msg: { success: '更新用户权限' }
    });
}