'use strict';
const fs = require('fs');
const path = require('path');
const es = require('elasticsearch');

let initClient = (config, opts) => {

   let logOptions;
   if (opts.dev) {
      let filename = path.join(process.cwd(), 'log', 'elasticsearch-development.log');
      let dir = path.dirname(filename);
      if (!fs.existsSync(dir)) {
         fs.mkdirSync(dir);
      }
      logOptions = {
         type: 'file',
         level: 'info',
         path: filename
      };
   } else {
      logOptions = {
         type: 'stdio',
         level: 'error'
      };
   }
   let client = new es.Client({
      host: config.rootURL,
      log: logOptions,
      apiVersion: '5.5'
   });
   return client;
};

function factory (app, opts) {
   if (opts.es) {
      try {
         app.fs.esclient = {}
         let esclient = Object.keys(opts.es).reduce((p, esmodule) => {
            console.log(`加载 ES ${esmodule}`);
            let moduleCfg = opts.es[esmodule];
            let client = initClient(moduleCfg, opts);
            p[esmodule] = client;
            p[esmodule].config = moduleCfg;
            return p;
         }, {});

         app.fs.esclient = esclient;
      } catch (error) {
         console.error(error)
         process.exit(-1);
      }
   }
}

module.exports = factory;