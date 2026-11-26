import React, { useState, useEffect } from "react";
import { connect } from "react-redux";
import { Drawer, Tabs, Button, Table, Pagination } from 'antd';
import copy from "copy-to-clipboard";
import moment from "moment";
import PerfectScrollbar from "perfect-scrollbar";
import ReactECharts from 'echarts-for-react';


let projectScrollbar;

function Drawers ({ dispatch, actions, close, alarmId }) {

   const { problem } = actions;
   const [clickStyle, setclickStyle] = useState();
   const [query, setQuery] = useState({ page: 0, limit: 10 });
   const [dataSource, setdataSource] = useState([]);
   const [option, setOption] = useState({});



   useEffect(() => {
      if (alarmId) {
         dispatch(problem.getAlarmDataDetail({ alarmId: alarmId, ...query })).then((res) => {
            if (res?.success) {
               setdataSource(res.payload.data);
               projectScrollbar = new PerfectScrollbar("#Alarm", {
                  suppressScrollX: true,
               });
            }
         });
         dispatch(problem.getAlarmDataDetailAgg({ alarmId: alarmId })).then((res) => {
            if (res?.success) {
               let dataSort = res.payload.data || []
               dataSort.sort((a, b) => (moment(a.hours).isBefore(b.hours) ? -1 : 1))
               let data = {
                  grid: {
                     left: '5%',
                     // right: '4%',
                     // bottom: '3%',
                     // containLabel: true
                  },
                  dataZoom: [
                     {
                        show: true,
                        type: 'inside',
                        filterMode: 'none',
                        xAxisIndex: [0],
                     },
                     {
                        show: true,
                        type: 'inside',
                        filterMode: 'none',
                        yAxisIndex: [0],
                     }
                  ],
                  tooltip: {
                     trigger: 'axis'
                  },
                  legend: {
                     data: ['次数'],
                     right: '10%',
                  },
                  xAxis: {
                     type: 'category',
                     name: "时间",
                     boundaryGap: false,
                     data: dataSort.map(v => v.hours)
                  },
                  yAxis: {
                     type: 'value',
                     name: "次数",
                  },
                  series: [
                     {
                        data: dataSort.map(v => v.count),
                        type: 'line',
                        name: '次数',
                        smooth: true,
                        areaStyle: {
                           color: '#0e9cff26',
                        },
                        markLine: {
                           data: [{ type: 'average', name: 'Avg' }]
                        }
                     }
                  ]
               }
               setOption(data)
            }
         });
      }

   }, [query]);


   useEffect(() => {
      const domProject = document.getElementById("Alarm");
      if (domProject && projectScrollbar) {
         projectScrollbar.update();
      }
   });

   let columns = [
      {
         title: "告警活动",
         dataIndex: "AlarmState",
         rowKey: 'AlarmState',
         render: (_, r, index) => {
            let data = { 0: '首次产生', 1: '持续产生', 2: '等级提升', 3: '自动恢复', 4: '人工恢复' }
            return data[r.AlarmState] ? <div style={{ width: 60 }}>{data[r.AlarmState]}</div> : ''
         },
      }, {
         title: "告警信息",
         dataIndex: "Content",
         rowKey: 'Content',
         render: (_, r, index) => {
            return !(r.AlarmState == 3) && !r.Content ? '由安心云集成侧确认，无确认信息' : r.AlarmState == 3 ? '无' : r.Content
         },
      }, {
         title: "等级",
         dataIndex: "CurrentLevel",
         rowKey: 'CurrentLevel',
         render: (_, r, index) => {
            let data = { 1: '一级', 2: '二级', 3: '三级' }
            return <div style={{ width: 52 }}>
               <img src={`/assets/images/problem/${'CurrentLevel' + r.CurrentLevel}.png`} style={{ display: "inline-block", width: 18, marginRight: 6 }} />
               {data[r.CurrentLevel]}
            </div>
         },
      }, {
         title: "产生时间",
         dataIndex: "Time",
         rowKey: 'Time',
         render: (_, r, index) => r.Time ? <div style={{ width: 136 }}>{moment(r.Time).format("YYYY-MM-DD HH:mm:ss")}</div> : ""
      },
   ]



   return (
      <Drawer
         open={true}
         title=''
         style={{ background: "#F9FBFF", height: '100%' }}
         size="large"
         onCancel={() => {
            close();
         }}
      >
         <Tabs 
            type="line"
            items={[
               {
                  key: "1",
                  label: "告警信息",
                  children: (
                     <div id='Alarm' style={{ position: 'relative', height: document.body.clientHeight - 126, marginTop: 12 }}>

                  <div style={{ display: 'flex', alignItems: 'center', margin: "0 0 16px 0" }}>
                     <span style={{ width: 0, height: 20, margin: "0 8px 0 0", borderLeft: '3px solid #005ABD', borderTop: '3px solid transparent', borderBottom: '3px solid transparent' }}></span>
                     <span style={{ fontSize: 24, fontFamily: 'YouSheBiaoTiHei', color: '#101531', }}>告警详情</span>
                     <span style={{ marginLeft: 6, fontSize: 12, color: "rgb(150, 151, 153)", fontFamily: 'DINExp' }}>ALARM DETAILS</span>
                  </div>
                  <Table
                     columns={columns}
                     dataSource={dataSource}
                     bordered={false}
                     empty="暂无数据"
                     style={{}}
                     pagination={false}
                     onRow={(record, index) => {
                        if (index % 1 === 0) {
                           return { style: { background: '#FAFCFF' } }
                        }
                     }}
                  />
                  {dataSource?.length > 0 ? <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end', marginTop: 16 }}>
                     <span style={{ lineHeight: "30px", fontSize: 13 }}>
                        共{dataSource?.length || 0}条告警
                     </span>
                     <Pagination
                        className="22"
                        total={dataSource?.length}
                        showSizeChanger
                        current={query.page + 1}
                        pageSizeOpts={[10, 20, 30, 40]}
                        onChange={(currentPage, pageSize) => {
                           setQuery({ limit: pageSize, page: currentPage - 1 });
                        }}
                     />
                  </div> : ""}

                  <div style={{ display: 'flex', alignItems: 'center', margin: "36px 0 0 0" }}>
                     <span style={{ width: 0, height: 20, margin: "0 8px 0 0", borderLeft: '3px solid #005ABD', borderTop: '3px solid transparent', borderBottom: '3px solid transparent' }}></span>
                     <span style={{ fontSize: 24, fontFamily: 'YouSheBiaoTiHei', color: '#101531', }}>趋势分析</span>
                     <span style={{ marginLeft: 6, fontSize: 12, color: "rgb(150, 151, 153)", fontFamily: 'DINExp' }}>TREND ANALYSIS</span>
                  </div>
                  <div style={{ marginBottom: 60 }}>
                     <ReactECharts
                        option={option}
                        notMerge={true}
                        lazyUpdate={true}
                        theme={"theme_name"}
                     // onChartReady={this.onChartReadyCallback}
                     // onEvents={EventsDict}
                     // opts={}
                     />
                  </div>


                     </div>
                  )
               },
               {
                  key: "2",
                  label: "工单信息",
                  children: (
                     <div>开发中，敬请期待！</div>
                  )
               }
            ]}
         />
      </Drawer >
   );
}

function mapStateToProps (state) {
   const { auth, global, members } = state;
   return {
      // loading: members.isRequesting,
      user: auth.user,
      actions: global.actions,
      global: global,
      // members: members.data,
   };
}
export default connect(mapStateToProps)(Drawers);
