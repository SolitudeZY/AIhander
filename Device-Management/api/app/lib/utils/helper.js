'use strict';

const moment = require('moment')

module.exports = function (app, opts) {
   const { models } = app.fs.dc
   const { clickHouse } = app.fs
   const { database: anxinyun } = clickHouse.anxinyun.opts.config
   async function getAxyStructs (pepProjectId) {
      try {
         try {
            const { pepProjectRes, bindRes } = await pomsWithPepRangeParams(pepProjectId)
            // 获取不重复的 安心云项目 id
            const anxinProjectIds = [
               ...(bindRes).reduce(
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
            const undelStrucRes = anxinProjectIds.length ?
               await clickHouse.anxinyun.query(
                  `SELECT 
                     t_project.id AS projectId, 
                     t_structure.id AS strucId, 
                     t_structure.name AS strucName,
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
                     t_project.id IN (${anxinProjectIds.join(',')})`).toPromise() : []

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
                     project: [{
                        id: s.projectId,
                     }],
                     pomsProject: []
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
         } catch (error) {
            console.error(error);
         }
      } catch (error) {
         console.log(error)
      }
   }

   async function pomsWithPepRangeParams (pepProjectId) {
      try {
         let findOption = {
            where: {
               del: false
            }
         }
         if (pepProjectId) {
            // 有 特定的项目id 就按此查询
            findOption.where.id = pepProjectId
         }
         const bindRes = await models.ProjectCorrelation.findAll(findOption);
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
               `SELECT
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
                        id IN (${pepProjectIds.join(',')})`
            ).toPromise() : [];
            console.log('pepProjectRes',pepProjectRes)
         return {
            pepProjectRes, bindRes
         }

      } catch (error) {
        
         console.error(error);
      }
      return {
         pepProjectRes:[], bindRes:[]
      }
   }

   return {
      getAxyStructs
   }
}