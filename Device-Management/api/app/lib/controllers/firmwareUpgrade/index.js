"use strict";
const request = require("superagent");
const moment = require("moment");
const http = require("http");

const ApiTable = {
  getFirmwares: "firmwareupgrade/list",
  firmwareUpgrade: "firmwareupgrade",
  getThingMessages: "firmwareupgrade/getThingMessages",
  distributeConfiguration: "firmwareupgrade/redisSet",
  getdeviceMetaNameDict: "firmwareupgrade/deviceMetaName/list",
  getVersionDict: "firmwareupgrade/version/list",
};

function firmwareServiceAvailable(ctx) {
  if (ctx.app.fs.craw && typeof ctx.app.fs.craw.get === "function") return true;
  ctx.status = 503;
  ctx.body = { message: "未配置旧固件服务 API_CRAW_URL，请配置并重启 API；RK3576/Agent 请使用边缘设备和视觉模型库页面" };
  return false;
}

async function getFirmwareCapabilities(ctx) {
  const { craw, clickHouse } = ctx.app.fs;
  ctx.status = 200;
  ctx.body = {
    firmware: Boolean(craw && typeof craw.get === "function"),
    deviceTypes: Boolean(clickHouse && clickHouse.iot && typeof clickHouse.iot.query === "function"),
  };
}

//设备维护记录
async function getDeviceType(ctx) {
  if (!ctx.app.fs.clickHouse || !ctx.app.fs.clickHouse.iot) {
    ctx.status = 503;
    ctx.body = { message: "设备型号查询需要 ClickHouse IoT 服务，请启用完整平台配置并重启 API" };
    return;
  }
  try {
    const { models } = ctx.fs.dc;
    // const sequelize = ctx.fs.dc.ORM
    const { clickHouse } = ctx.app.fs;
    const res = await models.DeviceModel.findAll({
      attributes: ["model_name"],
    });
    let modelName = new Set();
    modelName.add(-11);
    for (let { dataValues: c } of res) {
      modelName.add(c.model_name);
    }
    const inClause = `(${Array.from(modelName)
      .map((item) => `'${item}'`)
      .join(",")})`;
    const rlst = await clickHouse.iot
      .query(
        `
      SELECT id,model FROM DeviceMeta 
         WHERE model in ${inClause}
   `,
      )
      .toPromise();
    ctx.body = rlst || [];
    ctx.status = 200;
  } catch (error) {
    ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
    ctx.status = 400;
    ctx.body = {
      message: `查询设备型号失败`,
    };
  }
}
//查询结构物
async function getStruc(ctx) {
  try {
    const { clickHouse } = ctx.app.fs;
    // const { models } = ctx.fs.dc
    // const sequelize = ctx.fs.dc.ORM
    const { pepProjectId, keywordTarget, keyword } = ctx.query;
    const {
      utils: { anxinStrucIdRange },
    } = ctx.app.fs;
    let anxinStruc = await anxinStrucIdRange({
      ctx,
      pepProjectId,
      keywordTarget,
      keyword,
    });
    let thingIds = new Set();
    if (anxinStruc && anxinStruc.length) {
      anxinStruc.map((item) => thingIds.add(item.thingId));
    }
    let deviceType = thingIds.size
      ? await queryDeviceTypesInBatches(clickHouse.iot, [...thingIds, "-1"])
      : [];
    let rslt = [];
    if (deviceType && deviceType.length && anxinStruc && anxinStruc.length) {
      rslt = anxinStruc.map((item) => {
        item.deviceType = deviceType.filter(
          (child) => child.thingId === item.thingId,
        );
        return item;
      });
    }
    //    //返回数据结构示例
    // //     [  {strucId: s.strucId,
    // //    strucName: s.strucName,
    // //    projectId: s.projectId,
    // //    project: [{ id: s.projectId,}],
    // //    pomsProject: [],
    // //    deviceType:[{}]
    // // }]
    ctx.body = rslt || [];
    ctx.status = 200;
  } catch (error) {
    ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
    ctx.status = 400;
    ctx.body = {
      message: `查询结构物以及设备类型失败`,
    };
  }
}

