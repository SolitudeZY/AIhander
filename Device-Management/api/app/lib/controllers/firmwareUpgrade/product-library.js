"use strict";
async function postProductLibrary(ctx) {
  try {
    const { models } = ctx.fs.dc;
    const data = ctx.request.body;
    const { productCode, model } = data;

    // 检查产品编码是否重复
    if (productCode) {
      const existingProductCode = await models.ProductLibrary.findOne({
        where: { productCode },
      });
      if (existingProductCode) {
        throw "设备编码已存在";
      }
    }

    // 检查设备型号是否重复
    if (model) {
      const existingModel = await models.ProductLibrary.findOne({
        where: { model },
      });
      if (existingModel) {
        throw "设备型号已存在";
      }
    }

    await models.ProductLibrary.create(data);

    ctx.status = 204;
  } catch (error) {
    ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
    ctx.status = 400;
    ctx.body = {
      message: typeof error == "string" ? error : "新增产品失败",
    };
  }
}

async function delProductLibrary(ctx) {
  try {
    const { models } = ctx.fs.dc;
    const { id } = ctx.params;
    if (!id) {
      throw "缺少参数：产品id";
    }

    // 先查询要删除的产品信息
    const productToDelete = await models.ProductLibrary.findByPk(id);
    if (!productToDelete) {
      throw "设备不存在";
    }

    // 检查 devices 表中是否存在关联的设备数据
    const relatedDevices = await models.Devices.findOne({
      where: { productCode: productToDelete.productCode },
    });

    if (relatedDevices) {
      throw "该设备已被使用，无法删除";
    }

    // 检查 sensor_type_model_mapping 表中是否存在关联的传感器数据
    const relatedSensors = await models.SensorTypeModelMapping.findOne({
      where: { collectorId: id },
    });

    if (relatedSensors) {
      throw "该设备已被使用，无法删除";
    }

    // 如果没有关联数据，则可以安全删除
    await models.ProductLibrary.destroy({ where: { id } });
    ctx.status = 204;
  } catch (error) {
    ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
    ctx.status = 400;
    ctx.body = {
      message: typeof error == "string" ? error : "删除产品失败",
    };
  }
}

async function putProductLibrary(ctx) {
  try {
    const { models } = ctx.fs.dc;
    const { id } = ctx.params;
    const data = ctx.request.body;
    if (!id || !data) {
      throw "缺少参数：产品id或数据";
    }

    // 检查产品编码是否重复
    if (data.productCode) {
      const curProductCodeData = await models.ProductLibrary.findOne({
        where: { productCode: data.productCode },
      });
      if (curProductCodeData && curProductCodeData.id != id) {
        throw "设备编码已存在";
      }
    }

    // 检查设备型号是否重复
    if (data.model) {
      const curModelData = await models.ProductLibrary.findOne({
        where: { model: data.model },
      });
      if (curModelData && curModelData.id != id) {
        throw "设备型号已存在";
      }
    }

    await models.ProductLibrary.update(data, { where: { id } });

    ctx.status = 204;
  } catch (error) {
    ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
    ctx.status = 400;
    ctx.body = {
      message: typeof error == "string" ? error : "修改产品失败",
    };
  }
}

async function getProductLibrary(ctx) {
  let rslt = {};
  try {
    const { models } = ctx.fs.dc;
    const { keyword, pageSize, page } = ctx.query;
    let findOption = {
      where: {},
    };
    if (pageSize && page) {
      findOption.offset = (Number(page) - 1) * Number(pageSize);
      findOption.limit = Number(pageSize);
    }
    if (keyword) {
      findOption.where.$or = [
        { name: { $like: `%${keyword}%` } },
        { model: { $like: `%${keyword}%` } },
      ];
    }
    rslt = await models.ProductLibrary.findAndCountAll(findOption);

    ctx.body = rslt;
    ctx.status = 200;
  } catch (error) {
    ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
    ctx.status = 400;
    ctx.body = {
      message: typeof error == "string" ? error : "获取产品失败",
    };
  }
}

async function getAllProductLibrary(ctx) {
  try {
    const { models } = ctx.fs.dc;
    const products = await models.ProductLibrary.findAll({
      attributes: ["id", "name", "model", "productCode"],
      order: [["id", "ASC"]],
    });
    ctx.body = products;
    ctx.status = 200;
  } catch (error) {
    ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
    ctx.status = 400;
    ctx.body = {
      message: typeof error == "string" ? error : "获取产品失败",
    };
  }
}
async function getSensors(ctx) {
  let rslt = {};
  try {
    const { models } = ctx.fs.dc;
    const { keyword, pageSize, page } = ctx.request.body;

    let findOption = {
      where: {},
      include: [
        {
          model: models.ProductLibrary,
          attributes: ["id", "model"],
        },
      ],
      order: [["id", "DESC"]], // 根据id降序排序
    };

    // 分页处理
    if (pageSize && page) {
      findOption.offset = (Number(page) - 1) * Number(pageSize);
      findOption.limit = Number(pageSize);
    }
    // 模糊查询处理
    if (keyword) {
      findOption.where.$or = [
        { opsModel: { $like: `%${keyword}%` } }, // 运维中台型号
        { sensorName: { $like: `%${keyword}%` } }, // 传感器名称
      ];
    }

    rslt = await models.SensorTypeModelMapping.findAndCountAll(findOption);

    ctx.body = rslt;
    ctx.status = 200;
  } catch (error) {
    ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
    ctx.status = 400;
    ctx.body = {
      message: typeof error == "string" ? error : "获取传感器失败",
    };
  }
}

