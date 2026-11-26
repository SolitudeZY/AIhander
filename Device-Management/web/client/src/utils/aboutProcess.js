'use strict';

export const processState = {
   wait: 'WAIT',  //保存待发
   active: 'ACTIVE',  // 正在运行中
   suspended: 'SUSPENDED', // 流程暂停
   completed: 'COMPLETED', //流程正常结束
   externally: 'EXTERNALLY_TERMINATED', // 手动结束流程 
   internally: 'INTERNALLY_TERMINATED'  //流程异常结束
}

export const judgmentProcessState = (record, activeKey) => {
   let content = '';
   const { state, status } = record
   const state_ = state || status
   switch (state_) {
      case processState.wait:
         content = '草稿'
         break;
      case processState.active:
         content = '待审批'
         break;
      case processState.completed:
         content = '审批通过';
         break;
      case processState.externally:
         content = '审批驳回';
         break;
      case processState.suspended:
         content = '撤销';
         break;
      case processState.internally:
         content = '异常流程';
         break;
      default:
         break;
   }
   if (state_ == processState.active && record.reviewTime != '') {
      content = '审批中'
   }
   if (activeKey == 'review' && record.reviewTime == '') {
      content = '待审批'
   }
   if (activeKey == 'review' && record.reviewTime != '') {
      content = '审批中'
   }
   return content
}