'use strict';

import { ApiTable, basicAction } from '$utils'

export function editCert (data) {
    return (dispatch) =>
        basicAction({
            type: "post",
            dispatch: dispatch,
            data,
            actionType: "EDIT_CERT",
            url: `${ApiTable.cert}`,
            msg: { option: `${data?.id ? '编辑' : '添加'}证书信息` },
        });
}

export function getCert (query) {
    return (dispatch) =>
        basicAction({
            type: "get",
            dispatch: dispatch,
            query,
            actionType: "GET_PUSH",
            url: `${ApiTable.cert}`,
            msg: { error: "获取证书信息列表" },
            reducer: { name: "certList" },
        });
}

export function delCert (query) {
    return (dispatch) =>
        basicAction({
            type: "del",
            dispatch: dispatch,
            query,
            actionType: "DEL_CERT",
            url: `${ApiTable.cert}`,
            msg: { option: "删除证书信息" },
        });
}

export function editCertNotice (data) {
    return (dispatch) =>
        basicAction({
            type: "post",
            dispatch: dispatch,
            data,
            actionType: "EDIT_CERT_NOTICE",
            url: `${ApiTable.certNotice}`,
            msg: { option: `${data?.id ? '编辑' : '添加'}证书提醒配置` },
        });
}


export function getCertNotice (query) {
    return (dispatch) =>
        basicAction({
            type: "get",
            dispatch: dispatch,
            query,
            actionType: "GET_CERT_NOTICE",
            url: `${ApiTable.certNotice}`,
            msg: { error: "获取证书提醒配置列表" },
            reducer: { name: "certNoticeList" },
        });
}

export function delCertNotice (query) {
    return (dispatch) =>
        basicAction({
            type: "del",
            dispatch: dispatch,
            query,
            actionType: "DEL_CERT_NOTICE",
            url: `${ApiTable.certNotice}`,
            msg: { option: "删除证书提醒配置" },
        });
}