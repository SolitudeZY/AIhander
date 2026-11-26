'use strict';
const fs = require('fs');
const moment = require('moment')

module.exports = function (app, opts) {

   function judgeSuper (ctx) {
      try {
         const { userInfo = {} } = ctx.fs.api || {};
         const { role = [] } = userInfo
         return role.some(r => r == 'SuperAdmin' || r == 'admin')
      } catch (error) {
         ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
      }
   }

   async function pomsWithPepRangeParams ({ ctx, pepProjectId, keywordTarget, keyword }) {
      const { models } = ctx.fs.dc;
      const { userInfo = {} } = ctx.fs.api || {};
      const { clickHouse } = ctx.app.fs
      const { correlationProject = [] } = userInfo

      const isSuper = judgeSuper(ctx)
      let findOption = {
         where: {
            del: false
         }
      }
      if (pepProjectId) {
         // 有 特定的项目id 就按此查询
         findOption.where.id = { $in: String(pepProjectId).split(',') }
      } else if (!isSuper) {
         // 还不是超管或管理员就按关联的项目id的数据范围查
         findOption.where.id = { $in: correlationProject }
      }

      let pepProjectWhereOptions = []
      if (keywordTarget == 'pepProject' && keyword) {
         pepProjectWhereOptions.push(`t_pim_project.project_name LIKE '%${keyword}%'`)
         findOption.where.name = {
            $or: [{
               $eq: null
            }, {
               $like: `%${keyword}%`
            }]
         }
      }

      // TODO 这儿也许需要判断传进来的 pepProjectId 在不在当前用户的关注范围内
      // 根据 poms 的项目绑定关系查相关联的项企项目、安心云项目id信息
      const bindRes = await models.ProjectCorrelation.findAll(findOption)

      // 获取不重复的 项企项目id
      let pepProjectIds = []
      for (let b of bindRes) {
         if (b.pepProjectId) {
            pepProjectIds.push(b.pepProjectId)
         }
      }

      // 查询项企项目的信息
      const pepProjectRes = pepProjectIds.length ?
         await clickHouse.projectManage.query(
            `
               SELECT
                  t_pim_project.id AS id, 
                  t_pim_project.project_name AS projectName, 
                  t_pim_project.isdelete AS isdelete,
                  t_pim_project_construction.construction_status_id AS constructionStatusId, 
                  t_pim_project_state.construction_status AS constructionStatus 
               FROM 
                  t_pim_project 
               LEFT JOIN t_pim_project_construction 
                  ON t_pim_project.id = t_pim_project_construction.project_id 
               LEFT JOIN t_pim_project_state 
                  ON t_pim_project_construction.construction_status_id = t_pim_project_state.id 
               WHERE 
                  id IN (${pepProjectIds.join(',')})
                  ${pepProjectWhereOptions.length ? `AND ${pepProjectWhereOptions.join(' AND ')}`
               : ''}
             `
         ).toPromise() :
         []

      return {
         pepProjectRes, bindRes,
      }
   }

   async function anxinStrucIdRange ({ ctx, pepProjectId, keywordTarget, keyword }) {
      const { clickHouse } = ctx.app.fs


      const { pepProjectRes, bindRes, } = await pomsWithPepRangeParams({ ctx, pepProjectId, keywordTarget, keyword })

      // 获取不重复的 安心云项目 id
      const anxinProjectIds = [
         ...(
            keywordTarget == 'pepProject' && keyword ?
               bindRes.filter(b => b.name || pepProjectRes.some(pp => pp.id == b.pepProjectId)) :
               bindRes
         ).reduce(
            (arr, b) => {
               for (let sid of b.anxinProjectId) {
                  arr.add(sid);
               }
               return arr;
            },
            new Set()
         )
      ]


      // 查询安心云项目及结构物信息
      let undelStrucWhereOptions = []
      if (keywordTarget && keyword) {
         if (keywordTarget == 'struc') {
            undelStrucWhereOptions.push(`t_structure.name LIKE '%${keyword}%'`)
         }
      }
      const undelStrucRes = anxinProjectIds.length ?
         await clickHouse.anxinyun.query(
            `
               SELECT 
                  t_project.id AS projectId, 
                  t_structure.id AS strucId, 
                  t_structure.name AS strucName,
                  t_structure.iota_thing_id as thingId,
                  t_structure.external_platform as externalPlatform,
                  project_state
               FROM 
                  t_project 
               LEFT JOIN
                  t_project_structure
                     ON t_project_structure.project = t_project.id
               LEFT JOIN
                  t_project_structuregroup
                     ON t_project_structuregroup.project = t_project.id
               LEFT JOIN 
                  t_structuregroup_structure
                     ON t_structuregroup_structure.structuregroup = t_project_structuregroup.structuregroup
               LEFT JOIN
                  t_project_construction
                     ON t_project_construction.project = t_project.id
               LEFT JOIN
                  t_structure_site
                     ON t_structure_site.siteid = t_project_construction.construction
               RIGHT JOIN
                  t_structure
                     ON t_structure.id = t_project_structure.structure
                     OR t_structure.id = t_structuregroup_structure.structure
                     OR t_structure.id = t_structure_site.structid
               WHERE 
                  project_state != -1 
                     AND
                  t_project.id IN (${anxinProjectIds.join(',')})
                  ${undelStrucWhereOptions.length ? `AND ${undelStrucWhereOptions.join(' AND ')}` : ''}
            `
         ).toPromise() :
         []

      // 构建安心云结构物和项企项目的关系
      // 并保存信息至数据
      let undelStruc = []
      for (let s of undelStrucRes) {
         let corStruc = undelStruc.find(us => us.strucId == s.strucId)
         if (corStruc) {
            if (!corStruc.project.some(cp => cp.id == s.projectId)) {
               corStruc.project.push({
                  id: s.projectId
               })
            }
         } else {
            corStruc = {
               strucId: s.strucId,
               strucName: s.strucName,
               projectId: s.projectId,
               externalPlatform: s.externalPlatform,
               project: [{
                  id: s.projectId,
               }],
               pomsProject: [],
               thingId: s.thingId
            }
            undelStruc.push(corStruc)
         }

         for (let { dataValues: br } of bindRes) {
            if (br.anxinProjectId.some(braId => braId == s.projectId)) {
               let corPepProject = pepProjectRes.find(pp => pp.id == br.pepProjectId)
               let corPomsProject = corStruc.pomsProject.find(cp => cp.id == br.id)

               if (corPomsProject) {
                  // poms 的 project 和 pep 的 project 是一对一的关系 所以这个情况不用处理
               } else {
                  corStruc.pomsProject.push({
                     ...br,
                     pepProject: corPepProject
                  })
               }

            }
         }

      }
      return undelStruc
   }

   async function pomsProjectRange ({ ctx, pepProjectId, keywordTarget, keyword }) {

      const { pepProjectRes, bindRes, } = await pomsWithPepRangeParams({ ctx, pepProjectId, keywordTarget, keyword })

      let pomsProject = []
      for (let b of bindRes) {
         if (
            keywordTarget == 'pepProject' && keyword
            && (
               !b.name && !(
                  b.pepProjectId && pepProjectRes.some(pp => pp.id == b.pepProjectId)
               )
            )
         ) {
            continue
         }
         if (b.pepProjectId) {
            let corPepProject = pepProjectRes.find(pp => pp.id == b.pepProjectId) || {}
            pomsProject.push({
               ...b.dataValues,
               pepProject: corPepProject
            })
         } else {
            pomsProject.push({
               ...b.dataValues
            })
         }
      }
      return pomsProject
   }

   return {
      judgeSuper, pomsWithPepRangeParams,
      anxinStrucIdRange,
      pomsProjectRange,
   }
}