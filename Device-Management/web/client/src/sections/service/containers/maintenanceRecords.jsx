import { Button, DatePicker, Select, Table, Popconfirm, Tooltip, Pagination } from 'antd';
import React, { useEffect, useState } from 'react';
import { connect } from 'react-redux';
import MaintenanceRecordModal from '../components/maintenanceRecordModal';
import moment from 'moment';

const MaintenanceRecords = (props) => {
    const { dispatch, actions, user, loading, socket, projectList } = props;
    const [addVis, setAddVis] = useState(false);
    const [recordRow, setRecordRow] = useState(null);
    const [equipmentList, setEquipmentList] = useState([]);
    const [pepList, setPepList] = useState([]);
    const [pageSize, setPageSize] = useState(10);
    const [pageIndex, setPageIndex] = useState(1);
    const [startTime, setStartTime] = useState('1970-1-1');
    const [endTime, setEndTime] = useState('2099-1-1');
    const { install, service } = actions;
    const [total, setTotal] = useState()
    const [projectId, setProjectId] = useState(null)


    const getEquipment = (query = { startTime, endTime, pageIndex, pageSize }) => {
        dispatch(service.getEquipment(query)).then((res) => {
            if (res.success) setEquipmentList(res?.payload.data.result); setTotal(res?.payload.data.resCount)

        });
    };
    const findHandler = () => {
        const query = {
            pageIndex, pageSize, msg: '获取维护记录', startTime, endTime, projectId
        }
        getEquipment(query)
    }
    const timeHandler = (e) => {
        setEndTime(e[1] + '')
        setStartTime(e[0] + '')
    }
    useEffect(() => {
        dispatch(install.getOrganizationDeps()).then((res) => {
            //获取项企(PEP)全部部门及其下用户
            setPepList(res.payload.data);
        });
        getEquipment();
    }, [])
    const delHandler = (record) => {
        dispatch(service.delEquipment(record.id)).then((res) => {
            if (res.success) getEquipment({
                pageIndex: 1, pageSize, msg: '获取维护记录', startTime, endTime, projectId
            }); setPageIndex(1)
        })
    }
    const columns = [
        {
            title: '序号',
            render: (t, r, i) => {
                return i + 1;
            }
        },
        {
            title: '项目名称',
            render: (record) => {
                const currentId = record.equipmentMaintenanceRecordProjects?.map((item1) => {
                    return item1.projectId;
                })[0];
                //const  currnetObj = projectList?.find((item) => item.id === record?.equipmentMaintenanceRecordProjects?.projectId)||{};
                const currnetObj = projectList?.find((item) => item.id === currentId) || {};
                const projectName = currnetObj.name ? currnetObj.name : currnetObj.pepProjectName;
                return projectName?.length > 15 ? (
                    <Tooltip content={<div>{projectName}</div>}>
                        <div style={{}}>{projectName?.length > 15 ? `${projectName?.substr(0, 15)}...` : projectName}</div>
                    </Tooltip>
                ) : (
                    projectName
                );
            }
        },
        {
            title: '设备类型',
            dataIndex: 'equipmentCategory'
        },
        {
            title: '设备型号',
            dataIndex: 'equipmentType'
        },
        {
            title: '维修原因',
            dataIndex: 'maintenanceReason'
        },
        {
            title: '解决方案',
            dataIndex: 'solution'
        },
        {
            title: '维修人',
            render: (record) => {
                return (
                    <span>
                        {record?.equipmentMaintenanceRecordExecuteUsers
                            .map((item) => {
                                return item.name;
                            })
                            .toString()}
                    </span>
                );
            }
        },
        {
            title: '上报时间',
            render: (record) => {
                return <span>{moment(record.reportTime).format('YYYY-MM-DD HH:mm:ss')}</span>;
            }
        },
        {
            title: '维修完成时间',
            render: (record) => {
                //('record',record.completedTime)
                return (record.completedTime ? (<span>{moment(record.reportTime).format('YYYY-MM-DD HH:mm:ss')}</span>) : '')
            }
        },
        {
            title: '状态',
            dataIndex: 'status'
        },
        {
            title: '操作',
            render: (record) => {
                return (
                    <div>
                        <Button
                            style={{ marginRight: 10 }}
                            onClick={() => {
                                setAddVis(true);
                                setRecordRow(record);
                            }}
                        >
                            编辑
                        </Button>
                        <Popconfirm
                            title='确定是否删除？'
                            onConfirm={() => {
                                delHandler(record);
                            }}
                        >
                            <Button type='danger' > 删除</Button>
                        </Popconfirm>
                    </div>
                );
            }
        }
    ];

    return (
        <div style={{ background: '#FFFFFF', margin: '8px 12px', padding: '20px 20px 0px 20px' }}>
            <div style={{ display: 'flex', marginBottom: 20, alignItems: 'baseline' }}>
                <div style={{ marginRight: 100 }}>
                    {' '}
                    <Button
                        theme='solid'
                        type='secondary'
                        onClick={() => {
                            setAddVis(true);
                        }}
                    >
                        新增
                    </Button>
                </div>
                <div style={{ marginRight: 200 }}>
                    {' '}
                    <span style={{ marginRight: 10 }}>项目名称</span>
                    <Select
                        allowClear
                        onChange={(e) => { setProjectId(e) }}
                        onClear={() => { setProjectId(null) }}
                        style={{ width: 150 }}
                        options={projectList?.map((item) => {
                            return { value: item.id, label: item.pepProjectName || item.name }
                        })}
                    ></Select>
                </div>
                <div style={{ marginRight: 20, display: 'flex', alignItems: 'baseline' }}>
                    <span style={{ marginRight: 10 }}>上报时间</span>
                    <DatePicker type='dateTimeRange' onChange={(e) => { timeHandler(e) }} onClear={() => { setStartTime('1970-1-1'); setEndTime('2099-12-31') }}></DatePicker>
                </div>
                <div>
                    <Button theme='solid' type="primary" onClick={findHandler}>查询</Button>
                </div>
            </div>
            <div>
                <Table columns={columns} dataSource={equipmentList} pagination={false}></Table>
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
                            pageIndex, pageSize, msg: '获取维护记录', startTime, endTime, projectId
                        }
                        getEquipment(query)
                    }}></Pagination>
            </div>
            <MaintenanceRecordModal
                open={addVis}
                onClose={() => {
                    setAddVis(false);
                    setRecordRow(null);
                    //getEquipment();
                    findHandler()
                }}
                recordRow={recordRow}
                pepList={pepList}
                projectList={projectList}
            ></MaintenanceRecordModal>
        </div>
    );
};

function mapStateToProps (state) {
    const { auth, global, members, webSocket, ProjectPoms } = state;
    return {
        //   loading: members.isRequesting,
        //   user: auth.user,
        actions: global.actions,
        //   members: members.data,
        //   socket: webSocket.socket
        projectList: ProjectPoms.data?.rows
    };
}

export default connect(mapStateToProps)(MaintenanceRecords);
