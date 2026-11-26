import React, { useEffect, useState, useImperativeHandle, useRef } from 'react';
import { Input, Space, Tooltip, Form, Modal, Button, Select, InputNumber, Checkbox } from 'antd';
import moment from 'moment';

let confirmFlag = moment()

const CertNoticeModal = React.forwardRef((props, ref) => {
    const { editD, dispatch, actions, allPepUsers, initTable, clearEditD, certList } = props
    const [form] = Form.useForm();//表单
    // const confirmFlag = useRef(false)
    const [modalVisible, setModalVisible] = useState(false)
    const [loading, setLoading] = useState(false)
    const [projects, setProjects] = useState([])
    const [certs, setCerts] = useState([])

    useImperativeHandle(ref, () => ({
        toggle () {
            setModalVisible(!modalVisible)
        }
    }), [modalVisible])

    useEffect(() => {
        if (!modalVisible) {
            setTimeout(() => {
                form.resetFields()
            }, 0);
        }
    }, [modalVisible])

    useEffect(() => {
        let nProjects = []
        let nProjectRepeat = {}
        certList?.forEach(item => {
            if (!nProjectRepeat[item.project]) {
                nProjectRepeat[item.project] = 1
                nProjects.push(item.project)
            }
        })
        setProjects(nProjects)
    }, [certList])

    return (
        <Modal
            title={`${editD ? '编辑' : '新增'}到期提醒`}
            open={modalVisible}
            onOk={() => {
                if (moment().diff(confirmFlag, 'seconds') < 1.5) {
                    return
                }
                form.validateFields().then(values => {
                    setLoading(true)
                    let data = {
                        ...values,
                        id: editD?.id
                    }
                    dispatch(actions.service.editCertNotice(data)).then(res => {
                        if (res.success) {
                            setModalVisible(false)
                            initTable()
                            clearEditD()
                        }
                        confirmFlag = moment()
                        setLoading(false)
                    })
                })
            }}
            onCancel={() => {
                setModalVisible(false)
                clearEditD()
            }}
            closeOnEsc={false}
            okButtonProps={{ loading: loading }}
            maskClosable={false}
        >
            <Form
                form={form}
                labelCol={{ span: 6 }}
                wrapperCol={{ span: 18 }}
                onValuesChange={(changedValues, allValues) => {
                    const f = changedValues;
                    const v = allValues;
                    if (f['project']) {
                        let nCerts = []
                        certList?.forEach(item => {
                            if (
                                f['project'].includes(item.project) && (
                                    (editD && editD.certIds.includes(item.id)) || item.remain > 0
                                )
                            ) {
                                nCerts.push(item)
                            }
                        })

                        let curCertIds = v['certIds']
                        let nCertIds = curCertIds?.filter(id => {
                            return nCerts.some(c => c.id === id)
                        })
                        form.setFieldsValue({ certIds: nCertIds })
                        setCerts(nCerts)
                    }
                }}
            >
                <Form.Item name="project" label='所属项目' rules={[{ required: true, message: '请选择' }]}>
                    <Select 
                        style={{ width: '100%' }} 
                        showSearch 
                        mode="multiple"
                        dropdownRender={menu => (
                            <>
                                {menu}
                                {projects.length ? <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '4px 4px 0' }}>
                                    <Button block onClick={() => {
                                        form.setFieldsValue({ project: projects })
                                    }}>全选</Button>
                                </div> : ''}
                            </>
                        )}
                    >
                        {
                            projects.map(p => {
                                return <Select.Option key={p} value={p}>{p}</Select.Option>
                            })
                        }
                    </Select>
                </Form.Item>
                <Form.Item name="certIds" label='证书选择' rules={[{ required: true, message: '请选择' }]}>
                    <Select 
                        style={{ width: '100%' }} 
                        showSearch 
                        mode="multiple"
                        dropdownRender={menu => (
                            <>
                                {menu}
                                {certs.length ? <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '4px 4px 0' }}>
                                    <Button block onClick={() => {
                                        form.setFieldsValue({ certIds: certs.map(c => c.id) })
                                    }}>全选</Button>
                                </div> : ''}
                            </>
                        )}
                    >
                        {
                            certs.map((c) => {
                                return <Select.Option key={c.id} value={c.id}>{c.name}</Select.Option>
                            })
                        }
                    </Select>
                </Form.Item>
                <Form.Item name='remain' label='提前提醒天数' rules={[{ required: true, message: '请填写' }]}>
                    <InputNumber style={{ width: '100%' }} min={1} precision={0} />
                </Form.Item>
                <Form.Item name="noticeUsers" label='提醒人' rules={[{ required: true, message: '请选择' }]}>
                    <Select style={{ width: '100%' }} showSearch mode="multiple">
                        {
                            allPepUsers.map((item, index) => {
                                return (
                                    <Select.Option key={index} value={item.id} label={item.name}>
                                        <Tooltip
                                            placement="rightTop"
                                            title={<Space direction="vertical" style={{ justifyContent: 'flex-start' }}>
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
                    </Select>
                </Form.Item>
                <Form.Item
                    name="noticeType"
                    label='提醒方式'
                    rules={[{ required: true, message: '请选择' }]}
                >
                    <Checkbox.Group>
                        <Checkbox value="sms">短信</Checkbox>
                        <Checkbox value="email">邮件</Checkbox>
                    </Checkbox.Group>
                </Form.Item>
            </Form>
        </Modal>
    )
})

export default CertNoticeModal