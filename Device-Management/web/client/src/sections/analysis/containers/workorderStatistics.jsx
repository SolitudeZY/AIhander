import React, { useEffect, useState,useMemo } from 'react';
import { connect } from 'react-redux';
import ReactECharts from 'echarts-for-react';
import { Spin, Card, Select, DatePicker, Tabs, Table, Button, Space, Radio, Modal, Tooltip } from 'antd';
import { WorkflowApprovalModal } from "$components";
import moment from 'moment';
import '../style.less';
import { QuestionCircleOutlined } from '@ant-design/icons';

const { Meta } = Card;

const workorderStatistics = (props) => {
   const {
      dispatch, actions, user, clientHeight, pepProjectId, projectPoms, workOrdersCount, countLoading, workOrdersCountByProject, countByProjectLoading,
      workOrdersElapseDeviation, elapseDeviationLoading, workOrdersUnresolved, unresolvedLoading, workOrdersOvertime, overtimeLoading, workOrdersElapse, elapseLoading
   } = props
   const { analysis } = actions
   const [orderType, setOrderType] = useState('');  // 类型（全部/数据中断/数据异常）
   const [dataRange, setDataRange] = useState([moment().subtract(1, 'months').valueOf(), moment().valueOf()]);  // 日期范围
   const [projectName, setProjectName] = useState('');  // 选择的单个项目的名称
   const [workOrdersType, setWorkOrdersType] = useState('全部');  // 工单类别（全部/已解决/未解决/待办工单/超时工单）
   const [elapseDeviationType, setElapseDeviationType] = useState(1);  // 偏差类别（1: 计划与实际修复偏差耗时 / 2: 期望与实际修复偏差耗时）
   const [countByProjectType, setCountByProjectType] = useState(1);//1.按月展示工单数量,2.
   const [resolveVisible, setResolveVisible] = useState(false);
   const [workflowModalVisible, setWorkflowModalVisible] = useState(false);
   const [checkProcessInstanceId, setCheckProcessInstanceId] = useState('');
   const [resolveLoading, setResolveLoading] = useState(false);

   useEffect(() => {
      getAllData()
   }, [projectName])
   useEffect(() => {
      if (pepProjectId && String(pepProjectId).length > 0  ) {
         //单个项目
         if(String(pepProjectId).split(',').length === 1){
            const curProject = projectPoms?.filter(item => item.id == pepProjectId)[0] || {}
            setProjectName(curProject.name&&[curProject.name] || curProject.pepProjectName&&[curProject.pepProjectName])
         }else{
            //多项目
            let pepProjectIdSplit = pepProjectId.split(',')
            const curProjects = projectPoms?.filter(item => pepProjectIdSplit.some(id => id == item.id)) || []
            setProjectName(curProjects.map(item => item.name || item.pepProjectName))
         }
      } else {
         setProjectName('')
      }
   }, [pepProjectId, projectPoms])

   const getAllData = () => {
      let query = {
         startTime: moment(dataRange[0]).format('YYYY-MM-DD'),
         endTime: moment(dataRange[1]).format('YYYY-MM-DD'),
      }
      if (projectName) {
         query.projectName = projectName
      }
      if (orderType) {
         query.orderType = orderType =='数据中断'?'数据中断':'数据异常'
      }
      dispatch(analysis.getWorkOrdersCount(query))
      dispatch(analysis.getWorkOrdersCountByProject(query))
      dispatch(analysis.getWorkOrdersElapseDeviationByProject(query))
      dispatch(analysis.getWorkOrdersUnresolved(query))
      dispatch(analysis.getWorkOrdersOvertime(query))
      dispatch(analysis.getWorkOrdersElapseByProject(query))
   }

   const getWorkOrdersUnresolved = () => {
      let query = {
         startTime: moment(dataRange[0]).format('YYYY-MM-DD'),
         endTime: moment(dataRange[1]).format('YYYY-MM-DD'),
      }
      if (orderType) {
         query.orderType = orderType =='数据中断'?'数据中断':'数据异常'
      }
      if (projectName) {
         query.projectName = projectName
      }
      dispatch(analysis.getWorkOrdersCount(query))
      dispatch(analysis.getWorkOrdersUnresolved(query))
   }

   const handleResolve = () => {
      setResolveLoading(true)
      dispatch(analysis.postWorkOrdersResolved({ procInstId: checkProcessInstanceId }))
         .then(res => {
            setResolveLoading(false)
            if (res.success) {
               getWorkOrdersUnresolved()
               setResolveVisible(false)
            }
         })
   }

   const unresolvedColumns = [
      {
         title: '项目名称',
         dataIndex: 'projectName',
         ellipsis: true,
      },
      {
         title: '问题描述',
         dataIndex: 'detail',
         ellipsis: true,
      },
      {
         title: '处理人员',
         dataIndex: 'processUser',
         width: 90,
      },
      {
         title: '计划修复时间',
         dataIndex: 'planTime',
      },
      {
         title: '操作',
         dataIndex: 'operation',
         render: (text, record) => <Space>
            <Button theme='solid' type='primary' size='small' onClick={() => {
               setCheckProcessInstanceId(record.procInstId)
               setResolveVisible(true)
            }}>已解决</Button>
            <Button theme='solid' type='primary' size='small' onClick={() => {
               setCheckProcessInstanceId(record.procInstId)
               setWorkflowModalVisible(true)
            }}>查看详情</Button>
         </Space>
      },
   ];
   const overtimeColumns = [
      {
         title: '项目名称',
         dataIndex: 'projectName',
         ellipsis: true,
      },
      {
         title: '问题描述',
         dataIndex: 'detail',
         ellipsis: true,
      },
      {
         title: '期望修复时间',
         dataIndex: 'planTime',
      },
      {
         title: '实际修复时间',
         dataIndex: 'completionTime',
      },
      {
         title: '超时天数',
         dataIndex: 'overtimeInDay',
         // width: 90,
         sorter: (a, b) => a.overtimeInDay - b.overtimeInDay
      },
   ];
   const countByProjectXAxisData = countByProjectType === 2 ?(
      workOrdersType === '已解决'&&(!projectName)
         ? workOrdersCountByProject?.resolvedOrders?.map(item => String(item.name))
         : workOrdersType === '未解决'&&(!projectName)
         ? workOrdersCountByProject?.unresolvedOrders?.map(item => String(item.name))
         : workOrdersType === '待办工单'&&(!projectName) 
         ? workOrdersCountByProject?.todoOrders?.map(item => String(item.name))
         : workOrdersType === '超时工单'&&(!projectName)
         ? workOrdersCountByProject?.overTimeOrders?.map(item => String(item.name))
         : ((!projectName || (pepProjectId&&String(pepProjectId).includes(','))) ? workOrdersCountByProject?.totalOrders?.map(item=>String(item.name)):['已解决','未解决','待办工单','超时工单'])):(
             workOrdersCountByProject?.ordersCountByMonth?.map(item => String(item.yearMonth))
         )
  
   let seriesList =useMemo(()=>{
      let seriesInfo={
         type: 'bar',
         name: '工单数',
         barWidth: 28, 
      }
      let seriesList = [];
      if(countByProjectType === 1){
         seriesList=[];
         //月度分布图
         //全局
         // if(!projectName || projectName.includes(',')){
            if(workOrdersType==='已解决'){
               if(orderType==='数据中断'){
                  seriesList.push({
                     data:workOrdersCountByProject?.ordersCountByMonth?.map(item => item.resolvedCountByDataInterrupt),
                     ...seriesInfo
                  })
               }else if(orderType==='异常'){
                  seriesList.push({
                     data:workOrdersCountByProject?.ordersCountByMonth?.map(item => item.resolvedCountByDataException),
                     ...seriesInfo
                  })
               }else{
                  //全部，需要堆叠区分数据异常和数据中断
                  seriesList.push({
                     //按月分组
                     data:workOrdersCountByProject?.ordersCountByMonth?.map(item => item.resolvedCountByDataInterrupt),
                     stack:'1',
                     ...seriesInfo,
                     name:'数据中断',
                  })
                  seriesList.push({
                     data:workOrdersCountByProject?.ordersCountByMonth?.map(item => item.resolvedCountByDataException),
                     stack:'1',
                     ...seriesInfo,
                     name:'数据异常',
                  })
               }
            }else if(workOrdersType==='未解决'){
               if(orderType==='数据中断'){
                  seriesList.push({
                     data:workOrdersCountByProject?.ordersCountByMonth?.map(item => item.unresolvedCountByDataInterrupt),
                     ...seriesInfo
                  })
               }else if(orderType==='异常'){
                  seriesList.push({
                     data:workOrdersCountByProject?.ordersCountByMonth?.map(item => item.unresolvedCountByDataException),
                     ...seriesInfo
                  })
               }else{
                  //全部，需要堆叠区分数据异常和数据中断
                  seriesList.push({
                     data:workOrdersCountByProject?.ordersCountByMonth?.map(item => item.unresolvedCountByDataInterrupt),
                     stack:'1',
                     ...seriesInfo,
                     name:'数据中断',
                  })
                  seriesList.push({
                     data:workOrdersCountByProject?.ordersCountByMonth?.map(item => item.unresolvedCountByDataException),
                     stack:'1',
                     ...seriesInfo,
                     name:'数据异常',
                  })
               }
            }else if(workOrdersType==='待办工单'){
               if(orderType==='数据中断'){
                  seriesList.push({
                     data:workOrdersCountByProject?.ordersCountByMonth?.map(item => item.todoCountByDataInterrupt),
                     ...seriesInfo
                  })
               }else if(orderType==='异常'){
                  seriesList.push({
                     data:workOrdersCountByProject?.ordersCountByMonth?.map(item => item.todoCountByDataException),
                     ...seriesInfo
                  })
               }else{
                  //全部，需要堆叠区分数据异常和数据中断
                  seriesList.push({
                     data:workOrdersCountByProject?.ordersCountByMonth?.map(item => item.todoCountByDataInterrupt),
                     stack:'1',
                     ...seriesInfo,
                     name:'数据中断',
                  })
                  seriesList.push({
                     data:workOrdersCountByProject?.ordersCountByMonth?.map(item => item.todoCountByDataException),
                     stack:'1',
                     ...seriesInfo,
                     name:'数据异常',
                  })
               }
            }else if(workOrdersType==='超时工单'){
               if(orderType==='数据中断'){
                  seriesList.push({
                     data:workOrdersCountByProject?.ordersCountByMonth?.map(item => item.overtimeCountByDataInterrupt),
                     ...seriesInfo
                  })
               }else if(orderType==='异常'){
                  seriesList.push({
                     data:workOrdersCountByProject?.ordersCountByMonth?.map(item => item.overtimeCountByDataException),
                     ...seriesInfo
                  })
               }else{
                  //全部，需要堆叠区分数据异常和数据中断
                  seriesList.push({
                     data:workOrdersCountByProject?.ordersCountByMonth?.map(item => item.overtimeCountByDataInterrupt),
                     stack:'1',
                     ...seriesInfo,
                     name:'数据中断',
                  })
                  seriesList.push({
                     data:workOrdersCountByProject?.ordersCountByMonth?.map(item => item.overtimeCountByDataException),
                     stack:'1',
                     ...seriesInfo,
                     name:'数据异常',
                  })
               }
            }else{
               //全部
               // debugger
               if(orderType==='数据中断'){
                  seriesList.push({
                     data:workOrdersCountByProject?.ordersCountByMonth?.map(item => item.totalByDataInterrupt),
                     ...seriesInfo
                  })
               }else if(orderType==='异常'){
                  seriesList.push({
                     data:workOrdersCountByProject?.ordersCountByMonth?.map(item => item.totalByDataException),
                     ...seriesInfo
                  })
               }else{
                  seriesList.push({
                     data:workOrdersCountByProject?.ordersCountByMonth?.map(item => item.totalByDataInterrupt),
                     stack:'1',
                     ...seriesInfo,
                     name:'数据中断',
                  })
                  seriesList.push({
                     data:workOrdersCountByProject?.ordersCountByMonth?.map(item => item.totalByDataException),
                     stack:'1',
                     ...seriesInfo,
                     name:'数据异常',
                  })
               }
            }
         // }else{
         //    //单项目
         //    if(orderType==='数据中断'){
         //       seriesList.push({
         //          data:workOrdersCountByProject?.ordersCountByMonth?.map(item => item.totalByDataInterrupt),
         //          ...seriesInfo
         //       })
         //    }else if(orderType==='异常'){
         //       seriesList.push({
         //          data:workOrdersCountByProject?.ordersCountByMonth?.map(item => item.totalByDataException),
         //          ...seriesInfo
         //       })
         //    }else{
         //       //全部，需要堆叠区分数据异常和数据中断
         //       seriesList.push({
         //          data:workOrdersCountByProject?.ordersCountByMonth?.map(item => item.totalByDataInterrupt),
         //          stack:'1',
         //          ...seriesInfo,
         //          name:'数据中断',
         //       })
         //       seriesList.push({
         //          data:workOrdersCountByProject?.ordersCountByMonth?.map(item => item.totalByDataException),
         //          stack:'1',
         //          ...seriesInfo,
         //          name:'数据异常',
         //       })
         //    }
         // }
      }else{
         seriesList=[];
         //工单分布图
         let newData=[];
         //全局
         if(!projectName || (pepProjectId&&String(pepProjectId).includes(','))){
            if(workOrdersType==='已解决'){
               if(orderType==='数据中断'){
                  newData=workOrdersCountByProject?.resolvedOrders?.map(item => item.resolvedCountByDataInterrupt);
                  seriesList.push({
                     data:newData,
                     ...seriesInfo
                  });
               }else if(orderType==='异常'){
                  newData=workOrdersCountByProject?.resolvedOrders?.map(item => item.resolvedCountByDataException)
                  seriesList.push({
                     data:newData,
                     ...seriesInfo
                  })
               }else{
                  //全部，需要堆叠区分数据异常和数据中断
                  newData=workOrdersCountByProject?.resolvedOrders?.map(item => item.resolvedCountByDataInterrupt)
                  seriesList.push({
                     data:newData,
                     stack:'1',
                     ...seriesInfo,
                     name:'数据中断',
                  })
                  newData=workOrdersCountByProject?.resolvedOrders?.map(item => item.resolvedCountByDataException)
                  seriesList.push({
                     data:newData,
                     stack:'1',
                     ...seriesInfo,
                     name:'数据异常',
                  })
               }
            }else if(workOrdersType==='未解决'){
               if(orderType==='数据中断'){
                  newData=workOrdersCountByProject?.unresolvedOrders?.map(item => item.unresolvedCountByDataInterrupt)
                  seriesList.push({
                     data:newData,
                     ...seriesInfo
                  })
               }else if(orderType==='异常'){
                  newData=workOrdersCountByProject?.unresolvedOrders?.map(item => item.unresolvedCountByDataException)
                  seriesList.push({
                     data:newData,
                     ...seriesInfo
                  }) 
               }else{
                  //全部，需要堆叠区分数据异常和数据中断
                  newData=workOrdersCountByProject?.unresolvedOrders?.map(item => item.unresolvedCountByDataInterrupt)
                  seriesList.push({
                     data:newData,
                     stack:'1',
                     ...seriesInfo,
                     name:'数据中断',
                  })
                  newData=workOrdersCountByProject?.unresolvedOrders?.map(item => item.unresolvedCountByDataException)
                  seriesList.push({
                     data:newData,
                     stack:'1',
                     ...seriesInfo,
                     name:'数据异常',
                  })
               }
            }else if(workOrdersType==='待办工单'){
               if(orderType==='数据中断'){
                  newData=workOrdersCountByProject?.todoOrders?.map(item => item.todoCountByDataInterrupt)
                  seriesList.push({
                     data:newData,
                     ...seriesInfo
                  })
               }else if(orderType==='异常'){
                  newData=workOrdersCountByProject?.todoOrders?.map(item => item.todoCountByDataException)
                  seriesList.push({
                     data:newData,
                     ...seriesInfo
                  })
               }else{
                  //全部，需要堆叠区分数据异常和数据中断
                  newData=workOrdersCountByProject?.todoOrders?.map(item => item.todoCountByDataInterrupt)
                  seriesList.push({
                     data:newData,
                     stack:'1',
                     ...seriesInfo,
                     name:'数据中断',
                  })
                  newData=workOrdersCountByProject?.todoOrders?.map(item => item.todoCountByDataException)
                  seriesList.push({
                     data:newData,
                     stack:'1',
                     ...seriesInfo,
                     name:'数据异常',
   
                  })
               }
            }else if(workOrdersType==='超时工单'){
               if(orderType==='数据中断'){
                  newData=workOrdersCountByProject?.overTimeOrders?.map(item => item.overtimeCountByDataInterrupt)
                  seriesList.push({
                     data:newData,
                     ...seriesInfo
                  })
               }else if(orderType==='异常'){
                  newData=workOrdersCountByProject?.overTimeOrders?.map(item => item.overtimeCountByDataException)
                  seriesList.push({
                     data:newData,
                     ...seriesInfo
                  })
               }else{
                  //全部，需要堆叠区分数据异常和数据中断
                  newData=workOrdersCountByProject?.overTimeOrders?.map(item => item.overtimeCountByDataInterrupt)
                  seriesList.push({
                     data:newData,
                     stack:'1',
                     ...seriesInfo,
                     name:'数据中断',
                  })
                  newData=workOrdersCountByProject?.overTimeOrders?.map(item => item.overtimeCountByDataException)
                  seriesList.push({
                     data:newData,
                     stack:'1',
                     ...seriesInfo,
                     name:'数据异常',
                  })
   
   
               }
            }else{
               if(orderType==='数据中断'){
                  newData=workOrdersCountByProject?.totalOrders?.map(item => item.totalByDataInterrupt)
                  seriesList.push({
                     data:newData,
                     ...seriesInfo,
                     name:'数据中断',
                  })
               }else if(orderType==='异常'){
                  newData=workOrdersCountByProject?.totalOrders?.map(item => item.totalByDataException)
                  seriesList.push({
                     data:newData,
                     ...seriesInfo,
                     name:'数据异常',
                  })
               }else{
                  //全部，需要堆叠区分数据异常和数据中断
                  newData=workOrdersCountByProject?.totalOrders?.map(item => item.totalByDataInterrupt)
                  seriesList.push({
                     data:newData,
                     stack:'1',
                     ...seriesInfo,
                     name:'数据中断',
                  })
                  newData=workOrdersCountByProject?.totalOrders?.map(item => item.totalByDataException)
                  seriesList.push({
                     data:newData,
                     stack:'1',
                     ...seriesInfo,
                     name:'数据异常',
                  })
               }
            }
         }else{
            //单项目，展示已解决、,'未解决','待办工单','超时工单'
            let done =workOrdersCountByProject?.resolvedOrders?.[0]?.resolvedCountByDataException
            let overTimeCount = workOrdersCountByProject?.overTimeOrders?.[0]?.overtimeCountByDataException
            let toCount= workOrdersCountByProject?.todoOrders?.[0]?.todoCountByDataException
            let unresolvedCount = workOrdersCountByProject?.unresolvedOrders?.[0]?.unresolvedCountByDataException

            let done1 =workOrdersCountByProject?.resolvedOrders?.[0]?.resolvedCountByDataInterrupt
            let overTimeCount1 = workOrdersCountByProject?.overTimeOrders?.[0]?.overtimeCountByDataInterrupt
            let toCount1= workOrdersCountByProject?.todoOrders?.[0]?.todoCountByDataInterrupt
            let unresolvedCount1 = workOrdersCountByProject?.unresolvedOrders?.[0]?.unresolvedCountByDataInterrupt
            if(orderType==='异常'){
               newData= [done,unresolvedCount,toCount,overTimeCount,toCount]
               seriesList.push({
                  data:newData,
                  ...seriesInfo,
                  name:'数据异常',
               })
            }else if(orderType==='数据中断'){
               
               newData= [done1,unresolvedCount1,toCount1,overTimeCount1,toCount1]
               seriesList.push({
                  data:newData,
                  ...seriesInfo,
                  name:'数据中断',
               })
            }else{
               //全部，需要堆叠区分数据异常和数据中断
               seriesList.push({
                  data:  [done1,unresolvedCount1,toCount1,overTimeCount1,toCount1],
                  stack:'1',
                  ...seriesInfo,
                  name:'数据中断',
               })
               seriesList.push({
                  data:[done,unresolvedCount,toCount,overTimeCount,toCount],
                  stack:'1',
                  ...seriesInfo,
                  name:'数据异常',
               })
            }
         }
         
      }
      return seriesList;
   },[workOrdersCountByProject,workOrdersType,countByProjectType])
   
   // const countByProjectSeriesData = countByProjectType === 2 ? ( workOrdersType === '已解决'
   //    ? workOrdersCountByProject?.resolvedOrders?.map(item => item.resolvedCount)
   //    : workOrdersType === '未解决'
   //    ? workOrdersCountByProject?.unresolvedOrders?.map(item => item.unresolvedCount)
   //    : workOrdersType === '待办工单'
   //    ? workOrdersCountByProject?.todoOrders?.map(item => item.todoCount)
   //    : workOrdersType === '超时工单'
   //    ? workOrdersCountByProject?.overTimeOrders?.map(item => item.overTimeCount)
   //    : workOrdersCountByProject?.totalOrders?.reduce((acc, item) => {
   //       acc[0]+=item.totalByDataInterrupt;
   //       acc[1]+=item.totalByDataException;
   //       return acc
   //    },[0,0])):(
   //       workOrdersCountByProject?.ordersCountByMonth?.reduce((acc,item)=>{
   //          if(workOrdersType==='已解决'){
   //             acc.push(item.resolvedCount)
   //          }else if(workOrdersType==='未解决'){
   //             acc.push(item.unresolvedCount)
   //          }else if(workOrdersType==='待办工单'){
   //             acc.push(item.todoCount)
   //          }else if(workOrdersType==='超时工单'){
   //             acc.push(item.overTimeCount)
   //          }
   //          return acc
   //       },[])
   //    )

   const elapseDeviationXAxisData = (!projectName || (pepProjectId&&String(pepProjectId).includes(','))) ? (
      elapseDeviationType === 1?workOrdersElapseDeviation?.plan?.map(item => String(item.name))
      : workOrdersElapseDeviation?.expect?.map(item => String(item.name))
   ): (
      elapseDeviationType === 1?workOrdersElapseDeviation?.plan?.map(item => String(item.startTime))
      : workOrdersElapseDeviation?.expect?.map(item => String(item.startTime))
   )
   
   const elapseDeviationSeriesData = (!projectName || (pepProjectId&&String(pepProjectId).includes(','))) ? (
      elapseDeviationType === 1
      ? workOrdersElapseDeviation?.plan?.map(item => item.elapseInDay)
      : workOrdersElapseDeviation?.expect?.map(item => item.elapseInDay)
   ): (
      elapseDeviationType === 1
      ? workOrdersElapseDeviation?.plan?.map(item => item.elapseInDay)
      : workOrdersElapseDeviation?.expect?.map(item => item.elapseInDay)
   )
   const renderTitle = (title,content)=>{
      return <div style={{display:'flex',alignItems:'center',justifyContent:'center'}}>
         {title}<Tooltip content={content} ><QuestionCircleOutlined/></Tooltip>
         </div>
   }
   return (<>
      <div style={{ background: '#FFFFFF', margin: '8px 12px', padding: '20px 20px 0px 20px', minHeight: clientHeight - 32, display: 'flex', flexDirection: 'column' }}>
         <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
               <div style={{ width: 0, height: 20, borderLeft: '3px solid #005ABD', borderTop: '3px solid transparent', borderBottom: '3px solid transparent' }}></div>
               <div style={{ fontFamily: "YouSheBiaoTiHei", fontSize: 24, color: '#101531', marginLeft: 8 }}>工单统计</div>
               <div style={{ marginLeft: 6, fontSize: 12, color: '#969799', fontFamily: "DINExp", }}>WORK ORDER STATISTICS</div>
               <span style={{ marginLeft: 16 }}>类型：</span>
               <Select value={orderType} onChange={setOrderType} style={{ width: 120, marginLeft: 16 }}>
                  <Select.Option value="">全部</Select.Option>
                  <Select.Option value="数据中断">数据中断</Select.Option>
                  <Select.Option value="异常">数据异常</Select.Option>
               </Select>
               <span style={{ marginLeft: 16 }}>选择日期：</span>
               <DatePicker
                  type="dateRange"
                  density="compact"
                  style={{ width: 260 }}
                  onChange={(date) => setDataRange(date)}
                  value={dataRange}
                  allowClear={false}
               />
               <Button theme='solid' type='primary' style={{ marginLeft: 16 }} onClick={() => getAllData()}>查询</Button>
            </div>
         </div>
         <Spin spinning={countLoading}>
            <div style={{ flex: 1, display: 'flex', marginTop: 20 }}>
               <Card.Grid type='grid' style={{ width: '100%' }}>
                  {[{
                     title: renderTitle('总工单数','时间范围内发起工单总数'),
                     value: workOrdersCount?.allOrdersCount || 0
                  }, {
                     title: renderTitle('已解决工单数','时间范围内审批通过且已解决的工单数'),
                     value: workOrdersCount?.resolvedOrdersCount || 0
                  }, {
                     title: renderTitle('未解决工单数','时间范围内审批通过且未解决的工单数'),
                     value: workOrdersCount?.unresolvedOrdersCount || 0
                  }, {
                     title: renderTitle('待办工单数','时间范围内当前审批中的工单数'),
                     value: workOrdersCount?.todoOrdersCount || 0
                  }, {
                     title: renderTitle('超时工单数','时间范围内审批通过且工单解决时间在计划时间之后的工单数量'),
                     value: workOrdersCount?.overtimeOrdersCount || 0
                  },{
                     title:renderTitle('作废工单数','时间范围内作废或者驳回的工单'),
                     value:workOrdersCount?.invalidOrdersCount || 0
                  }
               ].map((item) => <Card
                     key={item.title}
                     bordered={false}
                     style={{ width: (100/6)+'%' }}
                  >
                     <div style={{ fontSize: 36, textAlign: 'center' }}>{item.value}</div>
                     <div style={{ marginTop: 8, textAlign: 'center' }}>{item.title}</div>
                  </Card>)}
               </Card.Grid>
            </div>
         </Spin>
         <div style={{ margin: '20px 0', flex: 1, display: 'flex', flexWrap: 'wrap' }}>
            <Card
               shadows='hover'
               bordered={false}
               styles={{ body: { padding: '12px' } }}
               style={{ width: '50%', height: '50%' }}
            >
               <Spin spinning={countByProjectLoading}>
               <Radio
                        onChange={e => setCountByProjectType(e.target.value)}
                        value={countByProjectType}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                     >
                        <Radio value={1} style={countByProjectType === 1 ? { fontSize: 18, fontWeight: 'bold', color: "#0b0b0bbd" } : { color: '#a2afb9', fontSize: 14 }}>
                           {renderTitle('月度分布图','按月展示不同筛选条件下的工单个数')}
                        </Radio>
                        <Radio value={2} style={countByProjectType === 2 ? { fontSize: 18, fontWeight: 'bold', color: "#0b0b0bbd" } : { color: '#a2afb9', fontSize: 14 }}>
                           {renderTitle('工单分布情况','全局状态下展示工单数最多的前十项目，单项目展示不同筛选条件的工单个数')}
                        </Radio>
                     </Radio>
                  <div style={{ height: 40, marginBottom: 4, display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                 
                     {/* 已解决、未解决、待办工单、超时工单四个选项+全部 */}
                     
                    {(countByProjectType===1 || (countByProjectType===2&&(!projectName || (pepProjectId&&String(pepProjectId).includes(',') )))) && <Select value={workOrdersType} onChange={setWorkOrdersType} style={{ width: 120, marginLeft: 16 }}>
                        <Select.Option value="全部">全部</Select.Option>
                        <Select.Option value="已解决">已解决</Select.Option>
                        <Select.Option value="未解决">未解决</Select.Option>
                        <Select.Option value="待办工单">待办工单</Select.Option>
                        <Select.Option value="超时工单">超时工单</Select.Option>
                     </Select>}
                  </div>
                  <ReactECharts
                     notMerge={true}
                     lazyUpdate={true}
                     option={{
                        xAxis: {
                           type: 'category',
                           axisLabel: {
                              rotate: 45, // 文字旋转的角度
                              formatter: function (value) {
                                 if (value.length > 6) { // 如果文字长度超过6个字符
                                    return value.slice(0, 6) + '..'; // 截取前6个字符并添加省略号
                                 } else {
                                    return value;
                                 }
                              }
                           },
                           data: countByProjectXAxisData
                        },
                        yAxis: {
                           type: 'value',
                           name: "工单数/个",
                           nameLocation: "end",
                           nameGap: 20
                        },
                        legend: {},
                        tooltip: {},
                        grid: {
                           left: '3%',
                           right: '4%',
                           bottom: '1%',
                           // top: '4%',
                           containLabel: true
                        },
                        series: seriesList
                        // [
                        //    {
                        //       data: countByProjectSeriesData,
                        //       type: 'bar',
                        //       name: '工单数',
                        //       barWidth: 28,
                        //    }
                        // ]
                     }}
                  />
               </Spin>
            </Card>
            <Card
               shadows='hover'
               bordered={false}
               styles={{ body: { padding: '12px' } }}
               style={{ width: '50%', height: '50%' }}
            >
               <Spin spinning={elapseDeviationLoading}>
               <Radio
                        onChange={e => setElapseDeviationType(e.target.value)}
                        value={elapseDeviationType}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                     >
                        <Radio value={1} style={elapseDeviationType === 1 ? { fontSize: 18, fontWeight: 'bold', color: "#0b0b0bbd" } : { color: '#a2afb9', fontSize: 14 }}>
                           {renderTitle('计划与实际修复偏差耗时','全局状态下统计平均用时最多的前十项目（处理完成时间-计划处理时间），单项目展示处理时间最多的前十工单')}
                        </Radio>
                        <Radio value={2} style={elapseDeviationType === 2 ? { fontSize: 18, fontWeight: 'bold', color: "#0b0b0bbd" } : { color: '#a2afb9', fontSize: 14 }}>
                           {renderTitle('期望与实际修复偏差耗时','全局状态下统计平均用时最多的前十项目（处理完成时间-期望完成时间），单项目展示处理时间最多的前十工单')}
                        </Radio>
                     </Radio>
                  <div style={{ height: 40, marginBottom: 4 }}>
                     
                  </div>
                  <ReactECharts
                     notMerge={true}
                     lazyUpdate={true}
                     option={{
                        tooltip: {
                           trigger: 'axis',
                           axisPointer: {
                              type: 'shadow'
                           }
                        },
                        grid: {
                           left: '6%',
                           right: '4%',
                           bottom: '1%',
                           // top: '4%',
                           containLabel: true
                        },
                        xAxis: {
                           type: 'category',
                           axisLabel: {
                              rotate: 45,
                              formatter: function (value) {
                                 if (value.length > 5) {
                                    return value.slice(0, 5) + '..';
                                 } else {
                                    return value;
                                 }
                              }
                           },
                           data: elapseDeviationXAxisData
                        },
                        yAxis: {
                           type: 'value',
                           position: 'left',
                           name: "耗时/天",
                           splitLine: {
                              lineStyle: {
                                 type: 'dashed'
                              }
                           }
                        },
                        series: [
                           {
                              name: '耗时',
                              type: 'bar',
                              barWidth: 28,
                              data: elapseDeviationSeriesData
                           }
                        ]
                     }}
                  />
               </Spin>
            </Card>
            <Card
               shadows='hover'
               bordered={false}
               styles={{ body: { padding: '0px 6px' } }}
               style={{ width: '50%', height: '50%' }}
            >
               <Tabs type="line" style={{ width: '100%', height: '100%' }}>
                  <Tabs tab={<div style={{display:'flex',justifyContent:'center'}}>
                     未解决工单<Tooltip content={'时间范围内工单内是否解决选择“否”的工单信息'}><QuestionCircleOutlined
                     style={{color:'var(--semi-color-text-0)'}}
                     /></Tooltip>
                  </div>} itemKey="1">
                     <Table
                        rowKey={record => record.procInstId}
                        columns={unresolvedColumns}
                        dataSource={workOrdersUnresolved}
                        loading={unresolvedLoading}
                        pagination={false}
                        size="small"
                        scroll={{ x: '100%', y: 270 }}
                     />
                  </Tabs>
                  <Tabs tab={
                     <div style={{display:'flex',justifyContent:'center'}}>
                     违规超时工单<Tooltip content={'时间范围内实际修复时间在期望修复时间之后的工单'}><QuestionCircleOutlined
                     style={{color:'var(--semi-color-text-0)'}}

                     /></Tooltip>
                  </div>
                     } itemKey="2">
                     <Table
                        rowKey={record => record.procInstId}
                        columns={overtimeColumns}
                        dataSource={workOrdersOvertime?.sort((a, b) => b.overtimeInDay - a.overtimeInDay)}
                        loading={overtimeLoading}
                        pagination={false}
                        size="small"
                        scroll={{ x: '100%', y: 270 }}
                     />
                  </Tabs>
               </Tabs>
            </Card>
            <Card
               shadows='hover'
               bordered={false}
               styles={{ body: { padding: '12px' } }}
               style={{ width: '50%', height: '50%' }}
            >
               <Spin spinning={elapseLoading}>
                  <div style={{ height: 40, marginBottom: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                     <span style={{ fontSize: 18, fontWeight: 'bold', color: "#0b0b0bbd" }}>
                        {renderTitle('工单耗时统计','全局项目展示从表单发起到表单关闭用时最多的前十项目，单项目展示从表单发起到表单关闭用时最多的前十工单')}
                     </span>
                  </div>
                  <ReactECharts
                     notMerge={true}
                     lazyUpdate={true}
                     option={{
                        tooltip: {},
                        xAxis: {
                           type: 'category',
                           axisLabel: {
                              rotate: 45, // 文字旋转的角度
                              formatter: function (value) {
                                 if (value.length > 6) { // 如果文字长度超过6个字符
                                    return value.slice(0, 6) + '..'; // 截取前6个字符并添加省略号
                                 } else {
                                    return value;
                                 }
                              }
                           },
                           data: workOrdersElapse.map(item =>{
                              if(!projectName ||(pepProjectId&&String(pepProjectId).includes(','))){
                                 return item.projectName 
                              }else{
                                 return item.startTime
                              }
                           })
                        },
                        yAxis: {
                           type: 'value',
                           name: "耗时/天",
                        },
                        series: [
                           {
                              data: workOrdersElapse.map(item => {
                                 //全局或者多项目
                                 if(!projectName || (pepProjectId&&String(pepProjectId).includes(','))){
                                    return item.elapseTotal
                                 }else{
                                    //单项目
                                    return item.elapse
                                 }
                              }),
                              type: 'bar',
                              name: '耗时',
                              barWidth: 28,
                           }
                        ]
                     }}
                  />
               </Spin>
            </Card>
         </div>
      </div>
      <Modal
         title="解决"
         open={resolveVisible}
         onOk={handleResolve}
         onCancel={() => setResolveVisible(false)}
         closeOnEsc={true}
         okButtonProps={{ loading: resolveLoading }}
      >
         是否解决？
      </Modal>
      <WorkflowApprovalModal
         type={'myApply'}
         open={workflowModalVisible}
         processAuditList={[]}
         checkProcessInstanceId={checkProcessInstanceId}
         onCancel={() => { setWorkflowModalVisible(false) }}
      />
   </>)
}

function mapStateToProps(state) {
   const { auth, global, ProjectPoms, workOrdersCount, workOrdersCountByProject, workOrdersElapseDeviationByProject, workOrdersUnresolved, workOrdersOvertime, workOrdersElapseByProject } = state;
   const projectPoms = ProjectPoms?.data?.rows || [];
   const formatWorkOrdersCountByProject = {
      resolvedOrders: (workOrdersCountByProject?.data?.resolvedOrders || [])
         .map(item => {
            const name = (projectPoms).find(pom => pom.id === item.correlationProjectId)?.name
               || (projectPoms).find(pom => pom.id === item.correlationProjectId)?.pepProjectName
               || item.correlationProjectId;
            return { ...item, name }
         }),
      unresolvedOrders: (workOrdersCountByProject?.data?.unresolvedOrders || [])
         .map(item => {
            const name = (projectPoms).find(pom => pom.id === item.correlationProjectId)?.name
               || (projectPoms).find(pom => pom.id === item.correlationProjectId)?.pepProjectName
               || item.correlationProjectId;
            return { ...item, name }
         }),
      todoOrders: (workOrdersCountByProject?.data?.todoOrders || [])
         .map(item => {
            const name = (projectPoms).find(pom => pom.id === item.correlationProjectId)?.name
               || (projectPoms).find(pom => pom.id === item.correlationProjectId)?.pepProjectName
               || item.correlationProjectId;
            return { ...item, name }
         }),
      //类型选择全部的时候，每个工单状态按数据中断和数据异常进行区分展示
      totalOrders: (workOrdersCountByProject?.data?.totalOrders || []).map(item=>{
         const name = (projectPoms).find(pom => pom.id === item.correlationProjectId)?.name
         || (projectPoms).find(pom => pom.id === item.correlationProjectId)?.pepProjectName
         || item.correlationProjectId;
      return { ...item, name }
      }),
         
      overTimeOrders: (workOrdersCountByProject?.data?.overtimeOrders || [])
         .map(item => {
            const name = (projectPoms).find(pom => pom.id === item.correlationProjectId)?.name
               || (projectPoms).find(pom => pom.id === item.correlationProjectId)?.pepProjectName
               || item.correlationProjectId;
            return { ...item, name }
         }),
      ordersCountByMonth:workOrdersCountByProject?.data?.ordersCountByMonth
   }
   const formatElapseDeviation = {
      expect: (workOrdersElapseDeviationByProject?.data?.expect || [])
         .map(item => {
            const name = (projectPoms).find(pom => pom.id === item.correlationProjectId)?.name
               || (projectPoms).find(pom => pom.id === item.correlationProjectId)?.pepProjectName
               || item.correlationProjectId;
            return { ...item, name }
         }),
      plan: (workOrdersElapseDeviationByProject?.data?.plan || [])
         .map(item => {
            const name = (projectPoms).find(pom => pom.id === item.correlationProjectId)?.name
               || (projectPoms).find(pom => pom.id === item.correlationProjectId)?.pepProjectName
               || item.correlationProjectId;
            return { ...item, name }
         }),
   }

   return {
      user: auth.user,
      actions: global.actions,
      clientHeight: global.clientHeight,
      pepProjectId: global.pepProjectId,
      projectPoms: projectPoms,
      workOrdersCount: workOrdersCount?.data,
      countLoading: workOrdersCount?.isRequesting,
      workOrdersCountByProject: formatWorkOrdersCountByProject,
      countByProjectLoading: workOrdersCountByProject?.isRequesting,
      workOrdersElapseDeviation: formatElapseDeviation,
      elapseDeviationLoading: workOrdersElapseDeviationByProject?.isRequesting,
      workOrdersUnresolved: workOrdersUnresolved?.data || [],
      unresolvedLoading: workOrdersUnresolved?.isRequesting,
      workOrdersOvertime: workOrdersOvertime?.data || [],
      overtimeLoading: workOrdersOvertime?.isRequesting,
      elapseByProject: workOrdersElapseByProject?.data || [],
      elapseByProjectLoading: workOrdersElapseByProject?.isRequesting,
      workOrdersElapse: workOrdersElapseByProject?.data || [],
      elapseLoading: workOrdersElapseByProject?.isRequesting,
   };
}

export default connect(mapStateToProps)(workorderStatistics);
