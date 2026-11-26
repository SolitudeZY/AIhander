import React,{useState,useEffect,useRef} from 'react'
import { connect } from 'react-redux';
import { Button, Table, Modal, Form, Input, Select, DatePicker } from 'antd';


const TemporyModal=(props)=>{
    const {visible,onClose,recordRow,pepList,actions,dispatch}=props
    const [form] = Form.useForm();
    const {service}=actions
    useEffect(()=>{
        
    },[])

const okHandler=()=>{
    //form.setFieldsValue({'manger':recordRow?.maintenancePlanExecuteUsers.map((item)=>{return item.id})},)
    form.validateFields().then((res)=>{
        res.manger
        recordRow?.maintenancePlanExecuteUsers
        const query={
            id:recordRow?.id,
            actualFinishTime:res.realityTime,
            planFinishTime:res.planTime,
            reason:res.reason,
            remark:res.notes,
            state:res.status,
            type:'temp',
            missionName:res.taskName,
            manger:res.manger,
            msg:recordRow?'编辑临时响应':'添加临时响应'
        }
        dispatch(service.editMaintenancePlan(query)).then((res)=>{
            if(res.success)     onClose()

        })

    })
}
    return (<div>
        <Modal open={visible} 
        onCancel={()=>{onClose()}} title={recordRow?'临时响应编辑':'临时响应添加'}
        onOk={okHandler}
        >
            <Form
            form={form}
            initialValues={{'taskName':recordRow?.missionName,
            'manger':recordRow?.maintenancePlanExecuteUsers?.map((item)=>{return item.pepUserId}),
            'reason':recordRow?.reason,
            'status':recordRow?.state,
            'notes':recordRow?.remark,
            'planTime':recordRow?.planFinishTime,
            'realityTime':recordRow?.actualFinishTime
        }}
            labelCol={{ span: 6 }}
            labelAlign='left'
        >
                <Form.Item name='taskName' label='任务名称:' rules={[
                        { required: true, message: '请输入任务名称' },
                    ]}>
                    <Input maxLength={30} />
                </Form.Item>
                    <Form.Item name='manger' label='执行人' rules={[{ required: true, message: '请输入执行人' }]} style={{ width:'100%' }}>
                        <Select mode="multiple" showSearch>
                           {pepList?.map((item)=>{
                             let allusers=[]
                             item?.departmentUsers?.forEach(depUser=>{
                                 if(!allusers.some(item=>item.userId===depUser.userId)){
                                     allusers.push({...depUser,id:depUser.userId,name:depUser?.user?.name})
                                 }
                                 
                             })
                            return ( <Select.OptGroup label={item.name}>
                            {allusers.map((item1)=>{
                                
                                return  <Select.Option value={item1.id} label={item1.name}></Select.Option>
                            })}
                           </Select.OptGroup> )})} 
                        </Select>
                    </Form.Item>
                    <Form.Item name='reason' label='操作原因' rules={[{ required: true, message: '请输入操作原因' }]}>
                        <Input maxLength={50} />
                    </Form.Item>

                    <Form.Item name='status' label='状态' style={{ width: 200 }}>
                        <Select>
                            <Select.Option value='未完成'>未完成</Select.Option>
                            <Select.Option value='进行中'>进行中</Select.Option>
                            <Select.Option value='已完成'>已完成</Select.Option>
                            <Select.Option value='挂起'>挂起</Select.Option>
                        </Select>
                    </Form.Item>
                    <Form.Item name='notes' label='备注'>
                        <Input placeholder='故障发生原因及解决方案' />
                    </Form.Item>
                    <Form.Item name='planTime' label='计划完成时间:' rules={[{ required: true, message: '请选择计划完成时间' }]}>
                        <DatePicker />
                    </Form.Item>
                    <Form.Item name='realityTime' label='实际完成时间:'>
                        <DatePicker />
                    </Form.Item>
            </Form>
        </Modal>

    </div>)
}
function mapStateToProps (state) {
    const {  global} = state;
    return {

          actions: global.actions,
   
    };
 }
 
export default connect(mapStateToProps)(TemporyModal)