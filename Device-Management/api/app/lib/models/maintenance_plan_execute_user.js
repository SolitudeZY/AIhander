/* eslint-disable*/

'use strict';

module.exports = dc => {
  const DataTypes = dc.ORM;
  const sequelize = dc.orm;
  const MaintenancePlanExecuteUser = sequelize.define("maintenancePlanExecuteUser", {
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: null,
      comment: null,
      primaryKey: true,
      field: "id",
      autoIncrement: true,
      unique: "maintenance_plan_execute_user_id_uindex"
    },
    maintenancePlanId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "maintenance_plan_id",
      autoIncrement: false,
      references: {
        key: "id",
        model: "maintenancePlan"
      }
    },
    pepUserId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: null,
      comment: "项企用户id",
      primaryKey: false,
      field: "pep_user_id",
      autoIncrement: false
    }
  }, {
    tableName: "maintenance_plan_execute_user",
    comment: "",
    indexes: []
  });
  dc.models.MaintenancePlanExecuteUser = MaintenancePlanExecuteUser;
  return MaintenancePlanExecuteUser;
};