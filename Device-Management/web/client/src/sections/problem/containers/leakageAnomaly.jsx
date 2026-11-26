import React, { useEffect, useState, useRef } from 'react'
import { connect } from 'react-redux'
import { CardHeader, SkeletonScreen } from "$components";
import { Button, Form, Table, Skeleton, Pagination, Space, Tag } from 'antd';
import moment from "moment";
import '../style.less'

export const leakageStatusMap = {
    unconfirmed: {
        n: '未确认',
        v: 0,
        c: 'orange',
    },
    awaitingRepair: {
        n: '待维修',
        v: 1,
        c: 'red',
    },
    repaired: {
        n: '已维修',
        v: 3,
        c: 'green',
    },
    misinfor: {
        n: '误报',
        v: 2,
        c: 'white',
    }
}

const leakageAlarmMap = {
    0: {
        state: '正常',
        color: '',
        text: '/'
    },
    1: {
        state: '橙色',
        color: 'orange',
        text: <span style={{ color: 'orange' }}>橙色</span>
    },
    2: {
        state: '红色',
        color: 'red',
        text: <span style={{ color: 'red' }}>红色</span>
    },
    3: {
        state: '负压',
        color: '',
        text: <span style={{}}>负压</span>
    },
}

const LeakageAnomaly = (props) => {
    const { dispatch, actions: { problem }, leakageList, leakageGroup } = props
    const [query, setQuery] = useState({ page: 1, limit: 10 })
    const [leakageCount, setLeakageCount] = useState(0)
    const form = useRef();

    const queryList = (query_) => {
        // dispatch(problem.getLeakageList({ ...(query_ || query) }))
        dispatch(problem.getLeakageGroup({ ...(query_ || query) }))
    }

    const upLeakageStatus = ({ id, status } = {}) => {
        dispatch(problem.upLeakageStatus({ id, status })).then(res => {
            // if (query.state && query.page > 1 && leakageList.list.length == 1) {
            //    setQuery({ ...query, page: query.page - 1 })
            // } else {
            //    queryList()
            // }
            queryList()
        })
    }

    useEffect(() => {
        queryList()
    }, [])

    useEffect(() => {
        queryList(query)
    }, [query])

    useEffect(() => {
        setLeakageCount(leakageGroup?.count ?? 0)
    }, [leakageGroup])

    const textToFixed = (text) => {
        if (text) {
            return parseFloat(text).toFixed(2)
        } else {
            return ''
        }
    }

    return (
        <div style={{ backgroundColor: '#FFFFFF', margin: "8px 12px 12px", padding: "20px 20px 12px" }}>
            <CardHeader title="液位异常" en="Leakage Anomaly" />
            <Form
                onSubmit={(values) => {
                    setQuery({ ...query, ...{ state: '', keyword: '' }, ...values, page: 1, })
                }}
                getFormApi={(formApi) => (form.current = formApi)}
                layout="horizontal"
                allowEmpty={false}
                style={{ position: "relative", width: "100%", display: 'flex' }}
            >
                <div style={{ flex: 1, display: 'flex' }}>
                    <Form.Input
                        label={'结构物/设备'}
                        labelPosition="left"
                        field={'keyword'}
                        placeholder="关键字搜索"
                        allowClear
                        style={{ width: 146, marginRight: 16, marginBottom: 16 }} />
                    <Form.Select
                        label={'状态'}
                        labelPosition="left"
                        field={'state'}
                        style={{ width: 120, }}
                        placeholder="全部"
                        allowClear
                    >
                        {
                            Object.keys(leakageStatusMap).map((key) => {
                                return (
                                    <Select.Option key={leakageStatusMap[key].v} value={leakageStatusMap[key].v}>
                                        {leakageStatusMap[key].n}
                                    </Select.Option>
                                );
                            })
                        }
                    </Form.Select>
                    {/* <Form.DatePicker
                            type="timeRange"
                            labelPosition="left"
                            style={{ width: 352 }}
                            label={'分析时间'}
                        /> */}
                </div>
                <span>
                    <Button theme="solid" type="primary" htmlType="submit" style={{ width: 80, height: 32, borderRadius: 3, }}>查询</Button>
                </span>
            </Form>
            <Skeleton
                loading={false}
                active={true}
                placeholder={SkeletonScreen()}
            >
                <Table
                    columns={[{
                        title: '结构物',
                        dataIndex: 'structName',
                        render: (text, record, index) => {
                            if (record?.level == 'struc') {
                                return text
                            }
                            if (record?.level == 'base') {
                                return '基点'
                            }
                            return ''
                        }
                    },
                    // {
                    //    title: '设备',
                    //    dataIndex: 'deviceName',
                    // },
                    {
                        title: '测点',
                        dataIndex: 'stationName',
                    },
                    {
                        title: '斜率',
                        dataIndex: 'avgSlop',
                        render: (text, record, index) => {
                            return textToFixed(text)
                        }
                    },
                    // {
                    //     title: '截距',
                    //     dataIndex: 'avgSlop',
                    //     render: (text, record, index) => {
                    //         return textToFixed(text)
                    //     }
                    // },
                    {
                        title: '当前压强',
                        dataIndex: 'currentPressure',
                        render: (text, record, index) => {
                            return textToFixed(text)
                        }
                    },
                    {
                        title: '距离警戒线天数',
                        dataIndex: 'daysToWarning',
                        render: (text, record, index) => {
                            if (text && text < 0) {
                                return textToFixed(Math.abs(text))
                            }
                            return textToFixed(text)
                        }
                    }, {
                        title: '预报警级别',
                        dataIndex: 'alarmLevel',
                        render: (text, record, index) => {
                            return text ? leakageAlarmMap[text]?.text : ''
                        }
                    }, {
                        title: '建议',
                        dataIndex: 'suggestions',
                        render: (text, record, index) => {
                            return text
                        }
                    }, 
                    // {
                    //     title: '状态',
                    //     dataIndex: 'status',
                    //     render: (text, record, index) => {
                    //         if (!record?.deviceId) {
                    //             return ''
                    //         }
                    //         let corColor = 'blue'
                    //         let corObjKey = Object.keys(leakageStatusMap).find(key => leakageStatusMap[key].v == text)
                    //         if (corObjKey) {
                    //             corColor = leakageStatusMap[corObjKey].c
                    //         }
                    //         return <Tag color={corColor}>{corObjKey ? leakageStatusMap[corObjKey].n : '未知'}</Tag>
                    //     }
                    // },
                    {
                        title: '生成时间',
                        dataIndex: 'analysisDate',
                        render: (text, record, index) =>record?.analysisDate&& moment(record?.analysisDate).format('YYYY-MM-DD HH:mm:ss')
                    }
                    // , {
                    //     title: '操作',
                    //     dataIndex: 'name',
                    //     render: (text, record, index) => {
                    //         if (record?.level == 'struc ') {
                    //             return ''
                    //         }
                    //         let butArr = []
                    //         let corObjKey = Object.keys(leakageStatusMap).find(key => leakageStatusMap[key].v == record?.status)
                    //         if (corObjKey) {
                    //             let corObj = leakageStatusMap[corObjKey]
                    //             if (corObj.v == 0) {
                    //                 butArr.push(
                    //                     <Button type='secondary' onClick={() => {
                    //                         upLeakageStatus({ id: record.deviceId, status: 2 })
                    //                     }}>误报</Button>
                    //                 )
                    //                 butArr.push(
                    //                     <Button type='secondary' onClick={() => {
                    //                         upLeakageStatus({ id: record.deviceId, status: 1 })
                    //                     }}>确认</Button>
                    //                 )
                    //             } else if (corObj.v == 1) {
                    //                 butArr.push(
                    //                     <Button type='secondary' onClick={() => {
                    //                         upLeakageStatus({ id: record.deviceId, status: 3 })
                    //                     }}>维修完毕</Button>
                    //                 )
                    //             }
                    //         }
                    //         return <Space>
                    //             {butArr}
                    //         </Space>

                    //     }
                    // },
                ]}
                    dataSource={
                        // leakageList.list
                        leakageGroup?.rslt?.slice((query.page - 1) * query.limit, query.page * query.limit)
                    }
                    childrenRecordName={'children'}
                    bordered={false}
                    rowKey={
                        // 'deviceId'
                        (record, index) => {
                            return record.structId + '_' + record?.deviceId + '_' + record?.level
                        }
                    }
                    empty={
                        <div>
                            <img src="/assets/images/problem/shield.png" style={{ width: 20 }} />暂无告警数据
                        </div>
                    }
                    style={{}}
                    pagination={false}
                    onRow={(record, index) => {
                        if (index % 1 === 0) {
                            return { style: { background: '#FAFCFF' } }
                        }
                    }}

                />
            </Skeleton>
            <div style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "20px 20px",
            }}  >
                <div>
                </div>
                {
                    leakageList.count || leakageGroup?.rslt?.length > 0 ?
                        <div style={{ display: 'flex', }}>
                            <span style={{ lineHeight: "30px", fontSize: 13 }}>
                                共{
                                    // leakageList.count
                                    leakageCount
                                }个问题
                            </span>
                            <Pagination
                                total={
                                    // leakageList.count
                                    leakageGroup?.rslt?.length
                                }
                                showSizeChanger
                                pageSize={query.limit}
                                current={query.page}
                                pageSizeOpts={[1, 10, 20, 30, 40]}
                                onChange={(currentPage, pageSize) => {
                                    setQuery({ ...query, limit: pageSize, page: currentPage });
                                }}
                            />
                        </div> : ""
                }
            </div>
        </div>
    )
}

function mapStateToProps (state) {
    const { auth, global, leakageList, leakageGroup } = state
    return {
        user: auth.user,
        actions: global.actions,
        leakageList: leakageList.data || {
            count: 0,
            list: []
        },
        leakageGroup: leakageGroup.data || []
    }
}

export default connect(mapStateToProps)(LeakageAnomaly)