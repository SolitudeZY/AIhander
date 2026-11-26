import React, { useEffect, useState } from 'react'
import { connect } from 'react-redux'
import { ExclamationCircleOutlined } from '@ant-design/icons'
import { Button, Form, Modal, Skeleton, Pagination, Input, Tooltip } from 'antd';
import Statistics from '../components/statistics'
import TableData from '../components/tableData'
import Drawers from '../components/sideSheet'
import { Setup, OutHidden } from "$components";
import moment from "moment";

import '../style.less'
import { request } from 'screenfull';
import { useRef } from 'react';
import { render } from 'less';

const DataAlarm = (props) => {
    const { match, dispatch, actions, user, loading, socket, iotVcmpWeb } = props
    let route = match.url.substring(match.url.lastIndexOf("/") + 1, match.url.length)

    const { problem } = actions
    const [abnormalLenght, setAbnormalLenght] = useState(0)  //异常数量
    const [collect, setCollect] = useState([])  //搜索结构
    const [setup, setSetup] = useState(false);  //表格设置是否显现
    const [tableSetup, setTableSetup] = useState([]);  //单一表格设置信息
    const [exhibition, setExhibition] = useState([]);  //表格结构
    const [anomaly, setAnomaly] = useState();  //单条异常对应的图片
    const [pictures, setPictures] = useState(false);  //单条异常对应的图片是否显示
    const [confirm, setConfirm] = useState(false);  //表格确认弹框
    const [ifBulk, setIfBulk] = useState(false);  //是否批量确认
    const [content, setContent] = useState(false);  //确认内容
    const [selected, setSelected] = useState([])  //表格被勾选项
    const [genre, setGenre] = useState([])  //搜索类型
    const [statusId, setStatusId] = useState([])  //异常类型
    const [checkPop, setCheckPop] = useState(false)  //查看弹框是否显现
    const [alarmId, setAlarmId] = useState(false)  //查看alarmId
    const [query, setQuery] = useState({ limit: 10, page: 0 })  //分页
    const [tableData, setTableData] = useState([])  //表格数据
    const [videoModal, setVideoModal] = useState(false)  //视频播放弹框
    const [videoData, setVideoData] = useState({})  //视频播放参数
    const [videoToken, setVideoToken] = useState()  //视频token

    const InputApi = useRef('')

    const tableType = { dataLnterrupt: 'dataLnterrupt', dataAbnormal: 'dataAbnormal', strategyHit: 'strategyHit', videoAbnormal: 'videoAbnormal', useAbnormal: 'useAbnormal', deviceAbnormal: 'deviceAbnormal' }
    const statistic = { dataLnterrupt: '数据中断统计', dataAbnormal: '数据异常统计', strategyHit: '策略命中统计', videoAbnormal: '视频异常统计', useAbnormal: '应用半自动化巡检', deviceAbnormal: '设备异常统计' }

    useEffect(() => {
        if (route) {
            //初始化表格显示设置
            let data = columns[route]
            localStorage.getItem(tableType[route]) == null
                ? localStorage.setItem(
                    tableType[route],
                    JSON.stringify(data)
                )
                : "";
        }
        attribute(tableType[route], route);

        //视频平台token
        if (route == 'videoAbnormal') {
            dispatch(problem.getVcmpAuth({})).then((res) => {
                if (res.success) setVideoToken(res.payload.data?.token)
            })
        }
    }, [])

    //搜索结构      
    const collectData = {
        dataLnterrupt: [  //数据中断(dataLnterrupt)
            { name: '搜索', field: '1' },
            // {
            //    name: '中断类型', field: 'groupUnitId',
            //    data: genre
            // },
            {
                name: '中断状态', field: 'state',
                data: [
                    { name: '当前', value: 'new' },
                    { name: '历史', value: 'histroy' }]
            },
            // {
            //    name: '异常类型', field: 'onlineState',
            //    data: [
            //       { name: '离线', value: 'offline' }]
            // }
        ],
        dataAbnormal: [    //数据异常(dataAbnormal)
            { name: '搜索', field: '1' },
            {
                name: '异常类型', field: 'groupUnitId',
                data: genre, special: true
            },
            {
                name: '异常状态', field: 'state',
                data: [
                    { name: '当前', value: 'new' },
                    { name: '历史', value: 'histroy' }]
            }],
        // strategyHit: [   // 策略命中(strategyHit)
        //    { name: '搜索', field: '1' },
        //    {
        //       name: '策略类型', field: 'groupUnitId',
        //       data: genre
        //    },
        //    {
        //       name: '命中状态', field: 'state',
        //       data: [
        //          { name: '当前', value: 'new' },
        //          { name: '历史', value: 'histroy' }]
        //    }],
        videoAbnormal: [   // 视频异常(videoAbnormal)
            { name: '搜索', field: '1' },
            {
                name: '设备类型', field: 'kindId',
                data: genre,
            },
            {
                name: '异常类型', field: 'statusId',
                data: statusId,
            },
            {
                name: '异常状态', field: 'state',
                data: [
                    { name: '当前', value: 'new' },
                    { name: '历史', value: 'histroy' }]
            }],
        useAbnormal: [    // 应用异常(useAbnormal) 
            { name: '搜索', field: 'keyword' },
            {
                name: '异常类型', field: 'errType',
                data: [
                    { name: '接口报错', value: 'apiError ' },
                    { name: '加载超时', value: 'timeout' },
                    { name: '元素异常', value: 'element' }]
            },
            {
                name: '异常状态', field: 'state',
                data: [
                    { name: '当前', value: 'new' },
                    { name: '历史', value: 'histroy' }]
            }],
        // deviceAbnormal: [     // 设备告警(deviceAbnormal)
        //    { name: '搜索', field: '1' },
        // {
        //    name: '设备类型', field: 'groupUnitId',
        //    data: genre
        // },
        // {
        //    name: '异常状态', field: 'state',
        //    data: [
        //       { name: '当前', value: 'new' },
        //       { name: '历史', value: 'histroy' }]
        // },
        // {
        //    name: '异常类型', field: 'onlineState',
        //    data: [
        //       { name: '离线', value: 'offline' }]
        // }
        // ],
        common: {
            name: '告警时间',
            field: 'time'
        }
    }

    //表格设置信息
    const tableList = {
        dataLnterrupt: ['index', 'projectName', 'StructureName', 'SourceName', 'AlarmGroupUnit', 'AlarmCodeName', 'station', 'venderName', 'sustainTime', 'createTime', 'AlarmContent', 'CurrentLevel', 'updateTime', 'detailCount', 'confirm', 'confirmTime',],
        dataAbnormal: ['index', 'projectName', 'StructureName', 'SourceName', 'type', 'createTime', 'sustainTime', 'State', 'AlarmContent', 'AlarmCodeName', 'CurrentLevel', 'updateTime', 'detailCount', 'confirm', 'confirmTime'],
        // strategyHit: ['index', 'projectName', 'StructureName', 'SourceName', 'Strategy', 'State', 'createTime', 'sustainTime', 'AlarmContent', 'CurrentLevel', 'updateTime', 'detailCount', 'confirm', 'confirmTime'],
        videoAbnormal: ['index', 'projectName', 'StructureName', 'SourceName', 'station', 'cameraKindId', 'sustainTime', 'venderName', 'point', 'cameraSerialNo', 'cameraChannelNo', 'platform', 'AlarmContent', 'resolve', 'createTime', 'updateTime', 'confirm', 'confirmTime',],
        useAbnormal: ['index', 'projectName', 'appName', 'url', 'type', 'alarmContent', 'createTime', 'sustainTime', 'updateTime', 'confirm', 'confirmTime'],
        // deviceAbnormal: ['index', 'projectName', 'StructureName', 'SourceName', 'station', 'sustainTime', 'venderName', 'AlarmContent', 'AlarmCodeName', 'createTime', 'updateTime', 'confirm', 'confirmTime'],
    }
    //表格默认配置信息
    const columns = {
        dataLnterrupt: ['projectName', 'StructureName', 'SourceName', 'AlarmGroupUnit', 'AlarmContent', 'AlarmCodeName', 'createTime', 'updateTime',],
        dataAbnormal: ['projectName', 'StructureName', 'SourceName', 'AlarmContent', 'AlarmCodeName', 'createTime', 'updateTime'],
        // strategyHit: ['projectName', 'StructureName', 'SourceName', 'Strategy', 'AlarmContent', 'CurrentLevel', 'detailCount', 'updateTime'],
        videoAbnormal: ['projectName', 'StructureName', 'SourceName', 'venderName', 'cameraKindId', 'AlarmContent', 'createTime', 'updateTime'],
        useAbnormal: ['appName', 'projectName', 'url', 'type', 'alarmContent', 'createTime', 'updateTime'],
        // deviceAbnormal: ['projectName', 'StructureName', 'SourceName', 'station', 'AlarmContent', 'createTime', 'updateTime'],
    }



    //所有表格信息
    const columnAll = [
        {

        },
        {
            name: "序号", sort: 1, value: "index", render: (_, r, index) => {
                return index + 1;
            },
        },
        { name: '问题编号', sort: 1, value: 'serialNumber', render: (_, r, index) => r.serialNumber },
        {
            name: '项目名称', sort: 3, value: 'projectName', render: (_, r, index) => {
                return <>
                    {r.projectName?.map((v, index) => {
                        return v.name ? <div key={r.id + v.name + index} style={{ width: 176, marginBottom: 8 }}>
                            {OutHidden({
                                number: 7,
                                name: v.name
                            })}
                            <div style={{
                                width: 58, background: v.state == 'PMOS' ? 'linear-gradient(rgb(153, 199, 221) 0%, rgb(48, 72, 252) 100%)' : 'linear-gradient(rgb(235, 245, 255) 0%, rgb(235, 245, 255) 0%, rgb(211, 232, 255) 100%)',
                                borderRadius: 2, display: "inline-block", marginLeft: 6
                            }}>
                                <img src={`/assets/images/install/${v.state == 'PMOS' ? 'icon_POMS' : 'icon_zhengque'}.png`} style={{ display: "inline-block", width: 10 }} />
                                <span style={{ display: "inline-block", color: v.state == 'PMOS' ? "rgb(255, 255, 255)" : "rgb(15, 126, 251)", width: 48, fontSize: 12, textAlign: "center" }}>{v.state}</span>
                            </div>
                        </div> : ""
                    })
                    }
                </>
            }
        },
        {
            name: '结构物名称', sort: 4, value: 'StructureName', render: (_, r, index) => {
                if (route == 'videoAbnormal') {
                    return r.StructureName?.map((v, index) => <div key={v.name + v.id} style={{ lineHeight: "22px" }}>{v.name}</div>)
                } else {
                    return r.StructureName
                }
            }
        },
        {
            name: '告警源', sort: 2, value: 'SourceName', render: (_, r, index) => {
                let data = ''
                if (route == 'dataLnterrupt' || route == 'dataAbnormal') {
                    data = '传感器'
                }
                if (route == 'strategyHit') data = '测点'
                return r.SourceName ? <div style={{ width: data ? 136 : 84, display: 'flex', justifyContent: 'space-between' }}>
                    <div style={{ display: "inline-block", width: 84, lineHeight: "20px" }}>{r.SourceName}</div>
                    {data ? <div style={{ display: "inline-block", width: 44, height: 18, lineHeight: '18px', textAlign: "center", border: '1px solid #0F7EFB', fontWeight: 400, color: '#0F7EFB', fontSize: 12 }}>{data}</div> : ""}
                </div> : "无"
            }
        },
        { name: '测点', sort: 4.1, value: 'point', render: (_, r, index) => r.station?.length > 0 ? r.station?.map(v => <div key={v.resolve + v.id} style={{ lineHeight: "22px" }}>{v.name}</div>) : "无" },
        { name: '中断类型', sort: 6, value: 'AlarmGroupUnit' },
        { name: '告警信息', sort: 5, value: 'AlarmContent' },
        { name: '常见原因', sort: 7, value: 'AlarmCodeName' },
        { name: '产生时间', sort: 22, value: 'createTime', render: (_, r, index) => <div style={{ width: 130 }}>{r.createTime || '无'}</div> },
        { name: '更新时间', sort: 23, value: 'updateTime', render: (_, r, index) => <div style={{ width: 130 }}>{r.updateTime || '无'}</div> },
        // { name: '服务器地址', sort: 12, value: '9' },
        {
            name: '告警等级', sort: 13, value: 'CurrentLevel', render: (_, r, index) => {
                let data = { 1: '一级', 2: '二级', 3: '三级' }
                return <div style={{ width: 52 }}>
                    <img src={`/assets/images/problem/${'CurrentLevel' + r.CurrentLevel}.png`} style={{ display: "inline-block", width: 18, marginRight: 6 }} />
                    {data[r.CurrentLevel]}
                </div>
            }
        },
        { name: '产生次数', sort: 19, value: 'detailCount', render: (_, r, index) => r.detailCount + '次' },
        {
            name: '确认信息', sort: 20, value: 'confirm', render: (_, r, index) => {
                return r.State == 3 || r.autoRestore || r.confirmAuto ? '无' : r.State == 4 ? r.confirm || '无' : r.confirmTime ? r.confirm || '无' : '未确认'
            }
        },
        { name: '确认/恢复时间', sort: 21, value: 'confirmTime', render: (_, r, index) => <div style={{ width: 130 }}>{r.confirmTime ? r.confirmTime : "无"}</div> },
        {
            name: '持续时间', sort: 19.5, value: 'sustainTime', render: (_, r, index) => {
                let time = moment(r.confirmTime || r.updateTime || moment().format("YYYY-MM-DD HH:mm:ss")).diff(moment(r.createTime), 'seconds')
                return time < 60 ? '< 1分钟' : time > 3600 ? Math.floor(time / 3600) + '小时' + Math.floor((time - Math.floor(time / 3600) * 3600) / 60) + '分钟' : Math.floor((time - Math.floor(time / 3600) * 3600) / 60) + '分钟'
            }
        },
        {
            name: '异常信息', sort: 14, value: 'alarmContent', render: (_, r, index) => {
                return <>{r.alarmContent}
                    {r.screenshot ? <img src="/assets/images/problem/anomaly.png" style={{ display: 'inline-block', width: 12 }} onClick={() => (setAnomaly(r.screenshot), setPictures(true))} /> : ""}
                </>
            }
        },
        { name: '异常原因', sort: 8, value: 'alarmType' },
        { name: '策略类型', sort: 6, value: 'Strategy' },
        {
            name: '异常状态', sort: 15, value: 'State', render: (_, r, index) => {
                if (r.State == 3 || r.State == 4) {
                    return '历史'
                }
                return '当前'
            }
        },
        {
            name: '位置信息', sort: 11, value: 'station', render: (_, r, index) => [1, 4, 5].includes(r.AlarmGroup) ? r.station : r.station?.length > 0 ? r.station?.map(v => <div key={v.resolve + v.id} style={{ lineHeight: "22px" }}>{v.position}</div>) : "无"
        },
        {
            name: '设备类型', sort: 6, value: 'cameraKindId', render: (_, r, index) => r.cameraKindId || '其他',
        },
        { name: '设备厂家', sort: 10, value: 'venderName', render: (_, r, index) => r.platform ? '未知' : r.venderName },
        { name: '通道号', sort: 10.1, value: 'cameraChannelNo' },
        { name: '序列号', sort: 10.2, value: 'cameraSerialNo' },
        {
            name: '接入方式', sort: 9, value: 'platform', render: (_, r, index) => {
                let accessType = { yingshi: "萤石云", nvr: "NVR", ipc: "IPC", cascade: "级联" }
                return accessType[r.platform] || '无'
            }
        },
        { name: '应用名称', sort: 2, value: 'appName' },
        { name: 'URL地址', sort: 16, value: 'url' },
        { name: '异常类型', sort: 6, value: 'type' },
        { name: '解决方案', sort: 17, value: 'resolve', render: (_, r, index) => r.resolve?.map(v => <div key={v.resolve + v.id} style={{ lineHeight: "22px" }}>{v.resolve}</div>) },
        {
            name: '在离线', sort: 18, value: 'camerOnline', render: (_, r, index) => {
                let data = { ON: '在线', ONLINE: "在线", OFF: "离线" }
                return data[r.camerOnline] || '未知'
            }
        },
        {
            name: '操作', sort: 25, value: 'text', render: (_, r, index) => {
                return <div style={{ width: 195 }}>
                    {r.State < 3 || route && ['videoAbnormal', 'useAbnormal'].includes(route) && !r.confirmTime ?
                        r.projectLocal ? '' :
                            <Button theme='borderless' style={{ width: 65 }} onClick={() => {
                                setConfirm(true)
                                setSelected([r.id])
                            }}>确认</Button>
                        : r.State == 3 || r.autoRestore || r.confirmAuto ?
                            <Button theme='borderless' style={{ width: 65 }} disabled>自动恢复</Button> :
                            <Button theme='borderless' style={{ width: 65 }} disabled>已确认</Button>
                    }
                    {route && ['dataLnterrupt', 'dataAbnormal', 'strategyHit', 'deviceAbnormal'].includes(route) ?
                        <>
                            {/* <Button theme='borderless' style={{ width: 65 }} disabled>已派单</Button> */}
                            {(r.AlarmGroup == 4 || r.AlarmGroup == 5) ? "" : <Button theme='borderless' style={{ width: 65 }} onClick={() => {
                                setCheckPop(true)
                                setAlarmId(r.id)
                            }}>查看</Button>}
                        </>
                        : route == 'videoAbnormal' ? <>
                            {/* <Button theme='borderless' style={{ width: 65 }} disabled>已派单</Button> */}
                            <Button theme='borderless' style={{ width: 65 }} onClick={() => {
                                setVideoModal(true)
                                setVideoData({ channeNo: r.cameraChannelNo, serialNo: r.cameraSerialNo, type: r.platform, yingshiToken: r.yingshiToken })
                            }}>播放</Button>
                        </> : ""
                    }
                </div>
            }
        },
    ]


    const attribute = (name, route) => {
        let arr = localStorage.getItem(name)
            ? JSON.parse(localStorage.getItem(name))
            : [];

        if (route) {
            let setup = tableList[route].map(v => columnAll.find(vv => v == vv.value))

            let data = []
            // if (tableType[route] == 'dataAbnormal') {
            //    data = ['AlarmCodeName']
            //    data.splice(1, 0, ...arr)
            // } else {
            data.splice(1, 0, ...arr, 'text')
            // }


            // let TableDisplay = []

            let TableDisplay = data?.map(v => {
                let datas = columnAll?.find(vv => v == vv.value)
                if (datas) {
                    return { title: datas.name, sort: datas.sort, dataIndex: datas.value, rowKey: datas.value, render: datas.render }
                }

            })
            TableDisplay.sort((a, b) => a.sort - b.sort)

            setExhibition(TableDisplay)
            setTableSetup([{ list: setup }])
        }

        // for (let i = 0; i < arr.length; i++) {
        // let colum = column.filter((item) => {
        //    return item.key === arr[i];
        // });
        // columns.splice(i + 2, 0, colum[0]);
        // }
        // setSetupp(columns);
    }

    const getAlarmConfirmItems = () => {
        let confirmItems = [];
        selected.map(s => {
            let alarmInfo = tableData.find(td => td.id == s);
            let source = route == 'useAbnormal' ? alarmInfo.appName : alarmInfo.SourceName;
            let type = route == 'useAbnormal' ? alarmInfo.type : route == 'videoAbnormal' ? alarmInfo.AlarmContent : alarmInfo.AlarmGroupUnit;
            let item = {
                pepUserId: user.pomsUserInfo.pepUserId,
                projectCorrelationIds: alarmInfo?.projectName?.map(p => p.id),
                alarmInfo: {
                    id: alarmInfo.id,
                    source: source,//告警源
                    type: type,//异常类型            
                }
            }
            confirmItems.push(item);
        })
        return confirmItems;
    }
    return (
        // route=='dataLnterrupt'|| route=='dataAbnormal'|| route=='strategyHit'?
        <div style={{ minWidth: 1000 }}>
            {/* 滞留提醒 */}
            <div>
                {abnormalLenght > 0 ? <div style={{ height: 30, fontSize: 12, display: 'flex' }}><ExclamationCircleOutlined /><div>当前滞留5个工单即将超时，请尽快处理！</div></div> : ""}
            </div>
            <Statistics
                route={route}
                tableType={tableType}
                statistic={statistic}
            />
            <TableData
                route={route}
                collectData={collectData}
                setSetup={setSetup}
                exhibition={exhibition}
                setConfirm={setConfirm}
                setIfBulk={setIfBulk}
                selected={selected}
                setSelected={setSelected}
                setGenre={setGenre}
                setStatusId={setStatusId}
                query={query}
                setQuery={setQuery}
                tableData={tableData}
                setTableData={setTableData}
                genre={genre}
                statusId={statusId}
                location={props.location?.query}
            />
            {setup ? (
                <Setup
                    tableType={tableType[route]}
                    tableList={tableSetup}
                    close={() => {
                        setSetup(false);
                        attribute(tableType[route], route);
                        // setcameraSetup(false);
                    }}
                />
            ) : (
                ""
            )}
            {pictures ? <Modal
                hasCancel={false}
                closable={false}
                open={true}
                footer=''
                width={837}
                onCancel={() => setPictures(false)}
            >
                <img src={`/_file-server/${anomaly}`}
                    style={{ width: 789, height: 359, }}
                />
            </Modal> : ""}

            {confirm ? <Modal
                title={ifBulk ? '批量确认' : "确认"}
                open={true}
                width={600}
                onCancel={() => setConfirm(false)}
                onOk={() => {
                    let confirmPost = getAlarmConfirmItems();
                    if (route == 'useAbnormal') {
                        InputApi.current.validate().then((v) => {
                            dispatch(problem.postApiConfirm({ appAlarmId: selected, confirm: content, confirmPost })).then(res => {
                                if (res.success) {
                                    setConfirm(false)
                                    setSelected([])
                                    setQuery({ limit: query.limit, page: query.page })
                                }
                            })
                        })
                    } else if (route == 'videoAbnormal') {
                        InputApi.current.validate().then((v) => {
                            dispatch(problem.putAlarmVideoConfirm({ alarmId: selected, content: content, confirmPost })).then(res => {
                                if (res.success) {
                                    setConfirm(false)
                                    setSelected([])
                                    let data = tableData?.map(v => {
                                        if (selected.find(vv => vv == v.id)) {
                                            return { ...v, confirm: content, confirmTime: moment().format("YYYY-MM-DD HH:mm:ss"), State: 4 }
                                        } else {
                                            return { ...v }
                                        }
                                    }) || tableData
                                    setTableData(data)
                                    setSelected([])
                                    // setQuery({ limit: query.limit, page: query.page })
                                }
                            })
                        })
                    } else {
                        InputApi.current.validate().then((v) => {
                            dispatch(problem.putAlarmdataConfirm({ alarmId: selected, content: content, confirmPost })).then(res => {
                                if (res.success) {
                                    setConfirm(false)
                                    let data = tableData?.map(v => {
                                        if (selected.find(vv => vv == v.id)) {
                                            return { ...v, confirm: '告警确认：' + content, confirmTime: moment().format("YYYY-MM-DD HH:mm:ss"), State: 4 }
                                        } else {
                                            return { ...v }
                                        }
                                    }) || tableData
                                    setTableData(data)
                                    setSelected([])
                                }
                            })
                        })
                    }
                }}
            >
                <div style={{ paddingLeft: 20 }}>
                    <Form
                        // onSubmit={(values) => console.log(values)}
                        getFormApi={(formApi) => (InputApi.current = formApi)}
                    >
                        <Form.Input maxCount={500} allowClear
                            label='确认信息'
                            labelPosition="left"
                            rules={[{ required: true, message: "请输入确认信息" }]}
                            field='textData'
                            onChange={(e) => setContent(e)} />
                    </Form>
                    {route == 'videoAbnormal' ? (() => {
                        let data
                        if (selected.length == 1) {
                            data = tableData.find(v => v.id == selected[0])
                        }
                        return data ? <div style={{ width: 450, marginLeft: 80, background: '#FFF6E9', fontWeight: 400, color: '#FE9812', fontSize: 13 }}>
                            当前告警源-{data?.SourceName}，在项目{data?.projectName?.map((v, index) => {
                                if (index > 0) {
                                    return '、' + v.name
                                } else {
                                    return v.name
                                }
                            })}中被多次绑定（可能拥有不同的名称），确认后，该设备的同类型告警也会被一同确认。</div> : ""
                    })() : ""}
                </div>
            </Modal> : ""}

            {/* 视频的播放 */}
            {videoModal ? <Modal
                open={true}
                header={null}
                footer={null}
                size={'large'}
                style={{ padding: 0 }}
                styles={{ body: { padding: 0 } }}
                className="videoModal"
                onCancel={() => setVideoModal(false)}
                onOk={() => {


                }}
            >
                <div style={{ width: 918, height: 460, marginLeft: -24 }}>
                    <iframe
                        allowFullScreen
                        src={`${iotVcmpWeb}/video_play_cross?videoObj=${encodeURIComponent(JSON.stringify({
                            channelNo: videoData.channeNo,
                            // content: ['5442542542', '452345', '234524525'],
                            serialNo: videoData.serialNo,
                            type: videoData.type,
                            yingshiToken: videoData.yingshiToken,
                            videoToken: videoToken,
                            // type: 'cascade',
                            // serialNo: '34020000001310000003', // 设备序列号 必须
                            // topSerialNo: '34020000001110000079', // 设备顶级序列号 必须
                            // audio: true,
                            // highDefinition: true,
                            // cloudControl: true,
                            // // playUrlSd: 'wss://221.230.55.27:8082/jessica/34020000001110000079/34020000001310000003.flv', // 必须
                            // playUrlSd: 'wss://221.230.55.27:8082/jessica/34020000001110000075/34020000001110000073.flv', // 必须
                        }))}`}
                        style={{ height: "100%", width: "100%" }}
                        frameBorder={0}
                    >
                        <p>你的浏览器不支持 iframe。</p>
                    </iframe>
                </div>

            </Modal> : ""}

            {checkPop ?
                <Drawers
                    alarmId={alarmId}
                    close={() => {
                        setCheckPop(false)
                    }}
                /> : ""
            }
        </div>
        // :<Set />
    )
}

function mapStateToProps (state) {
    const { auth, global, members, webSocket } = state
    return {
        // loading: members.isRequesting,
        user: auth.user,
        actions: global.actions,
        iotVcmpWeb: global.iotVcmpWeb,
        // members: members.data,
        // socket: webSocket.socket
    }
}

export default connect(mapStateToProps)(DataAlarm)
