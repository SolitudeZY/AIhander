import React, { useEffect, useState, useImperativeHandle, useRef } from 'react';
import moment from 'moment';
import { Input, Space, Button, Form, Modal, DatePicker } from 'antd';

const CertModal = React.forwardRef((props, ref) => {
    const { editD, dispatch, actions, initTable, clearEditD } = props
    const [form] = Form.useForm();
    const [modalVisible, setModalVisible] = useState(false)
    const [loading, setLoading] = useState(false)

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
        if (modalVisible && editD) {
            form.setFieldsValue(editD);
        }
    }, [modalVisible, editD, form])

    return (
        <Modal
            title={`${editD ? '编辑' : '新增'}证书`}
            open={modalVisible}
            onOk={() => {
                form.validateFields().then(values => {
                    setLoading(true)
                    let data = {
                        ...values,
                        dateStart: moment(values.dayStart).format('YYYY-MM-DD'),
                        dateEnd: moment(values.dayEnd).format('YYYY-MM-DD'),
                        id: editD?.id
                    }
                    dispatch(actions.service.editCert(data)).then(res => {
                        if (res.success) {
                            setModalVisible(false)
                            initTable()
                            clearEditD()
                        }
                        setLoading(false)
                    })
                })
            }}
            onCancel={() => {
                clearEditD()
                setModalVisible(false)
            }}
            closeOnEsc={false}
            okButtonProps={{ loading: loading }}
            maskClosable={false}
        >
            <Form
                form={form}
                labelCol={{ span: 6 }}
                wrapperCol={{ span: 18 }}
                initialValues={editD || {}}
            >
                <Form.Item name='name' label='名称' rules={[{ required: true, message: '请填写' }]}>
                    <Input maxLength={15} />
                </Form.Item>
                <Form.Item name="dayStart" label='开始时间' rules={[{ required: true, message: '请选择' }]}>
                    <DatePicker />
                </Form.Item>
                <Form.Item name="dayEnd" label='结束时间' rules={[
                    { required: true, message: '请选择' },
                    ({ getFieldValue }) => ({
                        validator(_, value) {
                            if (!value) {
                                return Promise.reject(new Error('请选择'));
                            }
                            const dayStart = getFieldValue('dayStart');
                            if (dayStart && moment(value).isSameOrBefore(moment(dayStart), 'day')) {
                                return Promise.reject(new Error('结束时间不能早于开始时间'));
                            }
                            return Promise.resolve();
                        },
                    }),
                ]}>
                    <DatePicker />
                </Form.Item>
                <Form.Item name='project' label='所属项目' rules={[{ required: true, message: '请选择' }]}>
                    <Input />
                </Form.Item>
            </Form>
        </Modal>
    )
})

export default CertModal