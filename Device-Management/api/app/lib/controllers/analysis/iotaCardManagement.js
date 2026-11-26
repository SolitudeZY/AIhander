'use strict';
const moment = require('moment');

function getClassifiedData(opt) {
  const { zombieDays } = opt;
  return async function (ctx, next) {
    try {
      const sequelize = ctx.fs.dc.orm;
      const res = await sequelize.query(
        `
            select 
                count(1) total,
                count(case when icp.status = 0 then 1 end) as normalTotal,
                count(case when icp.status = 1 then 1 end) as  notAcitveTotal,
                count(case when icp.status = 2 then 1 end) as haltTotal,
                count(case when icp.update_time<CURRENT_DATE - INTERVAL ':n days' then 1 end) as zombieTotal
            from iot_card_pool icp
            where icp.anxinyun_structure_id is not null
           `,
        {
          replacements: { n: Number(zombieDays) },
        }
      );
      ctx.status = 200;
      ctx.body = res[0][0];
    } catch (error) {
      ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
      ctx.status = 400;
      ctx.body = { message: '获取分类汇总数据失败' };
    }
  };
}
function getCardList(opt) {
  const { zombieDays } = opt;
  return async function getCardList(ctx) {
    try {
      const { keyword, page, limit, startTime, endTime, status, anxinyunStructureId,cardNumber } = ctx.query;
      const models = ctx.fs.dc.models;
      let options = {
        order: [['id', 'desc']],
        where: {},
      };
      if (startTime && endTime) {
        options.where.activeTime = { $between: [startTime, endTime] };
      }
      if (keyword) {
        options.where.name = { $like: `%${keyword}%` };
      }
      if(cardNumber){
        options.where.cardNumber = { $like: `%${cardNumber}%` };
      }
      if (anxinyunStructureId) {
        options.where.anxinyunStructureId = anxinyunStructureId;
      }
      if (limit) {
        options.limit = Number(limit);
      }
      if (page && limit) {
        options.offset = Number(page) * Number(limit);
      }

      const list = await models.IotCardPool.findAll(options);
      const rs = [];
      if (list && list.length) {
        for (let { dataValues: l } of list) {
          const diffTime = moment().diff(l.updateTime, 'days');
          if (diffTime >= zombieDays) {
            l.status = 3;
          }
          if ([0, 1, 2, 3].includes(Number(status)) && l.status === Number(status)) {
            rs.push(l);
          }
        }
      }
      ctx.status = 200;
      ctx.body = [0, 1, 2, 3].includes(Number(status)) ? rs : list;
    } catch (error) {
      ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
      ctx.status = 400;
      ctx.body = { message: '获取卡列表失败' };
    }
  };
}

async function addOrUpdateCard(ctx) {
  const { id, cardNumber, yxbz } = ctx.request.body;
  const models = ctx.fs.dc.models;
  const res = await models.IotCardPool.findOne({
    where: {
      cardNumber,
    },
  });
  try {
    if (id) {
      //update
      if (res) {
        if (res.id !== id) {
          ctx.status = 400;
          ctx.body = { message: '卡号已存在' };
        } else {
          //编辑操作的时候什么都没改
          await models.IotCardPool.update(
            {
              cardNumber,
            },
            {
              where: {
                id,
              },
            }
          );
        }
        ctx.status = 204;
      } else {
        await models.IotCardPool.update(
          {
            cardNumber,
          },
          {
            where: {
              id,
            },
          }
        );
        ctx.status = 204;
      }
    } else {
      //add
      if (res) {
        ctx.status = 400;
        ctx.body = { message: '卡号已存在' };
      } else {
        await models.IotCardPool.create({
          cardNumber,
          yxbz,
        });
        ctx.status = 204;
      }
    }
  } catch (error) {
    ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
    ctx.status = 400;
    ctx.body = { message: id ? '修改卡失败' : '添加卡失败' };
  }
}
async function deleteCard(ctx) {
  const models = ctx.fs.dc.models;
  const { id } = ctx.params;
  try {
    await models.IotCardPool.destroy({
      where: {
        id,
      },
    });
    ctx.status = 200;
    ctx.body = { message: '删除卡成功' };
  } catch (error) {
    ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
    ctx.status = 400;
    ctx.body = { message: '删除卡失败' };
  }
}
async function getStructureList(ctx) {
  const models = ctx.fs.dc.models;
  try {
    const res = await models.IotCardPool.findAll({
      distinct: true,
      attributes: ['anxinyun_structure_id', 'anxinyun_structure_name'],
    });
    ctx.status = 200;
    ctx.body = res;
  } catch (error) {
    ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
    ctx.status = 400;
    ctx.body = { message: '获取结构物列表失败' };
  }
}
async function findCardByCardNumber(ctx) {
  try {
    const models = ctx.fs.dc.models;
    const { cardNumber } = ctx.params;
    const res = await models.IotCardPool.findOne({
      where: {
        cardNumber,
      },
    });
    ctx.status = 200;
    ctx.body = res;
  } catch (error) {
    ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
    ctx.status = 400;
    ctx.body = { message: '获取单个卡号失败' };
  }
}

async function getAllCardNumber(ctx) {
  try {
    const models = ctx.fs.dc.models;
    const res = await models.IotCardPool.findAll({
      attributes: ['cardNumber'],
    });
    ctx.status = 200;
    ctx.body = res;
  } catch (error) {
    ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
    ctx.status = 400;
    ctx.body = { message: '获取所有卡号失败' };
  }
}
//批量导入
async function batchImport(ctx) {
  const transaction = await ctx.fs.dc.orm.transaction();
  try {
    const models = ctx.fs.dc.models;
    const data = ctx.request.body;
    const cardNumberList = data.map((item) => {
      return {
        cardNumber: item,
        yxbz: true,
      };
    });
    await models.IotCardPool.bulkCreate(cardNumberList, { transaction: transaction });
    ctx.status = 204;
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
    ctx.status = 400;
    ctx.body = { message: '批量导入失败' };
  }
}

module.exports = {
  getClassifiedData,
  getCardList,
  addOrUpdateCard,
  deleteCard,
  getStructureList,
  findCardByCardNumber,
  getAllCardNumber,
  batchImport,
};
