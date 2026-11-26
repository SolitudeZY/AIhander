import React, { useEffect, useState } from 'react';
import { connect } from 'react-redux';
import { Avatar, Card, Button } from 'antd';
import { push } from 'react-router-redux';
import '../style.less'
import PerfectScrollbar from "perfect-scrollbar";
const { Meta } = Card;

const UserCenter = (props) => {
   const { dispatch, actions, user, loading, socket } = props

   return (
      <>
         <div style={{ padding: '0px 40px' }}>
            {/* 头部 */}
            <div style={{ margin: '4px 0px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
               <div style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={{ color: '#4A4A4A', fontSize: 14 }}>
                     HI，欢迎回来，{user?.department[0]?.name}
                  </div>
                  <div style={{ fontFamily: 'YouSheBiaoTiHei', fontSize: 20, color: '#005ABD', marginLeft: 4 }}>
                     {user?.name}！
                  </div>
               </div>
            </div>
            {/* 主体 */}
            <div style={{ background: '#FFFFFF', boxShadow: '0px 0px 12px 2px rgba(220,222,224,0.2)', borderRadius: 2, paddingTop: 20, paddingLeft: 24 }}>
               <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                     <div style={{ width: 0, height: 20, borderLeft: '3px solid #005ABD', borderTop: '3px solid transparent', borderBottom: '3px solid transparent' }}></div>
                     <div style={{ fontFamily: "YouSheBiaoTiHei", fontSize: 24, color: '#101531', marginLeft: 8 }}>用户中心</div>
                     <div style={{ marginLeft: 6, fontSize: 12, color: '#969799', fontFamily: "DINExp", }}>USER CENTER</div>
                  </div>
               </div>
               <div style={{ marginTop: 42, marginLeft: 70 }}>
                  <Avatar size="large" style={{ margin: 4, cursor: 'default' }} color="light-blue" alt='User'>
                     {user.name.split('')[0]}
                  </Avatar>
               </div>
            </div>
            {/* moment(row.createTime).format("YYYY-MM-DD HH:mm:ss") */}
         </div>
      </>
   )
}

function mapStateToProps (state) {
   const { auth, global, members, webSocket } = state;
   return {
      user: auth.user,
   };
}

export default connect(mapStateToProps)(UserCenter);
