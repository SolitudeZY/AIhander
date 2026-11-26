'use strict';

import { ApiTable, basicAction } from '$utils'

export function postProductLibrary(data) { // 新增产品
    return dispatch => basicAction({
        type: 'post',
        dispatch,
        data,
        actionType: 'POST_PRODUCT_LIBRARY',
        url: `${ApiTable.productLibrary}`,
        msg: { option: '新增产品' },
    });
}

export function delProductLibrary(id) { // 删除产品
    return dispatch => basicAction({
        type: 'delete',
        dispatch,
        actionType: 'DEL_PRODUCT_LIBRARY',
        url: `${ApiTable.delProductLibrary.replace('{id}', id)}`,
        msg: { option: '删除产品' },
    });
}

export function putProductLibrary(id, data) { // 修改产品
    return dispatch => basicAction({
        type: 'put',
        dispatch,
        data,
        actionType: 'PUT_PRODUCT_LIBRARY',
        url: `${ApiTable.putDelProductLibrary.replace('{id}', id)}`,
        msg: { option: '修改产品' },
    });
}

export function getProductLibrary(query) { // 获取产品
    return dispatch => basicAction({
        type: 'get',
        dispatch,
        query,
        actionType: 'GET_PRODUCT_LIBRARY',
        url: `${ApiTable.productLibrary}`,
        msg: { option: '获取产品' },
        reducer: {
            name: "productLibrary",
            params: { noClear: true }
        }
    });
}


export function getSensors(data) { // 获取传感器
    return dispatch => basicAction({
        type: 'post',
        dispatch,
        data,
        actionType: 'GET_SENSORS',
        url: `${ApiTable.getSensor}`,
        msg: { error: '获取传感器失败' },
        reducer: {
            name: "sensorList",
            params: { noClear: true }
        }
    });
}

export function addOrEditSensor(data) { // 编辑或者新增传感器
    return dispatch => basicAction({
        type: 'post',
        dispatch,
        data,
        actionType: 'ADD_OR_EDIT_SENSOR',
        url: `${ApiTable.addOrEditSensor}`,
        msg: { option: data?.id?'编辑传感器':'新增传感器' },
    });
}

export function delSensor(data) { //删除传感器
    return dispatch => basicAction({
        type: 'post',
        dispatch,
        data,
        actionType: 'DEL_SENSOR',
        url: `${ApiTable.delSensor}`,
        msg: { option: '删除传感器' },
    });
}

export function getSensorTypes(data) { // 获取传感器类型
    return dispatch => basicAction({
        type: 'get',
        dispatch,
        data,
        actionType: 'GET_SENSOR_TYPES',
        url: `${ApiTable.getSensorTypes}`,
        msg: { option: '获取传感器类型' },
    });
}

export function getFormulaParamNames(query) {
    return dispatch => basicAction({
        type: 'get',
        dispatch,
        query,
        actionType: 'GET_FORMULA_PARAM_NAMES',
        url: `${ApiTable.getFormulaParamNames}`,
        msg: { option: '获取公式计算参数名' },
    });
}
