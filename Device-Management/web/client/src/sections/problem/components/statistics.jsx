import React, { useState, useEffect, useRef } from "react";
import { connect } from "react-redux";
import { DatePicker } from 'antd';
import Inspection from "./inspection";

const Statistics = ({ dispatch, actions, route, statistic }) => {
   let title = { dataLnterrupt: "DATA ABORTS", dataAbnormal: "DATA ANOMALY", strategyHit: "ALGORITHM&POLICY HIT" }
   return (
      <>{route == 'useAbnormal' ?
         <Inspection statistic={statistic} route={route} /> :
         <div style={{ width: 'clac(100% - 20px)', height: 260, backgroundColor: 'white', margin: '8px  12px', padding: '20px 20px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',marginBottom:6 }}>
               <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span style={{ width: 0, height: 20, margin: "0 8px 0 0", borderLeft: '3px solid #005ABD', borderTop: '3px solid transparent', borderBottom: '3px solid transparent' }}></span>
                  <span style={{ fontSize: 24, fontFamily: 'YouSheBiaoTiHei', color: '#101531', }}>{statistic[route]}</span>
                  <span style={{ marginLeft: 6, fontSize: 12, color: "rgb(150, 151, 153)", fontFamily: 'DINExp' }}>{title[route]}</span>
               </div>
               <div style={{ fontSize: 24, fontFamily: 'YouSheBiaoTiHei', color: '#BDDBFC' }}><img src="/assets/images/problem/keyboard.png" style={{ width: 30, height: 17, marginRight: 10 }} />开发中，敬请期待！</div>
            </div>
            <img src="/assets/images/problem/bitmap.png" style={{ width: 'calc(100%)', height: 196,  }} />

         </div >
      }</>

   )
}


function mapStateToProps (state) {
   const { auth, global, members } = state;
   return {
      // user: auth.user,
      // actions: global.actions,
      // global: global,
      // members: members.data,
   };
}
export default connect(mapStateToProps)(Statistics);
