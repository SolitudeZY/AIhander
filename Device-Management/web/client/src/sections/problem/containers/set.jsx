import React, { useEffect } from 'react';
import { connect } from 'react-redux';



const Set = (props) => {
   const { dispatch, actions, user, loading, socket } = props

   useEffect(() => {

   }, [])


   return (
      <>
         <div>
            <img src="/assets/images/install/watting.png" alt="" style={{ width: 'calc(100% + 16px)', position: "relative", top: -12, left: -8, }} />
         </div>
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

export default connect(mapStateToProps)(Set);
