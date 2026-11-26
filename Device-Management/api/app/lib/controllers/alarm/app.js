'use strict';
const fs = require('fs');
const moment = require('moment')
const { alarmConfirmLog } = require('./alarmConfirmLog');
async function inspection (ctx) {
   // 巡查
   try {
      const models = ctx.fs.dc.models;
      const { projectAppId, screenshot = [], } = ctx.request.body

      const now = moment().format()
      const storageData = screenshot.map(s => {
         return {
            projectAppId,
            screenshot: s.url,
            createTime: now,
            description: s.description,
            router: s.router,
            pageName: s.pageName,
            loadTime: s.loadTime,
            pageStatus: s.pageStatus
         }
      })
      await models.AppInspection.bulkCreate(storageData)

      ctx.status = 204;
   } catch (error) {
      ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
      ctx.status = 400;
      ctx.body = {
         message: typeof error == 'string' ? error : undefined
      }
   }
}

async function inspectionList (ctx) {
   try {
      const models = ctx.fs.dc.models;
      const { clickHouse } = ctx.app.fs
      const { utils: { anxinStrucIdRange, pomsProjectRange } } = ctx.app.fs
      const { pepProjectId, timeStart, timeEnd, projectId, appId, noted } = ctx.query

      let pomsProjectIds = null
      if (!projectId && !appId) {
         let pomsProject = await pomsProjectRange({
            ctx, pepProjectId
         })
         pomsProjectIds = pomsProject.map(p => p.id)
      }

      let findOption = {
         where: {
            //查询pageStatus为空，为东江页面巡查数据，页面无需展示
            pageStatus: null,
         },
         order: [['id', 'DESC']],
         include: [{
            model: models.App,
            required: true,
            where: appId ? {
               id: appId
            } : undefined,
            include: {
               model: models.ProjectCorrelation,
               required: true,
               where: Object.assign({},
                  {
                     del: false
                  },
                  projectId ?
                     {
                        id: projectId
                     } : {},
                  pomsProjectIds ? {
                     id: { $in: pomsProjectIds }
                  } : {}
               ),
               attributes: {
                  exclude: ['anxinProjectId', 'createTime', 'createUser']
               }
            }
         }]
      }
      if (timeStart && timeEnd) {
         findOption.where.createTime = { $between: [moment(timeStart).format(), moment(timeEnd).format()] }
      }
      if (noted) {
         if (noted == 'noted') {
            findOption.where.notedTime = { $ne: null }
         } else if (noted == 'unnote') {
            findOption.where.notedTime = null
         }
      }

      const inspectionRes = await models.AppInspection.findAll(findOption)
      let notedUserIds = new Set()
      for (let ins of inspectionRes) {
         if (ins.notedPepUserId) {
            notedUserIds.add(ins.notedPepUserId)
         }
      }
      let userPepRes = notedUserIds.size ?
         await clickHouse.pepEmis.query(`SELECT DISTINCT user.id AS id, "user"."name" AS name FROM user WHERE user.id IN (${[...notedUserIds].join(',')}, -1)`).toPromise() :
         []
      for (let ins of inspectionRes) {
         if (ins.notedPepUserId) {
            const corUser = userPepRes.find(up => up.id == ins.notedPepUserId)
            ins.dataValues.notedPepUser = corUser ? corUser.name : ''
         }
      }
      ctx.status = 200;
      ctx.body = inspectionRes
   } catch (error) {
      ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
      ctx.status = 400;
      ctx.body = {
         message: typeof error == 'string' ? error : undefined
      }
   }
}

async function notedInspection (ctx) {
   try {
      const models = ctx.fs.dc.models;
      const { inspectionId } = ctx.request.body
      const { userId, pepUserId } = ctx.fs.api

      await models.AppInspection.update({
         notedPepUserId: pepUserId,
         notedTime: moment().format()
      }, {
         where: {
            id: inspectionId
         }
      })

      ctx.status = 204;
   } catch (error) {
      ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
      ctx.status = 400;
      ctx.body = {
         message: typeof error == 'string' ? error : undefined
      }
   }
}

