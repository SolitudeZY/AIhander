import React, { useEffect } from 'react';
import { connect } from 'react-redux';
import { Spin, Card } from 'antd';
import '../style.less'
const { Meta } = Card;

const Example = (props) => {
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
      <Spin tip="biubiubiu~" spinning={loading}>
         <div id='example'>
         <div className="loader1">
                    <span></span>
                    <span></span>
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
                <div className='loader2'>

                </div>
            <p>STYLE EXAMPLE</p>
         </div>
         {/* <Card
            style={{ maxWidth: 300 }}
            cover={
               <img
                  alt="example"
                  src="https://lf3-static.bytednsdoc.com/obj/eden-cn/ptlz_zlp/ljhwZthlaukjlkulzlp/root-web-sites/card-cover-docs-demo2.jpeg"
               />
            }
         >
            <Meta title="组件示例" />
         </Card> */}
      </Spin>
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

export default connect(mapStateToProps)(Example);
