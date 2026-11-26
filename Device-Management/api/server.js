/**
 * Created by rain on 2016/1/25.
 */

'use strict';
/*jslint node:true*/
//from koa

require('./app/lib/service/legacyNodeCompat');
const scaffold = require('fs-web-server-scaffold');
const config = require('./config');
const setupTerminalGateway = require('./app/lib/service/terminalGateway');
const setupAgentGateway = require('./app/lib/service/agentGateway');
const { AgentPlatform } = require('./app/lib/service/agentPlatform');
const { QiniuAgentStorage } = require('./app/lib/service/agentFileStorage');
const fileStorage = config.edgeAgentStorage ? new QiniuAgentStorage(config.edgeAgentStorage) : null;

// Install before scaffold creates its HTTP callback (which snapshots middleware).
config.mws.push({ entry: require('./app/lib/service/agentDownloads') });
const app = scaffold(config);
app.fs.agentPlatform = new AgentPlatform(app, { fileStorage, aiReview: config.aiReview });
setupAgentGateway(app);
setupTerminalGateway(app);

module.exports = app;
