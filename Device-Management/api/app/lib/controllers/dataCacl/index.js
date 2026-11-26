
const moment = require('moment');
//获取异常识别算法
async function findAbnMethods(ctx, next) {
    let rslt = null;
    let error = { name: 'FindError', message: '异常识别算法获取失败' };
    try {
        const models = ctx.fs.dc.models;
        let abnMethods = await models.AbnTypes.findAll();
        rslt = abnMethods.map(s => ({
            id: s.id,
            name: s.name,
            des: s.des
        }));
        error = null;
    } catch (err) {
        ctx.fs.logger.error(`path: ${ctx.path}, error: ${err}`);
    }
    if (error) {
        ctx.status = 400;
        ctx.body = error;
    } else {
        ctx.status = 200;
        ctx.body = rslt;
    }
}
//获取异常参数配置
async function findAbnParamList(ctx) {
    const { factorId,limit,page,keywords,type,sensorList } = ctx.query
    const id=factorId.split(',')
    let sensorId=sensorList.split(',')
    let rslt = null;
    let error = { name: 'FindError', message: '异常参数配置获取失败' };
    let abnParamList
    try {
        let findOption= {where:{ factorId:{$in:id},abnTypeId:Number(type),sensorId:{$in:[...sensorId,'-1']} }}
        if (limit) {
            findOption.limit = limit
         }
         if (page && limit) {
            findOption.offset = page * limit
         }
         if(keywords){
            findOption.where.$or = [
                { sensorLocationDescription: { $like: `%${keywords}%` } },
                { factor: { $like: `%${keywords}%` } }
            ]
         }
        const models = ctx.fs.dc.models;
        abnParamList= await models.AbnReportParams.findAndCountAll(findOption)
        rslt = abnParamList.rows.map(s => ({
            key: s.id,
            id: s.id,
            sensorId: s.sensorId,
            sensorName: s.sensorLocationDescription,
            abnType: s.abnTypeId,
            enabled: s.enabled,
            factorId: s.factorId,
            factorName: s.factor,
            params: s.params,
            itemIndex:s.itemIndex
        }));
        error = null;
    } catch (err) {
        ctx.fs.logger.error(`path: ${ctx.path}, error: ${err}`);
    }
    if (error) {
        ctx.status = 400;
        ctx.body = error;
    } else {
        ctx.status = 200;
        ctx.body ={count:abnParamList.count,rows:rslt}
    }
}

//新增异常参数配置
async function createAbnParam(ctx) {
    let error = { name: 'CreateError', message: '异常参数配置新增失败' };
    const models = ctx.fs.dc.models
    const data = ctx.request.body

    try {
        for (let i = 0; i < data.length; i++) {
            let dataItem = data[i];
            if (dataItem && dataItem.params && dataItem.abnType && dataItem.enabled != null && dataItem.sensorId && dataItem.factorId) {
                let dataToSave = {
                    sensorId: dataItem.sensorId,
                    sensorLocationDescription:dataItem.sensorName,
                    enabled: dataItem.enabled,
                    abnTypeId: dataItem.abnType,
                    factorId: dataItem.factorId,
                    factor: dataItem.factorName,
                    itemIndex: dataItem.itemId,
                    params: dataItem.params
                };
                await models.AbnReportParams.create(dataToSave)

                error = null
                // // 日志信息
                // ctx.fs.api = ctx.fs.api || {}
                // ctx.fs.api.actionParameter = JSON.stringify(data)
                // ctx.fs.api.actionParameterShow = `新增异常推送配置id：${newId}`
            }
        }
    }
    catch (err) {
        ctx.fs.logger.error(`path: ${ctx.path}, error: ${err}`)
    }
    if (error) {
        ctx.status = 400
        ctx.body = error
    } else {
        ctx.status = 204
    }
}
//
async function batchSwitch(ctx, next) {
    const ids = ctx.params.ids.split(',')
    const data = ctx.request.body
    let error = { name: 'UpdateError', message: data ? '批量启用异常参数配置失败' : '批量禁用异常参数配置失败' };
    try {
        for (let i = 0; i < ids.length; i++) {
            let id = ids[i];
            const models = ctx.fs.dc.models;
            let abnParam = await models.AbnReportParams.findOne({ where: { id: id } });
            if (abnParam) {
                let dataToSave = {};
                if (data.use == 'switch') {
                    dataToSave.enabled = data.enabled;//批量启用or禁用
                } else {
                    dataToSave.params = data.paramJson;//批量改参数
                }
                if (Object.keys(dataToSave).length) {
                    await models.AbnReportParams.update(dataToSave, { where: { id } });
                }
                error = null;
                // // 日志信息
                // ctx.fs.api = ctx.fs.api || {};
                // ctx.fs.api.actionParameter = JSON.stringify(data);
                // ctx.fs.api.actionParameterShow = `异常参数配置id：${id}`;
            } else {
                error = { name: 'NotFound', message: `不存在{id=${id}}的异常参数配置` };
            }
        }
    } catch (err) {
        ctx.fs.logger.error(`path: ${ctx.path}, error: ${err}`);
    }
    if (error) {
        ctx.status = 400;
        ctx.body = error;
    } else {
        ctx.status = 204;
    }
}

