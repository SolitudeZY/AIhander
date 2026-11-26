const moment = require('moment')
const fs = require('fs')
const request = require('superagent');

async function getStructures(ctx) {
  try {
    const { models } = ctx.fs.dc
    const { clickHouse } = ctx.app.fs
    const { pomsProjectId } = ctx.query
    let bindRes = []
    //选择全局就是查询所有项目下的结构物，有选择项目就只查询对应项目的结构物
    if (pomsProjectId) {
      bindRes = await models.ProjectCorrelation.findAll({ where: { id: { $in: pomsProjectId.split(',') } } })
    } else {
      bindRes = await models.ProjectCorrelation.findAll()
    }
    let anxinProjectIds = new Set()
    for (let b of bindRes) {
      if (b.anxinProjectId.length) {
        for (let aid of b.anxinProjectId) {
          anxinProjectIds.add(aid)
        }
      }
    }
    let undelStrucRes = []
    if (bindRes) {
      undelStrucRes = anxinProjectIds.size
        ? await clickHouse.anxinyun
          .query(
            `  
               SELECT 
                  t_structure.id AS strucId, 
                  t_structure.name AS strucName  
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
                     AND
                  t_project.id IN (${[...anxinProjectIds].join(',')}, -1)
                  AND t_structure.external_platform is not null
               ORDER BY strucId
            `
          )
          .toPromise()
        : []
    }
    // undelStrucRes.push({ strucId: 4036, strucName: '象山港大桥' })
    // undelStrucRes.push({ strucId: 1, strucName: '象山港大' })
    ctx.status = 200
    ctx.body = undelStrucRes
  } catch (error) {
    ctx.fs.logger.error(`path: ${ctx.path}, error: error`)
    ctx.status = 400
    ctx.body = {
      message: typeof error == 'string' ? error : undefined,
    }
  }
}

