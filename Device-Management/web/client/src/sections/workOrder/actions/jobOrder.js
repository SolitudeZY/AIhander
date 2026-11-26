'use strict';

import { ApiTable, basicAction } from '$utils'

export function getPomsProjectBasicAll () {
   return dispatch => basicAction({
      type: 'get',
      dispatch: dispatch,
      actionType: 'GET_POMS_PROJECT_BASIC_ALL',
      url: `${ApiTable.getPomsProjectBasicAll}?includeDel=true`,
      msg: { error: '获取项目列表失败' },
      reducer: { name: 'pomsProjectBasicAll' }
   });
}


export function getEnabledWorkflowProcess () {
   return dispatch => basicAction({
      type: 'get',
      dispatch: dispatch,
      actionType: 'GET_ENABLED_WORKFLOW_PROCESS',
      url: `${ApiTable.getEnabledWorkflowProcess}`,
      msg: { error: '获取可用表单失败' },
      reducer: { name: 'workflowProcess' }
   });
}
