'use strict';

import React from 'react';
import { connect } from 'react-redux';
import { Modal, Spin, Row } from 'antd';
import { useState } from 'react';
import { CloseOutlined } from '@ant-design/icons';
import './index.less'

const { confirm } = Modal;

const WorkFlowViewModal = (props) => {
   const { visible, clientHeight, postData, processId, user, webEmis, webOa } = props;
   const [loading, setLoading] = useState(true);
   const [ifShowMessage, setIfShowMessage] = useState(true);
   const iframeRef = React.createRef();

   const handelCancel = () => {
      const { onCancel } = props;
      onCancel && onCancel();
      setLoading(false);
   }

   const showConfirm = () => {
      confirm({
         title: '确定关闭此表单吗?',
         onOk () {
            handelCancel()
         },
         onCancel () { },
      });
   }

   return (
      <div>
         <Modal
            fullScreen
            open={visible}
            width={'100%'}
            title={''}
            closable={false}
            footer={null}
            wrapClassName='process_modal_wrap'
            onCancel={showConfirm}
         >
            <Row>
               <div className='workflow-body'>
                  <div id="processHeader" className='workflow-body-header'>
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
                        {webEmis && processId ? <iframe
                           id='workflowViewFrame'
                           name='workflowViewFrame'
                           onLoad={() => {
                              let frameWin = document.getElementById('workflowViewFrame');
                              frameWin.contentWindow.postMessage(JSON.stringify(postData), '*');
                              setLoading(false);
                           }}
                           allowTransparency="true"
                           ref={iframeRef}
                           src={`${webEmis}/process/my-apply?token=${user.token}&processInstanceId=${processId}&type=oaleader`}
                           width={'100%'}
                           style={{ height: '100vh' }}
                           frameBorder="0"
                        ></iframe> : ''}
                     </Spin>
                  </div>
               </div>
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

export default connect(mapStateToProps)(WorkFlowViewModal);