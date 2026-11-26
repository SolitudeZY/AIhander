/* eslint-disable*/

'use strict';

module.exports = dc => {
   const DataTypes = dc.ORM;
   const sequelize = dc.orm;
   const CertNotice = sequelize.define("certNotice", {
      id: {
         type: DataTypes.INTEGER,
         allowNull: false,
         defaultValue: null,
         comment: null,
         primaryKey: true,
         field: "id",
         autoIncrement: true,
         unique: "cert_notice_id_uindex"
      },
      certIds: {
         type: DataTypes.ARRAY(DataTypes.INTEGER),
         allowNull: true,
         defaultValue: null,
         comment: null,
         primaryKey: false,
         field: "cert_ids",
         autoIncrement: false
      },
      noticeUsers: {
         type: DataTypes.ARRAY(DataTypes.INTEGER),
         allowNull: true,
         defaultValue: null,
         comment: null,
         primaryKey: false,
         field: "notice_users",
         autoIncrement: false
      },
      remain: {
         type: DataTypes.INTEGER,
         allowNull: false,
         defaultValue: null,
         comment: null,
         primaryKey: false,
         field: "remain",
         autoIncrement: false
      },
      noticeType: {
         type: DataTypes.ARRAY(DataTypes.STRING),
         allowNull: true,
         defaultValue: null,
         comment: null,
         primaryKey: false,
         field: "notice_type",
         autoIncrement: false
      }
   }, {
      tableName: "cert_notice",
      comment: "",
      indexes: []
   });
   dc.models.CertNotice = CertNotice;
   return CertNotice;
};