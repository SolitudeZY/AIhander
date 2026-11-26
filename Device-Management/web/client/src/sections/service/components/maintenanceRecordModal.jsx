'use strict';

import React, { useEffect, useState, useRef } from 'react';
import { Modal, Form, DatePicker, Button, Input, Select } from 'antd';
import { connect } from 'react-redux';
import moment from 'moment';

const MaintenanceRecordModal = (props) => {
    const { visible, onClose, dispatch, recordRow, pepList, actions, projectList } = props;
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const { service } = actions;

    const [form] = Form.useForm();

    useEffect(() => {
    }, [recordRow]);
    const cancelHandler = () => {
        onClose();
    };
    const okHandler = () => {
        form.validateFields().then((res) => {
            const query = {
                id: recordRow?.id,
                projectId: res.projectName,
                deviceType: res.deviceType,
                model: res.model,
                reason: res.reason,
                solution: res.solution,
                solver: res.solver,
                reportTime: res.reportTime,
                completedTime: res.completedTime,
                status: res.status,
                msg: recordRow ? '编辑维护记录' : '添加维护记录'
            }
            dispatch(service.editEquipment(query)).then((res) => {
                if (res.success) onClose(); form.resetFields()
            })

        })
    }
    return (
        <Modal

            title={recordRow ? '编辑维修记录' : '设备维修记录添加'}
            open={visible}
            onCancel={cancelHandler}
            onOk={okHandler}
        // footer={recordRow?<Button onClick={cancelHandler}>取消</Button>:<div>
        //     <Button onClick={cancelHandler}>取消</Button>
        //     <Button theme='solid' type='primary' onClick={okHandler}>确定</Button>
        // </div>}
        >
            <Form
                form={form}
                labelCol={{ span: 6 }}
                wrapperCol={{ span: 18 }}
                initialValues={{
                    projectName: recordRow?.equipmentMaintenanceRecordProjects?.map((item) => {
                        return item.projectId;
                    })[0],
                    deviceType: recordRow?.equipmentCategory,
                    model: recordRow?.equipmentType,
                    reason: recordRow?.maintenanceReason,
                    solution: recordRow?.solution,
                    solver: recordRow?.equipmentMaintenanceRecordExecuteUsers?.map((item) => { return item.pepUserId }),
                    reportTime: recordRow?.reportTime,
                    completedTime: recordRow?.completedTime,
                    status: recordRow?.status
                }}
            >
                <Form.Item
                    name='projectName'
                    label='项目名称'
                    rules={[{ required: true, message: '请输入项目名称' }]}
                >
                    <Select style={{ width: '80%' }}>
                        {projectList?.map((item) => {
                            return <Select.Option value={item.id} key={item.id}>{item.pepProjectName || item.name}</Select.Option>;
                        })}
                    </Select>
                </Form.Item>
                <Form.Item name='deviceType' label='设备类型:' rules={[{ required: true, message: '请输入设备类型' }]}>
                    <Input maxLength={30} />
                </Form.Item>
                <Form.Item name='model' label='设备型号:'>
                    <Input maxLength={30} />
                </Form.Item>
                <Form.Item name='reason' label='维修原因:' rules={[{ required: true, message: '请输入维修原因' }]}>
                    <Input />
                </Form.Item>
                <Form.Item name='solution' label='解决方案:'>
                    <Input />
                </Form.Item>
                <Form.Item name='solver' label='维修人:'>
                    <Select mode="multiple" showSearch style={{ width: '100%' }}>
                        {pepList?.map((item) => {
                             let allusers=[]
                             item?.departmentUsers?.forEach(depUser=>{
                                 if(!allusers.some(item=>item.userId===depUser.userId)){
                                     allusers.push({...depUser,id:depUser.userId,name:depUser?.user?.name})
                                 }
                                 
                             })
                            return (
                                <Select.OptGroup label={item.name} key={item.id}>
                                    {allusers.map((item1) => {
                                        return <Select.Option value={item1.id} key={item1.id}>{item1.name}</Select.Option>;
                                    })}
                                </Select.OptGroup>
                            );
                        })}
                    </Select>
                </Form.Item>
                <Form.Item
                    name='reportTime'
                    label='上报时间:'
                    rules={[{ required: true, message: '请选择上报时间' }]}
                >
                    <DatePicker showTime />
                </Form.Item>
                <Form.Item name='completedTime' label='维修完成时间:'>
                    <DatePicker showTime />
                </Form.Item>
                <Form.Item name='status' label='状态' rules={[{ required: true, message: '请输入维修状态' }]}>
                    <Select style={{ width: 200 }}>
                        <Select.Option value='待维修'>待维修</Select.Option>
                        <Select.Option value='维修中'>维修中</Select.Option>
                        <Select.Option value='维修完成'>维修完成</Select.Option>
                    </Select>
                </Form.Item>
            </Form>
        </Modal>
    );
};
function mapStateToProps (state) {
    const { auth, global, members, webSocket } = state;
    return {
        //   loading: members.isRequesting,
        //   user: auth.user,
        actions: global.actions
        //   members: members.data,
        //   socket: webSocket.socket
    };
}

export default connect(mapStateToProps)(MaintenanceRecordModal);
