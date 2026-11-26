'use strict';

import { ApiTable, basicAction } from '$utils'

export function getEquipment(query) {       //获取设备维护记录
    return dispatch => basicAction({
        type: 'get',
        dispatch: dispatch,
        query,
        actionType: 'GET_EQUIPMENT',
        url: `${ApiTable.getEquipment}`,
        msg: { option: '获取设备维护记录' },
        reducer: {
            name: "getEquipment",
            params: { noClear: true }
        }
    });
}

export function editEquipment(query) {       //获取设备维护记录
    let msg = ''
    if (query) {
        msg = query.msg
    }
    return dispatch => basicAction({
        type: 'post',
        dispatch: dispatch,
        data: query,
        actionType: 'EDIT_EQUIPMENT',
        url: `${ApiTable.editEquipment}`,
        msg: { option: msg },

    });
}


export function delEquipment(query) {       //删除设备维护记录
    return dispatch => basicAction({
        type: 'del',
        dispatch: dispatch,
        actionType: 'DEL_EQUIPMENT',
        url: `${ApiTable.delEquipment.replace('{id}', query)}`,
        msg: { option: '删除维护记录' },

    });
}
