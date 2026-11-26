'use strict';
const moment = require('moment');

async function factory (ctx, next) {
   try {
      const start = moment()
      await next()
      ctx.fs.logger.log(`DurationCalc: ${ctx.path} 用时 ${moment().diff(start, 'milliseconds')}`);
   } catch (error) {
      ctx.fs.logger.error(`DurationCalc, error: ${error}`);
   }
}

module.exports = factory;