'use strict';
const moment = require('moment');

async function postReportFile (ctx) {
   try {
      const { models } = ctx.fs.dc;
      const data = ctx.request.body

      await models.ReportFile.create(data)

      ctx.status = 204;
   } catch (error) {

      ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
      ctx.status = 400;
      ctx.body = {
         message: typeof error == 'string' ? error : undefined
      }
   }
}


async function getReportFile (ctx) {
   try {
      const { models } = ctx.fs.dc;
      const { limit, page, projectId } = ctx.query;
      const { userInfo } = ctx.fs.api;

      let options = {
         where: {},
         order: [['startTime', 'desc']]
      }
      if (limit || page) {
         options.limit = Number(limit)
         options.page = Number(page) * Number(limit)
      }
      if (projectId) {
         options.where.projectId = projectId
      }

      let res = await models.ReportFile.findAndCountAll(options);



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

async function delReportFile (ctx) {
   try {
      const { models } = ctx.fs.dc;
      const { id } = ctx.params

      await models.ReportFile.destroy({
         where: {
            id: id
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


async function getFactorList (ctx) {
   try {
      const { models } = ctx.fs.dc;
      const { clickHouse, utils: { anxinStrucIdRange } } = ctx.app.fs
      const { userInfo } = ctx.fs.api;
      const { pepProjectId } = ctx.query


      let anxinStruc = await anxinStrucIdRange({
         ctx, pepProjectId
      })
      let fourLocalProjectName=['haiwen','nckjql','yumenkou','sxql:温河大桥','sxql:周仓沟大桥','sxql:西沟大桥','sxql:七甲坡1号大桥','sxql:高峁梁','sxql:滹沱河大桥','sxql:临县黄河大桥','sxql:城川河大桥']
      if (anxinStruc.length) {
         let localProject='',isLocalProject=false;
         const anxinStrucIds=[];
         for(let a of anxinStruc) {
            anxinStrucIds.push(a.strucId)
            if(fourLocalProjectName.includes(a.externalPlatform)) {
               isLocalProject=true;
               localProject=a.externalPlatform;
            }
         }
         let factorProto = [1002, 1001, 4009, 2001, 3001, 3003, 4004, 5002, 2002, 4001, 4002, 4008, 4007, 1004, 4003, 1003]

         let  factor = anxinStrucIds.length ? await clickHouse.anxinyun.query(`
          SELECT 
           id,name,proto,
           t_structure_factor.structure AS structure
         FROM t_factor
         INNER JOIN t_structure_factor
          ON t_structure_factor.factor = t_factor.id
          AND t_structure_factor.structure IN (${anxinStrucIds.join(',')}, -1)
      WHERE 
       t_factor.proto IN (${factorProto.join(',')}, -1)
      `).toPromise() : []
      let localFactor=[];
      let localSensor=[];
      if(isLocalProject){
         localFactor= await clickHouse.dataAlarm
         .query(
           `select distinct SafetyFactorTypeId as id,
           SafetyFactorTypeName as name,
           FactorParent as proto,
           sensors.PlatformStructureId as structure,
           sensors.StructId
           from sensors 
             inner join factors 
             on factors.FactorID = sensors.SafetyFactorTypeId and factors.Project=sensors.Project
           where PlatformStructureId IN (${anxinStrucIds.join(',')}, -1) AND IsDeleted=false`
         )
         .toPromise();
          localSensor=  await clickHouse.dataAlarm
         .query(
           ` select distinct SensorId as id,SensorLocationDescription as name,
           SafetyFactorTypeId as factor,
           PlatformStructureId as structure
         from sensors  where 
         PlatformStructureId IN (${anxinStrucIds.join(',')}, -1) AND IsDeleted=false `).toPromise();
      }
         const factorId = factor.map(a => a.id)

         const sensor = factorId.length && anxinStrucIds.length ? await clickHouse.anxinyun.query(`
         SELECT
          id,name,factor,structure
        FROM t_sensor
         WHERE
         t_sensor.factor IN (${factorId.join(',')}, -1)
         AND t_sensor.structure IN (${anxinStrucIds.join(',')}, -1)
     `).toPromise() : []



         // WSDJC(温湿度监测) 1002
         // FSFXJC(风速风向监测)  1001
         // SSFJC(伸缩缝监测)  4009
         // SLJC(索力监测)   2001
         // YBJC(应力应变监测)   3001  3003
         // NDJC(挠度监测)    4004
         // ZDJC(振动监测)    5002
         // CLZHJC(车辆载荷监测) 2002
         // ZZWYJC(支座位移监测)  4001
         // QTPWJC(桥塔偏位监测)  4002
         // LFJC(裂缝监测)    4008
         // QDQXJC(桥墩倾斜监测)   4007
         // JGWDJC(结构温度监测)  1004
         let factorNameProtoMap = {
            '温湿度监测': '1002',
            '风速风向监测': '1001',
            '伸缩缝监测': '4009',
            '索力监测': '2001',
            '应力应变监测': '3001',
            '挠度监测': '4004',
            '振动监测': '5002',
            '车辆载荷监测': '2002',
            '支座位移监测': '4001',
            '桥塔偏位监测': '4002',
            '裂缝监测': '4008',
            '桥墩倾斜监测': '4007',
            '结构温度监测': '1004',
         };

         anxinStruc.forEach(s => {
            let newFactor = s.externalPlatform?localFactor:factor;
            s.factor = newFactor.filter(d => {
               if (d.structure == s.strucId) {
                  let newSensor = s.externalPlatform?localSensor:sensor;
                  d.sensor = newSensor.filter(f => f.factor == d.id && f.structure == s.strucId)
                  return true
               } else {
                  return false
               }

            }).map(f =>{
               if(factorNameProtoMap[f.name]){
                  return {
                     ...f,
                     proto:factorNameProtoMap[f.name]
                  }
               }else{
                  return f;
               }
            })
             if(s.externalPlatform){
               let localStructId=newFactor.find(d=>d.structure==s.strucId).StructId
               s.localStructId=localStructId
            } 
         })

         ctx.status = 200;
         ctx.body = anxinStruc
      } else {
         ctx.status = 200;
         ctx.body = []
      }
   } catch (error) {
      ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
      ctx.status = 400;
      ctx.body = {
         message: typeof error == 'string' ? error : undefined
      }
   }
}

async function postAutomaticReport (ctx) {
   try {
      const { models } = ctx.fs.dc;
      const data = ctx.request.body

      if (data.id) {
         await models.ReportAutomatic.update(data, {
            where: {
               id: data.id
            }
         })
      } else {
         await models.ReportAutomatic.create(data)
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


async function getAutomaticReport (ctx) {
   try {
      const { models } = ctx.fs.dc;
      const { limit, page, projectId, keyword } = ctx.query;
      const { userInfo } = ctx.fs.api;

      let options = {
         where: {},
         order: [['time', 'desc']]
      }
      if (limit || page) {
         options.limit = Number(limit)
         options.offset = Number(page) * Number(limit)
      }
      if (projectId) {
         options.where.projectId = { $in: String(projectId).split(',') }
      }

      if (keyword) {
         options.where.reportName = { $iLike: `%${keyword}%` }
      }

      let res = await models.ReportAutomatic.findAndCountAll(options);

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

async function delAutomaticReport (ctx) {
   try {
      const { models } = ctx.fs.dc;
      const { id } = ctx.params

      await models.ReportAutomatic.destroy({
         where: {
            id: id
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

async function postGenerateReport (ctx) {
   try {
      const { models } = ctx.fs.dc;
      const data = ctx.request.body
      // let newData={};
      // for(let ds of data.structList) {
      //    let newEquipmentPicPaths=ds.equipmentPicPaths || [];
      //    for(let dsf of ds.factors) {
      //       for(let dsfp of dsf.pointPicPath) {
      //          newEquipmentPicPaths.push(dsfp);
      //       }
      //    }
      //    ds.equipmentPicPaths=newEquipmentPicPaths;
      // }

      await models.ReportAutomatic.update(
         { runState: 'runing' },
         {
            where: {
               id: data.id
            }
         }
      )

      let res =
         // await 
         ctx.app.fs.reportGenerate.post('gen', {
            data: data
         }).then(res => {
            let state = 'error'
            if (res.code == 200) {
               state = 'done'
               models.ReportFile.create({
                  fileName: data.reportName,
                  projectId: data.projectId,
                  url: res.outLink,
                  startTime: moment().format('YYYY-MM-DD HH:mm:ss'),
                  reportType: data.reportType
               })
            }

            let upData = {
               runState: state,
            }
            if (state == 'done') {
               upData.time = moment().format('YYYY-MM-DD HH:mm:ss')
            }
            models.ReportAutomatic.update(
               upData,
               {
                  where: {
                     id: data.id
                  }
               }
            )
         }, err => {
            let b = 2
            models.ReportAutomatic.update(
               {
                  runState: 'error',
                  // time: moment().format('YYYY-MM-DD HH:mm:ss')
               },
               {
                  where: {
                     id: data.id
                  }
               }
            )
         })

      // if (res.code == 200) {
      //    await models.ReportFile.create({
      //       fileName: data.reportName,
      //       projectId: data.projectId,
      //       url: res.outLink,
      //       startTime: moment().format('YYYY-MM-DD HH:mm:ss'),
      //       reportType: data.reportType
      //    })

      //    await models.ReportAutomatic.update({ time: moment().format('YYYY-MM-DD HH:mm:ss') }, {
      //       where: {
      //          id: data.id
      //       }
      //    })
      //    ctx.status = 200;
      //    ctx.body = res.outLink
      // } else {
      //    throw '生成报表失败'
      // }
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

   getReportFile,
   postReportFile,
   delReportFile,
   getFactorList,
   postAutomaticReport,
   getAutomaticReport,
   delAutomaticReport,
   postGenerateReport
};