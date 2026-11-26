/**
 * Created by zmh on 2017/7/19.
 */
'use strict';

module.exports = (dc) => {
    const Organization = dc.orm.define('organization',
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
                type: dc.ORM.STRING
            },
        }, {
            tableName: 'organization'
        });

    dc.models.Organization = Organization;

    return Organization;
};
