"use strict";
const moment = require("moment");
// const { newFindDeviceLastData } = require('../analysis/network')
const { Op } = require("sequelize");
const request = require("superagent");

async function bindAnxin2pep(ctx) {
  const transaction = await ctx.fs.dc.orm.transaction();
  try {
    const models = ctx.fs.dc.models;
    const { clickHouse } = ctx.app.fs;
    const { userId, pepUserId } = ctx.fs.api;
    const {
      bindId,
      name,
      pepProjectId,
      anxinProjectId = [],
      appId = [],
      mappingClass,
      maintenancePeriod,
      isanchor,
      sendorders,
      percentage,
      strucId,
      strucSensor,
      dataInterrupt,
      dataException,
      overException,
      InfluenceReport,
      leakageAnomaly,
    } = ctx.request.body;
    if (name && pepProjectId) {
      throw "项企项目与自定义项目名称仅可选择一项";
    }

    let bindId_ = bindId;
    const now = moment();

    let storageData = {
      name,
      pepProjectId,
      anxinProjectId,
      updateTime: now,
      mappingClass,
      isanchor,
      sendorders,
      percentage,
      strucId,
      strucSensor,
      del: false,
      maintenanceEnd:
        maintenancePeriod && maintenancePeriod.length
          ? maintenancePeriod[1]
          : null,
      maintenanceStart:
        maintenancePeriod && maintenancePeriod.length
          ? maintenancePeriod[0]
          : null,
      dataInterrupt: dataInterrupt,
      dataException: dataException,
      overException: overException,
      leakageAnomaly: leakageAnomaly,
      influenceReporting: InfluenceReport ? InfluenceReport : {},
    };

    // 仅限已有 pepProjectId 的项目
    const existRes = pepProjectId
      ? await models.ProjectCorrelation.findOne({
          where: Object.assign(
            {},
            pepProjectId
              ? {
                  pepProjectId: pepProjectId,
                }
              : {
                  name,
                }
          ),
        })
      : null;

    if (name) {
      const pepRepeatNameCount = await clickHouse.projectManage
        .query(
          `SELECT COUNT(*) AS count FROM t_pim_project WHERE project_name='${name}'`
        )
        .toPromise();
      if (pepRepeatNameCount[0].count) {
        throw `已有相同名称【${name}】的项企项目`;
      }
      const pomsRepeatNameRes = await models.ProjectCorrelation.findAll({
        where: {
          name,
        },
      });
      if (
        pomsRepeatNameRes.some((pr) => {
          return (
            // 有修改id但是不等于当前修改id的
            (bindId && pr.id != bindId && !pr.del) ||
            (!bindId &&
              ((existRes && pr.id != existRes.id && !pr.del) ||
                (!existRes && !pr.del)))
          );
        })
      ) {
        throw `已有相同名称【${name}】的自定义项目`;
      }
    } else {
      const pomsRepeatProjectIdRes = await models.ProjectCorrelation.findAll({
        where: {
          pepProjectId: pepProjectId,
        },
      });
      if (
        pomsRepeatProjectIdRes.some((pr) => {
          return (
            // 有修改id但是不等于当前修改id的
            (bindId && pr.id != bindId && !pr.del) ||
            (!bindId &&
              ((existRes && pr.id != existRes.id && !pr.del) ||
                (!existRes && !pr.del)))
          );
        })
      ) {
        throw `当前项企项目已绑定`;
      }
      storageData.name = null;
    }

    if (bindId) {
      // 修改
      await models.ProjectCorrelation.update(
        {
          ...storageData,
          optionEditPepUser: pepUserId,
        },
        {
          where: {
            id: bindId,
          },
          transaction,
        }
      );
    } else {
      // 新增
      if (existRes) {
        // 但是有之前的数据
        if (existRes.del) {
          // 不过之前的删除了
          storageData.createUser = userId;
          storageData.updateTime = now.format();
          storageData.createTime = now.format();
          await models.ProjectCorrelation.update(storageData, {
            where: {
              pepProjectId: pepProjectId,
            },
            transaction,
          });
          bindId_ = existRes.id;
        } else {
          // 没有删除 重复添加
          throw "当前项企项目已绑定";
        }
      } else {
        storageData.createUser = userId;
        storageData.createTime = now.format();
        const createRes = await models.ProjectCorrelation.create(storageData, {
          transaction,
        });
        bindId_ = createRes.id;
      }
    }

    if (bindId) {
      await models.ProjectApp.destroy({
        where: {
          projectId: bindId,
        },
        transaction,
      });
    }
    await models.ProjectApp.bulkCreate(
      appId.map((aid) => {
        return {
          projectId: bindId_,
          appId: aid,
        };
      }),
      {
        transaction,
      }
    );

    await transaction.commit();
    ctx.status = 204;
  } catch (error) {
    await transaction.rollback();
    ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
    ctx.status = 400;
    ctx.body = {
      message: typeof error == "string" ? error : undefined,
    };
  }
}

