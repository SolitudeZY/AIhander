/* eslint-disable*/
'use strict';

module.exports = dc => {
  const DataTypes = dc.ORM;
  const sequelize = dc.orm;
  const ProjectApp = sequelize.define("projectApp", {
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: null,
      comment: null,
      primaryKey: true,
      field: "id",
      autoIncrement: true,
      unique: "project_app_id_uindex"
    },
    projectId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "project_id",
      autoIncrement: false,
      references: {
        key: "id",
        model: "projectCorrelation"
      }
    },
    appId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "app_id",
      autoIncrement: false,
      references: {
        key: "id",
        model: "app"
      }
    }
  }, {
    tableName: "project_app",
    comment: "",
    indexes: []
  });
  dc.models.ProjectApp = ProjectApp;
  return ProjectApp;
};