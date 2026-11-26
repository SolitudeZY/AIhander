'use strict';

 module.exports = (dc) => {
     const TypePost = dc.orm.define('typePost',
         {
             id: {
                 field: 'id',
                 type: dc.ORM.INTEGER,
                 primaryKey: true,
                 allowNull: false
             },
             name: {
                 field: 'name',
                 type: dc.ORM.STRING,
                 allowNull: false,
             },
             allowSetNum: {
                 field: 'allow_set_num',
                 type: dc.ORM.INTEGER,
                 allowNull: false,
             },
             code: {
                field: 'code',
                type: dc.ORM.STRING,
                allowNull: false,
             }
         }, {
             tableName: 'type_post'
         });
 
     dc.models.TypePost = TypePost;
 
     return TypePost;
 };