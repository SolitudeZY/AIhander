import React, { useEffect, useRef, useState } from 'react';
import { connect } from 'react-redux';
import { Skeleton, Button, Pagination, Table, Popconfirm, Tooltip, Input } from 'antd';
import { SkeletonScreen, } from "$components";
import moment from "moment";
import SystemModal from '../components/systemModal'
import AnomalePointModal from '../components/anomalyPointModal'
import '../style.less'
import { set } from 'nprogress';

const Example = (props) => {
    const { dispatch, actions, user, loading, socket } = props
    const { install } = actions;
    const [query, setQuery] = useState({ limit: 10, page: 0 }); //页码信息
    const [limits, setLimits] = useState()//每页实际条数
    const mylimits = useRef(); //每页实际条数
    const [selected, setSelected] = useState([])  //表格被勾选项
    const [systemModal, setSystemModal] = useState(false)  //映射关系弹框
    const [systemEdit, setSystemEdit] = useState(false)  //是否是修改
    const [anxincloudList, setAnxincloudList] = useState([])  //安心云列表
    const [peplist, setPeplist] = useState([])  //PEP项目管理项目列表
    const [appList, setAppList] = useState([])  //应用列表
    const [pepProjectId, setPepProjectId] = useState()  //修改时项企id
    const [anxincloudArr, setAnxincloudArr] = useState([])  //修改时已经选择的安心云列表
    const [pepname, setPepname] = useState()  //修改时自定义项目名称
    const [anxinDelete, setAnxinDelete] = useState([])  //修改时安心云项目有删除,显示提示信息
    const [appArr, setAppArr] = useState([])  //修改时添加应用
    const [bindId, setBindId] = useState()  //修改时绑定的id
    const [tableKey, setTableKey] = useState([])  //修改时绑定的id
    const page = useRef(query.page);//哪一页
    const [mapping, setMapping] = useState() //修改时的映射类型
    const [keyword, setKeyword] = useState()  //搜索关键字
    const [maintenancePeriod, setMaintenancePeriod] = useState([])//维保时间区间
    const [editData, setEditData] = useState({})

    const [anomalePointModal, setAnomalePointModal] = useState(false)  // 查询异常点位弹出窗
    const [projectData, setProjectData] = useState([])  // 查询异常点位数据

    function handleRow (record, index) {//斑马条纹
        // 给偶数行设置斑马纹
        if (index % 2 === 0) {
            return {
                style: {
                    background: '#FAFCFF',
                }
            };
        } else {
            return {};
        }
    }

    const [tableData, setTableData] = useState([])  //表格数据

    const getPepProject = () => {
        dispatch(install.getProjectPmanage(query)).then((res) => {//获取PEP项目管理项目
            setPeplist(res.payload.data)
        })
    }

    useEffect(() => {
        dispatch(install.getProjectAnxincloud(query)).then((res) => {//获取安心云项目
            setAnxincloudList(res.payload.data)
        })
        getPepProject()
        dispatch(install.getProjectAppList(query)).then((res) => {//获取应用列表
            setAppList(res.payload.data)
        })
    }, [])

    useEffect(() => {
        getProjectPomsList();
    }, [query]);

    function getProjectPomsList (item) {
        let data = item || query
        dispatch(install.getProjectPoms({ ...data, keyword })).then((res) => {//获取已绑定项目
            if (res.success) {
                let mytableData = JSON.parse(JSON.stringify(res.payload.data.rows));
                let mytableKey = []
                for (let index = 0; index < mytableData.length; index++) {
                    mytableData[index].key = mytableData[index].id
                    mytableKey.push(mytableData[index].id)
                }
                setTableKey(mytableKey)
                setTableData(mytableData)
                setLimits(res.payload.data.count)
                mylimits.current = res.payload.data.rows.length
            }
        })
    }
    const [columns, setColumns] = useState([//表格属性
        {
            title: "序号",
            dataIndex: "index",
            key: 'index',
            render: (text, r, index) => {
                return index + 1;
            },
        },
        {
            title: 'PEP项企项目名称',
            dataIndex: "pepProjectName",
            key: 'pepProjectName',
            render: (_, row) => {
                return (
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        {
                            row.pepProjectIsDelete == 1 ? (
                                <Tooltip content={'失效,项目已在【项企PEP】中被删除!'}>
                                    <div style={{ marginRight: 5 }}>
                                        <img src="/assets/images/install/risk.png" alt="" style={{ height: 24, width: 24, }} />
                                    </div>
                                </Tooltip>) : ('')
                        }
                        <Tooltip content={row.pepProjectName || row.name}>
                            <div style={{ color: row.pepProjectIsDelete == 1 ? 'rgb(249, 57, 32)' : '', width: row?.pepProjectName?.length > 7 || row?.name?.length > 7 ? '112px' : '', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {row.pepProjectName || row.name}
                            </div>
                        </Tooltip>
                        {
                            row.pepProjectName ? (
                                <div style={{
                                    height: 18, marginLeft: 4,
                                    background: 'linear-gradient(180deg, #EBF5FF 0%, #EBF5FF 0%, #D3E8FF 100%)',
                                    borderRadius: 2, display: 'flex', alignItems: 'center'
                                }}>
                                    <div>
                                        <img src="/assets/images/install/icon_zhengque.png" alt="" style={{ height: 10, width: 10, marginLeft: 3, marginRight: 3 }} />
                                    </div>
                                    <div style={{ color: '#0F7EFB', fontSize: 11, paddingRight: 2, whiteSpace: 'nowrap' }}>
                                        {row.constructionStatus}
                                    </div>
                                </div>
                            ) : (
                                <div style={{
                                    height: 18, marginLeft: 4,
                                    background: 'linear-gradient(180deg, #99C7DD 0%, #3048FC 100%)',
                                    borderRadius: 2, display: 'flex', alignItems: 'center'
                                }}>
                                    <div>
                                        <img src="/assets/images/install/icon_POMS.png" alt="" style={{ height: 10, width: 10, marginLeft: 3, marginRight: 3 }} />
                                    </div>
                                    <div style={{ color: '#FFFFFF', fontSize: 11, marginRight: 2, whiteSpace: 'nowrap' }}>
                                        POMS
                                    </div>
                                </div>
                            )
                        }
                    </div>
                )
            }
        },
        {
            title: '安心云项目名称',
            dataIndex: "anxinProject",
            key: 'anxinProject',
            // width: 300,
            render: (_, row) => {
                let anxinerror = false
                let anxinerrorArr = []
                for (let i = 0; i < row.anxinProject.length; i++) {
                    if (row.anxinProject[i].projectState == -1) {
                        anxinerror = true
                        anxinerrorArr.push(row.anxinProject[i].name)
                    }
                }
                return (
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        {
                            anxinerror ? (
                                <Tooltip content={anxinerrorArr.join(',') + ',项目已在【安心云】中被删除'}>
                                    <div style={{ marginRight: 5 }}>
                                        <img src="/assets/images/install/risk.png" alt="" style={{ height: 24, width: 24, }} />
                                    </div>
                                </Tooltip>) : ('')
                        }
                        {
                            row.anxinProject.map((item, index) => {
                                return (
                                    <div className='myseparator' key={index} style={{ display: 'flex', alignItems: 'center' }}>
                                        {
                                            // row.anxinProject.length >= 3 ? (
                                            //    <Tooltip content={item.name}>
                                            //       <div style={{ width: item.name.length > 7 ? '112px' : '', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: index > 2 ? 'none' : '', color: item.projectState == -1 ? '#F93920' : '' }}>
                                            //          {item.name}
                                            //       </div>
                                            //    </Tooltip>
                                            // ) : row.anxinProject.length == 2 ? (
                                            //    <Tooltip content={item.name}>
                                            //       <div style={{ width: item.name.length > 12 ? '173.5px' : '', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: item.projectState == -1 ? '#F93920' : '' }}>
                                            //          {item.name}
                                            //       </div>
                                            //    </Tooltip>
                                            // ) : (
                                            //    <Tooltip content={item.name}>
                                            //       <div style={{ width: item.name.length > 25 ? '358px' : '', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: item.projectState == -1 ? '#F93920' : '' }}>
                                            //          {item.name}
                                            //       </div>
                                            //    </Tooltip>
                                            // )
                                            row.anxinProject.length >= 2 ? (
                                                <Tooltip content={item.name}>
                                                    <div style={{ width: item.name.length > 4 ? '70px' : '', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: index > 2 ? 'none' : '', color: item.projectState == -1 ? '#F93920' : '' }}>
                                                        {item.name}
                                                    </div>
                                                </Tooltip>) : (
                                                <Tooltip content={item.name}>
                                                    <div style={{ width: item.name.length > 7 ? '112px' : '', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: index > 2 ? 'none' : '', color: item.projectState == -1 ? '#F93920' : '' }}>
                                                        {item.name}
                                                    </div>
                                                </Tooltip>)

                                        }
                                        <div className='separator' style={{ width: 1, height: 12, border: '1px solid #DCDEE0', margin: '0px 10px', display: index > 1 ? 'none' : '' }}></div>
                                    </div>
                                )
                            })
                        }
                        {
                            row.anxinProject.length > 3 ? (
                                <Tooltip content={
                                    <div style={{ display: 'flex', flexWrap: 'wrap' }}>
                                        {
                                            row.anxinProject.map((item, index) => {
                                                return (
                                                    <div key={index} style={{ color: item.projectState == -1 ? '#F93920' : '' }}>
                                                        {item.name}<span style={{ color: '#FFFFFF' }}>,</span>
                                                    </div>
                                                )
                                            })
                                        }
                                    </div>
                                } trigger="click" style={{ lineHeight: 2 }}>
                                    <div style={{ fontSize: 14, color: '#005ABD', marginLeft: 8, cursor: "pointer", }}>
                                        +{row.anxinProject.length - 3}
                                    </div>
                                </Tooltip>
                            ) : ('')
                        }
                    </div>
                )
            }
        },
        {
            title: '客户等级',
            dataIndex: "customerLevel",
            key: 'customerLevel',
            // render: (_, row) => {
            //    let data = { wisdom: '智慧类', monitor: '监测类', other: '其他' }
            //    return data[row.mappingClass]
            // }
        },
        {
            title: '映射类型',
            dataIndex: "mappingClass",
            key: 'mappingClass',
            render: (_, row) => {
                let data = { wisdom: '智慧类', monitor: '监测类', other: '其他' }
                return data[row.mappingClass]
            }
        },
        {
            title: '关联时间',
            dataIndex: "createTime",
            key: 'time',
            render: (_, row) => {
                return moment(row.createTime).format("YYYY-MM-DD HH:mm:ss") || '无';
            }
        },
        {
            title: '修改时间',
            dataIndex: "updateTime",
            key: 'updateTime',
            render: (_, row) => {
                return (row.updateTime ? moment(row.updateTime).format("YYYY-MM-DD HH:mm:ss") : moment(row.createTime).format("YYYY-MM-DD HH:mm:ss"));
            }
        },
        {
            title: '修改人员',
            dataIndex: "editUserName",
            key: 'editUserName',
        },
        {
            title: '添加人员',
            dataIndex: "pepUserName",
            key: 'pepUserName',
            render: (_, row) => {
                return row.pepUserName || '无'
            }
        },
        {
            title: '维保开始时间',
            dataIndex: "maintenanceStart",
            key: 'maintenanceStart',
            render: (_, row) => {
                return row.maintenanceStart ? moment(row.maintenanceStart).format('YYYY-MM-DD') : '无'
            }
        },
        {
            title: '维保结束时间',
            dataIndex: "maintenanceEnd",
            key: 'maintenanceEnd',
            render: (_, row) => {
                return row.maintenanceEnd ? moment(row.maintenanceEnd).format('YYYY-MM-DD') : '无'
            }
        },
        {
            title: "管理",
            width: "150px",
            dataIndex: "text",
            key: 'text',
            render: (_, row) => {
                return (
                    <div style={{ display: "flex" }}>
                        <Button
                            theme="borderless"
                            disabled={row.pepProjectIsDelete == 1}
                            onClick={() => {
                                setSystemModal(true);
                                setPepname(row.name)
                                if (!row.name) {
                                    setPepProjectId(row.pepProjectId)
                                }
                                else {
                                    setPepProjectId()
                                }
                                let myanxinArr = []
                                let anxinErrorList = []
                                for (let i = 0; i < row.anxinProject.length; i++) {
                                    if (row.anxinProject[i].projectState !== -1) {
                                        myanxinArr.push(row.anxinProject[i].id)
                                    }
                                    else {
                                        anxinErrorList.push(row.anxinProject[i].name)
                                    }
                                }
                                setAnxinDelete(anxinErrorList)
                                let myapparr = []
                                let myarrarrList = JSON.parse(JSON.stringify(row.apps))
                                for (let j = 0; j < row.apps.length; j++) {
                                    delete myarrarrList[j].projectApp
                                    myapparr.push(JSON.stringify(myarrarrList[j]))
                                }

                                setAppArr(myapparr)
                                setAnxincloudArr(myanxinArr)
                                setBindId(row.id)
                                setMapping(row?.mappingClass)
                                setSystemEdit(true)
                                setMaintenancePeriod([row?.maintenanceStart, row?.maintenanceEnd])
                                setEditData(row)
                            }}
                        >
                            修改
                        </Button>
                        <Popconfirm
                            title="删除后对应的项目全局将无法进入和显示，对应的信鸽服务也会被删除"
                            arrow={{ pointAtCenter: false }}
                            showArrow={true}
                            position="topRight"
                            onConfirm={() => {
                                dispatch(install.deleteProjectBind({ bindId: row?.id, msg: '删除安心云、项目管理项目绑定关系' })).then(() => {
                                    getPepProject()
                                    if (page.current > 0 && mylimits.current < 2) {
                                        setQuery({ limit: 10, page: page.current - 1 })
                                    } else {
                                        setQuery({ limit: 10, page: page.current })
                                    }
                                })
                            }}
                        >
                            <Button theme="borderless">删除</Button>
                        </Popconfirm>
                        <Button
                            theme="borderless"
                            onClick={() => {
                                setAnomalePointModal(true);
                                setProjectData(row)
                            }}
                        >查询</Button>
                    </div >
                );
            },
        },
    ])
    const rowSelection = {
        selectedRowKeys: selected,
        // onSelect: (record, selected) => {
        // },
        // onSelectAll: (selected, selectedRows) => {
        // },
        onChange: (selectedRowKeys, selectedRows) => {
            setSelected(selectedRows.map(v => v.key))
        },
    }
    return (
        <>
            <div style={{ background: '#FFFFFF', margin: '8px 12px', padding: '20px 20px 0px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <div style={{ width: 0, height: 20, borderLeft: '3px solid #005ABD', borderTop: '3px solid transparent', borderBottom: '3px solid transparent' }}></div>
                        <div style={{ fontFamily: "YouSheBiaoTiHei", fontSize: 24, color: '#101531', marginLeft: 8 }}>系统映射</div>
                        <div style={{ marginLeft: 6, fontSize: 12, color: '#969799', fontFamily: "DINExp", }}>ASSOCIATION & MAPPING</div>
                    </div>

                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, marginTop: 5 }}>
                    <div style={{ fontSize: 12, color: '#8B8B8B' }}>平台通过映射能力将多个系统的结构化、非结构化、半结构化数据按照平台算法进行分类关联，形成整体项目信息结构，以项企PEP的项目名称进行规范。</div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div>
                        <Input placeholder="请输入PEP项企项目名称或安心云项目名称关键字" style={{ width: 340 }} onChange={v => {
                            setKeyword(v)
                        }} />
                        <Button
                            theme="solid"
                            type="primary"
                            style={{
                                width: 65,
                                height: 30,
                                borderRadius: 2,
                                marginLeft: 10
                            }}
                            onClick={() => {
                                setQuery({ limit: 10, page: 0 })
                                // getProjectPomsList({ limit: 10, page: 0 })
                            }}
                        >
                            搜索
                        </Button>
                    </div>

                    <Button
                        theme="solid"
                        type="primary"
                        style={{
                            width: 108,
                            height: 32,
                            borderRadius: 2,
                            marginLeft: 40
                        }}
                        onClick={() => {
                            setSystemModal(true);
                            setSystemEdit(false)
                            setPepProjectId()
                            setPepname()
                            setAnxinDelete([])
                            setAppArr([])
                            setAnxincloudArr()
                            setBindId()
                            setMapping('')
                            setMaintenancePeriod([])
                        }}
                    >
                        添加映射关系
                    </Button>

                </div>
                <div style={{ marginTop: 20 }}>
                    <Skeleton
                        loading={loading}
                        active={true}
                        placeholder={SkeletonScreen()}
                    >
                        <Table
                            columns={columns}
                            dataSource={tableData}
                            bordered={false}
                            empty="暂无数据"
                            pagination={false}
                            onRow={handleRow}
                            rowSelection={rowSelection}
                        />
                    </Skeleton>
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            padding: "20px 20px",
                        }}
                    >
                        <div>
                            <div style={{ display: 'inline-block', lineHeight: '30px', fontSize: 13, color: 'gray' }}>勾选<span style={{ fontWeight: 400, color: '#0F7EFB', }}> {selected.length}条 </span>信息</div>
                            <Button onClick={() => {
                                if (selected.length == tableKey.length) {
                                    setSelected([])
                                }
                                else {
                                    setSelected(tableKey)
                                }
                            }} style={{ fontSize: 13, width: 93, height: 24, borderRadius: '1px', background: '#FFFFFF', border: '1px solid #0F7EFB', color: '#0F7EFB', fontWeight: 400, margin: '0 10px' }}>
                                {mylimits.current == selected.length ? '取消全选' : '全选'}
                            </Button>
                            <Popconfirm
                                title="删除后对应的项目全局将无法进入和显示，对应的信鸽服务也会被禁用"
                                arrow={{ pointAtCenter: false }}
                                showArrow={true}
                                position="topRight"
                                onConfirm={() => {
                                    dispatch(install.deleteProjectBind({ bindId: selected.join(','), msg: '删除安心云、项目管理项目绑定关系' })).then(() => {
                                        if (page.current > 0 && mylimits.current == selected.length) {
                                            setQuery({ limit: 10, page: page.current - 1 })
                                        } else {
                                            setQuery({ limit: 10, page: page.current })
                                        }
                                        setSelected([])
                                    })
                                }}
                            >
                                <Button type='primary' theme='solid' style={{ fontSize: 13, width: 93, height: 24, borderRadius: '1px', border: '1px solid #0F7EFB', color: '#FFFFFF', fontWeight: 400, }}>批量删除</Button>
                            </Popconfirm>
                        </div>
                        <div style={{ display: 'flex', }}>
                            <span style={{ lineHeight: "30px", fontSize: 13, color: 'rgba(0,90,189,0.8)' }}>
                                共{limits}条信息
                            </span>
                            <Pagination
                                className="22"
                                total={limits}
                                showSizeChanger
                                current={query.page + 1}
                                pageSizeOpts={[10, 20, 30, 40]}
                                onChange={(currentPage, pageSize) => {
                                    setQuery({ limit: pageSize, page: currentPage - 1 });
                                    page.current = currentPage - 1
                                    setSelected([])
                                }}
                            />
                        </div>
                    </div>
                </div>
            </div>
            {//映射关系弹框
                systemModal ?
                    <SystemModal
                        open={true}
                        anxincloudList={anxincloudList}
                        systemEdit={systemEdit}
                        peplist={peplist}
                        appList={appList}
                        pepname={pepname}
                        anxincloudArr={anxincloudArr}
                        pepProjectId={pepProjectId}
                        anxinDelete={anxinDelete}
                        mapping={mapping}
                        appArr={appArr}
                        bindId={bindId}
                        editData={editData}
                        maintenancePeriod={maintenancePeriod}
                        cancel={() => {
                            setSystemModal(false);
                            setEditData({})
                        }}
                        close={() => {
                            setSystemModal(false);
                            getProjectPomsList()
                            getPepProject()
                            setEditData({})
                        }} >
                    </SystemModal> : ''
            }
            {
                anomalePointModal ? <AnomalePointModal
                    projectData={projectData}
                    cancel={() => {
                        setAnomalePointModal(false);
                    }}
                    open={true}
                ></AnomalePointModal> : ""
            }
        </>
    )
}

function mapStateToProps (state) {
    const { auth, global, ProjectPoms } = state;
    return {
        loading: ProjectPoms.isRequesting,
        user: auth.user,
        actions: global.actions,
        //   members: members.data,
    };
}

export default connect(mapStateToProps)(Example);
