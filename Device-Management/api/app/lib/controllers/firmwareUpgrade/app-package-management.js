"use strict";

const { Op } = require("sequelize");

const APP_ATTRS = ["id", "name", "createdAt", "updatedAt"];
const PACKAGE_ATTRS = [
  "id",
  "appId",
  "version",
  "description",
  "packageName",
  "packageUrl",
  "onlineTime",
  "createdAt",
  "updatedAt",
];
const LOG_MODULE = "APP安装包管理";

const normalize = (value) => String(value || "").trim();

async function recordSystemLog(ctx, content) {
  try {
    const { SystemLog } = ctx.fs.dc.models;
    if (!SystemLog) return;
    await SystemLog.create({
      logTime: new Date(),
      content,
      url: ctx.request.url,
      userId: (ctx.fs.api || {}).userId || null,
      module: LOG_MODULE,
    });
  } catch (error) {
    // 系统日志记录失败不应影响已完成的业务操作。
    ctx.fs.logger.error(`记录APP安装包管理日志失败: ${error}`);
  }
}

async function findApplicationByName(models, name, excludeId, transaction) {
  const where = {
    [Op.and]: [
      models.AppInstallApplication.sequelize.where(
        models.AppInstallApplication.sequelize.fn("LOWER", models.AppInstallApplication.sequelize.col("name")),
        normalize(name).toLowerCase(),
      ),
    ],
  };
  if (excludeId) where[Op.and].push({ id: { [Op.ne]: excludeId } });
  return models.AppInstallApplication.findOne({ where, transaction });
}

async function listApplications(ctx) {
  try {
    const { models } = ctx.fs.dc;
    ctx.body = await models.AppInstallApplication.findAll({
      attributes: APP_ATTRS,
      order: [["id", "ASC"]],
    });
    ctx.status = 200;
  } catch (error) {
    ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
    ctx.status = 400;
    ctx.body = { message: "获取应用列表失败" };
  }
}

async function createApplication(ctx) {
  let transaction;
  try {
    const { models } = ctx.fs.dc;
    const name = normalize((ctx.request.body || {}).name);
    if (!name) throw new Error("应用名称不能为空");
    transaction = await ctx.fs.dc.orm.transaction();
    if (await findApplicationByName(models, name, null, transaction)) {
      throw new Error("应用名称已存在");
    }
    const now = new Date();
    const row = await models.AppInstallApplication.create(
      { name, createdAt: now, updatedAt: now },
      { transaction },
    );
    await transaction.commit();
    await recordSystemLog(ctx, `新增应用：${row.name}(ID: ${row.id})`);
    ctx.body = row;
    ctx.status = 201;
  } catch (error) {
    if (transaction && !transaction.finished) await transaction.rollback();
    ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
    ctx.status = 400;
    ctx.body = { message: error.message || "新增应用失败" };
  }
}

async function updateApplication(ctx) {
  let transaction;
  try {
    const { models } = ctx.fs.dc;
    const { id } = ctx.params;
    const name = normalize((ctx.request.body || {}).name);
    if (!name) throw new Error("应用名称不能为空");
    transaction = await ctx.fs.dc.orm.transaction();
    const row = await models.AppInstallApplication.findByPk(id, { transaction });
    if (!row) {
      ctx.status = 404;
      ctx.body = { message: "应用不存在" };
      await transaction.rollback();
      return;
    }
    if (await findApplicationByName(models, name, Number(id), transaction)) {
      throw new Error("应用名称已存在");
    }
    await row.update({ name, updatedAt: new Date() }, { transaction });
    await transaction.commit();
    await recordSystemLog(ctx, `编辑应用：${row.name}(ID: ${row.id})`);
    ctx.body = row;
    ctx.status = 200;
  } catch (error) {
    if (transaction && !transaction.finished) await transaction.rollback();
    ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
    ctx.status = 400;
    ctx.body = { message: error.message || "编辑应用失败" };
  }
}

async function removeApplication(ctx) {
  let transaction;
  try {
    const { models } = ctx.fs.dc;
    const { id } = ctx.params;
    transaction = await ctx.fs.dc.orm.transaction();
    const row = await models.AppInstallApplication.findByPk(id, { transaction });
    if (!row) {
      ctx.status = 404;
      ctx.body = { message: "应用不存在" };
      await transaction.rollback();
      return;
    }
    const packageExists = await models.AppInstallPackage.findOne({
      where: { appId: id },
      attributes: ["id"],
      transaction,
    });
    if (packageExists) throw new Error("应用下存在安装包，无法删除");
    await row.destroy({ transaction });
    await transaction.commit();
    await recordSystemLog(ctx, `删除应用：${row.name}(ID: ${row.id})`);
    ctx.status = 204;
  } catch (error) {
    if (transaction && !transaction.finished) await transaction.rollback();
    ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
    ctx.status = 400;
    ctx.body = { message: error.message || "删除应用失败" };
  }
}

