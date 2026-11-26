'use strict';

import { ApiTable, basicAction } from '$utils'

export function getClassifiedData() {
    return dispatch => basicAction({
        type: 'get',
        dispatch: dispatch,
        actionType: 'GET_CLASSIFIED_DATE',
        url: ApiTable.getClassifiedData,
        msg: { error: '网卡数量分类' },
        reducer: { name: 'getClassifiedData' }
    })
}

export function getCardList(query) {
    return dispatch => basicAction({
        query:query,
        type: 'get',
        dispatch: dispatch,
        actionType: 'GET_Card_List',
        url: ApiTable.getCardList,
        msg: { error: '网卡数量分类' },
        reducer: { name: 'getCardList' }
    })
}

export function addOrUpdateCard(data) {
    return dispatch => basicAction({
        data,
        type: 'post',
        dispatch: dispatch,
        actionType: 'ADD_ORUPDATE_CARD',
        url: ApiTable.addOrUpdateCard,
        msg: { error: '新增网卡失败' },
        reducer: { name: 'addOrUpdateCard' }
    })
}

export function getStructureList() {
    return dispatch => basicAction({
        type: 'get',
        dispatch: dispatch,
        actionType: 'GET_STRUCTURE_LIST',
        url: ApiTable.getStructureList,
        msg: { error: '结构物列表查询失败' },
        reducer: { name: 'getStructureList' }
    })
}

export function deleteCard(id) {
    return dispatch => basicAction({
        type: 'delete',
        dispatch: dispatch,
        actionType: 'DELETE_CARD',
        url: `${ApiTable.deleteCard.replace('{id}', id)}`,
        msg: { error: '删除网卡失败' },
        reducer: { name: 'deleteCard' }
    })
}




export function findAllCardNumber() {
    return dispatch => basicAction({
        type: 'post',
        dispatch: dispatch,
        actionType: 'FIND_ALL_CARD_NUMBER',
        url: ApiTable.findAllCardNumber,
        msg: { error: '获取所有网卡号' },
    })
}


export function batchImport(data) {
    return dispatch => basicAction({
        type: 'post',
        data,
        dispatch: dispatch,
        actionType: 'BATCH_IMPORT',
        url: ApiTable.batchImport,
        msg: { option: '批量导入' },
    })
}

