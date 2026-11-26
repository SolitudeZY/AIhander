'use strict';

import { ApiTable, basicAction } from '$utils'

export function getMaintenancePlan(query) {       //获取周期性计划
    let msg = ''
    if (query) {
        msg = query.msg
    }
    return dispatch => basicAction({
        type: 'get',
        dispatch: dispatch,
        query,
        actionType: 'GET_MAINTENANCEPLAN',
        url: `${ApiTable.getMaintenancePlan}`,
        msg: { option: msg },
        reducer: {
            name: "getMaintenancePlan",
            params: { noClear: true }
        }
    });
}

export function delMaintenancePlan(query) {//删除周期性计划
    let msg = ''
    if (query) {
        msg = query.msg
    }
    return dispatch => basicAction({
        type: 'del',
        dispatch: dispatch,
        query: query,
        actionType: 'DEL_MAINTENANCEPLAN',
        url: `${ApiTable.delMaintenancePlan}`,
        msg: { option: msg },
    });


}


export function editMaintenancePlan(query) {//编辑或者添加临时周期周期性计划
    let msg = ''
    if (query) {
        msg = query.msg
    }
    return dispatch => basicAction({
        type: 'post',
        data: query,
        dispatch: dispatch,
        actionType: 'EDIT_MAINTENANCEPLAN',
        url: `${ApiTable.editMaintenancePlan}`,
        msg: { option: msg },
    })
}