/* eslint-disable*/
"use strict";

const { Op } = require("sequelize");

const DEFAULT_ATTRS = [
  "id",
  "name",
  "productCode",
  "schema",
  "remark",
  "mode",
  "createdAt",
  "updatedAt",
];

const HISTORY_ATTRS = [
  "id",
  "paramTemplateId",
  "changeType",
  "name",
  "productCode",
  "mode",
  "schema",
  "remark",
  "createdAt",
  "updatedAt",
];

const DUPLICATE_CODE = "PARAM_TEMPLATE_DUPLICATE";
const DUPLICATE_MESSAGE = "该产品编码与模板模式组合已存在，请勿重复添加";

function validateChcChannels(schema) {
  const validateNodes = (nodes) => {
    if (!Array.isArray(nodes)) return null;
    for (const node of nodes) {
      if (!node || typeof node !== "object") continue;
      if (
        node.field === "CHC" &&
        Object.prototype.hasOwnProperty.call(node, "channels")
      ) {
        if (!Array.isArray(node.channels) || node.channels.length === 0) {
          return "通道控制的 channels 必须为非空数组";
        }

        const channelNames = new Set();
        for (let index = 0; index < node.channels.length; index += 1) {
          const channel = node.channels[index] || {};
          const channelNo = Number(channel.channelNo);
          const expectedChannelNo = index + 1;
          if (!Number.isInteger(channelNo) || channelNo !== expectedChannelNo) {
            return "通道控制的通道号必须从 1 开始连续递增，不能跳号或重复";
          }

          const channelName =
            typeof channel.name === "string" ? channel.name.trim() : "";
          if (!channelName) return `通道${channelNo}的名称不能为空`;

          const channelNameKey = channelName.toLocaleLowerCase();
          if (channelNames.has(channelNameKey)) {
            return `通道名称不能重复：${channelName}`;
          }
          channelNames.add(channelNameKey);
        }
      }

      const childrenError = validateNodes(node.children);
      if (childrenError) return childrenError;
    }
    return null;
  };

  return validateNodes(schema);
}

function toHistoryPayload(row, changeType, historyCreatedAt = new Date()) {
  return {
    paramTemplateId: row.id,
    changeType,
    name: row.name,
    productCode: row.productCode,
    mode: row.mode,
    schema: row.schema || [],
    remark: row.remark || null,
    createdAt: historyCreatedAt,
    updatedAt: historyCreatedAt,
  };
}

async function findDuplicateTemplate(
  models,
  { productCode, mode, excludeId, transaction } = {},
) {
  const sequelize = models.ParamTemplate.sequelize;
  const where = {
    [Op.and]: [
      { mode, deleted: false },
      sequelize.where(
        sequelize.fn("LOWER", sequelize.col("product_code")),
        String(productCode || "").toLowerCase(),
      ),
    ],
  };
  if (excludeId) where[Op.and].push({ id: { [Op.ne]: excludeId } });

  return models.ParamTemplate.findOne({
    where,
    attributes: ["id"],
    transaction,
  });
}

async function respondDuplicate(ctx, transaction) {
  await transaction.rollback();
  ctx.status = 400;
  ctx.body = {
    code: DUPLICATE_CODE,
    message: DUPLICATE_MESSAGE,
  };
}

async function makeUniqueName(
  models,
  rawName,
  { excludeId, transaction } = {},
) {
  const base = String(rawName || "").trim();
  if (!base) return base;
  const maxTries = 50;
  for (let i = 0; i <= maxTries; i += 1) {
    const candidate = `${base}${"\u200B".repeat(i)}`;
    const where = excludeId
      ? { name: candidate, id: { $ne: excludeId } }
      : { name: candidate };
    // eslint-disable-next-line no-await-in-loop
    const exists = await models.ParamTemplate.findOne({
      where,
      attributes: ["id"],
      transaction,
    });
    if (!exists) return candidate;
  }
  return `${base}_${Date.now()}`;
}

