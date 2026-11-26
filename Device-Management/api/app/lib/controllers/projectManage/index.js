"use strict";

// 项目管理：项目 CRUD、名称模糊搜索、设备/角色绑定

// 轻量选项接口：仅返回{id, name}，用于下拉选择
async function listProjectOptions(ctx) {
  try {
    const { models } = ctx.fs.dc;
    const { keyword } = ctx.query;
    const options = {
      attributes: ["id", "name"],
      order: [["updatedAt", "DESC"]],
    };
    if (keyword) {
      options.where = { name: { $like: `%${keyword}%` } };
    }
    const rows = await models.Project.findAll(options);
    ctx.body = rows;
    ctx.status = 200;
  } catch (error) {
    ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
    ctx.status = 400;
    ctx.body = {
      message: typeof error == "string" ? error : "获取项目选项失败",
    };
  }
}

async function listProjects(ctx) {
  try {
    const { models } = ctx.fs.dc;
    const {
      page,
      pageSize,
      keyword,
      deviceKeyword,
      focusDeviceIds,
      focusDeviceId,
    } = ctx.query;
    const uinfo = (ctx.fs.api && ctx.fs.api.userInfo) || {};
    const userType = uinfo.userType || "internal";
    const userId = uinfo.id;

    const options = {
      order: [["createdAt", "DESC"]],
    };

    // 当同时传入 page 与 pageSize 时才进行分页
    const hasPagination =
      page !== undefined &&
      pageSize !== undefined &&
      page !== "" &&
      pageSize !== "";
    if (hasPagination) {
      const p = parseInt(page, 10);
      const ps = parseInt(pageSize, 10);
      if (!Number.isNaN(p) && !Number.isNaN(ps) && p > 0 && ps > 0) {
        options.limit = ps;
        options.offset = (p - 1) * ps;
      }
    }

    const where = {};
    if (keyword) where.name = { $like: `%${keyword}%` };
    if (userType === "external" && userId) {
      where.createBy = userId;
    }
    // 根据 focusDeviceCodes 内的 deviceIds 进行筛选
    const toArray = (v) => {
      try {
        if (v == null) return [];
        if (Array.isArray(v)) return v;
        const s = String(v).trim();
        if (!s) return [];
        if (s.startsWith("[")) {
          const arr = JSON.parse(s);
          return Array.isArray(arr) ? arr : [];
        }
        return s
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean);
      } catch (_) {
        return [];
      }
    };
    const focusIds = toArray(focusDeviceIds).concat(toArray(focusDeviceId));
    if (focusIds.length > 0) {
      where.$or = focusIds.map((id) => ({
        focusDeviceCodes: { $like: `%${id}%` },
      }));
    }
    if (Object.keys(where).length > 0) options.where = where;

    // 关联设备模糊搜索：支持在 focusDeviceCodes 以及 ProjectDevice 映射中检索
    let filterProjectIds = null;
    if (deviceKeyword && String(deviceKeyword).trim()) {
      const kw = String(deviceKeyword).trim();
      const fromFocus = await models.Project.findAll({
        attributes: ["id"],
        where: {
          focusDeviceCodes: { $like: `%${kw}%` },
          ...(options.where || {}),
        },
      });
      const fromMapping = await models.ProjectDevice.findAll({
        attributes: ["projectId"],
        where: { deviceCode: { $like: `%${kw}%` } },
      });
      const idSet = new Set();
      fromFocus.forEach((p) => idSet.add(p.id));
      fromMapping.forEach((pd) => idSet.add(pd.projectId));
      filterProjectIds = Array.from(idSet);
      options.where = {
        ...(options.where || {}),
        id: { $in: filterProjectIds.length ? filterProjectIds : [-1] },
      };
    }

    options.include = [
      {
        model: models.User,
        as: "creator",
        attributes: ["id", "username", "name"],
        required: false,
      },
    ];
    const rslt = await models.Project.findAndCountAll(options);
    ctx.body = {
      count: rslt.count,
      rows: rslt.rows,
    };
    ctx.status = 200;
  } catch (error) {
    ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
    ctx.status = 400;
    ctx.body = {
      message: typeof error == "string" ? error : "获取项目列表失败",
    };
  }
}