async function del(ctx) {
  try {
    const models = ctx.fs.dc.models;
    const { bindId } = ctx.params;

    const configCount = await models.AlarmPushConfig.count({
      where: {
        pomsProjectId: {
          $overlap: bindId.split(",").map((id) => parseInt(id)),
        },
        del: false,
      },
    });

    if (configCount) {
      throw "当前项目下存在信鸽推送警配置，请先删除配置";
    }

    await models.ProjectCorrelation.update(
      {
        del: true,
      },
      {
        where: {
          id: { $in: bindId.split(",") },
        },
      }
    );

    ctx.status = 204;
  } catch (error) {
    ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
    ctx.status = 400;
    ctx.body = {
      message: typeof error == "string" ? error : undefined,
    };
  }
}

// 查询异常数据
async function AbnormalPointList(ctx) {
  try {
    const { projectId, currentPage, pageSize, startDate, endDate } =
      ctx.request.body;

    const {
      utils: { anxinStrucIdRange, pomsProjectRange },
    } = ctx.app.fs;

    const models = ctx.fs.dc.models;

    const { clickHouse } = ctx.app.fs;

    // 结构物信息
    let anxinStruc = await anxinStrucIdRange({ ctx, pepProjectId: projectId });

    let abnormalPoint = [];
    let filteredAbnormalData = [];

    // const nowTime = moment()
    // 中断数据
    if (anxinStruc && anxinStruc.length > 0) {
      try {
        // 派单数据
        const paidanData = await findAllPaidanInfo(ctx, projectId);
        // 结构物id列表
        const strucIds = anxinStruc.map((item) => item.strucId);

        // const strucIds = [302]
        if (!strucIds || strucIds.length === 0) {
          ctx.body = {
            abnormalPoint,
          };
          return;
        }

        const sensorsQuery = `
               SELECT id AS sensorId, name AS sensorName, structure
               FROM t_sensor
               WHERE structure IN (${strucIds.join(",")})
         `;

        const sensorlist = await clickHouse.anxinyun
          .query(sensorsQuery)
          .toPromise();

        /**
         * @author Jannik
         * @time 2025/2/20
         * @description 获取测点>12小时的数据
         */
        const getLastThemeData = async () => {
          const models = ctx.fs.dc.models;

          // 获取当前时间
          const now = moment().utc(); // 确保时间格式与数据库一致（UTC）

          // 计算12小时前的时间
          const twelveHoursAgo = now
            .subtract(12, "hours")
            .format("YYYY-MM-DD HH:mm:ss");

          const modifiedSensorList = sensorlist.map((item) => {
            const { sensorId } = item;

            if (sensorId && /^\d+$/.test(sensorId)) {
              // 如果是纯数字，返回一个新对象，修改 sensorid
              return { ...item, sensorId: `axy4_0:${sensorId}` };
            }

            // 如果不符合条件，返回原始对象
            return item;
          });

          const res = [];

          try {
            // 调用函数并等待结果
            const results = await queryDatabaseInBatches(modifiedSensorList);
            res.push(results);
            console.log("查询结果：", res);
          } catch (error) {
            console.error("查询失败：", error);
          }

          if (res && res.length > 0) {
            res.forEach((item) => {
              const info = item.map((subItem) => {
                return subItem.dataValues;
              });

              for (const { collectTime, sensorId } of info) {
                const res = modifiedSensorList.find((item) => {
                  return item.sensorId == sensorId;
                });

                if (res) {
                  const { strucName } = anxinStruc.find(
                    (item) => item.strucId == res.structure
                  );

                  abnormalPoint.push({
                    strucName: strucName,
                    sensorName: res.sensorName,
                    collectTime:
                      moment(collectTime).format("YYYY-MM-DD HH:mm:ss") ===
                      "1970-01-01 08:00:00"
                        ? "/"
                        : moment(collectTime).format("YYYY-MM-DD HH:mm:ss"),
                    abnormalType: "数据中断",
                    context: "",
                  });
                }
              }
            });
          }

          /**
           * @author Jannik
           * @param {Array} modifiedSensorList
           * @param {Number} batchSize
           * @description 查询分批处理300次查询
           * @returns
           */
          async function queryDatabaseInBatches(
            modifiedSensorList,
            batchSize = 300
          ) {
            // 提取所有 sensorid
            const sensorIds = modifiedSensorList.map((item) => item.sensorId);

            // 分批处理
            const batches = [];
            for (let i = 0; i < sensorIds.length; i += batchSize) {
              batches.push(sensorIds.slice(i, i + batchSize));
            }

            // 存储所有查询结果
            let allResults = [];

            // 逐批查询数据库
            for (const batch of batches) {
              const data = await models.LatestTheme.findAll({
                where: {
                  collectTime: {
                    // [Op.gte]: twelveHoursAgo,
                    [Op.lt]: twelveHoursAgo, // 修改为小于
                  },
                  sensorId: {
                    [Op.in]: batch, // 使用当前批次的 sensorid 查询
                  },
                },
              });

              // 将当前批次的结果添加到总结果中
              allResults = allResults.concat(data);
            }

            return allResults;
          }
        };

        await getLastThemeData();

        //#region  获取到结构物下点位异常信息代码
        // // 获取到结构物下点位异常信息
        // const fetchAbnormalData = async () => {
        //    const abnormaldata = await Promise.all(
        //       strucIds.map(async (item) => {
        //          // const url = `https://statistics.anxinyun.cn/statistic/debug?structure=${item}`;
        //          try {
        //             // const rslt = (await request.get(url)).body;
        //             let rslt = await ctx.app.fs.anxinyunStatistics.get(`statistic/debug?structure=${item}`)
        //             return rslt;
        //          } catch (error) {
        //             console.error('Error fetching data:', error);
        //             return null;
        //          }
        //       })
        //    );
        //    filteredAbnormalData = abnormaldata.filter(data => data !== null);
        // }

        // await fetchAbnormalData()

        // // 当前时间
        // const nowTime = moment();
        // const time2010 = moment('2010-01-01');
        // const thresholdHours = 12;

        // // 中断数据
        // if (filteredAbnormalData && filteredAbnormalData.length > 0) {
        //    filteredAbnormalData.forEach((item) => {
        //       if (item && item.datas) {
        //          const newstrucId = item.id

        //          // 查找结构名称
        //          const foundItem = anxinStruc.find(item => item.strucId === newstrucId);
        //          const strucName = foundItem ? foundItem.strucName : "";
        //          for (const [key, evt] of Object.entries(item.datas)) {
        //             // if (Object.keys(evt).length > 0) {
        //             //    continue
        //             // }

        //             const sensorItem = sensorlist.find((it) => it.sensorId === evt.id && it.structure == newstrucId)
        //             if (sensorItem) {
        //                const { sensorName } = sensorItem;
        //                const givenTime = moment(evt.acqTime);
        //                if (givenTime.isBefore(time2010)) {
        //                   continue
        //                }

        //                const diffInHours = nowTime.diff(givenTime, 'hours');

        //                if (diffInHours > thresholdHours) {
        //                   abnormalPoint.push({
        //                      strucName: strucName,
        //                      sensorName: sensorName,
        //                      collectTime: moment(evt.acqTime).format('YYYY-MM-DD HH:mm:ss') == '1970-01-01 08:00:00' ? '/' : moment(evt.acqTime).format('YYYY-MM-DD HH:mm:ss'),
        //                      abnormalType: "数据中断",
        //                      context: "",
        //                   });
        //                }
        //             }

        //          }
        //       }
        //    })
        // }
        //#endregion

        const paidanSensorSet = new Set(
          paidanData.flatMap((paidanItem) =>
            paidanItem.stationids.split(",").map((id) => parseInt(id.trim()))
          )
        );

        sensorlist.forEach((sensor) => {
          const { sensorId, sensorName, structure } = sensor;
          // 查找结构名称
          const foundItem = anxinStruc.find(
            (item) => item.strucId === structure
          );
          const strucName = foundItem ? foundItem.strucName : "";
          // 异常数据
          if (paidanSensorSet.has(sensorId)) {
            const paidanItem = paidanData.find((item) =>
              item.stationids
                .split(",")
                .map((id) => parseInt(id.trim()))
                .includes(sensorId)
            );
            if (paidanItem) {
              if(paidanItem.title&&paidanItem.title.includes('数据异常')){
                abnormalPoint.push({
                  strucName: strucName,
                  sensorName: sensorName,
                  collectTime: moment(paidanItem.start).format(
                    "YYYY-MM-DD HH:mm:ss"
                  ),
                  abnormalType: "数据异常",
                  context: paidanItem.suggestion,
                });
              }
            
            }
          }
        });
      } catch (error) {
        ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);

        ctx.status = 400;

        ctx.body = {
          message: typeof error === "string" ? error : undefined,
        };
      }
    }

    abnormalPoint.sort(
      (a, b) => new Date(b.collectTime) - new Date(a.collectTime)
    );

    ctx.body = {
      abnormalPoint,
    };
  } catch (error) {
    ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
    ctx.status = 400;
    ctx.body = {
      message: typeof error == "string" ? error : undefined,
    };
  }
}
// 查询异常数据表t_structure_paidan
async function findAllPaidanInfo(ctx, projectId) {
  try {
    const models = ctx.fs.dc.models;
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    const id = projectId;

    const data = await models.StructurePaidan.findAll({
      // 已关闭未处理
      where: {
        pid: projectId,
        comted: false,
        closed: true,
        start: {
          [Op.gte]: oneMonthAgo, // start 时间字段大于等于一个月前的时间点
          [Op.lte]: new Date(), // start 时间字段在一个月内
        },
        complete: {
          [Op.gte]: new Date(),
        },
      },
    });

    const dataList = [];

    if (data && data.length > 0) {
      data.map((item) => {
        if (item && item.dataValues) {
          dataList.push(item.dataValues);
        }
      });
    }

    return dataList || [];
  } catch (error) {
    ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
    ctx.status = 400;
    ctx.body = {
      message: typeof error == "string" ? error : undefined,
    };
  }
}

module.exports = {
  bindAnxin2pep,
  del,
  AbnormalPointList,
};
