import React, { useEffect, useState, useRef, Toast } from 'react';
import { Modal, Form, Input, notification } from 'antd';
import { connect } from 'react-redux';


const CardModal = (props) => {
    const { showModal, recordRow, actions, dispatch, onClose, closes, addSuccess } = props
    const { analysis } = actions
    const [form] = Form.useForm()

    const submitModal = () => {
        form.validateFields().then((res) => {
            const formData = {
                cardNumber: res.cardNumber,
                yxbz: true,
                id: recordRow?.id,

            }
            dispatch(analysis.addOrUpdateCard(formData)).then((r) => {
                if (r.success) {
                    closes()
                    onClose()
                    //添加成功提示
                    addSuccess()
                }

            })

        })
    };
    //清空表单项内容
    const close = () => {
        closes()
    }

    return (
        <div>
            <Modal
                title={recordRow ? '编辑' : '新增'}
                open={showModal}
                onOk={submitModal}
                onCancel={close}
                closeOnEsc={true}
            >

                <Form
                    //初始值设置字段回显
                    initialValues={{
                        'cardNumber': recordRow?.cardNumber,
                    }}
                    layout='horizontal' form={form}>
                    <Form.Item name='cardNumber' label='物联卡号 :' style={{ width: 220 }} rules={[
                        { required: true, message: '请输入物联卡号' },
                    ]}>
                        <Input placeholder="请输入物联卡号" />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    )
}

function mapStateToProps (state) {
    const { auth, global } = state;
    return {
        user: auth.user,
        actions: global.actions,

    };
}

export default connect(mapStateToProps)(CardModal);

