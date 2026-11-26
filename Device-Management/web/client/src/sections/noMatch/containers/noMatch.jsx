import React, { useEffect } from 'react';
import { connect } from 'react-redux';
import moment from 'moment';
import '../style.less'

const NoMatch = (props) => {

   return (
      <div>
         <div style={{ textAlign: 'center', padding: 120 }}>
            <p style={{ fontSize: 80, lineHeight: 1.5 }}>404</p>
            <p style={{ fontSize: 32, lineHeight: 2 }}>PAGE NOT FOUND</p>
            <p>很遗憾，您暂时无法访问该页面。</p>
            <p>请检查您访问的链接地址是否正确。</p>
            <p style={{ marginTop: 80 }}>Copyright © {moment().year()} 飞尚运维服务</p>
         </div>
      </div>
   )
}

function mapStateToProps (state) {
   const { } = state;
   return {
      
   };
}

export default connect(mapStateToProps)(NoMatch);
