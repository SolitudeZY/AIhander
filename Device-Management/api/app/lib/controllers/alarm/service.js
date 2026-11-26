'use strict';
const fs = require('fs');
const moment = require('moment')
const { alarmConfirmLog } = require('./alarmConfirmLog');



async function serviceError (ctx) {
   try {
      const { utils: { sendAppearToWeb }, clickHouse } = ctx.app.fs
      const models = ctx.fs.dc.models;
      const { type, file, comment } = ctx.request.body
      const now = moment().format()

      if (!type) {
         throw '请标明服务告警类型 type'
      }

      let serviceNumber = await models.AlarmServiceType.findOne({
         where: { typeNumber: type }
      });

      if (!serviceNumber) {
         throw '不存在该服务告警类型'
      }

      await models.AlarmService.create({
         type, file, createTime: now, comment
      });

      ctx.status = 204;
   } catch (error) {
      ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
      ctx.status = 400;
      ctx.body = {
         message: typeof error == 'string' ? error : undefined
      }
   }
}

async function serviceErrorList (ctx) {
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

async function getExceptionTypeCheck (ctx) {
   try {
      const models = ctx.fs.dc.models;
      const { userId } = ctx.query

      const res = await models.ExceptionTypeCheck.findOne({ where: { userId } })

      ctx.status = 200;
      ctx.body = res
   } catch (error) {
      ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
      ctx.status = 400;
      ctx.body = {
         message: typeof error == 'string' ? error : undefined
      }
   }
}

async function postExceptionTypeCheck (ctx) {
   try {
      const models = ctx.fs.dc.models;
      const { userId, typeId } = ctx.request.body

      const findOne = await models.ExceptionTypeCheck.findOne({ where: { userId } })
      if (findOne) {
         await models.ExceptionTypeCheck.update({ typeId }, { where: { userId } })
      } else {
         await models.ExceptionTypeCheck.create({ typeId, userId })
      }
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
   serviceError,
   serviceErrorList,
   getExceptionTypeCheck,
   postExceptionTypeCheck,
};