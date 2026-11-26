import React, { useEffect, useState, useRef, useMemo } from 'react'
import { connect } from 'react-redux'
import { Spin, Card, Form, Button, Table, Pagination, Tooltip } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { ExportData } from '$components'
import moment from 'moment'

const Network = props => {
    const { dispatch, actions, user, clientHeight, thingId, deviceListAlarms, devicesCardStatusList, project } = props
    const { analysis } = actions
    const form = useRef() //表单
    const [deployData, setDeployData] = useState([])
    const [deviceData, setDeviceData] = useState([])
    const [deviceMetasDeployed, setDeviceMetasDeployed] = useState([])
    const [sensorId, setSensorId] = useState([])
    const [sensorsDataItems, setSensorsDataItems] = useState({})
    const [tableData, setTableData] = useState([]) //最新一次的数据
    const [lastData, setLastData] = useState([]) //最终数据
    const [lastDataCopy, setLastDataCopy] = useState([]) //最终数据
    const [searchType, setSearchType] = useState('')
    const [searchName, setSearchName] = useState('')
    const [typeList, setTypeList] = useState([])
    const [query, setQuery] = useState({ limit: 10, page: 0 }) //页码信息

    const DeviceTypes = {
        'DTU': 'DTU',
        'gateway': '网关',
        'sensor': '传感器',
        'acqUnit': '采集单元',
        'dau.gateway': '分布式智能云采集网关',
        'dau.node': '分布式智能云采集节点',
        'tcp.dtu': '工作站',
    }

    useEffect(() => {
        setLastData([])
        setLastDataCopy([])
    }, [project])

    useEffect(() => {
        if (thingId) {
            let dataList = []
            dispatch(analysis.getThingsDeploy(thingId)).then(rs => {
                if (rs.success) {
                    setDeployData(rs.payload.data)
                    dataList = rs.payload.data
                    //列表渲染数据
                    let da = []
                    if (dataList.instances) {
                        Object.keys(dataList.instances).forEach(i => {
                            if (dataList.instances[i].type == 's.d') {
                                da.push({
                                    sensorId: i,
                                    sensorName: dataList.instances[i]?.name,
                                    deviceType: dataList?.instances[i]?.instance?.properties?.deviceType,
                                    collectTime: '--',
                                    data: '--',
                                    iotCardStatus: '--',
                                    status: '--',
                                    option: '--',
                                })
                            }
                        })
                    }

                    dispatch(analysis.findDeviceMetaDeployed(thingId)).then(res => {
                        if (res.success) {
                            setDeviceMetasDeployed(res.payload.data)
                            const deviceMetaDeployed = res.payload.data
                            if (deviceMetaDeployed && dataList && deviceMetaDeployed.devices) {
                                const sensorsId = []
                                let alarmSensorId = [] //所有设备的id
                                const sensorsDataItems = {}
                                for (const id in dataList.instances) {
                                    alarmSensorId.push(id)
                                    const instances = dataList.instances[id]

                                    if (instances.type == 's.d' && instances.instance.properties.deviceType == 'sensor') {
                                        const meta = deviceMetaDeployed.devices.find(m => m.id == instances.instance.deviceMetaId)
                                        sensorsDataItems[id] = {
                                            items: {},
                                            deviceName: instances.name,
                                        }
                                        if (meta) {
                                            sensorsDataItems[id].items = meta.capabilities[0].properties.reduce((p, n) => {
                                                if (n.category == 'Output') {
                                                    p[n.name] = { name: n.showName, unit: n.unit }
                                                }
                                                return p
                                            }, {})
                                        }
                                        sensorsId.push(id)
                                    }
                                }
                                dispatch(analysis.getDevicesAlarms({ deviceIds: alarmSensorId }, { limit: 5 }))
                                dispatch(analysis.findDevicesCardStatus({ deviceIds: alarmSensorId }))
                                setSensorsDataItems(sensorsDataItems)
                                setSensorId(sensorsId)
                                setDeviceData(da)
                            }
                        }
                    })
                }
            })
        }
    }, [thingId])
    useEffect(async () => {
        if (sensorId && sensorId.length && sensorsDataItems) {
            const rs = await dispatch(analysis.findSensorLastData(sensorId))
            const tableData = []
            if (rs.success) {
                rs.payload.data.forEach(sd => {
                    if (Object.keys(sensorsDataItems).length) {
                        let sensorDataItem = sensorsDataItems[sd.sensorId]
                        let sensorName = sensorDataItem && sensorDataItem.deviceName ? sensorDataItem.deviceName : ''
                        let msg = sd.data.length
                            ? sd.data[0]
                            : {
                                collectTime: null,
                                sensorName: sensorName,
                                data: { noData: '暂无数据' },
                            }
                        let dataStr = ''
                        let dataKeys = Object.keys(msg.data)
                        dataKeys.forEach(k => {
                            let item = sensorDataItem && sensorDataItem.items ? sensorDataItem.items[k] : null
                            if (item) {
                                dataStr += `${item.name}：${msg.data[k]}（${item.unit}）； `
                            } else if (k == 'noData') {
                                dataStr += msg.data[k]
                            } else {
                                dataStr += `${k}：${msg.data[k]}；`
                            }
                        })
                        let collectTime = msg.collectTime ? moment(msg.collectTime).format('YYYY-MM-DD HH:mm:ss') : '--'
                        tableData.push({
                            sensorId: sd.sensorId,
                            sensorName: sensorName,
                            collectTime: collectTime,
                            data: dataStr,
                            deviceType: 'sensor', //传感器
                            iotCardStatus: '--',
                            status: '--',
                            option: '--',
                        })
                    }
                })
            }
            setTableData(tableData)
        }
    }, [sensorId])
    useEffect(() => {
        if (deviceData && deviceData.length) {
            const dataD = deviceData?.map(p => {
                const objRslt = tableData?.find(q => q.sensorId == p.sensorId)
                return {
                    sensorId: objRslt ? objRslt.sensorId : p.sensorId,
                    sensorName: objRslt ? objRslt.sensorName : p.sensorName,
                    collectTime: objRslt ? objRslt.collectTime : p.collectTime,
                    data: objRslt ? objRslt.data : p.data,
                    deviceType: DeviceTypes[objRslt ? objRslt.deviceType : p.deviceType],
                    iotCardStatus:
                        devicesCardStatusList && devicesCardStatusList.length
                            ? devicesCardStatusList.find(v => v.deviceId == p.sensorId).status === 0
                                ? '正常'
                                : devicesCardStatusList.find(v => v.deviceId == p.sensorId).status === 1
                                    ? '未激活'
                                    : '停机'
                            : '--',
                    status:
                        deviceListAlarms && deviceListAlarms.length
                            ? deviceListAlarms?.find(v => v.deviceId == p.sensorId)
                                ? '异常'
                                : '正常'
                            : '--',
                    option: objRslt ? objRslt.option : p.option,
                }
            })
            const typeList = dataD.reduce((p, c) => {
                let isExist = p.some(q => q.label === c.deviceType)
                if (!isExist) {
                    p.push({ label: c.deviceType, value: c.sensorId })
                }
                return p
            }, [])
            setTypeList(typeList)
            setLastData(dataD)
            setLastDataCopy(dataD)
        }
    }, [deviceData])
    //   const lastDataCopy=useMemo(()=>{
    //       return lastData
    //   },[thingId])
    const scroll = useMemo(() => ({ y: clientHeight - 600 + 175 }), [])
    //名称回调事件
    const inputChange = e => {
        setSearchName(e)
    }
    //选择设备类型下拉框回调
    const selectChange = e => {
        let rslt = typeList.find(f => f.value == e)
        setSearchType(rslt ? rslt.label : undefined)
    }

    //查询事件回调
    const searchHandler = () => {
        setLastData(
            lastDataCopy.filter(f =>
                (searchName === undefined || f.sensorName.includes(searchName)) &&
                (searchType === undefined || f.deviceType === searchType)
            )
        )
    }

    const columns = [
        {
            title: '设备名称',
            dataIndex: 'sensorName',
            width: '20%',
            key: 'sensorName',
            render: (_, r) => {
                return (
                    <>
                        <Tooltip content={r.sensorName}>
                            <div>{r.sensorName.length > 7 ? `${r.sensorName.substr(0, 7)}...` : r.sensorName}</div>
                        </Tooltip>
                    </>
                )
            },
        },
        {
            title: '设备类型',
            dataIndex: 'deviceType',
            width: '15%',
            key: 'deviceType',
        },
        {
            title: '最后采集时间',
            dataIndex: 'collectTime',
            width: '15%',
            key: 'collectTime',
        },
        {
            title: '数据',
            dataIndex: 'data',
            width: '20%',
            key: 'data',
            render: (_, r) => {
                return (
                    <>
                        <Tooltip content={r.data}>
                            <div>{r.data.length > 6 ? `${r.data.substr(0, 6)}...` : r.data}</div>
                        </Tooltip>
                    </>
                )
            },
        },
        {
            title: '物联网卡状态',
            width: '15%',
            dataIndex: 'iotCardStatus',
            key: 'iotCardStatus',
        },
        {
            title: '状态',
            width: '10%',
            dataIndex: 'status',
            key: 'status',
        },
        {
            title: '操作',
            width: '10%',
            dataIndex: 'option',
            key: 'option',
        },
    ]
    return (
        <>
            <div style={{ marginBottom: 12, display: 'flex' }}>
                <div>
                    <Form>
                        <Form.Input
                            // suffix={<SearchOutlined />}
                            field='name'
                            pure
                            allowClear
                            label='名称'
                            style={{ width: 260, marginRight: 12 }}
                            placeholder='请输入设备名称'
                            onChange={inputChange}
                        />
                        <Form.Select
                            options={typeList}
                            field='type'
                            pure
                            allowClear
                            label='设备类型'
                            onChange={selectChange}
                            style={{ width: 260, marginLeft: 12, marginRight: 12 }}
                            placeholder='请选择设备类型'
                        />
                        <Button theme='solid' type='primary' htmlType='submit' onClick={searchHandler}>
                            查询
                        </Button>
                    </Form>
                </div>
                <div style={{ marginLeft: 10 }}>
                    {' '}
                    {lastData.length ? (
                        <ExportData
                            //  showIcon
                            fileName='设备列表'
                            exportType='fileSaver'
                            data={lastData}
                            columns={columns}
                            key='export'
                        />
                    ) : (
                        ''
                    )}
                </div>
            </div>
            <Table
                scroll={scroll}
                columns={columns}
                dataSource={lastData}></Table>
        </>
    )
}

function mapStateToProps (state) {
    const { auth, global, members, webSocket, deviceListAlarms, devicesCardStatus } = state
    return {
        user: auth.user,
        actions: global.actions,
        clientHeight: global.clientHeight,
        deviceListAlarms: deviceListAlarms?.data || [],
        devicesCardStatusList: devicesCardStatus?.data || [],
    }
}

export default connect(mapStateToProps)(Network)
