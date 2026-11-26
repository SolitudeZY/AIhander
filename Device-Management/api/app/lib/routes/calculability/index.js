'use strict';

const calculability = require('../../controllers/calculability');

module.exports = function (app, router, opts) {
   app.fs.api.logAttr['GET/calculability'] = { content: '获取系统可用性', visible: true };
   router.get('/calculability', calculability.getCalculability);

}