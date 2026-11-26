'use strict'

module.exports = dc => {
   const DataTypes = dc.ORM

   const WorkOrderNotice = dc.orm.define(
      'workOrderNotice',
      {
         id: {
            field: 'id',
            type: dc.ORM.INTEGER,
            primaryKey: true,
            unique: true,
            allowNull: false,
            autoIncrement: true,
            unique: 'work_order_notice_pk',
         },
         planTime: {
            field: 'plan_time',
            type: DataTypes.DATE,
            allowNull: true,
            comment: '',
            primaryKey: false,
            autoIncrement: false,
         },
         createTime: {
            field: 'create_time',
            type: DataTypes.DATE,
            allowNull: true,
            comment: '',
            primaryKey: false,
            autoIncrement: false,
         },
         processingPersonnelId: {
            field: 'processing_personnel_id',
            type: DataTypes.INTEGER,
            allowNull: true,
            comment: '',
            primaryKey: false,
            autoIncrement: false,
         },
         processingPersonnelPhone: {
            field: 'processing_personnel_phone',
            type: DataTypes.STRING,
            allowNull: true,
            comment: '',
            primaryKey: false,
            autoIncrement: false,
         },
         isSend: {
            field: 'is_send',
            type: DataTypes.BOOLEAN,
            allowNull: true,
            comment: '',
            primaryKey: false,
            autoIncrement: false,
         },
         procinstId: {
            field: 'procinst_id',
            type: DataTypes.STRING,
            allowNull: true,
            comment: '',
            primaryKey: false,
            autoIncrement: false,
         },
         haveDone: {
            field: 'have_done',
            type: DataTypes.BOOLEAN,
            allowNull: true,
            comment: '',
            primaryKey: false,
            autoIncrement: false,
         },
      },
      {
         tableName: 'work_order_notice',
      }
   )

   dc.models.WorkOrderNotice = WorkOrderNotice

   return WorkOrderNotice
}
