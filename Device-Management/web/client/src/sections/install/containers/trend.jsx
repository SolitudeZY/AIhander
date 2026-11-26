'use strict'

import React, { Component, useRef, useState } from 'react'
import { connect } from 'react-redux'
import { Row, Col, Button, Table, Card, Popconfirm, Tag, notification, Form, Select, Pagination } from 'antd';
import { PlusOutlined } from '@ant-design/icons'
import TrendModal from '../components/TrendModal'

const Trend = props => {
    const { abnParam, factorId, itName, actions, dispatch, sensorId, project, limits, query, changeQuery, limitChange, sensorList } =
        props
    const form = useRef()
    const [selectedRowKeys, setSelectedRowKeys] = useState([])
    const [filterFunc, setFilterFunc] = useState({})
    const [modalVisible, setModalVisible] = useState(false)
    const [showBatchConfig, setShowBatchConfig] = useState(false)
    const [timeRange, setTimeRange] = useState('')
    const [bvBatch, setBvBatch] = useState('')
    const [winSize, setWinSize] = useState('')
    const [reCoef, setReCoef] = useState('')
    const [deValue, setDeValue] = useState('')
    const [graPoint, setGraPoint] = useState('')
    const [graValue, setGraValue] = useState('')
    const [modalData, setModalData] = useState(null)
    const filterSet = { sensorName: null, factorName: null }
    const { install } = actions
    const onSelectChange = selectedRowKeys => {
        setSelectedRowKeys(selectedRowKeys)
    }
    const compareAndEdit = (e, record) => {
        setModalVisible(true)
        setModalData(record)
    }
    const modalCancel = e => {
        setModalVisible(false)
    }
    const removeItem = e => {
        dispatch(install.deleteAbnParams(e)).then(res => {
            if (res.success) {
                const id = [factorId, -1].join(',')
                changeQuery(10, 0)
                dispatch(install.getAbnParamList({
                    factorId: id, limit: 10, page: 0, type: 3,
                    sensorList: sensorList?.map(i => `${project}:${i.value}`).join(',')
                })).then(rs => {
                    if (rs.success) {
                        limitChange(rs.payload.data.count)
                    }
                })
            }
        })
    }
    const handleInputChange = e => {
        if (e != null) {
            const value = e
            let func = (
                ep => s =>
                    s.sensorName.search(ep) > -1
            )(value)
            filterSet.sensorName = func
            func = (
                ep => s =>
                    s.factorName.search(ep) > -1
            )(value)
            filterSet.factorName = func
        } else {
            filterSet.sensorName = null
            filterSet.factorName = null
        }
        setFilterFunc(filterSet)
    }
    //批量启用or禁用
    const onSwitchChange = e => {
        if (selectedRowKeys.length != 0) {
            let ids = selectedRowKeys.join(',')
            let data = {
                enabled: e,
                use: 'switch',
            }
            //启用和禁用接口
            dispatch(install.batchCfgAbnParams(ids, data)).then(res => {
                if (res.success) {
                    const id = [factorId, -1].join(',')
                    changeQuery(10, 0)
                    dispatch(install.getAbnParamList({
                        factorId: id, limit: 10, page: 0, type: 3,
                        sensorList: sensorList?.map(i => `${project}:${i.value}`).join(',')

                    })).then(rs => {
                        if (rs.success) {
                            limitChange(rs.payload.data.count)
                        }
                    })
                }
            })
        }
    }
    //批量删除
    const batchDelete = () => {
        if (selectedRowKeys.length != 0) {
            let ids = selectedRowKeys.join(',')
            //删除接口
            dispatch(install.deleteAbnParams(ids)).then(res => {
                if (res.success) {
                    const id = [factorId, -1].join(',')
                    changeQuery(10, 0)
                    dispatch(install.getAbnParamList({
                        factorId: id, limit: 10, page: 0, type: 3,
                        sensorList: sensorList?.map(i => `${project}:${i.value}`).join(',')

                    })).then(rs => {
                        if (rs.success) {
                            limitChange(rs.payload.data.count)
                        }
                    })
                }
            })
        } else {
            notification.warning({
                message: '您尚未勾选任何参数配置！',
                duration: 3,
            })
        }
    }
    //批量保存
    const batchSave = () => {
        form.current.validate().then(value => {
            let dataSource = abnParam.filter(a => a.abnType == 3 && a.factorId == factorId)
            if (selectedRowKeys.length != 0) {
                let ids = selectedRowKeys.join(',')
                let data = {
                    paramJson: {
                        thr_der: deValue, //导数阈值
                        win_avg: reCoef, //滑动均值
                        win_med: winSize, //滑动中值
                        thr_burr: bvBatch, //毛刺阈值
                        thr_grad: graValue, //渐变阈值
                        win_grad: graPoint, //渐变点个数
                        days_Last: timeRange, //分析时长
                    },
                    use: 'notSwitch',
                }

                dispatch(install.batchCfgAbnParams(ids, data)).then(res => {
                    if (res.success) {
                        const id = [factorId, -1].join(',')
                        changeQuery(10, 0)
                        dispatch(install.getAbnParamList({
                            factorId: id, limit: 10, page: 0, type: 3,
                            sensorList: sensorList?.map(i => `${project}:${i.value}`).join(',')
                        })).then(rs => {
                            if (rs.success) {
                                limitChange(rs.payload.data.count)
                            }
                        })
                    }
                })
            } else if (dataSource.length != 0) {
                notification.warning({
                    message: '您尚未勾选任何参数配置！',
                    duration: 3,
                })
            }
        })
    }
    const iconClick = () => {
        if (!showBatchConfig) {
            setShowBatchConfig(true)
        } else {
            setShowBatchConfig(false)
        }
    }
    const rangeChange = value => {
        setTimeRange(value)
    }
    const bvValueBatch = value => {
        setBvBatch(value)
    }
    const winSizeBatch = value => {
        setWinSize(value)
    }
    const reCoefBatch = value => {
        setReCoef(value)
    }
    const deValueBatch = value => {
        setDeValue(value)
    }
    const graPointBatch = value => {
        setGraPoint(value)
    }
    const graValueBatch = value => {
        setGraValue(value)
    }
    const checkInterger = (rule, val) => {
        // if(val){
        const strRegex = /^[1-9]*[1-9][0-9]*$/
        if (strRegex.test(val)) {
            return true
        }
        return false
        // }
    }
    const checkPoint = (rule, value) => {
        const pattern = /^[1-9]*[1-9][0-9]*$/
        if (pattern.test(value) && value != 1) {
            return true
        }
        return false
    }
    const checkNumber = (rule, val) => {
        const strRegex = /^-?\d+(\.\d+)?$/
        if (strRegex.test(val)) {
            return true
        }
        return false
    }

    let dataSource = abnParam.filter(a => a.abnType == 3 && a.factorId == factorId)
    const rowSelection = {
        selectedRowKeys: selectedRowKeys,
        onChange: onSelectChange,
    }
    let filterData = dataSource
    let flag = false
    let keyArr = []
    let tmpds = []
    let dataPush = []
    Object.keys(filterFunc).forEach(key => {
        const filter = filterFunc[key]
        filterData = dataSource
        if (filter != null) {
            flag = true
            filterData = filterData.filter(filter)
            if (filterData.length > 0) {
                filterData.map(s => {
                    if (keyArr.indexOf(s.id) == -1) {
                        keyArr.push(s.id)
                        dataPush.push(s)
                    }
                })
            }
        }
    })
    tmpds = flag ? dataPush.sort((a, b) => a.id - b.id) : dataSource.sort((a, b) => a.id - b.id)
    let columns = [
        {
            title: '测点位置',
            dataIndex: 'sensorName',
            key: 'sensorName',
            width: '9%',
        },
        {
            title: '监测项',
            dataIndex: 'factorName',
            key: 'factorName',
            width: '10%',
            render: (text, record) => record.factorName + '/' + itName,
        },
        {
            title: '分析时段',
            dataIndex: 'params',
            key: 'params1',
            width: '9%',
            render: text => text.days_Last + '个月',
        },
        {
            title: '毛刺阈值',
            dataIndex: 'params',
            key: 'params2',
            width: '9%',
            render: text => text.thr_burr,
        },
        {
            title: '窗口数',
            dataIndex: 'params',
            key: 'params3',
            width: '9%',
            render: text => text.win_med,
        },
        {
            title: '回归系数',
            dataIndex: 'params',
            key: 'params4',
            width: '9%',
            render: text => text.win_avg,
        },
        {
            title: '导数阈值',
            dataIndex: 'params',
            key: 'params5',
            width: '9%',
            render: text => text.thr_der,
        },
        {
            title: '渐变点个数',
            dataIndex: 'params',
            key: 'params6',
            width: '9%',
            render: text => text.win_grad,
        },
        {
            title: '渐变阈值',
            dataIndex: 'params',
            key: 'params7',
            width: '9%',
            render: text => text.thr_grad,
        },
        {
            title: '启用状态',
            dataIndex: 'enabled',
            key: 'enabled',
            width: '9%',
            render: (text, record) => (record.enabled ? <Tag color='blue'>已启用</Tag> : <Tag>已禁用</Tag>),
        },
        {
            title: '操作',
            key: 'action',
            width: '9%',
            render: (text, record) => (
                <span>
                    <Button theme='borderless' type='primary' onClick={e => compareAndEdit(e, record)}>
                        编辑
                    </Button>
                    <span className='ant-divider'></span>
                    <Popconfirm
                        title='确认删除该参数配置?'
                        id={record.id}
                        onConfirm={() => {
                            removeItem(record.id)
                        }}>
                        <Button theme='borderless' type='danger'>
                            删除
                        </Button>
                    </Popconfirm>
                </span>
            ),
        },
    ]
    return (
        <Card style={{ marginTop: 15 }}>
            <Form
                style={{ marginBottom: 15 }}
                labelPosition='left'
                getFormApi={formApi => {
                    form.current = formApi
                }}>
                <Row style={{ display: 'flex', alignItems: 'center' }}>
                    <Col span={5}>
                        <Form.Input
                            field='keywords'
                            noLabel={true}
                            style={{ marginBottom: 0, width: '95%' }}
                            placeholder='关键词：测点位置、监测因素'
                            onChange={handleInputChange}></Form.Input>
                    </Col>
                    <Col span={2}>
                        <Form.Switch
                            label='是否启用'
                            field='switch'
                            style={{ marginBottom: 0 }}
                            checked
                            onChange={onSwitchChange}></Form.Switch>
                    </Col>
                    <Col span={2}>
                        <Popconfirm style={{ marginBottom: 0 }} title='确认批量删除选中的参数配置?' onConfirm={batchDelete}>
                            <Button style={{ fontSize: 13 }} theme='solid' type='danger'>
                                批量删除
                            </Button>
                        </Popconfirm>
                    </Col>
                    <Col span={2}>
                        <PlusOutlined style={{ paddingTop: 9 }} onClick={iconClick} />
                    </Col>
                </Row>
                {showBatchConfig ? (
                    <Row style={{ display: 'flex', alignItems: 'center', marginTop: 10 }}>
                        <Col span={3}>
                            <Form.Select
                                showSearch
                                filter
                                noLabel={true}
                                field='timeRange'
                                onChange={rangeChange}
                                placeholder='请选择分析时长'
                                style={{ width: '93%', marginBottom: 0 }}>
                                <Select.Option value='1'>1个月</Select.Option>
                                <Select.Option value='2'>2个月</Select.Option>
                                <Select.Option value='3'>3个月</Select.Option>
                            </Form.Select>
                        </Col>
                        <Col span={3}>
                            <Form.Input
                                style={{ marginBottom: 0, width: '93%' }}
                                field='bv'
                                noLabel={true}
                                placeholder='毛刺阈值：数字'
                                onChange={e => bvValueBatch(e)}
                                rules={[
                                    {
                                        required: true,
                                        message: '请输入正整数',
                                        validator: checkInterger,
                                    },
                                ]}
                                trigger='blur'
                            />
                        </Col>
                        <Col span={3}>
                            <Form.Input
                                style={{ marginBottom: 0, width: '93%' }}
                                field='ws'
                                placeholder='滑动中值：正值'
                                noLabel={true}
                                rules={[
                                    {
                                        required: true,
                                        message: '请输入正整数',
                                        validator: checkInterger,
                                    },
                                ]}
                                onChange={e => winSizeBatch(e)}
                                trigger='blur'
                            />
                        </Col>
                        <Col span={3}>
                            <Form.Input
                                style={{ marginBottom: 0, width: '93%' }}
                                field='rc'
                                placeholder='滑动均值：正值'
                                noLabel={true}
                                rules={[
                                    {
                                        required: true,
                                        message: '请输入正整数',
                                        validator: checkInterger,
                                    },
                                ]}
                                onChange={e => reCoefBatch(e)}
                                trigger='blur'
                            />
                        </Col>
                        <Col span={3}>
                            <Form.Input
                                style={{ marginBottom: 0, width: '93%' }}
                                field='dv'
                                placeholder='导数阈值：数字'
                                noLabel={true}
                                rules={[
                                    {
                                        required: true,
                                        message: '请输入正整数',
                                        validator: checkNumber,
                                    },
                                ]}
                                onChange={e => deValueBatch(e)}
                                trigger='blur'
                            />
                        </Col>
                        <Col span={3}>
                            <Form.Input
                                style={{ marginBottom: 0, width: '93%' }}
                                field='pn'
                                placeholder='渐变点个数：正值'
                                noLabel={true}
                                rules={[
                                    {
                                        required: true,
                                        message: '请输入正整数',
                                        validator: checkPoint,
                                    },
                                ]}
                                onChange={e => graPointBatch(e)}
                                trigger='blur'
                            />
                        </Col>
                        <Col span={3}>
                            <Form.Input
                                style={{ marginBottom: 0, width: '93%' }}
                                field='gv'
                                placeholder='渐变阈值：数字'
                                noLabel={true}
                                rules={[
                                    {
                                        required: true,
                                        message: '请输入正整数',
                                        validator: checkNumber,
                                    },
                                ]}
                                onChange={e => graValueBatch(e)}
                                trigger='blur'
                            />
                        </Col>
                        <Col span={2}>
                            <Button onClick={batchSave} theme='solid' type='primary'>
                                批量保存
                            </Button>
                        </Col>
                    </Row>
                ) : (
                    ''
                )}
            </Form>
            <Table rowSelection={rowSelection} columns={columns} dataSource={tmpds} pagination={false} />
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    padding: '20px 20px',
                }}>
                <span style={{ lineHeight: '30px', fontSize: 13, color: 'rgba(0,90,189,0.8)' }}>共{limits}条信息</span>
                <Pagination
                    total={limits}
                    showSizeChanger
                    current={query.page + 1}
                    pageSizeOpts={[10, 20, 30, 40]}
                    onChange={(currentPage, pageSize) => {
                        changeQuery(pageSize, currentPage - 1)
                        // page.current = currentPage - 1
                    }}
                />
            </div>
            {modalVisible ? (
                <TrendModal
                    // structId={structId}
                    open={true}
                    project={project}
                    closeModal={modalCancel}
                    modalData={modalData}
                    sensorId={sensorId}
                    factorId={factorId}
                />
            ) : (
                ''
            )}
        </Card>
    )
}

function mapStateToProps (state) {
    const { abnParam, global } = state
    // let isRequesting = abnParamState?.isRequesting;

    return {
        isRequesting: false, //请求状态
        abnParam: abnParam?.data?.rows || [],
        actions: global.actions,
    }
}
export default connect(mapStateToProps)(Trend)
