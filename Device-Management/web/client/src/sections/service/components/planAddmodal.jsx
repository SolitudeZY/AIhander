import React, { useState, useEffect, useRef } from 'react'
import { connect } from 'react-redux';
import moment from 'moment'
import { Button, Table, Modal, Form, Input, Select, DatePicker } from 'antd';


const PlanAddmodal = (props) => {
   const { visible, onClose, recordRow, actions, dispatch } = props
   const { service, install } = actions
   const [pepList, setPepList] = useState([])//角色分配

   const [form] = Form.useForm();
   const [selectValue, setSelectValue] = useState([])

   useEffect(() => {
      dispatch(install.getOrganizationDeps()).then((res) => {//获取项企(PEP)全部部门及其下用户
         setPepList(res.payload.data)
      })
   }, [])
   //编辑和新增的逻辑
   const okHandler = () => {
      form.validateFields().then((res) => {
         const query = {
            actualFinishTime: res.realityTime,
            planFinishTime: res.planTime,
            remark: res.notes,
            state: res.status,
            type: 'period',
            missionName: res.taskName,
            manger: res.manger,
            recordId: [recordRow.id],
            msg: '添加周期性计划'
         }
         dispatch(service.editMaintenancePlan(query)).then((res) => {
            if (res.success) onClose(); form.resetFields()


         })

      })
   }
   return (<div>
      <Modal open={visible} onCancel={() => { onClose() }} title={'添加周期性计划'}
         onOk={okHandler}

      >
         <Form
            form={form}
            labelCol={{ span: 6 }}
            wrapperCol={{ span: 18 }}
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
                     return (<Select.OptGroup label={item.name} key={item.id}>
                        {allusers.map((item1) => {
                           return <Select.Option value={item1.id} key={item1.id}>{item1.name}</Select.Option>
                        })}
                     </Select.OptGroup>)
                  })}
               </Select>
            </Form.Item>
            <Form.Item name='status' label='完成情况'>
               <Select style={{ width: 200 }}>
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
   const { global } = state;
   return {
      actions: global.actions,
   };
}
export default connect(mapStateToProps)(PlanAddmodal)