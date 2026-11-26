"use strict";
const moment = require("moment");

const CACHE_TTL_MS = 30 * 1000;
const MAX_CACHE_SIZE = 500;
const canSortCache = new Map();
const countCache = new Map();
const externalBindCache = new Map();

function cacheGet(map, key) {
  const entry = map.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL_MS) {
    map.delete(key);
    return null;
  }
  return entry.value;
}

function cacheSet(map, key, value) {
  if (map.size >= MAX_CACHE_SIZE) {
    const firstKey = map.keys().next().value;
    if (firstKey !== undefined) map.delete(firstKey);
  }
  map.set(key, { ts: Date.now(), value });
}

function externalBindingKey(productCode, deviceCode) {
  return `${String(productCode || "").trim()}::${String(deviceCode || "").trim()}`;
}

function externalFullDeviceCode(productCode, deviceCode) {
  return `${String(productCode || "").trim()}${String(deviceCode || "").trim()}`;
}

const DEFAULT_SUB_CHANNEL_LIMIT = 5;
const FS_M24_SUB_CHANNEL_LIMIT = 20;

function getSubChannelLimit(model) {
  return String(model || "").trim().toUpperCase() === "FS-M24"
    ? FS_M24_SUB_CHANNEL_LIMIT
    : DEFAULT_SUB_CHANNEL_LIMIT;
}

function getSubChannelRangeMessage(limit) {
  return `子通道号范围必须在1~${limit}之间`;
}

function getProductModel(device) {
  if (!device) return "";
  const data = device.dataValues || device;
  const productLibrary = device.productLibrary || data.productLibrary;
  return (productLibrary && productLibrary.model) || "";
}

// 外部用户新增/解绑后必须同时清理绑定、数量和排序缓存，避免短时间继续按旧绑定展示设备。
function clearExternalUserDeviceCaches(uid) {
  externalBindCache.delete(`uid:${uid}`);
  const userMarker = `"uid":${JSON.stringify(uid)}`;
  [canSortCache, countCache].forEach((cache) => {
    Array.from(cache.keys()).forEach((key) => {
      if (String(key).includes(userMarker)) cache.delete(key);
    });
  });
}

