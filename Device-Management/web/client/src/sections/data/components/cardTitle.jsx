import React, { useEffect, useState, useRef } from 'react';
import { connect } from 'react-redux';
import { QuestionCircleOutlined } from '@ant-design/icons';
import { Tooltip } from 'antd';

const CardTitle = (props) => {
   const {chineseName,englishName,content,isWithHelp  } = props


   return (
      <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
               <div style={{ display: 'flex', alignItems: 'center',margin:'10px 0 0 20px' }}>
                  <div style={{ width: 0, height: 20, borderLeft: '3px solid #005ABD', borderTop: '3px solid transparent', borderBottom: '3px solid transparent' }}></div>
                  <div style={{ fontFamily: "YouSheBiaoTiHei", fontSize: 24, color: '#101531', marginLeft: 8 }}>{chineseName}</div>
                  <div style={{ marginLeft: 6, fontSize: 12, color: '#969799', fontFamily: "DINExp", }}>{englishName}</div>
               </div>
               {isWithHelp?<div style={{margin:'10px 20px 0 0'}}><Tooltip content={content}><QuestionCircleOutlined/></Tooltip></div>:""}
            </div>

      </>
   )
}

function mapStateToProps (state) {
   const {  } = state;
   return {
     
   };
}

export default connect(mapStateToProps)(CardTitle);
