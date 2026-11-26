/* eslint-disable*/
'use strict';

module.exports = dc => {
  const DataTypes = dc.ORM;
  const sequelize = dc.orm;
  const ProjectFolder = sequelize.define("projectFolder", {
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: null,
      comment: null,
      primaryKey: true,
      field: "id",
      autoIncrement: true,
      unique: "project_folder_id_uindex"
    },
    projectId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "project_id",
      autoIncrement: false,
    },
    higherFileId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "higher_file_id",
      autoIncrement: false,
    },
    type: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "type",
      autoIncrement: false,
    },
    fileName: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "file_name",
      autoIncrement: false
    }
  }, {
    tableName: "project_folder",
    comment: "",
    indexes: []
  });
  dc.models.ProjectFolder = ProjectFolder;
  return ProjectFolder;
};