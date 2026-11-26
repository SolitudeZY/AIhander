/* eslint-disable*/
'use strict';

module.exports = dc => {
   const DataTypes = dc.ORM;
   const sequelize = dc.orm;
   const ExceptionTypeCheck = sequelize.define("exceptionTypeCheck", {
      id: {
         type: DataTypes.INTEGER,
         allowNull: false,
         defaultValue: null,
         comment: null,
         primaryKey: true,
         field: "id",
         autoIncrement: true,
         unique: "exception_type_check_id_uindex"
      },
      userId: {
         type: DataTypes.INTEGER,
         allowNull: false,
         defaultValue: null,
         comment: "",
         primaryKey: false,
         field: "user_id",
         autoIncrement: false
      },
      
      typeId: {
         type: DataTypes.ARRAY(DataTypes.INTEGER),
         allowNull: true,
         defaultValue: null,
         comment: "",
         primaryKey: false,
         field: "type_id",
         autoIncrement: false
      },
   }, {
      tableName: "exception_type_check",
      comment: "",
      indexes: []
   });
   dc.models.ExceptionTypeCheck = ExceptionTypeCheck;
   return ExceptionTypeCheck;
};