async function getProject(ctx) {
  try {
    const { models } = ctx.fs.dc;
    const { id } = ctx.params;
    if (!id) throw "缺少参数：项目ID";

    const project = await models.Project.findByPk(id, {
      include: [
        {
          model: models.Devices,
          through: { attributes: [] },
          required: false,
        },
        {
          model: models.User,
          as: "creator",
          attributes: ["id", "username", "name"],
          required: false,
        },
      ],
    });
    if (!project) throw "项目不存在";
    ctx.body = project;
    ctx.status = 200;
  } catch (error) {
    ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
    ctx.status = 400;
    ctx.body = {
      message: typeof error == "string" ? error : "获取项目详情失败",
    };
  }
}

async function createProject(ctx) {
  const transaction = await ctx.fs.dc.orm.transaction();
  try {
    const { models } = ctx.fs.dc;
    const Sequelize = ctx.fs.dc.ORM;
    const data = ctx.request.body || {};
    const uinfo = (ctx.fs.api && ctx.fs.api.userInfo) || {};
    if (!data.name || !data.name.trim()) {
      throw "项目名称不能为空";
    }
    // 名称唯一性（可选）：若已有同名项目则提示
    const existed = await models.Project.findOne({
      where: { name: data.name },
      transaction,
    });
    if (existed) throw "项目名称已存在";

    const parseFocusPairs = (v) => {
      try {
        if (!v) return [];
        const arr = typeof v === "string" ? JSON.parse(v) : v;
        if (!Array.isArray(arr)) return [];
        return arr
          .map((it) => {
            const pc =
              it && it.productCode ? String(it.productCode).trim() : "";
            const ids = Array.isArray(it && it.deviceIds)
              ? it.deviceIds
              : String((it && it.deviceIds) || "")
                  .split(",")
                  .map((s) => s.trim())
                  .filter((s) => s);
            return { productCode: pc, deviceIds: ids };
          })
          .filter((x) => x.productCode && x.deviceIds.length > 0);
      } catch (_) {
        return [];
      }
    };
    const focusPairs = parseFocusPairs(data.focusDeviceCodes);
    if (focusPairs.length > 0) {
      const fullCodes = [];
      focusPairs.forEach((p) => {
        p.deviceIds.forEach((id) => {
          const did = String(id).trim();
          if (did) fullCodes.push(`${p.productCode}${did}`);
        });
      });
      const uniqFullCodes = Array.from(new Set(fullCodes.filter(Boolean)));
      const devices = uniqFullCodes.length
        ? await models.Devices.findAll({
            where: { deviceCode: { [Sequelize.Op.in]: uniqFullCodes } },
            attributes: ["deviceCode", "productCode"],
            transaction,
          })
        : [];
      const foundMap = new Map();
      devices.forEach((d) => {
        const dc = String(d.deviceCode || "");
        const pc = String(d.productCode || "");
        if (dc) foundMap.set(dc, pc);
      });
      const notFound = [];
      const modelMismatch = [];
      focusPairs.forEach((p) => {
        p.deviceIds.forEach((id) => {
          const full = `${p.productCode}${String(id).trim()}`;
          const foundPc = foundMap.get(full);
          if (!foundPc) notFound.push(full);
          else if (foundPc !== p.productCode) modelMismatch.push(full);
        });
      });
      if (notFound.length > 0 || modelMismatch.length > 0) {
        const parts = [];
        if (notFound.length > 0)
          parts.push(`设备不存在：${notFound.join("、")}，请确认设备已成功联网并上报数据`);
        if (modelMismatch.length > 0)
          parts.push(`设备型号不匹配：${modelMismatch.join("、")}`);
        throw parts.join("；");
      }
    }

    const parseIncomingIds = (v) => {
      try {
        if (!v) return [];
        if (typeof v === "string") {
          const trimmed = v.trim();
          if (trimmed.startsWith("[")) {
            const arr = JSON.parse(trimmed);
            if (Array.isArray(arr)) {
              if (arr.every((it) => typeof it === "string")) {
                return arr
                  .filter(Boolean)
                  .map((s) => `${s}`.trim())
                  .filter(Boolean);
              }
              return arr
                .map((it) =>
                  Array.isArray(it && it.deviceIds)
                    ? it.deviceIds
                    : `${(it && it.deviceIds) || ""}`
                        .split(",")
                        .map((s) => s.trim())
                )
                .flat()
                .filter((s) => s);
            }
          }
          return trimmed
            .split(",")
            .map((s) => s.trim())
            .filter((s) => s);
        }
        if (Array.isArray(v)) {
          if (v.every((it) => typeof it === "string")) {
            return v
              .filter(Boolean)
              .map((s) => `${s}`.trim())
              .filter(Boolean);
          }
          return v
            .map((it) =>
              Array.isArray(it && it.deviceIds)
                ? it.deviceIds
                : `${(it && it.deviceIds) || ""}`
                    .split(",")
                    .map((s) => s.trim())
            )
            .flat()
            .filter((s) => s);
        }
        return [];
      } catch (_) {
        return [];
      }
    };

    const incomingIds = parseIncomingIds(data.focusDeviceCodes);
    if (incomingIds.length > 0) {
      const fullIds = Array.from(
        new Set(incomingIds.map((x) => String(x)).filter(Boolean))
      );
      const existedBindings =
        fullIds.length > 0
          ? await models.ProjectDevice.findAll({
              where: { deviceCode: { [Sequelize.Op.in]: fullIds } },
              include: [
                {
                  model: models.Project,
                  attributes: ["id", "name", "createBy"],
                },
              ],
              transaction,
            })
          : [];
      {
        const mapping = new Map();
        fullIds.forEach((c) => mapping.set(c, []));
        if (existedBindings && existedBindings.length > 0) {
          existedBindings.forEach((b) => {
            const pdCode = String(b.deviceCode || "");
            fullIds.forEach((inc) => {
              const incStr = String(inc);
              if (pdCode && pdCode === incStr) {
                const arr = mapping.get(incStr) || [];
                if (b.project) arr.push(b.project);
                mapping.set(incStr, arr);
              }
            });
          });
        }
        const focusConds = [];
        fullIds.forEach((c) => {
          focusConds.push({ focusDeviceCodes: c });
          focusConds.push({
            focusDeviceCodes: { [Sequelize.Op.like]: `%,${c},%` },
          });
          focusConds.push({
            focusDeviceCodes: { [Sequelize.Op.like]: `${c},%` },
          });
          focusConds.push({
            focusDeviceCodes: { [Sequelize.Op.like]: `%,${c}` },
          });
          focusConds.push({
            focusDeviceCodes: { [Sequelize.Op.like]: `%\"${c}\"%` },
          });
        });
        if (focusConds.length > 0) {
          const focusProjects = await models.Project.findAll({
            attributes: ["id", "name", "createBy", "focusDeviceCodes"],
            where: { [Sequelize.Op.or]: focusConds },
            transaction,
          });
          if (Array.isArray(focusProjects) && focusProjects.length > 0) {
            focusProjects.forEach((p) => {
              const ids = parseIncomingIds(p.focusDeviceCodes);
              fullIds.forEach((inc) => {
                const incStr = String(inc);
                if (ids.includes(incStr)) {
                  const arr = mapping.get(incStr) || [];
                  arr.push({ id: p.id, name: p.name, createBy: p.createBy });
                  mapping.set(incStr, arr);
                }
              });
            });
          }
        }
        const boundCodes = [];
        let anyOwn = false;
        let anyOther = false;
        const projectNames = new Set();
        mapping.forEach((arr, code) => {
          if (Array.isArray(arr) && arr.length > 0) {
            boundCodes.push(code);
            arr.forEach((p) => {
              const nm = (p && p.name) || (p ? `ID:${p.id}` : "");
              if (nm) projectNames.add(nm);
              if (p && uinfo && uinfo.id && p.createBy === uinfo.id)
                anyOwn = true;
              else anyOther = true;
            });
          }
        });
        if (boundCodes.length > 0) {
          const msgCodes = boundCodes.join("、");
          const msgProjects = Array.from(projectNames).join("、");
          if (anyOwn && !anyOther) {
            throw `设备ID：${msgCodes}已被项目「${msgProjects}」占用，无法重复绑定。请用户自己释放设备后重试。`;
          } else {
            throw `设备ID：${msgCodes}已被项目「${msgProjects}」占用，无法重复绑定。请联系该项目管理员释放设备后重试。`;
          }
        }
      }
    }

    const now = new Date();
    data.createdAt = now;
    if (!data.createBy && uinfo && uinfo.id) {
      data.createBy = uinfo.id;
    }
    const created = await models.Project.create(data, { transaction });
    await transaction.commit();
    ctx.status = 201;
    ctx.body = { id: created.id };
  } catch (error) {
    await transaction.rollback();
    ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
    ctx.status = 400;
    ctx.body = { message: typeof error == "string" ? error : "创建项目失败" };
  }
}

