'use strict';
const fs = require('fs');
const moment = require('moment')

async function list (ctx) {
   try {
      const models = ctx.fs.dc.models;
      const { Op } = ctx.fs.dc.ORM;
      const { keyword, state, limit, page } = ctx.query

      let findOption = {
         attributes: { exclude: ['trends'] },
         where: {
            status: {
               $ne: 2
            }
         }
      }

      if (keyword && keyword.trim()) {
         findOption.where.$or = [
            {
               deviceName: {
                  $like: `%${keyword.trim()}%`
               }
            },
            {
               structName: {
                  $like: `%${keyword.trim()}%`
               }
            }
         ]
      }

      if (state) {
         findOption.where.status = state
      }

      if (limit) {
         findOption.limit = limit
      }

      if (limit && page) {
         findOption.offset = (page - 1) * limit
      }
      const count = await models.Leakage.count({
         where: findOption.where
      });
      const res = await models.Leakage.findAll(findOption);

      ctx.status = 200;
      ctx.body = {
         count,
         list: res
      }
   } catch (error) {
      ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
      ctx.status = 400;
      ctx.body = {
         message: typeof error == 'string' ? error : undefined
      }
   }
}


async function status (ctx) {
   try {
      const models = ctx.fs.dc.models;
      const { Op } = ctx.fs.dc.ORM;
      const body = ctx.request.body;
      if (!body.id || !body.status) {
         throw '参数错误'
      }

      let updata = {
         status: body.status
      }
      if (body.status == 1) {
         updata.confirmTime = moment().format('YYYY-MM-DD HH:mm:ss')
      }

      await models.Leakage.update(updata, {
         where: {
            deviceId: body.id
         }
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

async function groupList (ctx) {
   try {
      const models = ctx.fs.dc.models;
      const { Op } = ctx.fs.dc.ORM;
      const { keyword, state, } = ctx.query

      let findOption = {
         attributes: { exclude: ['trends'] },
         where: {
            status: {
               $ne: 2
            },
            alarmLevel: { $gt: 0 },
            analysisDate: {
               $gt: moment().startOf('day').format('YYYY-MM-DD HH:mm:ss')
            }
         },
         order: [['isBase', 'DESC'], ['deviceId', 'DESC']] // 保证后面的遍历先处理 base 点位
      }

      if (keyword && keyword.trim()) {
         findOption.where.$or = [
            {
               deviceName: {
                  $like: `%${keyword.trim()}%`
               }
            },
            {
               structName: {
                  $like: `%${keyword.trim()}%`
               }
            }
         ]
      }

      if (state) {
         findOption.where.status = state
      }

      // const count = await models.Leakage.count({
      //    where: findOption.where
      // });
      const res = await models.Leakage.findAll(findOption);

      let rslt = []
      for (let r of res) {
         let corStruct = rslt.find(rst => rst.structId == r.structId)
         if (corStruct) {
            if (!corStruct.isBase && r.isBase) {
               corStruct = {
                  ...corStruct,
                  ...r.dataValues
               }
            }
         } else {
            let prePush = {
               structId: r.structId,
               structName: r.structName,
               children: [],
               level: 'struc'
            }
            if (r.isBase) {
               prePush = {
                  ...prePush,
                  ...r.dataValues
               }
            }
            corStruct = prePush
            rslt.push(prePush)
         }

         if (r.isBase) { // 放在第二层
            corStruct.children.unshift({
               ...r.dataValues,
               level: 'base'
            })
         } else { // 能到 else 说明 基点已处理完或没有
            let corBase = corStruct.children.find(c => c.isBase && c.groupId == r.groupId)
            if (corBase) {
               if (!corBase.children) {
                  corBase.children = []
               }
               corBase.children.push({ ...r.dataValues, level: 'device' })
            } else {// 说明没有基点 直接展示
               corStruct.children.unshift({
                  ...r.dataValues,
                  level: 'device'
               })
            }
         }
      }

      ctx.status = 200;
      ctx.body = {
         count: res.length,
         rslt
      }
   } catch (error) {
      ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
      ctx.status = 400;
      ctx.body = {
         message: typeof error == 'string' ? error : undefined
      }
   }
}

module.exports = {
   list,
   status,
   groupList
};