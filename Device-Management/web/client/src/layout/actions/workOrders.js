'use strict';

import { ApiTable, basicAction } from '$utils'

export function getWorkOrders () {   //获取工单的待办
   return dispatch => basicAction({
      type: 'get',
      dispatch: dispatch,
      actionType: 'GET_WORK_ORDERS',
      url: `${ApiTable.workOrders}`,
      msg: { option: '获取工单的待办' },
      reducer: { name: 'workOrders' }
   });
}