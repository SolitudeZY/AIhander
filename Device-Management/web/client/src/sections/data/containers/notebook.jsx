import React, { useEffect } from 'react';
import { connect } from 'react-redux';
import { Button } from 'antd';



const Grafana = (props) => {
   const { dispatch, actions, user, loading, socket, pomsNotebook, clientHeight } = props

   useEffect(() => {

   }, [])



   return (
      <div style={{ height: clientHeight - 56, width: 'calc(100% + 16px)', margin: "-12px -8px", position: 'relative' }}>
         {/* <div style={{ width: 'calc(100%)', height: 40, padding:'0 10px',display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Button theme='light' type='secondary' onClick={() => {
                  history.push({ pathname: '/facility/serverInformation/monitor',  })
               }}>返回</Button>
            <a target='_blank' href={pomsMonitor}
            ><Button theme='light' type='secondary'>进入网页</Button></a>
         </div> */}
         <div style={{
            height: 'calc(100%)', width: '100%',
            backgroundImage: "url('/assets/images/background/General.png')",
            backgroundSize: 'cover',
            backgroundRepeat: 'no-repeat',
            // position: 'relative',
            // top: -12, left: -8,
         }}>
            {/* <iframe
               frameBorder="0"
               allowFullScreen='true'
               id='monitor'
               src={pomsMonitor}
               width={'100%'}
               height={'100%'}
            //  wmode="transparent"
            //  style={{ pointerEvents: 'none' }}
            /> */}
            <div style={{ position: 'absolute', top: 'calc(50%)', left: 'calc(10%)', }}>
               <div style={{
                  width: 184, height: 48, fontWeight: 400, color: '#FFFFFF', lineHeight: '48px', backgroundImage: "url('/assets/images/background/B.png')", textAlign: 'center',
                  backgroundSize: 'cover',
                  backgroundRepeat: 'no-repeat',
               }}>
                  <a target='_blank' href={pomsNotebook}
                     style={{ width: '100%', height: '100%', display: 'block' }}
                  > 进入Notebook</a>
               </div>
               <div style={{ width: 679, height: 40, fontSize: 28, fontWeight: 400, color: '#146AD7', lineHeight: '40px', marginTop: 40 }}>
                  点击可跳转 数据分析网站notebook</div>
            </div>
         </div>
         {/* <iframe frameBorder="0" src={pomsMonitor} style={{height: 'calc(100vh - 80px)', width: 'calc(100%)'}} /> */}
      </div>
   )
}
function mapStateToProps (state) {
   const { auth, global, members, webSocket } = state;
   return {
      //   loading: members.isRequesting,
      //   user: auth.user,
      //   actions: global.actions,
      //   members: members.data,
      clientHeight: global.clientHeight,
      pomsNotebook: global.pomsNotebook,
   };
}

export default connect(mapStateToProps)(Grafana);