async function getFirmwares(ctx) {
  if (!firmwareServiceAvailable(ctx)) return;
  const query = ctx.query;
  try {
    const { tokenup } = ctx.query;
    const res = await ctx.app.fs.craw.get(ApiTable.getFirmwares, {
      query: { ...query, token: tokenup },
    });
    let rslt = [];
    let total = 0;
    if (res) {
      try {
        const parsedRes = JSON.parse(res);
        total = parsedRes.total || 0;
        const msgData = parsedRes.data || null;

        if (msgData && Array.isArray(msgData) && msgData.length > 0) {
          rslt = msgData.map((item) => ({
            device_meta_id: item.device_meta_id,
            deviceMetaName: item.device_meta_name,
            versionNo: item.version,
            firmwareName: item.filename,
            filepath: item.filepath,
            uploader: item.userid,
            comment: item.comment,
            uploadTime: moment(item.updated_time).format("YYYY-MM-DD"),
            fileObj: item.Bin,
            md5Value: item.md5,
            remarks: item.remarks,
          }));
        }
      } catch (parseError) {
        // 处理 JSON 解析错误
        console.error("JSON 解析失败:", parseError);
      }
    }
    ctx.body = { total, data: rslt };
    ctx.status = 200;
  } catch (error) {
    ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
    ctx.status = 400;
    ctx.body = {
      message: `查询固件包列表失败`,
    };
  }
}

// 通用的字典查询函数
async function getDictData(ctx, apiKey, errorMessage) {
  if (!firmwareServiceAvailable(ctx)) return;
  try {
    const { tokenup } = ctx.query;
    const res = await ctx.app.fs.craw.get(ApiTable[apiKey], {
      query: { token: tokenup },
    });
    let rslt = [];

    if (res) {
      try {
        const parsedRes = JSON.parse(res);
        const msgData = parsedRes.data || null;
        if (msgData && Array.isArray(msgData) && msgData.length > 0) {
          rslt = msgData.map((item) => ({ label: item, value: item }));
        }
      } catch (parseError) {
        console.error("JSON 解析失败:", parseError);
      }
    }

    ctx.body = rslt;
    ctx.status = 200;
  } catch (error) {
    ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
    ctx.status = 400;
    ctx.body = {
      message: errorMessage,
    };
  }
}
//函数重载
async function getdeviceMetaNameDict(ctx) {
  return getDictData(ctx, "getdeviceMetaNameDict", "查询设备型号列表失败");
}
async function getVersionDict(ctx) {
  return getDictData(ctx, "getVersionDict", "查询版本号列表失败");
}

function getFileAsBuffer(remoteFileUrl) {
  return new Promise((resolve, reject) => {
    // 发起 HTTP 请求
    http.get(remoteFileUrl, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`HTTP请求失败，状态码：${response.statusCode}`));
        return;
      }
      const buffers = [];
      // 监听数据流
      response.on("data", (chunk) => {
        buffers.push(chunk);
      });

      // 数据传输完成
      response.on("end", () => {
        // 将文件数据合并为一个 Buffer
        const fileData = Buffer.concat(buffers);
        // 返回文件内容的 Buffer
        resolve(fileData);
      });

      // 处理请求错误
      response.on("error", (error) => {
        reject(error);
      });
    });
  });
}

