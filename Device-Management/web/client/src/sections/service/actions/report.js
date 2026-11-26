'use strict';

import { ApiTable, basicAction } from '$utils'

export function getReportFile (query = {}) {       //获取报表文件
    return dispatch => basicAction({
        type: 'get',
        dispatch: dispatch,
        query: query,
        actionType: 'GET_REPORT_FILE',
        url: `${ApiTable.reportFile}`,
        msg: { option: '获取报表文件信息' },
        reducer: {
            name: "reportFile",
            params: { noClear: true }
        }
    });
}

export function postReportFile (data = {}) {       //上传文件
    return dispatch => basicAction({
        type: 'post',
        data,
        dispatch: dispatch,
        actionType: 'POST_REPORT_FILE',
        url: `${ApiTable.reportFile}`,
        msg: { option: '上传文件' },
    });
}


export function delReportFile (id) {//删除报表文件
    return dispatch => basicAction({
        type: 'del',
        dispatch: dispatch,
        actionType: 'DEL_REPORT_FILE',
        url: `${ApiTable.delReportFile.replace('{id}', id)}`,
        msg: { option: '删除报表文件' },


    });
}


export function getFactorList (query = {}) {       //获取报表文件
    return dispatch => basicAction({
        type: 'get',
        dispatch: dispatch,
        query: query,
        actionType: 'GET_FACTOR_LIST',
        url: `${ApiTable.factorList}`,
        msg: { error: '获取监测因素信息失败' },
        reducer: {
            name: "",
            params: { noClear: true }
        }
    });
}

export function postAutomaticReport (data = {}) {
    return dispatch => basicAction({
        type: 'post',
        data,
        dispatch: dispatch,
        actionType: 'POST_AUTOMATIC_REPORT',
        url: `${ApiTable.automaticReport}`,
        msg: { option: data?.id ? '编辑报表生成规则' : "新增报表生成规则" },
    });
}


export function getAutomaticReport (query = {}) {       //获取报表文件
    return dispatch => basicAction({
        type: 'get',
        dispatch: dispatch,
        query: query,
        actionType: 'GET_AUTOMATIC_REPORT',
        url: `${ApiTable.automaticReport}`,
        msg: { error: '获取报表生成规则' },
        reducer: {
            name: "automaticReport",
            params: { noClear: true }
        }
    });
}


export function delAutomaticReport (id) {//删除报表文件
    return dispatch => basicAction({
        type: 'del',
        dispatch: dispatch,
        actionType: 'DEL_AUTOMATIC_REPORT',
        url: `${ApiTable.delAutomaticReport.replace('{id}', id)}`,
        msg: { option: '删除报表规则' },
    });
}

export function postGenerateReport (data = {}) {       //生成报表
    return dispatch => basicAction({
        type: 'post',
        data,
        dispatch: dispatch,
        actionType: 'POST_GENERATE_REPORT',
        url: `${ApiTable.generateReport}`,
        // msg: { option: "生成报表" },
        timeout: 1000 * 60 * 12,
        reducer: {
            name: "generateReport",
            params: { noClear: true }
        }
    });
}





