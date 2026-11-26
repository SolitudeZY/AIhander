import React, { useEffect } from 'react';
import { connect } from 'react-redux';
import { Button } from 'antd';


const Kubesphere = (props) => {
   const { dispatch, actions,  pomsKubesphere, clientHeight,history } = props

   useEffect(() => {

   }, [])


   return (
      <div style={{ height: clientHeight - 56, width: 'calc(100% + 16px)',margin:"-12px -8px" }}>
          <div style={{ width: 'calc(100%)', height: 40, padding:'0 10px',display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Button theme='light' type='secondary' onClick={() => {
                  history.push({ pathname: '/facility/serverInformation/monitor',  })
               }}>返回</Button>
            <a target='_blank' href={pomsKubesphere}
            ><Button theme='light' type='secondary'>进入网页</Button></a>
         </div>
         <div style={{
            height: 'calc(100% - 40px)', width: '100%',
            // backgroundImage: "url('/assets/images/background/General.png')",
            // backgroundSize: 'cover',
            // backgroundRepeat: 'no-repeat',
            // position: 'relative',
            // top: -12, left: -8,
         }}>
            <iframe
               frameBorder="0"
               allowFullScreen='true'
               id={'pomsKubesphere'}
               src={pomsKubesphere}
               width={'100%'}
               height={'100%'}
            //  wmode="transparent"
            //  style={{ pointerEvents: 'none' }}
            />
         </div>

      </div>
   )
}
function mapStateToProps (state) {
   const { auth, global, members, webSocket } = state;
   return {
      clientHeight: global.clientHeight,
      pomsKubesphere: global.pomsKubesphere,
   };
}

export default connect(mapStateToProps)(Kubesphere);
