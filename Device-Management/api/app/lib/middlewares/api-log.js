/**
 * Created by PengPeng on 2017/4/26.
 */
"use strict";

const moment = require("moment");
const pathToRegexp = require("path-to-regexp");

function factory(app, opts) {
  function compileLogAttr() {
    if (app.fs.api.__logAttrCompiled) return app.fs.api.__logAttrCompiled;
    const compiled = [];
    for (let prop in app.fs.api.logAttr) {
      let keys = [];
      let re = pathToRegexp(
        prop.replace(/\:[A-Za-z_\-]+\b/g, "(\\d+)"),
        keys
      );
      compiled.push({
        re,
        methodPath: prop,
        content: app.fs.api.logAttr[prop].content,
        path_pattern: prop.substring(prop.indexOf("/")),
      });
    }
    app.fs.api.__logAttrCompiled = compiled;
    return compiled;
  }
  async function sendToEsAsync(producer, payloads) {
    return new Promise((resolve, reject) => {
      producer.send(payloads, function (err) {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  async function logger(ctx, next) {
    const { path, method } = ctx;
    const ks = app.fs.kafkaService;
    if (!ks || !ks.producer) {
      await next();
      return;
    }
    const start = Date.now();

    // 等待路由处理
    await next();

    try {
      const compiled = compileLogAttr();
      let matched = compiled.find((c) => c.re.test(`${method}${path}`));
      const logAttrContent = matched ? matched.content : "";
      const path_pattern = matched ? matched.path_pattern : null;
      let parameter = null,
        parameterShow = null,
        user_id,
        _token,
        app_key;
      if (ctx.fs.api) {
        const { actionParameter, actionParameterShow, userId, token, appKey } =
          ctx.fs.api;
        parameter = actionParameter;
        parameterShow = actionParameterShow;
        user_id = userId;
        _token = token;
        app_key = appKey;
      }
      const producer = ks.producer;

      const message = {
        system: "运维中台",
        method: method,
        url: ctx.request.url,
        path_pattern: path_pattern,
        status_code: ctx.status,
        content: logAttrContent,
        ip: ctx.request.headers["x-real-ip"] || ctx.ip,
        agent: ctx.request.headers["user-agent"],
        user_id: user_id,
        username: (ctx.fs.api || {}).userName,
        log_time: moment().format("YYYY-MM-DD HH:mm:ss.SSS"),
      };

      const payloads = [
        {
          topic: `system_api_used`,
          messages: [JSON.stringify(message)],
          partition: 0,
        },
      ];

      await sendToEsAsync(producer, payloads);
    } catch (e) {
      ctx.fs.logger.error(`日志记录失败: ${e}`);
    }
  }
  return logger;
}

module.exports = factory;
