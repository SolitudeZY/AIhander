import React, { useState, useRef, useEffect } from "react";
import { connect } from "react-redux";
import { Modal, Form, notification, Tooltip, Upload, Button, Input, Select } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import moment from "moment";


const FileModal = ({ actions, dispatch, apiRoot, qiniuUrl, visible, close,success, projectList }) => {

   const { service, problem } = actions;
   const [form] = Form.useForm();//表单
   const [abnormal, setAbnormal] = useState(false); //异常率推送机制disable
   const [usersList, setUsersList] = useState([]); //获取全部未删除用户
   const [structure, setStructure] = useState(true); //结构物disable
   const [projectPoms, setProjectPoms] = useState([]); //获取已绑定项目
   const [projectStructure, setProjectStructure] = useState([]); //获取绑定项目下结构物
   const [timeTypeDis, setTimeTypeDis] = useState(true); //通知时效disable
   const [projectStatus, setProjectStatus] = useState([]); //获取项目状态列表
   const timeTypePOMS = useRef([]);//表单

   const [interval1, setInterval1] = useState(undefined); //
   const [interval2, setInterval2] = useState(undefined); //
   const [interval3, setInterval3] = useState(undefined); //
   const [deviceProportion, setDeviceProportion] = useState(undefined); //
   const [subType, setSubType] = useState([]); //监听模块中的子类
   const [factorShow, setFactorShow] = useState([]); //结构物对应监测项
   const [firstPass, setFirstPass] = useState(true)
   const [uploadData, setUploadData] = useState({})

   return (
      <>
         <Modal
            title={'文件上传'}
            okText="确定"
            cancelText="取消"
            open={visible}
            onOk={() => {
               form.validateFields().then((v) => {
                  if (uploadData?.url) {
                     dispatch(service.postReportFile({
                        projectId: v.projectId,
                        fileName: v.fileName,
                        reportType: v.reportType,
                        startTime: moment().format('YYYY-MM-DD HH:mm:ss'),
                        url: qiniuUrl + '/' + uploadData?.url
                     })).then((res) => {
                        if (res.success) {
                           close()
                           success()
                        }
                     })
                  } else {
                     notification.error({
                        message: '请上传文件',
                        duration: 2,
                     })
                  }
               })
            }}
            width={500}
            onCancel={() => close()}
         >
            <Form
               form={form}
               labelCol={{ span: 6 }}
               wrapperCol={{ span: 18 }}
               onValuesChange={(changedValues, allValues) => {

               }}
            >
               <Form.Item
                  label="请选择项目:"
                  name="projectId"
                  rules={[{ required: true, message: "请选择项目" }]}
               >
                  <Select
                     placeholder="请选择项目"
                     style={{ width: 300 }}
                     showSearch
                     options={projectList?.map(v => ({ value: v.id, label: v.name || v.pepProjectName }))}
                  />
               </Form.Item>
               <Form.Item
                  name="fileName"
                  label='文件名称'
                  rules={[{ required: true, message: "请输入文件名称" }]}
               >
                  <Input
                     style={{ width: 300 }}
                     placeholder="请输入文件名称"
                     allowClear
                  />
               </Form.Item>
               <Form.Item
                  label="报表类型"
                  name="reportType"
                  rules={[{ required: true, message: "请选择报表类型" }]}
               >
                  <Select
                     placeholder="请选择报表类型"
                     style={{ width: 300 }}
                     showSearch
                     options={[{ value: "月报表", label: "月报表" }, { value: "季报表", label: "季报表" }, { value: "年报表", label: "年报表" }]}
                  />
               </Form.Item>
               <div style={{ display: 'flex', marginLeft: 69, marginTop: 10 }}>
                  <div style={{ marginTop: 6 }}>文件:<span style={{ color: 'red' }}>*</span></div>
                  <Upload
                     style={{ display: 'inline-block', marginLeft: 22 }}
                     action={`${apiRoot}/attachments/p`}
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
         </Modal >
      </>
   );
}
function mapStateToProps (state) {
   const { auth, global, members } = state;

   return {
      //   loading: members.isRequesting,
      user: auth.user,
      actions: global.actions,
      apiRoot: global.apiRoot,
      qiniuUrl: global.qiniu?.domain
   };
}

export default connect(mapStateToProps)(FileModal);
