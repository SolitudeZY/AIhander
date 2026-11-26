'use strict';
const iotaCardManagement = require('../../controllers/analysis/iotaCardManagement');

module.exports = function (app, router, opts) {
   app.fs.api.logAttr['GET/iota/card/management'] = { content: '获取分类统计数据', visible: false };
   router.get('/iota/card/management', iotaCardManagement.getClassifiedData(opts))

   app.fs.api.logAttr['GET/iota/card'] = { content: '获取分类统计数据', visible: false };
   router.get('/iota/card', iotaCardManagement.getCardList(opts))

   app.fs.api.logAttr['POST/iota/card'] = { content: '添加或修改卡', visible: false };
   router.post('/iota/card', iotaCardManagement.addOrUpdateCard)

   app.fs.api.logAttr['DELETE/iota/deleteCard/:id'] = { content: '删除卡', visible: false };
   router.delete('/iota/deleteCard/:id', iotaCardManagement.deleteCard)

   app.fs.api.logAttr['GET/iota/card/structure'] = { content: '查询结构物列表', visible: false };
   router.get('/iota/card/structure', iotaCardManagement.getStructureList)

   app.fs.api.logAttr['POST/card/:cardNumber'] = { content: '查询单个卡号', visible: false };
   router.post('/card/:cardNumber', iotaCardManagement.findCardByCardNumber)

   app.fs.api.logAttr['POST/all/card/number'] = { content: '查询所有卡号', visible: false };
   router.post('/all/card/number', iotaCardManagement.getAllCardNumber)

   app.fs.api.logAttr['POST/cardBatchImport'] = { content: '批量导入', visible: false };
   router.post('/cardBatchImport', iotaCardManagement.batchImport)
}