/* eslint-disable*/

'use strict';

module.exports = dc => {
  const DataTypes = dc.ORM;
  const sequelize = dc.orm;
  const Workorder = sequelize.define("workorder", {
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: null,
      comment: null,
      primaryKey: true,
      field: "id",
      autoIncrement: true,
      unique: "workorder_id_uindex"
    },
    storyId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: null,
      comment: "项企工作流的 history_id 实例id",
      primaryKey: false,
      field: "story_id",
      autoIncrement: false,
      unique: "workorder_story_id_uindex"
    },
    pomsProjectId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null,
      comment: "运维的项目的id",
      primaryKey: false,
      field: "poms_project_id",
      autoIncrement: false,
      references: {
        key: "id",
        model: "projectCorrelation"
      }
    },
    expectTime: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
      comment: "期望解决时间",
      primaryKey: false,
      field: "expect_time",
      autoIncrement: false
    },
    createTime: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
      comment: "创建时间",
      primaryKey: false,
      field: "create_time",
      autoIncrement: false
    },
    completeTime: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
      comment: "解决时间",
      primaryKey: false,
      field: "complete_time",
      autoIncrement: false
    },
    state: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null,
      comment: "状态",
      primaryKey: false,
      field: "state",
      autoIncrement: false
    },
    problemType: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null,
      comment: "问题类型",
      primaryKey: false,
      field: "problem_type",
      autoIncrement: false
    },
    solution: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null,
      comment: "解决方案",
      primaryKey: false,
      field: "solution",
      autoIncrement: false
    }
  }, {
    tableName: "workorder",
    comment: "",
    indexes: []
  });
  dc.models.Workorder = Workorder;
  return Workorder;
};