//删除异常参数配置
async function deleteAbnParam(ctx, next) {
    let error = { name: 'DeleteError', message: '异常参数配置删除失败' };
    const ids = ctx.params.ids.split(',');
    //const { id } = ctx.params;
    try {
        for (let i = 0; i < ids.length; i++) {
            let id = ids[i];
            const models = ctx.fs.dc.models;
            let abnParam = await models.AbnReportParams.findOne({ where: { id } });
            if (abnParam) {
                await models.AbnReportParams.destroy({ where: { id } });
                error = null;
            } else {
                error = { name: 'NotFound', message: `不存在{id=${id}}的异常参数配置` };
            }
        }
    } catch (err) {
        ctx.fs.logger.error(`path: ${ctx.path}, error: ${err}`);
    }
    if (error) {
        ctx.status = 400;
        ctx.body = error;
    } else {
        ctx.status = 204;
    }
}

//修改异常推送配置
async function updateAbnParam(ctx) {
    let error = { name: 'UpdateError', message: '异常参数配置修改失败' }
    const ids = ctx.params.ids.split(',')
    const data = ctx.request.body

    if (data && Object.keys(data).length) {
        try {
            for (let i = 0; i < ids.length; i++) {
                let id = ids[i];
                const models = ctx.fs.dc.models;
                let abnParam = await models.AbnReportParams.findOne({ where: { id: id } });
                if (abnParam) {
                    let dataToSave = {};
                    const { abnType, params, enabled } = data;
                    if (enabled != null && enabled != abnParam.enabled)
                        dataToSave.enabled = enabled;
                    //中断
                    if (abnType == 1) {
                        if (params != null && params.thr_int !== abnParam.params.thr_int) {
                            dataToSave.params = params;
                        }
                    }
                    //毛刺
                    if (abnType == 2) {
                        if (params != null && params.thr_burr !== abnParam.params.thr_burr) {
                            dataToSave.params = params;
                        }
                    }
                    //趋势
                    if (abnType == 3) {
                        if (params != null &&
                            (params.thr_burr !== abnParam.params.thr_burr || params.win_med !== abnParam.params.win_med
                                || params.win_avg !== abnParam.params.win_avg || params.win_grad !== abnParam.params.win_grad
                                || params.thr_grad !== abnParam.params.thr_grad || params.thr_der !== abnParam.params.thr_der
                                || params.days_Last !== abnParam.params.days_Last)) {
                            dataToSave.params = params;
                        }
                    }
                    if (Object.keys(dataToSave).length) {
                        await models.AbnReportParams.update(dataToSave, { where: { id } });
                    }
                    error = null;
                } else {
                    error = { name: 'NotFound', message: `不存在{id=${id}}的异常参数配置` };
                }
            }
        } catch (err) {
            ctx.fs.logger.error(`path: ${ctx.path}, error: ${err}`);
        }
    }
    if (error) {
        ctx.status = 400;
        ctx.body = error;
    } else {
        ctx.status = 204;
    }
}
//异常数据对比
async function getAbnTaskResult(ctx, next) {
    let error = { name: 'TaskError', message: '异常数据对比失败' }
    const { clickHouse } = ctx.app.fs
    const structId = ctx.params.id
    const startTime = ctx.params.start
    const endTime = ctx.params.end
    const data = ctx.request.body
    const {factorId,project}=data
    const stationId = data.station
    const  res=await clickHouse.dataAlarm.query(`
        SELECT * FROM factors FINAL WHERE FactorID=${factorId} AND Project='${project}'
        `).toPromise() || [];
    let itemName = null;
    if(res.length){
        let itemKey =res[0].Items.split(',')[data.itemId];
        let itemn = res[0].ItemNames.split(',')[data.itemId];
        itemName={
            itemKey,
            itemn
        }
    }
    try {
        const itemsObj =findThemeItems(res)
        let findOptions = {
            startTime,
            endTime,
            stationId,
            project
        }
        const ckThemeData =await findThemeDataFromCK(clickHouse,findOptions);
        const stationsData = ckThemeData.reduce((p, c) => {
            const values=c.Values;
            let dataObj={};
            dataObj[itemName.itemKey || itemName.itemn]=values[data.itemId];
            p.unshift(Object.assign({}, dataObj, { time: moment(c.CollectTime).format('YYYY-MM-DD HH:mm:ss') }));
            return p;
        }, []);
        //获取前一天的最后一条数据
        // const preFindOptions ={...findOptions,
        //     startTime:moment(startTime).subtract(1,'days').format('YYYY-MM-DD HH:mm:ss'),
        //     endTime:moment(startTime).format('YYYY-MM-DD HH:mm:ss'),
        // }
        // const ckPreData = await findThemeDataFromCK(clickHouse,preFindOptions);
        // const preOneData = ckPreData.reduce((p, c) => {
        //     const values=c.Values;
        //     let dataObj={};
        //     dataObj[itemName.itemKey || itemName.itemn]=values[data.itemId];
        //     p.unshift(Object.assign({}, dataObj, { time: moment(c.CollectTime).format('YYYY-MM-DD HH:mm:ss') }));
        //     return p;
        // }, []);
        let one = stationsData && stationsData.length > 0 ? stationsData[0] : null;
        let itemKey = itemName.itemKey || itemName.itemn;//监测项名称
        let itemn = itemName.itemn;
        let calcResult = calcAlgorithm(one, stationsData, data, itemKey);//计算
        ctx.status = 200;
        ctx.body = {
            unit: itemsObj[itemKey||itemn].unit,
            method: data.abnType,
            itemKey: itemKey,
            itemName: itemn,
            stationData: stationsData,
            resultArray: calcResult
        };
    } catch (err) {
        ctx.fs.logger.error(err);
        ctx.status = 400;
        ctx.body = {
            name: "FindError",
            message: "异常数据识别-数据对比失败"
        }
    }
}

