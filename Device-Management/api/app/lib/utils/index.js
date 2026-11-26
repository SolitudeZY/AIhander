'use strict';

const path = require('path');
const fs = require('fs');

module.exports = async function (app, opts) {
   fs.readdirSync(__dirname).forEach((filename) => {
      if (!['index.js'].some(f => filename == f)) {
         if (opts.edgeAgentLocal && ['helper.js', 'alarmHandle.js'].includes(filename)) return;
         const utils = require(`./${filename}`)(app, opts)
         console.log(`载入 ${filename} 工具集成功`);
         app.fs.utils = {
            ...app.fs.utils,
            ...utils,
         }
      }
   });
};