async function addOrEditSensor(ctx) {
  let id = null;
  let errorMsg = "";
  const transaction = await ctx.fs.dc.orm.transaction();

  try {
    const { models } = ctx.fs.dc;
    const data = ctx.request.body;
    const { formulaList = [], formulaIds = [], formulaParamNames = [] } = data;

    // 处理公式数据 - 批量检查并新增不存在的公式
    if (formulaList && formulaList.length > 0) {
      const validFormulas = formulaList.filter(
        (formula) => formula.id && formula.id !== 0
      );

      if (validFormulas.length > 0) {
        // 批量查询已存在的公式ID
        const formulaIds = validFormulas.map((formula) => formula.id);
        const existingFormulas = await models.Formula.findAll({
          where: { id: formulaIds },
          attributes: ["id"],
          transaction,
        });

        const existingFormulaIds = new Set(existingFormulas.map((f) => f.id));

        // 筛选出需要新增的公式
        const formulasToCreate = validFormulas.filter(
          (formula) => !existingFormulaIds.has(formula.id)
        );

        // 批量创建不存在的公式
        if (formulasToCreate.length > 0) {
          await models.Formula.bulkCreate(
            formulasToCreate.map((formula) => ({
              id: formula.id,
              expression: formula.expression,
            })),
            { transaction }
          );
        }
      }
    }
    // 从数据中移除 formulaList，只保留 formulaIds
    const sensorData = { ...data };
    delete sensorData.formulaList;
    delete sensorData.formulaParamNames;
    if (data.id) {
      // 编辑操作
      errorMsg = "编辑失败";
      id = data.id;

      // 更新记录
      const [updatedCount] = await models.SensorTypeModelMapping.update(sensorData, {
        where: { id },
        transaction,
      });
      if (updatedCount === 0) throw "传感器不存在";
    } else {
      // 新增操作
      errorMsg = "新增失败";
      // 创建新记录
      const createdSensor = await models.SensorTypeModelMapping.create(sensorData, {
        transaction,
      });
      id = createdSensor.id;
    }

    const validFormulaIds = Array.from(
      new Set(
        (Array.isArray(sensorData.formulaIds) ? sensorData.formulaIds : [])
          .map((formulaId) => Number(formulaId))
          .filter((formulaId) => Number.isInteger(formulaId) && formulaId > 0)
      )
    );
    if (Array.isArray(formulaParamNames)) {
      for (const item of formulaParamNames) {
        const fid = Number(item.formulaId);
        if (!validFormulaIds.includes(fid)) continue;
        const payload = buildFormulaParamNamePayload(item, id);
        const existed = await models.FormulaParamNames.findOne({
          where: { sensorMappingId: id, formulaId: fid },
          transaction,
        });
        if (existed) {
          await models.FormulaParamNames.update(payload, {
            where: { sensorMappingId: id, formulaId: fid },
            transaction,
          });
        } else {
          await models.FormulaParamNames.create(payload, { transaction });
        }
      }
    }
    // 公式已从该传感器型号中移除时，其专属参数名称也不再保留。
    await models.FormulaParamNames.destroy({
      where:
        validFormulaIds.length > 0
          ? { sensorMappingId: id, formulaId: { $notIn: validFormulaIds } }
          : { sensorMappingId: id },
      transaction,
    });

    await transaction.commit();
    ctx.status = 204;
  } catch (error) {
    await transaction.rollback();
    ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
    ctx.status = 400;
    ctx.body = {
      message: errorMsg,
    };
  }
}
async function addFormulaParamNames(ctx) {
  try {
    const { models } = ctx.fs.dc;
    const { formulaId, sensorMappingId } = ctx.request.body || {};
    const fid = Number(formulaId);
    const mappingId = await validateFormulaParamScope(
      models,
      sensorMappingId,
      fid
    );
    if (!fid || Number.isNaN(fid)) {
      throw "缺少参数：公式ID";
    }
    const existed = await models.FormulaParamNames.findOne({
      where: { sensorMappingId: mappingId, formulaId: fid },
    });
    if (existed) {
      throw "该传感器型号下的公式已存在计算参数名称";
    }
    const payload = buildFormulaParamNamePayload(ctx.request.body || {}, mappingId);
    await models.FormulaParamNames.create(payload);
    ctx.status = 204;
  } catch (error) {
    ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
    ctx.status = 400;
    ctx.body = { message: typeof error == "string" ? error : "新增失败" };
  }
}
async function updateFormulaParamNames(ctx) {
  try {
    const { models } = ctx.fs.dc;
    const { formulaId } = ctx.params || {};
    const { sensorMappingId } = ctx.request.body || {};
    const fid = Number(formulaId);
    const mappingId = await validateFormulaParamScope(
      models,
      sensorMappingId,
      fid
    );
    if (!fid || Number.isNaN(fid)) {
      throw "缺少参数：公式ID";
    }
    const payload = buildFormulaParamNamePayload(ctx.request.body || {}, mappingId);
    const existed = await models.FormulaParamNames.findOne({
      where: { sensorMappingId: mappingId, formulaId: fid },
    });
    if (existed) {
      await models.FormulaParamNames.update(payload, {
        where: { sensorMappingId: mappingId, formulaId: fid },
      });
    } else {
      await models.FormulaParamNames.create(payload);
    }
    ctx.status = 204;
  } catch (error) {
    ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
    ctx.status = 400;
    ctx.body = { message: typeof error == "string" ? error : "修改失败" };
  }
}
async function getFormulaParamNames(ctx) {
  try {
    const { models } = ctx.fs.dc;
    const { ids, sensorMappingId } = ctx.query || {};
    const mappingId = Number(sensorMappingId);
    if (!Number.isInteger(mappingId) || mappingId <= 0) {
      throw "缺少参数：传感器型号配置ID";
    }
    let where = { sensorMappingId: mappingId };
    if (ids) {
      const arr = String(ids)
        .split(",")
        .map((x) => Number(x))
        .filter((n) => !Number.isNaN(n));
      if (arr.length > 0) where.formulaId = { $in: arr };
    }
    const rows = await models.FormulaParamNames.findAll({ where });
    ctx.body = rows;
    ctx.status = 200;
  } catch (error) {
    ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
    ctx.status = 400;
    ctx.body = { message: typeof error == "string" ? error : "获取失败" };
  }
}

