/* eslint-disable */

'use strict';

module.exports = dc => {
  const DataTypes = dc.ORM;
  const sequelize = dc.orm;
  const Formula = sequelize.define("formula", {
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      autoIncrement: false,
      comment: "公式ID",
      field: "id"
    },
    expression: {
      type: DataTypes.STRING(500),
      allowNull: false,
      comment: "公式表达式",
      field: "expression"
    }
  }, {
    tableName: "formula",
    comment: "公式表",
    indexes: []
  });
  dc.models.Formula = Formula;
  return Formula;
};