async function listPackages(ctx) {
  try {
    const { models } = ctx.fs.dc;
    const { appId, version, onlineStart, onlineEnd, page, pageSize } = ctx.query || {};
    if (!appId) {
      ctx.body = { count: 0, rows: [] };
      ctx.status = 200;
      return;
    }
    const where = { appId: Number(appId) };
    if (normalize(version)) where.version = { [Op.like]: `%${normalize(version)}%` };
    const start = onlineStart ? new Date(onlineStart) : null;
    const end = onlineEnd ? new Date(onlineEnd) : null;
    if (start && !Number.isNaN(start.getTime()) && end && !Number.isNaN(end.getTime())) {
      where.onlineTime = { [Op.between]: [start, end] };
    } else if (start && !Number.isNaN(start.getTime())) {
      where.onlineTime = { [Op.gte]: start };
    } else if (end && !Number.isNaN(end.getTime())) {
      where.onlineTime = { [Op.lte]: end };
    }
    const limit = Number(pageSize) || 10;
    const pageNo = Number(page) || 1;
    ctx.body = await models.AppInstallPackage.findAndCountAll({
      where,
      attributes: PACKAGE_ATTRS,
      offset: (Math.max(pageNo, 1) - 1) * Math.max(limit, 1),
      limit: Math.max(limit, 1),
      order: [["onlineTime", "DESC"], ["id", "DESC"]],
    });
    ctx.status = 200;
  } catch (error) {
    ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
    ctx.status = 400;
    ctx.body = { message: "获取安装包列表失败" };
  }
}

async function validatePackage(models, data, excludeId, transaction) {
  const appId = Number(data.appId);
  const version = normalize(data.version);
  if (!appId || !version) throw new Error("应用名称和版本号不能为空");
  const app = await models.AppInstallApplication.findByPk(appId, { transaction });
  if (!app) throw new Error("所属应用不存在");
  const where = { appId, version };
  if (excludeId) where.id = { [Op.ne]: excludeId };
  if (await models.AppInstallPackage.findOne({ where, transaction })) {
    throw new Error("当前应用下版本号已存在");
  }
  return { appId, version };
}

async function createPackage(ctx) {
  let transaction;
  try {
    const { models } = ctx.fs.dc;
    const body = ctx.request.body || {};
    const packageUrl = normalize(body.packageUrl);
    const packageName = normalize(body.packageName);
    if (!packageUrl || !packageName) throw new Error("请上传APK安装包");
    if (!/\.apk$/i.test(packageName)) throw new Error("仅支持 .apk 格式文件");
    transaction = await ctx.fs.dc.orm.transaction();
    const { appId, version } = await validatePackage(models, body, null, transaction);
    const now = new Date();
    const row = await models.AppInstallPackage.create(
      {
        appId,
        version,
        description: normalize(body.description) || null,
        packageName,
        packageUrl,
        onlineTime: now,
        createdAt: now,
        updatedAt: now,
      },
      { transaction },
    );
    await transaction.commit();
    await recordSystemLog(
      ctx,
      `新增安装包：版本 ${row.version}，文件 ${row.packageName}(ID: ${row.id})`,
    );
    ctx.body = row;
    ctx.status = 201;
  } catch (error) {
    if (transaction && !transaction.finished) await transaction.rollback();
    ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
    ctx.status = 400;
    ctx.body = { message: error.message || "新增安装包失败" };
  }
}

async function updatePackage(ctx) {
  let transaction;
  try {
    const { models } = ctx.fs.dc;
    const { id } = ctx.params;
    const body = ctx.request.body || {};
    transaction = await ctx.fs.dc.orm.transaction();
    const row = await models.AppInstallPackage.findByPk(id, { transaction });
    if (!row) {
      ctx.status = 404;
      ctx.body = { message: "安装包不存在" };
      await transaction.rollback();
      return;
    }
    const next = {
      appId: typeof body.appId === "undefined" ? row.appId : body.appId,
      version: typeof body.version === "undefined" ? row.version : body.version,
    };
    const { appId, version } = await validatePackage(models, next, Number(id), transaction);
    const packageName = normalize(body.packageName || row.packageName);
    const packageUrl = normalize(body.packageUrl || row.packageUrl);
    if (!packageName || !packageUrl) throw new Error("请上传APK安装包");
    if (!/\.apk$/i.test(packageName)) throw new Error("仅支持 .apk 格式文件");
    await row.update(
      {
        appId,
        version,
        description: typeof body.description === "undefined" ? row.description : normalize(body.description) || null,
        packageName,
        packageUrl,
        updatedAt: new Date(),
      },
      { transaction },
    );
    await transaction.commit();
    await recordSystemLog(
      ctx,
      `编辑安装包：版本 ${row.version}，文件 ${row.packageName}(ID: ${row.id})`,
    );
    ctx.body = row;
    ctx.status = 200;
  } catch (error) {
    if (transaction && !transaction.finished) await transaction.rollback();
    ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
    ctx.status = 400;
    ctx.body = { message: error.message || "编辑安装包失败" };
  }
}

async function removePackage(ctx) {
  try {
    const { models } = ctx.fs.dc;
    const row = await models.AppInstallPackage.findByPk(ctx.params.id);
    if (!row) {
      ctx.status = 404;
      ctx.body = { message: "安装包不存在" };
      return;
    }
    await row.destroy();
    await recordSystemLog(
      ctx,
      `删除安装包：版本 ${row.version}，文件 ${row.packageName}(ID: ${row.id})`,
    );
    ctx.status = 204;
  } catch (error) {
    ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
    ctx.status = 400;
    ctx.body = { message: "删除安装包失败" };
  }
}

module.exports = {
  listApplications,
  createApplication,
  updateApplication,
  removeApplication,
  listPackages,
  createPackage,
  updatePackage,
  removePackage,
};
