import React, { useEffect, useState } from 'react';
import { connect } from 'react-redux';
import { Button, Table, Popconfirm, Pagination } from 'antd';
import Addmodal from '../components/cycAddmodal'
import moment from 'moment'


const Server = (props) => {
    const { dispatch, actions, user, loading, socket } = props
    const { service, install } = actions
    const [addVis, setAddVis] = useState(false)
    const [cycPlan, setCysPlan] = useState([])
    const [recordRow, setRecordRow] = useState(null)
    const [pepList, setPepList] = useState([])//角色分配
    const [pageSize, setPageSize] = useState(10)
    const [pageIndex, setPageIndex] = useState(1)
    const [total, setTotal] = useState()
    const [respondRecordData, setRespondRecordData] = useState([])

    const getCycPlan = (query = { type: 'period', msg: '获取周期性计划', pageIndex, pageSize }) => {
        dispatch(service.getMaintenancePlan(query)).then((res) => {
            setCysPlan(res?.payload.data.responseRes)
            setTotal(res?.payload.data.count)
        })
    }
    useEffect(() => {
        getCycPlan()
        dispatch(install.getOrganizationDeps()).then((res) => {//获取项企(PEP)全部部门及其下用户
            setPepList(res.payload.data)
        })
        dispatch(service.respondRecord({})).then((res) => {
            if (res.success) {
                setRespondRecordData(res?.payload.data)
            }
        });
    }, [])
    const delHandler = (record) => {
        const query = {
            responseId: record.id,
            msg: '删除周期性计划'
        }
        dispatch(service.delMaintenancePlan(query)).then((res) => {
            if (res.success) getCycPlan({ type: 'period', msg: '获取周期性计划', pageIndex: 1, pageSize }); setPageIndex(1)
        })
    }
    //配置分页
    //  const pagination={
    //     total:total,
    //     defaultCurrent: 1,
    //     pageSize:pageSize,
    //     showSizeChanger: true,
    //     currentPage:pageIndex,
    //     showQuickJumper: true,
    //     pageSizeOpts: ["5", "10", "15"],
    //     showTotal: function () {
    //         return `共有${total}条`
    //     },
    //     onChange:(pageIndex,pageSize)=>{
    //             setPageIndex(pageIndex)
    //             setPageSize(pageSize)
    //             const query={
    //               pageIndex,pageSize,type:'temp',msg:'获取周期性计划'
    //             }
    //             getCycPlan(query)
    //          }
    // }
    const columns = [
        {
            title: '序号',
            render: (t, r, i) => {
                return i + 1
            }
        },
        {
            title: '任务名称',
            dataIndex: 'missionName',
        },
        {
            title: '责任人',
            render: (record) => {
                return <span>
                    {record?.maintenancePlanExecuteUsers.map((item) => {
                        return item.name
                    }).toString()
                    }
                </span>
            }
        },
        {
            title: '完成情况',
            dataIndex: 'state',
        },
        {
            title: '备注',
            dataIndex: 'remark',
        },
        {
            title: '计划完成时间',
            render: (record) => {
                return <span>{moment(record.planFinishTime).format('YYYY-MM-DD')}</span>
            },
        },
        {
            title: '实际完成时间',
            render: (record) => {
                return record.actualFinishTime ? <span>{moment(record.actualFinishTime).format('YYYY-MM-DD')}</span> : ''
            },
        },
        {
            title: '操作',
            render: (record) => {
                return (<div>
                    <Button onClick={() => { setAddVis(true); setRecordRow(record) }} style={{ marginRight: 10 }}>编辑</Button>
                    <Popconfirm title="确定是否删除？" onConfirm={() => { delHandler(record) }}><Button type='danger'> 删除</Button></Popconfirm>
                </div>)
            }
        },
    ];
    return (
        <div style={{ background: '#FFFFFF', margin: '8px 12px', padding: '20px 20px 0px 20px' }}>
            <div style={{ marginBottom: 20 }}>
                <Button theme='solid' type='secondary' onClick={() => { setAddVis(true) }}>新增</Button>
                {/* <Button theme='solid' type='secondary' style={{marginLeft:50}}>导入</Button> */}
            </div>
            <div>
                <Table columns={columns} dataSource={cycPlan} pagination={false}></Table>
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
                            pageIndex, pageSize, type: 'period', msg: '获取周期性计划'
                        }
                        getCycPlan(query)
                    }}></Pagination>
            </div>
            <Addmodal open={addVis} respondRecordData={respondRecordData} onClose={() => { setAddVis(false); setRecordRow(null); getCycPlan() }} recordRow={recordRow} pepList={pepList}></Addmodal>
        </div>

    )
}

function mapStateToProps (state) {
    const { global } = state;
    return {
        actions: global.actions,
    };
}

export default connect(mapStateToProps)(Server);