async function list(ctx) {
  try {
    const { models } = ctx.fs.dc;
    const { productCode, mode, pageSize, page, templateName } = ctx.query || {};
    const where = { deleted: false };
    const sequelize = models.ParamTemplate.sequelize;

    if (typeof templateName === "string" && templateName.trim()) {
      where.name = { $like: `%${templateName.trim()}%` };
    }
    if (typeof productCode === "string" && productCode.trim()) {
      where[Op.and] = [
        sequelize.where(
          sequelize.fn("LOWER", sequelize.col("product_code")),
          { [Op.like]: `%${productCode.trim().toLowerCase()}%` },
        ),
      ];
    }
    if (mode) where.mode = mode;

    if (pageSize && page) {
      const limit = parseInt(pageSize, 10);
      const pageNo = parseInt(page, 10);
      if (!limit || !pageNo || limit < 1 || pageNo < 1) {
        const rows = await models.ParamTemplate.findAll({
          where,
          order: [["id", "DESC"]],
          attributes: DEFAULT_ATTRS,
        });
        ctx.body = rows || [];
        ctx.status = 200;
        return;
      }
      const rslt = await models.ParamTemplate.findAndCountAll({
        where,
        offset: (pageNo - 1) * limit,
        limit,
        order: [["id", "DESC"]],
        attributes: DEFAULT_ATTRS,
      });
      ctx.body = rslt || { count: 0, rows: [] };
    } else {
      const rows = await models.ParamTemplate.findAll({
        where,
        order: [["id", "DESC"]],
        attributes: DEFAULT_ATTRS,
      });
      ctx.body = rows || [];
    }
    ctx.status = 200;
  } catch (error) {
    ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
    ctx.status = 400;
    ctx.body = { message: "查询参数模板失败" };
  }
}

async function historyList(ctx) {
  try {
    const { models } = ctx.fs.dc;
    const { productCode, mode, pageSize, page, templateName } = ctx.query || {};
    const where = {};
    const sequelize = models.ParamTemplateHistory.sequelize;

    if (typeof templateName === "string" && templateName.trim()) {
      where.name = { $like: `%${templateName.trim()}%` };
    }
    if (typeof productCode === "string" && productCode.trim()) {
      where[Op.and] = [
        sequelize.where(
          sequelize.fn("LOWER", sequelize.col("product_code")),
          { [Op.like]: `%${productCode.trim().toLowerCase()}%` },
        ),
      ];
    }
    if (mode) where.mode = mode;

    const limit = parseInt(pageSize, 10);
    const pageNo = parseInt(page, 10);
    if (limit > 0 && pageNo > 0) {
      ctx.body = await models.ParamTemplateHistory.findAndCountAll({
        where,
        offset: (pageNo - 1) * limit,
        limit,
        order: [["id", "DESC"]],
        attributes: HISTORY_ATTRS.filter((attr) => attr !== "schema"),
      });
    } else {
      ctx.body = await models.ParamTemplateHistory.findAll({
        where,
        order: [["id", "DESC"]],
        attributes: HISTORY_ATTRS.filter((attr) => attr !== "schema"),
      });
    }
    ctx.status = 200;
  } catch (error) {
    ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
    ctx.status = 400;
    ctx.body = { message: "查询参数模板历史记录失败" };
  }
}

async function historyDetail(ctx) {
  try {
    const { models } = ctx.fs.dc;
    const row = await models.ParamTemplateHistory.findByPk(ctx.params.id, {
      attributes: HISTORY_ATTRS,
    });
    if (!row) {
      ctx.status = 404;
      ctx.body = { message: "参数模板历史记录不存在" };
      return;
    }
    ctx.body = row;
    ctx.status = 200;
  } catch (error) {
    ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
    ctx.status = 400;
    ctx.body = { message: "查询参数模板历史详情失败" };
  }
}

async function create(ctx) {
  let transaction;
  try {
    const { models } = ctx.fs.dc;
    transaction = await ctx.fs.dc.orm.transaction();
    const { name, productCode, schema, remark, mode } = ctx.request.body || {};
    const normalizedProductCode = String(productCode || "").trim();
    const normalizedMode = String(mode || "").trim();
    if (!name || !normalizedProductCode || !normalizedMode) {
      ctx.status = 400;
      ctx.body = { message: "缺少必填项" };
      await transaction.rollback();
      return;
    }
    const chcChannelsError = validateChcChannels(schema);
    if (chcChannelsError) {
      ctx.status = 400;
      ctx.body = { message: chcChannelsError };
      await transaction.rollback();
      return;
    }
    const duplicate = await findDuplicateTemplate(models, {
      productCode: normalizedProductCode,
      mode: normalizedMode,
      transaction,
    });
    if (duplicate) {
      await respondDuplicate(ctx, transaction);
      return;
    }
    const now = new Date();
    const finalName = await makeUniqueName(models, name, { transaction });
    const row = await models.ParamTemplate.create(
      {
        name: finalName,
        productCode: normalizedProductCode,
        schema: schema || [],
        remark: remark || null,
        mode: normalizedMode,
        createdAt: now,
        updatedAt: now,
        deleted: false,
      },
      { transaction },
    );
    await models.ParamTemplateHistory.create(
      toHistoryPayload(row, "create", new Date()),
      { transaction },
    );
    await transaction.commit();
    ctx.body = row;
    ctx.status = 201;
  } catch (error) {
    if (transaction && !transaction.finished) await transaction.rollback();
    ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
    ctx.status = 400;
    ctx.body = { message: "新增参数模板失败" };
  }
}

