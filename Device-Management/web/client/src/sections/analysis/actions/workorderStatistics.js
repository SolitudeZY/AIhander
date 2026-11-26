'use strict';

import { ApiTable, basicAction } from '$utils'


export function getWorkOrdersCount(query) {
    console.log(query,'query')
    return dispatch => basicAction({
        type: 'post',
        query:{
            startTime:query?.startTime,
            endTime:query?.endTime,
            orderType:query?.orderType,
        },
        data:{
            projectNames:query?.projectName,
        },
        dispatch: dispatch,
        actionType: 'GET_WORK_ORDERS_COUNT',
        url: ApiTable.getWorkOrdersCount,
        msg: { error: '统计工单数' },
        reducer: { name: 'workOrdersCount' }
    })
}

export function getWorkOrdersCountByProject(query) {
    return dispatch => basicAction({
        type: 'post',
        query:{
            orderType:query?.orderType,
            startTime:query?.startTime,
            endTime:query?.endTime,
        },
        data:{
            projectNames:query?.projectName,
        },
        dispatch: dispatch,
        actionType: 'GET_WORK_ORDERS_COUNT_BY_PROJECT',
        url: ApiTable.getWorkOrdersCountByProject,
        msg: { error: '按项目统计工单数' },
        reducer: { name: 'workOrdersCountByProject' }
    })
}

export function getWorkOrdersElapseDeviationByProject(query) {
    return dispatch => basicAction({
        type: 'post',
        query:{
            startTime:query?.startTime,
            endTime:query?.endTime,
            orderType:query?.orderType,
        },
        data:{
            projectNames:query?.projectName,
        },
        dispatch: dispatch,
        actionType: 'GET_WORK_ORDERS_ELAPSE_DEVIATION_BY_PROJECT',
        url: ApiTable.getWorkOrdersElapseDeviationByProject,
        msg: { error: '按项目统计工单耗时偏差' },
        reducer: { name: 'workOrdersElapseDeviationByProject' }
    })
}

export function getWorkOrdersUnresolved(query) {
    return dispatch => basicAction({
        type: 'post',
        query:{
            startTime:query?.startTime,
            endTime:query?.endTime,
            orderType:query?.orderType,
        },
        data:{
            projectNames:query?.projectName,
        },
        dispatch: dispatch,
        actionType: 'GET_WORK_ORDERS_UNRESOLVED',
        url: ApiTable.getWorkOrdersUnresolved,
        msg: { error: '获取未解决工单' },
        reducer: { name: 'workOrdersUnresolved' }
    })
}

export function postWorkOrdersResolved(data) {
    return dispatch => basicAction({
        type: 'post',
        data,
        dispatch: dispatch,
        actionType: 'POST_WORK_ORDERS_RESOLVED',
        url: ApiTable.workOrdersResolved,
        msg: { error: '标记工单已解决' }
    })
}

export function getWorkOrdersOvertime(query) {
    return dispatch => basicAction({
        type: 'post',
        query:{
            startTime:query?.startTime,
            endTime:query?.endTime,
            orderType:query?.orderType,
        },
        data:{
            projectNames:query?.projectName,
        },
        dispatch: dispatch,
        actionType: 'GET_WORK_ORDERS_OVERTIME',
        url: ApiTable.getWorkOrdersOvertime,
        msg: { error: '获取超时工单' },
        reducer: { name: 'workOrdersOvertime' }
    })
}

// export function getWorkOrdersDetails(query) {
//     return dispatch => basicAction({
//         type: 'get',
//         query,
//         dispatch: dispatch,
//         actionType: 'GET_WORK_ORDERS_DETAILS',
//         url: ApiTable.getWorkOrdersDetails,
//         msg: { error: '获取工单详情' },
//         reducer: { name: 'workOrdersDetails' }
//     })
// }

export function getWorkOrdersElapseByProject(query) {
    return dispatch => basicAction({
        type: 'post',
        query:{
            startTime:query?.startTime,
            endTime:query?.endTime,
            orderType:query?.orderType,
        },
        data:{
            projectNames:query?.projectName,
        },
        dispatch: dispatch,
        actionType: 'GET_WORK_ORDERS_ELAPSE_BY_PROJECT',
        url: ApiTable.getWorkOrdersElapseByProject,
        msg: { error: '按项目统计工单耗时' },
        reducer: { name: 'workOrdersElapseByProject' }
    })
}