/**
 * Created by PengLing on 2017/3/27.
 */
"use strict";

const pathToRegexp = require("path-to-regexp");
const util = require("util");
const moment = require("moment");

class ExcludesUrls {
  constructor(opts) {
    this.allUrls = undefined;
    this.reload(opts);
  }

  sanitizePath(path) {
    if (!path) return "/";
    const p =
      "/" +
      path
        .replace(/^\/+/i, "")
        .replace(/\/+$/, "")
        .replace(/\/{2,}/, "/");
    return p;
  }

  reload(opts) {
    // load all url
    if (!this.allUrls) {
      this.allUrls = opts;
      let that = this;
      this.allUrls.forEach(function (url, i, arr) {
        if (typeof url === "string") {
          url = { p: url, o: "*" };
          arr[i] = url;
        }
        const keys = [];
        let eachPath = url.p;
        url.p =
          !eachPath || eachPath === "(.*)" || util.isRegExp(eachPath)
            ? eachPath
            : that.sanitizePath(eachPath);
        url.pregexp = pathToRegexp(eachPath, keys);
      });
    }
  }

  isExcluded(path, method) {
    return this.allUrls.some(function (url) {
      return (
        !url.auth &&
        url.pregexp.test(path) &&
        (url.o === "*" || url.o.indexOf(method) !== -1)
      );
    });
  }
}

/**
 * 判断Url是否不鉴权
 * @param {*} opts {exclude: [*] or []}，'*'或['*']:跳过所有路由; []:所有路由都要验证
 * @param {*} path 当前request的path
 * @param {*} method 当前request的method
 */
let excludeOpts = [];
let isPathExcluded = function (opts, path, method) {
  let excludeAll = Boolean(
    opts.exclude && opts.exclude.length && opts.exclude[0] == "*",
  );
  let excludes = null;
  if (!excludeAll) {
    if (excludeOpts.length == 0) {
      excludeOpts = opts.exclude || [];
      excludeOpts.push({ p: "/auth/login", o: "POST" });
      excludeOpts.push({ p: "/auth/logout", o: "POST" });
      excludeOpts.push({ p: "/auth/register", o: "POST" });
      // Native device endpoints authenticate with device identity inside the
      // Agent platform; they cannot use the browser's user login token.
      excludeOpts.push({ p: "/api/v1/agents/register", o: "POST" });
      excludeOpts.push({ p: "/api/v1/agents/files/:id", o: "GET" });

      excludeOpts.push({
        p: "/device-manage-platform/:deviceCodes/devices",
        o: "PUT",
      });
      excludeOpts.push({ p: "/device-manage-platform/sub-devices", o: "POST" });
      excludeOpts.push({
        p: "/device-manage-platform/:id/sub-devices",
        o: "PUT",
      });
      excludeOpts.push({
        p: "/device-manage-platform/:id/sub-devices",
        o: "DELETE",
      });
      excludeOpts.push({ p: "/device-manage-platform/sub-devices", o: "GET" });

      excludeOpts.push({ p: "/firmware", o: "GET" });
      excludeOpts.push({ p: "/firmware-upgrade/product-library", o: "GET" });
      excludeOpts.push({
        p: "/firmware-upgrade/:id/product-library",
        o: "PUT",
      });
      excludeOpts.push({
        p: "/delFirmware-upgrade/:id/product-library",
        o: "DELETE",
      });
      excludeOpts.push({ p: "/firmware-upgrade/product-library", o: "POST" });

      excludeOpts.push({
        p: "/device-manage-platform/command-histories",
        o: "GET",
      });
      excludeOpts.push({
        p: "/device-manage-platform/diagnostic-histories",
        o: "GET",
      });
      excludeOpts.push({
        p: "/device-manage-platform/sensor-type-model-mapping",
        o: "GET",
      });
      excludeOpts.push({
        p: "/device-manage-platform/devices-code-model-mapping",
        o: "GET",
      });
      excludeOpts.push({ p: "/device-manage-platform/issue/batch", o: "POST" });
      excludeOpts.push({
        p: "/device-manage-platform/issue_sensor/:deviceCode",
        o: "POST",
      });
      excludeOpts.push({ p: "/device-manage-platform/ota/batch", o: "POST" });
      excludeOpts.push({ p: "/issue/clear_all_channels", o: "POST" });
      excludeOpts.push({ p: "/issue/overall", o: "POST" });
      excludeOpts.push({
        p: "/device-manage-platform/ota/sub-device-data",
        o: "POST",
      });
      excludeOpts.push({
        p: "/device-manage-platform/ota/sub-device-config-formula",
        o: "GET",
      });

      excludeOpts.push({ p: "/deviceType", o: "GET" });
      excludeOpts.push({ p: "/firmware/deviceMetaNameDict", o: "GET" });
      excludeOpts.push({ p: "/firmware/versionDict", o: "GET" });
      excludeOpts.push({ p: "/firmware-upgrade/sensor-list", o: "POST" });
      excludeOpts.push({ p: "/firmware-upgrade/sensor-types", o: "GET" });
      excludeOpts.push({
        p: "/firmware-upgrade/add-or-edit-sensor",
        o: "POST",
      });
      excludeOpts.push({ p: "/firmware-upgrade/delete-sensor", o: "POST" });
      excludeOpts.push({ p: "/deleteFirmware", o: "DELETE" });
      excludeOpts.push({
        p: "/device-manage-platform/sub-devices/by-device-code",
        o: "GET",
      });

      excludeOpts.push({ p: "/organization/users", o: "GET" });

      excludeOpts.push({ p: "/system/create/logs", o: "POST" });
    }
    excludes = new ExcludesUrls(excludeOpts);
  }
  let excluded = excludeAll || excludes.isExcluded(path, method);
  return excluded;
};