async function apiError (ctx) {
   try {
      const { utils: { sendAppearToWeb }, clickHouse } = ctx.app.fs
      const models = ctx.fs.dc.models;
      const { projectAppId, alarmContent, router, statusCode, screenshot = '', type } = ctx.request.body
      const now = moment().format()

      if (!type) {
         throw '请标明告警类型 type'
      }

      const isRestore = statusCode == 200 || statusCode == 204
      if (isRestore) {
         const existRes = await models.AppAlarm.findAll({
            where: {
               projectAppId, router, alarmContent,
               confirmTime: null, type
            }
         })
         if (existRes.length) {
            await models.AppAlarm.update({
               updateTime: now,
               confirmTime: now,
               confirmAuto: true,
            }, {
               where: {
                  id: { $in: existRes.map(e => e.id) }
               }
            })
         }
      } else {
         let storageData = {
            projectAppId, alarmContent, router, statusCode, type
         }
         const existRes = await models.AppAlarm.findOne({
            where: {
               projectAppId, alarmContent, router, statusCode,
               confirmTime: null, type,
            }
         })
         if (existRes) {
            await models.AppAlarm.update({
               updateTime: now
            }, {
               where: {
                  id: existRes.id
               }
            })
         } else {
            const existCount = await models.AppAlarm.count({
               where: {

               }
            })
            storageData.serialNumber = 'WEB' + (existCount < 9 ? '0' + (existCount + 1) : existCount)
            storageData.createTime = now
            storageData.screenshot = screenshot
            await models.AppAlarm.create(storageData)

            //存告警记录
            let constTypes = { 'element': "元素异常", 'apiError': "接口报错 ", 'timeout': "加载超时" }
            let belongsTo = await models.ProjectApp.findOne({
               where: {
                  id: projectAppId
               },
               include: [{
                  model: models.ProjectCorrelation,
                  attributes: ['id', 'name', 'pepProjectId'],
                  where: { del: false }
               }]
            })
            if (belongsTo) {
               let appName = await models.App.findOne({
                  where: {
                     id: belongsTo.appId
                  },
                  attributes: ['name'],
               })
               let pInfo = belongsTo.projectCorrelation.dataValues;//归属项目
               let pId = pInfo.id;//归属项目id
               let pepProjects = pInfo.pepProjectId ? await clickHouse.projectManage.query(`
               SELECT id, project_name FROM t_pim_project WHERE id=${pInfo.pepProjectId}`
               ).toPromise() : [];

               let data = {
                  projectCorrelationId: pId,
                  alarmInfo: { messageMode: 'AlarmGeneration', sourceName: appName.name, content: alarmContent, type: constTypes[type] },//AlarmGeneration代表告警首次产生
                  time: now,
                  type: '应用异常'
               }
               let r = await models.AlarmAppearRecord.create(data, { returning: true });
               let dynamic = {
                  time: r.dataValues.time,
                  alarmAppearId: r.dataValues.id,
                  projectCorrelationId: r.dataValues.projectCorrelationId,
                  type: 1//发现
               }
               await models.LatestDynamicList.create(dynamic);


               //消息推送到前端
               let project = {//构造数据结构
                  pomsProject: [{
                     id: pId,
                     name: pInfo.name,
                     pepProject: { projectName: pepProjects.length ? pepProjects[0].project_name : '' }
                  }]
               }
               await sendAppearToWeb([data], 'app', project);
            }
         }

      }

      ctx.status = 200;
   } catch (error) {
      ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
      ctx.status = 400;
      ctx.body = {
         message: typeof error == 'string' ? error : undefined
      }
   }
}

