import React, { useEffect, useState, useRef, useMemo } from 'react';
import { connect } from 'react-redux';
import CardTitle from './cardTitle';
import { Select, Dropdown, Table, Input, Tooltip, Popover, Space } from 'antd';
import { QuestionCircleOutlined, LineChartOutlined } from '@ant-design/icons';
import Battery from './battery';
import MapModal from './mapModal';
import './detailStyle.less'
import DetailFullModal from './detailFullModal';
import ReactECharts from 'echarts-for-react';
import moment from 'moment';
import { powerColor } from '../containers/energyManagement';
import { ExportData } from '$components'

const Detail = (props) => {
    const { data, recentData } = props
    const [fullScreenVis, setFullScreenVis] = useState(false);
    const [mapModalVis, setMapModalVis] = useState(false)
    const [longitudeAndLatitude, setLongitudeAndLatitude] = useState([])//经纬度
    const [power, setPower] = useState('')//电量
    const [record, setRecord] = useState({})
    const [optList, setOptList] = useState([]);
    const [allOpt,setAllOpt]=useState([]);
    const [structId, setStructId] = useState(undefined)
    const [recordData, setRecordData] = useState([]);
    const [exportData,setExportData]=useState([]);
    const [inputVal, setInputVal] = useState(undefined)
    const [projectOpt,setProjectOpt]=useState([]);
    const [projectId,setProjectId]=useState(undefined);
    const loadMapHandler = (record) => {
        setLongitudeAndLatitude([record.longitude, record.latitude])
        setPower(record.Data)
        setMapModalVis(true)

        setRecord(record)
    }
    const onCancel = () => {
        setMapModalVis(false)
    }
    const onCancelFullScreen = () => {
        setFullScreenVis(false)
    }
    const baseClassName = 'suggestion';
    const columns = [
        {
            title: '点位',
            dataIndex: 'structureName',
            key: 'structureName',
            // width: 30,
            ellipsis: true
        },
        {
            title: '设备',
            dataIndex: 'deviceName',
            // width: 30,
            key: 'deviceName',
            ellipsis: true
        },
        {
            title: '剩余电量',
            key: 'power',
            render: (_, record) => {
                let power = record.data +''
                if (power?.indexOf('-') > -1) {
                    power = 0
                }
                return <Battery width={18} height={12} power={power + '%'} />
            }
        },
        {
            title: '预计耗尽时长',
            key: 'restTime',
            ellipsis: true,
            render: (_, record) => {
                const power = record.data 
                let info = ''
                // if (power <= 0 || power > 70) {
                //     info = '/'
                // } else if (power > 0 && power <= 17) {
                //     info = '小于20小时'
                // } else if (power > 17 && power <= 25) {
                //     info = '小于90小时'
                // } else if (power > 25 && power <= 28) {
                //     info = '小于92小时'
                // } else if (power > 28 && power <= 70) {
                //     info = '小于35天'
                // }
                if (power <= 0) {
                    info = '/'
                } else {
                    let remainDays = Math.round(power * 0.45)
                    let x = []
                    let y = []
                    for (let i = 0; i < remainDays + 3; i++) {
                        x.push(moment().add(i, 'days').format('MM-DD'))
                        // let cy = parseFloat((power - i * (100 / 45)).toFixed(1))
                        let cy = Math.round(power - i * (100 / 45))
                        if (cy < 0) {
                            cy = 0
                            y.push(cy)
                            break
                        }
                        y.push(cy)
                    }
                    info = <Space>
                        <span>
                            {remainDays} 天
                        </span>
                        <Popover
                            showArrow
                            getPopupContainer={() => document.getElementById('DmsApp')}
                            content={
                                <ReactECharts
                                    style={{ height: 240, margin: 4 }}
                                    notMerge={true}
                                    lazyUpdate={true}
                                    option={{
                                        tooltip: {
                                            trigger: 'axis'
                                        },
                                        legend: {
                                            right: 0,
                                            itemHeight: 2,//修改图例高度
                                            itemStyle: {
                                                lineHeight: 2
                                            },
                                            data: [
                                                {
                                                    name: '电量',
                                                },
                                            ],
                                        },
                                        grid: {
                                            left: '3%',
                                            right: '6%',
                                            bottom: '3%',
                                            containLabel: true
                                        },
                                        xAxis: {
                                            type: 'category',
                                            boundaryGap: false,
                                            data: x,
                                        },
                                        yAxis: {
                                            type: 'value',
                                            nameTextStyle: {
                                                padding: [0, 0, 20, 0] // 上右下左与原位置距离
                                            },
                                        },
                                        series: [
                                            {
                                                name: '电量',
                                                type: 'line',
                                                // stack: 'Total',
                                                symbol: 'circle',
                                                data: y
                                            },
                                        ]
                                    }}
                                />
                            }
                            position={'top'}
                        >
                            <LineChartOutlined style={{ cursor: 'pointer' }} />
                        </Popover>
                    </Space>
                }
                return info
            }
        },
        {
            title: '异常信息',
            key: 'warnInfo',
            with: '30px',
            ellipsis: true,
            render: (_, record) => {
                //是否持续下降
                let flag = true
                let days = 0
                const recentData1 = recentData?.filter(item => item.DeviceId == record.deviceId)
                const latestPower = record.Data 
                if (recentData1 && recentData1.length) {
                    for (let i = 0; i < recentData1.length; i++) {
                        if (recentData1.length > i + 1) {
                            const power = recentData1[i].Data
                            const power1 = recentData1[i + 1].Data
                            if (power < power1) {
                                flag = false
                                break
                            }
                        } else {
                            flag = false
                        }
                        if (latestPower == 0) {
                            days += 1
                            if (recentData1[length - i - 1]?.Data === 0) {
                                days += 1
                            }
                        }
                    }
                }
                let message = (latestPower > 0 && latestPower <= 30 && flag) ? '电量小于30%且连续下降'
                    : flag ? '持续下降' : (latestPower > 0 && latestPower <= 30) ? '电量低' : days ? `持续掉电${days}天` : 
                    latestPower<0 ? '持续下降':  '/'
                return <span title={message}>{message}</span>
            }
        },
        {
            title: '检修建议',
            dataIndex: 'advice',
            key: 'advice',
            ellipsis: true,
            render: (_, record) => {
                const power =record.data 
                return <div
                    // className={`${baseClassName}`}
                    // style={{ color: powerColor(power), backgroundColor: powerColor(power) + '14' }}
                    className={`${baseClassName} ${power <= 33 ? 'red' : power > 33 && power <= 66 ? 'oranged' : 'greend'}`}
                >
                    {power <= 33 ? '立即' : (power > 33 && power <= 66) ? '计划' : '无需'}检修
                </div>
            }
        },
        {
            title: '定位',
            dataIndex: 'position',
            key: 'position',
            ellipsis: true,
            render: (_, record) => <div style={{ display: 'flex', color: '#216FC5', cursor: 'pointer' }}>
                <div>
                    <img src='/assets/images/data/position.png' style={{ width: 20, height: 20 }}></img>
                </div>
                <div onClick={() => loadMapHandler(record)}>查看</div>
            </div>
        },
        {
            title: '关联AI检修计划',
            dataIndex: 'plan',
            key: 'plan',
            ellipsis: true,
            render: (_, record) => <div style={{ display: 'flex', justifyContent: 'space-between', color: 'gray' }}>
                <div>查看</div>
                <div>派发工单</div>
            </div>

        },
    ]

    useEffect(() => {
        var mapContainer = document.getElementById('detail-content');
        if (mapContainer) {
            mapContainer.addEventListener('mousewheel', function (event) {
                event.stopPropagation();
            });
        }

    }, [])
    const structChangeHandler = (id) => {
        setInputVal(undefined);
        setStructId(id);
    }
    const projectChangeHandler =(id)=>{
        let opt=allOpt;
        let structOpts=opt?.filter(item=>item.projectId==id);
        setProjectId(id);
        setStructId(undefined);
        setInputVal(undefined);
        setOptList(structOpts);
    }
    useEffect(()=>{
        if(projectId){
            const dataList = data?.filter(item => item.projectId == projectId);
            const exportd=handleExportData(dataList);
            setExportData(exportd)
            setRecordData(dataList)
        }
    },[projectId])
    useEffect(() => {
        if (structId) {
            const dataList = data?.filter(item => item.structureId == structId);
            const exportd=handleExportData(dataList);
            setExportData(exportd)
            setRecordData(dataList)
        }
    }, [structId])
    const searchHandler = () => {
        const filters = [];
        if (inputVal) {
            filters.push((item) => item.deviceName.indexOf(inputVal) > -1);
        }
        if (structId) {
            filters.push((item) => item.structureId == structId);
        }
        if (projectId) {
            filters.push((item) => item.projectId == projectId);
        }
        const dataList = data?.filter((item) => filters.every((filter) => filter(item))) || [];
        const exportd = handleExportData(dataList);
        setExportData(exportd);
        setRecordData(dataList);
    };
    // useEffect(()=>{
    //     if(inputVal){
    //         const dataList= data?.filter(item=>item.structureName.indexOf(inputVal)>-1&&item.structureId==structId)
    //         setRecordData(dataList)
    //     }else{
    //         const dataList= data?.filter(item=>item.structureId==structId)
    //         setRecordData(dataList)
    //     }
    // },[inputVal])
    const handleExportData=(data) => {
        let newData=[];
        for(let i=0;i<data.length;i++){
            const power = data[i]?.Data 
            let info = ''
            if (power <= 0) {
                info = '/'
            }
            let flag = true
            let days = 0
            const recentData1 = recentData?.filter(item => item.DeviceId == data[i].deviceId)
            const latestPower = data[i]?.Data
            if (recentData1 && recentData1.length) {
                for (let i = 0; i < recentData1.length; i++) {
                    if (recentData1.length > i + 1) {
                        const power = recentData1[i].Data
                        const power1 = recentData1[i + 1].Data
                        if (power < power1) {
                            flag = false
                            break
                        }
                    } else {
                        flag = false
                    }
                    if (latestPower == 0) {
                        days += 1
                        if (recentData1[length - i - 1]?.Data === 0) {
                            days += 1
                        }
                    }
                }
            }
            let message = (latestPower > 0 && latestPower <= 30 && flag) ? '电量小于30%且连续下降'
                : flag ? '持续下降' : (latestPower > 0 && latestPower <= 30) ? '电量低' : days ? `持续掉电${days}天`: 
                 latestPower<0 ? '持续下降':'/'
            newData.push({
                ...data[i],
                structureName:data[i].structureName,
                structureId:data[i].structureId,
                deviceName:data[i].deviceName,
                deviceId:data[i].deviceId,
                data:(data[i].Data<0?0:data[i].Data) +'',
                info:info,
                warnInfo:message,
                advice: (power <= 33 ? '立即' : (power > 33 && power <= 66) ? '计划' : '无需')+'检修'
            })
        }
        // console.log(newData)
        return newData;
    }
    const projectOptClear=()=>{
        let dataList = [];
        if (projectId) {
            dataList = data?.filter(item => item.projectId == projectId)
        } else {
            dataList = data
        }
        const exportd=handleExportData(dataList);
        setExportData(exportd)
        setRecordData(dataList)
    }
    const clearOpt = () => {
        const filters = [];
        if (inputVal) {
            filters.push((item) => item.deviceName.indexOf(inputVal) > -1);
        }
        if (projectId) {
            filters.push((item) => item.projectId == projectId);
        }
        const dataList = data?.filter((item) => filters.every((filter) => filter(item))) || [];
        const exportd=handleExportData(dataList);
        setExportData(exportd)
        setRecordData(dataList)
    }
    useEffect(() => {
        if (data && data.length) {
            let optList = [];
            let projectOpt=[];
            for (let i = 0; i < data.length; i++) {
                if (!optList.find(item => item.value == data[i].structureId)) {
                    optList.push({
                        value: data[i].structureId,
                        label: data[i].structureName,
                        projectId: data[i].projectId

                    })
                }
            }
            for (let i = 0; i < data.length; i++) {
                if (!projectOpt.find(item => item.value == data[i].projectId)) {
                    projectOpt.push({
                        value: data[i].projectId,
                        label: data[i].projectName,
                    })
                }
            }
            setOptList(optList);
            setAllOpt(optList)
            setProjectOpt(projectOpt);
            setRecordData(data);
            const exportd=handleExportData(data);
            setExportData(exportd)
        }
    }, [data])
    const scroll = useMemo(() => ({ y: 320, }), []);
    const exportColumns =  [
        {
            title: '点位',
            dataIndex: 'structureName',
            key: 'structureName',
            // width: 30,
            ellipsis: true
        },
        {
            title: '设备',
            dataIndex: 'deviceName',
            // width: 30,
            key: 'deviceName',
            ellipsis: true
        },
        {
            title: '剩余电量',
            key: 'data',
            dataIndex: 'data',
        },
        {
            title: '预计耗尽时长',
            key: 'info',
            dataIndex: 'info',
           
        },
        {
            title: '异常信息',
            key: 'warnInfo',
            with: '30px',
            dataIndex: 'warnInfo',
           
        },
        {
            title: '检修建议',
            dataIndex: 'advice',
            key: 'advice',
           
        },
       
      
    ]
    const inputChange=(e)=>{
        // console.log(e)
        setInputVal(e)
    }
    return (
        <div style={{ width: '100%', height: '100%', background: '#fff' }} id='fullScreen'>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <CardTitle englishName='DETAIL OF POINTS' chineseName='点位详情' isWithHelp={false}>
                </CardTitle>

                <div style={{ display: 'flex', margin: '10px 10px 0 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} >
                        <div style={{ marginRight: 10 }}> <Tooltip content='列表展示所有点位、设备上报最新电量数据，根据电量数据分析展示预计耗尽时长、异常信息和检修建议'><QuestionCircleOutlined /></Tooltip></div>
                        {<img style={{ width: 16, height: 16, }} onClick={() => { setFullScreenVis(true) }} src='/assets/images/data/fullScreen.png' />}
                        <a className='full-screen' onClick={() => { setFullScreenVis(true) }}>{'全屏'}</a>
                    <ExportData
                        style={{ marginRight: 12 }}
                        fileName='设备列表'
                        exportType='fileSaver'
                        columns={exportColumns}
                        data={exportData}
                        key='export'
                        />
                        <Select allowClear onClear={projectOptClear} style={{ width: 200,marginRight:10 }} placeholder='请选择项目' filter
                            value={projectId} options={projectOpt} onChange={projectChangeHandler}></Select>
                        <Select allowClear onClear={clearOpt} style={{ width: 200 }} placeholder='请选择点位' filter
                            value={structId} options={optList} onChange={structChangeHandler}></Select>
                        <Input placeholder='请输入设备名称' style={{ width: 200, marginLeft: 10 }} value={inputVal} onChange={inputChange}></Input>
                        <Button theme="solid" type='primary' onClick={searchHandler} style={{ marginLeft: 10 }}>查询</Button>
                    </div>
                </div>
            </div>

            <div className='detail-content' id='detail-content'>
                <Table columns={columns}
                    dataSource={exportData}
                    scroll={scroll}
                ></Table>
            </div>
            {mapModalVis && <MapModal
                record={record}
                power={power}
                onCancel={onCancel}
                mapModalVis={mapModalVis} l
                ongitudeAndLatitude={longitudeAndLatitude} />}
            <DetailFullModal 
            optList={optList} 
            data={recordData} 
            columns={columns} 
            onCancelFullScreen={onCancelFullScreen} 
            fullScreenVis={fullScreenVis}
            structChangeHandler={structChangeHandler}
            projectChangeHandler={projectChangeHandler}
            searchHandler={searchHandler}
            projectOpt={projectOpt}
            projectOptClear={projectOptClear}
            clearOpt={clearOpt}
            structId={structId}
            projectId={projectId}
            inputVal={inputVal}
            inputChange={inputChange}
            ></DetailFullModal>

        </div>
    )
}

function mapStateToProps (state) {
    const { } = state;
    return {

    };
}

export default connect(mapStateToProps)(Detail);
