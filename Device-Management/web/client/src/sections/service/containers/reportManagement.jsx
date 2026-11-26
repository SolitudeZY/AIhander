import React, { useEffect } from 'react';
import { connect } from 'react-redux';



const Rest = (props) => {
   const { dispatch, actions, user, loading, socket, dcWeb } = props

   useEffect(() => {

   }, [])


   return (
      <>
         {/* style={{height: '100%', width: '100%',margin: '8px 12px', padding: '20px 20px 0px 20px'}} */}
         <div >
            <iframe frameBorder="0" src={`${dcWeb}/dataService/download?pcode=`} style={{ height: 'calc(100vh - 80px)', width: 'calc(100%)' }} />
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
      //   socket: webSocket.socket,
      dcWeb: global.dcWeb,
   };
}

export default connect(mapStateToProps)(Rest);
