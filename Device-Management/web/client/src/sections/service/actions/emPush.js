'use strict';

import { ApiTable, basicAction } from '$utils'

export function getPush (query) {       //获取推送配置列表
    return dispatch => basicAction({
        type: 'get',
        dispatch: dispatch,
        query: query,
        actionType: 'GET_PUSH',
        url: `${ApiTable.getPush}`,
        msg: { error: '获取推送配置列表失败' },
        reducer: { name: "getPush", params: { noClear: true } },
    });
}

export function postPush (data) {//添加/编辑成员
    let msg = ''
    if (data) {
        msg = data.msg
    }
    return (dispatch) =>
        basicAction({
            type: "post",
            dispatch: dispatch,
            data,
            actionType: "POST_PUSH",
            url: `${ApiTable.postPush}`,
            msg: { option: msg }, //添加/编辑成员
            reducer: { name: "" },
        });
}
export function getOrganizationUsers () {       //获取全部未删除用户
    return dispatch => basicAction({
        type: 'get',
        dispatch: dispatch,
        actionType: 'GET_ORGANIZATION_USERS',
        url: `${ApiTable.getOrganizationUsers}`,
        msg: { error: '获取全部未删除用户' },
        reducer: { name: 'allPepUsers' }
    });
}

export function getOrganizationUsersIncludeDeleted () {
    return dispatch => basicAction({
        type: 'get',
        dispatch: dispatch,
        query: {
            includeDel: true
        },
        actionType: 'GET_ORGANIZATION_USERS_INCLUDE_DELETED',
        url: `${ApiTable.getOrganizationUsers}`,
        msg: { error: '获取全部用户' },
        reducer: { name: 'allPepUsersIncludeDel' }
    });
}
export function getProjectPoms (query) {//获取已绑定项目
    return (dispatch) => basicAction({
        type: "get",
        dispatch: dispatch,
        actionType: "GET_PROJECT_POMS",
        query: query,
        url: `${ApiTable.getProjectPoms}`,
        msg: { option: "获取已绑定项目" },
        reducer: { name: "ProjectPoms", params: { noClear: true } },
    });
}
export function getProjectStructure (query) {//获取绑定项目下结构物
    return (dispatch) => basicAction({
        type: "get",
        dispatch: dispatch,
        actionType: "GET_PROJECT_STRUCTURE",
        query: query,
        url: `${ApiTable.getProjectStructure}`,
        msg: { option: "获取绑定项目下结构物" },
        reducer: { name: "ProjectStructure", params: { noClear: true } },
    });
}
export function getProjectStatus (query) {//获取项目状态列表
    return (dispatch) => basicAction({
        type: "get",
        dispatch: dispatch,
        actionType: "GET_PROJECT_STATUS",
        query: query,
        url: `${ApiTable.getProjectStatus}`,
        msg: { option: "获取项目状态列表" },
        reducer: { name: "ProjectStatus", params: { noClear: true } },
    });
}
export function putPushPushId (data) {//更改推送配置状态（禁用或删除）
    let pushId = ''
    let msg = ''
    if (data) {
        pushId = data.pushId
        msg = data.msg
    }
    return (dispatch) =>
        basicAction({
            type: "put",
            dispatch: dispatch,
            data,
            actionType: "PUT_PUSH_PUSHID",
            url: `${ApiTable.putPushPushId.replace("{pushId}", pushId)}`,
            msg: { option: msg }, //更改推送配置状态（禁用或删除）
            reducer: {},
        });
}