//增加/覆盖固件包
async function firmwareUpgrades(ctx) {
  try {
    const { qiniu, version, tokenup, device_meta_id, wholeFile } = ctx.query;
    const { deviceMetaName, filePath, userId, fileObj, comment, remarks } =
      ctx.request.body;
    const url = qiniu + "/" + wholeFile;
    // 发起 GET 请求以获取文件
    // console.log('url1',url)

    // var data = fs.readFileSync(url, "utf-8");
    // console.log('xxxx111',data)
    request
      .get(url)
      .responseType("blob")
      .end((err, response) => {
        if (err) {
          console.error("Superagent request error:", err);
          return;
        }
        if (response.ok) {
          const blobData = response.body;
          // console.log('xxxxx1',response)
          request
            .post((process.env.LEGACY_FIRMWARE_URL || "http://127.0.0.1:30555/v1") + "/firmwareupgrade")
            // .set('Content-Type','application/octet-stream')
            .attach("file", blobData, fileObj.name || "")
            .field("filePath", filePath || "")
            .field("userId", userId || "")
            .field("comment", comment || "")
            .field("device_meta_name", deviceMetaName || "")
            .field("remarks", remarks || "")
            .query({ version, device_meta_id, token: tokenup })
            .then((resolve, reject) => {
              return (err, res) => {
                if (err) {
                  reject(err);
                } else {
                  resolve(res);
                }
              };
            });
        }
      });

    //    const ressss= await request.get(url).end(function(err, sourceResponse) {
    //       console.log('xxx2',sourceResponse)

    // if (err) {
    //   console.error('文件获取失败:', err);
    //   return;
    // }
    // 从响应中获取文件内容
    // const fileContent = sourceResponse.body;
    // // 创建一个 POST 请求以上传文件
    // request
    //   .post(ApiTable.firmwareUpgrade)
    //   .field('caption', 'My cats') // 其他表单字段
    //   .attach('file', fileContent, 'file.jpeg') // 将文件添加为表单字段
    //   .end(function(err, targetResponse) {
    //     if (err) {
    //       console.error('上传失败:', err);
    //       return;
    //     }

    //     // 处理目标服务器的响应
    //     console.log('上传成功');
    //     console.log(targetResponse.text);
    //   });
    //  });
    //  console.log('xxx1',ressss)
    // console.log('query1111', ctx.query)
    // const fileObj=await getFileAsBuffer(qiniu+'/'+wholeFile)
    // console.log('xx1',fileObj)
    // const file=qiniu+'/'+wholeFile
    // console.log('xxxx666',deviceMetaName)
    // const {files}=await parse(fileObjq)
    // const file=files[0]
    // const res=await  ctx.app.fs.craw.post(ApiTable.firmwareUpgrade,
    //    {query:{version,token:tokenup,device_meta_id},
    //    data:{deviceMetaName,filePath,userId,fileObjq},
    //    header:{ 'Content-Type':'multipart/form-data'}})

    // const formData = new FormData(ApiTable.firmwareUpgrade,{query:{version,token:tokenup,device_meta_id},data:{deviceMetaName,filePath,userId,file},header:{
    //    'Content-Type':'multipart/form-data; boundary=--------------------------033155845889797072451758'
    // }});
    // // 添加普通字段到 FormData
    // // formData.append('device_meta_name', device_meta_name);
    // // formData.append('filePath', filePath);
    // // formData.append('userId', userId)
    // // formData.append('file', fileObj);
    // // console.log('fileObj',formData)
    // // const body= ctx.request.body
    // // const fileData = await getFileAsBase64(qiniu+'/'+wholeFile);
    // // const res=await ctx.app.fs.craw.post1(ApiTable.firmwareUpgrade,userId,filePath,{query:{version:version,token:tokenup,device_meta_id:device_meta_id},data:fileObj})
    ctx.body = {};
    ctx.status = 200;
  } catch (error) {
    // console.log('xx1111',error)
    ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
    ctx.status = 400;
    ctx.body = {
      message: `增加/覆盖固件包失败`,
    };
  }
}

async function deleteFirmware(ctx) {
  const { version, device_meta_id, tokenup } = ctx.query;
  try {
    await ctx.app.fs.craw.delete(ApiTable.firmwareUpgrade, {
      query: { version, device_meta_id, token: tokenup },
    });
    ctx.status = 204;
  } catch (error) {
    ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
    ctx.status = 400;
    ctx.body = {
      message: `删除固件包失败`,
    };
  }
}

async function getThingMessages(ctx) {
  try {
    const { thingIds, device_meta_id, searchVal } = ctx.request.body;

    const res = await ctx.app.fs.craw.post(ApiTable.getThingMessages, {
      query: { token: process.env.LEGACY_FIRMWARE_TOKEN || "" },
      data: { thingIds, device_meta_id },
    });
    let rslt = [];
    if (res) {
      JSON.parse(res).data && JSON.parse(res).data.length
        ? JSON.parse(res).data.map((item) => {
            if (item.devices && item.devices.length) {
              item.devices.map((child) => {
                rslt.push({
                  key: child.id,
                  thingId: item.thingId,
                  devicemetaId: child.deviceMetaId || "",
                  deviceType: JSON.parse(child.properties).productType || "",
                  deviceName: child.name || "",
                  firmwareName: child.fileName || "",
                  firmwareNo: child.updateVersion || "",
                  status: child.updateState || "",
                  updatePercentage: child.updatePercentage || "",
                  switchStatus: JSON.parse(child.properties).update || false,
                  deviceId: child.id,
                });
              });
            }
          })
        : [];
    }
    let result;
    if (searchVal && rslt && rslt.length) {
      result = rslt.filter((item) => item.deviceName.includes(searchVal));
    }
    if (!searchVal) {
      result = rslt;
    }
    ctx.body = result;
    ctx.status = 200;
  } catch (error) {
    ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
    ctx.status = 400;
    ctx.body = {
      message: `查询结构物状态失败`,
    };
  }
}

