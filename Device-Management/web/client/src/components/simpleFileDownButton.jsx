import React, { useState, useEffect, useRef } from "react";
import { connect } from "react-redux";
import moment from 'moment'
import { Button } from 'antd';

const SimpleFileDownButton = (props) => {
   const { src, user } = props
   const [downloadUrl, setDownloadUrl] = useState('')

   return (
      <>
         <Button
            style={{
               width: 65,
               height: 32,
               background: "#FFFFFF",
               borderRadius: 3,
               border: "1px solid #1859C1",
            }}
            onClick={() => {
               setDownloadUrl(`${src}?token=${user.token}&timestamp=${moment().valueOf()}`)
            }}
         >
            导出
         </Button>
         {
            downloadUrl ? <iframe src={`/_api/${downloadUrl}`} style={{ display: 'none' }} /> : ''
         }
      </>
   )
}

function mapStateToProps (state) {
   const { auth } = state;
   return {
      user: auth.user,
   };
}

export default connect(mapStateToProps)(SimpleFileDownButton);