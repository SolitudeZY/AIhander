'use strict';


const form = require('../../controllers/form');

module.exports = function (app, router, opts) {
   app.fs.api.logAttr['GET/unfinished'] = { content: '表单待办事项', visible: true };
   router.get('/unfinished', form.getUnfinished);

};