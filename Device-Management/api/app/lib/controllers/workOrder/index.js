'use strict';
const moment = require('moment')

async function getEnabledWorkflowProcess (ctx) {
   try {
      const { models } = ctx.fs.dc;
      const { clickHouse } = ctx.app.fs

      const listRes = await clickHouse.pepEmis.query(`
         SELECT 
            workflow_process.id AS id,
            workflow_process.name AS name,
            workflow_process.create_time AS createTime,
            workflow_process.update_time AS updateTime,
            workflow_group.name AS group
         FROM 
            workflow_process
         RIGHT JOIN workflow_group
            ON workflow_process.group_id = workflow_group.id
            AND workflow_group.name = '运维中台表单'
         WHERE 
            workflow_process.deleted = 0
            AND workflow_process.is_enable = 1
         order by workflow_process.update_time desc
      `).toPromise()

      ctx.status = 200;
      ctx.body = listRes
   } catch (error) {
      ctx.fs.logger.error(`path: ${ctx.path}, error: error`);
      ctx.status = 400;
      ctx.body = {
         message: typeof error == 'string' ? error : undefined
      }
   }
}

async function basicDataAllProject (ctx) {
   try {
      const { models } = ctx.fs.dc;
      const { clickHouse } = ctx.app.fs
      const { includeDel } = ctx.query

      let findOption = {
         where: {},
         order: [['updateTime', 'desc']],
      }
      if (!includeDel) {
         findOption.where.del = false
      }
      const proRes = await models.ProjectCorrelation.findAll(findOption)

      let pepProjectIds = new Set()
      for (let p of proRes) {
         if (p.pepProjectId) {
            pepProjectIds.add(p.pepProjectId)
         }
      }

      const pepProjectRes = pepProjectIds.size ?
         await clickHouse.projectManage.query(
            `
            SELECT 
               t_pim_project.id AS id, 
               t_pim_project.project_name AS project_name, 
               t_pim_project.isdelete AS isdelete 
            FROM t_pim_project
               WHERE id IN (${[...pepProjectIds].join(',')}, -1)
            `
         ).toPromise() || [] :
         []

      const list = proRes.map(p => {
         const corPro = pepProjectRes.find(pp => pp.id == p.pepProjectId) || {}
         return {
            value: p.id,
            label: corPro.project_name || p.name,
            disabled: corPro.isdelete == 1 || p.del
         }
      })

      ctx.status = 200;
      ctx.body = list
   } catch (error) {
      ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
      ctx.status = 400;
      ctx.body = {
         message: typeof error == 'string' ? error : undefined
      }
   }
}

async function padiDanList (ctx) {
   try {
      const { models } = ctx.fs.dc;
      const { type, closed } = ctx.query

      let findWhere = {}
      if (type) {
         findWhere.atype = type
      }
      if (closed) {
         if (closed.toLowerCase() == 'true') {
            findWhere.closed = true
         } else {
            findWhere.closed = false
         }
      }
      const list = await models.StructurePaidan.findAll({
         where: findWhere,
      })

      ctx.status = 200;
      ctx.body = list

   } catch (error) {
      ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
      ctx.status = 400;
      ctx.body = {
         message: typeof error == 'string' ? error : undefined
      }
   }
}

module.exports = {
   getEnabledWorkflowProcess,
   basicDataAllProject,
   padiDanList
};