async function updateProject(ctx) {
  const transaction = await ctx.fs.dc.orm.transaction();
  try {
    const { models } = ctx.fs.dc;
    const Sequelize = ctx.fs.dc.ORM;
    const uinfo = (ctx.fs.api && ctx.fs.api.userInfo) || {};
    const { id } = ctx.params;
    const data = ctx.request.body || {};
    if (!id) throw "缺少参数：项目ID";

    if (data.name) {
      const existed = await models.Project.findOne({
        where: { name: data.name },
        transaction,
      });
      if (existed && existed.id !== parseInt(id)) throw "项目名称已存在";
    }
    const parseFocusPairs = (v) => {
      try {
        if (!v) return [];
        const arr = typeof v === "string" ? JSON.parse(v) : v;
        if (!Array.isArray(arr)) return [];
        return arr
          .map((it) => {
            const pc =
              it && it.productCode ? String(it.productCode).trim() : "";
            const ids = Array.isArray(it && it.deviceIds)
              ? it.deviceIds
              : String((it && it.deviceIds) || "")
                  .split(",")
                  .map((s) => s.trim())
                  .filter((s) => s);
            return { productCode: pc, deviceIds: ids };
          })
          .filter((x) => x.productCode && x.deviceIds.length > 0);
      } catch (_) {
        return [];
      }
    };
    if ("focusDeviceCodes" in data) {
      const focusPairs = parseFocusPairs(data.focusDeviceCodes);
      if (focusPairs.length > 0) {
        const fullCodes = [];
        focusPairs.forEach((p) => {
          p.deviceIds.forEach((id) => {
            const did = String(id).trim();
            if (did) fullCodes.push(`${p.productCode}${did}`);
          });
        });
        const uniqFullCodes = Array.from(new Set(fullCodes.filter(Boolean)));
        const devices = uniqFullCodes.length
          ? await models.Devices.findAll({
              where: { deviceCode: { [Sequelize.Op.in]: uniqFullCodes } },
              attributes: ["deviceCode", "productCode"],
              transaction,
            })
          : [];
        const foundMap = new Map();
        devices.forEach((d) => {
          const dc = String(d.deviceCode || "");
          const pc = String(d.productCode || "");
          if (dc) foundMap.set(dc, pc);
        });
        const notFound = [];
        const modelMismatch = [];
        focusPairs.forEach((p) => {
          p.deviceIds.forEach((id) => {
            const full = `${p.productCode}${String(id).trim()}`;
            const foundPc = foundMap.get(full);
            if (!foundPc) notFound.push(full);
            else if (foundPc !== p.productCode) modelMismatch.push(full);
          });
        });
        if (notFound.length > 0 || modelMismatch.length > 0) {
          const parts = [];
          if (notFound.length > 0)
            // 拼接出来的 device_code 在 devices 表查不到时，提示为“设备不存在”
            parts.push(`设备不存在：${notFound.join("、")}，请确认设备已成功联网并上报数据`);
          if (modelMismatch.length > 0)
            //前端提交的 productCode 与 deviceId 拼接出的 device_code 在 devices 表中能查到，但该行的 product_code 与提交的 productCode 不相等时，会提示“设备型号不匹配”
            parts.push(`设备型号不匹配：${modelMismatch.join("、")}`);
          throw parts.join("；");
        }
      }
    }
    const parseIncomingIds = (v) => {
      try {
        if (!v) return [];
        if (typeof v === "string") {
          const trimmed = v.trim();
          if (trimmed.startsWith("[")) {
            const arr = JSON.parse(trimmed);
            if (Array.isArray(arr)) {
              if (arr.every((it) => typeof it === "string")) {
                return arr
                  .filter(Boolean)
                  .map((s) => `${s}`.trim())
                  .filter(Boolean);
              }
              return arr
                .map((it) =>
                  Array.isArray(it && it.deviceIds)
                    ? it.deviceIds
                    : `${(it && it.deviceIds) || ""}`
                        .split(",")
                        .map((s) => s.trim())
                )
                .flat()
                .filter((s) => s);
            }
          }
          return trimmed
            .split(",")
            .map((s) => s.trim())
            .filter((s) => s);
        }
        if (Array.isArray(v)) {
          if (v.every((it) => typeof it === "string")) {
            return v
              .filter(Boolean)
              .map((s) => `${s}`.trim())
              .filter(Boolean);
          }
          return v
            .map((it) =>
              Array.isArray(it && it.deviceIds)
                ? it.deviceIds
                : `${(it && it.deviceIds) || ""}`
                    .split(",")
                    .map((s) => s.trim())
            )
            .flat()
            .filter((s) => s);
        }
        return [];
      } catch (_) {
        return [];
      }
    };

    const incomingIds = parseIncomingIds(data.focusDeviceCodes);
    if (incomingIds.length > 0) {
      const fullIds = Array.from(
        new Set(incomingIds.map((x) => String(x)).filter(Boolean))
      );
      const existedBindings =
        fullIds.length > 0
          ? await models.ProjectDevice.findAll({
              where: {
                deviceCode: { [Sequelize.Op.in]: fullIds },
                projectId: { [Sequelize.Op.ne]: id },
              },
              include: [
                {
                  model: models.Project,
                  attributes: ["id", "name", "createBy"],
                },
              ],
              transaction,
            })
          : [];
      {
        const mapping = new Map();
        fullIds.forEach((c) => mapping.set(c, []));
        if (existedBindings && existedBindings.length > 0) {
          existedBindings.forEach((b) => {
            const pdCode = String(b.deviceCode || "");
            fullIds.forEach((inc) => {
              const incStr = String(inc);
              if (pdCode && pdCode === incStr) {
                const arr = mapping.get(incStr) || [];
                if (b.project) arr.push(b.project);
                mapping.set(incStr, arr);
              }
            });
          });
        }
        const focusConds = [];
        fullIds.forEach((c) => {
          focusConds.push({ focusDeviceCodes: c });
          focusConds.push({
            focusDeviceCodes: { [Sequelize.Op.like]: `%,${c},%` },
          });
          focusConds.push({
            focusDeviceCodes: { [Sequelize.Op.like]: `${c},%` },
          });
          focusConds.push({
            focusDeviceCodes: { [Sequelize.Op.like]: `%,${c}` },
          });
          focusConds.push({
            focusDeviceCodes: { [Sequelize.Op.like]: `%\"${c}\"%` },
          });
        });
        if (focusConds.length > 0) {
          const focusProjects = await models.Project.findAll({
            attributes: ["id", "name", "createBy", "focusDeviceCodes"],
            where: {
              [Sequelize.Op.and]: [
                { id: { [Sequelize.Op.ne]: id } },
                { [Sequelize.Op.or]: focusConds },
              ],
            },
            transaction,
          });
          if (Array.isArray(focusProjects) && focusProjects.length > 0) {
            focusProjects.forEach((p) => {
              const ids = parseIncomingIds(p.focusDeviceCodes);
              fullIds.forEach((inc) => {
                const incStr = String(inc);
                if (ids.includes(incStr)) {
                  const arr = mapping.get(incStr) || [];
                  arr.push({ id: p.id, name: p.name, createBy: p.createBy });
                  mapping.set(incStr, arr);
                }
              });
            });
          }
        }
        const boundCodes = [];
        let anyOwn = false;
        let anyOther = false;
        const projectNames = new Set();
        mapping.forEach((arr, code) => {
          if (Array.isArray(arr) && arr.length > 0) {
            boundCodes.push(code);
            arr.forEach((p) => {
              const nm = (p && p.name) || (p ? `ID:${p.id}` : "");
              if (nm) projectNames.add(nm);
              if (p && uinfo && uinfo.id && p.createBy === uinfo.id)
                anyOwn = true;
              else anyOther = true;
            });
          }
        });
        if (boundCodes.length > 0) {
          const msgCodes = boundCodes.join("、");
          const msgProjects = Array.from(projectNames).join("、");
          if (anyOwn && !anyOther) {
            throw `设备ID：${msgCodes}已被项目「${msgProjects}」占用，无法重复绑定。请用户自己释放设备后重试。`;
          } else {
            throw `设备ID：${msgCodes}已被项目「${msgProjects}」占用，无法重复绑定。请联系该项目管理员释放设备后重试。`;
          }
        }
      }
    }
    // 清洗输入，避免生成 column= 的空赋值
    const sanitizeNumber = (val) => {
      if (val === undefined || val === null) return null;
      if (typeof val === "string" && val.trim() === "") return null;
      const num = Number(val);
      return Number.isFinite(num) ? num : null;
    };

    const payload = {};

    if (data.name !== undefined) payload.name = String(data.name);
    if (data.description !== undefined)
      payload.description = String(data.description);

    // 经纬度：空值转 null，数字/数字字符串转数值
    if ("longitude" in data) {
      const lon = sanitizeNumber(data.longitude);
      if (lon !== null) payload.longitude = lon;
      else payload.longitude = null; // 或者删除该行：不更新经度
    }
    if ("latitude" in data) {
      const lat = sanitizeNumber(data.latitude);
      if (lat !== null) payload.latitude = lat;
      else payload.latitude = null; // 或者删除该行：不更新纬度
    }

    // 地址名：允许空字符串
    if ("locationName" in data) {
      payload.locationName = data.locationName || "";
    }

    // 统一 focusDeviceCodes 为字符串
    if ("focusDeviceCodes" in data) {
      const v = data.focusDeviceCodes;
      if (Array.isArray(v) || (typeof v === "object" && v !== null)) {
        try {
          payload.focusDeviceCodes = JSON.stringify(v);
        } catch (_) {
          payload.focusDeviceCodes = String(v);
        }
      } else if (typeof v !== "string") {
        payload.focusDeviceCodes = String(v);
      } else {
        payload.focusDeviceCodes = v;
      }
    }

    // 移除非项目表字段
    delete payload.devices;
    delete payload.deviceCodes;

    payload.updatedAt = new Date();
    await models.Project.update(payload, { where: { id }, transaction });
    await transaction.commit();
    ctx.status = 204;
  } catch (error) {
    await transaction.rollback();
    ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
    ctx.status = 400;
    ctx.body = { message: typeof error == "string" ? error : "更新项目失败" };
  }
}

