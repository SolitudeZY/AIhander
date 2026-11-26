'use strict';

module.exports = function (dc) {
    const RoleDeviceModel = dc.orm.define('roleDeviceModel',
        {
            id: {
                field: 'id',
                type: dc.ORM.INTEGER,
                primaryKey: true,
                autoIncrement: true,
                allowNull: false
            },
            deviceModelId: {
                field: 'device_model_id',
                type: dc.ORM.INTEGER,
                allowNull: false
            },
            roleId: {
                field: 'role_id',
                type: dc.ORM.INTEGER,
                allowNull: false
            },
        }, {
        tableName: 'role_device_model'
    });

    dc.models.RoleDeviceModel = RoleDeviceModel;
    return RoleDeviceModel;
};