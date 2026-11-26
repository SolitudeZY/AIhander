import React, { useState, useEffect } from "react";

function CardHeader ({ title, en }) {

   return <>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 6 }}>
         <span style={{ width: 0, height: 20, margin: "0 8px 0 0", borderLeft: '3px solid #005ABD', borderTop: '3px solid transparent', borderBottom: '3px solid transparent' }}></span>
         <span style={{ fontSize: 24, fontFamily: 'YouSheBiaoTiHei', color: '#101531', }}>{title}</span>
         <span style={{ marginLeft: 6, fontSize: 12, color: "rgb(150, 151, 153)", fontFamily: 'DINExp' }}>{en}</span>
      </div>
   </>
}

export default CardHeader;