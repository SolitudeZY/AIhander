import React, { useEffect, useState, useRef } from 'react';
import { Card, Button, Form, Table, Popconfirm, message, Spin, Select } from 'antd';
import { connect } from 'react-redux';
import BatchImportModal from '../components/batchImportModal';
import './interStyle/inter.less'
import batchImportModal from '../components/batchImportModal';
import CardModal from '../components/CardModal/cardModal'

import moment from 'moment';

// import CardModal from '../components/CardModal/cardModal'


const InterCard = (props ) =>{
    const {dispatch,actions,loading } = props
    const{analysis} = actions
    const [cardClass,setCardClass] = useState()
    const { Option } = Select;
    const [tableCard,setTableCard] = useState([])
    const [showModal ,setShowModal] = useState(false)
    const [bathImportModalVis,setBathImportModalVis] = useState(false)
    const [recordRow,setRecordRow] = useState()
    const [struct,setStruct] = useState()
    const [structId,setStructId] = useState()
    const [status,setStatus] = useState()
    const [cardNumber,setCardNumber] = useState(void 0)
    //结构物数据
    // const getStruce = struct?.map((r)=>r.anxinyun_structure_name)
    // console.log(getStruce,666);

    //绑定表单项
    const form = useRef()

   
    //关闭并清空弹框内容
    const closes = () => {
        setShowModal(false);
        setRecordRow('')
    }

   //添加成功
   const addSuccess = ()=>{
    message.success('编辑成功')
   }

    //获取头部数据
//     useEffect(async()=>{
//     const res = await  dispatch(analysis.getClassifiedData())
//     setCardClass(res?.payload?.data)
       
// },[])

  useEffect(async()=>{
    queryData()
  },[])

//   status,
//   anxinyunStructureId,
  const clearChoose = () => {
      form.current.formApi.setValues({
        UserName:undefined,
        state:undefined,
      });
  }
  //查询表单数据
  const queryData=(query={status:undefined,anxinyunStructureId:undefined})=>{
    dispatch(analysis.getCardList(query)).then(res=>{
        if(res.success){
            setTableCard(res?.payload?.data.reverse())
        }
    })
    dispatch(analysis.getClassifiedData()).then(res=>{
        if(res.success){
            setCardClass(res?.payload?.data)

        }
    })
  }

  //删除
  const del = (record) =>{
    dispatch(analysis.deleteCard(record?.id)).then((res) => {
        if (res.success) {
           
            queryData()
            message.success('删除成功')        }
    })
  }

  useEffect(()=>{
    dispatch(analysis.getStructureList()).then(res=>{
        let list=[]
        res?.payload?.data?.forEach((s)=>{
            if(!!s.anxinyun_structure_name){
               if(!list?.some(r=>r.value===s.anxinyun_structure_id)){
                list.push({
                    value:s.anxinyun_structure_id,
                    label:s.anxinyun_structure_name,
                    key: s.anxinyun_structure_id,
                })
               }
            }
        }
        
        )
        setStruct(list)
    })
  },[])



  //新增表格项
  const addTableContent = async()=>{
    setShowModal(true)

  }

  //结构物筛选
  const getStru = (code) =>{
    queryData({anxinyunStructureId:code,status,cardNumber}) 
     setStructId(code)

  }

  //状态筛选
  const getStatus =(e )=>{
    queryData({anxinyunStructureId:structId,status:e,cardNumber}) 
    setStatus(e)
  }


    //头部数据
const manageCard = [
    {
        name:'物联卡数量',
        count:Number(cardClass?.total),
        picture:'lan_1@2x.jpg'
    },
    {
        name:'正常数量',
        count:Number(cardClass?.normaltotal),
        picture:'lv_1@2x.jpg'
    },
    {
        name:'未激活',
        count:Number(cardClass?.notacitvetotal),
        picture:'huang_3@2x.jpg'
    },
    {
        name:'停机',
        count:Number(cardClass?.halttotal),
        picture:'hong_4@2x.jpg'
    },
    {
        name:'僵尸卡数量',
        count:Number(cardClass?.zombietotal),
        picture:'hui_1@2x.jpg'
    }
]

    const columns = [
        {
            title: '序号',
            dataIndex: 'id',
            render: (t, r, i) => {
                return i + 1;
            }
        },
     
        {
            title: '结构物名称',
            dataIndex: 'anxinyunStructureName',
            ellipsis: true,
        },
        {
            title: '更新日期',
            dataIndex: 'updateTime',
            ellipsis: true,
           render:(
            _d, record, index) => {
                return record?.updateTime && moment(record.updateTime).format('YYYY-MM-DD HH:mm:ss')
            }
        },
        {
            title: '物联卡号',
            dataIndex: 'cardNumber',
            ellipsis: true,
        },
        {
            title: '套餐类型',
            dataIndex: 'type',
            ellipsis: true,
        },
        {
            title: '套餐总量',
            dataIndex: 'total',
            ellipsis: true,
        },
        {
            title: '套餐余量',
            dataIndex: 'allowance',
            ellipsis: true,
        },
        {
            title: '经度',
            dataIndex: 'lng',
            ellipsis: true,
        },
        {
            title: '纬度',
            dataIndex: 'lat',
            ellipsis: true,
        },
        {
            title: '位置',
            dataIndex: 'address',
            ellipsis: true,
            width: '15%',
        },
        {
            title: '当前状态',
            dataIndex: 'status',
            ellipsis: true,
            render:(_d,record,index)=>{
                return record?.status===0? <div className='normal'>正常</div>
                :record?.status===1? <div className='halt'>停机</div>
                :record?.status===2? <div className='Unplayment'>未激活</div>
                :record?.status===3? <div>僵尸卡</div>
                :record?.status
            }
        },
        // {
        //     title: '接入时间',
        //     ellipsis: true,
        //     dataIndex: 'activeTime',
        //     render: (_d, record, index) => {
        //         return record?.activeTime && moment(record.activeTime).format('YYYY-MM-DD HH:mm:ss')
        //     }
        // },
        {
            title:'操作',
            ellipsis: true,
            dataIndex:'tools',
            render:(_,record)=>{
                return(
                    <div className='tools'>
                    <div className='update' onClick={()=>{
                     setShowModal(true);
                     setRecordRow(record)
                    }}>修改</div>
            <Popconfirm
            title="您确定要删除吗"
            onConfirm={() => { del(record) }}
          >
         <div className='del'>删除</div>
         </Popconfirm>
                        </div>
                    
                )
            }

        }
    ];
    const debounce = (fn, delay = 500) => {
        let timer = null;
        return function(...args) {
          if (timer) clearTimeout(timer);
          timer = setTimeout(() => {
            fn.apply(this, args);
          }, delay);
        };
      };
      
      const getCardNumber = (() => {
        let timer = null; 
        
        return (e) => {
          if (timer) clearTimeout(timer);
          timer = setTimeout(() => {
            setCardNumber(e);
            queryData({ cardNumber: e, anxinyunStructureId: structId, status });
          }, 1000);
        };
      })();
    return <Spin spinning={loading} tip="加载中...">
        <div className="card-container">
            <div className="card-manage">
                <Card style={{
                    height:234
                }}>
                    <div className="manage-top">
                    <div style={{ width: 0, height: 20, borderLeft: '3px solid #005ABD', borderTop: '3px solid transparent', borderBottom: '3px solid transparent' }}></div>
                  <div style={{ fontFamily: "YouSheBiaoTiHei", fontSize: 24, color: '#101531', marginLeft: 8 }}>网卡管理</div>
                  <div style={{ marginLeft: 6, fontSize: 12, color: '#969799', fontFamily: "DINExp", }}>NETWORKCARD MANAGEMENT</div>
                    
                    </div>

                    <div className="manage-content">
                    {manageCard.map((i,index)=>{
                  return  <div key={index} style={{  
                    backgroundImage: `url(/assets/images/cardManage/${i.picture})`, 
                    width: '270px',  
                    height: '134px',  
                    backgroundSize: 'cover',  
                    backgroundRepeat: 'no-repeat',  
                  
                  }}   className="content-item">
                      <div className="image-content">
                      <div className="title">{i.name}</div>
                      <div className="count">{i.count}</div>
                     </div> 
                    </div>
                    })}                 
                     
                    </div>
                </Card>
                
            </div>
            <div className="card-table">
                <Card className='card2'>
                    <div className="center-contaier">
                        <div className="btn" style={{fontSize:14}}>
                        <Button theme='solid' type='primary' onClick={()=>{setBathImportModalVis(true)}}> <img style={{width:12,height:12,marginRight:8}} src="/assets/images/cardManage/exports.png" alt="" />批量导入</Button>
                        {/* <Button  theme='solid' type='primary' style={{marginLeft:20}} onClick={()=>addTableContent()}>新增</Button> */}
                        </div>                
                    <div className="search" style={{ marginRight: 20, display: 'flex', alignItems: 'center' }}>
                     <Form ref={form} layout='horizontal'  style={{ position: "relative", width: "100%", flex: 1, display: 'flex', margin: "16px 0" }}>
                        <Form.Input 
                        // allowClear 
                        labelPosition="left" 
                        field='cardNumber' 
                        label={{ text: '卡号 :' }} 
                        // remote 
                        // filter
                        value={cardNumber}
                        // onChange={getCardNumber} 
                        style={{width:280}} 
                        onChange={getCardNumber}
                        placeholder='请输入物联网卡号'>

                        </Form.Input>
                        <Form.Select onChange={getStatus} allowClear labelPosition="left" field='state' placeholder="请选择状态类型" label={{ text: '状态 :' }} style={{ width: 208 }}>
                        <Option value="0">正常</Option>
                        <Option value="1">未激活</Option>
                        <Option value="2">停机</Option>
                        <Option value="3">僵尸卡</Option>

                        </Form.Select>
                        <Form.Select filter={true} onChange={getStru} allowClear labelPosition="left" field='UserName' options={struct} placeholder="请输入结构物名称" label='结构物名称 :' style={{ width: 260 }}></Form.Select>
                     </Form>
                    </div>
                    </div>
                    <Table columns={columns} dataSource={tableCard} pagination={true} scroll={scroll}></Table>
                    {/* <CardModal addOrUpdateCard={addOrUpdateCard}></CardModal> */}
                    <CardModal showModal={showModal } addSuccess={addSuccess} closes={closes}  recordRow={recordRow} onClose={queryData}></CardModal>
                </Card>
            </div>
        </div>
        {bathImportModalVis && <BatchImportModal  open={bathImportModalVis} onClose={() => { setBathImportModalVis(false);queryData();clearChoose() }}></BatchImportModal>}
    </Spin>
}
function mapStateToProps (state) {
    const { auth, global,getCardList } = state;
    return {
       user: auth.user,
       actions: global.actions,
        loading:getCardList?.isRequesting
    };
 }

export default  connect(mapStateToProps)(InterCard);