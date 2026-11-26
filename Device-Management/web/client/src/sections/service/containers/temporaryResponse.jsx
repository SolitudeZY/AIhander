import React, { useEffect, useState } from 'react'
import { connect } from 'react-redux'
import { Button, Table, Popconfirm, Pagination } from 'antd'
import moment from 'moment'
import TemporyModal from '../components/temporyModal'




const SetControl = (props) => {
    const { dispatch, actions, user, loading, socket } = props
    const [addVis, setAddVis] = useState(false)
    const [recordRow, setRecordRow] = useState(null)
    const [response, setResponse] = useState([])
    const [pepList, setPepList] = useState([])//角色分配
    const [pageSize, setPageSize] = useState(10)
    const [pageIndex, setPageIndex] = useState(1)
    const [total, setTotal] = useState()
    const { service, install } = actions
    const getResponse = (query = { type: 'temp', msg: '获取临时响应', pageIndex, pageSize }) => {
        dispatch(service.getMaintenancePlan(query)).then((res) => {
            setResponse(res?.payload.data.responseRes)
            setTotal(res?.payload.data.count)
        })
    }
    //配置分页
    //    const pagination={
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
    //               pageIndex,pageSize,type:'temp',msg:'获取临时响应'
    //             }
    //             getResponse(query)
    //          }
    //    }
    useEffect(() => {
        getResponse()
        dispatch(install.getOrganizationDeps()).then((res) => {//获取项企(PEP)全部部门及其下用户
            setPepList(res.payload.data)
        })
    }, [])

    const delHandler = (record) => {
        const query = {
            responseId: record.id,
            msg: '删除临时响应'
        }
        dispatch(service.delMaintenancePlan(query)).then((res) => {
            if (res.success) getResponse({ type: 'temp', msg: '获取临时响应', pageIndex: 1, pageSize }); setPageIndex(1)
        })
    }
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
            title: '执行人',
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
            title: '操作原因',
            dataIndex: 'reason',
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
            title: '状态',
            dataIndex: 'state'
        },
        {
            title: '操作',
            render: (record) => {
                return (<div>
                    <Button style={{ marginRight: 10 }} onClick={() => { setAddVis(true); setRecordRow(record) }}>编辑</Button>
                    <Popconfirm title="确定是否删改？" onConfirm={() => { delHandler(record) }}><Button type='danger'> 删除</Button></Popconfirm>
                </div>)
            }
        },
    ];

    return (
        <div style={{ background: '#FFFFFF', margin: '8px 12px', padding: '20px 20px 0px 20px' }}>
            <div style={{ marginBottom: 20 }}>
                <Button theme='solid' type='secondary' onClick={() => { setAddVis(true) }}>新增</Button>
            </div>
            <div>
                <Table columns={columns} dataSource={response} pagination={false}></Table>
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
                            pageIndex, pageSize, type: 'temp', msg: '获取临时响应'
                        }
                        getResponse(query)
                    }}></Pagination>
            </div>
            <TemporyModal open={addVis} onClose={() => { setAddVis(false); getResponse(); setRecordRow(null) }} recordRow={recordRow} pepList={pepList}></TemporyModal>
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

export default connect(mapStateToProps)(SetControl);