async function getFactors(ctx) {
  try {
    const { models } = ctx.fs.dc
    const { clickHouse } = ctx.app.fs
    const { structId, cacl } = ctx.query
    let list = []
    if (cacl) {
      const factorList = await clickHouse.dataAlarm
        .query(`select  SafetyFactorTypeId, SafetyFactorTypeName 
        from sensors 
          where PlatformStructureId = ${structId}
            AND IsDeleted=false
        `)
        .toPromise()
      const project = await clickHouse.dataAlarm
        .query(`select Project from sensors where PlatformStructureId =${structId} AND IsDeleted=false limit 1 `)
        .toPromise()

      let fList = factorList.map(m => m.SafetyFactorTypeId)
      list = await clickHouse.dataAlarm
        .query(
          `select distinct FactorID, Name,Items,ItemNames from factors
          where  FactorID in (${[...fList, -1].join(',')})
            and  Project = '${[...project, 0][0].Project}'
          `
        )
        .toPromise()
    } else {
      const project = await clickHouse.dataAlarm
        .query(`select Project from sensors where PlatformStructureId =${structId} AND IsDeleted=false limit 1 `)
        .toPromise()
      list = await clickHouse.dataAlarm
        .query(
          `select distinct SafetyFactorTypeId,SafetyFactorTypeName,factors.FactorType
          from sensors 
            inner join factors 
            on factors.FactorID = sensors.SafetyFactorTypeId
            and  factors.Project = '${[...project, 0][0].Project}' 
          where PlatformStructureId =${structId} AND IsDeleted=false`
        )
        .toPromise()
    }
    //and factors.FactorType = 'vib'             

    ctx.body = list
    ctx.status = 200
  } catch (error) {
    ctx.fs.logger.error(`path: ${ctx.path}, error: error`)
    ctx.status = 400
    ctx.body = {
      message: typeof error == 'string' ? error : undefined,
    }
  }
}
//查询设备
async function getSensors(ctx) {
  try {
    const { models } = ctx.fs.dc
    const { clickHouse } = ctx.app.fs
    const { structId, SafetyFactorTypeId } = ctx.query
    const list = await clickHouse.dataAlarm
      .query(
        ` select distinct SensorId,SensorLocationDescription,Project
      from sensors where PlatformStructureId =${structId} 
      and  SafetyFactorTypeId=${SafetyFactorTypeId}
      AND IsDeleted=false `).toPromise()
    ctx.body = list
    ctx.status = 200
  } catch (error) {
    ctx.fs.logger.error(`path: ${ctx.path}, error: error`)
    ctx.status = 400
    ctx.body = {
      message: typeof error == 'string' ? error : undefined,
    }
  }
}
//根据设备id和监测因素id查询监测数据
//客户端渲染流程
async function getMonitorData(ctx) {
  try {
    const { clickHouse } = ctx.app.fs
    const { factorId, sensorId, startTime, endTime, toExport, page, limit } = ctx.query
    const projectId = sensorId.split('-')[0]
    const factorsList =
      (await clickHouse.alarmLocal
        .query(
          `SELECT FactorID,Items,ItemNames,ItemUnits FROM factors 
      WHERE FactorID=${factorId} AND Project='${projectId}'
      `
        )
        .toPromise()) || []
    const dataArray = sensorId.split(',')
    const transformedArray = dataArray.map(item => {
      return item.replace('-', ':') + ''
    })
    const id = `(${transformedArray.map(id => `'${id}'`).join(',')})`
    const monitorData =
      (await clickHouse.alarmLocal.query(
        `SELECT * FROM (
          SELECT  distinct SensorId,CollectTime,Values FROM themes 
      WHERE SensorId in ${id}
      AND CollectTime between '${startTime}'
      AND '${endTime}'
      ORDER BY CollectTime DESC
      UNION ALL
      SELECT DISTINCT SensorId,CollectTime,Values FROM vibs
      WHERE SensorId in ${id}
      AND CollectTime between '${startTime}'
      AND '${endTime}'
      ORDER BY CollectTime DESC
        ) T  ${toExport ? 'LIMIT ' + 10000 : ''}
         ${limit ? 'LIMIT ' + limit : ''}
        ${limit && page ? 'OFFSET ' + parseInt(limit) * parseInt(page) : ''}`).toPromise()) || []
    const result = (await clickHouse.alarmLocal.query(
      `SELECT * FROM (
          SELECT  distinct SensorId,CollectTime,Values FROM themes 
            WHERE SensorId in ${id}
            AND CollectTime between '${startTime}'
            AND '${endTime}'
          UNION ALL
            SELECT DISTINCT SensorId,CollectTime,Values FROM vibs
            WHERE SensorId in ${id}
            AND CollectTime between '${startTime}'
            AND '${endTime}'     
            ORDER BY CollectTime DESC
            ) T  `).toPromise())
    const sensor = await clickHouse.alarmLocal
      .query(`SELECT distinct ID, SensorId,SensorLocationDescription FROM sensors WHERE ID in ${id} AND IsDeleted=false`)
      .toPromise()
    //监测项
    let items = {}
    if (factorsList && factorsList.length > 0) {
      //因素解释
      let factors = []
      //因素名词
      let factorNames = []
      //单位
      let c = []
      factorsList.map(item => {
        factors = item.ItemNames.split(',')
        factorNames = item.Items.split(',')
        c = item.ItemUnits.split(',')
        factors.map((child, index) => {
          items[factorNames[index] ? factorNames[index] : factors[index]] = { name: factors[index], unit: c[index] }
        })
      })
    }
    //设备数据+数据
    let sensors = []
    let data = []
    if (sensor && monitorData && sensor.length && monitorData.length) {
      sensor.forEach(item => {
        // 过滤与当前传感器相关的数据
        const sensorDataArray = monitorData.filter(d => d.SensorId == item.ID)
        // 构建最终的传感器数据结构
        const sensorDataItem = {
          id: item.ID,
          name: item.SensorLocationDescription,
          data: sensorDataArray.map(d => {
            // 根据 item 对象进行映射
            const values = {}
            itemKeys = Object.keys(items)
            itemKeys.forEach((key, index) => {
              values[key] = d.Values[index]
            })

            return {
              time: d.CollectTime,
              values: values,
            }
          }),
        }
        data.push(sensorDataItem)
      })
    }
    //导出相关

    if (toExport) {
      let arr = items
      let columns = []
      columns.push({
        title: '设备位置',
        dataIndex: 'position',
        key: 'position',
      })
      for (let index in arr) {
        columns.push({
          title: arr[index].name + '(' + arr[index].unit + ')',
          dataIndex: index,
          sorter: (a, b) => b[index] - a[index],
          key: index,
        })
      }
      columns.push({
        title: '采集时间',
        dataIndex: 'acqTime',
        sorter: (a, b) => b['realTime'] - a['realTime'],
        key: 'acqTime',
      })
      //设备
      let data1 = []
      let themeStations = data
      for (let i = 0; i < themeStations.length; i++) {
        for (let k = 0; k < themeStations[i].data.length; k++) {
          let cdataT = {}
          let startT = ''
          let endT = ''
          let dataTS = themeStations[i].data[k]
          cdataT.key = `station-${themeStations[i].id}-${k}`
          cdataT.position = themeStations[i].name
          cdataT.acqTime = moment(dataTS.time).format('YYYY-MM-DD HH:mm:ss')
          cdataT.realTime = moment(dataTS.time).valueOf()
          if (startT == '') {
            startT = dataTS.time
            endT = dataTS.time
          } else {
            if (moment(startT) >= moment(dataTS.time)) startT = dataTS.time
            if (moment(endT) <= moment(dataTS.time)) endT = dataTS.time
          }
          //动态列的值
          for (let themeItem in arr) {
            cdataT[themeItem] = dataTS.values[themeItem]
          }
          data1.push(cdataT)
        }
      }
      await exportMaterialEnterList(ctx, data1, columns)
    }
    if (!toExport) {
      ctx.body = { items, sensors: data, count: result ? result.length : 0 }
      ctx.status = 200
    }
  } catch (error) {
    ctx.fs.logger.error(`path: ${ctx.path}, error: error`)
    ctx.status = 400
    ctx.body = {
      message: typeof error == 'string' ? error : undefined,
    }
  }
}

