'use strict';

const weather = require('../../controllers/weather');

module.exports = function (app, router, opts) {
   app.fs.api.logAttr['GET/weather/realtime'] = { content: '获取实时天气', visible: true };
   router.get('/weather/realtime', weather.realtime(opts));
};