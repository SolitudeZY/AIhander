/* eslint-disable*/

'use strict';

module.exports = dc => {
  const DataTypes = dc.ORM;
  const sequelize = dc.orm;
  const FormDataTable = sequelize.define("formDataTable", {
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: null,
      comment: "id",
      primaryKey: true,
      field: "id",
      autoIncrement: true
    },
    projectId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null,
      comment: "项目id",
      primaryKey: false,
      field: "project_id",
      autoIncrement: false
    },
    formname: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null,
      comment: "工单名称",
      primaryKey: false,
      field: "formname",
      autoIncrement: false
    },
    startTime: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
      comment: "开始时间",
      primaryKey: false,
      field: "start_time",
      autoIncrement: false
    },
    endTime: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
      comment: "结束时间",
      primaryKey: false,
      field: "end_time",
      autoIncrement: false
    },
    state: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "state",
      autoIncrement: false
    }
  }, {
    tableName: "form_data_table",
    comment: "",
    indexes: []
  });
  dc.models.FormDataTable = FormDataTable;
  return FormDataTable;
};