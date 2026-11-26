import React, { useState, useRef, useEffect } from "react";
import { connect } from "react-redux";
import { Modal, Form, notification, Tooltip, Space } from 'antd';
import { ExclamationCircleOutlined } from '@ant-design/icons';
import './pushModal.less'


function pushModal(props) {
    const { close, cancel, visible, dispatch, pepList, actions, pushEdit, editObj, user, subTypeData } = props;
    const { service, problem } = actions;
    const form = useRef();//表单
    const [abnormal, setAbnormal] = useState(false); //异常率推送机制disable
    const [usersList, setUsersList] = useState([]); //获取全部未删除用户
    const [structure, setStructure] = useState(true); //结构物disable
    const [projectPoms, setProjectPoms] = useState([]); //获取已绑定项目
    const [projectStructure, setProjectStructure] = useState([]); //获取绑定项目下结构物
    const [timeTypeDis, setTimeTypeDis] = useState(true); //通知时效disable
    const [projectStatus, setProjectStatus] = useState([]); //获取项目状态列表
    const timeTypePOMS = useRef([]);//表单

    const [interval1, setInterval1] = useState(undefined); //
    const [interval2, setInterval2] = useState(undefined); //
    const [interval3, setInterval3] = useState(undefined); //
    const [deviceProportion, setDeviceProportion] = useState(undefined); //
    const [subType, setSubType] = useState([]); //监听模块中的子类
    const [factorShow, setFactorShow] = useState([]); //结构物对应监测项
    const [firstPass, setFirstPass] = useState(true)

    //初始化
    useEffect(() => {
        if (editObj?.alarmType) {
            setSubType(editObj?.alarmType?.filter(d => d != 'strategy_hit' && d != 'device_exception'))
        }
        getOrganizationUsersList()//获取全部未删除用户
        getProjectPomsList()//获取已绑定项目
        if (editObj.id) {
            getProjectStructureList(editObj.pomsProjectId, editObj)
            // let division = editObj?.pomsProject?.map(v => (v.pepProject?.id || 'POMS'))
            // if (division.length == 1 && division?.includes('POMS')) {
            //     setProjectStatus([{ construction_status: 'POMS', id: 'POMS' }])
            //     timeTypePOMS.current = ['POMS']
            // } else {
            //     getProjectStatusList()//获取项目状态列表
            // }
            if (editObj.tactics == 'immediately') {
                setInterval1(editObj.tacticsParams?.interval)
            } else if (editObj.tactics == 'continue') {
                setInterval2(editObj.tacticsParams?.interval)
            } else if (editObj.tactics == 'abnormal_rate') {
                setInterval3(editObj.tacticsParams?.interval)
                setDeviceProportion(editObj.tacticsParams?.deviceProportion)
            }
        }
    }, [])
    function getOrganizationUsersList() {//获取全部未删除用户
        dispatch(service.getOrganizationUsers()).then((res) => {
            if (res.success) {
                setUsersList(res.payload.data)
            }
        })
    }
    function getProjectPomsList() {//获取已绑定项目
        dispatch(service.getProjectPoms()).then((res) => {
            if (res.success) {
                setProjectPoms(res.payload?.data?.rows)
            }
        })
    }
    function getProjectStructureList(value, alter) {//获取绑定项目下结构物
        dispatch(service.getProjectStructure({ pomsProjectId: value.join(',') })).then((res) => {
            if (res.success) {
                let data = []
                let ProjectId = []
                let factorId = []
                res.payload?.data.map(v => {
                    if (ProjectId.includes(v.id)) {
                    } else {
                        ProjectId.push(v.id)
                        data.push(v)
                    }
                })
                setProjectStructure(data)
                if (editObj.id && firstPass) {
                    let FactorId = []
                    if (alter?.pomsStrucFactorId) {
                        for (let key in alter?.pomsStrucFactorId) {
                            FactorId.push(key)
                        }
                        setFactorShow(FactorId?.map(Number))
                    } else {
                        setFactorShow(ProjectId)
                    }
                    setFirstPass(false)
                } else {
                    form.current.setValue('strucId', ProjectId)
                }
                form.current.validate([
                    'strucId',
                    // 'timeType'
                ])
                setStructure(false)
                setTimeTypeDis(false)
            }
        })
    }
    function getProjectStatusList() {//获取项目状态列表
        dispatch(service.getProjectStatus()).then((res) => {
            if (res.success) {
                setProjectStatus(res.payload?.data)
                let mylist = []
                if (editObj?.id) {
                    mylist = editObj?.timeType.map(Number) || []
                } else {
                    for (let i = 0; i < res.payload?.data.length; i++) {
                        mylist.push(res.payload?.data[i].id)
                    }
                }
                // form.current?.setValue('timeType', mylist)
                form.current?.validate([
                    'strucId',
                    // 'timeType'
                ])
            }
        })
    }
    function caution(tactics, interval, deviceProportion, data) {
        let regu = /^[0-9]*[1-9][0-9]*$/;
        let title = tactics == 'immediately' ? '即时' : tactics == 'continue' ? '持续时长' : '异常率'
        let isAbnormal = tactics == 'abnormal_rate'
        if (!regu.test(interval)) {
            notification.error({
                message: title + '推送时间应为正整数',
                duration: 2,
            })
            return false
        }
        if (!regu.test(interval) || (isAbnormal && interval > 720) || interval > 1440) {
            notification.error({
                message: title + (interval ? `推送时间不能大于${isAbnormal ? 720 : 1440}${isAbnormal ? '小时' : '分钟'}` : '推送时间应为正整数'),
                duration: 2,
            })
            return false
        }
        if (!deviceProportion || deviceProportion > 100) {
            notification.error({
                message: '异常率推送异常率应为正整数且不超过100%',
                duration: 2,
            })
            return false
        }
        if (data.alarmType?.includes('strategy_hit')) {
            let factorItem = []
            for (let key in data.pomsStrucFactorId) {
                factorItem = [...factorItem, ...data.pomsStrucFactorId[key]]

            }
            if (factorItem.length > 0 && data.alarmSubType['strategy_hit']?.length > 0) {
                return true
            } else {
                notification.error({
                    message: '勾选策略命中监听模块后，策略命中细项与监测项都必须勾选一项',
                    duration: 3,
                })
            }
            return false
        }
        return true
    }

    function handleOk() {
        //点击弹框确定  右边按钮
        form.current
            .validate()
            .then((v) => {
                let data = {
                    name: v.name,
                    pomsProjectId: v.pomsProjectId,
                    strucId: v.strucId || [],
                    tactics: v.tactics,
                    tacticsParams: {
                        interval: v.tactics == 'immediately' ? v.interval1 : (v.tactics == 'continue' ? v.interval2 : v.interval3),
                        deviceProportion: v.deviceProportion
                    },
                    alarmType: v.alarmType?.filter(d => d != 'strategy_hit' && d != 'device_exception'),
                    // timeType: v.timeType[0] == 'POMS' ? [] : v.timeType,
                    receiverPepUserId: v.receiverPepUserId || [],
                    disable: v.disable,
                    alarmSubType: {},
                    pomsStrucFactorId: {},
                    pushType: v.pushType
                }
                for (let key in v) {
                    if (['app_exception', 'data_exception', 'data_outages', 'device_exception', 'video_exception', 'strategy_hit'].includes(key)) {
                        data.alarmSubType = { ...data.alarmSubType, [key]: key == 'data_outages' ? (v[key]?.length ? subTypeData['data_outages']?.map(d => d.id) : []) : v[key] }
                    } else if (key.indexOf('factor') == 0) {
                        data.pomsStrucFactorId = { ...data.pomsStrucFactorId, [key.slice(6)]: v[key] }
                    }
                }
                if (caution(data.tactics, data.tacticsParams.interval, data.tacticsParams.deviceProportion, data)) {
                    dispatch(service.postPush({ pushId: editObj.id, ...data, msg: pushEdit ? '编辑推送配置' : "新增推送策略" })).then((res) => {//获取项企(PEP)全部部门及其下用户
                        if (res.success) {
                            close();
                        }
                    })
                }
            })
    }
    function handleCancel() {
        cancel();
        //点击弹框取消  左边按钮
    }
    return (
        <>
            <Modal
                title={pushEdit ? "修改推送策略" : '新增推送策略'}
                okText="确定"
                cancelText="取消"
                open={visible}
                onOk={handleOk}
                width={860}
                onCancel={handleCancel}
            >
                <div>
                    <Form
                        labelPosition="left"
                        labelAlign="right"
                        labelWidth="128px"
                        onValueChange={(values, field) => {
                            for (var key in field) {
                                if (key == 'tactics') {
                                    if (values.tactics == 'abnormal_rate') {
                                        form.current.setValue('alarmType', undefined)
                                        setAbnormal(true)
                                    } else {
                                        setAbnormal(false)
                                    }
                                } else if (key == 'pomsProjectId') {
                                    if (values.pomsProjectId.length > 0) {
                                        getProjectStructureList(values.pomsProjectId)//获取绑定项目下结构物
                                        let pepProjectId = []
                                        // let projectData = values.pomsProjectId?.map(v => {
                                        //     let data = projectPoms?.filter(u => u.id == v) || []
                                        //     if (data.length) {
                                        //         pepProjectId.push(data[0].pepProjectId || 'POMS')
                                        //     }
                                        // })
                                        // if (pepProjectId.length == 1 && pepProjectId.includes('POMS')) {
                                        //     setProjectStatus([{ construction_status: 'POMS', id: 'POMS' }])
                                        //     // form.current.setValue('timeType', ['POMS'])
                                        //     form.current.validate()
                                        // } else {
                                        //     getProjectStatusList()//获取项目状态列表
                                        // }
                                    } else {
                                        setProjectStructure([])
                                        form.current.setValue('strucId', [])
                                        setProjectStatus([])
                                        // form.current.setValue('timeType', [])
                                    }

                                } else if (key == 'strucId') {
                                    setFactorShow(values.strucId)
                                } else if (key == 'alarmType') {
                                    setSubType(field['alarmType']?.filter(d => d != 'strategy_hit' && d != 'device_exception'))
                                }
                            }
                        }}
                        getFormApi={(formApi) => (form.current = formApi)}
                    >
                        <div style={{ color: '#4A4A4A', fontSize: 14, fontWeight: 600, marginLeft: 6 }}>
                            项目信息配置
                        </div>
                        <div>
                            <Form.Input
                                field="name"
                                label='策略名称:'
                                maxLength={15}
                                disabled={pushEdit}
                                style={{ width: 678 }}
                                initValue={editObj?.name || ""}
                                placeholder="请输入策略名称"
                                allowClear
                                rules={[{ required: true, message: "请输入策略名称" }]} />
                        </div>
                        <div>
                            <Form.Select
                                label="请选择项目:"
                                field="pomsProjectId"
                                placeholder="请选择项目"
                                style={{ width: 678 }}
                                rules={[{ required: true, message: "请选择项目" }]}
                                initValue={editObj?.pomsProjectId || ""}
                                multiple
                                filter
                            >
                                {
                                    projectPoms.map((item, index) => {
                                        return (
                                            <Select.Option key={index} value={item.id}>
                                                {item.pepProjectName || item.name}
                                            </Select.Option>
                                        )
                                    })
                                }
                            </Form.Select>
                        </div>
                        <div>
                            <Form.Select
                                label={<>
                                    请选择结构物
                                    <Tooltip content={'选择结构物，若该结构物下没有监测项则下方不展示，反之展示结构物对应的监测项'} style={{ lineHeight: 2 }}>
                                        <img src="/assets/images/install/table_question.png" alt="" style={{ height: 14, width: 14 }} />
                                    </Tooltip>:
                                </>}
                                field="strucId"
                                placeholder="请选择结构物"
                                style={{ width: 678 }}
                                rules={[{ required: true, message: "请选择结构物" }]}
                                initValue={editObj?.strucId || []}
                                disabled={structure}
                                filter
                                multiple
                                maxTagCount={3}
                                allowClear
                            >
                                {
                                    projectStructure.map((item, index) => {
                                        return (
                                            <Select.Option key={index} value={item.id}>
                                                {item.name}
                                            </Select.Option>
                                        )
                                    })
                                }
                            </Form.Select>
                            {projectStructure?.filter(v => (factorShow?.includes(v.id) && v.factor?.length > 0))?.map((u, index) => {
                                let factorItem = []
                                u.factor?.map(v => {
                                    v.item.map(vv => factorItem.push(vv.name))
                                })
                                factorItem = [...new Set(factorItem)]
                                return <Form.Checkbox
                                    label={u.name + ':'}
                                    key={u.name + index}
                                    field={'factor' + u.id}
                                    style={{ width: 695 }}
                                    initValue={editObj?.pomsStrucFactorId ? (editObj?.pomsStrucFactorId[u.id]?.filter(d => factorItem.includes(d)) || []) : (factorItem || [])}
                                    direction='horizontal'
                                    allowClear
                                >
                                    {
                                        factorItem?.map((v, index) =>
                                            <Form.Checkbox value={v} key={v} style={{ width: 150 }}>{v}</Form.Checkbox>)
                                    }
                                </Form.Checkbox>
                            })
                            }
                        </div>
                        <div className='pushInput'>
                            <Form.Radio
                                field="tactics"
                                label='推送策略配置:'
                                type='card'
                                direction='horizontal'
                                initValue={editObj?.tactics || ''}
                                rules={[{ required: true, message: '请选择推送策略' }]}>
                                <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                                    <Form.Radio
                                        value='immediately'
                                        extra={
                                            <span style={{ fontSize: 13 }}>
                                                中台每分钟查询，若有告警源新增，则每
                                                <Form.Input
                                                    field="interval1"
                                                    pure
                                                    style={{ width: 60, height: 20, color: '#1859C1' }}
                                                    initValue={interval1 || "10"}
                                                // rules={[{ pattern: "^[0-9]*[1-9][0-9]*$", message: "请输入正整数" }]}
                                                />
                                                分钟通过【信鸽服务】发送一条通知信息。
                                            </span>
                                        }
                                        style={{ width: 217 }}>
                                        即时推送机制
                                    </Form.Radio>
                                    <Form.Radio
                                        value='continue'
                                        extra={
                                            <span style={{ fontSize: 13 }}>
                                                告警源持续产生时间超过
                                                <Form.Input
                                                    field="interval2"
                                                    pure
                                                    style={{ width: 60, height: 20, color: '#1859C1' }}
                                                    initValue={interval2 || "10"}
                                                // rules={[{ pattern: "^[0-9]*[1-9][0-9]*$", message: "请输入正整数" }]}
                                                />
                                                分钟，则通过【信鸽服务】发送一条通知信息。
                                            </span>
                                        }
                                        style={{ width: 173 }}>
                                        持续时长推送机制
                                    </Form.Radio>
                                    <Form.Radio
                                        value='abnormal_rate'
                                        extra={
                                            <span style={{ fontSize: 13 }}>
                                                异常设备数量达到项目或结构物内设备总数量的
                                                <Form.Input
                                                    field="deviceProportion"
                                                    pure
                                                    style={{ width: 60, height: 20, color: '#1859C1' }}
                                                    initValue={deviceProportion || "40"}
                                                // rules={[{ pattern: "^[0-9]*[1-9][0-9]*$", message: "请输入正整数" }]}
                                                />
                                                %，且持续时长超过
                                                <Form.Input
                                                    field="interval3"
                                                    pure
                                                    style={{ width: 60, height: 20, color: '#1859C1' }}
                                                    initValue={interval3 || "2"}
                                                // rules={[{ pattern: "^[0-9]*[1-9][0-9]*$", message: "请输入正整数" }]}
                                                />
                                                小时，则通过【信鸽服务】发送一条通知信息。
                                            </span>
                                        }
                                        style={{ width: 260 }}>
                                        异常率推送机制
                                    </Form.Radio>
                                </div>
                            </Form.Radio>
                        </div>
                        <div>
                            <Form.Checkbox
                                label="监听问题模块:"
                                field="alarmType"
                                style={{ width: 695 }}
                                rules={[{ required: true, message: "监听问题模块" }]}
                                initValue={editObj?.alarmType?.filter(d => d != 'strategy_hit' && d != 'device_exception') || []}
                                direction='horizontal'
                                allowClear
                            >
                                {
                                    [
                                        { name: '数据中断', value: "data_outages" },
                                        { name: '数据异常', value: "data_exception" },
                                        // { name: '策略命中', value: "strategy_hit" },
                                        { name: '视频异常', value: "video_exception" },
                                        { name: '应用异常', value: "app_exception" },
                                        // { name: '设备异常', value: "device_exception" },
                                    ].map((v, index) =>
                                        <Form.Checkbox value={v.value}
                                            key={v.value}
                                            disabled={index == 2 || index == 4 ? abnormal : false}>
                                            {v.name}</Form.Checkbox>)
                                }
                            </Form.Checkbox>
                            {[
                                { name: '数据中断', value: "data_outages", data: [{ id: 1, name: "全部" }] },
                                { name: '数据异常', value: "data_exception", data: subTypeData['data_exception'] },
                                // { name: '策略命中', value: "strategy_hit", data: subTypeData['strategy_hit'][0] },
                                { name: '视频异常', value: "video_exception", data: subTypeData['video_exception']?.map(v => ({ id: v.id, name: v.kind })) },
                                { name: '应用异常', value: "app_exception", data: subTypeData['app_exception'] },
                                // { name: '设备异常', value: "device_exception", data: [...subTypeData['device_exception'][0], ...subTypeData['device_exception'][1]] },
                            ].filter(v => subType?.includes(v.value))?.map((u, index) => {
                                return <Form.Checkbox
                                    label={u.name + ':'}
                                    key={u.name + u.index}
                                    field={u.value}
                                    style={{ width: 695 }}
                                    initValue={
                                        editObj?.id ?
                                            editObj?.alarmSubType ?
                                                u.value == 'data_outages' ? (editObj?.alarmSubType[u.value]?.length ? [1] : [])
                                                    : (u.value == 'data_exception' ? editObj?.alarmSubType[u.value]?.filter(d => subTypeData['data_exception']?.map(f => f.id)?.includes(d))
                                                        : editObj?.alarmSubType[u.value])
                                                : (u.value == 'data_outages' ? [1] : u.data.map(v => v.id))
                                            : []}
                                    direction='horizontal'
                                    allowClear
                                >
                                    {
                                        u.data?.map((v, index) =>
                                            <Form.Checkbox value={v.id} key={v.id} style={{ width: 150 }}>{v.name}</Form.Checkbox>)
                                    }
                                </Form.Checkbox>
                            })
                            }
                        </div>
                        <div style={{ color: '#4A4A4A', fontSize: 14, fontWeight: 600, marginLeft: 6 }}>
                            接收信息配置
                        </div>
                        <div style={{ display: 'flex' }}>
                            {/* <Form.Select
                                    label="通知时效:"
                                    field="timeType"
                                    placeholder="请选择通知时效"
                                    style={{ width: 285 }}
                                    rules={[{ required: true, message: "请选择通知时效" }]}
                                    initValue={editObj?.timeType?.length > 0 ? editObj?.timeType : timeTypePOMS.current}
                                    disabled={timeTypeDis}
                                    multiple
                                    maxTagCount={3}
                                >
                                    {
                                    projectStatus.map((item, index) => {
                                        return (
                                            <Select.Option key={index} value={item.id}>
                                                {item.construction_status}
                                            </Select.Option>
                                        )
                                    })
                                    }
                                </Form.Select> */}
                            <Form.Checkbox
                                label="推送方式:"
                                field="pushType"
                                direction='horizontal'
                                placeholder="请选择推送方式"
                                style={{ width: 285 }}
                                rules={[{ required: true, message: "请选择通知方式" }]}
                                initValue={editObj?.pushType?.length > 0 ? editObj?.pushType : ['email']}
                                options={[
                                    { label: '邮件', value: 'email' },
                                    { label: '短信', value: 'sms' },
                                    { label: "语音", value: "voice" }
                                ]}
                            />
                            <Form.Select
                                label="接收人:"
                                field="receiverPepUserId"
                                placeholder="请选择接收人"
                                style={{ width: 285 }}
                                rules={[{ required: true, message: "请选择接收人" }]}
                                initValue={editObj?.receiverPepUserId || [user.id]}
                              filter={(sugInput, option) => {
                                    const sug = sugInput.toLowerCase();
                                    const user = usersList.find(u => u.id === option.value);
                                    return (
                                        user?.name?.toLowerCase().includes(sug) 
                                        // user?.phone?.includes(sug) ||
                                        // user?.email?.toLowerCase().includes(sug)
                                    );
                                    }}
                                multiple
                                maxTagCount={3}
                                allowClear
                            >
                                {
                                    usersList.map((item, index) => {
                                        return (
                                            <Select.Option key={index} value={item.id}>
                                                <Tooltip
                                                    position="rightTop"
                                                    content={<Space vertical style={{ justifyContent: 'flex-start' }}>
                                                        <span style={{ display: 'inline-block', width: '100%', textAlign: 'left' }}>手机：{item.phone}</span>
                                                        <span style={{ display: 'inline-block', width: '100%', textAlign: 'left', whiteSpace: 'nowrap' }}>邮箱：{item.email}</span>
                                                    </Space>}
                                                >
                                                    {item.name}
                                                </Tooltip>
                                            </Select.Option>
                                        )
                                    })
                                }
                            </Form.Select>
                        </div>
                        {/* 通知时效的提示 */}
                        {/* <div style={{ marginLeft: 120, color: '#005ABD', fontSize: 14 }}>
                            不在项目节点的通知策略，会自动失效.
                        </div> */}
                        <div style={{ marginTop: 20 }}>
                            <Form.Radio
                                field="disable"
                                pure
                                direction='horizontal'
                                style={{ display: 'flex', justifyContent: 'space-evenly' }}
                                initValue={editObj?.disable || false}
                                rules={[{ required: true, }]}>
                                <Form.Radio value={false}>
                                    启用
                                </Form.Radio>
                                <Form.Radio value={true}
                                    style={{ marginLeft: 120 }}>
                                    禁用
                                </Form.Radio>
                            </Form.Radio>
                        </div>
                    </Form>
                </div>
            </Modal >
        </>
    );
}
function mapStateToProps(state) {
    const { auth, global, members } = state;
    return {
        //   loading: members.isRequesting,
        user: auth.user,
        actions: global.actions,
        //   members: members.data,
    };
}

export default connect(mapStateToProps)(pushModal);
