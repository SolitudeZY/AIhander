/* eslint-disable*/

'use strict';

module.exports = dc => {
   const DataTypes = dc.ORM;
   const sequelize = dc.orm;
   const StructureOff = sequelize.define("structureOff", {
      id: {
         type: DataTypes.INTEGER,
         allowNull: false,
         defaultValue: null,
         comment: null,
         primaryKey: true,
         field: "id",
         autoIncrement: true,
         unique: "t_structure_off_id_uindex"
      },
      structure: {
         type: DataTypes.INTEGER,
         allowNull: false,
         defaultValue: null,
         comment: "结构物id",
         primaryKey: false,
         field: "structure",
         autoIncrement: false
      },
      offline: {
         type: DataTypes.INTEGER,
         allowNull: false,
         defaultValue: null,
         comment: "离线时长（分钟）",
         primaryKey: false,
         field: "offline",
         autoIncrement: false
      },
      totnum: {
         type: DataTypes.INTEGER,
         allowNull: false,
         defaultValue: null,
         comment: "测点总数",
         primaryKey: false,
         field: "totnum",
         autoIncrement: false
      },
      offnum: {
         type: DataTypes.INTEGER,
         allowNull: false,
         defaultValue: null,
         comment: "离线个数",
         primaryKey: false,
         field: "offnum",
         autoIncrement: false
      },
      offtime: {
         type: DataTypes.STRING,
         allowNull: false,
         defaultValue: null,
         comment: "最后数据时间",
         primaryKey: false,
         field: "offtime",
         autoIncrement: false
      },
      state: {
         type: DataTypes.INTEGER,
         allowNull: false,
         defaultValue: null,
         comment: "数据状态( 0:有效，1:无效)",
         primaryKey: false,
         field: "state",
         autoIncrement: false
      }
   }, {
      tableName: "t_structure_off",
      comment: "",
      indexes: []
   });
   dc.models.StructureOff = StructureOff;
   return StructureOff;
};