import React, { useState, useEffect } from "react";
import { Modal, Checkbox } from 'antd';

function Setup (props) {
   const {
      close,
      tableType,
      tableList,
      layout,  //格式
      data = 8
   } = props;

   const [check, setCheck] = useState([]);

   const checkboxcss = { width: "25%", height: 16, margin: "0 0 20px 0" };

   useEffect(() => {
      //获取是否勾选信息
      const checkItem = localStorage.getItem(tableType);
      setCheck(checkItem ? JSON.parse(checkItem) : [])
      ischeck();
   }, []);
   function ischeck (value) {
      if (check.length >= data) {
         if (check.includes(value)) {
            return false;
         } else {
            return true;
         }
      }
   }

   return (
      <Modal
         title={
            <div>
               表格属性设置
               <span
                  style={{
                     width: 50,
                     lineHeight: "19px",
                     display: "inline-block",

                     color: "white",
                     textAlign: "center",
                     marginLeft: 6,
                     background:
                        check.length == data
                           ? "rgba(40, 123, 255, 1)"
                           : "rgba(176, 176, 176, 1)",
                  }}
               >
                  {check.length}/{data}
               </span>
            </div>
         }
         open={true}
         style={{ width: 600 }}
         onOk={() => {
            localStorage.setItem(tableType, JSON.stringify(check));
            close();
         }}
         onCancel={() => {
            close();
         }}
      >
         <Checkbox
            style={{ width: "100%", fontSize: 14 }}
            key="primary1"
            direction="horizontal"
            defaultValue={check}
            aria-label="表格属性设置"
            onChange={(check) => {
               setCheck(check);
               ischeck();
            }}
         >
            {tableList.map((item, index) => {
               return (
                  <div
                     key={index}
                     style={{
                        width: 550,
                        border: "1px solid #EAEAEA",
                        padding: "0px 5px",
                        borderRadius: 4,
                        marginBottom: "20px",
                     }}
                  >
                     <div
                        style={{
                           borderBottom: "1px solid #EAEAEA",
                           marginLeft: "10px",
                           padding: "8px 0px",
                        }}
                     >
                        {item.title}
                     </div>
                     <div style={{ padding: "15px 12px", width: 530, display: layout == 'long' ? 'flex' : "", flexDirection: layout == 'long' ? 'column' : "" }}>
                        {item.list?.map((itm) => {
                           return (
                              <Checkbox
                                 key={itm.value}
                                 value={itm.value}
                                 style={layout == 'long' ? {} : checkboxcss}
                                 disabled={ischeck(itm.value) || ['workbench', 'handle', 'DeviceAccess', 'discovery'].includes(itm.value)}
                              >
                                 {itm.name}
                              </Checkbox>
                           );
                        })}
                     </div>
                  </div>
               )
            })}
         </Checkbox>
      </Modal>
   );
}

export default Setup;
