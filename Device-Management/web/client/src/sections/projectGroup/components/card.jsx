import React, { useEffect, useRef, useState } from 'react';
import { connect } from 'react-redux';
import { Tooltip } from 'antd';
const Card = (props) => {
   const { title, style = {},tooltipContent } = props

   return (
      <div style={{
         background: ' #FFFFFF',
         boxShadow: '0 2px 4px 2px #CBD5EE',
         borderRadius: 4,
         // filter: 'blur(5px)',
         padding: '6px 4px',
         ...style
      }}>
         <div style={{
            height: 34, lineHeight: '34px',
            backgroundImage: "url('/assets/images/projectGroup/cardTitle.png')",
            backgroundRepeat: "no-repeat",
            padding: '0 10px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between'
         }}>
            <span style={{ fontSize: 'x-large', letterSpacing: 1, textShadow: '0 0 8px #2a62fc05' }}>{title}</span>
            <Tooltip content={tooltipContent}>
            <img src='/assets/images/projectGroup/cardTitlePoint.png' style={{
               width: 4,
               height: 3,
               background: '#2C66F3',
               boxShadow: '0 0 4px 1px #2C66F3'
            }} />
            </Tooltip>
         </div>
         <div style={{ height:'calc(100% - 34px)', padding: '12px 18px' }}>
            {props?.children}
         </div>
      </div>
   )
}

function mapStateToProps (state) {
   const { auth, global, } = state;
   return {
      user: auth.user,
      actions: global.actions,
   };
}

export default connect(mapStateToProps)(Card);