let authorizeToken = async function (ctx, token) {
  let rslt = null;
  const tokenFormatRegexp =
    /^(\{{0,1}([0-9a-fA-F]){8}-([0-9a-fA-F]){4}-([0-9a-fA-F]){4}-([0-9a-fA-F]){4}-([0-9a-fA-F]){12}\}{0,1})$/g;
  if (token && tokenFormatRegexp.test(token)) {
    try {
      const cacheKey = `auth:token:${token}`;
      let cached = null;
      try {
        const cacheStr = await ctx.redis.get(cacheKey);
        cached = cacheStr ? JSON.parse(cacheStr) : null;
      } catch (e) {
        ctx.fs.logger.log("[AUTH] Redis read error:", e.message);
      }

      let authorizeRes = null;
      if (
        cached &&
        cached.expired &&
        moment().valueOf() <= moment(cached.expired).valueOf()
      ) {
        authorizeRes = cached;
      } else {
        authorizeRes = await ctx.fs.dc.models.UserToken.findOne({
          where: {
            token: token,
          },
        });
      }

      // 检查Token是否存在
      if (!authorizeRes) {
        ctx.fs.logger.log("[AUTH] Token not found in database:", token);
        return null;
      }

      const { userInfo, expired } = authorizeRes;

      // 检查Token是否过期
      if (!expired || moment().valueOf() > moment(expired).valueOf()) {
        ctx.fs.logger.log(
          "[AUTH] Token expired:",
          token,
          "expired at:",
          expired,
        );
        return null;
      }

      // 检查用户信息是否存在
      if (!userInfo) {
        ctx.fs.logger.log("[AUTH] User info not found in token data");
        return null;
      }

      // 检查用户ID是否存在
      if (!userInfo.id) {
        ctx.fs.logger.log("[AUTH] User ID not found in userInfo:", userInfo);
        return null;
      }

      rslt = {
        authorized: true, // Token存在且未过期即表示已授权
        resources: (userInfo || {}).resources || [],
      };
      ctx.fs.api.userId = userInfo.id;
      ctx.fs.api.userInfo = userInfo;
      ctx.fs.api.token = token;

      // 写入缓存
      try {
        const ttl = Math.max(
          1,
          Math.floor((moment(expired).valueOf() - moment().valueOf()) / 1000),
        );
        await ctx.redis.setex(
          cacheKey,
          ttl,
          JSON.stringify({ userInfo, expired }),
        );
      } catch (e) {
        ctx.fs.logger.log("[AUTH] Redis write error:", e.message);
      }

      ctx.fs.logger.log(
        "[AUTH] Token validation successful for user:",
        userInfo.id,
        "username:",
        userInfo.username,
      );
    } catch (err) {
      const { error } = err.response || {};
      ctx.fs.logger.log(
        "[AUTH] Token validation error:",
        (error || {}).message ||
          err.message ||
          `Error validating token ${token}`,
      );
    }
  } else {
    ctx.fs.logger.log("[AUTH] Invalid token format:", token);
  }
  return rslt;
};

