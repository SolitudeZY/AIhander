/* eslint-disable*/
"use strict";

module.exports = (dc) => {
  const DataTypes = dc.ORM;
  const sequelize = dc.orm;

  const ParamTemplate = sequelize.define(
    "paramTemplate",
    {
      id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
        field: "id",
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
        field: "name",
        comment: "模板名称",
      },
      productCode: {
        type: DataTypes.STRING,
        allowNull: false,
        field: "product_code",
        comment: "产品编码",
      },
      schema: {
        type: DataTypes.JSONB,
        allowNull: true,
        field: "schema",
        comment: "模板结构(JSON)",
      },
      remark: {
        type: DataTypes.STRING,
        allowNull: true,
        field: "remark",
        comment: "备注",
      },
      mode: {
        type: DataTypes.STRING,
        allowNull: true,
        field: "mode",
        comment:
          "模板模式: without_cd（设备参数配置） | with_cd（下发指令） | original（原始组合既有 BF + CD + SER 的完整模板）",
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: "created_at",
        comment: "创建时间",
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: DataTypes.NOW,
        field: "updated_at",
        comment: "更新时间",
      },
      deleted:{
        type:DataTypes.BOOLEAN,
        allowNull:false,
        defaultValue:false,
        field:"deleted",
        comment:"是否删除（采用逻辑删除，方便后续可追溯）"
      }
    },
    {
      tableName: "param_template",
      comment: "设备参数模板",
      indexes: [
        { fields: ["product_code"] },
        { fields: ["name"] },
        { fields: ["mode"] },
        { fields: ["product_code", "mode"] },
      ],
    },
  );

  dc.models.ParamTemplate = ParamTemplate;
  return ParamTemplate;
};
