'use strict';

module.exports = function (dc) {
    const UserRole = dc.orm.define('userRole',
        {
            id: {
                field: 'id',
                type: dc.ORM.INTEGER,
                primaryKey: true,
                autoIncrement: true,
                allowNull: false
            },
            userId: {
                field: 'user_id',
                type: dc.ORM.INTEGER,
                allowNull: false
            },    
            roleId: {
                field: 'role_id',
                type: dc.ORM.INTEGER,
                allowNull: false
            },
           
        }, {
        tableName: 'user_role'
    });

    

    dc.models.UserRole = UserRole;
    return UserRole;
};