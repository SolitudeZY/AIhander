import React, { useEffect, useRef, useState } from 'react';
import { connect } from 'react-redux';
import { Skeleton, Button, Pagination, Tag, Popconfirm, Table, Tooltip, Input, message } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { SkeletonScreen, } from "$components";
import moment from "moment";
import AutomaticModal from '../components/automatic-Modal'
import SimpleBar from 'simplebar-react';

let getDTimeout
const AutomaticReport = ({ dispatch, actions, user, clientHeight, loading, generateloading, socket, projectPoms, pepProjectId }) => {

    const { service, } = actions;

    const [query, setQuery] = useState({ limit: 10, page: 0 }); //页码信息
    const [limits, setLimits] = useState()//总数
    const mylimits = useRef(); //每页实际条数
    const [automaticModal, setAutomaticModall] = useState(false)  //弹框
    const [eidtData, setEidtData] = useState({})  //是否改变

    const [tableData, setTableData] = useState([])  //表格数据
    const [projectList, setProjectList] = useState([])  //项目数据
    const [projectId, setProjectId] = useState()  //项目id
    const [projectSearch, setProjectSearch] = useState()  //项目搜索
    const [keyword, setKeyword] = useState()  //报表关键字
    const [id, setId] = useState()
    const [init, setInit] = useState(true)

    const page = useRef(query.page);//哪一页

    useEffect(() => {
        return () => {
            if (getDTimeout) {
                clearTimeout(getDTimeout)
            }
        }
    }, [])

    useEffect(() => {
        if (projectPoms?.length) {
            let dataList = projectPoms?.filter(v => v.pepProjectIsDelete != 1 && (!pepProjectId || (pepProjectId?.length > 0 ? pepProjectId?.split(',')?.map(s => Number(s.id))?.includes(v.id) : pepProjectId)))
            setProjectList(dataList)
            getData({ limit: 10, page: 0 })
            setQuery({ limit: 10, page: 0 })
        }
    }, [projectPoms, pepProjectId, projectSearch])



    const getData = (data = {}) => {
        if (getDTimeout) {
            clearTimeout(getDTimeout)
        }
        function getAutomaticReport () {
            dispatch(service.getAutomaticReport({ projectId: pepProjectId, ...query, keyword, ...data })).then((res) => {
                if (res.success) {
                    setInit(false)
                    setTableData(res.payload.data?.rows)
                    setLimits(res.payload.data?.count)
                    setId("")
                }
                getDTimeout = setTimeout(getAutomaticReport, 6000)
            })
        }
        getAutomaticReport()
    }

    const columns = [{
        title: "序号",
        dataIndex: "index",
        key: 'index',
        render: (txet, row, index) => index + 1
    }, {
        title: "报表名称",
        dataIndex: "reportName",
        key: 'reportName',
    }, {
        title: "所属项目",
        dataIndex: "projectId",
        key: 'projectId',
        render: (_, row) => {
            let project = projectPoms?.find(s => s.id == row?.projectId)
            return project?.name || project?.pepProjectName || '--'
        }
    }, {
        title: "报表类型",
        dataIndex: "reportType",
        key: 'reportType',
    }, {
        title: "最近生成时间",
        dataIndex: "time",
        key: 'time',
        render: (txet, row) => {
            return txet ? moment(txet).format('YYYY-MM-DD HH:mm:ss') : '--'
        }
    }, {
        title: "操作",
        dataIndex: "text",
        key: 'text',
        render: (_, row) => {
            return (
                <div style={{ display: "flex" }}>
                    <Button theme="borderless" onClick={() => {
                        setEidtData(row)
                        setAutomaticModall(true)
                    }}>
                        编辑
                    </Button>
                    <Popconfirm
                        title="确定删除该报表生成规则吗？"
                        arrow={{ pointAtCenter: false }}
                        showArrow={true}
                        position="topRight"
                        onConfirm={() => {
                            dispatch(service.delAutomaticReport(row.id)).then((res) => {
                                if (res.success) {
                                    setQuery({ limit: 10, page: 0 })
                                    getData({ limit: 10, page: 0, keyword: keyword })
                                }
                            })
                        }}
                    >
                        <Button theme="borderless" type='danger'>删除</Button>
                    </Popconfirm>
                    <Button theme="borderless" loading={(id == row?.id && generateloading) || row?.runState == 'runing' ? true : false} onClick={() => {
                        setId(row?.id)
                        // WSDJC(温湿度监测) 1002
                        // FSFXJC(风速风向监测)  1001
                        // SSFJC(伸缩缝监测)  4009
                        // SLJC(索力监测)   2001
                        // YBJC(应力应变监测)   3001  3003
                        // NDJC(挠度监测)    4004
                        // ZDJC(振动监测)    5002
                        // CLZHJC(车辆载荷监测)
                        // ZZWYJC(支座位移监测)  4001
                        // QTPWJC(桥塔偏位监测)  4002
                        // LFJC(裂缝监测)    4008
                        // QDQXJC(桥墩倾斜监测)   4007
                        // JGWDJC(结构温度监测)  1004
                        let dataList = {
                            1002: 'WSDJC',
                            1001: 'FSFXJC',
                            4009: 'SSFJC',
                            2001: 'SLJC',
                            3001: 'YBJC',
                            3003: 'YBJC',
                            4004: 'NDJC',
                            5002: 'ZDJC',
                            4001: 'ZZWYJC',
                            4002: 'QTPWJC',
                            4008: 'LFJC',
                            4007: 'QDQXJC',
                            1004: 'JGWDJC',
                            2002: 'CLZHJC'
                        }
                        // row?.factors?.forEach(d => {
                        //    d.codeName = dataList[d.codeName]
                        // })
                        dispatch(service.postGenerateReport({ ...row, structId: "" })).then((res) => {
                            if (res.success) {
                                setQuery({ limit: 10, page: 0 })
                                getData({ limit: 10, page: 0, keyword: keyword })
                            }
                        })
                        message.info('报表生成中，请耐心等待')
                    }}>
                        立即生成
                    </Button>
                </div>
            );
        },
    },
    ]

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


    return (
        <>
            <div style={{ background: '#FFFFFF', margin: '8px 12px', padding: '20px 20px 0px 20px', }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div style={{ width: 0, height: 20, borderLeft: '3px solid #005ABD', borderTop: '3px solid transparent', borderBottom: '3px solid transparent' }}></div>
                    <div style={{ fontFamily: "YouSheBiaoTiHei", fontSize: 24, color: '#101531', marginLeft: 8 }}>自动化报表</div>
                    <div style={{ marginLeft: 6, fontSize: 12, color: '#969799', fontFamily: "DINExp", }}>AUTOMATIC REPORT</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '16px 0' }}>
                    <Button theme='solid' type='secondary' onClick={() => {
                        setAutomaticModall(true)
                    }}>新增报表生成规则</Button>
                    <div>
                        <Input style={{ width: 220, marginRight: 20 }} value={keyword} placeholder='请输入报表关键字' onChange={(e) => {
                            setKeyword(e)
                        }} />
                        <Button theme='solid' type='secondary' onClick={() => {
                            setQuery({ limit: 10, page: 0 })
                            getData({ limit: 10, page: 0, keyword: keyword })
                        }}>查询</Button>
                    </div>

                </div>

                <Skeleton
                    loading={init && loading}
                    // loading={false}
                    active={true}
                    placeholder={SkeletonScreen()}
                >
                    <Table
                        rowKey="name"
                        columns={columns}
                        dataSource={tableData}
                        bordered={false}
                        hideExpandedColumn={false}
                        empty="暂无数据"
                        pagination={false}
                        onRow={handleRow}
                    />
                </Skeleton>
                {limits > 0 && <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        padding: "20px 20px",
                    }}
                >
                    <div>
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
                                getData({ limit: pageSize, page: currentPage - 1 })
                            }}
                        />
                    </div>
                </div>}
            </div>
            {//推送配置弹框
                automaticModal ?
                    <AutomaticModal
                        open={true}
                        projectList={projectList}
                        eidtData={eidtData}
                        close={() => {
                            setAutomaticModall(false);
                            setEidtData({})
                        }}
                        success={() => {
                            setQuery({ limit: 10, page: 0 })
                            getData({ limit: 10, page: 0, keyword: keyword })
                        }}
                    /> : ''
            }
        </>
    )
}

function mapStateToProps (state) {
    const { auth, global, automaticReport, generateReport, ProjectPoms } = state;
    return {
        loading: automaticReport.isRequesting,
        user: auth.user,
        actions: global.actions,
        pepProjectId: global.pepProjectId,
        clientHeight: global?.clientHeight,
        projectPoms: ProjectPoms?.data?.rows,
        generateloading: generateReport.isRequesting,
    };
}

export default connect(mapStateToProps)(AutomaticReport);
