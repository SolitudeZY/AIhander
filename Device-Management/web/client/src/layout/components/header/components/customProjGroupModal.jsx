"use strict";
import React, { useEffect, useState, useRef } from 'react'
import { connect, createStore } from "react-redux";
import Immutable from 'immutable';
import { Button, Dropdown, Menu, Avatar, Input, InputNumber, Form, Modal, Select } from 'antd';
import { DownOutlined, SearchOutlined, PlusOutlined } from '@ant-design/icons';
import "../index.less";

const { Option } = Select;

const CustomProjGroupModal = (props) => {
   const { visible, cancel, editData, pomsList, dispatch, actions } = props
   const [form] = Form.useForm();

   useEffect(() => {
      if (visible && editData) {
         form.setFieldsValue(editData);
      } else if (visible) {
         form.resetFields();
      }
   }, [visible, editData, form]);

   return (
      <Modal
         title={(editData ? "修改" : "添加") + "自定义分组"}
         open={visible}
         onOk={(e) => {
            e.preventDefault()
            form.validateFields()
               .then(values => {
                  console.log(values);
                  let stoData = {
                     ...values,
                  }
                  if (editData) {
                     stoData.id = editData.id
                  }
                  dispatch(actions.projectGroup.editProjectGroup(stoData)).then((res) => {
                     if (res.success) {
                        cancel({ refresh: true })
                        form.resetFields()
                     }
                  })
               })
         }}
         onCancel={(e) => {
            e.preventDefault()
            form.resetFields()
            cancel()
         }}
         closeOnEsc={true}
         width={560}
      >
         <Form
            form={form}
            wrapperCol={{ span: 16 }}
            labelCol={{ span: 8 }}
            labelAlign='right'
            initialValues={editData || {}}
         >
            <Form.Item 
               name='name' 
               label='名称' 
               rules={[{ required: true, message: '请填写自定义分组名称' }]}
            >
               <Input maxLength={15} />
            </Form.Item>
            <Form.Item 
               name="pomsProjectIds" 
               label='运维项目' 
               rules={[{ required: true, message: '请选择运维项目' }]}
            >
               <Select 
                  showSearch
                  mode="multiple" 
                  style={{ width: '100%' }}
                  filterOption={(input, option) =>
                     String(option?.children || '').toLowerCase().indexOf(String(input || '').toLowerCase()) >= 0
                  }
               >
                  {
                     pomsList.map((item, index) => {
                        return (
                           <Option key={index} value={item.pepProjectId}>{item.pepProjectName}</Option>
                        )
                     })
                  }
               </Select>
            </Form.Item>
            <Form.Item 
               name='percentage' 
               label='项目集在线百分比'
            >
               <InputNumber min={0} max={100} />
            </Form.Item>
         </Form>
      </Modal>
   )
}

function mapStateToProps (state) {
   const { global, auth } = state;
   return {
      actions: global.actions,
      user: auth.user,
   };
}

export default connect(mapStateToProps)(CustomProjGroupModal);
