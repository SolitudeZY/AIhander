/* eslint-disable*/
'use strict';

module.exports = dc => {
   const DataTypes = dc.ORM;
   const sequelize = dc.orm;
   const AlarmPushConfig = sequelize.define("alarmPushConfig", {
      id: {
         type: DataTypes.INTEGER,
         allowNull: false,
         defaultValue: null,
         comment: null,
         primaryKey: true,
         field: "id",
         autoIncrement: true,
         unique: "alarm_push_config_id_uindex"
      },
      name: {
         type: DataTypes.STRING,
         allowNull: false,
         defaultValue: null,
         comment: null,
         primaryKey: false,
         field: "name",
         autoIncrement: false
      },
      pomsProjectId: {
         type: DataTypes.ARRAY(DataTypes.INTEGER),
         allowNull: false,
         defaultValue: null,
         comment: null,
         primaryKey: false,
         field: "poms_project_id",
         autoIncrement: false
      },
      alarmType: {
         type: DataTypes.ARRAY(DataTypes.STRING),
         allowNull: true,
         defaultValue: null,
         comment: "监听的告警类型",
         primaryKey: false,
         field: "alarm_type",
         autoIncrement: false
      },
      alarmSubType: {
         type: DataTypes.JSONB,
         allowNull: true,
         defaultValue: null,
         comment: "监听的告警类型的子类id的关联",
         primaryKey: false,
         field: "alarm_sub_type",
         autoIncrement: false
      },
      pomsStrucFactorId: {
         type: DataTypes.JSONB,
         allowNull: true,
         defaultValue: null,
         comment: "结构物与监测项id的关联",
         primaryKey: false,
         field: "poms_struc_factor_id",
         autoIncrement: false
      },
      receiverPepUserId: {
         type: DataTypes.ARRAY(DataTypes.INTEGER),
         allowNull: true,
         defaultValue: null,
         comment: "接收人id 项企",
         primaryKey: false,
         field: "receiver_pep_user_id",
         autoIncrement: false
      },
      timeType: {
         type: DataTypes.ARRAY(DataTypes.STRING),
         allowNull: true,
         defaultValue: null,
         comment: "通知时效",
         primaryKey: false,
         field: "time_type",
         autoIncrement: false
      },
      pushType: {
         type: DataTypes.ARRAY(DataTypes.STRING),
         allowNull: true,
         defaultValue: null,
         comment: "通知方式",
         primaryKey: false,
         field: "push_type",
         autoIncrement: false
      },
      createTime: {
         type: DataTypes.DATE,
         allowNull: false,
         defaultValue: null,
         comment: null,
         primaryKey: false,
         field: "create_time",
         autoIncrement: false
      },
      createUserId: {
         type: DataTypes.INTEGER,
         allowNull: false,
         defaultValue: null,
         comment: null,
         primaryKey: false,
         field: "create_user_id",
         autoIncrement: false
      },
      disable: {
         type: DataTypes.BOOLEAN,
         allowNull: false,
         defaultValue: null,
         comment: null,
         primaryKey: false,
         field: "disable",
         autoIncrement: false
      },
      strucId: {
         type: DataTypes.ARRAY(DataTypes.INTEGER),
         allowNull: false,
         defaultValue: null,
         comment: null,
         primaryKey: false,
         field: "struc_id",
         autoIncrement: false
      },
      tactics: {
         type: DataTypes.STRING,
         allowNull: true,
         defaultValue: null,
         comment: "immediately 即时 / continue 持续 /  abnormal_rate 异常率",
         primaryKey: false,
         field: "tactics",
         autoIncrement: false
      },
      tacticsParams: {
         type: DataTypes.JSONB,
         allowNull: true,
         defaultValue: null,
         comment: "推送策略 tactics 的参数",
         primaryKey: false,
         field: "tactics_params",
         autoIncrement: false
      },
      del: {
         type: DataTypes.BOOLEAN,
         allowNull: false,
         defaultValue: null,
         comment: null,
         primaryKey: false,
         field: "del",
         autoIncrement: false
      }
   }, {
      tableName: "alarm_push_config",
      comment: "",
      indexes: []
   });
   dc.models.AlarmPushConfig = AlarmPushConfig;
   return AlarmPushConfig;
};