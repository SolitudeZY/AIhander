/* eslint-disable*/
"use strict";

module.exports = (dc) => {
  const DataTypes = dc.ORM;
  const sequelize = dc.orm;

  const ParamTemplateHistory = sequelize.define(
    "paramTemplateHistory",
    {
      id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
        field: "id",
      },
      paramTemplateId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "param_template_id",
      },
      changeType: {
        type: DataTypes.STRING,
        allowNull: false,
        field: "change_type",
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
        field: "name",
      },
      productCode: {
        type: DataTypes.STRING,
        allowNull: false,
        field: "product_code",
      },
      mode: {
        type: DataTypes.STRING,
        allowNull: false,
        field: "mode",
      },
      schema: {
        type: DataTypes.JSONB,
        allowNull: true,
        field: "schema",
      },
      remark: {
        type: DataTypes.STRING,
        allowNull: true,
        field: "remark",
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: "created_at",
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: "updated_at",
      },
    },
    {
      tableName: "param_template_history",
      comment: "参数模板历史修改记录",
      indexes: [
        { fields: ["param_template_id"] },
        { fields: ["product_code"] },
        { fields: ["mode"] },
        { fields: ["created_at"] },
      ],
    },
  );

  dc.models.ParamTemplateHistory = ParamTemplateHistory;
  return ParamTemplateHistory;
};
