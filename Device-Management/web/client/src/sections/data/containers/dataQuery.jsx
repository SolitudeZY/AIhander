import React, { useEffect, useState, useRef } from 'react';
import { connect } from 'react-redux';
import moment from 'moment';

import { exportWord } from 'mhtml-to-word'
import { saveAs } from 'file-saver';

import { SkeletonScreen, } from "$components";
import { SearchOutlined } from '@ant-design/icons';
import DataQueryCkeck from '../components/dataQueryCheck'
import { Form, Button, Skeleton, Table, Pagination, Space } from 'antd';
import '../style.less'

const DataQuery = (props) => {
   const { dispatch, actions, user, dataContinuityType, dataContinuity,isEnergy } = props
   const { data: sectionData } = actions
   const [query, setQuery] = useState({ limit: 10, page: 0 }); //页码信息
   const [limits, setLimits] = useState(0)//每页实际条数
   const [loading, setLoading] = useState(true);
   const [params, setParams] = useState({})
   const [checkVis, setCheckVis] = useState(false)
   const [checkData, setCheckData] = useState({})

   useEffect(() => {
      dispatch(sectionData.getContinuityType())
      getData()
   }, [])

   const getData = (queryParams = {}) => {
      setLoading(true);
      let createTimes=[]
      createTimes=isEnergy?([moment().subtract(30,'days').format('YYYY-MM-DD HH:mm:ss'),moment().format('YYYY-MM-DD HH:mm:ss')]):''
      dispatch(sectionData.getContinuityList({ ...params, ...query, ...queryParams,createTimes,isEnergy })).then(res => [
         setLoading(false)
      ])
   }

   const downloadWord = (html = '', name = '监测报表 ' + moment().format('YYYY-MM-DD HH:mm:ss')) => {
      exportWord({
         mhtml: html,
         filename: name,
      })
      // let blob = new Blob([html], { type: "application/msword;charset=utf-8" });
      // saveAs(blob, name + '.doc');
   }

   return (
      <>
         <div style={{ background: '#FFFFFF', margin: '8px 12px', padding: '20px 20px 0px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
               <div style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={{ width: 0, height: 20, borderLeft: '3px solid #005ABD', borderTop: '3px solid transparent', borderBottom: '3px solid transparent' }}></div>
                  <div style={{ fontFamily: "YouSheBiaoTiHei", fontSize: 24, color: '#101531', marginLeft: 8 }}>数据监测</div>
                  <div style={{ marginLeft: 6, fontSize: 12, color: '#969799', fontFamily: "DINExp", }}>DATA QUERY</div>
               </div>
               <div style={{ marginRight: 20, display: 'flex', alignItems: 'center' }} className='myempush'>
                  <Form
                     layout="horizontal"
                     style={{ position: "relative", width: "100%", flex: 1 }}
                     onSubmit={(values) => {
                        if (values?.createTimes?.length) {
                           values.createTimes = [moment(values?.createTimes[0]).format('YYYY-MM-DD HH:mm:ss'), moment(values?.createTimes[1]).format('YYYY-MM-DD HH:mm:ss')]
                        }
                        setParams({ ...values })
                        setQuery({ limit: 10, page: 0 })
                        getData({ createTimes: '', typeNo: '', ...values, limit: 10, page: 0 })
                     }}
                  >
                    {!isEnergy? <Form.DatePicker
                        pure
                        field="createTimes"
                        label="产生时间"
                        style={{ width: 268 }}
                        type="dateRange" density="compact"
                     />:''}
                     {!isEnergy?<Form.Select
                        pure
                        label="监测报表类型"
                        field="typeNo"
                        placeholder="监测报表类型"
                        style={{ width: 260, marginLeft: 12, marginRight: 12 }}
                        allowClear
                     >
                        {
                           dataContinuityType.map((item, index) => {
                              return (
                                 <Select.Option key={index} value={item.id}>
                                    {item.name}
                                 </Select.Option>
                              )
                           })
                        }
                     </Form.Select>
                     :''}
                     {!isEnergy?<Button theme='solid' type="primary" htmlType="submit">
                        查询
                     </Button>:''}
                  </Form>
               </div>
            </div>

            <div style={{ marginTop: 20 }}>
               <Skeleton
                  loading={loading}
                  // loading={false}
                  active={true}
                  placeholder={SkeletonScreen()}
               >
                  <Table
                     rowKey="id"
                     columns={[{
                        title: '数据类型',
                        dataIndex: 'typeName',
                        render: (text, record, index) => {
                           return record?.alarmDataContinuityType?.name || dataContinuityType?.find(d => d.typeNumber == record.type)?.name || ''
                        }
                     }, {
                        title: '产生时间',
                        dataIndex: 'createTime',
                        render: (text, record, index) => {
                           return record?.createTime ? moment(record.createTime).format('YYYY-MM-DD HH:mm:ss') : ''
                        }
                     }, {
                        title: '操作',
                        dataIndex: 'option',
                        render: (text, record, index) => {

                           return (
                              <Space>
                                 {
                                    record?.fileUrl ? <Button theme='borderless' type='primary' style={{ marginRight: 8 }} ><a href={`/_file-server/${record.fileUrl + '?filename=' + (record?.alarmDataContinuityType?.name || dataContinuityType?.find(d => d.typeNumber == record.type)?.name) + moment(record.createTime).format('YYYY-MM-DD HH:mm:ss') + '.' + record?.fileUrl?.split('.').pop()}`}>
                                       下载
                                    </a></Button>
                                       : <Button theme='borderless' type="primary" onClick={() => {
                                          dispatch(sectionData.getContinuityDetail(record.id)).then(res => {
                                             if (res.success) {
                                                downloadWord(res.payload?.data?.file || '', (record?.alarmDataContinuityType?.name || dataContinuityType?.find(d => d.typeNumber == record.type)?.name) + moment(record.createTime).format('YYYY-MM-DD HH:mm:ss'))
                                             }
                                             setLoading(false)
                                          })
                                       }}>
                                          下载
                                       </Button>
                                 }

                                 {!isEnergy?<Button theme='borderless' type="primary" onClick={() => {
                                    setCheckData(record);
                                    setCheckVis(true);
                                 }}>
                                    查看
                                 </Button>:''}
                              </Space>
                           )
                        }
                     }]}
                     dataSource={dataContinuity?.rows}
                     bordered={false}
                     hideExpandedColumn={false}
                     empty="暂无数据"
                     pagination={false}
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
                        共{dataContinuity?.count}条数据
                     </span>
                     <Pagination
                        total={dataContinuity?.count}
                        showSizeChanger
                        current={query.page + 1}
                        pageSizeOpts={[10, 20, 30, 40]}
                        onChange={(currentPage, pageSize) => {
                           setQuery({ limit: pageSize, page: currentPage - 1 });
                           getData({ limit: pageSize, page: currentPage - 1 })
                        }}
                     />
                  </div>
               </div>
            </div>
            <DataQueryCkeck open={checkVis} onCancel={() => {
               setCheckVis(false);
               setCheckData({})
            }} checkData={checkData} />
         </div>
      </>
   )
}

function mapStateToProps (state) {
   const { auth, global, dataContinuityType, dataContinuity } = state;
   return {
      user: auth.user,
      actions: global.actions,
      dataContinuityType: dataContinuityType.data || [],
      dataContinuity: dataContinuity.data || []
   };
}

export default connect(mapStateToProps)(DataQuery);
