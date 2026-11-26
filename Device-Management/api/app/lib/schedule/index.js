'use strict';

const fs = require('fs');
const nodeSchedule = require('node-schedule');

// 将定时任务汇集未来可根据需要选取操作
module.exports = async function (app, opts) {

   const scheduleInit = ({
      interval, immediate, proRun, disabled
   }, callback) => {
      if (disabled) {
         return;
      }
      if (proRun && opts.dev) {
         return;
      }
      const j = nodeSchedule.scheduleJob(interval, callback);
      if (immediate && (!proRun || (proRun && !opts.dev))) {
         setTimeout(callback, 0)
      }
      return j;
   }

   app.fs.scheduleInit = scheduleInit

   fs.readdirSync(__dirname).forEach((filename) => {
      if (!['index.js'].some(f => filename == f)) {
         const scheduleList = require(`./${filename}`)(app, opts)
         for (let k of Object.keys(scheduleList)) {
            console.info(`定时任务 ${k} 启动`);
         }
         app.fs.schedule = {
            ...app.fs.schedule,
            ...scheduleList,
         }
      }
   });
};
