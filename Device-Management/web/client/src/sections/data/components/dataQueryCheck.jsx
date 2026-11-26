import React, { useEffect, useState, useRef } from 'react';
import { connect } from 'react-redux';
import moment from 'moment';
import SimpleBar from 'simplebar-react';
import { SkeletonScreen, } from "$components";
import { SearchOutlined } from '@ant-design/icons';
import { Form, Button, Skeleton, Table, Pagination, Drawer } from 'antd';
import '../style.less'

function DataQueryCkeck (props) {
   const { clientWidth, visible, onCancel, checkData, actions, dispatch, dataContinuityType } = props
   const { data: sectionData } = actions
   const [loading, setLoading] = useState(false);
   const [htmlCode, setHtmlCode] = useState('');

   useEffect(() => {
      if (checkData.id) {
         setLoading(true)
         setHtmlCode('')
         dispatch(sectionData.getContinuityDetail(checkData.id)).then(res => {
            if (res.success) {
               setHtmlCode(res.payload?.data?.file || '')
            }
            setLoading(false)
         })
      }
   }, [checkData])

   return (
      <Drawer
         title={`${checkData?.alarmDataContinuityType?.name || dataContinuityType?.find(d => d.typeNumber == checkData.type)?.name} ${moment(checkData.createTime).format('YYYY-MM-DD HH:mm:ss')}`}
         open={visible}
         onCancel={() => {
            onCancel()
            setHtmlCode('')
         }}
         width={clientWidth - 200}
      >
         <SimpleBar style={{ height: 'calc(100vh - 82px)', }} forceVisible="y"  >
            <Skeleton
               loading={loading}
               active={true}
               placeholder={SkeletonScreen()}
            >
               <div dangerouslySetInnerHTML={{ __html: htmlCode }} />
            </Skeleton>
         </SimpleBar>
      </Drawer>
   )
}

function mapStateToProps (state) {
   const { auth, global, dataContinuityType } = state;
   return {
      user: auth.user,
      actions: global.actions,
      clientWidth: global.clientWidth,
      dataContinuityType: dataContinuityType.data || [],
   };
}

export default connect(mapStateToProps)(DataQueryCkeck);