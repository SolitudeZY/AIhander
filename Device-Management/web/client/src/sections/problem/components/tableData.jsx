import React, { useState, useEffect, useRef } from "react";
import { connect } from "react-redux";
import { Button, Form, Modal, Skeleton, Pagination, Table, Tooltip, message, Checkbox } from 'antd';
import { SkeletonScreen, } from "$components";
import moment from "moment";
const TableData = (
    { alarmDataGroup, route, dispatch, actions, collectData, setSetup, exhibition, pepProjectId,
        selected, setSelected, setIfBulk, setConfirm, genre, setGenre, query, setQuery, tableData, setTableData, location, user, statusId, setStatusId }
) => {
    const { problem } = actions

    const [count, setCount] = useState(0)  //
    const [checkAll, setCheckAll] = useState(true)  //查询
    const api = useRef();
    const search = useRef({
        state: 'new', keywordTarget: '', keyword: '', kindId: '', groupUnitId: '', statusId: '',
        errType: '', confirmState: '', onlineState: '', sustainTimeStart: '', sustainTimeEnd: ''
    })
    const kindName = useRef()
    const groupId = useRef()
    let title = { dataLnterrupt: "数据中断详情", dataAbnormal: "数据异常详情", strategyHit: "策略命中详情", videoAbnormal: "视频异常详情", useAbnormal: "应用异常详情", deviceAbnormal: "设备异常详情" }
    const [exportUrl, setExportUrl] = useState('')
    const [typeSet, setTypeSet] = useState(false)
    const [typeId, setTypeId] = useState([])
    const [check, setCheck] = useState([])


    useEffect(() => {
        switch (route) {
            case 'useAbnormal':
                dispatch(problem.getAlarmLnspectionApi({ ...search.current, pepProjectId: pepProjectId })).then((res) => {
                    if (res.success) {
                        let typeData = { element: "元素异常", apiError: "接口报错 ", timeout: "加载超时" }
                        let tableDatas = res.payload.data?.rows.map(v => ({
                            key: v.id,
                            id: v.id,
                            projectName: v.app?.projectCorrelations?.map(r => (r.name ? { id: r.id, name: r.name, state: 'PMOS' } : {
                                id: r.id, name: r.pepProject?.projectName, state: r.pepProject?.constructionStatus
                            }))?.filter(c => c),
                            appName: v.app?.name,
                            url: v.app?.url,
                            createTime: v.createTime ? moment(v.createTime).format("YYYY-MM-DD HH:mm:ss") : "",
                            updateTime: v.updateTime ? moment(v.updateTime).format("YYYY-MM-DD HH:mm:ss") : "",
                            confirmTime: v.confirmTime ? moment(v.confirmTime).format("YYYY-MM-DD HH:mm:ss") : "",
                            alarmContent: v.alarmContent || '无',
                            screenshot: v.screenshot,
                            type: v.type ? typeData[v.type] : "",
                            confirm: v.confirm,
                            confirmAuto: v.confirmAuto,
                            projectLocal: v.Project,
                        }))
                        setCount(tableDatas?.length || 0);
                        setTableData(tableDatas)
                    }
                })
                break;
            case 'videoAbnormal':
                dispatch(problem.getAlarmVideoList({ ...search.current, pepProjectId: pepProjectId })).then((res) => {
                    if (res.success) {
                        let tableDatas = res.payload.data?.map((v, index) => ({
                            key: v.AlarmId + index,
                            id: v.alarmId,
                            StructureName: v.struc,
                            projectName: v.pomsProject?.map(r => (r.name ? { id: r.id, name: r.name, state: 'PMOS' } : {
                                id: r.id, name: r.pepProject?.projectName, state: r.pepProject?.constructionStatus
                            }))?.filter(c => c),
                            createTime: v.createTime ? moment(v.createTime).format("YYYY-MM-DD HH:mm:ss") : "",
                            updateTime: v.updateTime ? moment(v.updateTime).format("YYYY-MM-DD HH:mm:ss") : "",
                            confirmTime: v.confirmTime ? moment(v.confirmTime).format("YYYY-MM-DD HH:mm:ss") : "",
                            SourceName: v.cameraName,
                            yingshiToken: v.yingshiToken,
                            AlarmContent: v.statusDescribe,
                            station: v.station || [],
                            resolve: v.resolve || [],
                            cameraChannelNo: v.cameraChannelNo,
                            cameraSerialNo: v.cameraSerialNo,
                            cameraKindId: v.cameraKindId ? kindName.current?.find(u => u.value == v.cameraKindId)?.name : "",
                            venderName: v.venderName,
                            platform: v.platform,
                            confirm: v.confirmContent,
                            camerOnline: v.camerOnline,
                            autoRestore: v.autoRestore,
                            projectLocal: v.Project,
                        }))
                        setCount(tableDatas?.length || 0);
                        setTableData(tableDatas)
                    }
                })
                break;
            default:
                if (genre?.length > 0 && (route === 'dataAbnormal' ? typeId?.length > 0 : true)) {
                    dispatch(problem.getAlarmDataList({
                        ...(route === 'dataLnterrupt' ? { timestamps: true } : {}),
                        ...query, ...(search.current || {}), groupId: groupId.current.map(v => v.id).join(), pepProjectId: pepProjectId,
                        ...((route === 'dataAbnormal' && !search.current?.groupUnitId) ? { groupUnitId: typeId?.length > 0 ? typeId?.join(',') : "", } : {}),
                    })).then((res) => {
                        if (res.success) {
                            setCount(res.payload.data?.count || 0)
                            let tableDatas = res.payload.data?.rows?.map((v, index) => (

                                {
                                    key: v.AlarmId + index,
                                    id: v.AlarmId,
                                    StructureName: v.StructureName,
                                    projectName: v.pomsProject?.map(r => (r.name ? { id: r.id, name: r.name, state: 'PMOS' } : {
                                        id: r.id, name: r.pepProject?.projectName, state: r.pepProject?.constructionStatus
                                    }))?.filter(c => c),
                                    createTime: v.StartTime ? moment(v.StartTime).format("YYYY-MM-DD HH:mm:ss") : "",
                                    updateTime: v.EndTime ? moment(v.EndTime).format("YYYY-MM-DD HH:mm:ss") : "",
                                    confirmTime: v.confirmedTime ? moment(v.confirmedTime).format("YYYY-MM-DD HH:mm:ss") : "",
                                    SourceName: v.SourceName,
                                    AlarmGroupUnit: (v.AlarmGroupUnit === 47 && v.AlarmCode === "30200001" && v?.AlarmId?.startsWith('zd:')) ? "表单推送异常" : (genre?.find(r => r.value == v.AlarmGroupUnit)?.name || "无"),
                                    Strategy: v.AlarmGroupUnit ? genre?.find(r => r.value == v.AlarmGroupUnit)?.name : "",
                                    type: (v.AlarmGroup == 4 || v.AlarmGroup == 5) ? v.DeviceStatus == 0 ? "离线" : '' : v.AlarmGroupUnit ? genre?.find(r => r.value == v.AlarmGroupUnit)?.name : "",
                                    cameraKindId: v.AlarmGroupUnit ? genre?.find(r => r.value == v.AlarmGroupUnit)?.name : "",
                                    AlarmCodeName: v.AlarmCodeName,
                                    CurrentLevel: v.CurrentLevel,
                                    detailCount: v.detailCount,
                                    AlarmContent: v.AlarmContent,
                                    State: v.State,
                                    alarmType: v.alarmType,
                                    confirm: v.confirmedContent,
                                    station: v.StructureLongitude && v.StructureLatitude ? v.StructureLongitude + ',' + v.StructureLatitude : "",
                                    projectLocal: v.Project,
                                    AlarmGroup: v.AlarmGroup,
                                }
                            ))

                            setTableData(tableDatas)
                        }
                    })
                }
                break;
        }
    }, [query, genre, pepProjectId, typeId])


    useEffect(() => {
        if (alarmDataGroup?.length > 0) {
            if (location) {
                search.current = { ...search.current, ...location, state: 'new' }
                form?.setValues({ ...location, state: 'new' })
            }
            if (route !== 'videoAbnormal' && route !== 'useAbnormal') {
                let data
                if (route == 'dataLnterrupt') data = alarmDataGroup?.filter(v => (v.desc == '数据中断' || v.desc == '掉线' || v.desc == '不活跃'))
                if (route == 'dataAbnormal') data = alarmDataGroup?.filter(v => (v.desc == '数据异常' || v.desc == '策略命中'))
                // if (route == 'strategyHit') data = alarmDataGroup?.filter(v => v.desc == '策略命中')
                // if (route == 'deviceAbnormal') data = alarmDataGroup?.filter(v => v.desc == '掉线' || v.desc == '不活跃')
                groupId.current = data
                let genreData = []
                data?.map(v => {
                    v?.unit?.map(vv => {
                        genreData.push({ name: vv.name, value: vv.id })
                    })
                })
                setGenre(genreData)
                if (route == 'dataAbnormal') {
                    dispatch(problem.getExceptionTypeCheck({ userId: user?.id, })).then(res => {
                        if (res.success) {
                            setTypeId(res.payload.data?.typeId || [8, 40, 41, 48, 49])
                        }
                    })
                }
            }
            if (route == 'useAbnormal') {
                setGenre({ element: "元素异常", apiError: "接口报错 ", timeout: "加载超时" })
            }
            if (route == 'videoAbnormal') {
                dispatch(problem.getAlarmVideoDeviceKind()).then((res) => {
                    if (res.success) {
                        kindName.current = res.payload.data.map(v => ({ name: v.kind, value: v.id }))
                        setGenre(res.payload.data.map(v => ({ name: v.kind, value: v.id })))
                    }
                })
                dispatch(problem.getAlarmVideoExceptionType()).then((res) => {
                    if (res.success) {
                        setStatusId(res.payload.data.map(v => ({ name: v.describe, value: v.statusId })))
                    }
                })
            }
        }

        return () => {

        }

    }, [route, alarmDataGroup])

    const handleExport = () => {
        let url = ''
        let { keywordTarget, keyword = '', errType = '', state = '', kindId = '', statusId = '', groupUnitId = '', confirmState = '', onlineState = '', sustainTimeStart = '', sustainTimeEnd = '' } = search.current
        if (sustainTimeStart && sustainTimeEnd) {
            let range = moment(sustainTimeEnd).diff(moment(sustainTimeStart), 'minutes')
            if (range > 24 * 60 * 7) {
                message.warning({
                    content: '导出自定义时间跨度不超过7天',
                    duration: 3,
                })
                return false;
            }
        } else {
            sustainTimeStart = moment().add(-7, 'day').format("YYYY-MM-DD HH:mm:ss")
            sustainTimeEnd = moment().format("YYYY-MM-DD HH:mm:ss")
        }
        switch (route) {
            case 'useAbnormal':
                dispatch(problem.getAlarmLnspectionApi({ ...search.current, sustainTimeStart, sustainTimeEnd, pepProjectId: pepProjectId })).then((res) => {
                    if (res.success) {
                        if (res.payload.data.count) {
                            url = `alarm/application/api?token=${user.token}&toExport=1&timestamp=${moment().valueOf()}&keyword=${keyword}&errType=${errType}`
                                + `&state=${state}&sustainTimeStart=${sustainTimeStart}&sustainTimeEnd=${sustainTimeEnd}&pepProjectId=${pepProjectId || ''}`
                            setExportUrl(url);
                        } else {
                            message.info({
                                content: '暂无可导出的数据',
                                duration: 3,
                            })
                        }
                    }
                })
                break;
            case 'videoAbnormal':
                dispatch(problem.getAlarmVideoList({ ...search.current, limit: 1, sustainTimeStart, sustainTimeEnd, pepProjectId: pepProjectId })).then((res) => {
                    if (res.success) {
                        if (res.payload.data.length) {
                            url = `alarm/video/list?token=${user.token}&toExport=1&timestamp=${moment().valueOf()}&keywordTarget=${keywordTarget}`
                                + `&keyword=${keyword}&kindId=${kindId}&statusId=${statusId}&state=${state}&sustainTimeStart=${sustainTimeStart}&sustainTimeEnd=${sustainTimeEnd}`
                                + `&pepProjectId=${pepProjectId || ''}`
                            setExportUrl(url);
                        } else {
                            message.info({
                                content: '暂无可导出的数据',
                                duration: 3,
                            })
                        }
                    }
                })
                break;
            default:
                dispatch(problem.getAlarmDataList({ ...(route === 'dataLnterrupt' ? { timestamps: true } : {}), ...query, ...search.current, limit: 1, sustainTimeStart, sustainTimeEnd, groupId: groupId.current.map(v => v.id).join(), pepProjectId: pepProjectId })).then((res) => {
                    if (res.success) {
                        if (res.payload.data.count) {
                            let groups = {
                                "dataLnterrupt": "1,4,5",
                                "dataAbnormal": "2,3",
                                // "strategyHit": "3",
                                // "deviceAbnormal": "4,5"
                            }
                            url = `alarm/data/list?token=${user.token}&toExport=1&timestamp=${true}&state=${state}&keywordTarget=${keywordTarget}&keyword=${keyword}&kindId=${kindId}`
                                + `&groupUnitId=${groupUnitId}&errType=${errType}&confirmState=${confirmState}&onlineState=${onlineState}&sustainTimeStart=${sustainTimeStart}`
                                + `&sustainTimeEnd=${sustainTimeEnd}&pepProjectId=${pepProjectId || ''}&groupId=${groups[route]}`
                                // debugger
                                setExportUrl(url);
                        } else {
                            message.info({
                                content: '暂无可导出的数据',
                                duration: 3,
                            })
                        }
                    }
                })
                break;
        }
    }
    return (
        <>
            <div  style={{ backgroundColor: '#FFFFFF', margin: "20px 12px 12px", padding: "20px 20px 40px" }}>

                <div style={{ display: 'flex', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ width: 0, height: 20, margin: "0 8px 0 0", borderLeft: '3px solid #005ABD', borderTop: '3px solid transparent', borderBottom: '3px solid transparent' }}></span>
                    <span style={{ fontSize: 24, fontFamily: 'YouSheBiaoTiHei', color: '#101531', }}>{title[route]}</span>
                    <span style={{ marginLeft: 6, fontSize: 12, color: "rgb(150, 151, 153)", fontFamily: 'DINExp' }}>DETAILED INFORMATION</span>
                </div>

                <div style={{}}>
                    <div style={{ display: "flex", marginBottom: 16, }}>
                        <Form
                            onSubmit={(values) => console.log(values)}
                            getFormApi={(formApi) => (form = formApi)}
                            layout="horizontal"
                            allowEmpty={false}
                            style={{ position: "relative", width: "100%", flex: 1, display: 'flex' }}
                        >
                            {(() => {
                                let frame = []
                                collectData[route]?.map((v, index) => {
                                    if (index == 0) {
                                        if (route == 'useAbnormal') {
                                            frame.push(<Form.Input
                                                label={v.name + ':'}
                                                labelPosition="left"
                                                field={v.field}
                                                placeholder="项目或应用关键字"
                                                allowClear
                                                style={{ width: 146, marginRight: 16, marginBottom: 16 }} />)
                                        } else {
                                            frame.push(<Form.InputGroup key={v.field} label={v.name + ':'} labelPosition="left" style={{ width: 203, marginRight: 16, marginBottom: 16 }}>
                                                <Form.Select style={{ width: 88 }} field='keywordTarget' initValue='source' rules={[{ required: true, message: '请选择筛选类型' }]} allowClear>
                                                    {[{ name: "告警源", value: "source" }, { name: "项目", value: "pepProject" }, { name: "结构物", value: "struc" },].map(vv => {
                                                        return <Select.Option value={vv.value} key={vv.value}>{vv.name}</Select.Option>
                                                    })}
                                                </Form.Select>
                                                <Form.Input field='keyword' maxLength="16" placeholder="关键字搜索" style={{ width: 115 }} />
                                            </Form.InputGroup>)
                                        }

                                    } else {
                                        if (route == 'dataAbnormal' && v.special) {
                                            frame.push(<div style={{ marginRight: 16, display: "flex" }}>
                                                <Form.Select
                                                    label={v.name + ':'}
                                                    labelPosition="left"
                                                    field={v.field}
                                                    key={v.field}
                                                    maxLength="10"
                                                    initValue={v.field == 'state' ? 'new' : undefined}
                                                    style={{ width: 116, color: "#F9F9F9", }}
                                                    placeholder="全部"
                                                    filter
                                                    allowClear
                                                >
                                                    {v.data?.filter(d => typeId?.includes(d.value))?.map((item) => {
                                                        return (
                                                            <Select.Option key={item.value} value={item.value}>
                                                                {item.name}
                                                            </Select.Option>
                                                        );
                                                    })}
                                                </Form.Select>
                                                <img title='设置' src="/assets/images/problem/setup.png" style={{ width: 20, height: 20, marginTop: 6, cursor: 'pointer' }}
                                                    onClick={() => {
                                                        setCheck(typeId)
                                                        setTypeSet(true)
                                                    }} />
                                            </div>
                                            )
                                        } else {
                                            frame.push(<Form.Select
                                                label={v.name + ':'}
                                                labelPosition="left"
                                                field={v.field}
                                                key={v.field}
                                                maxLength="10"
                                                initValue={v.field == 'state' ? 'new' : undefined}
                                                style={{ width: 116, marginRight: 16, color: "#F9F9F9", }}
                                                placeholder="全部"
                                                filter
                                                allowClear
                                            >
                                                {v.data?.map((item) => {
                                                    return (
                                                        <Select.Option key={item.value} value={item.value}>
                                                            {item.name}
                                                        </Select.Option>
                                                    );
                                                })}
                                            </Form.Select>)

                                        }

                                    }
                                })
                                frame.push(<Form.DatePicker
                                    type="dateTimeRange"
                                    labelPosition="left"
                                    style={{ width: 352 }}
                                    label={collectData.common.name + ':'}
                                    field={collectData.common.field}
                                    key={collectData.common.field}
                                />)
                                return frame
                            })()}
                        </Form>
                        <div
                            style={{
                                width: 138,
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "flex-end",
                                marginRight: 20,
                                marginBottom: 16
                            }}
                        >
                            <Tooltip content={'默认导出最近7天的数据，自定义时间跨度不超过7天'}>
                                <img title='导出' src="/assets/images/problem/export.png" style={{ width: 20, cursor: 'pointer' }}
                                    onClick={() => {
                                        form.validate().then((v) => {
                                            search.current = {
                                                state: v.state,
                                                keywordTarget: v.keywordTarget,
                                                keyword: v.keyword,
                                                kindId: v.kindId,
                                                statusId: v.statusId,
                                                groupUnitId: v.groupUnitId,
                                                errType: v.errType,
                                                confirmState: v.confirmState,
                                                onlineState: v.onlineState,
                                                sustainTimeStart: v.time && v.time.length > 0 ? moment(v.time[0]).format("YYYY-MM-DD HH:mm:ss") : "",
                                                sustainTimeEnd: v.time && v.time.length > 0 ? moment(v.time[1]).format("YYYY-MM-DD HH:mm:ss") : "",
                                            }
                                            handleExport();
                                        });
                                    }} />
                            </Tooltip>
                            <img title='设置' src="/assets/images/problem/setup.png" style={{ width: 20, cursor: 'pointer' }} onClick={() => setSetup(true)} />
                            <Button
                                theme="solid"
                                type="primary"
                                style={{ width: 80, height: 32, borderRadius: 3, }}
                                onClick={() => {
                                    form.validate().then((v) => {
                                        search.current = {
                                            state: v.state,
                                            keywordTarget: v.keywordTarget,
                                            keyword: v.keyword,
                                            kindId: v.kindId,
                                            statusId: v.statusId,
                                            groupUnitId: v.groupUnitId,
                                            errType: v.errType,
                                            confirmState: v.confirmState,
                                            onlineState: v.onlineState,
                                            sustainTimeStart: v.time && v.time.length > 0 ? moment(v.time[0]).format("YYYY-MM-DD HH:mm:ss") : "",
                                            sustainTimeEnd: v.time && v.time.length > 0 ? moment(v.time[1]).format("YYYY-MM-DD HH:mm:ss") : "",
                                        }
                                        setSelected([])
                                        setQuery({ limit: 10, page: 0 })
                                    });
                                }}
                            >
                                查询
                            </Button>
                        </div>
                    </div>
                </div>
                <Skeleton
                    loading={false}
                    active={true}
                    placeholder={SkeletonScreen()}
                >
                    {(() => {
                        return <Table
                            columns={exhibition}
                            dataSource={
                                (route == 'useAbnormal' || route == 'videoAbnormal') ?
                                    (tableData?.slice(query.page * query.limit, (query.page + 1) * query.limit) || [])
                                    : tableData
                            }
                            bordered={false}
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
                            rowSelection={{
                                selectedRowKeys: selected || [],
                                getCheckboxProps: record => ({
                                    disabled: (record.confirmTime || record.State > 2 || record.projectLocal) ? true : false,
                                    // name: record.name,
                                }),
                                onSelect: (record, selected) => {

                                },
                                // onSelectAll: (selected, selectedRows) => {
                                // },
                                onChange: (selectedRowKeys, selectedRows) => {
                                    setSelected(selectedRows?.map(v => v.key))
                                },

                            }}
                        />
                    })()}

                </Skeleton>
                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        padding: "20px 20px",
                    }}
                >
                    <div>
                        <div style={{ display: 'inline-block', lineHeight: '30px', fontSize: 13 }}>勾选<span style={{ fontWeight: 400, color: '#0F7EFB', margin: '0 6px' }}>{selected.length}条</span>问题</div>
                        <Button onClick={() => {
                            if (checkAll) {
                                setSelected((route == 'useAbnormal' || route == 'videoAbnormal' ? tableData.slice(query.page * query.limit, (query.page + 1) * query.limit) || [] : tableData)?.map(v => {
                                    if (['videoAbnormal', 'useAbnormal'].includes(route)) {
                                        if (!v.confirmTime) {
                                            return v.key
                                        }
                                    } else {
                                        if (!(v.State > 2) && !v.projectLocal) {
                                            return v.key
                                        }
                                    }
                                })?.filter(v => v))
                            } else {
                                setSelected([])
                            }
                            setCheckAll(!checkAll)
                        }}
                            style={{ width: 93, height: 24, borderRadius: '1px', border: '1px solid #0F7EFB', color: '#0F7EFB', background: "#FFFFFF", fontWeight: 400, margin: '0 10px' }}>
                            {checkAll ? '全选' : "取消全选"}
                        </Button>
                        <Button type='primary' theme='solid' onClick={() => (setIfBulk(true), setConfirm(true))} style={{ width: 93, height: 24, borderRadius: '1px', border: '1px solid #0F7EFB', color: '#FFFFFF', fontWeight: 400, }}>批量确认</Button>
                    </div>
                    {count > 0 ? <div style={{ display: 'flex', }}>
                        <span style={{ lineHeight: "30px", fontSize: 13 }}>
                            共{count}个问题
                        </span>
                        <Pagination
                            className={"container-list"}
                            total={count}
                            showSizeChanger
                            current={(query?.page || 0) + 1}
                            pageSizeOpts={[10, 20, 30, 40]}
                            // getPopupContainer={ () => document.getElementById('DmsApp')}
                            onChange={(currentPage, pageSize) => {
                                setQuery({ limit: pageSize, page: currentPage - 1 });
                            }}
                        />
                    </div> : ""}
                    {
                        exportUrl ? <iframe src={`/_api/${exportUrl}`} style={{ display: 'none' }} /> : ''
                    }
                </div>

                {/* 异常类型勾选 */}
                {typeSet ? <Modal
                    title={'异常类型勾选'}

                    open={typeSet}
                    // header={null}
                    // footer={null}
                    size={'large'}
                    // style={{ padding: 0 }}
                    // styles={{ body: { padding: 0 } }}
                    className=""
                    onCancel={() => setTypeSet(false)}
                    onOk={() => {
                        dispatch(problem.postExceptionTypeCheck({ userId: user?.id, typeId: check })).then(res => {
                            if (res.success) {
                                form?.setValue('groupUnitId',)
                                setTypeId(check)
                                setTypeSet(false)
                            }
                        })
                    }}
                >

                    <Checkbox
                        style={{ width: "100%", fontSize: 14, marginLeft: 32 }}
                        key="primary1"
                        direction="horizontal"
                        value={check}
                        // aria-label="表格属性设置"
                        onChange={(check) => {
                            setCheck(check);
                        }}
                    >
                        {genre?.map((itm) => {
                            return (
                                <Checkbox
                                    key={itm.value}
                                    value={itm.value}
                                    disabled={[8, 40, 41, 48, 49].includes(itm.value) ? true : false}
                                    style={{ width: "20%", height: 16, margin: "0 0 20px 0" }}
                                >
                                    {itm.name}
                                </Checkbox>
                            );
                        })}
                    </Checkbox>


                </Modal> : ""}

            </div>
        </>
    )
}


function mapStateToProps (state) {
    const { auth, global, members, alarmDataGroup } = state;
    return {
        user: auth.user,
        actions: global.actions,
        global: global,
        pepProjectId: global.pepProjectId,
        // members: members,
        alarmDataGroup: alarmDataGroup.data || []
    };
}
export default connect(mapStateToProps)(TableData);