async function deleteProject(ctx) {
  const transaction = await ctx.fs.dc.orm.transaction();
  try {
    const { models } = ctx.fs.dc;
    const { id } = ctx.params;
    if (!id) throw "缺少参数：项目ID";

    await models.Project.destroy({ where: { id }, transaction });
    // 同时清理绑定关系
    await models.ProjectDevice.destroy({
      where: { projectId: id },
      transaction,
    });
    await models.RoleProject.destroy({ where: { projectId: id }, transaction });

    await transaction.commit();
    ctx.status = 204;
  } catch (error) {
    await transaction.rollback();
    ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
    ctx.status = 400;
    ctx.body = { message: typeof error == "string" ? error : "删除项目失败" };
  }
}

async function bindDevices(ctx) {
  const transaction = await ctx.fs.dc.orm.transaction();
  try {
    const { models } = ctx.fs.dc;
    const { projectId, deviceCodes } = ctx.request.body || {};
    if (!projectId) throw "缺少参数：projectId";
    if (!Array.isArray(deviceCodes) || deviceCodes.length === 0) {
      throw "缺少参数：deviceCodes";
    }

    const project = await models.Project.findByPk(projectId, { transaction });
    if (!project) throw "项目不存在";
    const codes = (Array.isArray(deviceCodes) ? deviceCodes : [])
      .map((c) => `${c}`.trim())
      .filter((c) => c);
    const uniqCodes = Array.from(new Set(codes));
    const existing = await models.ProjectDevice.findAll({
      where: { projectId: projectId, deviceCode: { $in: uniqCodes } },
      attributes: ["deviceCode"],
      transaction,
    });
    const existingSet = new Set(existing.map((r) => r.deviceCode));
    const toInsert = uniqCodes.filter((c) => !existingSet.has(c));
    if (toInsert.length > 0) {
      const now = new Date();
      await models.ProjectDevice.bulkCreate(
        toInsert.map((code) => ({
          projectId: projectId,
          deviceCode: code,
          createdAt: now,
        })),
        { transaction }
      );
    }
    await transaction.commit();
    ctx.status = 204;
  } catch (error) {
    await transaction.rollback();
    ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
    ctx.status = 400;
    ctx.body = { message: typeof error == "string" ? error : "绑定设备失败" };
  }
}

