/* eslint-disable*/

'use strict';

module.exports = dc => {
   const DataTypes = dc.ORM;
   const sequelize = dc.orm;
   const SystemProblem = sequelize.define("systemProblem", {
      id: {
         type: DataTypes.INTEGER,
         allowNull: false,
         defaultValue: null,
         comment: null,
         primaryKey: true,
         field: "id",
         autoIncrement: true
      },
      type: {
         type: DataTypes.STRING,
         allowNull: true,
         defaultValue: null,
         comment: "问题类型：数据库异常、es异常、kafka异常、服务器异常、应用异常、其他",
         primaryKey: false,
         field: "type",
         autoIncrement: false
      }
   }, {
      tableName: "system_problem",
      comment: "",
      indexes: []
   });
   dc.models.SystemProblem = SystemProblem;
   return SystemProblem;
};