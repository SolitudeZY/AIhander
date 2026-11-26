/* eslint-disable*/
"use strict";

module.exports = (dc) => {
  const DataTypes = dc.ORM;
  const sequelize = dc.orm;
  const CommandHistories = sequelize.define(
    "commandHistories",
    {
      id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
        field: "id",
      },
      deviceCode: {
        type: DataTypes.STRING,
        allowNull: false,
        field: "device_code",
        comment: "",
      },
      commandName: {
        type: DataTypes.STRING,
        allowNull: true,
        field: "command_name",
        comment: "",
      },
      commandContent: {
        type: DataTypes.STRING,
        allowNull: true,
        field: "command_content",
        comment: "",
      },
      responseStatus: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "response_status",
        comment: "",
      },
      responseContent: {
        type: DataTypes.STRING,
        allowNull: true,
        field: "response_content",
        comment: "",
      },
      commandTime: {
        type: DataTypes.DATE,
        allowNull: false,
        field: "command_time",
        comment: "",
      },
      responseTime: {
        type: DataTypes.DATE,
        allowNull: true,
        field: "response_time",
        comment: "",
      },
      commandDetail: {
        type: DataTypes.STRING,
        allowNull: true,
        field: "command_detail",
        comment: "",
      },
      operator: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: "operator",
        comment: "",
      },
    },
    {
      tableName: "command_histories",
      comment: "下发历史",
      indexes: [
        {
          name: "idx_command_histories_command_time",
          fields: ["command_time"],
        },
        {
          name: "idx_command_histories_device_code",
          fields: ["device_code"],
        },
        {
          name: "idx_command_histories_response_status",
          fields: ["response_status"],
        },
      ],
    }
  );
  dc.models.CommandHistories = CommandHistories;
  return CommandHistories;
};
