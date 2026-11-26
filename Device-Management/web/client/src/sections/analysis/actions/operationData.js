'use strict';

import { ApiTable, basicAction } from '$utils'


export function getFailureTime() {
    return dispatch => basicAction({
        type: 'get',
        dispatch: dispatch,
        actionType: 'GET_FAILURE_TIME',
        url: ApiTable.getFailureTime,
        msg: { error: '获取故障发生时间分析' },
        reducer: { name: 'failureTime' }
    })
}

export function getSystemAvailability() {
    return dispatch => basicAction({
        type: 'get',
        dispatch: dispatch,
        actionType: 'GET_SYSTEM_AVAILABILITY',
        url: ApiTable.getSystemAvailability,
        msg: { error: '获取可用性分析' },
        reducer: { name: 'systemAvailability' }
    })
}


export function getProblemType() {
    return dispatch => basicAction({
        type: 'get',
        dispatch: dispatch,
        actionType: 'GET_PROBLEM_TYPE',
        url: ApiTable.getProblemType,
        msg: { error: '获取故障类型' },
        reducer: { name: 'probleType' }
    })
}


export function getOperationsPersonnel() {
    return dispatch => basicAction({
        type: 'get',
        dispatch: dispatch,
        actionType: 'GET_OPERATIONS_PERSONNEL',
        url: ApiTable.getOperationsPersonnel,
        msg: { error: '获取故障类型' },
        reducer: { name: 'operationsPersonnel' }
    })
}
