/* eslint-disable*/

'use strict';

module.exports = dc => {
   const DataTypes = dc.ORM;
   const sequelize = dc.orm;
   const ProjectGroup = sequelize.define("projectGroup", {
      id: {
         type: DataTypes.INTEGER,
         allowNull: false,
         defaultValue: null,
         comment: null,
         primaryKey: true,
         field: "id",
         autoIncrement: true,
         unique: "project_group_id_uindex"
      },
      name: {
         type: DataTypes.STRING,
         allowNull: true,
         defaultValue: null,
         comment: null,
         primaryKey: false,
         field: "name",
         autoIncrement: false
      },
      pomsProjectIds: {
         type: DataTypes.ARRAY(DataTypes.INTEGER),
         allowNull: false,
         defaultValue: null,
         comment: "运维项目id",
         primaryKey: false,
         field: "poms_project_ids",
         autoIncrement: false
      },
      pomsUserId: {
         type: DataTypes.INTEGER,
         allowNull: false,
         defaultValue: null,
         comment: null,
         primaryKey: false,
         field: "poms_user_id",
         autoIncrement: false,
         references: {
            key: "id",
            model: "user"
         }
      },
      percentage: {
         type: DataTypes.INTEGER,
         allowNull: true,
         defaultValue: null,
         comment: null,
         primaryKey: false,
         field: "percentage",
         autoIncrement: false,
      },
   }, {
      tableName: "project_group",
      comment: "",
      indexes: []
   });
   dc.models.ProjectGroup = ProjectGroup;
   return ProjectGroup;
};