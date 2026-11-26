'use strict';
const moment = require('moment')

async function list (ctx) {
   try {
      const models = ctx.fs.dc.models;
      const sequelize = ctx.fs.dc.ORM;
      const { clickHouse } = ctx.app.fs
      const { utils: { anxinStrucIdRange, pomsProjectRange } } = ctx.app.fs
      const { keyword, keywordTarget, alarmType, state, tactics, pomsProjectId } = ctx.query
      let findOption = {
         where: {
            del: false
         },
         order: [['id', 'desc']],
      }

      let anxinStrucsRange = await anxinStrucIdRange({
         ctx, pepProjectId: pomsProjectId, keywordTarget, keyword
      })
      if (keywordTarget && keyword) {
         if (keywordTarget == 'tactics') {
            findOption.where.name = { $like: `%${keyword}%` }
         } else if (keywordTarget == 'struc') {
            let bindAnixinStrucRes = await clickHouse.anxinyun.query(`
               SELECT id, name FROM t_structure
                  WHERE name LIKE '%${keyword}%'
            `).toPromise()
            let bindAnixinStrucIds = bindAnixinStrucRes.map(s => s.id)
            findOption.where.strucId = { $contains: bindAnixinStrucIds }
         } else if (keywordTarget == 'pepProject') {
            // 这种情况在 pomsProjectRange 函数值已处理
         }
      }
      const pomsProjectRes = await pomsProjectRange({
         ctx, pepProjectId: pomsProjectId, keywordTarget, keyword
      })
      let pomsProjectIds = pomsProjectRes.map(p => p.id)
      findOption.where.pomsProjectId = { $overlap: pomsProjectIds }

      if (alarmType) {
         findOption.where.alarmType = { $contains: [alarmType] }
      }
      if (state) {
         if (state == 'enable' || state == 'notYet' || state == 'takeEffect') {
            findOption.where.disable = false
         } else if (state == 'disable') {
            findOption.where.disable = true
         }
      }
      if (tactics) {
         findOption.where.tactics = tactics
      }
      const listRes = await models.AlarmPushConfig.findAll(findOption)
      // const listRes = await models.AlarmPushConfig.findAll({})
      let allStrucIds = new Set()
      let allConfigId = []
      let allReceiverIds = new Set()
      for (let p of listRes) {
         for (let sid of p.strucId) {
            allStrucIds.add(sid)
         }
         allConfigId.push(p.id)
         for (let uid of p.receiverPepUserId) {
            allReceiverIds.add(uid)
         }
      }
      // 查配置所包含的所有结构物
      const allStrucRes = allStrucIds.size ? await clickHouse.anxinyun.query(`
         SELECT id, name FROM t_structure
            WHERE id IN (${[...allStrucIds].join(',')}, -1)
      `).toPromise() : []

      // 查所有配置的推送的次数
      const pushLogCountRes = await models.EmailSendLog.findAll({
         attributes: [
            'pushConfigId',
            [sequelize.fn('COUNT', sequelize.col('push_config_id')), 'count']
         ],
         where: {
            pushConfigId: { $in: allConfigId }
         },
         group: ['pushConfigId']
      })

      // 查询所有的用户信息
      const userRes = allReceiverIds.size ? await clickHouse.pepEmis.query(`
         SELECT id, name, delete FROM user 
            WHERE id IN (${[...allReceiverIds].join(',')}, -1)
      `).toPromise() : []

      let returnD = []
      for (let { dataValues: p } of listRes) {
         // 查对应的 poms 绑定的结构物绑定关系
         const corBinds = pomsProjectRes.filter(ppj => p.pomsProjectId.includes(ppj.id))


         // let filterBinds = []
         // for (let corBind of corBinds) {
         //    if (corBind.pepProjectId) {
         //       if (state == 'notYet') {
         //          if (corBind.pepProject && p.timeType.some(pt => pt == corBind.pepProject.constructionStatusId)) {
         //             continue
         //          }
         //       } else if (state == 'takeEffect') {
         //          if (!corBind.pepProject || !p.timeType.some(pt => pt == corBind.pepProject.constructionStatusId)) {
         //             continue
         //          }
         //       }
         //    } else if (state == 'notYet') {
         //       continue
         //    }
         //    filterBinds.push(corBind)
         // }
         // if (!filterBinds.length) {
         //    continue
         // }

         // 结构物信息
         let returnStruc = []
         for (let sid of p.strucId) {
            // 查这个结构物的信息
            let structure = allStrucRes.find(asr => asr.id == sid)
            if (structure) {
               // 检查当前结构物有没有从已绑定的项目里解绑
               // 查对应的可见的结构物信息
               const anxinStrucSeen = anxinStrucsRange.find(axs => axs.strucId == sid)
               returnStruc.push({
                  id: sid,
                  name: structure.name,
                  unbind: !anxinStrucSeen || corBinds.every(corBinds => !corBinds.anxinProjectId.includes(anxinStrucSeen.projectId))
               })
            } else {
               // 这个结构物已删
            }
         }

         // 查找日志数量
         const corLogCount = pushLogCountRes.find(plc => plc.pushConfigId == p.id)
         // 查找接收人数据
         const corReceiver = userRes.filter(u => p.receiverPepUserId.some(prId => u.id == prId))
         returnD.push({
            ...p,
            pomsProject: corBinds,
            structure: returnStruc,
            pushCount: corLogCount ? corLogCount.dataValues.count : 0,
            receiverPepUser: corReceiver
         })
      }

      ctx.status = 200;
      ctx.body = returnD
   } catch (error) {
      ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
      ctx.status = 400;
      ctx.body = {
         message: typeof error == 'string' ? error : undefined
      }
   }
}

async function edit (ctx) {
   try {
      const models = ctx.fs.dc.models;
      const { userId, pepUserId } = ctx.fs.api
      const { pushId, name, pomsProjectId, alarmType = [], receiverPepUserId = [], timeType = [], pushType = ['email'], disable,
         strucId = [], tactics, tacticsParams, alarmSubType = {}, pomsStrucFactorId = {} } = ctx.request.body

      let storageData = {
         name, pomsProjectId, alarmType, receiverPepUserId, timeType, pushType, disable,
         strucId, tactics, tacticsParams, alarmSubType, pomsStrucFactorId
      }

      let repeatOption = {
         where: {
            name,
            del: false,
         }
      }
      if (pushId) {
         repeatOption.where.id = { $ne: pushId }
      }
      let repeatRes = await models.AlarmPushConfig.findOne(repeatOption)
      if (repeatRes) {
         throw `已有名称为[${name}]的同名策略`
      }

      if (pushId) {
         await models.AlarmPushConfig.update(storageData, {
            where: {
               id: pushId
            }
         })
      } else {
         storageData.createTime = moment().format()
         storageData.createUserId = userId
         storageData.del = false
         await models.AlarmPushConfig.create(storageData)
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

async function state (ctx) {
   try {
      const models = ctx.fs.dc.models;
      const { pushId } = ctx.params
      const { disable = undefined, del = undefined, } = ctx.request.body

      let updateData = {
         disable,
         del,
      }

      await models.AlarmPushConfig.update(updateData, {
         where: {
            id: pushId
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



module.exports = {
   list, edit, state
};