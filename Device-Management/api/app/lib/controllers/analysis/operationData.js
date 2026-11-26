'use strict';

const moment = require('moment')
//const db = require('../')
async function getFailureTime (ctx) {
   const sequelize = ctx.fs.dc.orm
   try {
      const res = await sequelize.query(
         `SELECT substring(to_char(w.wmonth,'yyyy-mm'),1,7) wmonth,COALESCE(e.counts,0) count
         from (  SELECT COUNT(1) counts,to_char(maintenance_record.occurrence_time, 'yyyy-mm') months
            FROM maintenance_record
            GROUP BY months
         ) e
         RIGHT JOIN
         (
            SELECT to_date(EXTRACT(YEAR FROM (current_date - INTERVAL '1 month' * (t - 1)))  ||'-'
            || EXTRACT(MONTH FROM (current_date - INTERVAL '1 month' * (t - 1))),'yyyy-mm')as wmonth
            from generate_series(1, 12) as t
         ) w on e.months = substring(to_char(w.wmonth,'yyyy-mm'),1,7)
   GROUP BY w.wmonth,e.counts
   ORDER BY w.wmonth asc`
      )

      let resList = []
      if (res.length > 0) {
         res[0].forEach((item) => {
            resList.push(item)
         })

      }
      ctx.status = 200
      ctx.body = resList
   } catch (error) {
      ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
      ctx.status = 400;
      ctx.body = {
         message: '查询故障发生时间失败'
      }
   }

}
async function getSystemAvailability (ctx) {
   const sequelize = ctx.fs.dc.orm
   try {
      const res = await sequelize.query(
         `SELECT substring(to_char(w.wmonth,'yyyy-mm'),1,7)  wmonth,
         COALESCE((w.seconds-e.counts)/w.seconds,1) ability
         from (
            SELECT to_char(maintenance_record.occurrence_time, 'yyyy-MM') months,
               SUM(maintenance_record.interrupt_duration) counts
                  FROM maintenance_record
                  where maintenance_record.occurrence_time is not null
                  GROUP BY months
               ) e
               RIGHT JOIN
               (
               SELECT to_date(EXTRACT(YEAR FROM (current_date - INTERVAL '1 month' * (n - 1)))  ||'-'|| EXTRACT(MONTH FROM (current_date - INTERVAL '1 month' * (n - 1))),'yyyy-mm') as wmonth,
                 (EXTRACT(DAY FROM (DATE_TRUNC('MONTH', current_date - INTERVAL '1 month' * (n - 1) + INTERVAL '1 MONTH') - DATE_TRUNC('MONTH', current_date - INTERVAL '1 month' * (n - 1)) - INTERVAL '1 DAY'))+1)* 24 * 60 * 60 AS seconds
                  from  generate_series(1, 12) AS n
               ) w
               on e.months = substring(to_char(w.wmonth,'yyyy-mm'),1,7)
         GROUP BY w.wmonth,w.seconds,e.counts
         ORDER BY w.wmonth asc`
      )
      let resList = []
      if (res.length > 0) {
         res[0].forEach((item) => {
            resList.push(item)
         })
      }
      ctx.status = 200
      ctx.body = resList

   } catch (error) {
      ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
      ctx.status = 400;
      ctx.body = {
         message: '查询系统可用性失败'
      }
   }
}

async function getProblemType (ctx) {
   const sequelize = ctx.fs.dc.orm
   try {
      const res = await sequelize.query(`
      SELECT n.type,COALESCE(m.count,0) count FROM (SELECT t.type,count(1)  FROM maintenance_record t GROUP BY  t.type) m
         RIGHT JOIN  (SELECT p.type FROM system_problem p) n
         ON m.type=n.type
         GROUP BY n.type,m.count
      `)
      let resList = []
      if (res.length > 0) {
         res[0].forEach((item) => {
            resList.push(item)
         })

      }
      ctx.status = 200
      ctx.body = resList
   } catch (error) {
      ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
      ctx.status = 400;
      ctx.body = {
         message: '查询故障类型失败'
      }
   }
}
async function getOperationsPersonnel (ctx) {
   const sequelize = ctx.fs.dc.orm
   const { clickHouse } = ctx.app.fs
   try {
      //查询用户id
      const res = await sequelize.query(`SELECT t.pep_user_id userId,count(1) FROM maintenance_record_execute_user t GROUP BY  pep_user_id`)
      let useList = new Set()
      if (res.length > 0) {
         res[0].forEach((item) => {
            useList.add(item.userid)
         })
      }
      let users = useList ? await clickHouse.pepEmis.query(`SELECT DISTINCT user.id AS id, "user"."name" AS name FROM user WHERE user.id IN
       (${[...useList].join(',')}, -1)`).toPromise() : []
      let resRecord = []
      if (res.length > 0) {
         res[0].forEach((item) => {
            resRecord.push(item)
         })
      }
      let mergedArray = []
      if (users.length > 0 && resRecord.length > 0) {
         mergedArray = users.map(item1 => {
            const item2 = resRecord.find(item2 => item2.userid === item1.id);
            return {
               userid: item1.id,
               name: item1.name,
               count: parseInt(item2.count)
            }
         })
      }
      ctx.status = 200
      ctx.body = mergedArray
   } catch (error) {
      ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
      ctx.status = 400;
      ctx.body = {
         message: '查询运维人员失败'
      }
   }
}

module.exports = {
   getFailureTime, getSystemAvailability, getProblemType, getOperationsPersonnel
}