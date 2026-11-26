'use strict';

import { ApiTable, basicAction } from '$utils'

export function getContinuityType () {
   return dispatch => basicAction({
      type: 'get',
      dispatch: dispatch,
      actionType: 'GET_DATA_CONTINUITY_TYPE',
      url: `${ApiTable.getDataContinuityType}`,
      msg: { error: '获取数据类型失败' },
      reducer: { name: 'dataContinuityType' }
   });
}

export function getContinuityList (query) {
   return dispatch => basicAction({
      type: 'get',
      query: query,
      dispatch: dispatch,
      actionType: 'GET_DATA_CONTINUITY',
      url: `${ApiTable.getDataContinuity}`,
      msg: { error: '获取数据列表失败' },
      reducer: { name: 'dataContinuity' }
   });
}

export function getContinuityDetail (continuityId) {
   return dispatch => basicAction({
      type: 'get',
      dispatch: dispatch,
      actionType: 'GET_DATA_CONTINUITY_DETAIL',
      url: `${ApiTable.getDataContinuityDetail.replace('{continuityId}', continuityId)}`,
      msg: { error: '获取数据详情失败' },
   });
}