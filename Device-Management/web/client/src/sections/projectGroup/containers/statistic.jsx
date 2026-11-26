import React, { useEffect, useRef, useState } from 'react';
import { connect } from 'react-redux';
import { Skeleton, Button, Pagination, Form, Popconfirm, Table, Tooltip } from 'antd';
import { push } from 'react-router-redux';
import { SkeletonScreen, } from "$components";
import Header from '../components/header';
import Body from '../components/body'
import Card from '../components/card'
import '../style.less'

const Statistic = (props) => {
   const { dispatch, actions, user, history, loading, groupStatistic, clientHeight, ...restProps } = props
   const { projectGroup } = actions;
   const [query, setQuery] = useState({ limit: 10, page: 0 }); //页码信息
   const [queryUserId, setQueryUserId] = useState('')

   const getQueryUserId = () => {
      let search = restProps?.location?.search || '';
      let params = new URLSearchParams(search);
      let userId = params.get('pomsU')
      setQueryUserId(userId)
      return userId
   }
   useEffect(() => {
      let userId = getQueryUserId()
      dispatch(projectGroup.groupStatistic({ userId }))
      setQueryUserId(userId)
   }, [])

   useEffect(() => {
      getQueryUserId()
   }, [restProps?.location])

   let columns = [
      {
         title: '项目集名称',
         dataIndex: "name",
         key: 'name',
         width: "30%",
         render: (text, row) => <div style={{ cursor: 'pointer' }} onClick={() => {
            //将每个人最后观看项目集大屏的id储存起来，以便下次直接跳转到大屏
            let projectGroup = JSON.parse(localStorage.getItem('project_group'))
            if (!projectGroup) {
               localStorage.setItem('project_group', JSON.stringify([{ userId: user?.id || queryUserId, projectGroupId: row?.id, name: row?.name }]))
            } else {
               let findOne = projectGroup?.find(v => v.userId == queryUserId)
               if (findOne) {
                  projectGroup?.forEach(v => {
                     if (v.userId == queryUserId) {
                        v.projectGroupId = row?.id
                        v.name = row?.name
                     }
                  })
               } else {
                  projectGroup.push({ userId: queryUserId, projectGroupId: row?.id, name: row?.name })
               }
               localStorage.setItem('project_group', JSON.stringify(projectGroup))
            }

            dispatch(push(`/projectGroup/bigscreen?pomsPG=${row?.id}&pomsU=${queryUserId}`))

         }}>{text}</div>
      }, {
         title: '项目集类型',
         dataIndex: "name",
         key: 'name',
         render: (_, row) => {
            return row?.level && row?.level?.name ? row?.level?.name + ' 级' : '--'
         }
      }, {
         title: '项目个数',
         dataIndex: "pomsProjectIds",
         key: 'pomsProjectIds',
         render: (_, row) => row?.pomsProjectIds?.length || 0
      }, {
         title: '结构物数量',
         dataIndex: "strucCount",
         key: 'strucCount',
      }, {
         title: '流转工单数',
         dataIndex: "activeOrderCount",
         key: 'activeOrderCount',
      }, {
         title: '中断时长',
         dataIndex: "maxOffLineTime",
         key: 'maxOffLineTime',
         render: (text, row) => {
            let title
            if (text) {
               if (text >= 1440 && Math.floor(text / 1440)) title = Math.floor(text / 1440) + "天"
               if ((text % 1440) >= 60 && Math.floor(text % 1440 / 60)) {
                  if (title) {
                     title = title + Math.floor(text % 1440 / 60) + "时"
                  } else {
                     title = Math.floor(text % 1440 / 60) + "时"
                  }
               }
               if (text % 1440 % 60) {
                  if (title) {
                     title = title + text % 1440 % 60 + "分"
                  } else {
                     title = text % 1440 % 60 + "分"
                  }
               }
            }
            return title || "--"
         }
      }, {
         title: '今日告警个数',
         dataIndex: "todayAlarms",
         key: 'todayAlarms',
         // render: (_, row) => Math.floor(Math.random() * 20)
      }
   ]

   const handleRow = (record, index) => {
      return {
         style: {
            background: 'linear-gradient(180deg, #f1f7ff00 0%, #DEEBFF 100%)',
         },
      };

   };



   return (
      <div className='project-group'>
         <Header  {...props} />
         <Body>
            <Card title="重点项目集">
               <div style={{
                  marginTop: 10, height: clientHeight - 140,
                  display: 'flex', flexDirection: 'column', justifyContent: "space-between"
               }}>
                  <Skeleton
                     loading={loading}
                     // loading={false}
                     active={true}
                     placeholder={SkeletonScreen()}
                  >
                     <Table
                        rowKey="name"
                        scroll={{ y: clientHeight - 245 }}
                        columns={columns}
                        dataSource={groupStatistic}
                        bordered={false}
                        hideExpandedColumn={false}
                        empty="暂无数据"
                        // expandedRowRender={expandRowRender}
                        pagination={false}
                        onRow={handleRow}
                     />
                  </Skeleton>
                  <div
                     style={{
                        display: "flex",
                        justifyContent: "flex-end",
                        padding: "20px 20px",
                     }}
                  >

                     <div style={{ display: 'flex', }}>
                        <span style={{ lineHeight: "30px", fontSize: 13, color: 'rgba(0,90,189,0.8)' }}>
                           共{groupStatistic?.length || 0}条信息
                        </span>
                        <Pagination
                           className=""
                           total={groupStatistic?.length || 0}
                           showSizeChanger
                           current={query.page + 1}
                           pageSizeOpts={[10, 20, 30, 40]}
                           onChange={(currentPage, pageSize) => {
                              setQuery({ limit: pageSize, page: currentPage - 1 });
                              // page.current = currentPage - 1
                              // setChange(!change)
                           }}
                        />
                     </div>
                  </div>
               </div>
            </Card>
         </Body>
      </div>
   )
}

function mapStateToProps (state) {
   const { auth, global, groupStatistic } = state;
   return {
      clientHeight: global.clientHeight,
      user: auth.user,
      actions: global.actions,
      groupStatistic: groupStatistic?.data || [],
      loading: groupStatistic.isRequesting,
   };
}

export default connect(mapStateToProps)(Statistic);
