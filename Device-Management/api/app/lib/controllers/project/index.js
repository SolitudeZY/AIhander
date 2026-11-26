'use strict';

async function appList (ctx) {
   try {
      const models = ctx.fs.dc.models;

      const appRes = await models.App.findAll({

      })
      ctx.status = 200;
      ctx.body = appRes
   } catch (error) {
      ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
      ctx.status = 400;
      ctx.body = {
         message: typeof error == 'string' ? error : undefined
      }
   }
}

async function pomsProject (ctx) {
   try {
      const models = ctx.fs.dc.models;
      const { clickHouse } = ctx.app.fs
      const { userId, pepUserId, userInfo, pepUserInfo } = ctx.fs.api
      const { limit, page, global, pepId, keyword } = ctx.query
      let findOption = {
         where: {
            del: false,
            // $or:[]
         },
         order: [['updateTime', 'desc']],
         distinct: true,
         include: {
            model: models.App,
         }
      }
      if (global && !userInfo.role.includes('SuperAdmin') && !userInfo.role.includes('admin')) {
         findOption.where.id = { $in: userInfo.correlationProject }
      }
      if (pepId) {
         findOption.where.id = pepId
      }
      if (limit) {
         findOption.limit = limit
      }
      if (page && limit) {
         findOption.offset = page * limit
      }
      
      if (keyword) {
         const project = await clickHouse.projectManage.query(
            `
            SELECT 
               t_pim_project.id AS id, 
               t_pim_project.project_name AS project_name, 
               t_pim_project.isdelete AS isdelete,
               t_pim_project_construction.construction_status_id AS construction_status_id, 
               t_pim_project_state.construction_status AS construction_status 
            FROM t_pim_project 
               LEFT JOIN t_pim_project_construction 
                  ON t_pim_project.id = t_pim_project_construction.project_id 
               LEFT JOIN t_pim_project_state 
                  ON t_pim_project_construction.construction_status_id = t_pim_project_state.id 
               WHERE project_name LIKE '%${keyword}%'
            `
         ).toPromise() || []

         const anxinProjectRes = await clickHouse.anxinyun.query(
            `SELECT id,"name",
              project_state AS projectState 
            FROM t_project 
              WHERE name LIKE '%${keyword}%'`).toPromise()
            || []
         let projectId = project.map(v => v.id)
         let anxinProjectId = anxinProjectRes.map(v => v.id)

         findOption.where.$or = [
            { name: { $like: `%${keyword}%` } }]
         if (projectId.length > 0) {
            findOption.where.$or.push({ pepProjectId: { $in: projectId } })
         }
         if (anxinProjectId.length > 0) {
            findOption.where.$or.push({ anxinProjectId: { $overlap: anxinProjectId } })
         }

      }

      const proRes = await models.ProjectCorrelation.findAndCountAll(findOption)
      let pepProjectIds = new Set()
      let anxinProjectIds = new Set()
      let createUsers = new Set()
      let pepUserIds = new Set()

      for (let p of proRes.rows) {
         if (p.pepProjectId) {
            pepProjectIds.add(p.pepProjectId)
         }
         if (p.createUser) {
            createUsers.add(p.createUser)
         }
         if (p.optionEditPepUser) {
            pepUserIds.add(p.optionEditPepUser)
         }
         for (let ap of p.anxinProjectId) {
            if (ap) {
               anxinProjectIds.add(ap)
            }
         }
      }
      let pepmCustomerLevelRes = pepProjectIds.size ? await clickHouse.projectManage.query(
         `
            SELECT t_rpm_customer_level.id AS id, t_rpm_customer_level.name AS name, t_pim_project.id AS projectId
               FROM t_pim_project
                  LEFT JOIN t_rpm_customer
                     ON t_rpm_customer.id = t_pim_project.related_customers_id
                  LEFT JOIN t_rpm_customer_level
                     ON t_rpm_customer_level.id = t_rpm_customer.level
               WHERE t_pim_project.id IN (${[...pepProjectIds].join(',')},-1)
         `
      ).toPromise() : []
      const pomsUser = await models.User.findAll({
         where: {
            id: { $in: [...createUsers] }
         }
      })

      for (let p of pomsUser) {
         if (p.pepUserId) {
            pepUserIds.add(p.pepUserId)
         }
      }
      const pepcaUser = pepUserIds.size ?
         await clickHouse.pepEmis.query(
            `
            SELECT * FROM user
               WHERE id IN (${[...pepUserIds].join(',')}, -1)
            `
         ).toPromise() :
         []


      const pepProjectRes = pepProjectIds.size ?
         await clickHouse.projectManage.query(
            `
            SELECT 
               t_pim_project.id AS id, 
               t_pim_project.project_name AS project_name, 
               t_pim_project.isdelete AS isdelete,
               t_pim_project_construction.construction_status_id AS construction_status_id, 
               t_pim_project_state.construction_status AS construction_status 
            FROM t_pim_project 
               LEFT JOIN t_pim_project_construction 
                  ON t_pim_project.id = t_pim_project_construction.project_id 
               LEFT JOIN t_pim_project_state 
                  ON t_pim_project_construction.construction_status_id = t_pim_project_state.id 
               WHERE id IN (${[...pepProjectIds].join(',')}, -1)
            `
         ).toPromise() :
         []


      const anxinProjectRes = anxinProjectIds.size ?
         await clickHouse.anxinyun.query(`SELECT id,"name",project_state AS projectState FROM t_project WHERE id IN (${[...anxinProjectIds].join(',')},-1)`).toPromise() :
         []


      for (let p of proRes.rows) {
         const corPro = pepProjectRes.find(pp => pp.id == p.pepProjectId) || {}
         const pepUserName = (pepcaUser.find(qq => qq.id == (pomsUser.find(oo => oo.id == p.createUser) || {}).pepUserId) || {}).name || ''
         const editUser = p.optionEditPepUser ? pepcaUser.find(pu => pu.id == p.optionEditPepUser) : null
         p.dataValues.pepProjectName = corPro.project_name
         p.dataValues.editUserName = editUser ? editUser.name : ''
         p.dataValues.pepProjectIsDelete = corPro.isdelete
         p.dataValues.constructionStatusId = corPro.construction_status_id
         p.dataValues.constructionStatus = corPro.construction_status

         let nextAnxinProject = anxinProjectRes.filter(ap => p.anxinProjectId.includes(ap.id))
         p.dataValues.anxinProject = nextAnxinProject
         p.dataValues.pepUserName = pepUserName
         delete p.dataValues.anxinProjectId
         p.dataValues.customerLevel = (pepmCustomerLevelRes.find(pp => pp.projectId == p.dataValues.pepProjectId) || { name: '--' }).name
      }
      ctx.status = 200;
      ctx.body = proRes
   } catch (error) {
      ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`)
      ctx.status = 400;
      ctx.body = {
         message: typeof error == 'string' ? error : undefined
      }
   }
}

async function projectAnxincloud (ctx) {
   try {
      const { clickHouse } = ctx.app.fs
      const { includeDelete } = ctx.query

      const projectRes = await clickHouse.anxinyun.query(`SELECT * FROM t_project WHERE project_state = 4 ${includeDelete == 1 ? 'OR project_state = -1' : ''} ORDER BY id DESC`).toPromise()

      ctx.status = 200;
      ctx.body = projectRes
   } catch (error) {
      ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
      ctx.status = 400;
      ctx.body = {
         message: typeof error == 'string' ? error : undefined
      }
   }
}

async function projectPManage (ctx) {
   try {
      const models = ctx.fs.dc.models;
      const { clickHouse } = ctx.app.fs
      const { includeDelete } = ctx.query

      const projectRes = await clickHouse.projectManage.query(`SELECT id, project_name, isdelete FROM t_pim_project WHERE isdelete=0 ${includeDelete == 1 ? 'OR isdelete=1' : ''} ORDER BY id DESC`).toPromise()

      const bindedPRes = await models.ProjectCorrelation.findAll({
         where: {
            pepProjectId: { $ne: null },
            del: false
         }
      })

      for (let p of projectRes) {
         if (bindedPRes.some(bp => bp.pepProjectId == p.id)) {
            p.binded = true
         }
      }

      ctx.status = 200;
      ctx.body = projectRes
   } catch (error) {
      ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
      ctx.status = 400;
      ctx.body = {
         message: typeof error == 'string' ? error : undefined
      }
   }
}

async function pepProjectConstrictionState (ctx) {
   try {
      const { models } = ctx.fs.dc;
      const { clickHouse } = ctx.app.fs

      const cRes = await clickHouse.projectManage.query(`
         SELECT * FROM t_pim_project_state ORDER BY id
      `).toPromise()

      ctx.status = 200;
      ctx.body = cRes
   } catch (error) {
      ctx.fs.logger.error(`path: ${ctx.path}, error: error`);
      ctx.status = 400;
      ctx.body = {
         message: typeof error == 'string' ? error : undefined
      }
   }
}

async function strucWithPomsProject (ctx) {
   try {
      const { models } = ctx.fs.dc;
      const { clickHouse } = ctx.app.fs
      const { pomsProjectId } = ctx.query

      const bindRes = await models.ProjectCorrelation.findAll({
         where: {
            id: { $in: pomsProjectId.split(',') }
         }
      })
      let anxinProjectIds = new Set()
      for (let b of bindRes) {
         if (b.anxinProjectId.length) {
            for (let aid of b.anxinProjectId) {
               anxinProjectIds.add(aid)
            }
         }
      }

      let undelStruc = []
      if (bindRes) {
         const undelStrucRes = anxinProjectIds.size ?
            await clickHouse.anxinyun.query(
               `  
               SELECT 
                  t_structure.id AS strucId, 
                  t_structure.name AS strucName,
                  t_structure.external_platform AS externalPlatform,
                  t_factor.id AS factorId, 
                  t_factor.name AS factorName,
                  t_factor.proto AS factorProto,
                  t_factor_proto_item.name AS factorItemName,
                  t_factor_proto_item.id AS factorItemId
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
               LEFT JOIN t_structure_factor
                     ON t_structure_factor.structure = t_structure.id
               LEFT JOIN t_factor
                     ON t_structure_factor.factor = t_factor.id
               LEFT JOIN t_factor_proto_item
                     ON t_factor_proto_item.proto = t_factor.proto
               WHERE 
                  project_state != -1 
                     AND
                  t_project.id IN (${[...anxinProjectIds].join(',')}, -1)
               ORDER BY strucId
            `
            ).toPromise() :
            []
         for await (let s of undelStrucRes) {
            let corStrut = undelStruc.find(us => us.id == s.strucId)
            if (s.externalPlatform) {
               if (!corStrut) {
                  const factorList = await clickHouse.dataAlarm
                     .query(`select  SafetyFactorTypeId, SafetyFactorTypeName from sensors where PlatformStructureId = ${s.strucId} AND IsDeleted=false`)
                     .toPromise()
                  const project = await clickHouse.dataAlarm
                     .query(`select Project from sensors where PlatformStructureId =${s.strucId} AND IsDeleted=false limit 1 `)
                     .toPromise()

                  let fList = factorList.map(m => m.SafetyFactorTypeId)
                  let list = await clickHouse.dataAlarm
                     .query(
                        `select distinct FactorID, Name,Items,ItemNames from factors
                         where  FactorID in (${[...fList, -1].join(',')})
                           and  Project = '${[...project, 0][0].Project}'
                         `
                     )
                     .toPromise() || []

                  let nextFacor = []
                  list.map(d => {
                     if (d.Name) {
                        nextFacor.push({
                           id: d.FactorID,
                           name: d.Name,
                           // proto: s.factorProto,
                           item: d.ItemNames && d.ItemNames.split(',').map(item => ({ id: item, name: item })) || [],
                        })
                     }
                  })
                  undelStruc.push({
                     id: s.strucId,
                     name: s.strucName,
                     factor: nextFacor
                  })
               }
            } else {

               if (!corStrut) {
                  let nextFacor = []
                  if (s.factorId) {
                     let nextFactorItem = []
                     if (s.factorItemId) {
                        nextFactorItem.push({
                           id: s.factorItemId,
                           name: s.factorItemName,
                        })
                     }
                     nextFacor.push({
                        id: s.factorId,
                        name: s.factorName,
                        proto: s.factorProto,
                        item: nextFactorItem,
                     })
                  }
                  undelStruc.push({
                     id: s.strucId,
                     name: s.strucName,
                     factor: nextFacor
                  })
               } else {
                  if (s.factorId) {
                     let corFactor = corStrut.factor.find(v => v.id == s.factorId)
                     let nextFactorItem = null
                     if (s.factorItemId) {
                        nextFactorItem = {
                           id: s.factorItemId,
                           name: s.factorItemName,
                        }
                     }
                     if (corFactor) {
                        if (!corFactor.item.some(fi => fi.id == s.factorItemId) && nextFactorItem) {
                           corFactor.item.push(nextFactorItem)
                        }
                     } else {
                        corStrut.factor.push({
                           id: s.factorId,
                           name: s.factorName,
                           proto: s.factorProto,
                           item: nextFactorItem ? [{
                              id: s.factorItemId,
                              name: s.factorItemName,
                           }] : [],
                        })
                     }
                  }
               }
            }

         }
      }

      ctx.status = 200;
      ctx.body = undelStruc
   } catch (error) {
      ctx.fs.logger.error(`path: ${ctx.path}, error: error`);
      ctx.status = 400;
      ctx.body = {
         message: typeof error == 'string' ? error : undefined
      }
   }
}

async function getStructureStation (ctx) {
   try {
      const { models } = ctx.fs.dc;
      const { clickHouse } = ctx.app.fs
      const { database: dataAlarm } = clickHouse.dataAlarm.opts.config
      const { projectId, traitLabel } = ctx.query
      //  projectId  anxinyun 项目id
      //traitLabel  重点关注  
      let strucList = []
      let strucId = []

      const StrucRes = projectId ?
         await clickHouse.anxinyun.query(
            `
               SELECT 
                  t_structure.id AS strucId, 
                  t_structure.name AS strucName
               FROM 
                  t_project_structure
               LEFT JOIN
                  t_project
                     ON t_project.id = t_project_structure.project
               LEFT JOIN
                  t_structure
                     ON t_structure.id = t_project_structure.structure
               WHERE 
                 t_project_structure.project IN (${projectId})
               ORDER BY strucId
            `
         ).toPromise() :
         []
      for (let s of StrucRes) {
         if (!strucId.includes(s.strucId)) {
            strucList.push(s)
            strucId.push(s.strucId)
         }
      }

      // let trait = traitLabel
      // if (traitLabel && /['"]/.test(trait)) {
      //    trait = trait.replace(/['"]/g, ''); // 去掉引号
      // }

      let attention = '' // `AND positionCaseInsensitive(toString(t_sensor.labels), '${trait}') > 0`

      const sensor = strucId.length ?
         await clickHouse.anxinyun.query(
            `
            SELECT 
               CAST(t_sensor.id AS String) AS senterId, 
               t_sensor.name AS senterName,
               t_factor.name AS factorName,
               t_sensor.structure AS structure
            FROM 
               t_sensor
            LEFT JOIN
               t_factor
                  ON t_factor.id = t_sensor.factor
            WHERE 
               t_sensor.structure IN (${strucId.join(",")},-1)
               ${traitLabel ? attention : ""}
            ORDER BY senterId
            UNION ALL
            SELECT 
               CAST(sensor.SensorId AS String) AS senterId,
               sensor.SensorLocationDescription AS senterName,
               sensor.SafetyFactorTypeName AS factorName,
               sensor.PlatformStructureId AS structure
            FROM 
               ${dataAlarm}.sensors AS sensor
            WHERE 
               sensor.PlatformStructureId IN (${strucId.map(s => `${s}`).join(",")},-1)
               AND sensor.ID not like 'axy4%'
         `
         ).toPromise()
         // await clickHouse.dataAlarm.query(`
         //    SELECT
         //       CAST(sensor.SensorId AS String) AS senterId,
         //       sensor.SensorLocationDescription AS senterName,
         //       sensor.SafetyFactorTypeName AS factorName,
         //       sensor.StructId AS structure
         //    FROM
         //       sensors AS sensor
         //    WHERE
         //       sensor.PlatformStructureId IN (${strucId.map(s => `${s}`).join(",")},-1)
         //    `).toPromise()
         :
         []


      for (let s of strucList) {
         let findAll = sensor.filter(v => v.structure == s.strucId) || []
         s.sensor = findAll
      }

      ctx.status = 200;
      ctx.body = strucList
   } catch (error) {
      ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
      ctx.status = 400;
      ctx.body = {
         message: typeof error == 'string' ? error : undefined
      }
   }
}
module.exports = {
   appList,
   projectAnxincloud,
   projectPManage,
   pomsProject,
   pepProjectConstrictionState,
   strucWithPomsProject,
   getStructureStation
};