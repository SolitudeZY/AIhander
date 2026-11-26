/* eslint-disable*/

'use strict';

module.exports = dc => {
   const DataTypes = dc.ORM;
   const sequelize = dc.orm;
   const MaintenancePlan = sequelize.define("maintenancePlan", {
      id: {
         type: DataTypes.INTEGER,
         allowNull: false,
         defaultValue: null,
         comment: null,
         primaryKey: true,
         field: "id",
         autoIncrement: true,
         unique: "maintenance_plan_id_uindex"
      },
      missionName: {
         type: DataTypes.STRING,
         allowNull: false,
         defaultValue: null,
         comment: "任务名称",
         primaryKey: false,
         field: "mission_name",
         autoIncrement: false
      },
      remark: {
         type: DataTypes.STRING,
         allowNull: true,
         defaultValue: null,
         comment: "备注",
         primaryKey: false,
         field: "remark",
         autoIncrement: false
      },
      reason: {
         type: DataTypes.STRING,
         allowNull: true,
         defaultValue: null,
         comment: "操作/故障原因",
         primaryKey: false,
         field: "reason",
         autoIncrement: false
      },
      planFinishTime: {
         type: DataTypes.DATE,
         allowNull: true,
         defaultValue: null,
         comment: "计划完成时间",
         primaryKey: false,
         field: "plan_finish_time",
         autoIncrement: false
      },
      actualFinishTime: {
         type: DataTypes.DATE,
         allowNull: true,
         defaultValue: null,
         comment: "实际完成时间\n",
         primaryKey: false,
         field: "actual_finish_time",
         autoIncrement: false
      },
      type: {
         type: DataTypes.STRING,
         allowNull: false,
         defaultValue: null,
         comment: "分类   period 周期  /  temp 临时",
         primaryKey: false,
         field: "type",
         autoIncrement: false
      },
      state: {
         type: DataTypes.STRING,
         allowNull: true,
         defaultValue: null,
         comment: "完成状态  unfinished 未完成 / underway 进行中 / completed 已完成 / suspend 挂起暂停 / inspected 已检查",
         primaryKey: false,
         field: "state",
         autoIncrement: false
      },
      recordId: {
         type: DataTypes.ARRAY(DataTypes.INTEGER),
         allowNull: true,
         defaultValue: null,
         comment: "响应记录id",
         primaryKey: false,
         field: "record_id",
         autoIncrement: false
      }

   }, {
      tableName: "maintenance_plan",
      comment: "",
      indexes: []
   });
   dc.models.MaintenancePlan = MaintenancePlan;
   return MaintenancePlan;
};