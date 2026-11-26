'use strict';

import { ApiTable, basicAction } from '$utils'

export function getMapData () {
   return dispatch => basicAction({
      type: 'get',
      dispatch: dispatch,
      actionType: 'GET_MAP_DATA',
      url: ApiTable.getMapData,
      msg: { error: '获取地图数据失败' },
      reducer: { name: 'mapData' }
   });
}

export function getEchartsData (query) {
   return dispatch => basicAction({
      type: 'get',
      query,
      dispatch: dispatch,
      actionType: 'GET_ECHARTS_DATA',
      url: ApiTable.getEchartsData,
      msg: { error: '获取周期性数据失败' },
      reducer: { name: 'EchartsData' }
   });
}
