
import { ApiTable, basicAction } from '$utils'

export function getProjectAllStructures (query) {//获取对应项目下所有结构物
    return (dispatch) => basicAction({
       type: "get",
       dispatch: dispatch,
       actionType: "GET_PROJECT_ALL_STRUCTURES",
       query: query,
       url: `${ApiTable.getProjectAllStructures}`,
       msg: { option: "获取对应项目下的所有结构物" },
       reducer: { name: "ProjectAllStructures", params: { noClear: true } },
    });
 }


 export function getFactors (query) {//获取对应结构物下的监测因素
    return (dispatch) => basicAction({
       type: "get",
       dispatch: dispatch,
       actionType: "GET_FACTORS",
       query: query,
       url: `${ApiTable.getFactors}`,
       msg: { option: "获取对应结构物下的监测因素" },
       reducer: { name: "Factors", params: { noClear: true } },
    });
 }

 export function getSensors (query) {//获取对应监测因素下的设备
    return (dispatch) => basicAction({
       type: "get",
       dispatch: dispatch,
       actionType: "GET_SENSORS",
       query: query,
       url: `${ApiTable.getSensors}`,
       msg: { option: "获取对应监测因素下的设备" },
       reducer: { name: "Sensors", params: { noClear: true } },
    });
 }

 export function getMonitorDataServer (query) {//获取对应监测因素下的设备的数据（最终的数据）
   return (dispatch) => basicAction({
      type: "get",
      dispatch: dispatch,
      actionType: "GET_MONITOR_DATA",
      query: query,
      url: `${ApiTable.getMonitorDataServer}`,
      msg: { option: "获取对应监测因素下的设备的数据（最终的数据）" },
      reducer: { name: "SensorsData", params: { noClear: true } },
   });
}


export function getVibRaws (data) {//
   return (dispatch) => basicAction({
      type: "post",
      data,
      dispatch: dispatch,
      actionType: "GET_VIB_RAWS",
      url: `${ApiTable.getVibRaws}`,
      msg: { error: "获取振动数据失败" },
   });
}




export function getVibFfts (data) {//
   return (dispatch) => basicAction({
      type: "post",
      data,
      dispatch: dispatch,
      actionType: "GET_VIB_FFTS",
      url: `${ApiTable.getVibFfts}`,
      msg: { error: "获取频谱数据失败" },
   });
}

export function getMonitorData (query) {
   return (dispatch) => basicAction({
      type: "get",
      dispatch: dispatch,
      actionType: "GET_MONITOR_DATA_DETIAL",
      query: query,
      url: `${ApiTable.getMonitorData}`,
      msg: { option: "获取对应监测因素下的设备的数据（最终的数据）" },
      reducer: { name: "SensorsDataDetial", params: { noClear: true } },
   });
}
