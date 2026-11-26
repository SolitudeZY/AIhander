/**
 * Created by PengLing on 2017/3/27.
 */
'use strict';

module.exports = function (dc) {
    const User = dc.orm.define('user',
        {
            id: {
                field: 'id',
                type: dc.ORM.INTEGER,
                primaryKey: true,
                autoIncrement: true,
                allowNull: false
            },
            name: {
                field: 'name_present',
                type: dc.ORM.STRING,
                comment: '用户名'
            },
            username: {
                field: 'name',
                type: dc.ORM.STRING,
                allowNull: false,
                comment: '账号'
            },
            password: {
                field: 'password',
                type: dc.ORM.STRING,
                comment: '密码'
            },
            orgId: {
                field: 'org',
                type: dc.ORM.INTEGER,
                comment: '所属组织'
            },
            regTime: {
                field: 'register_time',
                type: dc.ORM.DATE,
                comment: '注册时间'
            },
            enabled: {
                field: 'enabled',
                type: dc.ORM.BOOLEAN,
                allowNull: false,
                comment: '开启状态'
            },
            orgRole: {
                field: 'institution_role',
                type: dc.ORM.STRING,
                allowNull: true,
                comment: '组织角色'
            },
            depId: {
                field: 'dep',
                type: dc.ORM.INTEGER,
                allowNull: false,
                comment: '部门'
            },
            postId: {
                field: 'post',
                type: dc.ORM.INTEGER,
                allowNull: false,
                comment: '职位'
            },
            sortIndex: {
                field: 'sort_index',
                type: dc.ORM.INTEGER,
                allowNull: true,
                comment: '排序索引'
            }
        }, {
        tableName: 'user',
        comment: '用户'
    });

    dc.models.User = User;

    return User;
};
