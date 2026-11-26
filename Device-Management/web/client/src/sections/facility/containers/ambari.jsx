import React, { useEffect } from 'react';
import { connect } from 'react-redux';
import { Button } from 'antd';



const Ambari = (props) => {
   const { dispatch, actions,  pomsAmbari, clientHeight } = props

   useEffect(() => {

   }, [])


   return (
      <div style={{ height: clientHeight - 56, width: 'calc(100% + 16px)',margin:"-12px -8px" }}>
         <div style={{
            height: '100%', width: '100%',
            // backgroundImage: "url('/assets/images/background/General.png')",
            // backgroundSize: 'cover',
            // backgroundRepeat: 'no-repeat',
            // position: 'relative',
            // top: -12, left: -8,
         }}>
            {/* <iframe
               frameBorder="0"
               allowFullScreen='true'
               id={'pomsAmbari'}
               src={pomsAmbari}
               width={'100%'}
               height={'100%'}
            //  wmode="transparent"
            //  style={{ pointerEvents: 'none' }}
            /> */}

<a target='_blank' href={pomsAmbari}
               style={{ marginRight: 10 }}
            ><Button theme='solid' type='secondary'>进入网页</Button></a>
         </div>
        
      </div>
   )
}
function mapStateToProps (state) {
   const { auth, global, members, webSocket } = state;
   return {
      clientHeight: global.clientHeight,
      pomsAmbari: global.pomsAmbari,
   };
}

export default connect(mapStateToProps)(Ambari);
