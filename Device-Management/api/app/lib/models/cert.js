/* eslint-disable*/

'use strict';

module.exports = dc => {
  const DataTypes = dc.ORM;
  const sequelize = dc.orm;
  const Cert = sequelize.define("cert", {
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: null,
      comment: null,
      primaryKey: true,
      field: "id",
      autoIncrement: true,
      unique: "cert_id_uindex"
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
    dayStart: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "day_start",
      autoIncrement: false
    },
    dayEnd: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "day_end",
      autoIncrement: false
    },
    project: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "project",
      autoIncrement: false
    },
    remain: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: "0",
      comment: null,
      primaryKey: false,
      field: "remain",
      autoIncrement: false
    }
  }, {
    tableName: "cert",
    comment: "",
    indexes: []
  });
  dc.models.Cert = Cert;
  return Cert;
};