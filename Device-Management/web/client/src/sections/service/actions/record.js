'use strict';

import { ApiTable, basicAction } from '$utils'

export function getRecord (query) {       //获取服务记录
    return dispatch => basicAction({
        type: 'get',
        dispatch: dispatch,
        query: query,
        actionType: 'GET_RECORD',
        url: `${ApiTable.getRecord}`,
        msg: { option: '获取服务记录' },
        reducer: {
            name: "getRecord",
            params: { noClear: true }
        }
    });
}

export function respondRecord () {       //获取服务记录
    return dispatch => basicAction({
        type: 'get',
        dispatch: dispatch,
        actionType: 'GET_RESPOND_RECORD',
        url: `${ApiTable.respondRecord}`,
        msg: { option: '获取响应记录数据' },
    });
}


export function addRecord (query) {  //新增服务记录和编辑
    let msg = ''
    if (query) {
        msg = query.msg
    }
    return dispatch => basicAction({
        type: 'put',
        dispatch: dispatch,
        data: query,
        actionType: 'ADD_RECORD',
        url: `${ApiTable.addRecord}`,
        msg: { option: msg },
        reducer: {
            name: "addRecord",
            params: { noClear: true }
        }
    });
}
export function calculability (query) {//计算系统可用性
    return dispatch => basicAction({
        type: 'get',
        dispatch: dispatch,
        query: query,
        actionType: 'CACLUABILITY',
        url: `${ApiTable.calculability}`,
        msg: { option: '获取系统可用性' },
        reducer: {
            name: "calculability",
            params: { noClear: true }
        }

    });
}
export function delRecord (query) {//删除服务记录
    return dispatch => basicAction({
        type: 'del',
        dispatch: dispatch,
        //query: query,
        actionType: 'DELRECORD',
        url: `${ApiTable.delRecord.replace('{id}', query)}`,
        msg: { option: '删除服务记录' },
    });
}

