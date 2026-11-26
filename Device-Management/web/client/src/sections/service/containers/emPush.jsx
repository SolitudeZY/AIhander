import React, { useEffect, useRef, useState } from 'react';
import { connect } from 'react-redux';
import { Skeleton, Button, Pagination, Form, Popconfirm, Table, Tooltip } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { SkeletonScreen, } from "$components";
import moment from "moment";
import PushModal from '../components/pushModal'
import '../style.less'
import { Setup } from "$components";

const EmPush = (props) => {
    const form = useRef();//表单
    const { dispatch, actions, user, loading, socket } = props
    const { service, problem } = actions;
    const [setup, setSetup] = useState(false);  //表格设置是否显现
    const [setupp, setSetupp] = useState([]);//实际显示的表格列表
    const [query, setQuery] = useState({ limit: 10, page: 0 }); //页码信息
    const [limits, setLimits] = useState()//每页实际条数
    const mylimits = useRef(); //每页实际条数
    const [pushModal, setPushModal] = useState(false)  //信鸽弹框
    const [pushEdit, setPushEdit] = useState(false)  //是否是修改
    const [change, setChange] = useState(false)  //是否改变
    const [allTableData, setAllTableData] = useState([])  //获取到的所有表格信息
    const [editObj, setEditObj] = useState({});//管理员弹框修改内容
    const [projectStatus, setProjectStatus] = useState([]); //获取项目状态列表
    const [subTypeData, setSubTypedata] = useState({
        data_outages: [],
        data_exception: [],
        // strategy_hit: [],
        video_exception: [],
        app_exception: [],
        // device_exception: [],
    }); //数据类监听模块中的子类
    const page = useRef(query.page);//哪一页
    const EMPUSH = "empush";
    const tableList = [//表格属性
        {
            title: '推送信息',
            list: [
                { name: "关联项目", value: "projectName" },
                { name: "策略名称", value: "name" },
                { name: "创建时间", value: "createTime" },
                { name: "接收人", value: "receiverPepUser" },
                { name: "推送方式", value: "pushType" },
                { name: "监听问题模块", value: "alarmType" },
                // { name: "生效项目节点", value: "timeType" },
                { name: "推送机制", value: "tactics" },
                { name: "启用状态", value: "disable" },
                { name: "推送次数", value: "pushCount" },
            ]
        },
    ];
    const alarmTypeObj = {
        data_outages: '数据中断',
        data_exception: '数据异常',
        strategy_hit: '策略命中',
        video_exception: '视频异常',
        app_exception: '应用异常',
        device_exception: '设备异常',
    }
    const tacticsObj = {
        immediately: '即时推送机制',
        continue: '持续时长推送机制',
        abnormal_rate: '异常率推送机制',
    }


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

    useEffect(() => {
        localStorage.getItem(EMPUSH) == null
            ? localStorage.setItem(
                EMPUSH,
                JSON.stringify(['projectName', 'name', 'createTime', 'receiverPepUser', 'alarmType', 'timeType', 'tactics', 'disable'])
            )
            : "";
        getProjectStatusList()
        getPushList(query);

        //数据异常异常类型子类
        dispatch(problem.getAlarmDataGroup({ showAll: 'true' })).then(async (res) => {
            if (res.success) {
                let data = { ...subTypeData }
                res.payload.data?.map(v => {
                    if ([1, 4, 5].includes(v.id)) {
                        data['data_outages'] = data['data_outages'].concat(v.unit)
                    } else if (v.id === 2 || v.id == 3) {
                        data['data_exception'] = data['data_exception'].concat(v.unit)
                    }
                })
                //视频异常异常类型子类
                await dispatch(problem.getAlarmVideoDeviceKind({ showAll: true })).then((res) => {
                    if (res.success) {
                        data['video_exception'] = data['video_exception'].concat(res.payload.data)
                    }
                })
                await dispatch(problem.getExceptionTypeCheck({ userId: user?.id, })).then(res => {
                    if (res.success) {
                        data['data_exception'] = data['data_exception']?.filter(d => (res.payload.data?.typeId || [8, 40, 41, 48, 49]).includes(d.id))
                    }
                })
                data['app_exception'] = data['app_exception'].concat([{ id: 'apiError', name: "接口报错", }, { id: 'element', name: "元素异常", }, { id: 'timeout', name: "加载超时", },])
                setSubTypedata(data)
            }
        })
    }, [])

    useEffect(() => {
        let showTableData = JSON.parse(JSON.stringify(allTableData)).slice(query.page * query.limit, (query.page + 1) * query.limit)
        setTableData(showTableData)
        mylimits.current = showTableData.length
    }, [change]);

    function getPushList (query) {
        let val = form.current.getValues()
        dispatch(service.getPush({ keywordTarget: val?.keywordTarget })).then((res) => {//获取已绑定项目
            if (res.success) {
                // debugger
                let mytableDatas = JSON.parse(JSON.stringify(res.payload.data));
                for (let index = 0; index < mytableDatas.length; index++) {
                    mytableDatas[index].key = String(mytableDatas[index].id)
                }
                let mytableData = []
                if (val.keyword) {
                    // debugger
                    switch (val.keywordTarget) {
                        case 'pepProject':
                            // mytableData=mytableDatas
                            mytableData = mytableDatas?.filter(item => item?.pomsProject?.some(i => i?.name?.includes(val.keyword) || i?.pepProject?.projectName?.includes(val.keyword)))
                            break;
                        case 'struc':
                            mytableData = mytableDatas?.filter(item => item?.structure?.some(i => i?.name?.includes(val.keyword)))
                            break;
                        case 'tactics':
                            mytableData = mytableDatas.filter(item => item?.name?.includes(val.keyword))
                            break;
                        default:
                            break;
                    }
                } else {
                    mytableData = mytableDatas

                }
                setAllTableData(mytableData)
                let showTableData = mytableData.slice(query.page * query.limit, (query.page + 1) * query.limit)
                setTableData(showTableData)
                setQuery(query)
                setLimits(mytableData?.length)
                mylimits.current = showTableData.length
            }
        })
    }
    function getProjectStatusList () {//获取项目状态列表
        dispatch(service.getProjectStatus()).then((res) => {
            if (res.success) {
                setProjectStatus(res.payload?.data)
                attribute(res.payload?.data);
            }
        })
    }
    const columns = [//表格属性
        {
            title: "操作",
            width: "12%",
            dataIndex: "text",
            key: 'text',
            render: (_, row) => {
                return (
                    <div style={{ display: "flex" }}>
                        <Button
                            theme="borderless"
                            onClick={() => {
                                setEditObj(row)
                                setPushModal(true);
                                setPushEdit(true)
                            }}
                        >
                            修改
                        </Button>
                        {row?.disable ? (
                            <Button
                                theme="borderless"
                                style={{ color: '#F31C1C' }}
                                onClick={() => {
                                    dispatch(service.putPushPushId({ pushId: row?.id, del: false, disable: false, msg: '更改推送配置状态' })).then(() => {
                                        getPushList({ limit: query.limit, page: page.current });
                                    })
                                }}
                            >
                                已禁用
                            </Button>
                        ) : (
                            <Popconfirm
                                title="禁用后，通知策略将会失效。"
                                arrow={{ pointAtCenter: false }}
                                showArrow={true}
                                position="topRight"
                                onConfirm={() => {
                                    dispatch(service.putPushPushId({ pushId: row?.id, del: false, disable: true, msg: '更改推送配置状态' })).then(() => {
                                        getPushList({ limit: query.limit, page: page.current });
                                    })
                                }}
                            >
                                <Button theme="borderless">已启用</Button>
                            </Popconfirm>
                        )}
                        <Popconfirm
                            title="删除后通知策略将会失效。"
                            arrow={{ pointAtCenter: false }}
                            showArrow={true}
                            position="topRight"
                            onConfirm={() => {
                                dispatch(service.putPushPushId({ pushId: row?.id, del: true, disable: false, msg: '删除推送配置' })).then(() => {
                                    if (page.current > 0 && mylimits.current < 2) {
                                        getPushList({ limit: query.limit, page: page.current - 1 });
                                    } else {
                                        getPushList({ limit: query.limit, page: page.current });
                                    }
                                })
                            }}
                        >
                            <Button theme="borderless">删除</Button>
                        </Popconfirm>
                    </div>
                );
            },
        },
    ]
    function expandRowRender (record, index) {
        return (
            <div style={{}}>
                结构物：
                {
                    record.structure?.map((item, index) => {
                        return (
                            <span key={index} style={{
                                marginRight: 5, padding: '1px 17px', color: '#0F7EFB',
                                display: 'inline-block', marginBottom: 5
                            }}>
                                {item.name}
                            </span>
                        )
                    })
                }
            </div>
        )
    }
    //获取表格属性设置
    function attribute (val) {
        const arr = localStorage.getItem(EMPUSH)
            ? JSON.parse(localStorage.getItem(EMPUSH))
            : [];
        const column = [
            {
                title: '关联项目',
                dataIndex: "projectName",
                key: "projectName",
                render: (_, row) => {
                    let projectData = []
                    row.pomsProject?.map(v => {
                        projectData.push({
                            projectName: v.pepProject?.projectName,
                            name: v.name,
                            anxinerror: v.del,
                            constructionStatus: v.pepProject?.constructionStatus,
                        })
                    })
                    let anxinerror = false
                    let anxinerrorArr = ''
                    if (row.pomsProject.del == true) {
                        anxinerror = true
                        anxinerrorArr = row.pomsProject.pepProject?.projectName || row.pomsProject.name
                    }

                    return (
                        projectData.map((u, index) => <div key={'projecname' + index} style={{ display: 'flex', alignItems: 'center' }}>
                            {
                                u.anxinerror ? (
                                    <Tooltip content={(u.projectName || u.name) + ',项目已在【项企PEP】或【映射关系】中被删除，请重选项目！'}>
                                        <div style={{ marginRight: 5 }}>
                                            <img src="/assets/images/install/risk.png" alt="" style={{ height: 24, width: 24, }} />
                                        </div>
                                    </Tooltip>) : ('')
                            }
                            {
                                <div className='myseparator' style={{ display: 'flex', alignItems: 'center' }}>
                                    <Tooltip content={(u.projectName || u.name)}>
                                        <div style={{ width: u.projectName?.length > 7 || u.name?.length > 7 ? '112px' : '', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: row.pomsProject.del ? '#F93920' : '' }}>
                                            {u.projectName || u.name}
                                        </div>
                                    </Tooltip>
                                </div>
                            }
                            {
                                u.projectName ? (
                                    <div style={{
                                        height: 18, marginLeft: 4, width: 76,
                                        background: 'linear-gradient(180deg, #EBF5FF 0%, #EBF5FF 0%, #D3E8FF 100%)',
                                        borderRadius: 2, display: 'flex', alignItems: 'center'
                                    }}>
                                        <div>
                                            <img src="/assets/images/install/icon_zhengque.png" alt="" style={{ height: 10, width: 10, marginLeft: 4, marginRight: 9 }} />
                                        </div>
                                        <div style={{ color: '#0F7EFB', fontSize: 11, marginRight: 12 }}>
                                            {u.constructionStatus}
                                        </div>
                                    </div>
                                ) : (
                                    <div style={{
                                        height: 18, marginLeft: 4,
                                        background: 'linear-gradient(180deg, #99C7DD 0%, #3048FC 100%)',
                                        borderRadius: 2, display: 'flex', alignItems: 'center'
                                    }}>
                                        <div>
                                            <img src="/assets/images/install/icon_POMS.png" alt="" style={{ height: 10, width: 10, marginLeft: 4, marginRight: 9 }} />
                                        </div>
                                        <div style={{ color: '#FFFFFF', fontSize: 11, marginRight: 12 }}>
                                            POMS
                                        </div>
                                    </div>
                                )
                            }
                        </div>)
                    )
                }
            },
            {
                title: '策略名称',
                dataIndex: "name",
                key: 'name',
                render: (_, row) => {
                    return row.name
                }
            },
            {
                title: "创建时间",
                dataIndex: "createTime",
                key: "createTime",
                render: (_, r, index) => {
                    return moment(r.createTime).format('YYYY-MM-DD HH:mm:ss');
                },
            },
            {
                title: '接收人',
                dataIndex: "receiverPepUser",
                key: 'receiverPepUser',
                render: (_, row) => {
                    return (
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                            {
                                row.receiverPepUser.map((item, index) => {
                                    return (
                                        <div className='myseparator' key={index} style={{ display: 'flex', alignItems: 'center' }}>
                                            <div style={{ display: index > 1 ? 'none' : '', color: '#005ABD' }}>
                                                {item.name}
                                            </div>
                                            <div className='separator' style={{ width: 1, height: 12, border: '1px solid #DCDEE0', margin: '0px 10px', display: index > 0 ? 'none' : '' }}></div>
                                        </div>
                                    )
                                })
                            }
                            {
                                row.receiverPepUser.length > 2 ? (
                                    <Tooltip content={
                                        <div style={{ display: 'flex', flexWrap: 'wrap' }}>
                                            {
                                                row.receiverPepUser.map((item, index) => {
                                                    return (
                                                        <div key={index}>
                                                            {item.name},
                                                        </div>
                                                    )
                                                })
                                            }
                                        </div>
                                    } trigger="click" style={{ lineHeight: 2 }}>
                                        <div style={{ fontSize: 14, color: '#005ABD', marginLeft: 8, cursor: "pointer", }}>
                                            +{row.receiverPepUser.length - 2}
                                        </div>
                                    </Tooltip>
                                ) : ('')
                            }
                        </div>
                    )
                }
            },
            {
                title: "推送方式",
                dataIndex: "pushType",
                key: "pushType",
                render: (_, r, index) => {
                    return '邮件通知';
                },
            },
            {
                title: "监听问题模块",
                dataIndex: "alarmType",
                key: "alarmType",
                render: (_, row) => {
                    return (
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                            {
                                row.alarmType.map((item, index) => {
                                    return (
                                        <div className='myseparator' key={index} style={{ display: 'flex', alignItems: 'center' }}>
                                            <div style={{ display: index > 1 ? 'none' : '' }}>
                                                {alarmTypeObj[item]}
                                            </div>
                                            <div className='separator' style={{ width: 1, height: 12, border: '1px solid #DCDEE0', margin: '0px 10px', display: index > 0 ? 'none' : '' }}></div>
                                        </div>
                                    )
                                })
                            }
                            {
                                row.alarmType.length > 2 ? (
                                    <Tooltip content={
                                        <div style={{ display: 'flex', flexWrap: 'wrap' }}>
                                            {
                                                row.alarmType.map((item, index) => {
                                                    return (
                                                        <div key={index} >
                                                            {alarmTypeObj[item]},
                                                        </div>
                                                    )
                                                })
                                            }
                                        </div>
                                    } trigger="click" style={{ lineHeight: 2 }}>
                                        <div style={{ fontSize: 14, color: '#005ABD', marginLeft: 8, cursor: "pointer", }}>
                                            +{row.alarmType.length - 2}
                                        </div>
                                    </Tooltip>
                                ) : ('')
                            }
                        </div>
                    )
                }
            },
            // {
            //     title: "生效项目节点",
            //     dataIndex: "timeType",
            //     key: "timeType",
            //     render: (_, row, index) => {
            //         return (
            //             <div style={{ display: 'flex', alignItems: 'center' }}>
            //                 {
            //                     row.timeType.length > 0 ? (
            //                         row.timeType.map((item, index) => {
            //                             return (
            //                                 <div key={index} style={{
            //                                     height: 18, marginLeft: 4,
            //                                     background: 'linear-gradient(180deg, #EBF5FF 0%, #EBF5FF 0%, #D3E8FF 100%)',
            //                                     borderRadius: 2, display: index > 1 ? 'none' : 'flex', alignItems: 'center'
            //                                 }}>
            //                                     <div>
            //                                         <img src="/assets/images/install/icon_zhengque.png" alt="" style={{ height: 10, width: 10, marginLeft: 4, marginRight: 9 }} />
            //                                     </div>
            //                                     <div style={{ color: '#0F7EFB', fontSize: 11, marginRight: 12 }}>
            //                                         {
            //                                             val.map((ite, idx) => {
            //                                                 return (
            //                                                     <div key={idx}>
            //                                                         {ite.id == item ? ite.construction_status : ''}
            //                                                     </div>
            //                                                 )
            //                                             })
            //                                         }
            //                                     </div>
            //                                 </div>
            //                             )
            //                         })
            //                     ) : (
            //                         <div style={{
            //                             height: 18, marginLeft: 4,
            //                             background: 'linear-gradient(180deg, #99C7DD 0%, #3048FC 100%)',
            //                             borderRadius: 2, display: 'flex', alignItems: 'center'
            //                         }}>
            //                             <div>
            //                                 <img src="/assets/images/install/icon_POMS.png" alt="" style={{ height: 10, width: 10, marginLeft: 4, marginRight: 9 }} />
            //                             </div>
            //                             <div style={{ color: '#FFFFFF', fontSize: 11, marginRight: 12 }}>
            //                                 POMS
            //                             </div>
            //                         </div>
            //                     )
            //                 }
            //                 {
            //                     row.timeType.length > 2 ? (
            //                         <Tooltip content={
            //                             <div style={{ display: 'flex', flexWrap: 'wrap' }}>
            //                                 {
            //                                     row.timeType.map((item, index) => {
            //                                         return (
            //                                             <div key={index}>
            //                                                 {
            //                                                     val.map((ite, idx) => {
            //                                                         return (
            //                                                             <span key={idx}>
            //                                                                 {ite.id == item ? ite.construction_status : ''}
            //                                                             </span>
            //                                                         )
            //                                                     })
            //                                                 },
            //                                             </div>
            //                                         )
            //                                     })
            //                                 }
            //                             </div>
            //                         } trigger="click" style={{ lineHeight: 2 }}>
            //                             <div style={{ fontSize: 14, color: '#005ABD', marginLeft: 8, cursor: "pointer", }}>
            //                                 +{row.timeType.length - 2}
            //                             </div>
            //                         </Tooltip>
            //                     ) : ('')
            //                 }
            //             </div>
            //         )
            //     },
            // },
            {
                title: "推送机制",
                dataIndex: "tactics",
                key: "tactics",
                render: (_, r, index) => {
                    return tacticsObj[r.tactics]
                },
            },
            {
                title: "启用状态",
                dataIndex: "disable",
                key: "disable",
                render: (_, row, index) => {
                    let enableType = ''
                    if (row.disable) {
                        enableType = '禁用'
                    } else {
                        enableType = '已生效'
                        // let construcId = row.pomsProject?.map(v => (v.pepProject?.constructionStatusId || 'POMS')) || []
                        // if (construcId?.includes('POMS')) {
                        //     enableType = '已生效'
                        // } else {
                        //     let timeType = row.timeType?.map(Number) || []
                        //     for (let i = 0; i < timeType.length; i++) {
                        //         if (construcId?.includes(timeType[i])) {
                        //             enableType = '已生效'
                        //             break
                        //         } else {
                        //             enableType = '未生效'
                        //         }
                        //     }
                        // }
                    }
                    return (
                        <div style={{ textAlign: 'center', padding: '1px 17px', color: enableType == '禁用' ? '#FB0F0F' : enableType == '已生效' ? '#0F7EFB' : '#646566', background: enableType == '禁用' ? 'rgba(255,221,221,0.38)' : enableType == '已生效' ? 'rgba(221,237,255,0.38)' : 'rgba(192,192,192,0.38)', }}>
                            {enableType}
                        </div>
                    )
                },
            },
            {
                title: "推送次数",
                dataIndex: "pushCount",
                key: "pushCount",
                render: (_, r, index) => {
                    return (r.pushCount || 0) + '次'
                },
            },
        ];
        for (let i = 0; i < arr.length; i++) {
            let colum = column.filter((item) => {
                return item.key === arr[i];
            });
            columns.splice(columns.length - 1, 0, colum[0]);
        }
        setSetupp(columns);
    }
    return (
        <>
            <div style={{ background: '#FFFFFF', margin: '8px 12px', padding: '20px 20px 0px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <div style={{ width: 0, height: 20, borderLeft: '3px solid #005ABD', borderTop: '3px solid transparent', borderBottom: '3px solid transparent' }}></div>
                        <div style={{ fontFamily: "YouSheBiaoTiHei", fontSize: 24, color: '#101531', marginLeft: 8 }}>EM推送</div>
                        <div style={{ marginLeft: 6, fontSize: 12, color: '#969799', fontFamily: "DINExp", }}>Em push</div>
                    </div>
                    <div style={{ marginRight: 20, display: 'flex', alignItems: 'center' }} className='myempush'>
                        <Form
                            onSubmit={(values) => { }}
                            getFormApi={(formApi) => (form.current = formApi)}
                            layout="horizontal"
                            style={{ position: "relative", width: "100%", flex: 1, display: 'flex' }}
                        >
                            <Form.Select
                                pure
                                field="keywordTarget"
                                placeholder="请选择搜索类型"
                                style={{ width: 200 }}
                                initValue={"pepProject"}
                            >
                                <Select.Option value='pepProject'>项目</Select.Option>
                                <Select.Option value='struc'>结构物</Select.Option>
                                <Select.Option value='tactics'>策略名</Select.Option>
                            </Form.Select>
                            <Form.Input
                                suffix={<SearchOutlined />}
                                field="keyword"
                                pure
                                allowClear
                                style={{ width: 260, marginLeft: 12, marginRight: 12 }}
                                placeholder="请输入或选择关键词"
                            />
                            <Form.Select
                                label='推送机制:'
                                labelPosition="left"
                                field='tactics'
                                style={{ width: 116, marginRight: 10, color: "#F9F9F9", }}
                                placeholder="全部"
                                filter
                                allowClear
                            >
                                <Select.Option value="immediately">即时推送机制</Select.Option>
                                <Select.Option value="continue">持续时长推送机制</Select.Option>
                                <Select.Option value="abnormal_rate">异常率推送机制</Select.Option>
                            </Form.Select>
                            <Form.Select
                                label='启用状态:'
                                labelPosition="left"
                                field='state'
                                style={{ width: 116, marginRight: 10, color: "#F9F9F9", }}
                                placeholder="全部"
                                filter
                                allowClear
                            >
                                <Select.Option value='takeEffect'>已生效</Select.Option>
                                <Select.Option value='notYet'>未生效</Select.Option>
                                <Select.Option value='disable'>禁用</Select.Option>
                            </Form.Select>
                        </Form>
                        <Button
                            theme="solid"
                            type="primary"
                            style={{
                                width: 80,
                                height: 32,
                                borderRadius: 2,
                                marginRight: 32,
                                background: '#FFFFFF',
                                color: '#005ABD',
                                border: '1px solid #005ABD'
                            }}
                            onClick={() => {
                                getPushList({ limit: query.limit, page: 0 })
                            }}
                        >
                            查询
                        </Button>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                            <img title='设置' src="/assets/images/problem/setup.png" style={{ width: 18, height: 18, cursor: "pointer" }} onClick={() => setSetup(true)} />
                        </div>
                        <Button
                            theme="solid"
                            type="primary"
                            style={{
                                width: 136,
                                height: 32,
                                borderRadius: 2,
                                marginLeft: 32
                            }}
                            onClick={() => {
                                setPushModal(true);
                                setPushEdit(false);
                                setEditObj({})
                            }}
                        >
                            添加推送策略
                        </Button>
                    </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, marginTop: 5 }}>
                    <div style={{ fontSize: 12, color: '#8B8B8B' }}>EM推送提供对映射关系组的项目、结构物问题的监听和通知服务，支持对设备异常率、问题持续时间、即时响应等策略定义的动态推送。</div>
                </div>
                <div style={{ marginTop: 20 }}>
                    <Skeleton
                        loading={loading}
                        // loading={false}
                        active={true}
                        placeholder={SkeletonScreen()}
                    >
                        <Table
                            rowKey="name"
                            columns={setupp.filter((s) => s)}
                            dataSource={tableData}
                            bordered={false}
                            hideExpandedColumn={false}
                            empty="暂无数据"
                            expandedRowRender={expandRowRender}
                            pagination={false}
                            onRow={handleRow}
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
                                    setChange(!change)
                                }}
                            />
                        </div>
                    </div>
                </div>
            </div>
            {//推送配置弹框
                pushModal ?
                    <PushModal
                        open={true}
                        pushEdit={pushEdit}
                        editObj={editObj}
                        subTypeData={subTypeData}
                        cancel={() => {
                            setPushModal(false);
                        }}
                        close={() => {
                            setPushModal(false);
                            getPushList(query)
                        }} >
                    </PushModal> : ''
            }
            {setup ? (
                <Setup
                    tableType={EMPUSH}
                    tableList={tableList}
                    close={() => {
                        setSetup(false);
                        attribute(projectStatus);
                    }}
                />
            ) : (
                ""
            )}
        </>
    )
}

function mapStateToProps (state) {
    const { auth, global, getPush } = state;
    return {
        loading: getPush.isRequesting,
        user: auth.user,
        actions: global.actions,
        //   members: members.data,
    };
}

export default connect(mapStateToProps)(EmPush);
