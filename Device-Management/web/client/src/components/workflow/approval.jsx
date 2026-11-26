'use strict';

import React from 'react';
import { connect } from 'react-redux';
import { Modal, Spin, notification, Row, Space, Button } from 'antd';
import { useState, useRef, useEffect } from 'react';
import { CloseOutlined } from '@ant-design/icons';
import './index.less'

const WorkFlowApprovalModal = (props) => {
   const { visible, onCancel, webEmis, user, processAuditList, checkProcessInstanceId, successCallBack, type } = props;
   const ifreamUrlMap = useRef({
      approval: 'approval/info', // 审批
      myApply: 'process/my-apply', // 我发起的
      notice: 'process/my-apply', // 抄送我的
      hasDone: 'process/my-apply', // 已办的
      draft: 'process/{processId}/draft', // 草稿
      submit: 'process/{processId}/apply' // 重新提交
   })
   const [loading, setLoading] = useState(true);
   const [ifreamUrl, setIfreamUrl] = useState('');
   const iframeRef = React.createRef();

   useEffect(() => {
      window.receiveMessageFromIndex = function (event) {
         if (event && event.data && typeof (event.data) == 'string') {
            let data = JSON.parse(event.data);
            const { type, msg } = data;
            if (msg) {
               notification.success({ message: msg })
            }
            if (
               (type == 'submitSuccess' || type == 'saveSuccess')
               && successCallBack
            ) {
               successCallBack({ refresh: true });
               setLoading(false);
            }
         }
      }
      //监听message事件
      window.addEventListener('message', receiveMessageFromIndex, false);
      return () => {
         window.removeEventListener('message', receiveMessageFromIndex, false);
      }
   }, [])

   useEffect(() => {
      if (iframeRef.current) {
         if (checkProcessInstanceId && processAuditList.length) {
            const corProcessData =
               type == 'draft' ?// 草稿
                  processAuditList.find(p => p.id == checkProcessInstanceId)
                  : processAuditList.find(p => p.processInstanceId == checkProcessInstanceId)
            if (corProcessData) {
               iframeRef.current.contentWindow.postMessage(JSON.stringify(
                  {
                     ...corProcessData
                  }
               ), '*');
            }
         }
      }
   }, [checkProcessInstanceId, iframeRef])

   useEffect(() => {
      let nextUrl = `${webEmis
         }/${ifreamUrlMap.current[type]
         }?token=${user.token
         }&processInstanceId=${checkProcessInstanceId
         }${type == 'notice' ? `&type=notice` : ''
         }${type == 'hasDone' ? `&type=done` : ''
         }`
      if (type == 'draft') {// 草稿
         nextUrl = nextUrl.replace('{processId}', checkProcessInstanceId)
      }
      if (type == 'submit') {// 重新发起
         const corProcessData = processAuditList.find(p => p.processInstanceId == checkProcessInstanceId)
         nextUrl = nextUrl.replace('{processId}', corProcessData?.businessKey)
         nextUrl += `&sourceType=again`
         nextUrl += `&processId=${corProcessData?.businessKey}`
         nextUrl += `&otherSyatem=true`
      }
      setIfreamUrl(nextUrl);
   }, [user, checkProcessInstanceId, type, webEmis])

   return (
      <div>
         <Modal
            fullScreen
            open={visible}
            width={'100%'}
            closable={false}
            hasCancel={false}
            footer={null}
            wrapClassName='process_modal_wrap'
         >
            <div className='workflow-body'>
               <div className='workflow-body-header'>
                  <img src='/assets/images/fs-logo.png' />
                  <span className='workflow-body-header_title'>
                     <span className='workflow-body-header_title_shu'>|</span>
                     <span className='workflow-body-header_title_zi'>让世间万物拥有感知，服务人类社会于美好</span>
                  </span>
                  <CloseOutlined className="workflow-body-header_closeIcon" onClick={() => {
                     if (false && ['approval', 'draft'].includes(type)) {
                        // 通知 ifream 准备关闭
                        iframeRef.current.contentWindow.postMessage({
                           type: 'prepareClose',
                        }, '*')
                     } else {
                        onCancel && onCancel();
                        setLoading(false);
                     }
                  }} />
               </div>
               <div className='workflow-body-form'>
                  <Spin
                     spinning={loading}
                  >
                     {
                        ifreamUrl ?
                           <iframe
                              id='workflowFrame'
                              onLoad={() => {
                                 setLoading(false);
                              }}
                              allowTransparency="true"
                              ref={iframeRef}
                              src={ifreamUrl}
                              width={'100%'}
                              style={{ height: '100vh' }}
                              frameBorder="0"
                           >

                           </iframe>
                           : ''
                     }
                  </Spin>
               </div>
            </div>
         </Modal >
      </div>
   )
}

function mapStateToProps (state) {
   const { auth, global } = state;
   return {
      user: auth.user,
      clientHeight: global.clientHeight,
      webEmis: global.webEmis,
      webOa: global.webOa
   }
}

export default connect(mapStateToProps)(WorkFlowApprovalModal);