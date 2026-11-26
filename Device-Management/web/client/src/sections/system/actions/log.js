import { ApiTable, basicAction } from "$utils";

export function getSystemLog(params) {
  return (dispatch) =>
    basicAction({
      type: "get",
      dispatch: dispatch,
      actionType: "GET_SYSTEM_LOG",
      url: ApiTable.getSystemLog,
      query: params,
      msg: {
        error: "获取系统日志失败",
      },
      reducer: {
        name: "sysLogs",
      },
    });
}

export function createSystemLog(params) {
  return (dispatch) =>
    basicAction({
      type: "post",
      dispatch: dispatch,
      actionType: "CREATE_SYSTEM_LOG",
      url: ApiTable.createSystemLog,
      data: params,
      msg: {
        error: "创建系统日志失败",
      },
    });
}

export default {
  getSystemLog,
  createSystemLog,
};
