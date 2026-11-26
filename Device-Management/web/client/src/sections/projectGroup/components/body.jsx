import React, { useEffect, useRef, useState } from 'react';
import { connect } from 'react-redux';

const Body = (props) => {

   return (
      <div style={{
         backgroundImage: "url('/assets/images/projectGroup/body.png')",
         backgroundRepeat: "no-repeat",
         backgroundSize: "100% 100%",
         height: 'calc(100vh - 64px)',
         padding: '24px 16px'
      }}>
         {props?.children}
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

export default connect(mapStateToProps)(Body);
