import React, { useEffect } from 'react';
import { connect } from 'react-redux';
import ReactECharts from 'echarts-for-react';
import echarts from 'echarts';
import { Spin, Card } from 'antd';
import '../style.less'
const { Meta } = Card;

const WorkOrderData = (props) => {
   const { dispatch, actions, user, clientHeight } = props

   useEffect(() => {

   }, [])

   let value = 88
   return (
      <>
         <div style={{ background: '#FFFFFF', margin: '8px 12px', padding: '20px 20px 0px 20px', minHeight: clientHeight - 32, display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
               <div style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={{ width: 0, height: 20, borderLeft: '3px solid #005ABD', borderTop: '3px solid transparent', borderBottom: '3px solid transparent' }}></div>
                  <div style={{ fontFamily: "YouSheBiaoTiHei", fontSize: 24, color: '#101531', marginLeft: 8 }}>工单数据统计
                  </div>
                  <div style={{ marginLeft: 6, fontSize: 12, color: '#969799', fontFamily: "DINExp", }}>WORK ORDER DATA STATISTICS</div>
               </div>
            </div>

            <div style={{ margin: '20px 0', flex: 1, display: 'flex', }}>
               <Card.Grid type='grid' style={{ width: '100%' }}>
                  {
                     [{
                        t: '工单项目分析',
                        echartOption: {
                           xAxis: {
                              type: 'category',
                              data: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
                           },
                           yAxis: {
                              type: 'value',
                              name: "单位：次数",
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
                                 data: [120, 200, 150, 80, 70, 110, 130],
                                 type: 'bar',
                                 name: '异常数'
                              }
                           ]
                        },
                     }, {
                        t: '工单完成情况分析',
                        echartOption: {
                           tooltip: {},
                           series: [
                              {
                                 name: '工单完成率',
                                 type: 'gauge',
                                 progress: {
                                    show: true
                                 },
                                 detail: {
                                    valueAnimation: true,
                                    formatter: '{value}'
                                 },
                                 data: [
                                    {
                                       value: 50,
                                       name: '工单完成率'
                                    }
                                 ],
                                 title: {
                                    show: true,
                                    offsetCenter: ["0", "100%"]
                                 }
                              },
                              {
                                 name: '延期数',
                                 type: 'gauge',
                                 progress: {
                                    show: true
                                 },
                                 detail: {
                                    valueAnimation: true,
                                    formatter: '{value}'
                                 },
                                 data: [
                                    {
                                       value: 50,
                                       name: '延期数'
                                    }
                                 ],
                                 title: {
                                    show: true,
                                    offsetCenter: ["0", "100%"]
                                 }
                              },
                           ],
                           media: [
                              {
                                 query: { minAspectRatio: 1 },
                                 option: {
                                    series: [
                                       { center: ['25%', '50%'] },
                                       { center: ['75%', '50%'] }
                                    ]
                                 }
                              },
                           ]
                        },
                     }, {
                        t: '工单处理分析',
                        echartOption: {
                           xAxis: {
                              type: 'category',
                              data: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
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
                                 data: [120, 200, 150, 80, 70, 110, 130],
                                 type: 'bar',
                                 name: '发起数'
                              },
                              {
                                 data: [120, 200, 150, 80, 70, 110, 130],
                                 type: 'bar',
                                 name: '解决数'
                              }
                           ]
                        },
                     }, {
                        t: '工单类型分析',
                        echartOption: {
                           tooltip: {},
                           series: [
                              {
                                 name: '设备类型',
                                 type: 'pie',
                                 radius: '50%',
                                 data: [
                                    { value: 1048, name: 'Search Engine' },
                                    { value: 735, name: 'Direct' },
                                    { value: 580, name: 'Email' },
                                    { value: 484, name: 'Union Ads' },
                                    { value: 300, name: 'Video Ads' }
                                 ],
                                 label: {

                                 }
                              },
                              {
                                 name: '解决方案',
                                 type: 'pie',
                                 radius: '50%',
                                 data: [
                                    { value: 1048, name: 'Search Engine' },
                                    { value: 735, name: 'Direct' },
                                    { value: 580, name: 'Email' },
                                    { value: 484, name: 'Union Ads' },
                                    { value: 300, name: 'Video Ads' }
                                 ],
                                 label: {

                                 }
                              },
                           ],
                           media: [
                              {
                                 query: { minAspectRatio: 1 },
                                 option: {
                                    series: [
                                       { center: ['25%', '50%'] },
                                       { center: ['75%', '50%'] }
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
         </div >
      </>
   )
}

function mapStateToProps (state) {
   const { auth, global, members, webSocket } = state;
   return {
      user: auth.user,
      actions: global.actions,
      clientHeight: global.clientHeight
   };
}

export default connect(mapStateToProps)(WorkOrderData);
