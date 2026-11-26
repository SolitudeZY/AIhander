import React, { useEffect, useState, useRef } from 'react'
import { ClearOutlined } from '@ant-design/icons'

const Card = (props) => {
   const {detailList,map } = props
   // console.log('detailList',detailList)
    const closeMapModal=()=>{
        // map.setCenter([115.910522, 28.663076])
        map.clearInfoWindow()
    }
   return (
      <>
          <div style={{width:400,height:200,background:'#fff',position:'relative'}}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
               <div style={{ display: 'flex', alignItems: 'center',margin:'10px 0 0 20px' }}>
                  <div style={{ width: 0, height: 20, borderLeft: '3px solid #005ABD', borderTop: '3px solid transparent', borderBottom: '3px solid transparent' }}></div>
                  <div style={{ fontFamily: "YouSheBiaoTiHei", fontSize: 24, color: '#101531', marginLeft: 8 }}>设备详情</div>
                  <div style={{ marginLeft: 6, fontSize: 12, color: '#969799', fontFamily: "DINExp", }}>DETIAL OF DEVICE</div>
               </div>
            </div>
          <div style={{marginLeft:20,marginBottom:10,fontFamily:'SourceHanSansCN-Medium',fontSize:16,color:'#4a4a4a'}}>
            <div title={detailList?.projectName} style={{marginBottom:10,overflow:'hidden',whiteSpace:'nowrap',textOverflow:'ellipsis'}}>项目名称:{detailList?.projectName}</div>
            <div title={detailList?.structureName} style={{marginBottom:10,overflow:'hidden',whiteSpace:'nowrap',textOverflow:'ellipsis'}}>结构物名称:{detailList?.structureName}</div>
            <div style={{marginBottom:10}}>设备名称:{detailList?.deviceName}</div>
            <div>剩余电量:{Number(detailList?.power)>0?Number(detailList?.power):0}</div>
          </div>
          <div onClick={closeMapModal} style={{position:'absolute',top:10,right:10,cursor:'pointer'}}><ClearOutlined style={{color:'#005ABD'}}/></div>

          </div>

      </>
   )
}



export default Card
