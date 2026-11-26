/**
 * Created by PengLing on 2017/3/27.
 */
'use strict';

module.exports = function (dc) {
    const Role = dc.orm.define('role',
        {
            id: {
                field: 'id',
                type: dc.ORM.INTEGER,
                primaryKey: true,
                autoIncrement: true,
                allowNull: false
            },
            name: {
                field: 'name',
                type: dc.ORM.STRING,
                allowNull: false
            },
            portal:{
                field: 'portal',
                type: dc.ORM.STRING,
                allowNull: false
            },
            groupId:{
                field: 'group_id',
                type: dc.ORM.INTEGER,
                allowNull: false
            }
        }, {
            tableName: 'role'
        });

    dc.models.Role = Role;

    return Role;
};