function escapeClickHouseString(value) {
  return String(value).replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function parseClickHouseJson(value) {
  if (typeof value !== "string") return value;

  const candidates = [value];
  if (value.indexOf("{\\") === 0 || value.indexOf("[\\") === 0) {
    candidates.push(value.replace(/\\"/g, '"').replace(/\\"/g, '"'));
  }

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      if (typeof parsed !== "string") return parsed;

      try {
        return JSON.parse(parsed);
      } catch (error) {
        return parsed;
      }
    } catch (error) {
      // 尝试下一种 Airbyte 同步后的转义格式。
    }
  }

  return value;
}

function normalizeDiagnosticHistory(row) {
  const { content, ...history } = row;
  const parsedContent = parseClickHouseJson(content);

  return {
    ...history,
    ...(parsedContent && typeof parsedContent === "object" && !Array.isArray(parsedContent)
      ? parsedContent
      : { content: parsedContent }),
  };
}

function normalizeSensorDiagnosticHistory(row) {
  return {
    ...row,
    data: parseClickHouseJson(row.data),
  };
}

function hasDiagnosticError(content) {
  const parsedContent = parseClickHouseJson(content);
  if (
    !parsedContent ||
    typeof parsedContent !== "object" ||
    Array.isArray(parsedContent) ||
    !Object.prototype.hasOwnProperty.call(parsedContent, "ERR")
  ) {
    return false;
  }

  const rawErr = parsedContent.ERR;
  const err = String(rawErr === null || rawErr === undefined ? "" : rawErr).trim();
  if (!err) return false;

  // ERR=0 表示正常；整数形式的 000、-0 也应视为 0。
  if (/^-?\d+$/.test(err)) {
    try {
      return BigInt(err) !== 0n;
    } catch (error) {
      return err !== "0";
    }
  }

  return err !== "0";
}

async function getDevices(ctx) {
  let rslt = {};
  try {
    const { models } = ctx.fs.dc;
    const { clickHouse } = ctx.app.fs;
    const sequelize = models.Devices.sequelize;
    const projectAttributes = [
      "id",
      "name",
      "locationName",
      "longitude",
      "latitude",
      "description",
    ];
    const {
      pageSize,
      page,
      deviceCode,
      deviceModel,
      name,
      tags,
      roles,
      projectId,
      sortField,
      sortDir,
    } = ctx.query;
    const productInclude = { model: models.ProductLibrary };
    const pageNum = Number(page);
    const pageSizeNum = Number(pageSize);
    const hasPagination =
      Number.isInteger(pageNum) &&
      pageNum > 0 &&
      Number.isInteger(pageSizeNum) &&
      pageSizeNum > 0;
    const pageOffset = hasPagination ? (pageNum - 1) * pageSizeNum : undefined;
    let findOption = {
      where: {},
      include: [productInclude],
      subQuery: false,
    };
    const uinfo = (ctx.fs.api && ctx.fs.api.userInfo) || {};
    const userType = uinfo.userType || "internal";
    const uid = uinfo.id;
    const pjId = projectId !== undefined ? Number(projectId) : Number.NaN;
    const normalizedProjectId = !Number.isNaN(pjId) ? pjId : null;
    if (deviceCode) {
      findOption.where.deviceCode = { $like: `%${deviceCode}%` };
    }
    const productWhere = {};
    if (deviceModel) {
      productWhere.model = { $like: `%${deviceModel}%` };
    }
    if (name) {
      productWhere.name = { $like: `%${name}%` };
    }
    if (Object.keys(productWhere).length > 0) {
      productInclude.where = productWhere;
      productInclude.required = true;
    }
    if (tags) {
      findOption.where.tags = { $like: `%${tags}%` };
    }
    if (projectId) {
      if (!Number.isNaN(pjId)) {
        const existsCond = sequelize.literal(
          `EXISTS (SELECT 1 FROM "project_devices" AS "projectDevice" WHERE "projectDevice"."project_id" = ${sequelize.escape(
            pjId,
          )} AND ( "devices"."device_code" = "projectDevice"."device_code" OR "devices"."device_code" = ("devices"."product_code" || "projectDevice"."device_code") ))`,
        );
        if (findOption.where.$and) {
          findOption.where.$and.push(existsCond);
        } else {
          findOption.where.$and = [existsCond];
        }
      }
    }
    if (userType === "external") {
      const cacheKey = `uid:${uid}`;
      const cachedBinds = cacheGet(externalBindCache, cacheKey);
      const binds =
        cachedBinds !== null
          ? cachedBinds
          : await models.ExternalUserDevice.findAll({
              where: { userId: uid },
              attributes: ["deviceCode", "productCode"],
            });
      if (cachedBinds === null) cacheSet(externalBindCache, cacheKey, binds);
      const boundFullDeviceCodes = Array.from(
        new Set(
          binds
            .map((b) => externalFullDeviceCode(b.productCode, b.deviceCode))
            .filter(Boolean),
        ),
      );
      if (boundFullDeviceCodes.length === 0) {
        rslt = { rows: [], count: 0 };
        ctx.body = rslt;
        ctx.status = 200;
        return;
      }
      const externalConditions = [];
      if (findOption.where.deviceCode) {
        externalConditions.push({ deviceCode: findOption.where.deviceCode });
        delete findOption.where.deviceCode;
      }
      externalConditions.push({ deviceCode: { $in: boundFullDeviceCodes } });
      findOption.where.$and = [
        ...(findOption.where.$and || []),
        ...externalConditions,
      ];
    }

    const filterCacheKey = JSON.stringify({
      userType,
      uid: userType === "external" ? uid : null,
      deviceCode: deviceCode || "",
      deviceModel: deviceModel || "",
      name: name || "",
      tags: tags || "",
      projectId: normalizedProjectId,
    });

    const cachedCanSort = cacheGet(canSortCache, filterCacheKey);
    const productIncludeRef = findOption.include[0];
    const canSort =
      cachedCanSort !== null
        ? cachedCanSort
        : new Set(
            (
              await models.Devices.findAll({
                where: findOption.where,
                include: [
                  {
                    model: models.ProductLibrary,
                    attributes: [],
                    required: !!productIncludeRef.required,
                    where: productIncludeRef.where || undefined,
                  },
                ],
                attributes: [[sequelize.col("productLibrary.model"), "model"]],
                group: ["productLibrary.model"],
                limit: 2,
                raw: true,
                subQuery: false,
              })
            )
              .map((item) => item.model)
              .filter(Boolean),
          ).size <= 1;
    if (cachedCanSort === null) cacheSet(canSortCache, filterCacheKey, canSort);
    const order = [];
    if (String(sortField || "") === "deviceCode" && canSort) {
      const direction =
        String(sortDir || "").toUpperCase() === "DESC" ? "DESC" : "ASC";
      order.push(
        [
          sequelize.literal(
            `COALESCE(CAST(substring("devices"."device_code" from '(\\d+)$') AS BIGINT), -1)`,
          ),
          direction,
        ],
        ["deviceCode", direction],
      );
    }

    const cachedCount = cacheGet(countCache, filterCacheKey);
    const countPromise =
      cachedCount !== null
        ? Promise.resolve(cachedCount)
        : models.Devices.count({
            where: findOption.where,
            include: findOption.include,
            distinct: true,
            col: "device_code",
          });
    const [count, pageRows] = await Promise.all([
      countPromise.then((c) => {
        if (cachedCount === null) cacheSet(countCache, filterCacheKey, c);
        return c;
      }),
      models.Devices.findAll({
        where: findOption.where,
        include: findOption.include.map((item) => ({
          ...item,
          attributes: [],
        })),
        attributes: ["deviceCode"],
        order: order.length > 0 ? order : undefined,
        offset: hasPagination ? pageOffset : undefined,
        limit: hasPagination ? pageSizeNum : undefined,
        subQuery: false,
        raw: true,
      }),
    ]);
    const pageDeviceCodes = pageRows
      .map((item) => String(item.deviceCode || "").trim())
      .filter(Boolean);
    const uniqueDeviceCodes = Array.from(new Set(pageDeviceCodes));
    let rows = [];
    if (uniqueDeviceCodes.length > 0) {
      const detailRows = await models.Devices.findAll({
        where: { deviceCode: { $in: uniqueDeviceCodes } },
        include: [
          productInclude,
          {
            model: models.Project,
            attributes: projectAttributes,
            through: { attributes: [] },
          },
        ],
      });
      const detailRowMap = new Map(
        detailRows.map((item) => [String(item.deviceCode || "").trim(), item]),
      );
      rows = pageDeviceCodes
        .map((code) => detailRowMap.get(code))
        .filter(Boolean);
    }

    const endTimeStr = moment().format("YYYY-MM-DD HH:mm:ss");
    const startTimeStr = moment()
      .subtract(3, "days")
      .format("YYYY-MM-DD HH:mm:ss");

    // 状态与“诊断数据”详情页统一从 ClickHouse 读取，避免因同步延迟将
    // 已上报数据的设备错误显示为离线。at_time 为空时才回退到 created_at。
    const allDiagnosticHistories =
      uniqueDeviceCodes.length > 0
        ? await clickHouse.defaultDb
            .query(
              `
                SELECT device_code AS deviceCode, content
                FROM diagnostic_histories
                WHERE device_code IN (${uniqueDeviceCodes
                  .map((code) => `'${escapeClickHouseString(code)}'`)
                  .join(", ")})
                  AND ifNull(at_time, created_at) >= toDateTime('${startTimeStr}')
                  AND ifNull(at_time, created_at) <= toDateTime('${endTimeStr}')
              `,
            )
            .toPromise()
        : [];

    const getIncludedProjects = (device) => {
      if (!device) return [];
      const p1 = device.projects;
      if (Array.isArray(p1)) return p1;
      const p2 = device.Projects;
      if (Array.isArray(p2)) return p2;
      return [];
    };

    const anyHasIncludedProjects = rows.some(
      (d) => getIncludedProjects(d).length > 0,
    );

    const deviceProjectsMap = new Map();
    if (!anyHasIncludedProjects && uniqueDeviceCodes.length > 0) {
      const suffixToFullCodes = new Map();
      rows.forEach((item) => {
        const fullCode = String(item.deviceCode || "").trim();
        const pc = String(item.productCode || "").trim();
        if (!fullCode || !pc) return;
        if (!fullCode.startsWith(pc)) return;
        const suffix = fullCode.slice(pc.length);
        if (!suffix) return;
        const list = suffixToFullCodes.get(suffix) || [];
        list.push(fullCode);
        suffixToFullCodes.set(suffix, list);
      });
      const uniqueSuffixes = Array.from(suffixToFullCodes.keys());

      const projectDevices =
        uniqueSuffixes.length > 0
          ? await models.ProjectDevice.findAll({
              attributes: ["deviceCode"],
              where: { deviceCode: { $in: uniqueSuffixes } },
              include: [
                {
                  model: models.Project,
                  attributes: projectAttributes,
                  required: true,
                },
              ],
            })
          : await models.ProjectDevice.findAll({
              attributes: ["deviceCode"],
              where: sequelize.literal(
                uniqueDeviceCodes
                  .map(
                    (fullCode) =>
                      `${sequelize.escape(fullCode)} LIKE '%' || "projectDevice"."device_code"`,
                  )
                  .join(" OR "),
              ),
              include: [
                {
                  model: models.Project,
                  attributes: projectAttributes,
                  required: true,
                },
              ],
            });

      if (uniqueSuffixes.length > 0) {
        projectDevices.forEach((pd) => {
          const suffix = String(pd.deviceCode || "");
          const project = pd.project;
          if (!suffix || !project) return;
          const fullCodes = suffixToFullCodes.get(suffix) || [];
          fullCodes.forEach((fullCode) => {
            const list = deviceProjectsMap.get(fullCode) || [];
            list.push(project);
            deviceProjectsMap.set(fullCode, list);
          });
        });
      } else {
        projectDevices.forEach((pd) => {
          const suffix = String(pd.deviceCode || "");
          const project = pd.project;
          if (!suffix || !project) return;
          uniqueDeviceCodes.forEach((fullCode) => {
            if (String(fullCode).endsWith(suffix)) {
              const list = deviceProjectsMap.get(fullCode) || [];
              list.push(project);
              deviceProjectsMap.set(fullCode, list);
            }
          });
        });
      }
    }

    const statusMap = new Map();
    // ERR=0 正常、ERR≠0 异常；任一异常记录的优先级高于正常记录。
    allDiagnosticHistories.forEach((history) => {
      const code = String(history.deviceCode || "");
      if (!code) return;
      if (!statusMap.has(code)) statusMap.set(code, "在线");
      if (hasDiagnosticError(history.content)) {
        statusMap.set(code, "异常");
      }
    });

    rows.forEach((item) => {
      const code = String(item.deviceCode || "");
      const fromInclude = getIncludedProjects(item);
      const fromMapping = deviceProjectsMap.get(code) || [];
      const merged = [];
      const seen = new Set();
      [...fromInclude, ...fromMapping].forEach((project) => {
        const pid = project && project.id;
        if (pid && !seen.has(pid)) {
          seen.add(pid);
          merged.push(project);
        }
      });
      item.dataValues.projects = merged;
      item.dataValues.status = statusMap.get(code) || "离线";
    });
    rslt = { count, rows, canSort };
    ctx.body = rslt;
    ctx.status = 200;
  } catch (error) {
    ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
    ctx.status = 400;
    ctx.body = {
      message: typeof error == "string" ? error : "获取设备列表失败",
    };
  }
}

async function getDevicesSlim(ctx) {
  try {
    const { models } = ctx.fs.dc;
    const {
      pageSize,
      page,
      deviceCode,
      deviceModel,
      name,
      excludeDeviceCode,
      targetDeviceCode,
    } = ctx.query;
    const excludeCode = String(
      excludeDeviceCode || targetDeviceCode || "",
    ).trim();
    const uinfo = (ctx.fs.api && ctx.fs.api.userInfo) || {};
    const userType = uinfo.userType || "internal";
    let findOption = {
      where: {},
      include: [{ model: models.ProductLibrary }],
      attributes: ["deviceCode"],
      distinct: true,
      col: "device_code",
    };
    if (pageSize && page) {
      findOption.offset = (Number(page) - 1) * Number(pageSize);
      findOption.limit = Number(pageSize);
    }
    if (deviceCode) {
      findOption.where.deviceCode = { $like: `%${deviceCode}%` };
    }
    if (excludeCode) {
      findOption.where.deviceCode = findOption.where.deviceCode
        ? { $and: [findOption.where.deviceCode, { $ne: excludeCode }] }
        : { $ne: excludeCode };
    }
    const productInclude = findOption.include[0];
    const productWhere = {};
    if (deviceModel) {
      productWhere.model = { $like: `%${deviceModel}%` };
    }
    if (name) {
      productWhere.name = { $like: `%${name}%` };
    }
    if (Object.keys(productWhere).length > 0) {
      productInclude.where = productWhere;
      productInclude.required = true;
    }
    if (userType === "external") {
      const uid = uinfo.id;
      const binds = await models.ExternalUserDevice.findAll({
        where: { userId: uid },
        attributes: ["deviceCode", "model"],
      });
      const codes = Array.from(
        new Set(binds.map((b) => String(b.deviceCode)).filter(Boolean)),
      );
      const modelsSet = Array.from(
        new Set(binds.map((b) => String(b.model)).filter(Boolean)),
      );
      if (codes.length === 0) {
        ctx.body = { rows: [], count: 0 };
        ctx.status = 200;
        return;
      }
      findOption.include[0].required = true;
      if (deviceModel) {
        findOption.include[0].where = {
          ...(findOption.include[0].where || {}),
          model: { $like: `%${deviceModel}%` },
        };
      } else {
        findOption.include[0].where = {
          ...(findOption.include[0].where || {}),
          model: { $in: modelsSet },
        };
      }
      const orConds = codes.map((c) => ({ deviceCode: { $like: `%${c}` } }));
      if (findOption.where.deviceCode) {
        const likeCond = findOption.where.deviceCode;
        delete findOption.where.deviceCode;
        findOption.where.$and = [{ deviceCode: likeCond }, { $or: orConds }];
      } else {
        findOption.where.$or = orConds;
      }
    }
    const rslt = await models.Devices.findAndCountAll(findOption);
    const allCodes = rslt.rows
      .map((r) => String(r.deviceCode || "").trim())
      .filter(Boolean);
    let subsMap = new Map();
    if (allCodes.length > 0) {
      const subs = await models.SubDevices.findAll({
        where: { deviceCode: { $in: allCodes }, isDeleted: false },
        attributes: [
          "id",
          "deviceCode",
          "name",
          "channelNo",
          "subChannelNo",
          "moduleNo",
          "deviceType",
        ],
      });
      subs.forEach((s) => {
        const dc = String(s.deviceCode || "");
        const arr = subsMap.get(dc) || [];
        arr.push({
          id: s.id,
          name: s.name,
          channelNo: s.channelNo,
          subChannelNo: s.subChannelNo,
          moduleNo: s.moduleNo,
          deviceType: s.deviceType,
        });
        subsMap.set(dc, arr);
      });
    }
    const rows = rslt.rows.map((r) => {
      const dc = r.deviceCode;
      return {
        deviceCode: dc,
        name:
          (r.productLibrary && r.productLibrary.name) ||
          (r.dataValues &&
            r.dataValues.productLibrary &&
            r.dataValues.productLibrary.name) ||
          null,
        subDevices: subsMap.get(String(dc)) || [],
      };
    });
    ctx.body = { rows, count: rslt.count };
    ctx.status = 200;
  } catch (error) {
    ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
    ctx.status = 400;
    ctx.body = {
      message: typeof error == "string" ? error : "获取设备简表失败",
    };
  }
}

async function modifyDevice(ctx) {
  try {
    const { models } = ctx.fs.dc;
    const { deviceCodes } = ctx.params;
    const data = ctx.request.body;
    if (!deviceCodes) {
      throw "缺少参数:deviceCodes(设备编码)";
    }

    await models.Devices.update(data, {
      where: { deviceCode: { $in: deviceCodes.split(",") } },
    });

    ctx.status = 204;
  } catch (error) {
    ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
    ctx.status = 400;
    ctx.body = {
      message: typeof error === "string" ? error : "修改设备失败",
    };
  }
}

async function addSubDevices(ctx) {
  let transaction = null;
  try {
    const { models } = ctx.fs.dc;
    transaction = await ctx.fs.dc.orm.transaction();
    const payload = ctx.request.body;
    const list = Array.isArray(payload) ? payload : [payload];
    if (list.length === 0) {
      await transaction.rollback();
      ctx.status = 400;
      ctx.body = { message: "缺少参数" };
      return;
    }
    const deviceCodes = Array.from(
      new Set(list.map((d) => String(d.deviceCode || "")).filter(Boolean)),
    );
    if (deviceCodes.length === 0) {
      await transaction.rollback();
      throw "缺少参数: deviceCode";
    }
    const deviceRows = await models.Devices.findAll({
      where: { deviceCode: { $in: deviceCodes } },
      attributes: ["deviceCode"],
      include: [{ model: models.ProductLibrary, attributes: ["model"] }],
    });
    const subChannelLimitByCode = new Map(
      deviceRows.map((device) => [
        String(device.deviceCode || ""),
        getSubChannelLimit(getProductModel(device)),
      ]),
    );
    const existing = await models.SubDevices.findAll({
      where: { deviceCode: { $in: deviceCodes } },
      attributes: [
        "deviceCode",
        "channelNo",
        "subChannelNo",
        "moduleNo",
        "name",
        "isDeleted",
      ],
    });
    const existByCode = new Map();
    deviceCodes.forEach((dc) => {
      existByCode.set(
        dc,
        existing.filter((e) => String(e.deviceCode) === dc),
      );
    });
    const nameSetByCode = new Map();
    deviceCodes.forEach((dc) => {
      const names = new Set(
        (existByCode.get(dc) || [])
          .filter((e) => e.isDeleted === false)
          .map((e) => String(e.name || "")),
      );
      nameSetByCode.set(dc, names);
    });
    const comboSetByCode = new Map();
    deviceCodes.forEach((dc) => {
      const combos = new Set(
        (existByCode.get(dc) || [])
          .filter((e) => e.isDeleted === false)
          .map(
            (e) =>
              `${String(e.channelNo || "")}|${String(e.subChannelNo || "")}|${String(e.moduleNo || "")}`,
          ),
      );
      comboSetByCode.set(dc, combos);
    });
    const channelSubMapByCode = new Map();
    deviceCodes.forEach((dc) => {
      const map = new Map();
      (existByCode.get(dc) || [])
        .filter((e) => e.isDeleted === false)
        .forEach((e) => {
          const ch = String(e.channelNo || "");
          const sc = Number(e.subChannelNo);
          if (!ch || Number.isNaN(sc)) return;
          const arr = map.get(ch) || [];
          arr.push(sc);
          map.set(ch, arr);
        });
      channelSubMapByCode.set(dc, map);
    });
    const toCreate = [];
    const newNamesByCode = new Map();
    const newCombosByCode = new Map();
    deviceCodes.forEach((dc) => {
      newNamesByCode.set(dc, new Set());
      newCombosByCode.set(dc, new Set());
    });
    list.forEach((data) => {
      const dc = String(data.deviceCode || "");
      if (!dc) throw "缺少参数: deviceCode";
      const channelNo = data.channelNo;
      const subChannelNo = data.subChannelNo;
      const moduleNo = data.moduleNo;
      const subProvided =
        subChannelNo !== undefined &&
        subChannelNo !== null &&
        subChannelNo !== "";
      const chProvided =
        channelNo !== undefined && channelNo !== null && channelNo !== "";
      const mdProvided =
        moduleNo !== undefined && moduleNo !== null && moduleNo !== "";
      let subNumber = null;
      if (subProvided) {
        subNumber = Number(subChannelNo);
        const subChannelLimit =
          subChannelLimitByCode.get(dc) || DEFAULT_SUB_CHANNEL_LIMIT;
        if (
          !Number.isInteger(subNumber) ||
          subNumber < 1 ||
          subNumber > subChannelLimit
        ) {
          throw getSubChannelRangeMessage(subChannelLimit);
        }
      }
      let finalName = data.name;
      if (!finalName) {
        const base = (data.deviceType && String(data.deviceType)) || "子设备";
        const suffix =
          (chProvided ? `-${channelNo}` : "") +
          (subProvided ? `-${subChannelNo}` : "") +
          (mdProvided ? `-${moduleNo}` : "");
        finalName = `${base}${suffix || ""}`.trim() || `子设备-${Date.now()}`;
      }
      const names = nameSetByCode.get(dc);
      const newNames = newNamesByCode.get(dc);
      if (names.has(finalName) || newNames.has(finalName)) {
        throw `子设备名称"${finalName}"已存在,请使用其他名称`;
      }
      newNames.add(finalName);
      const combos = comboSetByCode.get(dc);
      const newCombos = newCombosByCode.get(dc);
      const comboKey = `${String(channelNo || "")}|${String(subChannelNo || "")}|${String(moduleNo || "")}`;
      if (chProvided && subProvided && mdProvided) {
        if (combos.has(comboKey) || newCombos.has(comboKey)) {
          throw `通道号${channelNo}-子通道号${subChannelNo}-模块号${moduleNo}的组合已存在,请更换`;
        }
        newCombos.add(comboKey);
      }
      toCreate.push({
        ...data,
        name: finalName,
        deviceType: data.deviceType || "unknown",
        createdAt: new Date(),
      });
    });
    const continuityCheckByCode = new Map();
    deviceCodes.forEach((dc) => {
      continuityCheckByCode.set(dc, new Map(channelSubMapByCode.get(dc)));
    });
    list.forEach((data) => {
      const dc = String(data.deviceCode || "");
      const channelNo = String(data.channelNo || "");
      const subChannelNo = Number(data.subChannelNo);
      if (!dc || !channelNo || Number.isNaN(subChannelNo)) return;
      const map = continuityCheckByCode.get(dc);
      const arr = map.get(channelNo) || [];
      arr.push(subChannelNo);
      map.set(channelNo, arr);
    });
    deviceCodes.forEach((dc) => {
      const map = continuityCheckByCode.get(dc);
      Array.from(map.keys()).forEach((ch) => {
        const arr = Array.from(
          new Set((map.get(ch) || []).filter((n) => !Number.isNaN(n))),
        ).sort((a, b) => a - b);
        for (let i = 0; i < arr.length; i++) {
          if (i === 0 && arr[i] !== 1) {
            throw `通道号${ch}下的子通道号必须从1开始`;
          }
          if (i > 0 && arr[i] !== arr[i - 1] + 1) {
            throw `通道号${ch}下的子通道号必须连续,当前缺少子通道号${arr[i - 1] + 1}`;
          }
        }
      });
    });
    if (Array.isArray(payload)) {
      const res = await models.SubDevices.bulkCreate(toCreate, {
        returning: true,
        transaction,
      });
      await transaction.commit();
      const ids = res.map((r) => r.id);
      ctx.body = { ids };
      ctx.status = 200;
      return;
    } else {
      const one = toCreate[0];
      const res = await models.SubDevices.create(one, { transaction });
      await transaction.commit();
      ctx.body = { id: res.id };
      ctx.status = 200;
      return;
    }
  } catch (error) {
    if (transaction) {
      try {
        await transaction.rollback();
      } catch (e) {}
    }
    ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
    ctx.status = 400;
    ctx.body = {
      message:
        typeof error === "string"
          ? error
          : error && error.message
            ? error.message
            : "新增子设备失败",
    };
  }
}

async function importSubDevices(ctx) {
  let transaction = null;
  try {
    const { models } = ctx.fs.dc;
    const { sourceDeviceCode, targetDeviceCode } = ctx.request.body || {};
    const src = String(sourceDeviceCode || "").trim();
    const tar = String(targetDeviceCode || "").trim();
    if (!src || !tar) {
      throw "缺少参数: sourceDeviceCode 或 targetDeviceCode";
    }
    if (src === tar) {
      throw "源设备与目标设备不能相同";
    }
    const devRows = await models.Devices.findAll({
      where: { deviceCode: { $in: [src, tar] } },
      attributes: ["deviceCode", "productCode"],
    });
    const devMap = new Map(
      devRows.map((d) => [
        String(d.deviceCode || ""),
        String(d.productCode || ""),
      ]),
    );
    const srcPc = devMap.get(src);
    const tarPc = devMap.get(tar);
    if (!srcPc || !tarPc) {
      throw "设备不存在或未上报，无法导入";
    }
    if (srcPc !== tarPc) {
      throw "设备型号不一致，禁止导入";
    }
    const sourceSubs = await models.SubDevices.findAll({
      where: { deviceCode: src, isDeleted: false },
    });
    if (!sourceSubs || sourceSubs.length === 0) {
      ctx.status = 200;
      ctx.body = { ids: [], skipped: [], renamed: [] };
      return;
    }
    const skipped = [];
    const renameMap = [];
    const newNames = new Set();
    const newCombos = new Set();
    const toCreate = [];
    sourceSubs.forEach((d) => {
      const channelNo = d.channelNo;
      const subChannelNo = d.subChannelNo;
      const moduleNo = d.moduleNo;
      const chProvided =
        channelNo !== undefined && channelNo !== null && channelNo !== "";
      const subProvided =
        subChannelNo !== undefined &&
        subChannelNo !== null &&
        subChannelNo !== "";
      const mdProvided =
        moduleNo !== undefined && moduleNo !== null && moduleNo !== "";
      const comboKey = `${String(channelNo || "")}|${String(subChannelNo || "")}|${String(moduleNo || "")}`;
      if (chProvided && subProvided && mdProvided) {
        if (newCombos.has(comboKey)) {
          skipped.push(comboKey);
          return;
        }
      }
      let baseName = String(d.name || "");
      if (!baseName) {
        const base = (d.deviceType && String(d.deviceType)) || "子设备";
        const suffix =
          (chProvided ? `-${channelNo}` : "") +
          (subProvided ? `-${subChannelNo}` : "") +
          (mdProvided ? `-${moduleNo}` : "");
        baseName = `${base}${suffix || ""}`.trim();
      }
      let finalName = baseName;
      if (newNames.has(finalName)) {
        let idx = 1;
        while (newNames.has(`${baseName}-复制${idx}`)) {
          idx += 1;
        }
        finalName = `${baseName}-复制${idx}`;
        renameMap.push({ from: baseName, to: finalName });
      }
      newNames.add(finalName);
      if (chProvided && subProvided && mdProvided) newCombos.add(comboKey);
      toCreate.push({
        ...d.dataValues,
        id: undefined,
        deviceCode: tar,
        name: finalName,
        createdAt: new Date(),
        updatedAt: undefined,
        isDeleted: false,
      });
    });
    const continuityCheck = new Map();
    toCreate.forEach((data) => {
      const channelNo = String(data.channelNo || "");
      const subChannelNo = Number(data.subChannelNo);
      if (!channelNo || Number.isNaN(subChannelNo)) return;
      const arr = continuityCheck.get(channelNo) || [];
      arr.push(subChannelNo);
      continuityCheck.set(channelNo, arr);
    });
    Array.from(continuityCheck.keys()).forEach((ch) => {
      const arr = Array.from(
        new Set(
          (continuityCheck.get(ch) || []).filter((n) => !Number.isNaN(n)),
        ),
      ).sort((a, b) => a - b);
      for (let i = 0; i < arr.length; i++) {
        if (i === 0 && arr[i] !== 1) {
          throw `通道号${ch}下的子通道号必须从1开始`;
        }
        if (i > 0 && arr[i] !== arr[i - 1] + 1) {
          throw `通道号${ch}下的子通道号必须连续,当前缺少子通道号${arr[i - 1] + 1}`;
        }
      }
    });
    transaction = await ctx.fs.dc.orm.transaction();
    await models.SubDevices.update(
      { isDeleted: true },
      {
        where: { deviceCode: tar, isDeleted: false },
        transaction,
      },
    );
    if (toCreate.length === 0) {
      await transaction.commit();
      ctx.status = 200;
      ctx.body = { ids: [], skipped, renamed: renameMap };
      return;
    }
    const res = await models.SubDevices.bulkCreate(toCreate, {
      returning: true,
      transaction,
    });
    await transaction.commit();
    const ids = res.map((r) => r.id);
    ctx.status = 200;
    ctx.body = { ids, skipped, renamed: renameMap };
  } catch (error) {
    if (transaction) {
      try {
        await transaction.rollback();
      } catch (e) {}
    }
    ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
    ctx.status = 400;
    ctx.body = {
      message:
        typeof error === "string"
          ? error
          : error && error.message
            ? error.message
            : "导入子设备失败",
    };
  }
}
async function modifySubDevice(ctx) {
  try {
    const { models } = ctx.fs.dc;
    const { id } = ctx.params;
    const data = ctx.request.body;
    if (!id) {
      throw "缺少参数:子设备ID";
    }

    // 获取当前要修改的子设备信息
    const currentDevice = await models.SubDevices.findOne({ where: { id } });
    if (!currentDevice) {
      throw "子设备不存在";
    }

    const { deviceCode, channelNo, subChannelNo, moduleNo, name } = data;

    // 查询该设备的所有子设备(排除当前正在修改的设备)
    const finalDeviceCode = deviceCode || currentDevice.deviceCode;
    const parentDevice = await models.Devices.findOne({
      where: { deviceCode: finalDeviceCode },
      attributes: ["deviceCode"],
      include: [{ model: models.ProductLibrary, attributes: ["model"] }],
    });
    const subChannelLimit = getSubChannelLimit(getProductModel(parentDevice));
    const existingSubDevices = await models.SubDevices.findAll({
      where: {
        deviceCode: finalDeviceCode,
        id: { $ne: id },
      },
      attributes: [
        "channelNo",
        "subChannelNo",
        "moduleNo",
        "name",
        "isDeleted",
      ],
    });

    // 1. 验证子设备名称唯一性
    if (name && name !== currentDevice.name) {
      const nameExists = existingSubDevices.find(
        (device) => device.name === name && device.isDeleted == false,
      );
      if (nameExists) {
        throw `子设备名称"${name}"已存在,请使用其他名称`;
      }
    }

    // 如果修改了关键字段,需要进行验证
    if (
      channelNo !== undefined ||
      subChannelNo !== undefined ||
      moduleNo !== undefined
    ) {
      const finalChannelNo =
        channelNo !== undefined ? channelNo : currentDevice.channelNo;
      const finalSubChannelNo =
        subChannelNo !== undefined ? subChannelNo : currentDevice.subChannelNo;
      const finalModuleNo =
        moduleNo !== undefined ? moduleNo : currentDevice.moduleNo;

      // 按父设备型号验证子通道号范围（FS-M24 为 1~20，其余为 1~5）
      const subChannelNumber = Number(finalSubChannelNo);
      if (
        !Number.isInteger(subChannelNumber) ||
        subChannelNumber < 1 ||
        subChannelNumber > subChannelLimit
      ) {
        throw getSubChannelRangeMessage(subChannelLimit);
      }

      // 2. 验证通道号+子通道号+模块号的唯一性
      const duplicateDevice = existingSubDevices.find(
        (device) =>
          device.channelNo == finalChannelNo &&
          device.subChannelNo == finalSubChannelNo &&
          device.moduleNo == finalModuleNo &&
          device.isDeleted == false,
      );
      if (duplicateDevice) {
        throw `通道号${finalChannelNo}-子通道号${finalSubChannelNo}-模块号${finalModuleNo}的组合已存在,请更换`;
      }

      // 3. 验证子通道号的连续性
      // 判断是否修改了通道号或子通道号
      const channelChanged =
        channelNo !== undefined && channelNo != currentDevice.channelNo;
      const subChannelChanged =
        subChannelNo !== undefined &&
        subChannelNo != currentDevice.subChannelNo;

      if (channelChanged || subChannelChanged) {
        // 获取修改后通道下的所有子通道号(排除当前设备)
        const channelDevices = existingSubDevices.filter(
          (device) =>
            device.isDeleted == false && device.channelNo == finalChannelNo,
        );
        const existingSubChannels = [
          ...new Set(channelDevices.map((d) => Number(d.subChannelNo))),
        ].sort((a, b) => a - b);

        // 构建修改后的子通道号列表
        const afterModifySubChannels = [
          ...existingSubChannels,
          subChannelNumber,
        ]
          .sort((a, b) => a - b)
          .filter((v, i, arr) => arr.indexOf(v) === i); // 去重

        // 如果是从一个通道移到另一个通道,需要检查原通道是否还保持连续
        if (channelChanged) {
          const originalChannelDevices = existingSubDevices.filter(
            (device) =>
              device.isDeleted == false &&
              device.channelNo == currentDevice.channelNo,
          );
          const originalSubChannels = [
            ...new Set(
              originalChannelDevices.map((d) => Number(d.subChannelNo)),
            ),
          ].sort((a, b) => a - b);

          // 验证原通道的连续性
          if (originalSubChannels.length > 0) {
            for (let i = 0; i < originalSubChannels.length; i++) {
              if (i === 0 && originalSubChannels[i] !== 1) {
                throw `修改后会导致原通道号${currentDevice.channelNo}的子通道号不从1开始`;
              }
              if (
                i > 0 &&
                originalSubChannels[i] !== originalSubChannels[i - 1] + 1
              ) {
                throw `修改后会导致原通道号${currentDevice.channelNo}的子通道号不连续(${originalSubChannels[i - 1]}到${originalSubChannels[i]})`;
              }
            }
          }
        }

        // 验证新通道的连续性
        for (let i = 0; i < afterModifySubChannels.length; i++) {
          if (i === 0 && afterModifySubChannels[i] !== 1) {
            throw `通道号${finalChannelNo}下的子通道号必须从1开始`;
          }
          if (
            i > 0 &&
            afterModifySubChannels[i] !== afterModifySubChannels[i - 1] + 1
          ) {
            throw `通道号${finalChannelNo}下的子通道号必须连续,当前缺少子通道号${afterModifySubChannels[i - 1] + 1}`;
          }
        }
      }
    }

    await models.SubDevices.update(
      { ...data, updatedAt: new Date() },
      { where: { id } },
    );

    ctx.status = 204;
  } catch (error) {
    ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
    ctx.status = 400;
    ctx.body = {
      message: typeof error == "string" ? error : "修改子设备失败",
    };
  }
}

async function delSubDevices(ctx) {
  try {
    const { models } = ctx.fs.dc;
    const { id } = ctx.params;
    if (!id) {
      throw "缺少参数:子设备ID";
    }
    await models.SubDevices.update({ isDeleted: true }, { where: { id } });

    ctx.status = 204;
  } catch (error) {
    ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
    ctx.status = 400;
    ctx.body = {
      message: typeof error == "string" ? error : "删除子设备失败",
    };
  }
}

async function getSubDevices(ctx) {
  let rslt = [];
  try {
    const { models } = ctx.fs.dc;
    const { deviceCode } = ctx.query;
    if (!deviceCode) {
      throw "设备编号不能为空";
    }

    rslt = await models.SubDevices.findAll({ where: { deviceCode } });

    ctx.body = rslt;
    ctx.status = 200;
  } catch (error) {
    ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
    ctx.status = 400;
    ctx.body = {
      message: typeof error == "string" ? error : "获取子设备失败",
    };
  }
}

// 根据设备编码获取子设备
async function getSubDevicesByDeviceCode(ctx) {
  let rslt = [];
  try {
    const { models } = ctx.fs.dc;
    const { deviceCode, model } = ctx.query;
    if (!deviceCode) {
      throw "设备编号不能为空";
    }
    if (!model) {
      throw "设备型号不能为空";
    }
    const product = await models.ProductLibrary.findOne({
      where: { model },
      attributes: ["productCode"],
    });
    if (!product || !product.productCode) {
      ctx.body = "未找到对应型号的产品编码";
      ctx.status = 200;
      return;
    }
    const queryCode = `${product.productCode}${deviceCode}`;
    const subDevices = await models.SubDevices.findAll({
      where: {
        deviceCode: { $like: `%${queryCode}` },
        isDeleted: false,
      },
      order: [
        ["channelNo", "asc"],
        ["subChannelNo", "asc"],
        ["moduleNo", "asc"],
      ],
    });
    const formulaIds = Array.from(
      new Set(
        subDevices
          .map((d) => Number(d.formulaId))
          .filter((id) => !Number.isNaN(id) && id > 0),
      ),
    );
    let formulaMap = new Map();
    if (formulaIds.length > 0) {
      const formulas = await models.Formula.findAll({
        where: { id: { $in: formulaIds } },
        attributes: ["id", "expression"],
      });
      formulaMap = new Map(formulas.map((f) => [f.id, f.expression]));
    }
    const axyModels = Array.from(
      new Set(subDevices.map((d) => String(d.axyModel || "")).filter(Boolean)),
    );
    const protocolNos = Array.from(
      new Set(
        subDevices.map((d) => String(d.protocolNo || "")).filter(Boolean),
      ),
    );
    let sensorMap = new Map();
    if (axyModels.length > 0 && protocolNos.length > 0) {
      const sensors = await models.SensorTypeModelMapping.findAll({
        where: {
          axyModel: { $in: axyModels },
          protocolNo: { $in: protocolNos },
        },
        attributes: ["axyModel", "protocolNo", "sensorName"],
      });
      sensorMap = new Map(
        sensors.map((s) => [`${s.axyModel}|${s.protocolNo}`, s.sensorName]),
      );
    }
    rslt = subDevices.map((d) => {
      const key = `${String(d.axyModel || "")}|${String(d.protocolNo || "")}`;
      return {
        ...d.dataValues,
        formulaName: formulaMap.get(Number(d.formulaId)) || null,
        sensorName: sensorMap.get(key) || null,
      };
    });
    ctx.body = rslt;
    ctx.status = 200;
  } catch (error) {
    ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
    ctx.status = 400;
    ctx.body = {
      message: typeof error == "string" ? error : "获取相关子设备失败",
    };
  }
}

async function getCommandHistories(ctx) {
  let rslt = {};
  try {
    const { models } = ctx.fs.dc;
    const { pageSize, page, deviceCode, startTime, endTime, commandName } =
      ctx.query;
    if (!deviceCode) {
      throw "设备编号不能为空";
    }
    let findOption = {
      where: { deviceCode },
      order: [["commandTime", "desc"]],
    };
    if (pageSize && page) {
      findOption.offset = (Number(page) - 1) * Number(pageSize);
      findOption.limit = Number(pageSize);
    }
    if (startTime && endTime) {
      findOption.where.commandTime = { $between: [startTime, endTime] };
    }
    if (commandName) {
      findOption.where.commandName = { $like: `%${commandName}%` };
    }
    rslt = await models.CommandHistories.findAndCountAll(findOption);

    ctx.body = rslt;
    ctx.status = 200;
  } catch (error) {
    ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
    ctx.status = 400;
    ctx.body = {
      message: typeof error == "string" ? error : "获取下发历史失败",
    };
  }
}

async function getDiagnosticHistories(ctx) {
  try {
    const { clickHouse } = ctx.app.fs;
    const { page, deviceCode, startTime, endTime, exportAll } = ctx.query;
    if (!deviceCode) {
      throw "设备编号不能为空";
    }

    const pageNum = Number(page);
    const safePage = Number.isSafeInteger(pageNum) && pageNum > 0 ? pageNum : 1;
    const pageSize = 10;
    const offset = (safePage - 1) * pageSize;
    const exportingAll = String(exportAll) === "1" || String(exportAll) === "true";
    const where = [
      `device_code = '${escapeClickHouseString(deviceCode)}'`,
    ];

    if (startTime && endTime) {
      where.push(
        `created_at >= '${escapeClickHouseString(startTime)}'`,
        `created_at <= '${escapeClickHouseString(endTime)}'`,
      );
    }

    const whereSql = `WHERE ${where.join(" AND ")}`;
    const countQuery = `
      SELECT count() AS total
      FROM diagnostic_histories
      ${whereSql}
    `;
    const pageSql = exportingAll ? "" : `LIMIT ${pageSize} OFFSET ${offset}`;
    const dataQuery = `
      SELECT
        id,
        device_code AS deviceCode,
        content,
        at_time AS atTime,
        created_at AS createdAt
      FROM diagnostic_histories
      ${whereSql}
      ORDER BY created_at DESC, id DESC
      ${pageSql}
    `;
    const [countRes, rows] = await Promise.all([
      clickHouse.defaultDb.query(countQuery).toPromise(),
      clickHouse.defaultDb.query(dataQuery).toPromise(),
    ]);

    ctx.body = {
      count: Number((countRes && countRes[0] && countRes[0].total) || 0),
      rows: (rows || []).map(normalizeDiagnosticHistory),
      page: safePage,
      pageSize: exportingAll ? (rows || []).length : pageSize,
    };
    ctx.status = 200;
  } catch (error) {
    ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
    ctx.status = 400;
    ctx.body = {
      message: typeof error == "string" ? error : "获取诊断数据失败",
    };
  }
}

async function getSensorTypeModelMapping(ctx) {
  let rslt = [];
  try {
    const { models } = ctx.fs.dc;
    const { collectorName } = ctx.query;

    let findOption = {};

    // 如果传递了采集仪名称，则先查找对应的id，然后添加筛选条件
    if (collectorName) {
      const productLibrary = await models.ProductLibrary.findOne({
        where: { model: collectorName },
        attributes: ["id"],
      });

      if (productLibrary) {
        findOption.where = {
          collectorId: productLibrary.id,
        };
      }
      // 如果没有找到对应的产品，不设置 where 条件，返回全部数据
    }

    rslt = await models.SensorTypeModelMapping.findAll(findOption);
    ctx.body = rslt;
    ctx.status = 200;
  } catch (error) {
    ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
    ctx.status = 400;
    ctx.body = {
      message: typeof error === "string" ? error : "获取传感器型号对应表失败",
    };
  }
}

async function getDevicesCodeModelMapping(ctx) {
  let rslt = [];
  try {
    const { models } = ctx.fs.dc;

    rslt = await models.DevicesCodeModelMapping.findAll();

    ctx.body = rslt;
    ctx.status = 200;
  } catch (error) {
    ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
    ctx.status = 400;
    ctx.body = {
      message: typeof error == "string" ? error : "获取设备型号编码对应表失败",
    };
  }
}

async function issueCommand(ctx) {
  try {
    const { devices, userId } = ctx.request.body;
    if (!devices) {
      throw "缺少参数: devices";
    }

    if (!userId) {
      throw "缺少参数: userId";
    }
    await ctx.app.fs.deviceManageRequest.post(`issue/batch`, {
      data: { devices, userId },
    });

    ctx.status = 204;
  } catch (error) {
    ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
    ctx.status = 400;
    ctx.body = {
      message: typeof error == "string" ? error : "下发指令失败",
    };
  }
}

async function issueSubCommand(ctx) {
  try {
    const { deviceCode } = ctx.params;
    const { subids } = ctx.query;
    if (!deviceCode) {
      throw "缺少参数：deviceCode";
    }

    let url = `issue_sensor/${deviceCode}`;
    if (subids) {
      url += `?subids=${subids}`;
    }
    await ctx.app.fs.deviceManageRequest.post(url);

    ctx.status = 204;
  } catch (error) {
    ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
    ctx.status = 400;
    ctx.body = {
      message: typeof error == "string" ? error : "下发子设备指令失败",
    };
  }
}

async function otaDevice(ctx) {
  try {
    const { devices, version } = ctx.request.body;
    if (!devices || !version) {
      throw "缺少参数: devices 或 version";
    }

    await ctx.app.fs.deviceManageRequest.post("ota/batch", {
      data: { devices, version },
    });

    ctx.status = 204;
  } catch (error) {
    ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
    ctx.status = 400;
    ctx.body = {
      message: typeof error == "string" ? error : "下发固件失败",
    };
  }
}

async function clearAllChannels(ctx) {
  try {
    const { device } = ctx.request.body;
    if (!device) {
      throw "缺少参数: device";
    }
    await ctx.app.fs.deviceManageRequest.post(
      `issue/clear_all_channels/${device}`,
    );
    ctx.status = 204;
  } catch (error) {
    ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
    ctx.status = 400;
    ctx.body = {
      message: typeof error == "string" ? error : "清除全部通道失败",
    };
  }
}

async function distributeConf(ctx) {
  try {
    const { device } = ctx.request.body;
    if (!device) {
      throw "缺少参数: device";
    }
    await ctx.app.fs.deviceManageRequest.post(`issue/overall/${device}`);
    ctx.status = 204;
  } catch (error) {
    ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
    ctx.status = 400;
    ctx.body = {
      message: typeof error == "string" ? error : "统一下发配置失败",
    };
  }
}
async function getSubDevicesData(ctx) {
  try {
    const { clickHouse } = ctx.app.fs;
    const { deviceCode, channelNo, subChannelNo } = ctx.request.body || {};
    if (
      deviceCode === undefined ||
      deviceCode === null ||
      deviceCode === "" ||
      channelNo === undefined ||
      channelNo === null ||
      channelNo === "" ||
      subChannelNo === undefined ||
      subChannelNo === null ||
      subChannelNo === ""
    ) {
      throw "缺少参数: device或channel或subChannel";
    }

    const safeChannelNo = Number(channelNo);
    const safeSubChannelNo = Number(subChannelNo);
    if (!Number.isInteger(safeChannelNo) || !Number.isInteger(safeSubChannelNo)) {
      throw "channel和subChannel必须为整数";
    }

    const query = `
      SELECT
        id,
        device_code AS deviceCode,
        channel_no AS channelNo,
        sub_channel_no AS subChannelNo,
        data,
        created_at AS createdAt
      FROM sensor_diagnostic_histories
      WHERE device_code = '${escapeClickHouseString(deviceCode)}'
        AND channel_no = ${safeChannelNo}
        AND sub_channel_no = ${safeSubChannelNo}
      ORDER BY created_at DESC, id DESC
      LIMIT 1
    `;
    const rows = await clickHouse.defaultDb.query(query).toPromise();
    const res = rows && rows[0] ? normalizeSensorDiagnosticHistory(rows[0]) : null;

    ctx.status = 200;
    ctx.body = res;
  } catch (error) {
    ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
    ctx.status = 400;
    ctx.body = {
      message: typeof error == "string" ? error : "获取子设备数据失败",
    };
  }
}
// 获取子设备配置公式
async function getFormulaData(ctx) {
  try {
    const models = ctx.fs.dc.models;
    const res = await models.Formula.findAll();
    ctx.status = 200;
    ctx.body = res;
  } catch (error) {
    ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
    ctx.status = 400;
    ctx.body = {
      message: typeof error == "string" ? error : "获取子设备配置公式失败",
    };
  }
}

async function addExternalUserDevices(ctx) {
  let transaction = null;
  try {
    const { models } = ctx.fs.dc;
    const uinfo = (ctx.fs.api && ctx.fs.api.userInfo) || {};
    const userType = uinfo.userType || "internal";
    const uid = uinfo.id;
    if (userType !== "external" || !uid) {
      ctx.status = 403;
      ctx.body = { message: "仅外部注册用户可添加设备" };
      return;
    }
    const payload = ctx.request.body;
    const arr = Array.isArray(payload) ? payload : [];
    if (arr.length === 0) {
      ctx.status = 400;
      ctx.body = { message: "缺少设备数据" };
      return;
    }
    const Sequelize = ctx.fs.dc.ORM;
    const fullCodes = [];
    arr.forEach((item) => {
      const pc = String(item.productCode || "").trim();
      const ids = Array.isArray(item.deviceIds) ? item.deviceIds : [];
      ids.forEach((id) => {
        const did = String(id || "").trim();
        if (pc && did) fullCodes.push(`${pc}${did}`);
      });
    });
    const uniqFullCodes = Array.from(new Set(fullCodes.filter(Boolean)));
    const devRows =
      uniqFullCodes.length > 0
        ? await models.Devices.findAll({
            where: { deviceCode: { [Sequelize.Op.in]: uniqFullCodes } },
            attributes: ["deviceCode", "productCode"],
          })
        : [];
    const foundMap = new Map();
    devRows.forEach((d) => {
      const dc = String(d.deviceCode || "");
      const pc = String(d.productCode || "");
      if (dc) foundMap.set(dc, pc);
    });
    const notFound = [];
    const modelMismatch = [];
    arr.forEach((item) => {
      const pc = String(item.productCode || "").trim();
      const ids = Array.isArray(item.deviceIds) ? item.deviceIds : [];
      ids.forEach((id) => {
        const did = String(id || "").trim();
        if (!did || !pc) return;
        const full = `${pc}${did}`;
        const foundPc = foundMap.get(full);
        if (!foundPc) notFound.push(full);
        else if (foundPc !== pc) modelMismatch.push(full);
      });
    });
    if (notFound.length > 0 || modelMismatch.length > 0) {
      const parts = [];
      if (notFound.length > 0)
        // 拼接出来的 device_code 在 devices 表查不到时，提示为“设备不存在”
        parts.push(
          `设备不存在：${notFound.join("、")}，请确认设备已成功联网并上报数据`,
        );
      if (modelMismatch.length > 0)
        // 拼接出来的 device_code 在 devices 表查到，但该行的 product_code 与提交的 productCode 不相等时，提示为“设备型号不匹配”
        parts.push(`设备型号不匹配：${modelMismatch.join("、")}`);
      ctx.status = 400;
      ctx.body = { message: parts.join("；") };
      return;
    }
    const toCreate = [];
    arr.forEach((item) => {
      const model = String(item.model || "").trim();
      const productCode = String(item.productCode || "").trim();
      const ids = Array.isArray(item.deviceIds) ? item.deviceIds : [];
      ids.forEach((id) => {
        const deviceCode = String(id || "").trim();
        if (model && productCode && deviceCode) {
          toCreate.push({ userId: uid, model, productCode, deviceCode });
        }
      });
    });
    if (toCreate.length === 0) {
      ctx.status = 400;
      ctx.body = { message: "设备数据不完整" };
      return;
    }
    const incomingBindings = Array.from(
      new Map(
        toCreate.map((item) => [
          externalBindingKey(item.productCode, item.deviceCode),
          item,
        ]),
      ).values(),
    );
    const existedSelf = await models.ExternalUserDevice.findAll({
      where: {
        userId: uid,
        $or: incomingBindings.map((item) => ({
          productCode: item.productCode,
          deviceCode: item.deviceCode,
        })),
      },
      attributes: ["productCode", "deviceCode"],
    });
    const existedSelfSet = new Set(
      existedSelf.map((item) =>
        externalBindingKey(item.productCode, item.deviceCode),
      ),
    );
    const dedup = incomingBindings.filter(
      (item) => !existedSelfSet.has(externalBindingKey(item.productCode, item.deviceCode)),
    );
    if (dedup.length === 0) {
      ctx.status = 400;
      ctx.body = { message: "设备ID已存在" };
      return;
    }
    transaction = await ctx.fs.dc.orm.transaction();
    await models.ExternalUserDevice.bulkCreate(dedup, { transaction });
    await transaction.commit();
    clearExternalUserDeviceCaches(uid);
    const duplicatedDetails = incomingBindings
      .filter((item) =>
        existedSelfSet.has(externalBindingKey(item.productCode, item.deviceCode)),
      )
      .map((item) => ({
        productCode: item.productCode,
        deviceCode: item.deviceCode,
        fullDeviceCode: externalFullDeviceCode(item.productCode, item.deviceCode),
      }));
    ctx.status = 200;
    ctx.body = {
      created: dedup.length,
      // 保留旧字段，避免既有调用方升级期间解析失败。
      duplicated: Array.from(new Set(duplicatedDetails.map((item) => item.deviceCode))),
      duplicatedDetails,
    };
  } catch (error) {
    if (transaction && !transaction.finished) await transaction.rollback();
    ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
    ctx.status = 400;
    const constraint =
      (error && error.parent && error.parent.constraint) ||
      (error && error.original && error.original.constraint);
    ctx.body = {
      // 同时保留数据库唯一约束作为并发提交时的兜底，避免将 PostgreSQL 原始异常暴露给前端。
      message:
        typeof error == "string"
          ? error
          : constraint === "uniq_user_device"
            ? "设备ID已存在；当前数据库仍使用旧的设备绑定唯一约束，请执行绑定表迁移"
            : error && error.name === "SequelizeUniqueConstraintError"
              ? "该设备型号下的设备ID已绑定"
              : "添加设备失败",
    };
  }
}

async function removeExternalUserDevices(ctx) {
  let transaction = null;
  try {
    const { models } = ctx.fs.dc;
    const uinfo = (ctx.fs.api && ctx.fs.api.userInfo) || {};
    const userType = uinfo.userType || "internal";
    const uid = uinfo.id;
    if (userType !== "external" || !uid) {
      ctx.status = 403;
      ctx.body = { message: "仅外部注册用户可解绑设备" };
      return;
    }
    const payload = ctx.request.body;
    const bindingMap = new Map();
    if (payload && Array.isArray(payload.bindings)) {
      payload.bindings.forEach((item) => {
        const productCode = String((item && item.productCode) || "").trim();
        const deviceCode = String((item && item.deviceCode) || "").trim();
        if (productCode && deviceCode) {
          bindingMap.set(externalBindingKey(productCode, deviceCode), {
            productCode,
            deviceCode,
          });
        }
      });
    }
    const bindings = Array.from(bindingMap.values());
    let codes = new Set();
    if (Array.isArray(payload)) {
      payload.forEach((item) => {
        if (typeof item === "string" || typeof item === "number") {
          const c = String(item).trim();
          if (c) codes.add(c);
        } else if (item && typeof item === "object") {
          const ids = Array.isArray(item.deviceIds) ? item.deviceIds : [];
          ids.forEach((id) => {
            const c = String(id || "").trim();
            if (c) codes.add(c);
          });
          const dc = String(item.deviceCode || "").trim();
          if (dc) codes.add(dc);
        }
      });
    } else if (payload && Array.isArray(payload.deviceIds)) {
      payload.deviceIds.forEach((id) => {
        const c = String(id || "").trim();
        if (c) codes.add(c);
      });
    } else if (payload && payload.deviceCode) {
      const c = String(payload.deviceCode).trim();
      if (c) codes.add(c);
    }
    const codesArr = Array.from(codes);
    if (bindings.length === 0 && codesArr.length === 0) {
      ctx.status = 400;
      ctx.body = { message: "缺少设备ID" };
      return;
    }
    const exactBindingRequest = bindings.length > 0;
    const existed = await models.ExternalUserDevice.findAll({
      where: exactBindingRequest
        ? {
            userId: uid,
            $or: bindings.map((item) => ({
              productCode: item.productCode,
              deviceCode: item.deviceCode,
            })),
          }
        : { userId: uid, deviceCode: { $in: codesArr } },
      attributes: ["productCode", "deviceCode"],
    });
    const existedSet = new Set(
      existed.map((item) =>
        exactBindingRequest
          ? externalBindingKey(item.productCode, item.deviceCode)
          : item.deviceCode,
      ),
    );
    const submitted = exactBindingRequest
      ? bindings.map((item) => ({
          key: externalBindingKey(item.productCode, item.deviceCode),
          label: externalFullDeviceCode(item.productCode, item.deviceCode),
        }))
      : codesArr.map((code) => ({ key: code, label: code }));
    if (existedSet.size === 0) {
      ctx.status = 200;
      ctx.body = {
        removed: 0,
        notFound: submitted.map((item) => item.label),
        message: "设备未绑定或已解绑",
      };
      return;
    }
    transaction = await ctx.fs.dc.orm.transaction();
    const removed = await models.ExternalUserDevice.destroy({
      where: exactBindingRequest
        ? {
            userId: uid,
            $or: bindings.map((item) => ({
              productCode: item.productCode,
              deviceCode: item.deviceCode,
            })),
          }
        : { userId: uid, deviceCode: { $in: codesArr } },
      transaction,
    });
    await transaction.commit();
    clearExternalUserDeviceCaches(uid);
    const notFound = submitted
      .filter((item) => !existedSet.has(item.key))
      .map((item) => item.label);
    ctx.status = 200;
    ctx.body = {
      removed,
      notFound,
      message:
        removed > 0 && notFound.length > 0
          ? "部分解绑成功"
          : removed > 0
            ? "解绑成功"
            : "设备未绑定或已解绑",
    };
  } catch (error) {
    if (transaction) await transaction.rollback();
    ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
    ctx.status = 400;
    ctx.body = {
      message: typeof error == "string" ? error : "解绑设备失败",
    };
  }
}

module.exports = {
  getDevices,
  modifyDevice,
  addSubDevices,
  modifySubDevice,
  delSubDevices,
  getSubDevices,
  getSubDevicesByDeviceCode,
  getCommandHistories,
  getDiagnosticHistories,
  getSensorTypeModelMapping,
  getDevicesCodeModelMapping,
  issueCommand,
  issueSubCommand,
  otaDevice,
  clearAllChannels,
  distributeConf,
  getSubDevicesData,
  getFormulaData,
  addExternalUserDevices,
  removeExternalUserDevices,
  importSubDevices,
  getDevicesSlim,
};