let calcAlgorithm = function (dataOne, dataSource, params, itemKey) {
    let result;
    switch (params.abnType) {
        case "interrupt":
            result = interrupt(dataOne, dataSource, params, itemKey);
            break;
        case "burr":
            result = burr(dataOne, dataSource, params, itemKey).result;
            break;
        case "trend":
            result = trend(null, dataSource, params, itemKey);
            break;
    }
    return result;
};
//中断
let interrupt = function (dataOne, dataSource, params, key) {
    let result = [];
    if (dataSource.length != 0) {
        if (dataOne == null) {
            result.push({
                type: "interrupt",
                hour: 24.00,
                time: dataSource[0].time,
                value: dataSource[0][key]
            });//第一个点中断
        } else {
            dataSource.unshift(dataOne);
        }
        for (let i = 0; i < dataSource.length - 1; i++) {
            if (dataSource[i] == null || dataSource[i + 1] == null) continue;
            let hour = getHour(dataSource[i + 1].time, dataSource[i].time);
            if (hour >= params.params.thr_int) {
                result.push({
                    type: "interrupt",
                    hour: hour,
                    time: dataSource[i + 1].time,
                    value: dataSource[i + 1][key]
                });
            }
        }
    }
    return result;
}
//毛刺
let burr = function (dataOne, dataSource, params, key) {
    let burrTv = params.params.thr_burr;
    let result = [];//毛刺点
    let dataSAfterBurr = [];//去掉毛刺点的数组
    if (dataSource.length != 0) {
        if (dataOne != null) {
            dataSource.unshift(dataOne);
        }
        for (let i = 1; i < dataSource.length - 1; i++) {
            if (dataSource[i - 1] == null || dataSource[i] == null || dataSource[i + 1] == null) continue
            let gap1 = dataSource[i][key] - dataSource[i - 1][key]
            let gap2 = dataSource[i][key] - dataSource[i + 1][key]
            // 修正毛刺检测逻辑，添加方向一致性检查，与Scala代码保持一致
            let isBurr = (Math.abs(gap1) >= burrTv && Math.abs(gap2) >= burrTv && ((gap1 < 0) === (gap2 < 0)));

            // let gap3 = dataSource[i - 1][key] - dataSource[i][key]
            // let gap4 = dataSource[i + 1][key] - dataSource[i][key]

            // let result1 = (gap1 > burrTv && gap2 > burrTv)
            // let result2 = (gap3 > burrTv && gap4 > burrTv)

            if (i == 1) {//第一个点
                dataSAfterBurr.push(dataSource[0])
            }
            if (isBurr) {
                result.push({
                    type: "burr",
                    burr: Math.min(Math.abs(gap1), Math.abs(gap2)),                   
                    time: dataSource[i].time,
                    value: dataSource[i][key]
                })
            } else {
                dataSAfterBurr.push(dataSource[i])
            }
            if (i == dataSource.length - 2) {//最后一个点
                dataSAfterBurr.push(dataSource[dataSource.length - 1])
            }
        }
    }
    return { result: result, dataSAfterBurr: dataSAfterBurr }
}
//异常趋势
let trend = function (dataOne, dataSource, params, key) {
    let result;
    if (dataSource.length != 0) {
        //去完毛刺的新数组
        let afterBurr = burr(dataOne, dataSource, params, key).dataSAfterBurr;
	    //滑动中值 - 与Scala代码完全一致
        let arrAfterMedian = [];
        let medianWindow = parseInt(params.params.win_med);
        for (let i = 0; i <= afterBurr.length - medianWindow; i++) {
            let arr = afterBurr.slice(i, i + medianWindow);
            let oneMedian = calcMedian(arr, key);
            if (oneMedian) {
                arrAfterMedian.push(oneMedian);
            }
        }
        //滑动均值 - 修正为标准滑动窗口
        let arrAfterAvg = calcMeanValue(arrAfterMedian, params.params.win_avg, key)
        //错位相减,相当于求导 - 与Scala代码逻辑一致
        let arrAfterDe = []
        if (arrAfterAvg && arrAfterAvg.length > 1) {
            for (let j = 0; j < arrAfterAvg.length - 1; j++) {
                if (arrAfterAvg[j] && arrAfterAvg[j + 1] && 
                    arrAfterAvg[j].value != null && arrAfterAvg[j + 1].value != null) {
                    let one = {
                        value: arrAfterAvg[j + 1].value - arrAfterAvg[j].value,
                        time: arrAfterAvg[j].time  // 使用前一个元素的时间戳，与Scala一致
                    }
                    arrAfterDe.push(one);
                }
            }
        }
        //最后判断
        let finalArray = finalJudge(arrAfterDe, arrAfterMedian, params)
        result = {
            calcFinal: finalArray,
            calcPreprocess: arrAfterAvg//要画预处理+滑动均值完了的曲线
        };
    }
    return result
}
let getHour = function (s1, s2) {
    s1 = new Date(s1.replace(/-/g, '/'))
    s2 = new Date(s2.replace(/-/g, '/'))
    let ms = Math.abs(s1.getTime() - s2.getTime())
    return ms / 1000 / 60 / 60;
}
//计算一组数据的中值 - 与Scala代码完全一致
let calcMedian = function (array, key) {
    let result;
    if (array != null && array.length > 0) {
        // 过滤掉无效数据
        let validArray = array.filter(item => item != null && item[key] != null && !isNaN(item[key]));
        if (validArray.length === 0) {
            return null;
        }
        
        // 创建副本进行排序，避免修改原数组
        let sortedArray = [...validArray].sort((a, b) => { return a[key] - b[key]; });
        let window = sortedArray.length;
        
        if (window % 2 == 0) {//偶数
            let index1 = window / 2;
            let index2 = window / 2 - 1;
            let median = (sortedArray[index1][key] + sortedArray[index2][key]) / 2;
            // 使用原始数组中间位置的时间戳，避免排序后时间戳错乱
            result = {
                value: median,
                time: validArray[Math.floor(validArray.length / 2)].time
            }
        } else {//奇数
            let index = Math.floor(window / 2);
            let median = sortedArray[index][key];
            result = {
                value: median,
                time: validArray[Math.floor(validArray.length / 2)].time
            }
        }
    }
    return result;
}
//计算一组数据的均值
let calcMeanValue = function (array, coef, key) {
    let result = [];
    let sum = 0;
    if (array != null || array.length > 0) {
        for (let i = 0; i < array.length; i++) {
            let value;
            if (i < parseInt(coef)) {
                sum = sum + array[i].value
                value = sum / (i + 1)
            } else {
                let arr = array.slice(i - parseInt(coef) + 1, i + 1)
                let ssum = 0;
                for (let s = 0; s < arr.length; s++) {
                    ssum = ssum + arr[s].value
                }
                value = ssum / parseInt(coef)
            }
            let one = {
                value: value,
                time: array[i].time
            }
            result.push(one)
        }
    }
    return result
}