async function distributeConfiguration(ctx) {
  try {
    const { version, device_meta_id, tokenup } = ctx.query;
    const { body } = ctx.request;
    const res = await ctx.app.fs.craw.post(ApiTable.distributeConfiguration, {
      query: {
        version,
        device_meta_id,
        token: tokenup,
      },
      data: JSON.stringify(body),
    });
    if (res) {
      // 指定设备下发升级指令
      for (let d of body.devices || []) {
        if (d.deviceType == "FS-YTHJC-DZ") {
          let invokeRes = await ctx.app.fs.iotRequest.post(
            `capabilities/invoke`,
            {
              data: {
                thingId: body.thing_id, //根据实际结构物thingId
                deviceId: d, //根据实际设备id
                dimensionId: null,
                dimCapId: "103a2313-2715-43d5-b872-e80c3ed947ab", //固定
                timeout: 300000,
                param: null,
                userId: 2175,
                dtuId: null,
              },
            },
          );
        }
      }

      ctx.body = JSON.parse(res);
      ctx.status = 200;
    } else {
      ctx.status = 400;
      ctx.body = {
        message: `下发配置失败`,
      };
    }
  } catch (error) {
    ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
    ctx.status = 400;
    ctx.body = {
      message: `下发配置失败`,
    };
  }
}

async function queryDeviceTypesInBatches(ck, thingIds) {
  let results = [];
  const batchSize = 1000;
  for (let i = 0; i < thingIds.length; i += batchSize) {
    const batch = thingIds.slice(i, i + batchSize);
    const query = `  
           SELECT distinct dm.id AS id, dm.model AS model, dc.thingId AS thingId  
           FROM Device dc  
           INNER JOIN DeviceMeta dm ON dm.id = dc.deviceMetaId  
           WHERE dc.thingId IN (${batch.map((id) => `'${id}'`).join(",")})  `;
    const batchResult = await ck.query(query).toPromise();
    results = results.concat(batchResult);
  }
  return results.filter((row) => row.thingId !== null);
}
//查询知物云结构
async function getZhiwuCloudStruct(ctx) {
  try {
    const { clickHouse } = ctx.app.fs;
    const zhiwuCloudStruct = await clickHouse.savoir
      .query(
        `
            SELECT 
                  t_project.id AS projectId, 
                  t_structure.id AS strucId, 
                  t_structure.name AS strucName,
                  t_structure.iota_thing_id as thingId,
                  project_state
               FROM 
                  t_project 
               LEFT JOIN
                  t_project_structure
                     ON t_project_structure.project = t_project.id
               LEFT JOIN
                  t_project_structuregroup
                     ON t_project_structuregroup.project = t_project.id
               LEFT JOIN 
                  t_structuregroup_structure
                     ON t_structuregroup_structure.structuregroup = t_project_structuregroup.structuregroup
               LEFT JOIN
                  t_project_construction
                     ON t_project_construction.project = t_project.id
               LEFT JOIN
                  t_structure_site
                     ON t_structure_site.siteid = t_project_construction.construction
               RIGHT JOIN
                  t_structure
                     ON t_structure.id = t_project_structure.structure
                     OR t_structure.id = t_structuregroup_structure.structure
                     OR t_structure.id = t_structure_site.structid
               WHERE 
                  project_state != -1 
      `,
      )
      .toPromise();
    let thingIds = new Set();
    if (zhiwuCloudStruct && zhiwuCloudStruct.length) {
      zhiwuCloudStruct.map((item) => thingIds.add(item.thingId));
    }
    let deviceType = thingIds.size
      ? await queryDeviceTypesInBatches(clickHouse.iot, [...thingIds, "-1"])
      : [];
    let rslt = [];
    if (
      deviceType &&
      deviceType.length &&
      zhiwuCloudStruct &&
      zhiwuCloudStruct.length
    ) {
      rslt = zhiwuCloudStruct.map((item) => {
        item.deviceType = deviceType.filter(
          (child) => child.thingId === item.thingId,
        );
        return item;
      });
    }
    ctx.body = rslt || [];
    ctx.status = 200;
  } catch (error) {
    ctx.status = 400;
    ctx.body = {
      message: `查询知物云结构物失败`,
    };
  }
}

