'use strict';

import { ApiTable, basicAction } from '$utils'

export function getcode () {
    return dispatch => basicAction({
        type: 'get',
        dispatch: dispatch,
        actionType: 'GET_CODE',
        url: ApiTable.getcode,
        msg: { error: '获取验证码失败' },
    });
}


export function loginDz (data) {
    return dispatch => basicAction({
        type: 'post',
        data,
        dispatch: dispatch,
        actionType: 'LOGIN_DZ',
        url: ApiTable.loginDz,
        msg: { error: '登录地大平台失败' },
    });
}


export function findAllRecord (data) {
    return dispatch => basicAction({
        type: 'post',
        data,
        dispatch: dispatch,
        actionType: 'FIND_ALL_RECORD',
        url: ApiTable.findAllRecord,
        msg: { error: '获取数据失败' },
    });
}

export function delRecord (data) {
    return dispatch => basicAction({
        type: 'post',
        data,
        dispatch: dispatch,
        actionType: 'DEL_RECORD',
        url: ApiTable.delTemperatureRecord,
        msg: { option: '删除数据' },
    });
}

