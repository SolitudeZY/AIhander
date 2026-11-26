'use strict';

module.exports = (dc) => {
    const AbnTypes = dc.orm.define('abnTypes',
        {
            id: {
                field: 'id',
                type: dc.ORM.INTEGER,
                primaryKey: true,
                unique: true,
                allowNull: false,
                autoIncrement: true
            },
            name: {
                field: 'name',
                type: dc.ORM.STRING,
                allowNull: false
            },
            des: {
                field: 'description',
                type: dc.ORM.STRING,
                allowNull: false
            }
        }, {
            tableName: 'abn_type'
        });

    dc.models.AbnTypes = AbnTypes;

    return AbnTypes;
};