'use strict';

import { ApiTable, basicAction } from '$utils'

export function getDeviceType(query) {       //获取设备型号
    return dispatch => basicAction({
        type: 'get',
        dispatch: dispatch,
        query,
        actionType: 'GET_DEVICE_TYPE',
        url: `${ApiTable.getDeviceType}`,
        msg: { option: '获取设备型号' },
        reducer: {
            name: "deviceType",
            params: { noClear: true }
        }
    });
}

export function getStruc(query) {       //获取结构物以及设备类型
    return dispatch => basicAction({
        type: 'get',
        dispatch: dispatch,
        query,
        actionType: 'GET_STRUC',
        url: `${ApiTable.getStruc}`,
        msg: { option: '获取结构物以及设备类型' },
        reducer: {
            name: "structAndDeviceType",
            params: { noClear: true }
        }
    });
}

export function getFirmware(query) {       //获取固件包
    return dispatch => basicAction({
        type: 'get',
        dispatch: dispatch,
        query,
        actionType: 'GET_FIRMWARE',
        url: `${ApiTable.getFirmware}`,
        msg: { option: '获取固件包' },
        reducer: {
            name: "firmware",
            params: { noClear: true }
        }
    });
}


export function upgradeFirmware(query,data) {       //增加/覆盖固件包
    return dispatch => basicAction({
        type: 'post',
        dispatch: dispatch,
        query,
        data,
        actionType: 'UPGRADE_FIRMWARE',
        url: `${ApiTable.upgradeFirmware}`,
        msg: { option: '增加/覆盖固件包' },
       
    });
}


export function deleteFirmware(query) {       //删除固件包
    return dispatch => basicAction({
        type: 'delete',
        dispatch: dispatch,
        query,
        actionType: 'DELETE_FIRMWARE',
        url: `${ApiTable.deleteFirmware}`,
        msg: { option: '删除固件包' },
       
    });
}


export function getThingMessages(query) {       //获取固件包信息
    return dispatch => basicAction({
        type: 'get',
        dispatch: dispatch,
        query,
        actionType: 'GET_THING_MESSAGES',
        url: `${ApiTable.getThingMessages}`,
        msg: { option: '获取设备信息' },
       
    });
}

export function distributeConfiguration(query,data) {       //下发配置
    return dispatch => basicAction({
        type: 'post',
        dispatch: dispatch,
        query,
        data,
        actionType: 'DISTRIBUTE_CONNFIGURATION',
        url: `${ApiTable.distributeConfiguration}`,
        msg: { option: '下发配置'},
       
    });
}