let finalJudge = function (array, original, params) {
    let ups = 1, downs = 1;
    let tempUp = [], tempDown = [];
    let point = params.params.win_grad;//渐变点个数
    let deTv = params.params.thr_der;//导数阈值
    let greTv = params.params.thr_grad;//渐变阈值
    let finalArray = [];
    for (let i = 0; i < array.length; i++)//对最新数组作阈值判断
    {
        if (array[i].value > deTv) {
            ups = ups + 1
            if (ups == 2) {
                tempUp.push(original[i])
            }
            tempUp.push(original[i + 1])
            if (tempDown.length >= point) {
                let bbb = tempDown[tempDown.length - 1].value - tempDown[0].Value
                if (downs >= point && bbb < -greTv) {
                    let one = {
                        startTime: tempDown[0].time,
                        endTime: tempDown[tempDown.length - 1].time,
                        startValue: tempDown[0].value,
                        endValue: tempDown[tempDown.length - 1].value,
                        value: bbb,
                        des: "异常下降"
                    };
                    finalArray.push(one)
                }
            }
            downs = 1
            tempDown = []
        } else if (array[i].value < -deTv) {
            downs = downs + 1;
            if (downs == 2) {
                tempDown.push(original[i])
            }
            tempDown.push(original[i + 1])
            if (tempUp.length >= point) {
                let aaa = tempUp[tempUp.length - 1].value - tempUp[0].value
                if (ups >= point && aaa > greTv) {
                    let one = {
                        startTime: tempUp[0].time,
                        endTime: tempUp[tempUp.length - 1].time,
                        startValue: tempUp[0].value,
                        endValue: tempUp[tempUp.length - 1].value,
                        value: aaa,
                        des: "异常上升"
                    };
                    finalArray.push(one)
                }
            }
            ups = 1;
            tempUp = []
        }
    }
    if (ups >= point) {
        let ccc = tempUp[tempUp.length - 1].value - tempUp[0].value
        if (ccc > greTv) {
            let one = {
                startTime: tempUp[0].time,
                endTime: tempUp[tempUp.length - 1].time,
                startValue: tempUp[0].value,
                endValue: tempUp[tempUp.length - 1].value,
                value: ccc,
                des: "异常上升"
            };
            finalArray.push(one)
        }
    }
    if (downs >= point) {
        let ddd = tempDown[tempDown.length - 1].value - tempDown[0].value
        if (ddd < -greTv) {
            let one = {
                startTime: tempDown[0].time,
                endTime: tempDown[tempDown.length - 1].time,
                startValue: tempDown[0].value,
                endValue: tempDown[tempDown.length - 1].value,
                value: ddd,
                des: "异常下降"
            };
            finalArray.push(one);
        }
    }
    return finalArray
}
// async function findThemeItems(models, factor) {
//     try {
//         let factorProto = await models.Factor.findOne({
//             where: { id: factor },
//             attributes: ['id', 'proto']
//         });
//         let protoItems = await models.FactorProtoItem.findAll({
//             where: { proto: factorProto.proto },
//             attributes: ['name', 'fieldName'],
//             include: [{
//                 model: models.ItemUnit,
//                 where: { default: true },
//                 required: true,
//                 attributes: ['name']
//             }]
//         });
//         let itemsObj = protoItems.reduce((p, c) => {
//             p[c.fieldName] = {
//                 name: c.name,
//                 unit: c.itemUnits[0] ? c.itemUnits[0].name : null
//             }
//             return p
//         }, {})
//         return itemsObj
//     } catch (err) {
//         throw err
//     }
// };
// async function findThemeDataFromES(esclient, filter, limit, _source) {
//     try {
//         let rslt = []
//         const client = esclient[THEME_DATA]
//         let params = {
//             index: client.config.index,
//             type: client.config.type,
//             body: filter
//         }