function buildFormulaParamNamePayload(item, sensorMappingId) {
  const normalizeName = (value) => {
    const name = value === undefined || value === null ? "" : String(value);
    const trimmed = name.slice(0, 20).trim();
    return trimmed || null;
  };
  return {
    sensorMappingId,
    formulaId: Number(item.formulaId),
    param1Name: normalizeName(item.param1Name),
    param2Name: normalizeName(item.param2Name),
    param3Name: normalizeName(item.param3Name),
    param4Name: normalizeName(item.param4Name),
  };
}

async function validateFormulaParamScope(models, sensorMappingId, formulaId) {
  const mappingId = Number(sensorMappingId);
  if (!Number.isInteger(mappingId) || mappingId <= 0) {
    throw "缺少参数：传感器型号配置ID";
  }
  if (!Number.isInteger(formulaId) || formulaId <= 0) {
    throw "缺少参数：公式ID";
  }
  const mapping = await models.SensorTypeModelMapping.findByPk(mappingId);
  if (!mapping) throw "传感器型号配置不存在";
  const formulaIds = Array.isArray(mapping.formulaIds)
    ? mapping.formulaIds.map((id) => Number(id))
    : [];
  if (!formulaIds.includes(formulaId)) {
    throw "该公式不属于指定的传感器型号配置";
  }
  return mappingId;
}
async function delSensor(ctx) {
  try {
    const { models } = ctx.fs.dc;
    const { id } = ctx.request.body;
    if (!id) {
      throw "缺少参数：传感器id";
    }
    await models.SensorTypeModelMapping.destroy({ where: { id } });
    ctx.status = 204;
  } catch (error) {
    ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
    ctx.status = 400;
    ctx.body = {
      message: typeof error == "string" ? error : "获取产品失败",
    };
  }
}
async function getSensorTypes(ctx) {
  try {
    const { models } = ctx.fs.dc;
    const sensorTypes = await models.SensorTypes.findAll({
      attributes: ["id", "sensorKey", "sensorName"],
      order: [["id", "ASC"]], // 根据id升序排序
    });
    ctx.body = sensorTypes.map((type) => ({
      id: type.id,
      sensorKey: type.sensorKey,
      sensorName: type.sensorName,
    }));
    ctx.status = 200;
  } catch (error) {
    ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
    ctx.status = 400;
    ctx.body = {
      message: typeof error === "string" ? error : "获取传感器类型失败",
    };
  }
}

module.exports = {
  postProductLibrary,
  delProductLibrary,
  putProductLibrary,
  getProductLibrary,
  getAllProductLibrary,
  getSensors,
  addOrEditSensor,
  delSensor,
  getSensorTypes,
  addFormulaParamNames,
  updateFormulaParamNames,
  getFormulaParamNames,
};
