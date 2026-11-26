'use strict';
// const moment = require('moment');
// const CamundaApi = require('../../utils/camunda-api');

//运维相关的待办事项
async function getUnfinished (ctx) {
   const { models } = ctx.fs.dc
   const { clickHouse } = ctx.app.fs
   const userInfo = ctx.fs.api.userInfo;
   // const { camundaUserId } =ctx.fs.api 
   const assignee='fsUser'+userInfo.pepUserId
   const BeforeAssignUser='fsBeforeAssignUser'+userInfo.pepUserId
   const AfterAssignUser='fsAfterAssignUser'+userInfo.pepUserId
   // and pro.business_key_ in ('831')
   // and pro.business_key_ in ('840','834','831') 测试环境的对应的business_key_(运维中台技术申请工单),(运维中台售后问题处理工单),(运维中台工单)
   //                           and pro.business_key_ in ('865','903') 商用工单的id

   try{  
      let all=await clickHouse.camWorkflow.query(`
      select distinct * from(
         select * from (
                           select distinct RES.*
                           from act_hi_taskinst RES,act_hi_procinst pro
                           WHERE  RES.end_time_ is null
                             and RES.assignee_ = '${assignee}'
                           and pro.proc_inst_id_=RES.proc_inst_id_
                           and pro.business_key_ in ('865','903')
                           ) RES
         union all
         select * from (
                           select distinct RES.*
                           from act_hi_taskinst RES, act_hi_varinst VAR,act_hi_procinst pro
                           WHERE  RES.end_time_ is null
                             and VAR.name_ in ('${AfterAssignUser}', '${BeforeAssignUser}')
                             and VAR.task_id_ = RES.id_
                             and pro.proc_inst_id_=RES.proc_inst_id_
                             and pro.business_key_ in ('865','903')
                             and (( VAR.var_type_ is not null and VAR.var_type_ = 'string' and VAR.text_ is not null and VAR.text_ = 'pending' ))
                           ) RES ) as res,act_hi_varinst t

where          
 t.proc_inst_id_=res.proc_inst_id_
and t.name_='backout'
and t.task_id_ is null
and t.var_type_ is not null
and t.var_type_='boolean'
and t.long_ is not null
and t.long_=0

`).toPromise()
const procinstIds = [...new Set(all.map(e => e.proc_inst_id_))];
     // 获取流程实例变量 
     if(all && all.length > 0){
      let procinstsVariables = await ctx.app.camunda.request.post(encodeURI(`/engine-rest/history/variable-instance`), {
         processInstanceIdIn: procinstIds
     })
     let data = { list: all, procinstsVariables: procinstsVariables, keywords: null, userInfo: userInfo, userId: userInfo.pepUserId };
     ctx.body = { count: countFilters(data) }
     }else {
      ctx.body = { count: 0 };
  }
  ctx.status = 200
   }catch(error){
      ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
      ctx.status = 400;
      ctx.body = {
         message: typeof error == 'string' ? error : undefined
      }
   }
}

function countFilters(data) {
   let totalCount = 0;
   // let searchKeywords = data.keywords ? data.keywords.toLowerCase() : null;
   let keywordsFlag = false;
   data.list.map(e => {
       let curVariables = data.procinstsVariables.body && data.procinstsVariables.body.filter(item => item.processInstanceId === e.processInstanceId);
       keywordsFlag = false;
       const isAssignee = e.assignee === `fsUser${data.userId}`;
       if (isAssignee) {
           //当前节点任务的办理人是自己才会过滤是否有前后加签
           const fsAfterAssignUnNum = curVariables.find(v => (v.name == 'fsAfterAssignUnNum' && e.id == v.taskId)) ? true : false;
           const fsBeforeAssignUnNum = curVariables.find(v => (v.name == 'fsBeforeAssignUnNum' && e.id == v.taskId)) ? curVariables.find(v => (v.name == 'fsBeforeAssignUnNum' && e.id == v.taskId)) : false;
           //需要过滤一下前后加签,如果是当前用户的任务但是操作过前后加签不显示代办任务里
           if (fsBeforeAssignUnNum) {
               //存在前加签判断是否前加签的人员已经处理完了
               if (fsBeforeAssignUnNum.value === 0) { keywordsFlag = true; };
           } else {
               //判断是否存在后加签，有后加签就不显示当前用户的待办任务
               if (!fsAfterAssignUnNum) { keywordsFlag = true; }
           }
       } else {
           keywordsFlag = true;
       }
       if (keywordsFlag) {
           //暂未用到关键词传参
           // if (searchKeywords) {
           //     const fsFormItemName = curVariables.find(t => t.name == 'fsFormItemName') ? curVariables.find(t => t.name == 'fsFormItemName').value : '';
           //     const fsEmisApplyUserName = curVariables.find(t => t.name == 'fsEmisApplyUserName') ? curVariables.find(t => t.name == 'fsEmisApplyUserName').value : '';
           //     if (!((fsFormItemName && fsFormItemName.toLowerCase().includes(searchKeywords)) || (fsEmisApplyUserName.includes(searchKeywords))
           //     )) {
           //         totalCount++;
           //     }
           // } else {
           totalCount++;
           // }
       }
   });
   return totalCount;
}

module.exports = {
   getUnfinished
};