//         params.size = limit
//         if (limit == null) {
//             const countRes = await client.count(params)
//             params.size = countRes.count > 10000 ? 10000 : countRes.count
//         }

//         params._source = _source || ["sensor", "collect_time", "data"]
//         params.body.sort = { "collect_time": { "order": "desc" } }
//         let res = await client.search(params)
//         rslt = res.hits.hits
//         return rslt
//     } catch (err) {
//         throw err
//     }
// }
async function findThemeDataFromCK(ck,findOptions) {
    try {
        let rslt = [];
        let {startTime,endTime,stationId,project}=findOptions;
        const  rslts=await ck.dataAlarm.query(`
            SELECT * FROM themes WHERE SensorId='${project}:${stationId[0]}' 
            AND CollectTime between '${startTime}' AND '${endTime}'
            ORDER BY CollectTime desc
            LIMIT 10000
            `).toPromise();
        
        return rslts
    } catch (err) {
        throw err
    }
}


function findThemeItems(data) {
    try {
        let itemsObj={};
        if(data.length){
            for(let item of data) {
                let itemArr=item.Items?item.Items.split(','):item.ItemNames.split(',');
                let unitArr=item.ItemUnits .split(',');
                for(let i=0;i<itemArr.length;i++){
                    itemsObj[itemArr[i]]={
                        name:itemArr[i],
                        unit:unitArr[i]
                    }
                }
            }
        }
        // let factorProto = await models.Factor.findOne({
        //     where: { id: factor },
        //     attributes: ['id', 'proto']
        // });
        // let protoItems = await models.FactorProtoItem.findAll({
        //     where: { proto: factorProto.proto },
        //     attributes: ['name', 'fieldName'],
        //     include: [{
        //         model: models.ItemUnit,
        //         where: { default: true },
        //         required: true,
        //         attributes: ['name']
        //     }]
        // });
        // let itemsObj = protoItems.reduce((p, c) => {
        //     p[c.fieldName] = {
        //         name: c.name,
        //         unit: c.itemUnits[0] ? c.itemUnits[0].name : null
        //     }
        //     return p
        // }, {})
        return itemsObj
    } catch (err) {
        throw err
    }
};



module.exports = {
    findAbnMethods,
    findAbnParamList,
    createAbnParam,
    updateAbnParam,
    batchSwitch,
    deleteAbnParam,
    getAbnTaskResult
};