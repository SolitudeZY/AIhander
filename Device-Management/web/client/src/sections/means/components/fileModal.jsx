import React, { useState, useRef, useEffect } from "react";
import { connect } from "react-redux";
import { Modal, Form, Input, Select } from 'antd';
import { ExclamationCircleOutlined } from '@ant-design/icons';


function FileModal (props) {
   const { close, success, dispatch, actions, editData, pepProjectId, higherFile ,type} = props;
   const { means } = actions;
   const [form] = Form.useForm();//表单


   return (
      <>
         <Modal
            title={editData?.id ? '编辑文件夹' : '新建文件夹'}
            okText="确定"
            cancelText="取消"
            open={true}
            onOk={() => {
               form.validateFields().then((v) => {
                  dispatch(means.addEditFile({
                     id: editData?.id,
                     projectId: pepProjectId,
                     fileName: v.fileName,
                     higherFileId: editData?.higherFileId || v.higherFileId || null,
                     type
                  })).then(v => {
                     if (v.success) {
                        close()
                        success()
                     }
                  })
               })
            }}
            width={607}
            onCancel={() => {
               close()
            }}
         >
            <div style={{ margin: "0px 25px" }}>
               <Form
                  form={form}
                  labelCol={{ span: 6 }}
                  wrapperCol={{ span: 18 }}
                  initialValues={{
                     fileName: editData?.fileName
                  }}
               >

                  <Form.Item
                     name='fileName'
                     label='文件夹名称'
                     rules={[{ required: true, message: "请输入文件夹名称,最多20个字", max: 20 }]}
                  >
                     <Input />
                  </Form.Item>

                  {editData?.id ? "" : <Form.Item
                     name="higherFileId"
                     label='上级文件夹'
                  >
                     <Select style={{ width: '100%' }}>
                        {higherFile?.map((item, index) => (
                           <Select.Option key={index} value={item.value}>
                              {item.name}
                           </Select.Option>
                        ))}
                     </Select>
                  </Form.Item>}


               </Form>
            </div>
         </Modal>
      </>
   );
}
function mapStateToProps (state) {
   const { auth, global, members } = state;
   return {
      //   loading: members.isRequesting,
      user: auth.user,
      actions: global.actions,
      //   members: members.data,
   };
}

export default connect(mapStateToProps)(FileModal);
