'use strict';

const serverInfoMaintenanceRecord = require('../../controllers/serverInfoMaintenanceRecord');

module.exports = function (app, router, opts) {
   app.fs.api.logAttr['GET/serverInfoMaintenanceRecord'] = { content: '获取服务器维护记录列表', visible: true };
   router.get('/serverInfoMaintenanceRecord', serverInfoMaintenanceRecord.getServerInfoMaintenanceRecord)

   app.fs.api.logAttr['POST/serverInfoMaintenanceRecord'] = { content: '编辑服务器维护记录列表', visible: true };
   router.post('/serverInfoMaintenanceRecord', serverInfoMaintenanceRecord.editServerInfoMaintenanceRecord)

   app.fs.api.logAttr['DELETE/serverInfoMaintenanceRecord/:id'] = { content: '删除服务器维护记录列表', visible: true };
   router.del('/serverInfoMaintenanceRecord/:id', serverInfoMaintenanceRecord.delServerInfoMaintenanceRecord)
}



