'use strict';

import React, { useEffect, useState, useMemo } from 'react';
import { Calendar, DatePicker, Radio, Button, Table, Modal, Tooltip, Pagination, Popconfirm } from 'antd';
import moment from 'moment'
import { connect } from 'react-redux';
import RecordModal from '../components/recordModal'
import PlanAddmodal from '../components/planAddmodal'

const Server = (props) => {
    const { dispatch, actions, user, loading, socket } = props
    const { install, service } = actions
    const [dateValue, setDateValue] = useState([])
    const [mode, setMode] = useState('month')
    const [modalVis, setModalVis] = useState(false)
    const [recordRow, setRecordRow] = useState(null)
    const [recordList, setRecordList] = useState([])
    const [pepList, setPepList] = useState([])//角色分配
    const [startTime, setStartTime] = useState('1970-1-1')
    const [endTime, setEndTime] = useState('2099-1-1')
    const [sTime, setStime] = useState(moment().startOf('month').format('YYYY-MM-DD HH:mm:ss'))
    const [eTime, setEtime] = useState(moment().endOf('month').format('YYYY-MM-DD HH:mm:ss'))
    const [calculability, setCalculability] = useState('')
    const [pageSize, setPageSize] = useState(10)
    const [pageIndex, setPageIndex] = useState(1)
    const [total, setTotal] = useState()
    const [addVis, setAddVis] = useState(false)
    const [cycPlan, setCysPlan] = useState([])
    const [visible, setVisible] = useState(false)


    const getRecordList = (query = {
        startTime, endTime, pageIndex, pageSize
    }) => {
        dispatch(service.getRecord(query)).then((res) => {
            setRecordList(res?.payload.data.res)
            setTotal(res?.payload.data.count)
        })
    }
    //('endTime',endTime)
    useEffect(() => {
        getRecordList()
        dispatch(install.getOrganizationDeps()).then((res) => {//获取项企(PEP)全部部门及其下用户
            if (res.success) setPepList(res.payload.data)
        })

    }, [])
    const delHandler = (id) => {
        dispatch(service.delRecord(id)).then((res) => {
            if (res.success) {
                getRecordList({ startTime, endTime, pageIndex: 1, pageSize })
                setPageIndex(1)
            }
        })
    }

    const getCycPlan = (recordId) => {
        dispatch(service.getMaintenancePlan({ type: 'period', msg: '获取周期性计划', recordId: recordId })).then((res) => {
            setCysPlan(res?.payload.data.responseRes)
        })
    }
    useEffect(() => {
        const query = {
            sTime, eTime
        }
        dispatch(service.calculability(query)).then((res) => {
            if (res.success) setCalculability((Math.round(res.payload.data * 10000)) / 100 + '%');
        })
    }, [sTime, eTime])

    const columns = [
        {
            title: '序号',
            render: (t, r, i) => {
                return i + 1
            }
        },
        {
            title: '故障描述',
            dataIndex: 'sketch',
        },
        {
            title: '发生时间',
            render: (record) => {
                return <span>{moment(record.occurrenceTime).format('YYYY-MM-DD HH:mm:ss')}</span>
            },
        },
        {
            title: '解决时间',
            render: (record) => {
                return <span>{moment(record.solvingTime).format('YYYY-MM-DD HH:mm:ss')}</span>
            },
        },
        {
            title: '恢复时间',
            render: (record) => {
                const tdd = parseInt((moment(record.solvingTime).format('x') - moment(record.occurrenceTime).format('x')) / 1000 / 60 / 60 / 24)//取整天
                const tdh = parseInt((moment(record.solvingTime).format('x') - moment(record.occurrenceTime).format('x')) / 1000 / 60 / 60 % 24)//取整时
                const tds = parseInt((moment(record.solvingTime).format('x') - moment(record.occurrenceTime).format('x')) / 1000 / 60 % 60)//取整分
                return <span>{`${tdd}天${tdh}时${tds}分`}</span>
            }
        },
        {
            title: '故障类型',
            dataIndex: 'type',
        },
        {
            title: '解决者',
            //width:20,
            render: (record) => {
                return <span>
                    {record?.maintenanceRecordExecuteUsers.map((item) => {
                        return item.name
                    }).toString()
                    }

                </span>
            }
        },
        {
            title: '文件',
            render: (record) => {
                return record.files?.length > 0 && <a style={{ color: 'blue' }} href={`/_file-server/${record.files[0]?.url + '?filename=' + encodeURIComponent(record.files[0]?.name)}`}>
                    {record.files[0]?.name}
                </a> || '--'
            },
        },
        {
            title: '操作',
            render: (record) => {
                return <div style={{ width: 294 }}>
                    <Button
                        style={{ marginRight: 10 }}
                        onClick={() => {
                            setModalVis(true); setRecordRow(record)

                        }}
                    >
                        编辑
                    </Button>
                    <Popconfirm
                        title='确定是否删除？'
                        onConfirm={() => {
                            delHandler(record.id);
                        }}
                    >
                        <Button type='danger' > 删除</Button>
                    </Popconfirm>
                    <Button
                        style={{ marginRight: 10 }}
                        onClick={() => {
                            setRecordRow(record)
                            setAddVis(true)
                        }}
                    >
                        添加计划
                    </Button>

                    {record.planList?.length > 0 && <Button
                        style={{ marginRight: 10 }}
                        onClick={() => {
                            getCycPlan(record.id);
                            setVisible(true)
                        }}
                    >
                        查看计划
                    </Button>}
                </div>

            },
        },
    ];
    const onChangeDate = (e) => {
        setMode('')
        setDateValue(e)
        setStime(moment(e[0]).format('YYYY-MM-DD HH:mm:ss'))
        setEtime(moment(e[1]).format('YYYY-MM-DD HH:mm:ss'))
        const query = {
            sTime, eTime
        }
        dispatch(service.calculability(query)).then((res) => {
            if (res.success) setCalculability((Math.round(res.payload.data * 10000)) / 100 + '%');
        })

    }
    const clearHandler = () => {

    }
    const addHandler = () => {
        setModalVis(true)
    }

    const onSelect = (e) => {
        if (e.target.value === 'month') {
            setStime(moment().startOf('month').format('YYYY-MM-DD HH:mm:ss'));
            setEtime(moment().endOf('month').format('YYYY-MM-DD HH:mm:ss'))

        } else {
            setStime(moment().startOf('year').format("YYYY-MM-DD HH:mm:ss"))
            setEtime(moment().endOf('year').format('YYYY-MM-DD HH:mm:ss'))

        }
        setMode(e.target.value)
        setDateValue([])

    }

    const column = [
        {
            title: '序号',
            render: (t, r, i) => <div style={{ minWidth: 30 }}>{i + 1}</div>
        },
        {
            title: '任务名称',
            dataIndex: 'missionName',
            render: (t) => <div style={{ minWidth: 100 }}>{t}</div>
        },
        {
            title: '责任人',
            render: (record) => {
                return <div style={{ minWidth: 50 }}>
                    {record?.maintenancePlanExecuteUsers.map((item) => {
                        return <div>{item.name}</div>
                    })
                    }
                </div>
            }
        },
        {
            title: '完成情况',
            dataIndex: 'state',
            render: (t, record) => <div style={{ minWidth: 56 }}>{t || '--'}</div>
        },
        {
            title: '备注',
            dataIndex: 'remark',
            render: (t, record) => <div style={{ minWidth: 100 }}>{t || '--'}</div>
        },
        {
            title: '计划完成时间',
            render: (record) => {
                return <div style={{ minWidth: 88 }}>{moment(record.planFinishTime).format('YYYY-MM-DD')}</div>
            },
        },
        {
            title: '实际完成时间',
            render: (record) => {
                return <div style={{ minWidth: 88 }}>{record.actualFinishTime ? <span>{moment(record.actualFinishTime).format('YYYY-MM-DD')}</span> : '--'}</div>
            },
        },
    ];
    return (
        <div style={{ background: '#FFFFFF', margin: '8px 12px', padding: '20px 20px 0px 20px' }}>
            <div style={{ display: 'flex', marginTop: 20, alignItems: 'flex-end' }}>
                <div style={{ width: 0, height: 20, borderLeft: '3px solid #005ABD', borderTop: '3px solid transparent', borderBottom: '3px solid transparent' }}></div>
                <div style={{ fontFamily: "YouSheBiaoTiHei", fontSize: 24, color: '#101531', marginLeft: 8 }}>系统可用性</div>
                <div style={{ marginLeft: 350 }}>
                    <Radio onChange={e => onSelect(e)} value={mode} type="button">
                        <Radio value={'month'} checked>本月</Radio>
                        <Radio value={'year'}>全年</Radio>
                    </Radio>
                    <DatePicker type="dateTimeRange"
                        onChange={e => onChangeDate(e)}
                        density="compact"
                        style={{ width: 400 }}
                        value={dateValue}
                        onClear={() => { clearHandler() }}

                    />
                </div>
            </div>
            <div style={{ marginLeft: 20, marginTop: 50, display: 'flex', alignItems: 'flex-end' }}>
                <span style={{ width: 340 }}>{`系统可用性=（平均故障间隔MTBF）/(平均故障间隔MTBF+故障恢复时间MTTR）*100%`}</span>
                <span style={{ fontSize: 48, color: '#D9001B', marginLeft: 150 }}>{calculability}</span>
            </div>
            <div style={{ display: 'flex', marginTop: 20 }}>
                <Button theme='solid' type='secondary' onClick={addHandler}>新增</Button>
                <div style={{ display: 'flex', alignItems: 'baseline', marginLeft: 700 }}>
                    <span >产生时间</span>
                    <DatePicker type="dateRange" insetInput style={{ width: 280, marginLeft: 10 }} onChange={(e) => {
                        setStartTime((e[0]) + ''); setEndTime(e[1] + '')
                    }}
                        onClear={() => { setStartTime('1970-1-1'); setEndTime('2099-12-31') }} />
                    <Button theme='solid' type="primary" style={{ marginLeft: 20 }} onClick={() => {
                        setPageIndex(1); setPageSize(10)
                        getRecordList({ startTime, endTime, pageIndex: 1, pageSize: 10 });
                    }}>查询</Button>
                </div>
            </div>
            <div style={{ marginTop: 10 }}>
                <Table columns={columns} dataSource={recordList} pagination={false} onHeaderRow={() => {
                    return {
                        background: '#000000',
                    }
                }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', margin: '10px 0 0 0' }}>
                <span style={{ lineHeight: "30px", fontSize: 13, color: 'rgba(0,90,189,0.8)' }}>
                    共{total}条信息
                </span>
                <Pagination total={total}
                    showSizeChanger
                    pageSize={pageSize}
                    current={pageIndex}
                    pageSizeOpts={[10, 20, 30]}
                    onChange={(pageIndex, pageSize) => {
                        setPageIndex(pageIndex)
                        setPageSize(pageSize)
                        const query = {
                            startTime, endTime, pageIndex, pageSize
                        }
                        getRecordList(query)
                    }}></Pagination>
            </div>
            <RecordModal
                open={modalVis}
                onClose={() => { setModalVis(false); getRecordList(); setRecordRow(null) }}
                recordRow={recordRow} pepList={pepList}></RecordModal>
            <PlanAddmodal
                open={addVis}
                onClose={() => {
                    setAddVis(false);
                    getRecordList()
                    setRecordRow(null)
                }}
                recordRow={recordRow} />
            <Modal
                open={visible}
                title={'查看周期计划'}
                width={1050}
                footer={null}
                onOk={() => {
                    setVisible(false)
                }}
                onCancel={() => {
                    setVisible(false)
                }}
            >
                <Table style={{ marginBottom: 20 }} columns={column} dataSource={cycPlan} pagination={false} onHeaderRow={() => {
                    return {
                        background: '#000000',
                    }
                }} />
            </Modal>
        </div>

    )
}

function mapStateToProps (state) {
    const { auth, global, members, webSocket } = state;
    return {
        //   loading: members.isRequesting,
        //   user: auth.user,
        actions: global.actions,
        //   members: members.data,
        //   socket: webSocket.socket
    };
}

export default connect(mapStateToProps)(Server);
