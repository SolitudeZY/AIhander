
'use strict';

import { ApiTable, basicAction } from '$utils'

export function getAbnMethods (query) {//获取异常识别算法
    return (dispatch) => basicAction({
        type: "get",
        dispatch: dispatch,
        actionType: "GET_ABN_METHODS",
        query: query,
        url: `${ApiTable.getAbnMethods}`,
        msg: { option: "获取异常识别算法" },
        reducer: { name: "abnMethods", params: { noClear: true } },
    });
}


export function getAbnParamList (query) {//获取异常参数配置
    return (dispatch) => basicAction({
        type: "get",
        dispatch: dispatch,
        actionType: "GET_ABN_PARAM_LIST",
        query: query,
        url: `${ApiTable.getAbnParamList}`,
        msg: { option: "获取异常参数配置" },
        reducer: { name: "abnParam", params: { noClear: true } },
    });
}

export function addAbnParam (data) {//新增异常参数配置
    return (dispatch) => basicAction({
        type: "post",
        dispatch: dispatch,
        actionType: "ADD_ABN_PARAM",
        data,
        url: `${ApiTable.addAbnParamList}`,
        msg: { option: "新增异常参数配置" },
      
    })
}

export function batchCfgAbnParams (ids, enable={}) {//批量启用or禁用
    return (dispatch) => basicAction({
        type: "put",
        dispatch: dispatch,
        actionType: "BATCH_CFG_ABNPARAMS",
        data:enable,
        url: `${ApiTable.batchSwitch.replace("{ids}", ids)}`,
        msg: { option:enable?.use==='switch'?'批量启用异常参数配置':enable?.use==='noSwitch'?'批量禁用异常参数配置': "批量保存异常参数配置" },
      
    })
}

export function deleteAbnParams (id) {//删除配置
    return (dispatch) => basicAction({
        type: "delete",
        dispatch: dispatch,
        actionType: "DELETE_ABN_PARAMS",
        url: `${ApiTable.deleteAbnParams.replace("{id}", id)}`,
        msg: { option: '删除异常参数配置' },
      
    });
}

export function editAbnParams (id, pushData) {//编辑配置
    return (dispatch) => basicAction({
        type: "put",
        data:pushData,
        dispatch: dispatch,
        actionType: "EDIT_ABN_PARAMS",
        url: `${ApiTable.editAbnParams.replace("{id}", id)}`,
        msg: { option: '修改异常参数配置' },
      
    })
}

//中断数据对比
export function getItemAbnResult_int (structId, start, end, pushData) {
    return (dispatch) => basicAction({
        type: "post",
        data:pushData,
        dispatch: dispatch,
        actionType: "GET_ITEM_ABN_RESULT_INT",
        url: `${ApiTable.getAbnTaskResult.replace("{structId}", structId).replace("{start}", start).replace("{end}", end)}`,
        msg: { option: '中断数据对比' },
        reducer: { name: "abnItemState_int", params: { noClear: true } },
    })
}


//异常趋势数据对比
export function getItemAbnResult_tr (structId, start, end, pushData) {//
    return (dispatch) => basicAction({
        type: "post",
        data:pushData,
        dispatch: dispatch,
        actionType: "GET_ITEM_ABN_RESULT_TR",
        url: `${ApiTable.getAbnTaskResult.replace("{structId}", structId).replace("{start}", start).replace("{end}", end)}`,
        msg: { option: '异常趋势数据对比' },
        reducer: { name: "abnItemState_tr", params: { noClear: true } },
    })
}


//毛刺数据对比
export function getItemAbnResult_burr (structId, start, end, pushData) {//
    return (dispatch) => basicAction({
        type: "post",
        data:pushData,
        dispatch: dispatch,
        actionType: "GET_ITEM_ABN_RESULT_BURR",
        url: `${ApiTable.getAbnTaskResult.replace("{structId}", structId).replace("{start}", start).replace("{end}", end)}`,
        msg: { option: '毛刺数据对比' },
        reducer: { name: "abnItemState_burr", params: { noClear: true } },
    })
}