// 新增设备型号下拉数据源
async function addDeviceModels(ctx) {
  try {
    const { models } = ctx.fs.dc;
    const payload = ctx.request.body || {};
    const modelList = Array.isArray(payload.models) ? payload.models : [];
    const normalizedModels = [
      ...new Set(
        modelList.map((item) => String(item || "").trim()).filter(Boolean),
      ),
    ];

    if (!normalizedModels.length) {
      ctx.status = 400;
      ctx.body = {
        message: `请选择设备型号`,
      };
      return;
    }

    const existedRows = await models.DeviceModel.findAll({
      attributes: ["model_name"],
    });
    const existedModels = new Set(
      existedRows
        .map((item) => item && item.dataValues && item.dataValues.model_name)
        .filter(Boolean),
    );
    const duplicatedModels = normalizedModels.filter((item) =>
      existedModels.has(item),
    );

    if (duplicatedModels.length) {
      ctx.status = 200;
      ctx.body = {
        duplicatedModels,
      };
      return;
    }

    await models.DeviceModel.bulkCreate(
      normalizedModels.map((item) => ({ modelName: item })),
    );

    ctx.body = {
      duplicatedModels: [],
      rows: normalizedModels,
    };
    ctx.status = 200;
  } catch (error) {
    ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
    ctx.status = 400;
    ctx.body = {
      message: `新增设备型号失败`,
    };
  }
}

// 分页查询设备型号列表
async function getDeviceMetaModels(ctx) {
  try {
    const { clickHouse } = ctx.app.fs;
    const { pageSize, page, model, name } = ctx.query;
    const pageNum = Number(page) || 1;
    const pageSizeNum = Number(pageSize) || 20;
    const safePage = pageNum > 0 ? pageNum : 1;
    const safePageSize = pageSizeNum > 0 ? pageSizeNum : 20;
    const offset = (safePage - 1) * safePageSize;
    const keyword = String(model || name || "").trim();
    const escapedKeyword = keyword.replace(/'/g, "''");
    const whereSql = keyword
      ? `WHERE public = true AND model LIKE '%${escapedKeyword}%'`
      : `WHERE public = true`;

    const countQuery = `
      SELECT count() AS total
      FROM (
        SELECT model
        FROM iota.DeviceMeta
        ${whereSql}
        GROUP BY model
      ) t
      WHERE model != ''
    `;
    const dataQuery = `
      SELECT model, argMax(name, createdAt) AS name
      FROM iota.DeviceMeta
      ${whereSql}
      GROUP BY model
      HAVING model != ''
      ORDER BY max(createdAt) DESC
      LIMIT ${safePageSize} OFFSET ${offset}
    `;

    const [countRes, rows] = await Promise.all([
      clickHouse.iot.query(countQuery).toPromise(),
      clickHouse.iot.query(dataQuery).toPromise(),
    ]);
    const total = Number((countRes && countRes[0] && countRes[0].total) || 0);

    ctx.body = {
      count: total,
      rows: (rows || []).map((item) => ({
        model: item.model,
        name: item.name,
      })),
      page: safePage,
      pageSize: safePageSize,
    };
    ctx.status = 200;
  } catch (error) {
    ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
    ctx.status = 400;
    ctx.body = {
      message: `查询设备型号列表失败`,
    };
  }
}

module.exports = {
  getFirmwareCapabilities,
  getDeviceType,
  getStruc,
  getFirmwares,
  firmwareUpgrades,
  deleteFirmware,
  getThingMessages,
  distributeConfiguration,
  getZhiwuCloudStruct,
  getdeviceMetaNameDict,
  getVersionDict,
  getDeviceMetaModels,
  addDeviceModels,
};
