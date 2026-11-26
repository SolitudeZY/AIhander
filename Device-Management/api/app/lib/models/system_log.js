"use strict";

module.exports = function (dc) {
  const SystemLog = dc.orm.define(
    "systemLog",
    {
      id: {
        field: "id",
        type: dc.ORM.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      logTime: {
        field: "log_time",
        type: dc.ORM.DATE,
        comment: "日志创建时间",
      },
      content: {
        field: "content",
        type: dc.ORM.STRING,
        comment: "日志内容",
      },
      url: {
        field: "url",
        type: dc.ORM.STRING,
        comment: "请求URL",
      },
      userId: {
        field: "user_id",
        type: dc.ORM.INTEGER,
        comment: "用户ID",
      },
      module: {
        field: "module",
        type: dc.ORM.STRING,
        comment: "模块名称",
      },
    },
    {
      tableName: "system_log",
    }
  );

  dc.models.SystemLog = SystemLog;

  return SystemLog;
};