async function exportMaterialEnterList(ctx, data, columns) {
  try {
    let header = []
    columns.forEach(item => {
      header.push({ title: item.title, key: item.key })
    })
    const {
      utils: { simpleExcelDown },
    } = ctx.app.fs
    // let exportData = []
    // let item={}
    // console.log(dataList[0].dataValues)
    let siteName = '数据监控'
    // for (let item of data) {
    //       for(let child of item){
    //             if(child!=key){
    //                item[child]=
    //             }
    //       }
    //    // item.outTime = moment(item.outTime).format('YYYY-MM-DD HH:mm:ss');
    //    // item.branchId = item.siteProcessBranch && item.siteProcessBranch.name ? item.siteProcessBranch.name : '-'
    //    // item.subItemId = item.siteProcessSubItem && item.siteProcessSubItem.name ? item.siteProcessSubItem.name : '-'
    //    // item.type = item.materialItem && item.materialItem.name ? item.materialItem.name : '-'
    //    // item.name = item.materialItem && item.materialItem.name ? item.materialItem.name : '-'
    //    // item.model = item.materialItem && item.materialItem.model ? item.materialItem.model : '-'
    //    // item.unit = item.materialItem && item.materialItem.unit ? item.materialItem.unit : '-'
    //    // item.providerId = item.materialProvider && item.materialProvider.name ? item.materialProvider.name : '-'
    //    // item.status = (item.status || item.status == 0) && data[item.status]
    //    exportData.push(item)
    // }
    const fileName = `${siteName}` + '.xls'
    const filePath = await simpleExcelDown({ data: data, header, fileName: fileName, needIndexCell: false })
    const fileData = fs.readFileSync(filePath)
    ctx.status = 200
    ctx.set('Content-Type', 'application/x-xls')
    ctx.set('Content-disposition', 'attachment; filename=' + encodeURI(fileName))
    ctx.body = fileData
  } catch (error) {
    ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`)
    ctx.status = 400
    ctx.body = {
      message: typeof error == 'string' ? error : undefined,
    }
  }
}
//服务端渲染
async function getMonitorDataServer(ctx, data) {
  try {
    const { factorId, sensorId, startTime, endTime, toExport, title_font_size,
      x_tick_rotation,
      x_tick_date_Formatter,
      legend_fontsize,
      x_tick_fontsize,
      y_tick_rotation,
      y_tick_fontsize,
      grid_visible,
      grid_axis,
      grid_color,
      grif_linestyle,
      subplots_adjust_bottom,
      height,
      width,
      ylabel_fontsize,
      linewidth
    } = ctx.query
    const projectId = sensorId.split('-')[0]
    var reg = /-/ig
    const dataArray = sensorId.replace(reg, ':')
    // const transformedArray = dataArray.map(item => {
    //   return item.replace('-', ':') + ''
    // })
    // const id = `(${transformedArray.map(id => `'${id}'`).join(',')})`
    // const res=await ctx.app.fs.dataDetailServer.get(`structure/factors/sensors/chart`,{query:{project:projectId,factor_id:factorId,sensor_id:dataArray,start_time:startTime,end_time:endTime}})
    let url=`structure/factors/sensors/chart?project=${encodeURIComponent(projectId)}&factor_id=${factorId}&sensor_id=${encodeURIComponent(dataArray)}&start_time=${startTime}&end_time=${endTime}&title_font_size=${title_font_size}&x_tick_rotation=${x_tick_rotation}&x_tick_fontsize=${x_tick_fontsize}&y_tick_rotation=${y_tick_rotation}&y_tick_fontsize=${y_tick_fontsize}
    &grid_visible=${grid_visible}&grid_axis=${grid_axis}&grid_color=${grid_color}&grif_linestyle=${grif_linestyle}&subplots_adjust_bottom=${subplots_adjust_bottom}&height=${height}&width=${width}&x_tick_date_Formatter=${x_tick_date_Formatter}&legend_fontsize=${legend_fontsize}&ylabel_fontsize=${ylabel_fontsize}&linewidth=${linewidth}`
    const res = await ctx.app.fs.dataDetailServer.get(url)
    // const res=await request.get(`https://ddda-117-90-38-89.ngrok-free.app/structure/factors/sensors/chart?project=${projectId}&factor_id=${factorId}&sensor_id=${dataArray}&start_time=${startTime}&end_time=${endTime}`)
    ctx.body = { data: res }
    ctx.status = 200
  } catch (error) {
    ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`)
    ctx.status = 400
    ctx.body = {
      message: typeof error == 'string' ? error : undefined,
    }
  }


}
async function exportFile(ctx) {
  try {
    const { data, columns } = ctx.query
    await exportMaterialEnterList(ctx, data, columns)
  } catch (error) {
    ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`)
    ctx.status = 400
    ctx.body = {
      message: typeof error == 'string' ? error : undefined,
    }
  }
}
//


