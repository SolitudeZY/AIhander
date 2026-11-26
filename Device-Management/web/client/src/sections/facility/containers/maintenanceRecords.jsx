import React, { useEffect,useState } from 'react';
import { connect } from 'react-redux';
import moment from 'moment'
import { Button, DatePicker, Select, Table, Popconfirm, Tooltip, Pagination } from 'antd';
import ServerInfoModal from '../components/serverInfoModal'


const MaintenanceRecords = (props) => {
   const { dispatch, actions, user, loading, socket } = props
   const [addVis, setAddVis] = useState(false)
   const [recordRow, setRecordRow] = useState(null)
   const [pageSize,setPageSize]=useState(10)
   const [pageIndex,setPageIndex]=useState(1)
   const [total,setTotal]=useState()
   const [pepList, setPepList] = useState([])//角色分配
   const {install,facility}=actions
   const [startTime,setStartTime]=useState(null)//配置查询起止时间
   const [endTime,setEndTime]=useState(null)  
   const [recordList,setRecordList]=useState([])
   useEffect(() => {

   }, [])
   //获取服务器信息
   const getServerInfo=(query={startTime,endTime,pageIndex,pageSize})=>{
    dispatch(facility.getServerInfoMaintenanceRecord(query)).then((res)=>{
        if(res.success) setRecordList(res.payload.data.responseRes);setTotal(res?.payload.data.count)
    })
   }
   //删除逻辑
   const delHandler=(record)=>{
    dispatch(facility.delServerInfoMaintenanceRecord(record.id)).then((res)=>{
        if(res.success) {
            const query={startTime,endTime,pageIndex,pageSize}
            dispatch(facility.getServerInfoMaintenanceRecord(query)).then((res)=>{
                if(res.success) {
                    setRecordList(res.payload.data.responseRes);setTotal(res?.payload.data.count)
                    //再用当前页去查询，判断结果是否为空（删除某一页的唯一元素时，再次请求结果为空），为空且当前页不是第一页，当前页-1，再查询一遍。
                    if(res?.payload.data.responseRes.length===0&&pageIndex!==1){
                        getServerInfo({startTime,endTime,pageIndex:pageIndex-1,pageSize})
                        setPageIndex(pageIndex-1)
                    }
                }
            })
            setPageIndex(1)

        }
    })
   }
   //查询按钮的逻辑
   const searchHandler=()=>{
    setPageIndex(1);setPageSize(10)
    const query={startTime,endTime,pageIndex:1,pageSize:10}
    getServerInfo(query)
   }
   //清楚日期选择框的逻辑
   const clearHandler=()=>{
    setStartTime(null)
    setEndTime(null)
    const query={startTime:null,endTime:null,pageIndex,pageSize}
    getServerInfo(query)
   }
   useEffect(() => {
    getServerInfo()//获取服务器信息维护记录
    dispatch(install.getOrganizationDeps()).then((res) => {//获取项企(PEP)全部部门及其下用户
      if(res.success) setPepList(res.payload.data)
    })   
 }, [])
   const columns = [
      {
          title: '序号',
          render: (t, r, i) => {
              return i + 1;
          }
      },
     
      {
          title: '维护描述',
          dataIndex: 'sketch'
      },
      {
          title: '维护原因',
          dataIndex: 'reason'
      },
      {
          title: '维修人',
          render:(record) => {
            return (
                <span>
                    {record?.serverMaintenanceRecordRepairmans
                        .map((item) => {
                            return item.name;
                        })
                        .toString()}
                </span>
            );
        }
      },
      {
          title: '备注',
          dataIndex: 'remark'
      },
    
      {
          title: '维护开始时间',
          render: (record) => {
            return (record?.maintenanceStartTime?(<span>{moment(record.maintenanceStartTime).format('YYYY-MM-DD HH:mm:ss')}</span>):'')
          }
      },
      {
          title: '维护完成时间',
          render: (record) => {
              return (record?.maintenanceFinishTime?(<span>{moment(record.maintenanceFinishTime).format('YYYY-MM-DD HH:mm:ss')}</span>):'')
          }
      },
      {
          title: '状态',
        render:(record)=>{
            switch(record.state){
                case 'completed':
                    return '维修完成'
                case 'underway':
                    return '维修中'
                case 'wait':
                    return '待维修'
                default:
                    break
            }
             
        }
      },
      {
          title: '操作',
          render: (record) => {
            //console.log('1111111',record)
              return (
                  <div>
                      <Button
                      style={{marginRight:10}}
                          onClick={() => {
                              setAddVis(true);
                              setRecordRow(record);
                          }}
                      >
                          编辑
                      </Button>
                      <Popconfirm
                          title='确定是否删除？'
                          onConfirm={() => {
                              delHandler(record)
                          }}
                      >
                          <Button type='danger' > 删除</Button>
                      </Popconfirm>
                  </div>
              );
          }
      }
  ];

 
   return (
      <div style={{ background: '#FFFFFF', margin: '8px 12px', padding: '20px 20px 0px 20px' }}>
            <div style={{ display: 'flex', marginBottom: 20, alignItems: 'baseline' }}>
                <div style={{ marginRight: 100 }}>
                    {' '}
                    <Button
                        theme='solid'
                        type='secondary'
                        onClick={() => {
                            setAddVis(true);
                        }}
                    >
                        新增
                    </Button>
                </div>
                <div style={{ marginRight: 20, display: 'flex', alignItems: 'baseline' }}>
                    <span style={{ marginRight: 10 }}>维护开始时间</span>
                    <DatePicker type='dateTimeRange' onChange={(dateTime)=>{
                        setStartTime(dateTime[0]+'')
                        setEndTime(dateTime[1]+'')
                    }} onClear={clearHandler}></DatePicker>
                </div>
                <div>
                    <Button theme='solid' type="primary" onClick={searchHandler}>查询</Button>
                </div>
            </div>
            <div>
                <Table columns={columns} dataSource={recordList} pagination={false}></Table>
            </div>
            <div style={{ display: 'flex',justifyContent:'flex-end' ,margin:'10px 0 0 0'}}>
                     <span style={{ lineHeight: "30px", fontSize: 13, color: 'rgba(0,90,189,0.8)' }}>
                        共{total}条信息
                     </span>
         <Pagination total={total}
      showSizeChanger
      pageSize={pageSize}
      current={pageIndex}
      pageSizeOpts={[10, 20, 30]}
      onChange={(pageIndex,pageSize)=>{
        //console.log('pageIndex1',pageIndex,pageSize)
            setPageIndex(pageIndex)
            setPageSize(pageSize)
            const query={
              pageIndex:pageIndex,pageSize:pageSize,startTime, endTime
            }
            getServerInfo(query)
         }}></Pagination>
      </div>
            <ServerInfoModal
                open={addVis}
                onClose={() => {
                    setAddVis(false);
                    setRecordRow(null);
                    getServerInfo()
                }}
                recordRow={recordRow}
                pepList={pepList}
                
            ></ServerInfoModal>
        </div>
    );
};

function mapStateToProps(state) {
    const { auth, global, members, webSocket,  } = state;
    return {
        //   loading: members.isRequesting,
        //   user: auth.user,
        actions: global.actions,
        //   members: members.data,
        //   socket: webSocket.socket
    };
}
export default connect(mapStateToProps)(MaintenanceRecords)
