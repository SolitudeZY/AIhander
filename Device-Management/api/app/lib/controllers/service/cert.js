'use strict';
const moment = require('moment');

async function edit (ctx) {
   try {
      const { models } = ctx.fs.dc;
      const { body } = ctx.request

      let data = {
         ...body,
         remain: moment(body.dayEnd).diff(moment(), 'days') + 1,
      }

      if (body.id) {
         await models.Cert.update(data, { where: { id: body.id } })
      } else {
         await models.Cert.create(data)
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

async function list (ctx) {
   try {
      const { models } = ctx.fs.dc;
      const { keyword } = ctx.query

      let where = {}
      if (keyword) {
         where.$or = {
            name: { $like: `%${keyword}%` },
            project: { $like: `%${keyword}%` }
         }
      }
      const list = await models.Cert.findAll({
         where: where,
         order: [['id', 'DESC']]
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

async function del (ctx) {
   try {
      const { models } = ctx.fs.dc;
      const { id } = ctx.query

      await models.Cert.destroy({ where: { id: id } })

      ctx.status = 204;
   } catch (error) {
      ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
      ctx.status = 400;
      ctx.body = {
         message: typeof error == 'string' ? error : undefined
      }
   }
}

async function noticeList (ctx) {
   try {
      const { models } = ctx.fs.dc;
      const { keyword } = ctx.query


      let certIds = []
      if (keyword) {
         let where = {}
         where.$or = {
            name: { $like: `%${keyword}%` },
            project: { $like: `%${keyword}%` }
         }
         const list = await models.Cert.findAll({
            attributes: ['id'],
            where: where,
         })
         certIds = list.map(item => item.id)
      }

      let where = {}
      if (keyword) {
         where.certIds = { $overlap: certIds }
      }
      const list = await models.CertNotice.findAll({
         where: where,
         order: [['id', 'DESC']]
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

async function noticeEdit (ctx) {
   try {
      const { models } = ctx.fs.dc;
      const { body } = ctx.request

      if (body.id) {
         await models.CertNotice.update(body, { where: { id: body.id } })
      } else {
         await models.CertNotice.create(body)
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

async function noticeDel (ctx) {
   try {
      const { models } = ctx.fs.dc;
      const { id } = ctx.query

      await models.CertNotice.destroy({ where: { id: id } })

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
   edit,
   list,
   del,
   noticeList,
   noticeEdit,
   noticeDel,
};