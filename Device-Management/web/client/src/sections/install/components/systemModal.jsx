import React, { useState, useRef, useEffect } from "react";
import { connect } from "react-redux";
import SimpleBar from 'simplebar-react';
import { Modal, Form, Tag, Row, Col, Collapse, Input, Typography, Select, Radio, InputNumber, Checkbox } from 'antd';
import { ExclamationCircleOutlined, SearchOutlined, FlagOutlined } from '@ant-design/icons';
import '../style.less'

function adminModal (props) {
    const {
        close,
        cancel,
        visible,
        dispatch,
        actions,
        systemEdit,//是否是编辑
        peplist,//项企项目列表
        anxincloudList,//安心云项目列表
        appList,//应用列表
        pepProjectId,//已选择项企id
        pepname,//修改时自定义项目名称
        anxincloudArr,//修改时已经选择的安心云列表
        anxinDelete,//修改时安心云项目有删除,显示提示信息
        appArr,//修改时添加应用
        bindId,
        mapping, //修改时的映射类型
        maintenancePeriod, //维保时间段
        editData,
        traitLabel
    } = props;
    const { install } = actions;
    const isMountedRef = useRef(true); // 组件挂载状态
    const [form] = Form.useForm();//表单
    const [custom, setCustom] = useState(false); //是否是自定义项目
    const [myprojectType, setMyprojectType] = useState('pep'); //是否是自定义项目
    const [structureSensor, setStructureSensor] = useState([])
    const [sendorders, setSendorders] = useState([])
    const [strucId, setStrucId] = useState([])
    const [sensorPointKeyvalue, setSensorPointKeyvalue] = useState('')

    //初始化
    useEffect(async () => {
        if (pepname) {
            setCustom(true)
            setMyprojectType('axy')
        }
        if (editData?.id) {
            await getData({ projectId: anxincloudArr?.join(',') + ',-1' })
            setSendorders(editData?.sendorders)
            if (editData?.sendorders?.includes('emphasis')) {
                form.setFieldsValue({'strucId': editData?.strucId})

                setTimeout(() => {
                    if ('cruxSensor' in editData?.strucSensor) {
                        for (let strucId of Object.keys(editData?.strucSensor['cruxSensor'])) {
                            for (let sensorId of editData?.strucSensor['cruxSensor'][strucId]) {
                                form.setFieldsValue({[`sensorPoint_|_${strucId}_|_${sensorId}`]: 'crux'})
                            }
                        }
                        for (let strucId of Object.keys(editData?.strucSensor['ignoreSensor'])) {
                            for (let sensorId of editData?.strucSensor['ignoreSensor'][strucId]) {
                                form.setFieldsValue({[`sensorPoint_|_${strucId}_|_${sensorId}`]: 'ignore'})
                            }
                        }
                    } else { // 兼容一下以前的逻辑
                        for (let strucId of Object.keys(editData?.strucSensor)) {
                            for (let sensorId of editData?.strucSensor[strucId]) {
                                form.setFieldsValue({[`sensorPoint_|_${strucId}_|_${sensorId}`]: 'crux'})
                            }
                        }
                    }
                }, 300);

                setStrucId(editData?.strucId || [])
            }
            if (editData?.sendorders?.includes('percentage')) {
                form.setFieldsValue({'percentage': editData?.percentage})
            }
        }
    }, []);

    // 组件卸载时设置挂载状态为false
    useEffect(() => {
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    const getData = async (data = {}) => {
        await dispatch(install.getStructureStation({ ...data, traitLabel })).then((res) => {
            if (res.success && isMountedRef.current) {
                setStructureSensor(res.payload.data || [])
            }
        })
    }

    function handleOk () {
        //点击弹框确定  右边按钮
        form.current
            .validate()
            .then((values) => {
                let appArr = []
                for (let i = 0; i < values.appId.length; i++) {
                    appArr.push(JSON.parse(values.appId[i]).id)
                }
                let cruxSensor = {}
                let ignoreSensor = {}
                if (values.sendorders?.includes("emphasis")) {
                    for (let k of Object.keys(values)) {
                        if (k.startsWith('sensorPoint')) {
                            let kArr = k.split('_|_')
                            let sensorId = parseInt(kArr[2])
                            if (values[k] == 'crux') { // 关键点
                                if (cruxSensor[kArr[1]]) {
                                    cruxSensor[kArr[1]].push(sensorId)
                                } else {
                                    cruxSensor[kArr[1]] = [sensorId]
                                }
                            } else if (values[k] == 'ignore') {// 忽略点
                                if (ignoreSensor[kArr[1]]) {
                                    ignoreSensor[kArr[1]].push(sensorId)
                                } else {
                                    ignoreSensor[kArr[1]] = [sensorId]
                                }
                            }
                        }
                    }
                }

                let data = {
                    name: values.name,
                    pepProjectId: values.pepProjectId,
                    anxinProjectId: values.anxinProjectId,
                    appId: appArr,
                    mappingClass: values.mappingClass,
                    maintenancePeriod: values.maintenancePeriod,
                    isanchor: values.isanchor,
                    sendorders: values.sendorders,
                    percentage: values.percentage,
                    strucId: values.strucId,
                    strucSensor: {
                        cruxSensor,
                        ignoreSensor
                    },
                    dataInterrupt: values?.sendorderType.includes("dataInterrupt"),
                    dataException: values?.sendorderType.includes("dataException"),
                    leakageAnomaly: values?.sendorderType.includes("leakageAnomaly"),
                    overException: values?.sendorderType.includes("overException"),
                    InfluenceReport: values?.InfluenceReport?.reduce((result, item) => {
                        result[item] = true; return result;
                    }, {})
                }
                if (systemEdit) {
                    dispatch(install.postProjectBind({ ...data, bindId: bindId, msg: '修改映射关系', })).then((res) => {//获取项企(PEP)全部部门及其下用户
                        if (res.success && isMountedRef.current) {
                            close();
                        }
                    })
                } else {
                    dispatch(install.postProjectBind({ ...data, msg: '添加映射关系' })).then((res) => {//获取项企(PEP)全部部门及其下用户
                        if (res.success && isMountedRef.current) {
                            close();
                        }
                    })
                }
            })
    }


    function handleCancel () {
        cancel();
        //点击弹框取消  左边按钮
    }
    const renderMultipleWithCustomTag = (optionNode, { onClose }) => {
        const content = (
            <Tag closable={true}
                onClose={onClose}
                size='large'>
                {JSON.parse(optionNode.value).name}
            </Tag>
        );
        return {
            isRenderInTag: false,
            content
        };
    }

    return (
        <>
            <Modal
                title={systemEdit ? '修改映射关系' : '添加映射关系'}
                okText="确定"
                cancelText="取消"
                open={visible}
                onOk={handleOk}
                width={666}
                onCancel={handleCancel}
            >
                <SimpleBar style={{ margin: "0px 12px 0 16px", height: 'calc(100vh - 315px)', }} forceVisible="y">
                    <div style={{ width: '100%', lineHeight: 2, background: '#F4F8FF', borderRadius: 2, border: '1px solid #C7E1FF', display: 'flex' }}>
                        <div style={{ display: 'flex', marginLeft: 12, marginTop: 5.5 }}><ExclamationCircleOutlined style={{ color: '#0F7EFB' }} /></div>
                        <div style={{ color: '#0F7EFB', fontSize: 12, marginLeft: 8, marginRight: 12 }}>映射关系由项企立项项目与安心云项目关联产生，若项目未在项企中有记载，可选自定义项目，待项企立项项后再进行修改！</div>
                    </div>
                    <Form
                        form={form}
                        labelAlign="right"
                        labelCol={{ span: 6 }}
                        wrapperCol={{ span: 18 }}
                        onValuesChange={(changedValues, allValues) => {
                            if ('projectType' in changedValues) {
                                if (changedValues.projectType == 'pep') {
                                    setCustom(false)
                                } else {
                                    setCustom(true)
                                }
                            }
                        }}
                        initialValues={{
                             projectType: myprojectType,
                             name: pepname || "",
                             pepProjectId: pepProjectId || "",
                             anxinProjectId: anxincloudArr || [],
                             sendorderType: [editData?.dataInterrupt ? "dataInterrupt" : "",
                                 editData?.dataException ? "dataException" : "", 
                                 editData?.leakageAnomaly ? "leakageAnomaly" : "",
                                 editData?.overException? "overException" : ""
                             ].filter(Boolean),
                             InfluenceReport: Object.entries(editData?.influenceReporting || {})
                                 .filter(([key, value]) => value)
                                 .map(([key]) => key)
                         }}
                    >
                        <div>
                            <Form.Item name="projectType" label='项目类型:'>
                                <Radio.Group disabled={systemEdit && !pepname}>
                                    <Radio value='pep'>项企项目</Radio>
                                    <Radio value='axy'>自定义项目（未在项企中立项的项目可选）</Radio>
                                </Radio.Group>
                            </Form.Item>
                        </div>
                        {custom ? (
                            <div>
                                <Form.Item
                                    name="name"
                                    label='自定义项目:'
                                    rules={[{ required: true, message: "请输入项目名称，且名称需与项企区分" }]}
                                >
                                    <Input
                                        style={{ width: 425 }}
                                        maxLength={15}
                                        placeholder="请输入项目名称，且名称需与项企区分"
                                        allowClear
                                    />
                                </Form.Item>
                            </div>
                        ) : (
                            <div>
                                <Form.Item
                                    label="PEP项企项目:"
                                    name="pepProjectId"
                                    rules={[{ required: true, message: "请选择PEP项企项目" }]}
                                >
                                    <Select
                                        showSearch
                                        placeholder="请选择PEP项企项目"
                                        style={{ width: 425 }}
                                        disabled={systemEdit && !pepname}
                                        allowClear
                                    >
                                        {
                                            peplist.reduce((arr, item) => {
                                                if (!item.binded) {
                                                    arr.push(
                                                        <Select.Option key={item.id} value={item.id}>
                                                            {item.project_name}
                                                        </Select.Option>
                                                    )
                                                }
                                                return arr
                                            }, [])
                                        }
                                    </Select>
                                </Form.Item>
                            </div>
                        )}
                        <div>
                            <Form.Item
                                label="安心云项目:"
                                name="anxinProjectId"
                                rules={[{ required: true, message: "请选择安心云项目" }]}
                            >
                                <Select
                                    mode="multiple"
                                    showSearch
                                    placeholder="请选择安心云项目"
                                    style={{ width: 425 }}
                                    allowClear
                                    onChange={v => {
                                        if (v.length) {
                                            getData({ projectId: v.join(',') + ',-1' })
                                        } else {
                                            setStructureSensor([])
                                        }
                                        form.setFieldsValue({'strucId': []})
                                        setStrucId([])
                                    }}
                                >
                                    {
                                        anxincloudList.map((item, index) => {
                                            return (
                                                <Select.Option key={index} value={item.id}>
                                                    {item.name}
                                                </Select.Option>
                                            )
                                        })
                                    }
                                </Select>
                            </Form.Item>
                        </div>
                        {
                            anxinDelete.length > 0 ? (
                                <div style={{ display: 'flex' }}>
                                    <div style={{ marginTop: 3 }}>
                                        <img src="/assets/images/install/risk.png" alt="" style={{ height: 24, width: 24, }} />
                                    </div>
                                    <div style={{
                                        background: 'rgba(255, 51, 0, 0.28)', color: '#FF3300',
                                        fontSize: 12, marginLeft: 8, lineHeight: 2, padding: '0px 5px',
                                        border: '1px solid rgba(255,51,0,0.3)', width: 515
                                    }}>
                                        确认关联后“{anxinDelete.join('、')}”将被系统移除映射关系，原因是项目已在【安心云】中被删除！
                                    </div>
                                </div>
                            ) : ('')
                        }
                        <div>
                            <Form.Select
                                label="添加应用:"
                                field="appId"
                                multiple
                                filter
                                placeholder="请选择添加应用"
                                style={{ width: 425 }}
                                initValue={appArr || []}
                                allowClear
                                renderSelectedItem={renderMultipleWithCustomTag}
                            >
                                {
                                    appList.map((item, index) => {
                                        return (
                                            <Select.Option key={'a' + index} value={JSON.stringify(item)} label={
                                                <div>
                                                    <div style={{ fontSize: 14, fontWeight: 600 }}>
                                                        {item.name}
                                                    </div>
                                                    <div style={{ fontSize: 12, color: 'rgb(139, 139, 139)' }}>
                                                        URL:{item.url}
                                                    </div>
                                                </div>
                                            }>
                                            </Select.Option>
                                        )
                                    })
                                }
                            </Form.Select>
                            <Form.Select
                                label="映射分类:"
                                field="mappingClass"
                                filter
                                placeholder="请选择映射类型"
                                style={{ width: 425 }}
                                initValue={mapping}
                                allowClear
                            >
                                {
                                    [
                                        { name: '智慧类', value: 'wisdom' },
                                        { name: '监测类', value: 'monitor' },
                                        { name: '其他', value: 'other' }
                                    ].map(item => {
                                        return <Select.Option key={item.value} value={item.value}>
                                            {item.name}
                                        </Select.Option>
                                    })
                                }
                            </Form.Select>
                            <Form.DatePicker
                                style={{ width: 425 }}
                                label='维保期限时间:'
                                type='dateRange'
                                field='maintenancePeriod'
                                initValue={maintenancePeriod}
                            >
                            </Form.DatePicker>
                        </div>
                        <Form.Item name="isanchor" label='是否续签:' initialValue={editData?.isanchor}>
                            <Radio.Group>
                                <Radio value={true}>续签</Radio>
                                <Radio value={false}>非续签</Radio>
                            </Radio.Group>
                        </Form.Item>
                        <Form.Item
                            name="sendorders"
                            label='自动派单:'
                            initialValue={editData?.sendorders || []}
                        >
                            <Checkbox.Group
                                onChange={v => {
                                    setSendorders(v)
                                    if (!v.includes('emphasis')) {
                                        setStrucId([])
                                    }
                                }}
                            >
                                <Checkbox value="percentage">项目在线百分比</Checkbox>
                                <Checkbox value="emphasis">特殊点位</Checkbox>
                            </Checkbox.Group>
                        </Form.Item>
                        {
                            sendorders?.includes('percentage') &&
                            <Form.Item name='percentage' label='项目中断百分比:'>
                                <InputNumber min={0} max={100} />
                            </Form.Item>
                        }
                        {
                            sendorders?.includes('emphasis') &&
                            <>
                                <Form.Select
                                    label="选择结构物:"
                                    field="strucId"
                                    filter
                                    multiple
                                    placeholder="请选择结构物"
                                    style={{ width: 425 }}
                                    // initValue={[]}
                                    allowClear
                                    onChange={v => {
                                        setStrucId(v)
                                    }}
                                >
                                    {
                                        structureSensor.map(item => {
                                            return <Select.Option key={item.strucId} value={item.strucId}>
                                                {item.strucName}
                                            </Select.Option>
                                        })
                                    }
                                </Form.Select>
                                {
                                    strucId?.length ?
                                        <Input prefix={<SearchOutlined />} allowClear style={{ width: 427, marginLeft: 131 }} maxLength={24} onChange={v => {
                                            setSensorPointKeyvalue(v)
                                        }}></Input>
                                        : ''
                                }

                                {
                                    strucId?.length ?
                                        <Collapse accordion style={{ width: 448, marginLeft: 117 }} defaultActiveKey={'strucSensor' + strucId[0]} keepDOM={true}>
                                            {
                                                structureSensor?.filter(v => strucId?.includes(v.strucId))?.map((u, index) => {
                                                    let sensors = u?.sensor
                                                    let hasMatchKey = sensorPointKeyvalue && sensors?.some(s => `${s.senterName}（${s.factorName}）`.includes(sensorPointKeyvalue))
                                                    return (
                                                        <Collapse.Panel header={
                                                            <span>
                                                                {u.strucName}
                                                                {hasMatchKey ? <FlagOutlined style={{
                                                                    marginLeft: 5, backgroundColor: 'rgba(var(--semi-teal-5), 0.6)',
                                                                    color: 'yellow'
                                                                }} /> : ''}
                                                            </span>
                                                        } itemKey={'strucSensor' + u.strucId} style={{ height: sensorPointKeyvalue && !hasMatchKey ? 0 : undefined, overflow: 'hidden' }}>
                                                            {
                                                                sensors?.map((v, index) => {
                                                                    let key = 'sensorPoint_|_' + u.strucId + '_|_' + v.senterId
                                                                    let sensorMatched = `${v.senterName}（${v.factorName}）`.includes(sensorPointKeyvalue)
                                                                    return (
                                                                        <span style={{ display: sensorPointKeyvalue && !sensorMatched ? 'none' : 'inline-block', overflow: 'hidden' }}>
                                                                            <Form.Radio
                                                                                key={key}
                                                                                field={key}
                                                                                label={
                                                                                    <Typography.Text
                                                                                        sourceString={`${v.senterName}（${v.factorName}）:`}
                                                                                        searchWords={[sensorPointKeyvalue]}
                                                                                        component='span'
                                                                                        highlightStyle={{
                                                                                            backgroundColor: 'rgba(var(--semi-teal-5), 0.6)',
                                                                                            color: 'yellow'
                                                                                        }}
                                                                                    />
                                                                                }
                                                                                direction='horizontal'
                                                                                initValue={'routine'}
                                                                                noLabel={false}
                                                                            >
                                                                                <Form.Radio value="routine">常规点</Form.Radio>
                                                                                <Form.Radio value="crux">运维关键点</Form.Radio>
                                                                                <Form.Radio value="ignore">忽略点</Form.Radio>
                                                                            </Form.Radio>
                                                                        </span>
                                                                    )
                                                                }
                                                                )
                                                            }
                                                        </Collapse.Panel>
                                                    )
                                                })
                                            }
                                        </Collapse> : ''
                                }
                            </>
                        }
                        <Form.Item
                            name="sendorderType"
                            label='派单类型:'
                        >
                            <Checkbox.Group>
                                <Checkbox value="dataInterrupt">数据中断</Checkbox>
                                <Checkbox value="dataException">数据异常</Checkbox>
                                <Checkbox value="leakageAnomaly">漏液异常</Checkbox>
                                <Checkbox value="overException">数据超阈值</Checkbox>
                            </Checkbox.Group>
                        </Form.Item>
                        <Form.Item
                            name="InfluenceReport"
                            label='影响出具报告:'
                        >
                            <Checkbox.Group>
                                <Checkbox value="dailyPaper">日报</Checkbox>
                                <Checkbox value="weekPaper">周报</Checkbox>
                                <Checkbox value="monthPaper">月报</Checkbox>
                                <Checkbox value="quarterlyPaper">季报</Checkbox>
                                <Checkbox value="yearPaper">年报</Checkbox>
                                <Checkbox value="timeResponsePaper">事件响应报告</Checkbox>
                            </Checkbox.Group>
                        </Form.Item>
                    </Form>
                </SimpleBar >
            </Modal >
        </>
    );
}
function mapStateToProps (state) {
    const { auth, global, members } = state;
    return {
        //   loading: members.isRequesting,
        user: auth.user,
        actions: global.actions,
        traitLabel: global.traitLabel,
    };
}

export default connect(mapStateToProps)(adminModal);