async function apiErrorList (ctx) {
   try {
      const models = ctx.fs.dc.models;
      const { clickHouse } = ctx.app.fs
      const { utils: { anxinStrucIdRange, pomsProjectRange } } = ctx.app.fs
      const { keyword, errType, confirmState, state, sustainTimeStart, sustainTimeEnd, limit, page, pepProjectId, toExport } = ctx.query

      let pomsProject = await pomsProjectRange({
         ctx, pepProjectId,
         keywordTarget: 'pepProject',
         keyword,
      })
      const pomsProjectIds = pomsProject.map(p => p.id)
      let findOption = {
         distinct: true,
         where: {
            $or: []
         },
         include: [{
            model: models.App,
            where: {

            },
            attributes: {
               exclude: ['projectId']
            },
            include: [{
               model: models.ProjectCorrelation,
               where: {

               },
               attributes: {
                  exclude: ['createTime', 'createUser', 'anxinProjectId',]
               },
            }]
         }]
      }
      if (keyword) {
         findOption.where.$or.push(
            {
               '$app->projectCorrelations.id$': {
                  $in: pomsProjectIds
               },
            }
         )
         findOption.where.$or.push(
            {
               '$app.name$': { $like: `%${keyword}%` }
            },
         )
      } else {
         // findOption.where['$app->projectCorrelations.id$'] = {
         //    $in: pomsProjectIds
         // }
         findOption.include[0].include[0].where.id = { $in: pomsProjectIds }
      }

      if (errType) {
         findOption.where.type = errType // element / apiError
      }
      if (confirmState || state) {
         if (confirmState == 'confirmd' || state == 'histroy') {
            findOption.where.confirmTime = { $ne: null }
         } else if (confirmState == 'unconfirmed' || state == 'new') {
            findOption.where.confirmTime = null
         }
      }
      if (sustainTimeStart && sustainTimeEnd) {
         findOption.where.$or = findOption.where.$or.concat([
            {
               createTime: { $between: [moment(sustainTimeStart).format(), moment(sustainTimeEnd).format()] },
            },
            {
               updateTime: { $between: [moment(sustainTimeStart).format(), moment(sustainTimeEnd).format()] }
            },
            {
               createTime: { $lte: moment(sustainTimeStart).format() },
               updateTime: { $gte: moment(sustainTimeEnd).format() },
            }
         ])
      }
      if (!toExport) {//非导出时考虑分页
         if (limit) {
            findOption.limit = limit
         }
         if (page && limit) {
            findOption.offset = page * limit
         }
      }
      if (!findOption.where.$or.length) {
         delete findOption.where.$or
      }
      const listRes = await models.AppAlarm.findAndCountAll(findOption)

      for (let lr of listRes.rows) {
         if (lr.app && lr.app.projectCorrelations) {
            for (let p of lr.app.projectCorrelations) {
               let corProjectCorrelations = pomsProject.find(pr => pr.id == p.id)
               if (corProjectCorrelations) {
                  p.dataValues = corProjectCorrelations
               }
            }
         }
      }
      if (toExport) {//数据导出相关
         await exportAppAlarms(ctx, listRes);
      } else {
         ctx.status = 200;
         ctx.body = listRes
      }
   } catch (error) {
      ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
      ctx.status = 400;
      ctx.body = {
         message: typeof error == 'string' ? error : undefined
      }
   }
}

async function exportAppAlarms (ctx, listRes) {
   let typeData = { element: "元素异常", apiError: "接口报错 ", timeout: "加载超时" }
   try {
      const { utils: { simpleExcelDown, getExportAlarmHeader } } = ctx.app.fs;
      let header = await getExportAlarmHeader('app');
      let exportData = []
      for (let { dataValues: item } of listRes.rows) {
         let projectName = [];
         for (let project of item.app.projectCorrelations) {
            if (project.dataValues.name) {
               projectName.push(project.dataValues.name)
            } else {
               projectName.push(project.dataValues.pepProject.projectName)
            }
         }
         item.projectName = projectName.join('\r\n');//项目名称

         item.appName = item.app.dataValues.name;
         item.url = item.app.dataValues.url;
         item.type = item.type ? typeData[item.type] : '无';//异常类型

         let time = moment(item.confirmTime || item.updateTime || moment().format("YYYY-MM-DD HH:mm:ss")).diff(moment(item.createTime), 'seconds')
         item.sustainTime = time < 60 ? '< 1分钟' : time > 3600 ? Math.floor(time / 3600) + '小时' + Math.floor((time - Math.floor(time / 3600) * 3600) / 60) + '分钟' : Math.floor((time - Math.floor(time / 3600) * 3600) / 60) + '分钟';

         item.alarmContent = item.alarmContent || '无';
         item.updateTime = item.updateTime || '无';
         item.confirm = item.confirm || '无';
         item.confirmTime = item.confirmTime || '无';

         exportData.push(item)
      }
      const fileName = `应用异常列表_${moment().format('YYYYMMDDHHmmss')}` + '.xlsx'
      const filePath = await simpleExcelDown({ data: exportData, header, fileName: fileName })
      const fileData = fs.readFileSync(filePath);
      ctx.status = 200;
      ctx.set('Content-Type', 'application/x-xls');
      ctx.set('Content-disposition', 'attachment; filename=' + encodeURI(fileName));
      ctx.body = fileData;
   } catch (error) {
      ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
      ctx.status = 400;
      ctx.body = {
         message: typeof error == 'string' ? error : undefined
      }
   }
}

async function confirmApiError (ctx) {
   try {
      const models = ctx.fs.dc.models;
      const { confirm, appAlarmId = [], confirmPost } = ctx.request.body
      await models.AppAlarm.update({
         confirm,
         confirmTime: moment().format()
      }, {
         where: {
            id: { $in: appAlarmId }
         }
      })

      await alarmConfirmLog(ctx, confirmPost, confirm);//告警确认日志

      ctx.status = 204;
   } catch (error) {
      ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
      ctx.status = 400;
      ctx.body = {
         message: typeof error == 'string' ? error : undefined
      }
   }
}

module.exports = {
   inspection,
   inspectionList,
   notedInspection,
   apiError,
   apiErrorList,
   confirmApiError,
};