'use strict';

module.exports = (dc) => {
    const UserToken = dc.orm.define('userToken',
        {
            token: {
                field: 'token',
                type: dc.ORM.UUID,
                primaryKey: true,                
                allowNull: false
            },
            userInfo: {
                field: 'user_info',
                type: dc.ORM.JSONB,
                allowNull: false
            },
            expired: {
                field: 'expired',
                type: dc.ORM.DATE,
                allowNull: false
            }
        }, {
            tableName: 'user_token'
        });    

    dc.models.UserToken = UserToken;

    return UserToken;
};