import React, { useEffect, useState } from 'react';
import { connect } from 'react-redux';
import moment from 'moment';
import { WorkflowModal, WorkFlowViewModal, WorkflowApprovalModal } from "$components"
import { EmisRequest, EmisApiTable } from "$utils"
import { Card, notification, Space, Button, Spin } from 'antd';
import { FileTextOutlined } from '@ant-design/icons';
import '../style.less'

const { Meta } = Card;

const JobOrder = (props) => {
   const { dispatch, actions, user, workflowProcess, clientHeight } = props
   const { workOrder } = actions
   const [workflowModalVisible, setWorkflowModalVisible] = useState(false)
   const [launchProcessId, setLaunchProcessId] = useState(null)
   const [formStateRequestingIndex, setFormStateRequestingIndex] = useState(false)

   useEffect(() => {
      dispatch(workOrder.getEnabledWorkflowProcess())
   }, [])

   return (
      <div>
         <div className='work-order-container' style={{
            display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(340px, 1fr))`, gridAutoRows: `minmax(0, auto)`, gridGap: 12,
         }}>
            {
               workflowProcess.map((p, index) => {
                  return (
                     <Card
                        key={p.id}
                        className='work-order-card'
                        style={{ gridColumn: `span 1`, cursor: 'pointer' }}
                        footerLine={true}
                        footerStyle={{ display: 'flex', justifyContent: 'flex-end' }}
                        footer={
                           `创建时间：${moment(p.createTime || p.updateTime).format('YYYY-MM-DD HH:mm:ss')}`
                        }
                        onClick={() => {
                           if (formStateRequestingIndex) return;
                           setFormStateRequestingIndex(index + 1)
                           EmisRequest.get(EmisApiTable.getProcessByName, {
                              name: decodeURIComponent(p.name),
                              resource: p.id
                           }).then(res => {
                              setFormStateRequestingIndex(false)
                              if (res) {
                                 // if (res.deleted) {
                                 //    notification.error({ title: '该表单流程已删除，请尝试退出账号重新登录或联系项企管理员' })
                                 // } else if (res.isEdited) {
                                 //    notification.error({ title: '该表单流程已修改，请尝试退出账号重新登录或联系项企管理员' })
                                 // } else if (!res.isEnable) {
                                 //    notification.error({ title: '该表单流程已停用，请尝试退出账号重新登录或联系项企管理员' })
                                 // } else
                                    if (res.id) {
                                       setLaunchProcessId(res.id)
                                       setWorkflowModalVisible(true)
                                    }
                              } else {
                                 notification.error({ message: `获取指定流程失败` });
                              }
                           })
                        }}
                     >
                        <div>
                           <Meta
                              title={
                                 <span>{p.name}<Spin style={{ position: 'relative', top: 6, left: 6, }} spinning={formStateRequestingIndex == index + 1} /></span>
                              }
                              avatar={
                                 <FileTextOutlined style={{ fontSize: 42 }} />
                              }
                           />
                        </div>
                     </Card>
                  )
               })
            }
         </div>
         <WorkflowModal
            open={workflowModalVisible}
            title={''}
            processId={launchProcessId}
            onCancel={() => { setWorkflowModalVisible(false) }}
            successCallBack={() => { setWorkflowModalVisible(false) }}
         />
      </div>
   )
}

function mapStateToProps (state) {
   const { auth, global, workflowProcess } = state;
   return {
      user: auth.user,
      actions: global.actions,
      workflowProcess: workflowProcess.data || [],
      clientHeight: global.clientHeight
   };
}

export default connect(mapStateToProps)(JobOrder);