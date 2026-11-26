"use strict";

module.exports = function (dc) {
  const ApiLog = dc.orm.define(
    "apiLog",
    {
      id: {
        field: "id",
        type: dc.ORM.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      logTime: {
        field: "log_time",
        type: dc.ORM.STRING,
      },
      content: {
        field: "content",
        type: dc.ORM.STRING,
      },
      url: {
        field: "url",
        type: dc.ORM.STRING,
      },
      userId: {
        field: "user_id",
        type: dc.ORM.INTEGER,
      },
      module: {
        field: "module",
        type: dc.ORM.STRING,
      },
    },
    {
      tableName: "api_log",
    }
  );

  dc.models.ApiLog = ApiLog;

  return ApiLog;
};
