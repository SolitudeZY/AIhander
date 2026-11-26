import { ApiTable, basicAction } from '$utils'

export function getServerInfoMaintenanceRecord(query) {       //获取服务器维护记录
    return dispatch => basicAction({
        type: 'get',
        dispatch: dispatch,
        query: query,
        actionType: 'GET_SERVER_INFO_MAINTENANCE_RECORD',
        url: `${ApiTable.getServerInfoMaintenanceRecord}`,
        msg: { option: '获取服务器维护记录' },
        reducer: {
            name: "getServerInfoMaintenanceRecord",
            params: { noClear: true }
        }
    });
}


export function editServerInfoMaintenanceRecord(data) {//添加/编辑服务器信息维护记录
    let msg = ''
    if (data) {
        msg = data.msg
    }
    return (dispatch) =>
        basicAction({
            type: "post",
            dispatch: dispatch,
            data,
            actionType: "POST_SERVER_INFO_MAINTENANCE_RECORD",
            url: `${ApiTable.editServerInfoMaintenanceRecord}`,
            msg: { option: msg },//添加/编辑服务器信息维护记录
        });
}

export function delServerInfoMaintenanceRecord(id) {//删除服务器信息维护记录
    return (dispatch) =>
        basicAction({
            type: "del",
            dispatch: dispatch,
            actionType: "DEL_SERVER_INFO_MAINTENANCE_RECORD",
            url: `${ApiTable.delServerInfoMaintenanceRecord.replace('{id}', id)}`,
            msg: { option: '删除服务器信息维护记录' },
        });
}

