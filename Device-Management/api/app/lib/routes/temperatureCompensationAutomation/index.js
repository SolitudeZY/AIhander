'use strict';

const temperatureCompensationAutomation = require('../../controllers/temperatureCompensationAutomation');

module.exports = function (app, router, opts) {
   app.fs.api.logAttr['GET/get/login/verify/code'] = { content: '获取打开登陆界面的验证码', visible: true };
   router.get('/get/login/verify/code', temperatureCompensationAutomation.getcode(opts));

   app.fs.api.logAttr['POST/login/dz'] = { content: '登录地大平台', visible: true };
   router.post('/login/dz', temperatureCompensationAutomation.loginDz(opts));

   app.fs.api.logAttr['POST/find/all/records/temperature'] = { content: '查询记录', visible: true };
   router.post('/find/all/records/temperature', temperatureCompensationAutomation.findAllRecord);

   app.fs.api.logAttr['POST/del/record/temperature'] = { content: '删除记录', visible: true };
   router.post('/del/record/temperature', temperatureCompensationAutomation.delRecord);
};