let isResourceAvailable = function (resources, options) {
  let authCode = null;
  // authorize user by authorization attribute
  const { authAttr, method, path } = options;
  for (let prop in authAttr) {
    let keys = [];
    let re = pathToRegexp(prop.replace(/\:[A-Za-z_\-]+\b/g, "(\\d+)"), keys);
    if (re.test(`${method}${path}`)) {
      authCode = authAttr[prop];
      break;
    }
  }
  return !authCode || (resources || []).some((code) => code === authCode);
};

function factory(app, opts) {
  return async function auth(ctx, next) {
    const { path, method, header, query } = ctx;
    ctx.fs.logger.log("[AUTH] start", path, method);
    ctx.fs.api = ctx.fs.api || {};
    ctx.fs.port = opts.port;
    ctx.redis = app.redis;
    ctx.redisTools = app.redisTools;
    let error = null;

    if (path) {
      if (!isPathExcluded(opts, path, method)) {
        ctx.fs.logger.log("[AUTH] Path requires authentication:", path, method);

        const authHeader = header.authorization;
        const bearer =
          authHeader && authHeader.startsWith("Bearer ")
            ? authHeader.slice(7)
            : null;
        const token = bearer || header.token || query.token;

        ctx.fs.logger.log("[AUTH] Token source:", {
          bearer: !!bearer,
          headerToken: !!header.token,
          queryToken: !!query.token,
          finalToken: !!token,
        });

        if (!token) {
          ctx.fs.logger.log("[AUTH] No token provided");
          error = { status: 401, name: "Unauthorized - No token provided" };
        } else {
          const user = await authorizeToken(ctx, token);
          if (user && user.authorized) {
            ctx.fs.logger.log("[AUTH] User authorized successfully");
            // if (
            //   !isResourceAvailable(user.resources, {
            //     authAttr: app.fs.auth.authAttr,
            //     path,
            //     method,
            //   })
            // ) {
            //   error = { status: 403, name: "Forbidden" };
            // } else {
            //   error = { status: 401, name: "Unauthorized" };
            // }
          } else {
            ctx.fs.logger.log("[AUTH] Token validation failed");
            error = { status: 401, name: "Unauthorized - Invalid token" };
          }
        }
      } else {
        ctx.fs.logger.log(
          "[AUTH] Path excluded from authentication:",
          path,
          method,
        );
      }
    } else {
      ctx.fs.logger.log("[AUTH] No path provided");
      error = { status: 401, name: "Unauthorized - No path" };
    }

    if (error) {
      ctx.fs.logger.log("[AUTH] failed", path, method, "Error:", error.name);
      ctx.status = error.status;
      ctx.body = error.name;
    } else {
      ctx.fs.logger.log("[AUTH] passed", path, method);
      await next();
    }
  };
}

module.exports = factory;
