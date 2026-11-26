'use strict';

const equipment = require('../../controllers/equipment');

module.exports = function (app, router, opts) {
   app.fs.api.logAttr['GET/equipment'] = { content: '获取设备维护记录', visible: true };
   router.get('/equipment', equipment.getEquipment);

   app.fs.api.logAttr['POST/equipment'] = { content: '编辑或者新增设备维护记录', visible: true };
   router.post('/equipment', equipment.editEquipment);

   app.fs.api.logAttr['DELETE/equipment/:id'] = { content: '删除设备维护记录', visible: true };
   router.delete('/equipment/:id', equipment.delEquipment);

}