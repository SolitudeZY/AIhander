/* eslint-disable*/
'use strict';

module.exports = dc => {
   const DataTypes = dc.ORM;
   const sequelize = dc.orm;
   const AppInspection = sequelize.define("appInspection", {
      id: {
         type: DataTypes.INTEGER,
         allowNull: false,
         defaultValue: null,
         comment: null,
         primaryKey: true,
         field: "id",
         autoIncrement: true,
         unique: "app_inspection_id_uindex"
      },
      pageName:{
         type: DataTypes.STRING,
         allowNull: true,
         defaultValue: null,
         comment: null,
         primaryKey: false,
         field: "page_name",
         autoIncrement: false
      },
      loadTime: {
         type:DataTypes.STRING,
         allowNull: false,
         defaultValue: null,
         comment: null,
         primaryKey: false,
         field: "load_time",
         autoIncrement: false
      },
      pageStatus:{
         type: DataTypes.STRING,
         allowNull: true,
         defaultValue: null,
         comment: null,
         primaryKey: false,
         field: "page_status",
         autoIncrement: false
      },
      projectAppId: {
         type: DataTypes.INTEGER,
         allowNull: true,
         defaultValue: null,
         comment: null,
         primaryKey: false,
         field: "project_app_id",
         autoIncrement: false,
         references: {
            key: "id",
            model: "app"
         }
      },
      createTime: {
         type: DataTypes.DATE,
         allowNull: false,
         defaultValue: null,
         comment: null,
         primaryKey: false,
         field: "create_time",
         autoIncrement: false
      },
      screenshot: {
         type: DataTypes.STRING,
         allowNull: false,
         defaultValue: null,
         comment: "截图存储路径",
         primaryKey: false,
         field: "screenshot",
         autoIncrement: false
      },
      notedPepUserId: {
         type: DataTypes.INTEGER,
         allowNull: true,
         defaultValue: null,
         comment: "核验人员",
         primaryKey: false,
         field: "noted_pep_user_id",
         autoIncrement: false
      },
      notedTime: {
         type: DataTypes.DATE,
         allowNull: true,
         defaultValue: null,
         comment: null,
         primaryKey: false,
         field: "noted_time",
         autoIncrement: false
      },
      description: {
         type: DataTypes.STRING,
         allowNull: true,
         defaultValue: null,
         comment: null,
         primaryKey: false,
         field: "description",
         autoIncrement: false
      },
      router: {
         type: DataTypes.STRING,
         allowNull: true,
         defaultValue: null,
         comment: null,
         primaryKey: false,
         field: "router",
         autoIncrement: false
      }
   }, {
      tableName: "app_inspection",
      comment: "",
      indexes: []
   });
   dc.models.AppInspection = AppInspection;
   return AppInspection;
};
