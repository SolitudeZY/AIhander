/**
 * 运维中台售后问题处理工单，根据计划修复时间（pa3aGiey3N），发送企业微信通知，因为不是必填项，没有填写的不推送！！！！
 *1.已完成的工单
 * 根据表单数据中的是否已完成字段（Solution_Status）判断，该单子是否推送通知，
 * 已完成的不推送，未完成的推送通知
 * 推送给处理人（Processing_Personnel）
 * 2.未完成的工单
 * 
 */

const schedule = require('node-schedule')
const moment = require('moment')
const request = require('superagent')
let isDev = false
// isDev = true
const sendType = {
   'mini': 'miniprogram_notice',
}
module.exports = function (app, opts) {
   const workOrderNotice = app.fs.scheduleInit(
      {
         interval: '0 * * * *',//一小时执行一次
         immediate: isDev,
         proRun: !isDev,
      },
      async () => {
         try {
            //前一次执行时间
            const phone = opts.phone//运维部门审批工单的负责人的电话号码
            console.log('运维中台售后问题处理工单数据抽取开始', moment().format('YYYY-MM-DD HH:mm:ss'))
            const { parseProcessData, parseJsonString, getUserId, sendWechat } = app.fs.utils
            const startTime = moment().format('YYYY-MM-DD HH:mm:ss')
            const { models } = app.fs.dc
            const { clickHouse } = app.fs
            const { database: camWorkflow } = clickHouse.camWorkflow.opts.config
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
                     AND fform.form_schema IS NOT NULL
                  INNER JOIN workflow_process AS fprocess
                     ON fprocess.id = fform.process_id
                     AND fprocess.name = '运维中台售后问题处理工单'
                  INNER JOIN workflow_group AS fgroup
                     ON fgroup.id = fprocess.group_id
                  INNER JOIN ${camWorkflow}.act_hi_procinst AS procin
                     ON procin.id_ = story.procinst_id
                     AND procin.state_ in ('COMPLETED','ACTIVE')
                     WHERE story.apply_user in ('731')
                    `
            ).toPromise()
            // console.log('查询结果', formRes)
            if (formRes && formRes.length > 0) {
               for (let f of formRes) {
                  let user = {}
                  const parseData = f.formSchema && parseProcessData({
                     formSchema: parseJsonString(f.formSchema),
                     formData: parseJsonString(f.formData)
                  })
                  const rlst = await models.WorkOrderNotice.findOne({
                     where: {
                        procinstId: f.procinstId,
                     }
                  })
                  //没有计划完成时间,没有处理人，都不推送通知
                  if (parseData.processing_personnel.value && parseData.planTime.value) {
                     user = await clickHouse.pepEmis.query(`select * from user where id=${Number(parseData.processing_personnel.value)}`).toPromise()
                     if (!rlst) {
                        await models.WorkOrderNotice.create({
                           procinstId: f.procinstId,
                           planTime: parseData.planTime.value,
                           processingPersonnelId: parseData.processing_personnel.value,
                           processingPersonnelPhone: user && user.length && user[0].phone,
                           isSend: false,
                           haveDone: parseData.solution_status.value ? (parseData.solution_status.value === '否' ? false : true) : false,
                           createTime: moment(f.createTime).format('YYYY-MM-DD HH:mm:ss'),
                        })
                     }
                  } else {
                     console.log('没有对应的处理人，没有计划完成时间', f.procinstId)
                  }

               }


            } else {
               console.log('未查询到数据')
            }
            //数据全部插入完成之后(筛选数据进行发送企业微信通知)
            // 获取当前时间  
            // 计算当前时间之后一天的日期  
            const lastDay = moment().add(1, 'days')
            //需要发送提醒的数据
            const sendRslt = await models.WorkOrderNotice.findAll({
               where: {
                  isSend: false,//未发送
                  haveDone: false,//未完成

                  planTime: {
                     $between: [moment().format('YYYY-MM-DD HH:mm:ss'), moment(lastDay).format('YYYY-MM-DD HH:mm:ss')]
                  }
               }
            })
            console.log('sendRslt', sendRslt)
            //发送企业微信通知
            if (sendRslt && sendRslt.length) {
               console.log('sendRslt发送通知的数据', sendRslt)
               for (let { dataValues: c } of sendRslt) {
                  await new Promise(resolve => setTimeout(resolve, 5000)); // 这里的5000是等待时间，单位为毫秒，您可以根据需要调整  
                  //根据电话号码查询企业微信对应的userId
                  //phone,兰邦夫的电话号码（2024-1-9）
                  const userId = await getUserId(opts, c.processingPersonnelPhone)
                  await new Promise(resolve => setTimeout(resolve, 5000)); // 这里的5000是等待时间，单位为毫秒，您可以根据需要调整  
                  const manager = await getUserId(opts, phone)
                  //根据查询的userId发送通知
                  if (userId) {
                     const res = await sendWechat({
                        opts, msgtype: sendType["mini"],
                        data: {
                           userId: userId, touser: [userId], content: [{
                              "key": "工单类型",
                              "value": "运维中台售后工单问题处理工单"
                           }, {
                              "key": "发起时间",
                              "value": moment(c.createTime).format('YYYY-MM-DD HH:mm:ss')
                           }, {
                              "key": "计划修复时间",
                              "value": moment(c.planTime).format('YYYY-MM-DD HH:mm:ss')
                           }
                           ]
                        }
                     })
                     if (res.body.errmsg === 'ok') {
                        //将已发送的记录的isSend修改为true（已发送）
                        await models.WorkOrderNotice.update({ isSend: true }, { where: { id: c.id } })
                     } else {
                        console.log('发送消息失败', res.body.errmsg)
                     }
                  } else {
                     console.log('查询不到对应的userId', c.processingPersonnelPhone)
                  }
                  if (manager) {
                     const res = await sendWechat({
                        opts, msgtype: sendType["mini"],
                        data: {
                           userId: manager, touser: [manager],
                           content: [{
                              "key": "工单类型",
                              "value": "运维中台售后工单问题处理工单"
                           }, {
                              "key": "发起时间",
                              "value": moment(c.createTime).format('YYYY-MM-DD HH:mm:ss')
                           }, {
                              "key": "计划修复时间",
                              "value": moment(c.planTime).format('YYYY-MM-DD HH:mm:ss')
                           }
                           ]

                        }
                     })
                     if (res.body.errmsg === 'ok') {
                        //将已发送的记录的isSend修改为true（已发送）
                        console.log('已发送给运维部门主管')
                        //   await models.WorkOrderNotice.update({ isSend: true }, { where: { id: c.id } })
                     } else {
                        console.log('发送消息失败', res.body.errmsg)
                     }
                  } else {
                     console.log('查询不到对应的userId', phone)
                  }


               }

            }





         } catch (error) {
            console.error('失败原因', error)
         }
      }
   );
   return {
      workOrderNotice,
   }
}