const moment = require('moment')

let isDev = false
// isDev = true

module.exports = function (app, opts) {
   const workorderStatistics = app.fs.scheduleInit(
      {
         interval: '24 0 */1 * * *', // 与 sql 相关 谨慎改动
         immediate: isDev,
         proRun: !isDev,
         // disabled: false
      },

      async () => {
         try {
            const { models, ORM: sequelize } = app.fs.dc
            const { clickHouse } = app.fs
            const { database: camWorkflow } = clickHouse.camWorkflow.opts.config
            const { parseProcessData, parseJsonString } = app.fs.utils

            const existWorkorderCount = await models.Workorder.count()

            const formRes = await clickHouse.pepEmis.query(
               `
                  SELECT 
                     story.id AS historyId,
                     story.apply_user AS pepUserId,
                     story.form_data AS formData,
                     story.submit_form_data AS submitFormData,
                     story.create_at AS createAt,
                     fform.form_schema AS formSchema,
                     fprocess.name AS processName,
                     procin.state_ AS state,
                     procin.end_time_ AS endTime,
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
                  INNER JOIN workflow_group AS fgroup
                     ON fgroup.id = fprocess.group_id
                     AND fgroup.name = '运维中台表单'
                  INNER JOIN ${camWorkflow}.act_hi_procinst AS procin
                     ON procin.id_ = story.procinst_id 
                  ${existWorkorderCount ?
                  // 25小时之内完成的 或 3个月内未完成的
                  `
                     WHERE 
                        (
                           procin.end_time_ IS NOT NULL
                           AND 
                           procin.end_time_ > '${moment().subtract(25, 'hours').format('YYYY-MM-DD HH:mm:ss')}'
                        )
                        OR
                        (
                           procin.end_time_ IS NULL
                           AND 
                           story.create_at > '${moment().subtract(3, 'months').format('YYYY-MM-DD HH:mm:ss')}'
                        )
                     `
                  :
                  ''
               }
               `

            ).toPromise()

            console.log(`workorderStatistics 数据 ${formRes.length} 条`);
            let newD = 0
            let newE = 0
            for (let f of formRes) {
               const parseData = parseProcessData({
                  formSchema: parseJsonString(f.formSchema),
                  formData: parseJsonString(f.formData)
               })
               const existRes = await models.Workorder.findOne({
                  where: {
                     storyId: f.historyId,
                  }
               })
               if (existRes) {
                  await models.Workorder.update({
                     completeTime: f.endTime || null,
                     state: f.state,
                     problemType: parseData.problemType.value,
                     solution: parseData.solution.value
                  }, {
                     where: {
                        storyId: f.historyId,
                     }
                  })
               } else {
                  try {
                     const newRes = await models.Workorder.create({
                        storyId: f.historyId,
                        pomsProjectId: parseData.pomsProjectId.value || null,
                        expectTime: parseData.expectTime.value || null,
                        createTime: f.createAt || null,
                        completeTime: f.endTime || null,
                        state: f.state,
                        problemType: parseData.problemType.value || null,
                        solution: parseData.solution.value || null
                     })
                     newD++
                  } catch (error) {
                     newE++
                     console.error(`WORKORDER 插入失败： ${parseData.pomsProjectId.value}`);
                  }
               }
            }
            console.log(`新增 ${newD} 条数据`);
            console.log(`失败 ${newE} 条数据`);
         } catch (error) {
            console.error(error);
         }
      }
   )

   return {
      workorderStatistics,
   }
}