'use strict';

const moment = require('moment');
const request = require('superagent');
function getcode (opts){
   const {tempApi} = opts
   return async function getcode (ctx) {
      try {
         const res=  await request.get(tempApi+'/get/code')
         ctx.status=200
         ctx.body = res.body
      } catch (error) {
         ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
         ctx.status = 400;
         ctx.body = {
            message: typeof error == 'string' ? error : undefined
         }
      }
   }
}

function loginDz(opts){
const {tempApi} = opts
 return   async function loginDz (ctx) {
      try {
         const {captchaText,sessionId, fileUrl,
            createBy,
            state,
            createAt,
            fileData}=ctx.request.body
         const res=  await request.post(tempApi+'/login/dz').send({
            captchaText,
            sessionId,
            fileUrl,
            fileData,
            createBy,
            state,
            createAt
         })
         ctx.status=200
         ctx.body = res.body
      } catch (error) {
         ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
         ctx.status = 400;
         ctx.body = {
            message: typeof error == 'string' ? error : undefined
         }
      }
   }
}

async function findAllRecord (ctx) {
   try {
      const {start,end,pageSize,page}=ctx.request.body
      let findOption={
         where:{
         },
         order:[['createAt','desc']]
      }
      if(start&&end){
         findOption.where.createAt={
            $between:[moment(start).format('YYYY-MM-DD'),moment(end).format('YYYY-MM-DD')]
         }
      }
      if(pageSize){
         findOption.limit=Number(pageSize)
      }
      if((page+1)&&pageSize){
         findOption.offset=(Number(page)-1)*Number(pageSize)
      }
      const res=await ctx.fs.dc.models.TemperatureAuto.findAndCountAll(findOption);
      ctx.status=200
      ctx.body = res
   } catch (error) {
      ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
      ctx.status = 400;
      ctx.body = {
         message: typeof error == 'string' ? error : undefined
      }
   }
}
async function delRecord(ctx){
   let transaction=null;
   try {
      transaction=await ctx.fs.dc.orm.transaction();
      const {id}=ctx.request.body
      if(!id){
         throw 'id不能为空'
      }
      await ctx.fs.dc.models.TemperatureAutoDetail.destroy({where:{temperatureAutoId:id},transaction})
      await ctx.fs.dc.models.TemperatureAuto.destroy({where:{id},transaction})
      await transaction.commit();
      ctx.status=200
   } catch (error) {
      await transaction.rollback();
      ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
      ctx.status = 400;
      ctx.body = {
         message: typeof error == 'string' ? error : undefined
      }
   }
}
module.exports = {
   getcode,
   loginDz,
   findAllRecord,
   delRecord
};