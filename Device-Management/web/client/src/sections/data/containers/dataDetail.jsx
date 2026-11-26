import React, { useEffect, useState, useRef } from 'react';
import { connect } from 'react-redux';
import moment from 'moment';
import { exportWord } from 'mhtml-to-word'
import { saveAs } from 'file-saver';
import { SkeletonScreen, } from "$components";
import DataTableComponent from './dataTableComponent';
import DataComponent from './dataComponent.jsx';
import { SearchOutlined, LineChartOutlined, StarOutlined, UserOutlined, BookOutlined } from '@ant-design/icons';
import { Alert, notification, Divider, Form, Button, Table, Pagination, Row, Col, Menu, Tabs, Spin } from 'antd';
import '../style.less'

const DataDetail = (props) => {
    const { dispatch, actions, user, dataContinuityType, dataContinuity, pepProjectId, isRequesting } = props
    const { data } = actions
    // const [queryPage, setQueryPage] = useState({ limit: 10, page: 0 }); //页码信息
    const [limits, setLimits] = useState(0)//每页实际条数
    // const [tab,setTab]=useState(1)//tab
    const [loading, setLoading] = useState(true);
    const [params, setParams] = useState({})
    const [checkVis, setCheckVis] = useState(false)
    const [checkData, setCheckData] = useState({})
    const [structList, setStructList] = useState([])//结构物筛选列表
    const [structId, setStructId] = useState(null)//结构物id（根据结构物下拉框赋值）
    const [factosList, setFactorsList] = useState([])//监测因素列表
    const [factorId, setFactorId] = useState(null)
    const [sensorList, setSensorList] = useState([])//设备列表
    const [sensorId, setSensorId] = useState([])//设备数组id
    const [project, setProject] = useState(null)//project(eg:{projcet:'nbjj'})
    const [vibrationFftsData, setVibrationFftsData] = useState([])
    const [vibrationRawsData, setVibrationRawsData] = useState([])
    const [factorType, setFactorType] = useState()//用于区分振动类数据
    const [wholeData, setWholeData] = useState([])//用于存储所有数据(监测因素)
    const [picBase64Url, setPicBase64Url] = useState('')//用于存储数据详情的图表
    const [dateRange, setDateRange] = useState([moment().subtract(24, 'hours').format('YYYY-MM-DD HH:mm:ss'), moment().format('YYYY-MM-DD HH:mm:ss')])
    const form = useRef()
    const [queryParams, setQueryParams] = useState({ limit: 10, page: 0 }); //页码信息
    const diffDays = (date1, date2) => {
        const days = moment(date1).diff(moment(date2), 'days')
        // debugger
        switch (true) {
            case days <= 1:
                return '%H:%M:%S'
            case days > 1 && days <= 30:
                return '%d %H:%M'
            case days > 30 && days <= 300:
                return '%m-%d'
            case days > 300:
                return '%Y-%m-%d'
            default:
                break
        }

    }
    const imgParams = {
        title_font_size: 5,
        x_tick_rotation: 'auto',
        x_tick_date_Formatter: diffDays(dateRange[1], dateRange[0]),
        legend_fontsize: 5,
        x_tick_fontsize: 5,
        y_tick_rotation: 0,
        y_tick_fontsize: 5,
        grid_visible: 'True',
        grid_axis: 'both',
        grid_color: 'lightgray',
        grif_linestyle: '',
        subplots_adjust_bottom: 0.14,
        // height:864,
        // width:1536,
        height: 1080,
        width: 1920,
        ylabel_fontsize: 5,
        linewidth: 1
    }

    const dataQuery = (query) => {
        //表格详细数据
        setQueryParams({ limit: 10, page: 0 })
        dispatch(data.getMonitorData({ ...query, limit: 10, page: 0 })).then(res => {
            if (res.success) {
                setVibrationFftsData([])
                setVibrationRawsData([])
                if (factorType === 'vib') {
                    if (res.payload.data?.sensors && res.payload.data?.sensors.length) {
                        getVibData(res.payload.data?.sensors[0]?.data[0].time, sensorId)
                    }
                }
                setCheckData(res.payload.data)
            }
        })
        //服务端渲染图片
        dispatch(data.getMonitorDataServer({ ...query, ...imgParams })).then(res => {
            // debugger
            if (res.success) {
                setPicBase64Url(res.payload.data?.data)
            }
        })
    }
    //获取振动类数据函数
    const getVibData = (time, point) => {
        dispatch(data.getVibRaws({ collectTimesWithStationId: [{ stationId: project + ':' + point, collectTime: time }] })).then(res => {
            if (res.success) {
                setVibrationRawsData(res.payload.data)
            }
        })
        dispatch(data.getVibFfts({ collectTimesWithStationId: [{ stationId: project + ':' + point, collectTime: time }] })).then(res => {
            if (res.success) {
                setVibrationFftsData(res.payload.data)
            }
        })
    }
    //初始化
    // useEffect(() => {
    //    // if(factorId&&project){
    //    let query = {
    //       factorId: factorId ? factorId : -1,
    //       sensorId: factorType === 'vib' ? [project + '-' + sensorId] :
    //          (sensorId && sensorId.length ? sensorId.map(item => `${project}-${item}`).join(',') : '-11'),
    //       startTime: moment(dateRange[0]).format('YYYY-MM-DD HH:mm:ss'),
    //       endTime: moment(dateRange[1]).format('YYYY-MM-DD HH:mm:ss'),

    //    }
    //    // queryData(query)
    //    // }

    //    if(query.sensorId!=='-11'){
    //       dataQuery(query)
    //    }
    //    // dispatch(sectionData.getContinuityType())
    //    // form.current.setValue('createTimes',[moment().subtract(24, 'hours').format('YYYY-MM-DD HH:mm:ss'), moment().format('YYYY-MM-DD HH:mm:ss')])

    // }, [sensorId])
    //监听变化
    useEffect(() => {
        setStructList([])
        form.current.reset()
        getData()
    }, [pepProjectId])
    //监听结构物变化，查询监测因素
    useEffect(() => {
        setLoading(true);
        let queryParams = { structId }
        if (structId) {
            dispatch(data.getFactors({ ...queryParams })).then(res => {
                if (res.success) {
                    const list = res.payload.data?.map(item => {
                        return {
                            value: item.SafetyFactorTypeId,
                            label: item.SafetyFactorTypeName,
                        }
                    })
                    setWholeData(res.payload.data)
                    form.current.setValue('factor', list[0]?.value)
                    setFactorsList(list)
                    const factorType = res.payload.data?.find(item => item.SafetyFactorTypeId == list[0]?.value)?.FactorType
                    setFactorType(factorType)
                    setFactorId(list[0]?.value)
                    setLoading(false)
                }
            })
        }

    }, [structId])
    // useEffect(() => {
    //    if (factorType === 'vib') {
    //       if (checkData?.sensors && checkData?.sensors.length) {
    //          getVibData(checkData?.sensors[0]?.data[0].time, value)

    //       }
    //    }
    // }, [factorType])
    useEffect(() => {
        let queryParams = { structId, SafetyFactorTypeId: factorId }
        if (factorId) {
            dispatch(data.getSensors({ ...queryParams })).then(res => {
                if (res.success) {
                    setProject(res.payload.data[0].Project)
                    const list = res.payload.data?.map(item => {
                        return {
                            value: item.SensorId,
                            label: item.SensorLocationDescription,
                        }
                    })
                    // debugger
                    if (factorType === 'vib') {
                        form.current.setValue('point', list[0]?.value)
                        setSensorId(list[0]?.value)
                    } else {
                        form.current.setValue('point', [list[0]?.value])
                        setSensorId([list[0]?.value])
                    }
                    setSensorList(list)
                    setLoading(false)
                }
            })
        }
    }, [factorId])
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

    const downloadWord = (html = '', name = '数据监测 ' + moment().format('YYYY-MM-DD HH:mm:ss')) => {
        exportWord({
            mhtml: html,
            filename: name,
        })
        // let blob = new Blob([html], { type: "application/msword;charset=utf-8" });
        // saveAs(blob, name + '.doc');
    }
    //结构物筛选变化回调函数
    const structChange = (value) => {
        setStructId(value)
        form.current.setValue('point', '')
        form.current.setValue('factor', '')

        // setStructName(structList.find(item=>item.value===value)?.label)
    }
    //结构物筛选发生变化回调函数
    const factorChange = (value) => {
        const factorType = wholeData?.find(item => item.SafetyFactorTypeId == value)?.FactorType
        setFactorType(factorType)
        form.current.setValue('point', '')
        setFactorId(value)
    }
    // useEffect(()=>{

    // },[factorType,checkData])
    //点位筛选发生改变的回调函数
    const pointChange = (value) => {
        // debugger
        setSensorId(value)
        // setVibrationFftsData([])
        // setVibrationRawsData([])

        // setProject(structList.find(item=>item.value===structId)?.project)
    }
    //查询按钮回调函数
    const queryData = (query) => {
        dataQuery(query)
    }
    //日期变化函数
    const dateChange = (e) => {
        setDateRange(e)
    }
    const searchHandler = (values) => {
        form.current.validate().then(rs => {
            // debugger
            let query = {
                factorId,
                sensorId: sensorId && sensorId.length ? sensorId.map(item => `${project}-${item}`).join(',') : `${project}-${sensorId}` || '-11',
                startTime: moment(rs.createTimes[0]).format('YYYY-MM-DD HH:mm:ss'),
                endTime: moment(rs.createTimes[1]).format('YYYY-MM-DD HH:mm:ss')
            }
            if (query.sensorId !== '-11') {
                dataQuery(query)
            }
        })
    }

    return (
        <>
            <Spin spinning={isRequesting}>
                <div style={{ background: '#FFFFFF', margin: '8px 12px', padding: '20px 20px 0px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                            <div style={{ width: 0, height: 20, borderLeft: '3px solid #005ABD', borderTop: '3px solid transparent', borderBottom: '3px solid transparent' }}></div>
                            <div style={{ fontFamily: "YouSheBiaoTiHei", fontSize: 24, color: '#101531', marginLeft: 8 }}>数据详情</div>
                            <div style={{ marginLeft: 6, fontSize: 12, color: '#969799', fontFamily: "DINExp", }}>DATA DETAIL</div>
                        </div>
                    </div>

                    <Form
                        getFormApi={formApi => {
                            form.current = formApi
                        }}
                        labelPosition='left'
                        layout="horizontal"
                        style={{ position: "relative", width: "100%", flex: 1 }}
                    // onSubmit={formSubmit}
                    >
                        <Row>
                            <Col span={12} >
                                <Form.Select
                                    value={structId}
                                    filter
                                    labelWidth="75px"
                                    label="结构物"
                                    field="struct"
                                    placeholder="结构物"
                                    options={structList}
                                    style={{ width: 260 }}
                                    allowClear
                                    onChange={structChange}
                                ></Form.Select>
                            </Col>
                            <Col span={12}  >
                                <Form.Select
                                    filter
                                    label="监测因素"
                                    field="factor"
                                    placeholder="监测因素"
                                    style={{ width: 260, marginLeft: 12, marginRight: 12 }}
                                    allowClear
                                    options={factosList}
                                    onChange={factorChange}
                                ></Form.Select>
                                <Form.Select
                                    filter
                                    label="点位"
                                    field="point"
                                    placeholder="点位"
                                    multiple={factorType !== 'vib'}
                                    maxTagCount={2}
                                    options={sensorList}
                                    style={{ width: 280, marginLeft: 12, marginRight: 12 }}
                                    allowClear
                                    onChange={pointChange}
                                ></Form.Select>
                            </Col>
                        </Row>
                        <br />
                        <br />

                        <Row>
                            <Col span={12}>
                                <Form.DatePicker
                                    //  labelWidth="75px"
                                    field="createTimes"
                                    label="查询时间"
                                    initValue={[moment().subtract(24, 'hours').format('YYYY-MM-DD HH:mm:ss'), moment().format('YYYY-MM-DD HH:mm:ss')]}
                                    // style={{ width: 268 }}
                                    type="dateTimeRange" density="compact" onChange={dateChange}
                                />
                                <Col span={6}>
                                    <Button theme='solid' type="primary" htmlType="submit" onClick={searchHandler}>
                                        查询
                                    </Button>
                                </Col>
                            </Col>
                        </Row>
                    </Form>
                    <br />
                    <br />
                    <Row>
                        <Col>
                            <Tabs type="button"  >
                                <Tabs tab={<span><LineChartOutlined />趋势图</span>} itemKey="1" >
                                    <Divider></Divider>
                                    <DataComponent dataList={checkData}
                                        vibrationFftsData={vibrationFftsData}
                                        vibrationRawsData={vibrationRawsData}
                                        picBase64Url={picBase64Url}
                                    />
                                </Tabs>
                                <Tabs tab={<span><BookOutlined />数据</span>} itemKey="2">
                                    <Divider></Divider>
                                    <DataTableComponent sensorId={sensorId && sensorId.length ? sensorId.map(item => `${project}-${item}`).join(',') : `${project}-${sensorId}` || '-11'}
                                        factorId={factorId ? factorId : -1}
                                        vibrationFftsData={vibrationFftsData}
                                        vibrationRawsData={vibrationRawsData}
                                        factorType={factorType}
                                        startTime={moment(dateRange[0]).format('YYYY-MM-DD HH:mm:ss')}
                                        endTime={moment(dateRange[1]).format('YYYY-MM-DD HH:mm:ss')}
                                        dataList={checkData}
                                        project={project}
                                        queryParams={queryParams}
                                        setQueryParams={setQueryParams}
                                    />
                                </Tabs>
                            </Tabs>
                        </Col>
                    </Row>
                </div>
            </Spin>
        </>
    )
}

function mapStateToProps (state) {
    const { auth, global, dataContinuityType, dataContinuity, pepProjectId, SensorsData } = state;
    return {
        user: auth.user,
        actions: global.actions,
        isRequesting: SensorsData?.isRequesting,
        dataContinuityType: dataContinuityType.data || [],
        dataContinuity: dataContinuity.data || [],
        pepProjectId: global.pepProjectId
    };
}

export default connect(mapStateToProps)(DataDetail);
