import React, { useEffect } from 'react';
import { connect } from 'react-redux';



const SetControl = (props) => {
   const { dispatch, actions, clientHeight, history, pomsAmbari, pomsKubesphere } = props
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
               <div style={{ display: 'flex', flexDirection: 'column', width: 200, height: 310 }} onClick={() => {
                  history.push({ pathname: '/facility/serverInformation/grafana', })
               }}>
                  <img src='/assets/images/background/grafana.png' style={{ width: 200, height: 200, marginBottom: 20 }} />
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                     <div style={{ fontWeight: 500, fontSize: 18, color: '#000', width: 75, height: 25, margin: '16px 0 8px' }}>grafana</div>
                     <div style={{ fontSize: 16, color: '#646566' }}>监控可视化工具</div>
                  </div>
               </div>
            </div>

            <div style={{ width: 'calc(33.3%)', display: 'flex', justifyContent: 'center' }}>
               {/* <div style={{ display: 'flex', flexDirection: 'column', width: 200, height: 310 }} onClick={() => {
                  history.push({ pathname: '/facility/serverInformation/kubesphere', })
               }}> */}
               <a target='_blank' href={pomsKubesphere} style={{ display: 'flex', flexDirection: 'column', width: 200, height: 310 }}>
                  <img src='/assets/images/background/kubesphere.png' style={{ width: 200, height: 200, marginBottom: 20 }} />
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                     <div style={{ fontWeight: 500, fontSize: 18, color: '#000', width: 75, height: 25, margin: '16px 0 8px' }}>kubesphere</div>
                     <div style={{ fontSize: 16, color: '#646566' }}>容器应用管理服务</div>
                  </div>
               </a>
               {/* </div> */}
            </div>

            <div style={{ width: 'calc(33.3%)', display: 'flex', justifyContent: 'center' }}>
               <a target='_blank' href={pomsAmbari} style={{ display: 'flex', flexDirection: 'column', width: 200, height: 310 }}>
                  <img src='/assets/images/background/ambari.png' style={{ width: 200, height: 200, marginBottom: 20 }} />
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                     <div style={{ fontWeight: 500, fontSize: 18, color: '#000', width: 75, height: 25, margin: '16px 0 8px' }}>ambari</div>
                     <div style={{ fontSize: 16, color: '#646566' }}>Hadoop集群管理工具</div>
                  </div>
               </a>
            </div>

         </div>
      </div >
   )
}

function mapStateToProps (state) {
   const { auth, global, members, webSocket } = state;
   return {
      clientHeight: global.clientHeight,
      pomsAmbari: global.pomsAmbari,
      pomsKubesphere: global.pomsKubesphere,
   };
}

export default connect(mapStateToProps)(SetControl);