async function getVib(ctx, stationId, collectTime) {
  const { clickHouse } = ctx.app.fs
  const data = await clickHouse.alarmLocal.query(`
  select SensorId,CollectTime,Wave,Params 
  from vibs
  where SensorId='${stationId}' 
  and CollectTime='${collectTime}'
  limit 1`).toPromise()
  return data
}
async function fftmag(url, source, fs) {
  const res = await request.post(url)
    .send({
      "jsonrpc": "2.0",
      "method": "fft",
      "params": {
        "source": source,
        "fs": fs
      },
      "id": ""
    });
  const body = res.body;

  return body.result;
}


async function findVibRaws(ctx) {
  try {
    const { parseJsonString } = ctx.app.fs.utils
    const { clickHouse } = ctx.app.fs
    //eg:{stationId: 58326, collectTime: "2024-01-31T07:40:02.000Z"}
    const { collectTimesWithStationId } = ctx.request.body
    let result = []
    if (collectTimesWithStationId && collectTimesWithStationId.length) {
      for (let item of collectTimesWithStationId) {
        let data = { config: {}, data: [] }
        const unitArr = await clickHouse.alarmLocal.query(`select ItemUnits from factors where ID='${item.stationId}' limit 1`).toPromise()
        if (unitArr[0]) {
          data.config.unit = unitArr[0].ItemUnits
        }
        const rslt = await getVib(ctx, item.stationId, item.collectTime)
        if (rslt[0]) {
          let res = rslt[0]
          // const {Params,Wave}=res          
          const Params = parseJsonString(res.Params)
          const Wave = res.Wave
          data.config.sampleFreq = Params.fre + 'Hz'
          data.config.count = Params.count
          data.config.collectTime = res.CollectTime
          for (let i = 0; i < Wave.length; i++) {
            data.data.push({
              time: Params ? (i / Params.fre).toFixed(6) : i,
              value: Math.round(Wave[i] * 1e6) / 1e6
            })
          }
        }
        result.push({ data: data, collectTime: item.collectTime, stationId: item.stationId })
      }
    }

    ctx.body = result
    ctx.status = 200
  } catch (error) {
    ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`)
    ctx.status = 400
    ctx.body = {
      message: typeof error == 'string' ? error : undefined,
    }
  }
}


async function findVibFfts(ctx) {
  try {
    const { parseJsonString } = ctx.app.fs.utils
    const { clickHouse } = ctx.app.fs
    const { collectTimesWithStationId } = ctx.request.body
    let result = []
    if (collectTimesWithStationId && collectTimesWithStationId.length) {
      for (let item of collectTimesWithStationId) {
        let data = { config: {}, data: [] }
        const unitArr = await clickHouse.alarmLocal.query(`select ItemUnits from factors where ID='${item.stationId}' limit 1`).toPromise()
        if (unitArr[0]) {
          data.config.unit = unitArr[0].ItemUnits
        }
        let rslt = await getVib(ctx, item.stationId, item.collectTime)
        if (rslt[0]) {
          let res = rslt[0]
          const Params = parseJsonString(res.Params)
          const Wave = res.Wave
          data.config.sampleFreq = Params.fre + 'Hz'
          data.config.count = Params.count
          data.config.collectTime = res.CollectTime
          const fft = await fftmag(ctx.app.fs.api.fftService, Wave, Params.fre)
          fft[0].value = 0; // 去除频谱中的直流分量
          data.data = fft
        }
        result.push({ data: data, collectTime: item.collectTime, stationId: item.stationId })
      }
    }
    ctx.body = result
    ctx.status = 200
  } catch (error) {
    ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`)
    ctx.status = 400
    ctx.body = {
      message: typeof error == 'string' ? error : undefined,
    }
  }
}



module.exports = {
  getStructures,
  getFactors,
  getSensors,
  getMonitorData,
  exportFile,
  findVibRaws,
  findVibFfts,
  getMonitorDataServer
}
