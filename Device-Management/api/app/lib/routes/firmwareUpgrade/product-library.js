'use strict';

const productLibrary = require('../../controllers/firmwareUpgrade/product-library');

module.exports = function (app, router, opts) {
   app.fs.api.logAttr['POST/firmware-upgrade/product-library'] = { content: '新增产品', visible: true }
   router.post('/firmware-upgrade/product-library', productLibrary.postProductLibrary)

   app.fs.api.logAttr['DELETE/delFirmware-upgrade/:id/product-library'] = { content: '删除产品', visible: true }
   router.delete('/delFirmware-upgrade/:id/product-library', productLibrary.delProductLibrary)  

   app.fs.api.logAttr['PUT/firmware-upgrade/:id/product-library'] = { content: '修改产品', visible: true }
   router.put('/firmware-upgrade/:id/product-library', productLibrary.putProductLibrary)

   app.fs.api.logAttr['get/firmware-upgrade/product-library'] = { content: '获取产品', visible: true }
   router.get('/firmware-upgrade/product-library', productLibrary.getProductLibrary)

   app.fs.api.logAttr['get/firmware-upgrade/product-library/all'] = { content: '获取全部产品', visible: true }
   router.get('/firmware-upgrade/product-library/all', productLibrary.getAllProductLibrary)

   app.fs.api.logAttr['post/firmware-upgrade/sensor-list'] = { content: '获取传感器详情', visible: true }
   router.post('/firmware-upgrade/sensor-list', productLibrary.getSensors);

   app.fs.api.logAttr['post/firmware-upgrade/add-or-edit-sensor'] = { content: '新增/编辑传感器', visible: true }
   router.post('/firmware-upgrade/add-or-edit-sensor', productLibrary.addOrEditSensor);

   app.fs.api.logAttr['post/firmware-upgrade/delete-sensor'] = { content: '删除传感器', visible: true }
   router.post('/firmware-upgrade/delete-sensor', productLibrary.delSensor);

   app.fs.api.logAttr['get/firmware-upgrade/sensor-types'] = { content: '获取传感器类型', visible: true }
   router.get('/firmware-upgrade/sensor-types', productLibrary.getSensorTypes);

   app.fs.api.logAttr['post/firmware-upgrade/formula-calc-params'] = { content: '新增公式计算参数名', visible: true }
   router.post('/firmware-upgrade/formula-calc-params', productLibrary.addFormulaParamNames);

   app.fs.api.logAttr['put/firmware-upgrade/formula-calc-params/:formulaId'] = { content: '修改公式计算参数名', visible: true }
   router.put('/firmware-upgrade/formula-calc-params/:formulaId', productLibrary.updateFormulaParamNames);

   app.fs.api.logAttr['get/firmware-upgrade/formula-calc-params'] = { content: '获取公式计算参数名', visible: true }
   router.get('/firmware-upgrade/formula-calc-params', productLibrary.getFormulaParamNames);
}
