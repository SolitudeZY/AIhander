
import React, { useState, useEffect, useRef } from "react";
import { connect } from "react-redux";
import { Button, Form, Modal, Skeleton, Pagination, notification } from 'antd';
import moment from "moment";
import PerfectScrollbar from "perfect-scrollbar";
import copy from "copy-to-clipboard";
import './inspection.less'
import { log } from "ezuikit-js";


let projectScrollbar;
let timer
const Inspection = ({ dispatch, actions, user, route, statistic, pepProjectId }) => {
   const { problem } = actions
   const [selectProject, setSelectProject] = useState([])   //所选项目
   const [applyFilter, setApplyFilter] = useState([])     //应用筛选
   const [patrolAbnormal, setPatrolAbnormal] = useState([])     //巡检异常信息
   const [checkPatrol, setCheckPatrol] = useState({})     //巡检异常查询
   const [unfold, setUnfold] = useState(true)     //展开收起
   const [picturePop, setPicturePop] = useState(false)  //图片弹窗
   const [pictureId, setPictureId] = useState()  //图片id
   const [pictureData, setPictureData] = useState({})  //图片数据
   const [notRead, setNotRead] = useState(0)  //已阅图片数量

   const api = useRef();
   const unfoldApi = useRef(false);

   useEffect(() => {

      dispatch(problem.getProjectPoms({ global: 1, pepId: pepProjectId })).then((res) => {
         if (res.success) {
            let project = []
            let apply = []
            res.payload.data?.rows?.map(v => {
                  project.push({ name: v.pepProjectName || v.name || v.id, value: v.id })
                  v.apps.map(app => apply.push({ name: app.name, value: app.id }))          
            })
            setSelectProject(project)
            setApplyFilter(apply)
         }
      })
   }, [pepProjectId])

   useEffect(() => {
      if (projectScrollbar) projectScrollbar.destroy()
      const domEquipment = document.getElementById("inspection");
      if (domEquipment) {
         if (unfold) {
            projectScrollbar = new PerfectScrollbar("#inspection", {
               suppressScrollY: true,
            });
            if (domEquipment && projectScrollbar) projectScrollbar.update()
         } else {
            projectScrollbar = new PerfectScrollbar("#inspection", {
               suppressScrollX: true,
            })
            if (domEquipment && projectScrollbar) projectScrollbar.update()
         }
      }

   })

   useEffect(() => {
      dispatch(problem.getAlarmLnspection({
         timeStart: moment().day(moment().day() - 1).startOf('day').format('YYYY-MM-DD HH:mm:ss'),
         timeEnd: moment().endOf('day').format('YYYY-MM-DD HH:mm:ss')
         , ...checkPatrol, pepProjectId: pepProjectId
      })).then((res) => {
         if (res.success) {
            setPatrolAbnormal(res.payload.data)
            setNotRead(res.payload.data.filter(v => !v.notedTime).length)
         }
      })
   }, [checkPatrol, pepProjectId])


   useEffect(() => {
      if (patrolAbnormal && pictureId >= 0) {
         if (timer) clearTimeout(timer)
         timer = setTimeout(() => {
            if (!patrolAbnormal[pictureId]?.notedTime) {
               patrolAbnormal[pictureId].notedPepUser = user.name
               patrolAbnormal[pictureId].notedPepUserId = user.id
               patrolAbnormal[pictureId].notedTime = new Date()
               setPatrolAbnormal(patrolAbnormal)
               setNotRead(notRead - 1)
               setPictureData(patrolAbnormal[pictureId])
               dispatch(problem.putAlarmApplicationNoted({ inspectionId: patrolAbnormal[pictureId].id }))
            }
         }, 2000)
      }
   }, [pictureId]);

   return (

      <div style={{ width: 'clac(100%)', height: unfold ? 420 : 760, backgroundColor: 'white', margin: "8px 12px", padding: "20px 20px 0" }}>
         <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginLeft: 10 }}>
            <div style={{ width: 450, }}>
               <span style={{ width: 0, height: 20, display: "inline-block", margin: "0 8px 0 0", borderLeft: '3px solid #005ABD', borderTop: '3px solid transparent', borderBottom: '3px solid transparent' }}></span>
               <span style={{ fontSize: 24, fontFamily: 'YouSheBiaoTiHei', color: '#101531', marginRight: 10 }}>{statistic[route]}</span>
               <span style={{ fontSize: 12, color: 'rgb(150, 151, 153)' }}>APPLY SEMI-AUTOMATIC INSPECTION</span>
               <div style={{ fontSize: 12, color: 'rgb(150, 151, 153)', marginLeft: 3 }}>仅保留近两天的图片数据，每日8时、14时、17时系统巡检一次。<span style={{ fontWeight: 500, color: '#005ABD', fontSize: 12 }}>未阅共{notRead}个</span></div>
            </div>
            <div style={{ flex: 1, position: 'relative' }}>
               <Form
                  onSubmit={(v) => {
                     setCheckPatrol({
                        appId: v.appId,
                        noted: v.noted,
                        projectId: v.projectId,
                        timeStart: v.time == 'true' ?
                           moment().startOf('day').format('YYYY-MM-DD HH:mm:ss') :
                           v.time == 'false' ?
                              moment().day(moment().day() - 1).startOf('day').format('YYYY-MM-DD HH:mm:ss') : moment().day(moment().day() - 1).startOf('day').format('YYYY-MM-DD HH:mm:ss'),
                        timeEnd: v.time == 'true' ?
                           moment().endOf('day').format('YYYY-MM-DD HH:mm:ss') :
                           v.time == 'false' ?
                              moment().day(moment().day() - 1).endOf('day').format('YYYY-MM-DD HH:mm:ss') : moment().endOf('day').format('YYYY-MM-DD HH:mm:ss'),
                     })
                  }}
                  getFormApi={(formApi) => (form = formApi)}
                  layout="horizontal"
                  style={{ position: "relative", width: "100%", flex: 1, display: 'flex' }}
               >
                  <Form.Select
                     labelPosition="left"
                     style={{ width: 80, marginBottom: 10 }}
                     // new Date(new Date().setHours(00, 00, 00).getTime()), timeEnd: new Date(new Date().setHours(23, 59, 59).getTime())
                     label='时间筛选:'
                     field='time'
                     key='time'
                     placeholder="全部"
                     allowClear
                  >
                     {[{ name: '今日', value: 'true' }, { name: '昨日', value: 'false' }].map((item) => {
                        return (
                           <Select.Option key={item.value} value={item.value}>
                              {item.name}
                           </Select.Option>
                        );
                     })}
                  </Form.Select>
                  <Form.Select
                     label='所选项目:'
                     labelPosition="left"
                     field='projectId'
                     key='projectId'
                     style={{ width: 116, marginRight: 10, color: "#F9F9F9", marginBottom: 10 }}
                     placeholder="全部"
                     allowClear
                  >
                     {selectProject?.map((item) => {
                        return (
                           <Select.Option key={item.value} value={item.value}>
                              {item.name}
                           </Select.Option>
                        );
                     })}
                  </Form.Select>
                  <Form.Select
                     label='应用筛选:'
                     labelPosition="left"
                     field='appId'
                     key='appId'
                     style={{ width: 116, marginRight: 10, color: "#F9F9F9", marginBottom: 10 }}
                     placeholder="全部"
                     allowClear
                  >
                     {applyFilter?.map((item) => {
                        return (
                           <Select.Option key={item.value} value={item.value}>
                              {item.name}
                           </Select.Option>
                        );
                     })}
                  </Form.Select>
                  <Form.Select
                     label='显示范围:'
                     labelPosition="left"
                     field='noted'
                     key='noted'
                     style={{ width: 116, marginRight: 60, color: "#F9F9F9", marginBottom: 10 }}
                     placeholder="全部"
                     allowClear
                  >
                     {[{ name: '已阅', value: 'noted' }, { name: '未阅', value: 'unnote' }].map((item) => {
                        return (
                           <Select.Option key={item.value} value={item.value}>
                              {item.name}
                           </Select.Option>
                        );
                     })}
                  </Form.Select>
                  <Button theme="solid" type="primary" htmlType='submit' style={{ width: 65, height: 30, borderRadius: 3, position: 'absolute', right: 10, bottom: 12 }}>查询</Button>
               </Form>
            </div>
         </div>
         {patrolAbnormal?.length > 0 ?
            <div
               onMouseMove={() => document.getElementById('unfold').style.display = 'none'}
               onMouseOut={() => document.getElementById('unfold').style.display = 'block'}
               id="inspection" style={{ width: 'calc(100% - 20px)', marginLeft: 10, height: unfold ? 280 : 600, whiteSpace: unfold ? 'nowrap' : '', position: "relative", }}>
               {patrolAbnormal?.map((v, i) =>
                  <div key={'name' + v.id}
                     style={{
                        width: 400, height: 238,
                        display: 'inline-block',
                        margin: '8px 20px 8px 0',
                        boxShadow: ' 0px 2px 12px 1px #F2F3F5',
                        borderRadius: 2, border: '1px solid rgba(220,222,224,0.2)',
                        position: 'relative',
                     }}
                     onClick={() => {
                        setPicturePop(true)
                        setPictureId(i);
                        setPictureData(patrolAbnormal[i])
                     }}
                  >
                     <img src={`/_file-server/${v.screenshot}`} style={{ width: 400, height: 182 }} />
                     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', margin: '10px 6px 0', color: '#005ABD' }}>
                        <span style={{ fontSize: 12 }}>获取时间：{moment(v.createTime).format("YYYY-MM-DD HH:mm:ss")}</span>
                        <span style={{ color: '#4A4A4A', fontWeight: 500 }}>{v.app?.name}</span>
                     </div>
                     {v.notedPepUser ? <img src="/assets/images/problem/tick.png" style={{ width: 19, position: "absolute", top: -6, right: -10 }} /> : ""}
                  </div>)}

            </div>
            : <div style={{
               width: 'calc(100% - 20px)', marginLeft: 10, height: 280,
               background: 'url(/assets/images/problem/banner.gif)',
               backgroundSize: '100% 100%',
               fontSize: 32, fontFamily: 'YouSheBiaoTiHei',
               fontWeight: 500, color: '#005ABD', textIndent: 80,
               lineHeight: "260px"
            }}>
               当前应用暂无自动巡检计划
            </div>
         }
         {patrolAbnormal?.length > 0 ?
            <div id="unfold"
               onMouseMove={(e) => e.stopPropagation()}
               onMouseOut={(e) => e.stopPropagation()}
               onClick={() => setUnfold(!unfold)}
               style={{
                  width: 'calc(100% - 20px)', marginLeft: 10, height: 24,
                  background: unfold ? 'linear-gradient(180deg, rgba(36,139,255,0) 0%, rgba(36,139,255,0.09) 100%)' : 'linear-gradient(180deg, rgba(218,218,218,0) 0%, rgba(212,212,212,0.38) 100%)',
                  borderRadius: 3,
                  lineHeight: '24px',
                  fontSize: 12,
                  zIndex: 100,
                  position: 'relative',
                  top: unfold ? -20 : 14,
                  left: 0,
                  textAlign: 'center',
                  color: unfold ? 'rgba(0,90,189,0.7)' : '#969799',
                  cursor: 'pointer',
               }}>{unfold ? '展开更多' : '收起'}<img style={{ width: 17, paddingTop: 8, marginLeft: 3 }} src={`/assets/images/problem/${unfold ? "dropDown" : 'pullUp'}.png`} />
            </div> : ""}
         {
            picturePop ? <Modal
               title={<div style={{}}>{pictureData?.app?.name}
                  <span style={{
                     width: 80, height: 20, display: 'inline-block',
                     background: 'url(/assets/images/problem/preview.png)',
                     backgroundRepeat: 'no-repeat',
                     backgroundSize: '100% 100%',
                     color: '#FFFFFF', fontSize: 12,
                     textAlign: 'center', lineHeight: '20px', marginLeft: 10,
                  }}>
                     未阅  {notRead}/{patrolAbnormal.length}
                  </span>
               </div>}
               hasCancel={false}
               footer={<div style={{ width: 425, margin: 'auto', display: "flex", justifyContent: 'space-around', }}>
                  <Button style={{ width: 92, height: 32, border: '1px solid rgba(0,0,0,0.15)', borderRadius: 2 }}
                     onClick={() => {
                        if (!pictureId == 0) setPictureId(pictureId - 1)
                     }}
                  >上一张</Button>
                  <a href={`/_file-server/${pictureData.screenshot + '?filename=' + encodeURIComponent(pictureData.app?.name)}.png`}>
                     <Button style={{ width: 92, height: 32, color: '#005ABD', border: '1px solid #005ABD', borderRadius: 2 }}>图片下载</Button>
                  </a>
                  <a href={pictureData.app?.url} target="_blank">
                     <Button style={{ width: 92, height: 32, color: '#FFFFFF', background: '#005ABD', border: '1px solid rgba(0,0,0,0.15)', borderRadius: 2 }}>进入系统</Button>
                  </a>
                  <Button style={{ width: 92, height: 32, border: '1px solid rgba(0,0,0,0.15)', borderRadius: 2 }}
                     onClick={() => {
                        if (pictureId < patrolAbnormal.length - 1) setPictureId(pictureId + 1)
                     }}
                  >下一张</Button>
               </div>}
               open={true}
               onOk={() => {

               }}
               width={837}
               onCancel={() => {
                  setPicturePop(false)
                  setPictureId('')
                  if (timer) clearTimeout(timer)
               }}
            >
               <div style={{ marginBottom: 12 }}>
                  {pictureData.notedTime ? <span style={{ marginRight: 14 }}>核验信息：{pictureData.notedPepUser}&nbsp;{moment(pictureData.notedTime).format("YYYY-MM-DD HH:mm:ss")}</span> : ""}
                  <span>截取时间:{moment(pictureData.createTime).format("YYYY-MM-DD HH:mm:ss")}</span>
                  <img src={`/assets/images/problem/link.png`}
                     style={{ width: 16, height: 16, marginLeft: 6 }}
                     onClick={() => {
                        copy(pictureData?.router || "无相关地址");
                        notification.success({
                           message: "复制成功",
                           duration: 2,
                        })
                     }}
                  />
               </div>
               <img src={`/_file-server/${pictureData.screenshot}`}
                  style={{ width: 789, height: 359 }}
               />

            </Modal>
               : ""

         }
      </div >
   )
}


function mapStateToProps (state) {
   const { auth, global, members } = state;
   return {
      user: auth.user,
      actions: global.actions,
      pepProjectId: global.pepProjectId,
      // members: members.data,
   };
}
export default connect(mapStateToProps)(Inspection);
