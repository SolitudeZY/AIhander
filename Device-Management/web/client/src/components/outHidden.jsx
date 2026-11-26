import React, { useState, useEffect } from "react";
import { Tooltip } from 'antd';

function OutHidden ({ name, width, height, color, background, number }) {

   return <>
      {number ?
         <div style={{ display: 'inline-block' }}>
            <Tooltip content={name}>
               <div style={{
                  width: width,
                  height: height,
                  color: color,
                  background: background,
               }}>
                  {name.length > number ? `${name.substr(0, number)}...` : name}
               </div>
            </Tooltip>
         </div>

         : <div style={{ display: 'inline-block' }}>
            <Tooltip content={name}>
               <div style={{
                  width: width,
                  height: height,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  color: color,
                  background: background,

               }}>
                  {name}
               </div>
            </Tooltip>
         </div>}
   </>
}

export default OutHidden;