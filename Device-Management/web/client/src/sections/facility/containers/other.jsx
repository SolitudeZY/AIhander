import React, { useEffect } from 'react';
import { connect } from 'react-redux';



const SetControl = (props) => {
   const { dispatch, actions, clientHeight, history, pomsKowl, pomsPghero, pomsEs } = props

   useEffect(() => {

   }, [])


   return (
      <div style={{ height: clientHeight - 70, width: '100%', }}>

         <div style={{
            backgroundImage: "url('/assets/images/background/tool.png')",
            backgroundSize: '100% 100%',
            backgroundRepeat: 'no-repeat',
            width: 'calc(100% - 20px)',
            height: 310,
            margin: "20px 0 0 10px",
            display: 'flex'
         }}>
            <div style={{ width: 'calc(33.3%)', display: 'flex', justifyContent: 'center' }}>
               {/* <div style={{ display: 'flex', flexDirection: 'column', width: 200, height: 310 }} onClick={() => {
                  history.push({ pathname: '/facility/other/kowl', })
               }}> */}
               <a target='_blank' href={pomsKowl} style={{ display: 'flex', flexDirection: 'column', width: 200, height: 310 }}>
                  <img src='/assets/images/background/kowl.png' style={{ width: 200, height: 200, marginBottom: 20 }} />
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                     <div style={{ fontWeight: 500, fontSize: 18, color: '#000', width: 75, height: 25, margin: '16px 0 8px' }}>kowl监控</div>
                     <div style={{ fontSize: 16, color: '#646566' }}>kafka消息可视化工具</div>
                  </div>
               </a>
               {/* </div> */}
            </div>

            <div style={{ width: 'calc(33.3%)', display: 'flex', justifyContent: 'center' }}>
               {/* <div style={{ display: 'flex', flexDirection: 'column', width: 200, height: 310 }} onClick={() => {
                  history.push({ pathname: '/facility/other/pghero', })
               }}> */}
               <a target='_blank' href={pomsPghero} style={{ display: 'flex', flexDirection: 'column', width: 200, height: 310 }}>
                  <img src='/assets/images/background/pghero.png' style={{ width: 200, height: 200, marginBottom: 20 }} />
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                     <div style={{ fontWeight: 500, fontSize: 18, color: '#000', width: 75, height: 25, margin: '16px 0 8px' }}>pghero</div>
                     <div style={{ fontSize: 16, color: '#646566' }}>PostgreSQL 性能监控工具</div>
                  </div>
               </a>
               {/* </div> */}
            </div>

            <div style={{ width: 'calc(33.3%)', display: 'flex', justifyContent: 'center' }}>
               {/* <div style={{ display: 'flex', flexDirection: 'column', width: 200, height: 310 }} onClick={() => {
                  history.push({ pathname: '/facility/other/es', })
               }}> */}
               <a target='_blank' href={pomsEs} style={{ display: 'flex', flexDirection: 'column', width: 200, height: 310 }}>
                  <img src='/assets/images/background/es.png' style={{ width: 200, height: 200, marginBottom: 20 }} />
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                     <div style={{ fontWeight: 500, fontSize: 18, color: '#000', width: 75, height: 25, margin: '16px 0 8px' }}>es监控</div>
                     <div style={{ fontSize: 16, color: '#646566' }}>es可视化管理工具</div>
                  </div>
               </a>
               {/* </div> */}
            </div>

         </div>
      </div >
   )
}

function mapStateToProps (state) {
   const { auth, global, members, webSocket } = state;
   return {
      clientHeight: global.clientHeight,
      pomsKowl: global.pomsKowl,
      pomsPghero: global.pomsPghero,
      pomsEs: global.pomsEs,

   };
}

export default connect(mapStateToProps)(SetControl);
