import React, { useEffect } from 'react';
import { connect } from 'react-redux';
import { Spin, Card } from 'antd';
import '../style.less'
const { Meta } = Card;

const Console = (props) => {
   const { dispatch, actions, user, loading, socket } = props

   useEffect(() => {
      // ACTION 示例
      //   dispatch(actions.example.getMembers(user.orgId))
   }, [])

   // websocket 使用测试
   //    useEffect(() => {
   //       console.log(socket)
   //       if (socket) {
   //          socket.on('TEST', function (msg) {
   //             console.info(msg);
   //          });
   //          return () => {
   //             socket.off("TEST");
   //          }
   //       }

   //    }, [socket])

   return (
      <>
            <img src="/assets/images/install/watting.png" alt="" style={{
               width: 'calc(100% + 16px)', position: "relative",top: -12, left: -8,
            }} />
      </>
   )
}

function mapStateToProps (state) {
   const { auth, global, members, webSocket } = state;
   return {
      //   loading: members.isRequesting,
      //   user: auth.user,
      //   actions: global.actions,
      //   members: members.data,
      //   socket: webSocket.socket
   };
}

export default connect(mapStateToProps)(Console);
