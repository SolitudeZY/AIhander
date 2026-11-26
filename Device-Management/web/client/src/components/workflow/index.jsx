'use strict';

import React from 'react';
import { connect } from 'react-redux';
import { Modal, Spin, notification, Row, Space, Button } from 'antd';
import { push } from 'react-router-redux';
import { RouteTable } from '../../utils/webapi';
import { EmisRequest, EmisApiTable } from '$utils';
import { useState } from 'react';
import { useEffect } from 'react';
import { CloseOutlined } from '@ant-design/icons';
// import { delDraft } from '../../sections/myform/actions/myform';
import './index.less'

const { confirm } = Modal;

const WorkFlowModal = (props) => {
   // 这个弹框是发起表单滴
   const { successCallBack = () => { }, title, visible, clientHeight, postData, processId, user, dispatch, webEmis, webOa, onCancel } = props;
   const [loading, setLoading] = useState(true);
   const [ifShowMessage, setIfShowMessage] = useState(true);
   const [customVisible, setCustomVisible] = useState(false);
   const [draftId, setDraftId] = useState();
   const iframeRef = React.createRef();

   const handelCancel = () => {
      if (draftId) {
         setCustomVisible(false);
      } else {
         onCancel && onCancel();
         setLoading(false);
      }
   }

   const showConfirm = () => {
      if (draftId) {
         setCustomVisible(true);
      } else {
         confirm({
            title: '确定关闭此表单吗?',
            onOk () {
               handelCancel()
            },
            onCancel () { },
         });
      }
   }

   const handelApprovalCenter = (activeKey) => {
      if (webOa) {
         dispatch(push("/workOrder/workOrderList/preserve"));
      }
   }

   const handelOk = () => {
      const { onCancel } = props;
      onCancel && onCancel();
      setLoading(false);
      setCustomVisible(false);
      setDraftId(null);
   }

   const handelDeny = () => {
      EmisRequest.delete(EmisApiTable.delDraftUrl.replace('{draftId}', draftId)).then(res => {
         notification.success({ message: '删除草稿成功' });
         onCancel && onCancel();
         setLoading(false);
         setCustomVisible(false);
         setDraftId(null);
      })
   }

   const cancel = () => {
      setCustomVisible(false);
   }

   useEffect(() => {
      window.receiveMessageFromIndex = function (event) {
         if (event && event.data && typeof (event.data) == 'string') {
            let data = JSON.parse(event.data);
            const { type, isSaveDraft, setIntervalSave, draftId, msg } = data;
            if (msg) {
               notification.success({ message: msg })
            }
            setDraftId(draftId);
            if (type == 'saveSuccess' && successCallBack) {
               if (ifShowMessage) {
                  if (isSaveDraft) {
                     if (setIntervalSave) {
                        notification.success({ message: '60秒，表单暂存草稿成功' });
                     } else {
                        notification.success({
                           message: <span>保存草稿成功，可在<a style={{}}
                           // onClick={() => handelApprovalCenter("save")}
                           >【工单列表/我发起的】</a>查看详情</span>
                        });
                     }
                  } else {
                     notification.success({ message: '提交成功，可在【工单列表/我发起的】查看详情' });
                     successCallBack();
                  }
                  //防止提示多次
                  setIfShowMessage(false);
               }
               // successCallBack();  阻止页面关闭
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

   return (
      <div>
         <Modal
            fullScreen
            open={visible}
            width={'100%'}
            title={''}
            closable={false}
            hasCancel={false}
            footer={null}
            wrapClassName='process_modal_wrap'
         // onCancel={showConfirm}
         >
            <Row>
               <div className='workflow-body'>
                  <div className='workflow-body-header'>
                     <img src='/assets/images/fs-logo.png' />
                     <span className='workflow-body-header_title'>
                        <span className='workflow-body-header_title_shu'>|</span>
                        <span className='workflow-body-header_title_zi'>让世间万物拥有感知，服务人类社会于美好</span>
                     </span>
                     <CloseOutlined className="workflow-body-header_closeIcon" onClick={showConfirm} />
                  </div>
                  <div className='workflow-body-form'>
                     <Spin
                        spinning={loading}
                     >
                        {
                           webEmis && processId ?
                              <iframe
                                 id='workflowFrame'
                                 onLoad={() => {
                                    let frameWin = document.getElementById('workflowFrame');
                                    frameWin.contentWindow.postMessage(JSON.stringify(postData), '*');
                                    setLoading(false);
                                 }}
                                 allowTransparency="true"
                                 ref={iframeRef}
                                 src={`${webEmis}/process/${processId}/apply?token=${user.token}`}
                                 width={'100%'}
                                 style={{ height: '100vh' }}
                                 frameBorder="0"
                              >

                              </iframe> : ''
                        }
                     </Spin>
                  </div>
               </div>
               {
                  customVisible ?
                     <Modal
                        title="此表单已保存为草稿，是否需要保留"
                        open={customVisible}
                        footer={
                           <Space>
                              <Button type="primary" onClick={() => handelOk()}>
                                 是
                              </Button>
                              <Button type="primary" onClick={() => handelDeny()}>
                                 否
                              </Button>
                              <Button type="primary" onClick={() => cancel()}>
                                 取消
                              </Button>
                           </Space>
                        }
                     >
                     </Modal>
                     : ''
               }
            </Row>
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

export default connect(mapStateToProps)(WorkFlowModal);