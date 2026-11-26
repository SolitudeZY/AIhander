'use strict'

import React, { useEffect, useState, useRef } from 'react';
import { connect } from 'react-redux';
import { Row, Form, Col, Select, Button, notification, Card } from 'antd';
import moment from 'moment';
import AbnRecognize from './AbnRecognize';
import TimeValueLineChart from '../components/time-value-line-chart';
const methodType = {
    'interrupt': 1,
    'burr': 2,
    'trend': 3,
}
const methodDes = {
    'interrupt': "中断",
    'burr': "毛刺",
    'trend': "异常趋势",
}
let startTime=null;
let endTime=null;
const Calc = (props) => {
    const { actions, dispatch, pepProjectId, abnMethods, abnParam } = props
    const { install, data } = actions
    const [structId, setStructId] = useState(null)
    const [methodType, setMethodType] = useState('interrupt')
    const [loading, setLoading] = useState(false)
    const [structList, setStructList] = useState([])//结构物筛选列表
    const [project, setProject] = useState('')//project(eg:{projcet:'nbjj'})
    const [reCalcFactorId, setReCalcFactorId] = useState(null);
    const [msg, setMsg] = useState('')
    const [factosList, setFactorsList] = useState([])//监测因素列表
    const [factorId, setFactorId] = useState(null)
    const [sensorList, setSensorList] = useState([])//设备列表
    const [sensorId, setSensorId] = useState([])//设备id'
    const [itemId, setItemId] = useState(null)//监测项索引
    const [itemName, setItemName] = useState('')//检测项name
    const [query, setQuery] = useState({ limit: 10, page: 0 }); //页码信息
    const [limits, setLimits] = useState(0);
    const [originalData,setOriginalData]=useState(['还没查询']);
    const [stationsData,setStationsData]=useState();
    // const [methodValue,setMethodValue]=useState(1)//
    const form = useRef()
    const form2 = useRef()
    const method = {
        'interrupt': 1,
        'burr': 2,
        'trend': 3,
    }
    //初始化
    useEffect(() => {
        // getData()
        dispatch(install.getAbnMethods())
    }, [])
    //页码改变的回调函数
    const pageChange = (arg1, arg2) => {
        setQuery({ limit: arg1, page: arg2 })
    }
    const limitChange = (arg) => {
        setLimits(arg)
    }
    useEffect(() => {
        if (project && factorId) {
            const id = [factorId, -1].join(',')
            dispatch(install.getAbnParamList({
                factorId: id, limit: query.limit, page: query.page, type: method[methodType],
                sensorList: sensorList?.map(i => `${project}:${i.value}`).join(',')
            }
            )).then(rs => {
                if (rs.success) {
                    setLimits(rs.payload.data.count)
                }
            })
        }
    }, [project, methodType, query, sensorList])

    //监听变化
    useEffect(() => {
        setStructList([])
        form.current.reset()
        form2.current.reset()
        form2.current.setValue('method', methodType)
        getData()
    }, [pepProjectId])
    const checkInterger = (rule, val) => {
        // if(val){
        const strRegex = /^[1-9]*[1-9][0-9]*$/
        if (strRegex.test(val)) {
            return true
        }

        return false
        // }

    };
    const checkNumber = (rule, val) => {
        const strRegex = /^-?\d+(\.\d+)?$/
        if (strRegex.test(val)) {
            return true
        }
        return false



    }
    const checkPoint = (rule, value) => {
        const pattern = /^[1-9]*[1-9][0-9]*$/;
        if (pattern.test(value) && value != 1) {
            return true
        }
        return false
    }
    const getJson = (values) => {
        let paramJson;
        switch (methodType) {
            case 'interrupt':
                return paramJson = { "thr_int": Number(values.iv) };
            case 'burr':
                return paramJson = { "thr_burr": Number(values.bv1) }
            case 'trend':
                return paramJson = {
                    "thr_burr": Number(values.bv2),//毛刺阈值
                    "win_med": Number(values.ws),//滑动中值窗口
                    "win_avg": Number(values.rc),//滑动均值窗口
                    "win_grad": Number(values.pn),//渐变点个数
                    "thr_grad": Number(values.gv),//渐变阈值
                    "thr_der": Number(values.dv),//导数阈值
                    "days_Last": Number(values.time),//时间跨度
                }
        }
    }
    const getStationstoSave = () => {
        let toSave = [], toSaveName = [], notToSave = [], notToSaveName = []
        let selectIds = sensorId
        for (let i = 0; i < selectIds.length; i++) {
            let seStaName = sensorList.find(a => a.value == selectIds[i]).label
            let cfg
            if (methodType == "interrupt") {
                cfg = abnParam?.find(a => a.abnType == 1 && a.factorId == factorId
                    && a.sensorId == project + ':' + selectIds[i])
            } else {
                let type = methodType == "burr" ? 2 : 3
                cfg = abnParam?.find(a => a.abnType == type && a.factorId == factorId
                    && a.sensorId == project + ':' + selectIds[i])
            }
            if (!cfg) {
                toSave.push(selectIds[i])
                toSaveName.push(seStaName)
            } else {
                notToSave.push(selectIds[i])
                notToSaveName.push(seStaName)
            }
        }
        return {
            toSave: toSave, toSaveName: toSaveName,
            notToSave: notToSave, notToSaveName: notToSaveName
        };
    }
    //保存配置
    const handleSave = () => {
        setMsg('')
        form2.current.validate().then(res => {
            if (sensorId.length != 0) {
                let ids = getStationstoSave()
                if (ids.toSave.length != 0) {
                    let paramJson = getJson(res)
                    let data = {
                        sensorId: ids.toSave,//测点
                        sensorName: ids.toSaveName,
                        factorId: factorId,
                        factorName: factosList.find(a => a.value == factorId).label,
                        abnType: method[methodType],//算法类型
                        enabled: true,
                        params: paramJson,
                        itemId: itemId,

                    }
                    let pushData = data.sensorId.map(d => {
                        return {
                            sensorId: project + ':' + d,//测点
                            sensorName: sensorList.find(a => a.value == d).label,
                            factorId: factorId,
                            factorName: factosList.find(a => a.value == factorId).label,
                            abnType: method[methodType],//算法类型
                            enabled: true,
                            params: paramJson,
                            itemId: methodType == 'interrupt' ? null : itemId

                        }
                    })
                    dispatch(install.addAbnParam(pushData)).then(res => {
                        if (res.success) {
                            const id = [factorId, -1].join(',')
                            dispatch(install.getAbnParamList({
                                factorId: id, limit: query.limit, page: query.page, type: method[methodType],
                                sensorList: sensorList?.map(i => `${project}:${i.value}`).join(',')

                            })).then(rs => {
                                if (rs.success) {
                                    setLimits(rs.payload.data.count)
                                }
                            })
                        }
                    })
                    if (ids.notToSave.length != 0) {
                        let fact = methodType == 'interrupt' ? "因素" : "子项"
                        notification.warning({
                            message: `已存在传感器： ${ids.notToSaveName.join('，')} 在当前监测${fact}下的${methodDes[methodType]}参数配置，本次保存的传感器为：${ids.toSaveName.join('，')}`,
                            duration: 3,
                        })
                    }
                } else {
                    let sg = methodType == 'interrupt' ? "因素下的中断"
                        : methodType == 'burr' ? "子项下的毛刺" : "子项下的异常趋势"
                    notification.warning({
                        message: `已存在选定测点在当前监测 ${sg} 参数配置，本次无可保存的参数配置`,
                        duration: 3,
                    })
                }
            } else {
                notification.warning({
                    message: `请选择测点`,
                    duration: 3,
                })
                return false
            }

        })
    }
    //数据对比
    const dataCompare = () => {
        // this.setState({ msg: '' });
        // this.props.form.validateFields((err, values) => {
        //     if (!err) {
        //         if (this.props.stationsValue.length != 0) {
        //             let paramJson = this.getJson(values);
        //             let data = {
        //                 station: this.props.stationsValue[0],//第一个测点
        //                 factorId: this.props.factorId,
        //                 itemId: this.props.itemId,
        //                 abnType: this.props.methodType,//算法类型
        //                 enabled: true,
        //                 params: paramJson
        //             };
        //             this.props.dataCompara(data);
        //         } else {
        //             message.error('请选择测点!');
        //             return false;
        //         }
        //     }
        // });
    }

    //结构物筛选发生变化回调函数
    const reCalcFactorChange = (value) => {
        // debugger
        setItemName(factosList?.find(item => item.value === value[0])?.children?.find(p => p.value === value[1])?.label)
        setItemId(value[1])
        // form2.current.setValue('point', '')
        setFactorId(value[0])
    }
    //点位筛选发生改变的回调函数
    const pointChange = (value) => {
        setSensorId(value)
        // setProject(structList.find(item => item.value == structId)?.project)
    }
    //监听结构物变化，查询监测因素
    useEffect(() => {
        setLoading(true);
        let queryParams = { structId, cacl: 1 }
        if (structId) {
            dispatch(data.getFactors({ ...queryParams })).then(res => {
                if (res.success) {
                    const list = res.payload.data?.map(item => {
                        const itemList = item.ItemNames && item.ItemNames.split(',') || []
                        let child = []
                        itemList && itemList.length && itemList.forEach((i, index) => {
                            child.push({ label: i, value: index })
                        })
                        return {
                            label: item.Name,
                            value: item.FactorID,
                            children: child

                        }

                    })
                    form2.current.setValue('factor', [list[0]?.value, list[0]?.children[0]?.value])
                    setFactorsList(list)
                    setFactorId(list[0]?.value)
                    setItemId(list[0]?.children[0]?.value)
                    setItemName(list[0]?.children[0]?.label)
                    setLoading(false)
                }
            })
        }

    }, [structId])
    useEffect(() => {
        let queryParams = { structId, SafetyFactorTypeId: factorId }
        // debugger
        if (factorId && structId) {
            dispatch(data.getSensors({ ...queryParams })).then(res => {
                if (res.success) {
                    const list = res.payload.data?.map(item => {
                        return {
                            value: item.SensorId,
                            label: item.SensorLocationDescription,
                        }
                    })
                    form2.current.setValue('point', [list[0]?.value])
                    setSensorId([list[0]?.value])
                    setSensorList(list)
                    setLoading(false);
                    setProject(res.payload.data[0].Project)
                }
            })
        }
    }, [factorId])




    //获取结构物函数
    const getData = (queryParams = { pomsProjectId: pepProjectId }) => {
        setLoading(true);
        dispatch(data.getProjectAllStructures({ ...queryParams })).then(res => {
            if (res.success) {
                const uniqueIds = new Set();
                const list = res.payload.data?.filter(item => {
                    const duplicate = uniqueIds.has(item.strucId);
                    uniqueIds.add(item.strucId);
                    return !duplicate
                })?.map(item => ({
                    value: item.strucId,
                    label: item.strucName,
                    project: item.Project,
                }))
                form.current.setValue('struct', list[0]?.value)
                setStructId(list[0]?.value)
                setStructList(list)
                setLoading(false)
            }
        }

        )
    }
    const changeMethod = (value) => {
        setQuery({ limit: 10, page: 0 })
        setMethodType(value)
    }
    const clearFactorAndSensor = () => {
        form2.current.setValue('point', '')
        form2.current.setValue('factor', '')
    }
    const structChange = (value) => {
        setStructId(value)
        setFactorId(0)
        clearFactorAndSensor()
    }
    // const methodChange=(e)=>{
    //     setMethodValue(e)
    // }

    const renderParamsConfig = () => {
        switch (methodType) {
            case 'interrupt':
                return (
                    <Col span={4}>
                        <Form.Input field='iv' placeholder="中断阈值：正整数" noLabel={true} rules={[{
                            required: true, message: "请输入正整数", validator: checkInterger
                        }]} trigger='blur'>
                        </Form.Input>
                    </Col>
                );
            case 'burr':
                return (
                    <Col span={4}>
                        <Form.Input field='bv1' placeholder="毛刺阈值：数字" noLabel={true} rules={[{
                            required: true, message: "请输入数字", validator: checkNumber
                        }]} trigger='blur'>
                        </Form.Input>
                    </Col>
                );
            case 'trend':
                return (
                    <Col span={18}>
                        <Row gutter={10}>
                            <Col span={4} >
                                <Form.Input field='bv2' placeholder="毛刺阈值：数字" noLabel={true} rules={[{
                                    required: true, message: "请输入正整数", validator: checkInterger
                                }]} trigger='blur' />
                            </Col>
                            <Col span={4}>
                                <Form.Input field='ws' placeholder="滑动中值：正值" noLabel={true} rules={[{
                                    required: true, message: "请输入正整数", validator: checkInterger
                                }]} trigger='blur' />
                            </Col>
                            <Col span={4}>
                                <Form.Input field='rc' placeholder="滑动均值：正值" noLabel={true} rules={[{
                                    required: true, message: "请输入正整数", validator: checkInterger
                                }]} trigger='blur' />
                            </Col>
                            <Col span={4}>
                                <Form.Input field='dv' placeholder="导数阈值：数字" noLabel={true} rules={[{
                                    required: true, message: "请输入数字", validator: checkNumber
                                }]} trigger='blur' />
                            </Col>
                            <Col span={4}>
                                <Form.Input field='pn' placeholder="渐变点个数：正值" noLabel={true} rules={[{
                                    required: true, message: "请输入大于1的正整数", validator: checkPoint
                                }]} trigger='blur' />
                            </Col>
                            <Col span={4}>
                                <Form.Input field='gv' placeholder="渐变阈值：数字" noLabel={true} rules={[{
                                    required: true, message: "请输入数字", validator: checkNumber
                                }]} trigger='blur' />
                            </Col>
                        </Row>
                    </Col>);
        }
    }
let handleChartData=(abnCompareData)=>{
    let originalData = ['还没查询']; let calcArray = []; let key; let itemName; 
    const stationsData = [];
    if (abnCompareData && methodType == abnCompareData.method) {
      originalData = abnCompareData.stationData;
      calcArray = abnCompareData.resultArray;
      key = abnCompareData.itemKey;
      itemName = abnCompareData.itemName;
      startTime = originalData && originalData.length > 0 ? originalData[0].time : '';
      endTime = originalData && originalData.length > 0 ? originalData[originalData.length - 1].time : '';
      for (let i = 0; i < originalData.length; i++) {
        const one = { name: `${itemName}（单位：${abnCompareData.unit}）`, value: originalData[i][key], time: originalData[i].time };
        stationsData.push(one);
      }
      if (methodType == 'interrupt') {
        for (let j = 0; j < calcArray.length; j++) {
          const one = { name: `中断点：${calcArray[j].time}（中断时长：${calcArray[j].hour.toFixed(2)}h）`, value: calcArray[j].value, time: calcArray[j].time };
          stationsData.push(one);
        }
      } else if (methodType == 'burr') {
        for (let j = 0; j < calcArray.length; j++) {
          const one = {
            name: `毛刺点：${calcArray[j].time}（突变大小：${calcArray[j].burr.toFixed(2)}${abnCompareData.unit}）`,
            value: calcArray[j].value,
            time: calcArray[j].time,
          };
          stationsData.push(one);
        }
      } else if (calcArray) {
        const preLineData = calcArray.calcPreprocess;
        const abnTrends = calcArray.calcFinal;
        for (let j = 0; j < preLineData.length; j++) {
          const one = { name: '预处理+滑动均值后数据', value: preLineData[j].value, time: preLineData[j].time };
          stationsData.push(one);
        }
        for (let t = 0; t < abnTrends.length; t++) {
          const name = '异常'
          const detailDesc = `${abnTrends[t].startTime}至${abnTrends[t].endTime}${abnTrends[t].des}，渐变差值：${abnTrends[t].value.toFixed(2)}${abnCompareData.unit}`;
          const start = { name, value: abnTrends[t].startValue, time: abnTrends[t].startTime, detailDesc: detailDesc };
          const end = { name, value: abnTrends[t].endValue, time: abnTrends[t].endTime, detailDesc: detailDesc };
          stationsData.push(start);
          stationsData.push(end);
          stationsData.push({ name, value: null, time: abnTrends[t].endTime })//为了实现断点效果而加上的null点
        }
      }
    }
    return {stationsData,originalData}
    }
    let handleCompare = () => {
        setOriginalData(['还没查询']);
        setStationsData([]);
        form.current.validate().then(res => {
            let start=null
            let end=null
            if(!res.timeRange.length){
                start=moment().add(-1, 'days').format('YYYY-MM-DD HH:mm:ss')
                end=moment().format('YYYY-MM-DD HH:mm:ss')
            }else{
                start=moment(res.timeRange[0]).format('YYYY-MM-DD HH:mm:ss')
                end=moment(res.timeRange[1]).format('YYYY-MM-DD HH:mm:ss')
            }
            form2.current.validate().then(res => {
                        let payload={
                            abnType:methodType,
                            enabled:true,
                            factorId,
                            itemId,
                            params:getJson(res),
                            station:sensorId,
                            project,
                        }
                        //中断
                        if(methodType === 'interrupt'){
                            dispatch(install.getItemAbnResult_int(structId, start, end, payload)).then(res=>{
                                if(res.success){
                                    const {data}=res.payload;
                                    const {stationsData,originalData}=handleChartData(data);
                                    setStationsData(stationsData);
                                    setOriginalData(originalData);
                                }
                            })
                        }else if(methodType==='trend'){
                            //趋势
                            dispatch(install.getItemAbnResult_tr(structId, start, end, payload)).then(res=>{
                                if(res.success){
                                    const {data}=res.payload;
                                    const {stationsData,originalData}=handleChartData(data);
                                    setStationsData(stationsData);
                                    setOriginalData(originalData);
                                }
                            })
                        }else if(methodType==='burr'){
                            //毛刺
                            dispatch(install.getItemAbnResult_burr(structId, start, end, payload)).then(res=>{
                                if(res.success){
                                    const {data}=res.payload;
                                    const {stationsData,originalData}=handleChartData(data);
                                    setStationsData(stationsData);
                                    setOriginalData(originalData);
                                }
                            })
                        }else{
                            console.log('方法错误');
                        }
                    
                })
        })
        
    }
    return (<>
        <div style={{ background: '#FFFFFF', margin: '8px 12px', padding: '20px 20px 0px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{ width: 0, height: 20, borderLeft: '3px solid #005ABD', borderTop: '3px solid transparent', borderBottom: '3px solid transparent' }}></div>
                <div style={{ fontFamily: "YouSheBiaoTiHei", fontSize: 24, color: '#101531', marginLeft: 8 }}>数据计算</div>
                <div style={{ marginLeft: 6, fontSize: 12, color: '#969799', fontFamily: "DINExp", }}>DATA CACL</div>
            </div>
            <div style={{ margin: '20px 0 16px 0' }}>
                <Form labelPosition='left' getFormApi={formApi => {
                    form.current = formApi
                }} style={{ textAlign: 'left', position: "relative", width: "100%", flex: 1 }}>
                    <Row>
                        <Col span={12} >
                            <Form.Select onChange={structChange} options={structList} option labelWidth="75px" label="结构物" field="struct" placeholder="请选择结构物" showSearch filter>
                            </Form.Select>
                        </Col>
                        {/* <Col span={12} >
                            <Form.Select label="监测因素" field="factorId" value={reCalcFactorId} onChange={reCalcFactorChange}
                                placeholder="请选择监测因素" style={{ width: 160 }} size="large">
                            </Form.Select>
                        </Col> */}
                        <Col span={12} >
                            <Form.DatePicker
                                labelWidth="75px"
                                field="timeRange"
                                label="查询时间"
                                initValue={[moment().subtract(24, 'hours').format('YYYY-MM-DD HH:mm:ss'), moment().format('YYYY-MM-DD HH:mm:ss')]}
                                type="dateTimeRange" density="compact"
                            />
                        </Col>

                    </Row>
                </Form>
                <div style={{ marginTop: 15 }}>
                    <hr style={{ borderTopWidth: 0, marginBottom: 18 }} />
                    <Form labelPosition='left' style={{ textAlign: 'left', marginTop: 15, position: "relative", width: "100%" }}
                        getFormApi={formApi => { form2.current = formApi }}>
                        <Row gutter={10}>
                            <Col span={6} >
                                <Form.Cascader label="监测因素" field="factor" value={reCalcFactorId} onChange={reCalcFactorChange}
                                    treeData={factosList} filter
                                    placeholder="请选择监测因素" style={{ textAlign: 'left', width: 274 }} >
                                </Form.Cascader>
                            </Col>
                            <Col span={6} >
                                <Form.Select showSearch filter multiple maxTagCount={1} allowClear iSelect label="测点" field="point" value={sensorId} onChange={pointChange}
                                    options={sensorList} placeholder="请选择测点" style={{ textAlign: 'left', width: '90%' }} >
                                </Form.Select>
                            </Col>
                            <Col span={6} >
                                <Form.Select showSearch filter label="异常识别算法" field="method" onChange={changeMethod}
                                    placeholder="请选择异常识别算法" style={{ textAlign: 'left', width: 127 }} >
                                    {abnMethods?.map(item => {
                                        return <Select.Option value={item.name} label={item.des} ></Select.Option>;
                                    })}
                                </Form.Select>
                            </Col>
                            <Col span={3} >
                                {methodType === 'trend' ? <Form.Select showSearch filter label="分析时长" field="time"
                                    rules={[{
                                        required: true, message: "请选择分析时长"
                                    }]}
                                    placeholder="请选择分析时长" style={{ width: 127 }} >
                                    <Select.Option value="1" label='1个月'></Select.Option>
                                    <Select.Option value="2" label='2个月'></Select.Option>
                                    <Select.Option value="3" label='3个月'></Select.Option>
                                </Form.Select> : ''}
                            </Col>
                        </Row>
                        <Row style={{ display: 'flex', alignItems: 'center' }}>
                            {renderParamsConfig()}
                            <Col span={6}>
                                <Button style={{ marginRight: 10, marginLeft: 10 }} type="tertiary" onClick={handleCompare}>数据对比</Button>
                                <Button theme='solid' type='primary' style={{ marginRight: 10, marginLeft: 10 }} onClick={handleSave}>保存配置</Button>
                            </Col>
                        </Row>
                    </Form>
                    <Card
                        title="数据对比"
                    >
                    <div className="data-chart-container">
              {originalData && originalData[0] == '还没查询'
                ? (
                  <div style={{ margin: '20px 0' }}>
                    {' '}
                    输入参数，点击数据对比展示数据对比图
                  </div>
                )
                : originalData && originalData[0] != '还没查询' && originalData.length > 0
                  ? (
                    <TimeValueLineChart
                      key="abnEec"
                      contentType={methodType}
                      data={stationsData}
                      width={300}
                      height={300}
                      itemName={itemName}
                      configs={{ slider: { startTime, endTime } }}
                    />
                  )
                  : (
                    <div style={{ margin: '20px 0' }}>
                      {' '}
                      没有查询到任何有效数据！
                    </div>
                  )}
            </div>
                    </Card>
                    <AbnRecognize limitChange={limitChange} sensorList={sensorList} query={query} changeQuery={pageChange} limits={limits} project={project} sensorId={sensorId} calcMethod={methodType} factorId={factorId} structId={structId} itName={itemName} />
                </div>
            </div>







        </div>


    </>)
}



function mapStateToProps (state) {
    const { auth, global, OrganizationDeps, abnMethods, abnParam } = state;

    return {
        loading: OrganizationDeps.isRequesting,
        user: auth.user,
        actions: global.actions,
        pepProjectId: global.pepProjectId,
        abnMethods: abnMethods?.data || [],
        abnParam: abnParam?.data?.rows || []
    };
}
export default connect(mapStateToProps)(Calc);


