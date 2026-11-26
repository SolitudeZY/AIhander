import React, { useEffect, useRef, useState } from 'react';
import { connect } from 'react-redux';
import { ApiTable, EmisApiTable, EmisRequest, parseProcessData } from '$utils'
import { Skeleton, Button, Pagination, Form, Popconfirm, Table, message, Tooltip } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { SkeletonScreen, WorkflowModal, WorkflowApprovalModal } from "$components";
import moment from "moment";


const Rest = (props) => {
   const { dispatch, actions, user, socket, pomsProjectBasicAll, allPepUsersIncludeDel } = props
   const { workOrder, service } = actions
   const [query, setQuery] = useState({ limit: 10, page: 0 }); //页码信息
   const [limits, setLimits] = useState(0)//每页实际条数
   const [tableData, setTableData] = useState([]); //获取项目状态列表
   const [loading, setLoading] = useState(true); //获取项目状态列表
   const [workflowModalVisible, setWorkflowModalVisible] = useState(false)
   const [checkProcessInstanceId, setCheckProcessInstanceId] = useState(null)
   useEffect(() => {
      backlogData()
      if (!pomsProjectBasicAll.length) {
         dispatch(workOrder.getPomsProjectBasicAll())
      }
      if (!allPepUsersIncludeDel.length) {
         dispatch(service.getOrganizationUsersIncludeDeleted())
      }
   }, [])

   let backlogData = (obj = {}) => {
      setLoading(true)
      EmisRequest.get(EmisApiTable.processInstancemMyAuditList,
         {
            userId: user?.id,
            businessType: "运维中台表单",
            ...obj,
            queryFormData: 'true'
         })
         .then(res => {
            let nextTableData = (res || []).map(r => {
               let pomsNeedData = {}
               if (r?.formData?.formData && r?.formData?.workflowProcessVersion?.workflowProcessForm?.formSchema) {
                  pomsNeedData = parseProcessData({
                     formSchema: r?.formData?.workflowProcessVersion?.workflowProcessForm?.formSchema,
                     formData: r?.formData?.formData
                  })
               }
               return {
                  ...r,
                  pomsNeedData
               }
            })
            setTableData(nextTableData)
            setLimits(res.length || 0)
            setLoading(false)
         }, error => {
            message.error({ content: '待办工单请求失败', duration: 1, })
            setLoading(false)
         });
   }
   let columns = [{
      title: '序号',
      dataIndex: 'index',
      render: (text, record, index) => index + 1
   }, {
      title: '事项名称',
      dataIndex: 'fsFormItemName',
      render: (text, record, index) => {

         return record?.fsFormItemName || ''
      }
   }, {
      title: '项目名称',
      dataIndex: 'pomsProject',
      render: (text, record, index) => {
         return record.fsFormItemName === '运维中台售后问题处理工单' ?
            pomsProjectBasicAll?.find(item => item.value == record?.pomsNeedData?.pomsProjectId?.value)?.label || '' : record?.pomsNeedData?.projectName?.value || ''

      }
   }, {
      title: '申请内容描述',
      dataIndex: 'applyContent',
      render: (text, record, index) => {
         return record.fsFormItemName === '运维中台售后问题处理工单' ? record?.pomsNeedData?.detail?.value && record?.pomsNeedData?.detail?.value.length > 5 ?
            <Tooltip content={record?.pomsNeedData?.detail?.value}>{record?.pomsNeedData?.detail?.value.substring(0, 5) + '...'}</Tooltip> : record?.pomsNeedData?.detail?.value || '' : record?.pomsNeedData?.applyContent?.value || ''
      }
   },
   // {
   //    title: '关联项目',
   //    dataIndex: 'pomsProject',
   //    render: (text, record, index) => {
   //       const pomsProjectId = record?.pomsNeedData?.pomsProjectId?.value
   //       if (pomsProjectId) {
   //          const corProject = pomsProjectBasicAll.find(p => p.value == pomsProjectId)
   //          return corProject?.label || ''
   //       } else {
   //          return ''
   //       }
   //    }
   // },

   {
      title: '申请人',
      dataIndex: 'applyerName',
   }, {
      title: '申请部门',
      dataIndex: 'applyDepartmentName',
   },

   // {
   //    title: '处理人员',
   //    dataIndex: 'handlingPerson',
   //    render: (text, record, index) => {
   //       // 和 users 对
   //       return record?.pomsNeedData?.handlingPerson?.value ? allPepUsersIncludeDel.find(u => u.id == record?.pomsNeedData?.handlingPerson?.value)?.name : ''
   //    }
   // },

   // {
   //    title: '处理结果',
   //    dataIndex: 'handlingResult',
   //    render: (text, record, index) => {
   //       return record?.pomsNeedData?.handlingResult?.value || ''
   //    }
   // },

   // {
   //    title: '问题类型',
   //    dataIndex: 'issueType',
   //    render: (text, record, index) => {
   //       return record?.pomsNeedData?.issueType?.value || ''
   //    }
   // },
   // {
   //    title: '处理完成时间',
   //    dataIndex: 'completionTime',
   //    render: (text, record, index) => {
   //       return record?.pomsNeedData?.completionTime?.value || ''
   //    }
   // },

   // {
   //    title: '提交时间',
   //    dataIndex: 'startTime',
   //    render: (text, record, index) => text && moment(text).format('YYYY-MM-DD HH:mm:ss') || '--'
   // }, {
   //    title: '期望完成时间',
   //    dataIndex: 'expectTime',
   //    render: (text, record, index) => {
   //       return record?.pomsNeedData?.expectTime?.value || ''
   //    }
   // },
   {
      title: '操作',
      dataIndex: 'hadle',
      render: (text, record, index) => <div style={{ width: 60, color: "#1890ff", cursor: "pointer" }} onClick={() => {
         setCheckProcessInstanceId(record.processInstanceId)
         setWorkflowModalVisible(true)
      }}>查看详情</div>
   }]

   return (
      <>
         <div style={{ background: '#FFFFFF', margin: '8px 12px', padding: '20px 20px 0px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
               <div style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={{ width: 0, height: 20, borderLeft: '3px solid #005ABD', borderTop: '3px solid transparent', borderBottom: '3px solid transparent' }}></div>
                  <div style={{ fontFamily: "YouSheBiaoTiHei", fontSize: 24, color: '#101531', marginLeft: 8 }}>待办工单</div>
                  <div style={{ marginLeft: 6, fontSize: 12, color: '#969799', fontFamily: "DINExp", }}>BACKLOG WORKORDER</div>
               </div>
               <div style={{ marginRight: 20, display: 'flex', alignItems: 'center' }} className='myempush'>
                  <Form
                     // getFormApi={(formApi) => (form.current = formApi)}
                     layout="horizontal"
                     style={{ position: "relative", width: "100%", flex: 1 }}
                     onSubmit={(values) => {
                        if (values?.applyTimes?.length) {
                           values.applyTimes = [moment(values?.applyTimes[0]).format('YYYY-MM-DD HH:mm:ss'), moment(values?.applyTimes[1]).endOf('day').format('YYYY-MM-DD HH:mm:ss')]
                        }
                        backlogData(values)
                        setQuery({ limit: 10, page: 0 });
                        setLimits(0)
                     }}
                  >
                     <Form.DatePicker
                        pure
                        field="applyTimes"
                        label="提交时间"
                        style={{ width: 268 }}
                        type="dateRange" density="compact"
                     />
                     <Form.Input
                        field="keywordsUser"
                        pure
                        allowClear
                        style={{ width: 260, marginLeft: 12, marginRight: 12 }}
                        placeholder="请输入申请人"
                     />
                     <Form.Input
                        field="keywords"
                        pure
                        allowClear
                        style={{ width: 260, marginLeft: 12, marginRight: 12 }}
                        placeholder="请输入事项名称"
                     />
                     <Button theme='solid' type="primary" htmlType="submit">查询</Button>
                  </Form>
               </div>
            </div>

            <div style={{ marginTop: 20 }}>
               <Skeleton
                  loading={loading}
                  // loading={false}
                  active={true}
                  placeholder={SkeletonScreen()}
               >
                  <Table
                     rowKey="name"
                     columns={columns}
                     dataSource={tableData?.slice(query.limit * query.page, (query.page + 1) * query.limit)}
                     bordered={false}
                     hideExpandedColumn={true}
                     empty="暂无数据"
                     pagination={false}
                  />
               </Skeleton>

               <div
                  style={{
                     display: "flex",
                     justifyContent: "space-between",
                     padding: "20px 20px",
                  }}
               >
                  <div>
                  </div>
                  <div style={{ display: 'flex', }}>
                     <span style={{ lineHeight: "30px", fontSize: 13, color: 'rgba(0,90,189,0.8)' }}>
                        共{limits}条工单
                     </span>
                     <Pagination
                        className="22"
                        total={limits}
                        showSizeChanger
                        current={query.page + 1}
                        pageSizeOpts={[10, 20, 30, 40]}
                        onChange={(currentPage, pageSize) => {
                           setQuery({ limit: pageSize, page: currentPage - 1 });
                        }}
                     />
                  </div>
               </div>
            </div>
         </div>
         <WorkflowApprovalModal
            type='approval'
            open={workflowModalVisible}
            processAuditList={tableData}
            checkProcessInstanceId={checkProcessInstanceId}
            onCancel={() => { setWorkflowModalVisible(false) }}
            successCallBack={({ refresh }) => {
               if (refresh) {
                  backlogData()
               }
               setWorkflowModalVisible(false)
            }}
         />
      </>
   )
}

function mapStateToProps (state) {
   const { auth, global, pomsProjectBasicAll, allPepUsersIncludeDel } = state;
   return {
      user: auth.user,
      actions: global.actions,
      pomsProjectBasicAll: pomsProjectBasicAll.data || [],
      allPepUsersIncludeDel: allPepUsersIncludeDel.data || [],
   };
}

export default connect(mapStateToProps)(Rest);
