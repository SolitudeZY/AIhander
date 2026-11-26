"use strict";
const { Op } = require("sequelize");

/**
 * 创建系统日志
 */
async function createSystemLog(ctx) {
  const transaction = await ctx.fs.dc.orm.transaction();

  try {
    const models = ctx.fs.dc.models;
    const { content, url, userId, module } = ctx.request.body;

    // 验证必填字段
    if (!content) {
      await transaction.rollback();
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: "系统日志记录失败，日志内容不能为空",
      };
      return;
    }

    await models.SystemLog.create(
      {
        logTime: new Date(),
        content,
        url,
        userId,
        module,
      },
      { transaction }
    );

    await transaction.commit();

    ctx.body = {
      success: true,
      message: "系统日志创建成功",
    };
  } catch (error) {
    await transaction.rollback();
    console.error("创建系统日志失败:", error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: "创建系统日志失败",
      error: error.message,
    };
  }
}

/**
 * 分页查询系统日志
 */
async function getSystemLogs(ctx) {
  try {
    const models = ctx.fs.dc.models;
    const {
      offset: page,
      limit: pageSize,
      module,
      content,
      startTime,
      endTime,
    } = ctx.query;
    const p = parseInt(page) || 1;
    const size = Math.min(parseInt(pageSize) || 10, 100);

    const whereCondition = {};

    // 按操作模块查询
    if (module) {
      whereCondition.module = {
        [Op.like]: `%${module}%`,
      };
    }

    // 按操作内容查询
    if (content) {
      whereCondition.content = {
        [Op.like]: `%${content}%`,
      };
    }

    // 按操作时间范围查询
    if (startTime || endTime) {
      whereCondition.logTime = {};
      if (startTime) {
        whereCondition.logTime[Op.gte] = startTime;
      }
      if (endTime) {
        whereCondition.logTime[Op.lte] = endTime;
      }
    }

    // 构建查询选项
    const queryOptions = {
      where: whereCondition,
      attributes: ["id", "content", "module", "logTime", "url", "userId"],
      include: [
        {
          model: models.User,
          attributes: ["id", "name", "username"],
          required: false,
        },
      ],
      order: [["logTime", "DESC"]],
    };

    // 判断是否需要分页
    const needPagination = page !== undefined && pageSize !== undefined;

    if (needPagination) {
      // 分页查询
      queryOptions.limit = size;
      queryOptions.offset = (p - 1) * size;
      queryOptions.distinct = true;
      queryOptions.subQuery = false;

      const { count, rows } = await models.SystemLog.findAndCountAll(
        queryOptions
      );

      ctx.body = {
        success: true,
        message: "获取系统日志列表成功",
        rows,
        count,
      };
    } else {
      // 不分页，返回全部数据
      const rows = await models.SystemLog.findAll(queryOptions);

      ctx.body = {
        rows,
        success: true,
        message: "获取系统日志列表成功",
      };
    }
  } catch (error) {
    console.error("获取系统日志列表失败:", error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: "获取系统日志列表失败",
      error: error.message,
    };
  }
}

/**
 * 获取系统日志详情
 */
async function getSystemLog(ctx) {
  try {
    const models = ctx.fs.dc.models;
    const { id } = ctx.params;

    const systemLog = await models.SystemLog.findByPk(id, {
      include: [
        {
          model: models.User,
          attributes: ["id", "name", "username"],
          required: false,
        },
      ],
    });

    if (!systemLog) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: "系统日志不存在",
      };
      return;
    }

    ctx.body = {
      success: true,
      message: "获取系统日志详情成功",
      data: systemLog,
    };
  } catch (error) {
    console.error("获取系统日志详情失败:", error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: "获取系统日志详情失败",
      error: error.message,
    };
  }
}

/**
 * 批量删除系统日志
 */
async function batchDeleteSystemLogs(ctx) {
  try {
    const models = ctx.fs.dc.models;
    const { ids } = ctx.request.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: "请提供要删除的日志ID列表",
      };
      return;
    }

    const deletedCount = await models.SystemLog.destroy({
      where: {
        id: {
          [Op.in]: ids,
        },
      },
    });

    ctx.body = {
      success: true,
      message: `成功删除 ${deletedCount} 条系统日志`,
      data: {
        deletedCount,
      },
    };
  } catch (error) {
    console.error("批量删除系统日志失败:", error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: "批量删除系统日志失败",
      error: error.message,
    };
  }
}

/**
 * 清空指定时间范围的系统日志
 */
async function clearSystemLogs(ctx) {
  try {
    const models = ctx.fs.dc.models;
    const { startTime, endTime } = ctx.request.body;

    const whereCondition = {};

    if (startTime || endTime) {
      whereCondition.logTime = {};
      if (startTime) {
        whereCondition.logTime[Op.gte] = startTime;
      }
      if (endTime) {
        whereCondition.logTime[Op.lte] = endTime;
      }
    } else {
      // 如果没有指定时间范围，则不允许清空所有日志
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: "请指定要清空的时间范围",
      };
      return;
    }

    const deletedCount = await models.SystemLog.destroy({
      where: whereCondition,
    });

    ctx.body = {
      success: true,
      message: `成功清空 ${deletedCount} 条系统日志`,
      data: {
        deletedCount,
      },
    };
  } catch (error) {
    console.error("清空系统日志失败:", error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: "清空系统日志失败",
      error: error.message,
    };
  }
}

module.exports = {
  createSystemLog,
  getSystemLogs,
  getSystemLog,
  batchDeleteSystemLogs,
  clearSystemLogs,
};
