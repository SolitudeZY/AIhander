/**
 * Created by pengpeng on 2017/7/19.
 */
'use strict';

module.exports = (dc) => {
    const Department = dc.orm.define('department',
        {
            id: {
                field: 'id',
                type: dc.ORM.INTEGER,
                primaryKey: true,
                autoIncrement: true,
                allowNull: false
            },
            orgId: {
                field: 'org',
                type: dc.ORM.INTEGER,
                allowNull: false
            },
            name: {
                field: 'name',
                type: dc.ORM.STRING,
                allowNull: false
            },
            parentId: {
                field: 'parent_id',
                type: dc.ORM.INTEGER,
                allowNull: true
            },
            sortIndex: {
                field: 'sort_index',
                type: dc.ORM.INTEGER,
                allowNull: true
            },
        }, {
        tableName: 'department'
    });

    dc.models.Department = Department;

    return Department;
};
