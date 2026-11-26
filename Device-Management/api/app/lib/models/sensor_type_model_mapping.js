/* eslint-disable*/
'use strict';

module.exports = dc => {
   const DataTypes = dc.ORM;
   const sequelize = dc.orm;
   const SensorTypeModelMapping = sequelize.define("sensorTypeModelMapping", {
      id: {
         type: DataTypes.INTEGER,
         allowNull: false,
         primaryKey: true,
         autoIncrement: true,
         field: "id",
      },
      sensorType: {
         type: DataTypes.STRING(100),
         allowNull: false,
         field: "sensor_type",
         comment: "传感器类型",
      },
      axyModel: {
         type: DataTypes.STRING(255),
         allowNull: false,
         field: "axy_model",
         comment: "安心云型号",
      },
      protocolNo: {
         type: DataTypes.STRING(100),
         allowNull: false,
         field: "protocol_no",
         comment: "传感器协议号",
      },
      formulaIds: {
         type: DataTypes.ARRAY(DataTypes.INTEGER),
         allowNull: true,
         field: 'formula_ids',
         comment: '公式id数组',
      },
      collectorId: {
         type: DataTypes.BIGINT,
         allowNull: true,
         field: 'collector_id',
         comment: '采集仪id'
      },
      opsModel: {
         type: DataTypes.STRING(255),
         allowNull: false,
         field: 'ops_model',
         comment: '运维中台型号',
         defaultValue: ''
      },
      sensorName: {
         type: DataTypes.STRING(255),
         allowNull: false,
         field: 'sensor_name',
         comment: '传感器名称',
         defaultValue: ''
      },
      manufacturer: {
         type: DataTypes.STRING(255),
         allowNull: false,
         field: 'manufacturer',
         comment: '厂商',
         defaultValue: ''
      },
      picture: {
         type: DataTypes.STRING(255),
         allowNull: false,
         field: 'picture',
         comment: '图片',
         defaultValue: ''
      }
   }, {
      tableName: "sensor_type_model_mapping",
      comment: "传感器型号对应表",
      indexes: []
   });
   dc.models.SensorTypeModelMapping = SensorTypeModelMapping;
   return SensorTypeModelMapping;
};