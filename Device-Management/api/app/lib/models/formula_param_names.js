/* eslint-disable*/
'use strict';

module.exports = dc => {
  const DataTypes = dc.ORM;
  const sequelize = dc.orm;
  const FormulaParamNames = sequelize.define("formulaParamNames", {
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
      field: "id"
    },
    formulaId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "formula_id"
    },
    sensorMappingId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "sensor_mapping_id",
      references: {
        model: "sensor_type_model_mapping",
        key: "id"
      },
      onUpdate: "CASCADE",
      onDelete: "CASCADE"
    },
    param1Name: {
      type: DataTypes.STRING(20),
      allowNull: true,
      field: "param1_name"
    },
    param2Name: {
      type: DataTypes.STRING(20),
      allowNull: true,
      field: "param2_name"
    },
    param3Name: {
      type: DataTypes.STRING(20),
      allowNull: true,
      field: "param3_name"
    },
    param4Name: {
      type: DataTypes.STRING(20),
      allowNull: true,
      field: "param4_name"
    }
  }, {
    tableName: "formula_param_names",
    comment: "公式计算参数名称表",
    indexes: [
      {
        name: "formula_param_names_mapping_formula_uindex",
        unique: true,
        fields: ["sensor_mapping_id", "formula_id"]
      }
    ]
  });
  dc.models.FormulaParamNames = FormulaParamNames;
  return FormulaParamNames;
};
