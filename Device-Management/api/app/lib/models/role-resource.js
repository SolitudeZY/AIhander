/**
 * Created by PengLing on 2017/3/27.
 */
'use strict';

module.exports = function (dc) {
    const RoleResource = dc.orm.define('roleResource',
        {
            id: {
                field: 'id',
                type: dc.ORM.INTEGER,
                primaryKey: true,
                autoIncrement: true,
                allowNull: false
            },
            roleId: {
                field: 'role',
                type: dc.ORM.INTEGER
            },
            resourceId: {
                field: 'resource',
                type: dc.ORM.STRING
            }
        }, {
            tableName: 'role_resource'
        });

    dc.models.RoleResource = RoleResource;

    return RoleResource;
};
