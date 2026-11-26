'use strict';
/*jslint node:true*/
//from koa

require('./middlewares/legacy-node-compat');
const scaffold = require('fs-web-server-scaffold');
const config = require('./config.js');

module.exports = scaffold(config);
