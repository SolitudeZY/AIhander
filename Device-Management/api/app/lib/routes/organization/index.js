'use strict';
const organization = require('../../controllers/organization');

module.exports = function (app, router, opts) {
   app.fs.api.logAttr['GET/organization/deps'] = { content: '获取全部部门及其下用户', visible: true };
   router.get('/organization/deps', organization.allDeps);

   app.fs.api.logAttr['GET/organization/users'] = { content: '获取全部用户', visible: true };
   router.get('/organization/users', organization.allUsers);

   app.fs.api.logAttr['POST/organization/user'] = { content: '编辑成员', visible: true };
   router.post('/organization/user', organization.editUser);

   app.fs.api.logAttr['PUT/organization/user/:pomsUserId'] = { content: '修改成员状态', visible: true };
   router.put('/organization/user/:pomsUserId', organization.putUser);

   app.fs.api.logAttr['DELETE/organization/admin/:pomsUserId'] = { content: '删除管理员', visible: true };
   router.delete('/organization/admin/:pomsUserId', organization.delAdmin);

   app.fs.api.logAttr['GET/organization/user'] = { content: '获取成员列表', visible: true };
   router.get('/organization/user', organization.user);


   /**
    * @api {GET} resource 查询所有权限码.
    * @apiVersion 1.0.0
    * @apiGroup Org
    */
    app.fs.api.logAttr['GET/resource'] = { content: '查询所有权限码', visible: true };
    router.get('resource', organization.getResource);
    /**
     * @api {GET} user/resource 查询用户权限.
     * @apiVersion 1.0.0
     * @apiGroup Org
     */
    app.fs.api.logAttr['GET/user/resource'] = { content: '查询用户权限', visible: true };
    router.get('user/resource', organization.getUserResource);

    /**
     * @api {POST} user/resource 更新用户权限.
     * @apiVersion 1.0.0
     * @apiGroup Org
     */
    app.fs.api.logAttr['POST/user/resource'] = { content: '更新用户权限', visible: true };
    router.post('user/resource', organization.updateUserRes);
};
