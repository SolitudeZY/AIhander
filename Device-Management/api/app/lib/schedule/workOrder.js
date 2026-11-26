
const schedule = require('node-schedule');
const moment = require('moment')
const request = require('superagent');

let isDev = false
// isDev = true

module.exports = function (app, opts, ctx) {
   const workOrder = app.fs.scheduleInit(
      {
         interval: '0 * * * *',//一小时执行一次
         immediate: isDev,
         proRun: !isDev,
      },
      async () => {
         try {
            //前一次执行时间
            console.log('工单数据抽取开始', moment().format('YYYY-MM-DD HH:mm:ss'))
            const username = "admin"
            const password = process.env.CAMUNDA_PASSWORD || "CHANGE_ME"
            let lastExecutionTime = null;
            const { parseProcessData, parseJsonString } = app.fs.utils
            const startTime = moment().format('YYYY-MM-DD HH:mm:ss')
            const { models } = app.fs.dc
            const { clickHouse } = app.fs
            const { database: camWorkflow } = clickHouse.camWorkflow.opts.config
            //新建表是否有数据
            // const rescount=await models.FormDataTable.count()
            if (lastExecutionTime === null) {
               lastExecutionTime = moment().subtract(1, 'hour').format('YYYY-MM-DD HH:mm:ss')
            }
            // ${rescount ?`  WHERE  procin.end_time_  is not null
            // AND procin.end_time_ > '${lastExecutionTime}'
            // AND procin.end_time_ <='${startTime}'`
            const formRes = await clickHouse.pepEmis.query(
               `SELECT 
                     story.id AS historyId,
                     story.procinst_id as procinstId,
                     story.apply_user AS pepUserId,
                     story.form_data AS formData,
                     story.submit_form_data AS submitFormData,
                     story.create_at as createTime,
                     fform.form_schema AS formSchema,
                     fprocess.name AS processName,
                     procin.state_ AS state,
                     procin.end_time_ as endTime,
                     fform.id AS formId,
                     fversion.id AS versionId,
                     fgroup.name AS groupName 
                  FROM 
                     workflow_process_history AS story
                  INNER JOIN workflow_process_version AS fversion
                     ON fversion.id = story.version_id
                  INNER JOIN workflow_process_form AS fform
                     ON fform.id = fversion.form_id
                  INNER JOIN workflow_process AS fprocess
                     ON fprocess.id = fform.process_id
                     AND fprocess.name = '运维中台售后问题处理工单'
                  INNER JOIN workflow_group AS fgroup
                     ON fgroup.id = fprocess.group_id
                  INNER JOIN ${camWorkflow}.act_hi_procinst AS procin
                     ON procin.id_ = story.procinst_id
                     AND procin.state_='COMPLETED'`
            ).toPromise()
            const procinstIds = [...new Set(formRes.map(e => e.procinstId))];
            // 获取流程实例变量
            if (formRes && formRes.length > 0) {
               let procinstsVariables = await request.post(encodeURI(opts.camundarest.host + '/' + opts.camundarest.root + `/engine-rest/history/variable-instance`))
                  .auth(username, password)
                  .set('Content-Type', 'application/json')
                  .send({ processInstanceIdIn: procinstIds })
               if (procinstsVariables.body && procinstsVariables.body.length) {
                  for (let f of formRes) {
                     const parseData = f.formSchema && parseProcessData({
                        formSchema: parseJsonString(f.formSchema),
                        formData: parseJsonString(f.formData)
                     })
                     //判断结果是否已经存在目标表中
                     if (parseData) {
                        if (parseData.pomsProjectId.value) {
                           const isExsit = await models.FormDataTable.findOne({
                              where: {
                                 projectId: parseData ? parseData.pomsProjectId.value : null,
                                 state: f.state || null,
                                 endTime: f.endTime || null,
                                 startTime: f.createTime || null
                              }
                           })
                           // console.log(`${isExsit ? '存在' : '不在'}${parseData.pomsProjectId.value} ${f.state} ${f.endTime} ${f.createTime}`);
                           //如果不存在则插入
                           if (!isExsit) {
                              await models.FormDataTable.create({
                                 projectId: parseData ? parseData.pomsProjectId.value : null,
                                 formname: procinstsVariables.body.find(t => t.name == 'fsEmisBusinessName') ? procinstsVariables.body.find(t => t.name == 'fsEmisBusinessName').value : '',
                                 state: f.state || null,
                                 endTime: f.endTime || null,
                                 startTime: f.createTime || null
                              })
                           }
                        }
                     }
                  }
                  console.log('工单数据抽取结束')
               } else {
                  console.log('未查询到数据')
               }
            } else {
               console.log('未查询到数据')
            }
         } catch (error) {
            console.error('失败原因', error)
         }
      }
   );
   return {
      workOrder,
   }
}