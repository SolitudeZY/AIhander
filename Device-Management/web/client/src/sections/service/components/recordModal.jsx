'use strict';

import React, { useEffect, useState, useRef } from 'react';
import { Modal, Form, Input, Select, DatePicker, Upload, Button } from 'antd';
import { connect } from 'react-redux';
import moment from 'moment'
import { DeleteOutlined, EditOutlined, UploadOutlined, ExclamationCircleOutlined, SearchOutlined } from '@ant-design/icons';

const RecordModal = (props) => {
    const { visible, onClose, dispatch, recordRow, pepList, actions, addRecord, qiniu, apiRoot } = props
    const [startTime, setStartTime] = useState('')
    const [endTime, setEndTime] = useState('')
    const [uploadData, setUploadData] = useState({})
    const [form] = Form.useForm();
    const { service } = actions
    // let t=0//天数
    // let h=0//小时数
    // let s=0//秒数
    useEffect(() => {
        setEndTime(recordRow?.solvingTime)
        setStartTime(recordRow?.occurrenceTime)
        setUploadData(recordRow?.files ? (recordRow?.files[0] || {}) : {})
    }, [recordRow])
    const cancelHandler = () => {
        onClose()
        setStartTime('')
        setEndTime('')

    }
    const okHandler = () => {
        form.validateFields().then((res) => {
            const editVal = {
                id: recordRow?.id,
                solvingTime: res.endTime,
                occurrencTime: res.startTime,
                sketch: res.name,
                record: res.record,
                settler: res.settler,
                type: res.type,
                msg: recordRow ? '编辑响应记录' : '添加响应记录',
                files: uploadData?.name ? [{ ...uploadData }] : []
            }

            dispatch(service.addRecord(editVal)).then(res => {
                if (res.success) {
                    onClose()
                    form.resetFields()
                    setStartTime(''); setEndTime('')
                }
            })
        })
    }
    return <Modal
        title={recordRow ? '编辑响应记录' : '添加响应记录'}
        open={visible}
        footer={
            //recordRow?<Button onClick={cancelHandler}>取消</Button>:
            <div>
                <Button onClick={cancelHandler}>取消</Button>
                <Button loading={addRecord} theme='solid' type='primary' onClick={okHandler}>确定</Button>
            </div>}
        onCancel={cancelHandler}
    // onOk={okHandler}
    >
        <Form wrapperCol={{ span: 20 }}
            initialValues={{
                'name': recordRow?.sketch,
                'startTime': recordRow?.occurrenceTime,
                'endTime': recordRow?.solvingTime,
                'settler': recordRow?.maintenanceRecordExecuteUsers?.map((item) => { return item.pepUserId }),
                'type': recordRow?.type,
                'record': recordRow?.record,
                'breakTime': recordRow ? parseInt(recordRow.interruptDuration / 60 / 60 / 24) + '天' +
                    parseInt(recordRow.interruptDuration / 60 / 60 % 24) + '时' +
                    parseInt(recordRow.interruptDuration / 60 % 60) + '分' : '0天0时0秒'
            }}
            form={form}
            labelAlign='right'>
            <Form.Item name='name' label='故障简述:' rules={[{ required: true, message: '请输入故障简述' }]}>
                <Input placeholder='请输入故障简述' maxLength={30} />
            </Form.Item>
            <Form.Item name='startTime' label='发生时间:' rules={[{ required: true, message: '请输入发生时间' }]}>
                <DatePicker showTime onChange={(e) => {
                    const seconds = (moment(endTime).format('x') - moment(e).format('x')) / 1000//两个时间的秒数
                    const tdd = e && endTime ? parseInt(seconds / 60 / 60 / 24) : 0//取整天
                    const tdh = e && endTime ? parseInt(seconds / 60 / 60 % 24) : 0//取整时
                    const tds = e && endTime ? parseInt(seconds / 60 % 60) : 0//取整分
                    setStartTime(e)
                    form.setFieldsValue({ 'breakTime': `${tdd}天${tdh}时${tds}分` })
                }} />
            </Form.Item>
            <Form.Item name='endTime' label='解决时间:' rules={[{ required: true, message: '请输入解决时间' }]}>
                <DatePicker showTime onChange={(e) => {
                    const seconds = (moment(e).format('x') - moment(startTime).format('x')) / 1000//两个时间的秒数
                    const tdd = e && startTime ? parseInt(seconds / 60 / 60 / 24) : 0//取整天
                    const tdh = e && startTime ? parseInt(seconds / 60 / 60 % 24) : 0//取整时
                    const tds = e && startTime ? parseInt(seconds / 60 % 60) : 0//取整分
                    setEndTime(e);
                    form.setFieldsValue({ 'breakTime': `${tdd}天${tdh}时${tds}分` })
                }} />
            </Form.Item>
            <Form.Item name='breakTime' label='中断时间:'>
                <Input disabled />
            </Form.Item>
            {/* 中断时间:{endTime&&startTime? <span style={{marginLeft:30}}>{`${tdd}天${tdh}时${tds}分`}</span>:recordRow?.interruptDuration} */}
            <Form.Item name='settler' label='解决者:' style={{ width: '100%' }} rules={[{ required: true, message: '请输入解决者' }]}>
                <Select mode="multiple" showSearch filterOption={(input, option) =>
                    String(option?.children || '').toLowerCase().indexOf(String(input || '').toLowerCase()) >= 0
                }>
                    {pepList?.map((item) => {
                           let allusers=[]
                           item?.departmentUsers?.forEach(depUser=>{
                               if(!allusers.some(item=>item.userId===depUser.userId)){
                                   allusers.push({...depUser,id:depUser.userId,name:depUser?.user?.name})
                               }
                               
                           })
                        return (<Select.OptGroup label={item.name}>
                            {allusers.map((item1) => {
                                return <Select.Option value={item1.id}>{item1.name}</Select.Option>

                            })}
                        </Select.OptGroup>)
                    })}
                </Select>
            </Form.Item>
            <Form.Item name="type" label='故障类型' style={{ width: 200 }} rules={[{ required: true, message: '请输入故障类型' }]}>
                <Select>
                    <Select.Option value="es异常">es异常</Select.Option>
                    <Select.Option value="数据库异常">数据库异常</Select.Option>
                    <Select.Option value="应用异常">应用异常</Select.Option>
                    <Select.Option value="kafka异常">kafka异常</Select.Option>
                    <Select.Option value="服务器异常">服务器异常</Select.Option>
                    <Select.Option value="DAC进程异常">DAC进程异常</Select.Option>
                    <Select.Option value="K8S集群异常">K8S集群异常</Select.Option>
                    <Select.Option value="redis服务异常">redis服务异常</Select.Option>
                    <Select.Option value="其他">其他</Select.Option>
                </Select>
            </Form.Item>
            <Form.Item name="record" label='故障记录' rules={[{ required: true, message: '请输入故障记录' }]}>
                <Input />
            </Form.Item>

            <div style={{ display: 'flex', marginLeft: 30 }}>
                <div style={{ marginTop: 6 }}>文件：</div>
                <Upload
                    style={{ display: 'inline-block' }}
                    action={`${apiRoot}/attachments/p`}
                    defaultFileList={recordRow?.files?.map(v => ({ url: `/_file-server/${v.url}`, name: v.name, status: 'success', preview: ['png', 'jpg'].includes(v.name?.split('.')?.pop()?.replace('.', '')), })) || []}
                    accept={'.txt, .doc, .docx, .xls, .xlsx, .pdf, .png, .jpg, .rar, .zip'}
                    limit={1}
                    maxSize={51200}
                    onRemove={() => {
                        setUploadData({})
                    }}
                    onSuccess={(responseBody, file) => {
                        setUploadData({
                            name: file.name,
                            size: file.size,
                            url: responseBody?.uploaded,
                            uploadTime: moment().format("YYYY-MM-DD HH:mm:ss")
                        })
                    }}
                >
                    <Button icon={<UploadOutlined />} theme="light">
                        文件上传
                    </Button>
                </Upload>
            </div>

        </Form>



    </Modal>
}
function mapStateToProps (state) {
    const { auth, global, members, webSocket, addRecord } = state;
    return {
        addRecord: addRecord.isRequesting,
        //   user: auth.user,
        actions: global.actions,
        qiniu: global.qiniu?.domain,
        apiRoot: global.apiRoot
    };
}

export default connect(mapStateToProps)(RecordModal);
