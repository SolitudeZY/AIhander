import React, { useState, useEffect, useRef } from 'react'
import { connect } from 'react-redux';
import moment from 'moment'
import { Button, Table, Modal, Form, Input, Select, DatePicker } from 'antd';


const AddModal = (props) => {
    const { visible, onClose, recordRow, pepList, actions, dispatch, respondRecordData } = props
    const { service } = actions
    const [form] = Form.useForm();
    const [selectValue, setSelectValue] = useState([])

    useEffect(() => {
    }, [])
    //编辑和新增的逻辑
    const okHandler = () => {
        form.validateFields().then((res) => {
            const query = {
                id: recordRow?.id,
                actualFinishTime: res.realityTime,
                planFinishTime: res.planTime,
                remark: res.notes,
                state: res.status,
                type: 'period',
                missionName: res.taskName,
                manger: res.manger,
                recordId: res.recordId,
                msg: recordRow ? '编辑周期性计划' : '添加周期性计划'
            }
            dispatch(service.editMaintenancePlan(query)).then((res) => {
                if (res.success) { onClose(); form.resetFields(); }


            })

        })
    }
    return (<div>
        <Modal open={visible} onCancel={() => { onClose() }} title={recordRow ? '周期性计划编辑' : '周期性计划添加'}
            onOk={okHandler}

        >
            <Form
                form={form}
                initialValues={{
                    'taskName': recordRow?.missionName,
                    'manger': recordRow?.maintenancePlanExecuteUsers?.map((item) => { return item.pepUserId }),
                    'reason': recordRow?.reason,
                    'status': recordRow?.state,
                    'notes': recordRow?.remark,
                    'planTime': recordRow?.planFinishTime ? moment(recordRow?.planFinishTime) : null,
                    'realityTime': recordRow?.actualFinishTime ? moment(recordRow?.actualFinishTime) : null,
                    'recordId': recordRow?.recordId || [],
                }}
                labelCol={{ span: 6 }}
            >
                <Form.Item name='taskName' label='任务名称:' rules={[
                    { required: true, message: '请输入任务名称' },
                ]}>
                    <Input maxLength={30} />
                </Form.Item>
                <Form.Item name='manger' label='责任人' rules={[{ required: true, message: '请输入责任人' }]}>
                    <Select mode="multiple" showSearch style={{ width: '100%' }}>
                        {pepList?.map((item) => {
                            let allusers=[]
                            item?.departmentUsers?.forEach(depUser=>{
                                if(!allusers.some(item=>item.userId===depUser.userId)){
                                    allusers.push({...depUser,id:depUser.userId,name:depUser?.user?.name})
                                }
                                
                            })
                            return (<Select.OptGroup label={item.name}>
                                {allusers.map((item1) => {
                                    return <Select.Option value={item1.id} label={item1.name}></Select.Option>
                                })}
                            </Select.OptGroup>)
                        })}
                    </Select>
                </Form.Item>
                <Form.Item label='完成情况' name='status'>
                    <Select style={{ width: 200 }}>
                        <Select.Option value='未完成'>未完成</Select.Option>
                        <Select.Option value='进行中'>进行中</Select.Option>
                        <Select.Option value='已完成'>已完成</Select.Option>
                        <Select.Option value='挂起'>挂起</Select.Option>
                    </Select>
                </Form.Item>
                <Form.Item label='备注' name='notes'>
                    <Input placeholder='故障发生原因及解决方案' />
                </Form.Item>
                <Form.Item label='计划完成时间:' name='planTime' rules={[{ required: true, message: '请选择计划完成时间' }]}>
                    <DatePicker showTime />
                </Form.Item>
                <Form.Item label='实际完成时间:' name='realityTime'>
                    <DatePicker showTime />
                </Form.Item>

                <Form.Item name='recordId' label='响应关联：'>
                    <Select mode="multiple" showSearch style={{ width: '100%' }}
                        dropdownStyle={{ width: 400 }}
                    >
                        {respondRecordData?.map((v) => {
                            return <Select.Option key={v.id} value={v.id} label={`${v.sketch} / ${moment(v.occurrenceTime).format('YYYY-MM-DD')}`}>
                                {`${v.sketch} / ${moment(v.occurrenceTime).format('YYYY-MM-DD')}`}
                            </Select.Option>
                        })}
                    </Select>
                </Form.Item>
            </Form>
        </Modal>

    </div>)
}


function mapStateToProps (state) {
    const { global } = state;
    return {
        actions: global.actions,
    };
}
export default connect(mapStateToProps)(AddModal)