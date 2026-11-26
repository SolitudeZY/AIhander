'use strict';

import { ApiTable, basicAction } from '$utils'


export function getMaintenceRecordRank(query) {
    return dispatch => basicAction({
        type: 'get',
        dispatch: dispatch,
        query: query,
        actionType: 'GET_MAINTENCE_RECORD_RANK',
        url: ApiTable.getMaintenceRecordRank,
        msg: { option: '获取维修记录排名' },
        reducer: { name: 'maintenceRecordRank' }
    })
}


export function getMaintenceTotal(query) {
    return dispatch => basicAction({
        type: 'get',
        dispatch: dispatch,
        query: query,
        actionType: 'GET_MAINTENCE_TOTAL',
        url: ApiTable.getMaintenceTotal,
        msg: { option: '获取维修次数统计' },
        reducer: { name: 'maintenceTotal' }
    })
}

export function getEquipmentCategory(query) {
    return dispatch => basicAction({
        type: 'get',
        dispatch: dispatch,
        query: query,
        actionType: 'GET_EQUIPMENT_CATEGORY',
        url: ApiTable.getEquipmentCategory,
        msg: { option: '获取设备类型' },
        reducer: { name: 'equipmentCategory' }
    })
}

export function getStatus(query) {
    return dispatch => basicAction({
        type: 'get',
        dispatch: dispatch,
        query: query,
        actionType: 'GET_STATUS',
        url: ApiTable.getMaintenanceStatus,
        msg: { option: '获取维修状态数据' },
        reducer: { name: 'maintenanceStatus' }
    })
}