async function unbindDevice(ctx) {
  try {
    const { models } = ctx.fs.dc;
    const { id } = ctx.params; // projectId
    const { deviceCode } = ctx.query;
    if (!id) throw "缺少参数：项目ID";
    if (!deviceCode) throw "缺少参数：deviceCode";

    await models.ProjectDevice.destroy({
      where: { projectId: id, deviceCode },
    });
    ctx.status = 204;
  } catch (error) {
    ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
    ctx.status = 400;
    ctx.body = { message: typeof error == "string" ? error : "解绑设备失败" };
  }
}

async function getProjectDevices(ctx) {
  try {
    const { models } = ctx.fs.dc;
    const { id } = ctx.params;
    if (!id) throw "缺少参数：项目ID";

    const rslt = await models.Project.findByPk(id, {
      include: [
        {
          model: models.Devices,
          through: { attributes: [] },
          required: false,
        },
      ],
    });
    if (!rslt) throw "项目不存在";
    ctx.body = rslt.Devices || [];
    ctx.status = 200;
  } catch (error) {
    ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
    ctx.status = 400;
    ctx.body = {
      message: typeof error == "string" ? error : "获取项目设备失败",
    };
  }
}

async function bindRolesProject(ctx) {
  const transaction = await ctx.fs.dc.orm.transaction();
  try {
    const { models } = ctx.fs.dc;
    const { projectId, roleIds } = ctx.request.body || {};

    // 归一化为数组，兼容单值/数组两种形态
    const roleIdList =
      roleIds == null ? [] : Array.isArray(roleIds) ? roleIds : [roleIds];
    const projectIdList =
      projectId == null
        ? []
        : Array.isArray(projectId)
        ? projectId
        : [projectId];

    if (roleIdList.length === 0) throw "缺少参数：roleIds";

    // 校验角色是否存在（事务内）
    const roles = await models.Role.findAll({
      where: { id: { $in: roleIdList } },
      transaction,
    });
    const validRoleIds = new Set(roles.map((r) => r.id));
    if (validRoleIds.size === 0) throw "角色不存在";

    // 校验项目是否存在（事务内）
    let validProjectIds = new Set();
    if (projectIdList.length > 0) {
      const projects = await models.Project.findAll({
        where: { id: { $in: projectIdList } },
        transaction,
      });
      validProjectIds = new Set(projects.map((p) => p.id));
      if (validProjectIds.size === 0) throw "项目不存在";
    }

    // 逻辑修正：以角色为中心进行同步
    // 对每个指定的角色，确保其绑定的项目列表完全等于提交的 projectIdList
    for (const rid of validRoleIds) {
      // 查询当前该角色已有的项目关联
      const existingRPs = await models.RoleProject.findAll({
        where: { roleId: rid },
        transaction,
      });
      const existingProjectIds = new Set(existingRPs.map((rp) => rp.projectId));

      // 计算需要删除（当前数据库有但提交列表没有）的绑定
      const idsToRemove = existingRPs
        .filter((rp) => !validProjectIds.has(rp.projectId))
        .map((rp) => rp.id);

      // 计算需要新增（提交列表有但当前数据库没有）的绑定
      const idsToAdd = Array.from(validProjectIds).filter(
        (pid) => !existingProjectIds.has(pid)
      );

      // 执行删除
      if (idsToRemove.length > 0) {
        await models.RoleProject.destroy({
          where: { id: { $in: idsToRemove } },
          transaction,
        });
      }

      // 执行新增
      for (const pid of idsToAdd) {
        await models.RoleProject.create(
          { roleId: rid, projectId: pid },
          { transaction }
        );
      }
    }

    await transaction.commit();
    ctx.status = 204;
  } catch (error) {
    await transaction.rollback();
    ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
    ctx.status = 400;
    ctx.body = {
      message: typeof error == "string" ? error : "角色绑定项目失败",
    };
  }
}

// 获取角色绑定的项目列表（根据角色ID）
async function getProjectRoles(ctx) {
  try {
    const { models } = ctx.fs.dc;
    const { roleId } = ctx.params;
    if (!roleId) throw "缺少参数：角色ID";

    const projects = await models.Project.findAll({
      include: [
        {
          model: models.Role,
          through: { attributes: [] },
          where: { id: roleId },
          required: true,
        },
      ],
    });
    ctx.body = projects;
    ctx.status = 200;
  } catch (error) {
    ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
    ctx.status = 400;
    ctx.body = {
      message: typeof error == "string" ? error : "获取角色绑定项目失败",
    };
  }
}

module.exports = {
  listProjectOptions,
  listProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  bindDevices,
  unbindDevice,
  getProjectDevices,
  bindRolesProject,
  getProjectRoles,
};
