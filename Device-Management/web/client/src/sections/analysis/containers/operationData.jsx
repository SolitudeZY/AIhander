import React, { useEffect, useState } from 'react';
import { connect } from 'react-redux';
import { Spin, Card, Divider } from 'antd';
import '../style.less'
import ReactECharts from 'echarts-for-react';
const { Meta } = Card;

const Console = (props) => {
   const { dispatch, actions, user, loading, socket, clientHeight } = props
   const [left1List, setLeft1List] = useState([])//故障发生时间分析的数据
   const [right1List, setRight1List] = useState([])//系统可用性分析的数据
   const [left2List, setLeft2List] = useState([])//故障类型分析的数据
   const [right2List, setRight2List] = useState([])//运维人员分析的数据
   const { analysis } = actions
   useEffect(() => {
      // ACTION 示例
      //   dispatch(actions.example.getMembers(user.orgId))
   }, [])
   useEffect(() => {
      //故障发生时间分析接口
      dispatch(analysis.getFailureTime()).then((res) => {
         if (res.success) setLeft1List(res.payload.data)
      })
      //系统可用性分析接口
      dispatch(analysis.getSystemAvailability()).then((res) => {
         if (res.success) setRight1List(res.payload.data)
      })
      //故障类型接口
      dispatch(analysis.getProblemType()).then((res) => {
         if (res.success) setLeft2List(res.payload.data)
      })
      //运维人员
      dispatch(analysis.getOperationsPersonnel()).then((res) => {
         if (res.success) setRight2List(res.payload.data)
      })

   }, [])


   // websocket 使用测试
   //    useEffect(() => {
   //       if (socket) {
   //          socket.on('TEST', function (msg) {
   //             console.info(msg);
   //          });
   //          return () => {
   //             socket.off("TEST");
   //          }
   //       }

   //    }, [socket])

   return (
      <>
         {/* <img src="/assets/images/install/watting.png" alt="" style={{   width: 'calc(100% + 16px)', position: "relative",top: -12, left: -8, }} /> */}
         <div style={{ background: '#FFFFFF', margin: '8px 12px', padding: '20px 20px 0px 20px', minHeight: clientHeight - 32, display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
               <div style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={{ width: 0, height: 20, borderLeft: '3px solid #005ABD', borderTop: '3px solid transparent', borderBottom: '3px solid transparent' }}></div>
                  <div style={{ fontFamily: "YouSheBiaoTiHei", fontSize: 24, color: '#101531', marginLeft: 8 }}>维修记录统计</div>
                  <div style={{ marginLeft: 6, fontSize: 12, color: '#969799', fontFamily: "DINExp", }}>MAINTAIN RECORDS STATISTICAL</div>
               </div>
            </div>
            <div style={{ margin: '20px 0', flex: 1, display: 'flex', }}>
               <Card.Grid type='grid' style={{ width: '100%' }}>
                  {
                     [{
                        t: '故障发生时间分析',
                        echartOption: {
                           xAxis: {
                              type: 'category',
                              data: left1List.map((item) => {
                                 return item.wmonth
                              }),
                              axisLabel: {
                                 interval: 0,//x轴强制显示每个
                                 rotate: 40
                              },
                           },
                           yAxis: {
                              type: 'value',
                              name: "单位：次数",
                              //   nameLocation: "end",
                              //   nameGap: 20
                           },
                           legend: {
                              orient: 'vertical',
                              right: '5%',
                              top: '0%',
                              data: ['异常数']
                           },
                           tooltip: {},
                           grid: {
                              top: '10%',
                              right: '5%',
                              left: '5%',
                              bottom: '10%',
                              containLabel: true
                           },

                           series: [
                              {
                                 data: left1List.map((item) => {
                                    return Number(item.count)
                                 }),
                                 type: 'bar',
                                 name: '异常数',
                              }
                           ]
                        },
                     }, {
                        t: '系统可用性分析',
                        echartOption: {
                           xAxis: {
                              type: 'category',
                              data: right1List.map((item) => {
                                 return item.wmonth
                              }),
                              axisLabel: {
                                 interval: 0,//x轴强制显示每个
                                 rotate: 40
                              },
                           },
                           yAxis: {
                              type: 'value',
                              name: "单位：%",
                              //   nameLocation: "end",
                              //   nameGap: 20
                           },
                           legend: {},
                           tooltip: {},
                           grid: {
                              //left: '3%',
                              //right: '3%',
                              bottom: '1%',
                              // top: '24%',
                              containLabel: true
                           },

                           series: [
                              {
                                 data: right1List.map((item) => {
                                    return Math.round(item.ability * 10000) / 100

                                 }),
                                 type: 'line',
                              }
                           ]
                        },
                     }, {
                        t: '故障类型分析',
                        echartOption: {
                           xAxis: {
                              type: 'category',
                              data: left2List.map((item) => {
                                 return item.type
                              }),
                              axisLabel: {
                                 interval: 0,//x轴强制显示每个
                                 rotate: 40
                              },
                           },
                           yAxis: {
                              type: 'value',
                              name: "单位：个",
                              nameLocation: "end",
                              nameGap: 20
                           },
                           legend: {},
                           tooltip: {},
                           grid: {
                              left: '3%',
                              right: '4%',
                              bottom: '1%',
                              // top: '24%',
                              containLabel: true
                           },
                           series: [
                              {
                                 data: left2List.map((item) => {
                                    return Number(item.count)
                                 }),
                                 type: 'bar',
                                 //name: '发起数'
                              }

                           ]
                        },
                     }, {
                        t: '运维人员分析',
                        echartOption: {
                           tooltip: {
                              formatter:(params)=>{
                                 return params?.data.name+':'+params?.data.value+'次'
                              }
                           },
                           series: [
                              {
                                 // name: right2List?.map((item)=>{
                                 //    return item.name
                                 // }),
                                 type: 'pie',
                                 radius: '80%',//饼图大小
                                 data: right2List?.map((item) => {
                                    return { value: item.count, name: item.name }
                                 }),
                                 label: {

                                 }
                              }
                           ],
                           // graphic: {
                           //    type: 'text',
                           //    left: 'center',
                           //    top: 'middle',
                           //    style: {
                           //      text: '单位：次',
                           //      fontSize: 14
                           //    }
                           //  },
                           media: [
                              {
                                 query: { minAspectRatio: 1 },
                                 option: {
                                    series: [
                                       { center: ['50%', '50%'] },
                                       { center: ['50%', '50%'] }
                                    ]
                                 }
                              },
                           ]
                        },
                     },].map((c, idx) => (
                        <Card
                           key={idx}
                           shadows='hover'
                           title={c.t}
                           bordered={false}
                           headerLine={false}
                           headerStyle={{
                              padding: '12px',
                           }}
                           styles={{ body: {
                              padding: '12px',
                           } }}
                           style={{ width: '50%', height: '50%' }}
                        >

                           <ReactECharts
                              notMerge={true}
                              lazyUpdate={true}
                              option={c.echartOption}
                           />
                        </Card>
                     ))
                  }
               </Card.Grid>
            </div>
         </div>


      </>
   )
}

function mapStateToProps(state) {
   const { auth, global, members, webSocket } = state;
   return {
      //   loading: members.isRequesting,
      //   user: auth.user,
      actions: global.actions,
      //   members: members.data,
      //   socket: webSocket.socket
      clientHeight: global.clientHeight

   };
}

export default connect(mapStateToProps)(Console);