async function update(ctx) {
  let transaction;
  try {
    const { models } = ctx.fs.dc;
    transaction = await ctx.fs.dc.orm.transaction();
    const { id } = ctx.params;
    const { name, productCode, schema, remark, mode } = ctx.request.body || {};
    const exists = await models.ParamTemplate.findByPk(id, { transaction });
    if (!exists) {
      ctx.status = 404;
      ctx.body = { message: "模板不存在" };
      await transaction.rollback();
      return;
    }
    const nextProductCode =
      typeof productCode === "undefined" || productCode === null
        ? String(exists.productCode || "").trim()
        : String(productCode).trim();
    const nextMode =
      typeof mode === "undefined" || mode === null
        ? String(exists.mode || "").trim()
        : String(mode).trim();
    if (!nextProductCode || !nextMode) {
      ctx.status = 400;
      ctx.body = { message: "产品编码和模板模式不能为空" };
      await transaction.rollback();
      return;
    }
    const duplicate = await findDuplicateTemplate(models, {
      productCode: nextProductCode,
      mode: nextMode,
      excludeId: Number(id),
      transaction,
    });
    if (duplicate) {
      await respondDuplicate(ctx, transaction);
      return;
    }
    const nextName =
      typeof name === "undefined" || name === null
        ? exists.name
        : await makeUniqueName(models, name, {
            excludeId: Number(id),
            transaction,
          });
    const nextSchema = typeof schema === "undefined" ? exists.schema : schema;
    const chcChannelsError = validateChcChannels(nextSchema);
    if (chcChannelsError) {
      ctx.status = 400;
      ctx.body = { message: chcChannelsError };
      await transaction.rollback();
      return;
    }
    await models.ParamTemplate.update(
      {
        name: nextName,
        productCode: nextProductCode,
        schema: nextSchema,
        remark: typeof remark === "undefined" ? exists.remark : remark,
        mode: nextMode,
        updatedAt: new Date(),
      },
      { where: { id }, transaction },
    );
    const row = await models.ParamTemplate.findByPk(id, {
      attributes: DEFAULT_ATTRS,
      transaction,
    });
    await models.ParamTemplateHistory.create(
      toHistoryPayload(row, "update", new Date()),
      { transaction },
    );
    await transaction.commit();
    ctx.body = row;
    ctx.status = 200;
  } catch (error) {
    if (transaction && !transaction.finished) await transaction.rollback();
    ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
    ctx.status = 400;
    ctx.body = { message: "更新参数模板失败" };
  }
}

async function remove(ctx) {
  try {
    const { models } = ctx.fs.dc;
    const { id } = ctx.params;
    await models.ParamTemplate.update({ deleted: true }, { where: { id } });
    ctx.status = 204;
  } catch (error) {
    ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
    ctx.status = 400;
    ctx.body = { message: "删除参数模板失败" };
  }
}

async function resolve(ctx) {
  try {
    const { models } = ctx.fs.dc;
    const { productCode, mode } = ctx.query || {};
    if (!productCode) {
      ctx.status = 400;
      ctx.body = { message: "缺少 productCode" };
      return;
    }
    const sequelize = models.ParamTemplate.sequelize;
    const where = {
      deleted: false,
      [Op.and]: sequelize.where(
        sequelize.fn("LOWER", sequelize.col("product_code")),
        String(productCode).trim().toLowerCase(),
      ),
    };
    if (mode) where.mode = mode;
    const row = await models.ParamTemplate.findOne({
      where,
      order: [["updatedAt", "DESC"]],
      attributes: ["id", "name", "productCode", "schema", "remark", "mode"],
    });
    let schema = [];
    if (row) {
      schema = row.schema || [];
    }
    ctx.body = { productCode, mode: mode || null, schema };
    ctx.status = 200;
  } catch (error) {
    ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
    ctx.status = 400;
    ctx.body = { message: "解析模板失败" };
  }
}

module.exports = {
  list,
  historyList,
  historyDetail,
  create,
  update,
  remove,
  resolve,
};
