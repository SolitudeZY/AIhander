'use strict';

async function addEditFile (ctx, next) {
   let message = '添加文件夹失败'
   try {
      const models = ctx.fs.dc.models;
      const data = ctx.request.body;
      const { higherFileId, fileName, projectId, type } = data


      let onefind = await models.ProjectFolder.findOne({
         where: {
            higherFileId: higherFileId || null,
            fileName,
            projectId,
            type
         }
      })
      if (onefind) {
         message = '已有同层级文件夹'
         throw message
      }


      if (data && data.id) {
         await models.ProjectFolder.update(data, {
            where: {
               id: data.id
            }
         })
      } else {
         await models.ProjectFolder.create(data)
      }

      ctx.status = 204;
   } catch (error) {
      ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`)
      ctx.status = 400;
      ctx.body = {
         "message": message
      }
   }
}

async function fileList (ctx, next) {
   try {
      const models = ctx.fs.dc.models;
      const { projectId, type } = ctx.query;

      let options = { where: {}, }

      options.where.projectId = projectId || null

      if (type) {
         options.where.type = type
      }

      let res = await models.ProjectFolder.findAll(options)

      ctx.status = 200;
      ctx.body = res || []
   } catch (error) {
      ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`)
      ctx.status = 400;
      ctx.body = {
         "message": '添加文件夹失败'
      }
   }
}

async function delFile (ctx, next) {
   try {
      const models = ctx.fs.dc.models;
      const { id } = ctx.params;


      await models.ProjectFolder.destroy({ where: { id } })

      ctx.status = 204;
   } catch (error) {
      ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`)
      ctx.status = 400;
      ctx.body = {
         "message": '删除文件夹失败'
      }
   }
}

async function addFile (ctx, next) {
   try {
      const models = ctx.fs.dc.models;
      const data = ctx.request.body;

      await models.ProjectFolderFile.create(data)

      ctx.status = 204;
   } catch (error) {
      ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`)
      ctx.status = 400;
      ctx.body = {
         "message": '添加文件夹失败'
      }
   }
}

async function folderFileList (ctx, next) {
   try {
      const models = ctx.fs.dc.models;
      const { fileId, limit, page, keyword } = ctx.query;

      let options = { where: {}, }
      if (JSON.parse(fileId).length) {
         options.where.fileId = { $in: JSON.parse(fileId) }
      }

      if (keyword) {
         options.where.name = { $ilike: `%${keyword}%` }
      }

      if (limit) {
         options.limit = Number(limit)
      }
      if (page && limit) {
         options.offset = Number(page) * Number(limit)
      }

      let res = await models.ProjectFolderFile.findAndCountAll(options)

      ctx.status = 200
      ctx.body = res || {}
   } catch (error) {
      ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`)
      ctx.status = 400;
      ctx.body = {
         "message": '添加文件列表失败'
      }
   }
}


async function delfolderFile (ctx, next) {
   try {
      const models = ctx.fs.dc.models;
      const { id } = ctx.params;

      await models.ProjectFolderFile.destroy({ where: { id } })

      ctx.status = 204;
   } catch (error) {
      ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`)
      ctx.status = 400;
      ctx.body = {
         "message": '删除文件失败'
      }
   }
}
async function upload (ctx, next) {
   let fkey = null;
   try {
      const { files } = await parse(ctx.req);
      const file = files[0];
      const fileInfo = await ctx.app.fs.attachment.upload(file);
      fkey = fileInfo.key;
      ctx.status = 200;
      ctx.body = { uploaded: fkey };

   } catch (err) {
      ctx.fs.logger.error(`path: ${ctx.path}, error: ${err}`)
      ctx.status = 400;
      ctx.body = {
         "message": '上传失败'
      }
   }
}



module.exports = {
   addEditFile,
   fileList,
   delFile,
   addFile,
   folderFileList,
   delfolderFile,
   upload
}