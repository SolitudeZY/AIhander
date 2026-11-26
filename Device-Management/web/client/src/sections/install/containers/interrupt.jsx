'use strict';

import React, { useRef, useState, useEffect } from 'react';
import { connect } from 'react-redux';
import { Row, Col, Button, Table, Card, Popconfirm, Tag, notification, Form, Pagination } from 'antd';
import InterruptModal from '../components/interruptModal';
import '../style.less'


const Interrupt = (props) => {
    const {dispatch, abnParam,structId,factorId,actions,sensorId,project,limits,query,changeQuery,limitChange,sensorList} = props
    const form = useRef()
    const [selectedRowKeys, setSelectedRowKeys] = useState([])
    const [filterFunc, setFilterFunc] = useState({})
    const [modalVisible, setModalVisible] = useState(false)
    const [ivBatch, setIvBatch] = useState('')
    const [modalData, setModalData] = useState(null)
    const filterSet = { sensorName: null, factorName: null }
    const {install}=actions
    const onSelectChange = (selectedRowKeys) => {
        setSelectedRowKeys(selectedRowKeys);
    }
    const compareAndEdit = (e, record) => {
        setModalVisible(true)
        setModalData(record)
    }
    const modalCancel = e => {
        setModalVisible(false)
    }
    const removeItem = e => {
        dispatch(install.deleteAbnParams(e)).then(res=>{
            if(res.success){
                const id = [factorId, -1].join(',')
                changeQuery(10,0)
                dispatch(install.getAbnParamList({ factorId: id,limit:10, page: 0,type:1,
                    sensorList:sensorList?.map(i=>`${project}:${i.value}`).join(',')

                })).then(rs=>{
                    if(rs.success){
                        limitChange(rs.payload.data.count)
                    }
                })
            }
        })
    }
    const handleInputChange = e => {
        if (e!= null) {
            const value = e
            let func = (ep => (s => (s.sensorName).search(ep) > -1))(value);
            filterSet.sensorName = func
            func = (ep => (s => (s.factorName).search(ep) > -1))(value);
            filterSet.factorName = func
        } else {
            filterSet.sensorName = null
            filterSet.factorName = null
        }
        setFilterFunc(filterSet)
    }
    //批量启用or禁用
    const onSwitchChange = (e) => {
        if (selectedRowKeys.length != 0) {
            let ids = selectedRowKeys.join(',')
            let data = {
                enabled: e,
                use: 'switch'
            }
            dispatch(install.batchCfgAbnParams(ids,data)).then(res=>{
                if(res.success){
                    const id = [factorId, -1].join(',')
                    changeQuery(10,0)
                    dispatch(install.getAbnParamList({ factorId: id,limit:10, page: 0,type:1,
                        sensorList:sensorList?.map(i=>`${project}:${i.value}`).join(',')
                    },
                        
                        ),).then(rs=>{
                        if(rs.success){
                            limitChange(rs.payload.data.count)
                        }
                    })
                }
            })
       
        }
    }
    //批量删除
    const batchDelete = () => {
        if (selectedRowKeys.length != 0) {
            let ids = selectedRowKeys.join(',')
            dispatch(install.deleteAbnParams(ids)).then(res=>{
                if(res.success){
                    const id = [factorId, -1].join(',')
                    changeQuery(10,0)
                    dispatch(install.getAbnParamList({ factorId: id,limit:10, page: 0,type:1,
                        sensorList:sensorList?.map(i=>`${project}:${i.value}`).join(',')

                    })).then(rs=>{
                        if(rs.success){
                            limitChange(rs.payload.data.count)
                        }
                    })
                }
            })
        } else {
            notification.warning({
                message: '您尚未勾选任何参数配置！',
                duration: 3,
            })
        }
    }
    //批量保存
    const batchSave = () => {
        form.current.validate().then(_ => {
            let dataSource = abnParam.filter(a => a.abnType == 1 )
            if (selectedRowKeys.length != 0) {
                let ids = selectedRowKeys.join(',');
                let data = {
                    paramJson: { "thr_int": ivBatch },
                    use: 'notSwitch',
                }
                
                dispatch(install.batchCfgAbnParams(ids,data)).then(res=>{
                    if(res.success){
                        const id = [factorId, -1].join(',')
                        changeQuery(10,0)
                        dispatch(install.getAbnParamList({ factorId: id,limit:10, page:0,type:1,
                            sensorList:sensorList?.map(i=>`${project}:${i.value}`).join(',')})).then(rs=>{
                            if(rs.success){
                                limitChange(rs.payload.data.count)
                            }
                        })
                    }
                })
            } else if (dataSource.length != 0) {
                notification.warning({
                        message: '您尚未勾选任何参数配置！',
                        duration: 3,
                    })
            }
        })
    }
    const batchInterrupt = (value) => {
        setIvBatch(value)
    }
    const checkInterger = (rule, val) => {
        // if(val){
        const strRegex = /^[1-9]*[1-9][0-9]*$/
        if (strRegex.test(val)) {
            return true
        }
        return false
        // }

    };
    let dataSource = abnParam.filter(a => a.abnType == 1)
    const rowSelection = {
        selectedRowKeys: selectedRowKeys,
        onChange: onSelectChange,
    };
    let filterData = dataSource
    let flag = false
    let keyArr = []
    let tmpds = []
    let dataPush = []
    Object.keys(filterFunc).forEach(key => {
        const filter = filterFunc[key]
        filterData = dataSource
        if (filter != null) {
            flag = true
            filterData = filterData.filter(filter)
            if (filterData.length > 0) {
                filterData.map(s => {
                    if (keyArr.indexOf(s.id) == -1) {
                        keyArr.push(s.id)
                        dataPush.push(s)
                    }
                })
            }
        }
    })
    tmpds = flag ? dataPush.sort((a, b) => a.id - b.id) : dataSource.sort((a, b) => a.id - b.id);
    let columns = [
        {
            title: "测点位置",
            dataIndex: "sensorName",
            key: "stationName",
            width: '20%',
        },
        {
            title: "监测因素",
            dataIndex: "factorName",
            key: "factorName",
            width: '20%',
        },
        {
            title: "中断阈值",
            dataIndex: "params",
            key: "params",
            width: '20%',
            render: text => text.thr_int
            // render: text => {
            //     return (<Input style={{ width: 121 }} defaultValue={text.thr_int} placeholder="正整数" />)
            // }
        },
        {
            title: "启用状态",
            dataIndex: "enabled",
            key: "enabled",
            width: '20%',
            render: (text, record) => (
                record.enabled ? <Tag color="blue">已启用</Tag> : <Tag>已禁用</Tag>
            )
        },
        {
            title: "操作",
            key: "action",
            width: '20%',
            render: (text, record) => (
                <span>
                         <Button theme='borderless' type='primary' onClick={(e) => compareAndEdit(e, record)}>编辑</Button>
                    <span className="ant-divider"></span>
                    <Popconfirm title="确认删除该参数配置?" id={record.id} onConfirm={() => { removeItem(record.id) }}>
                        <Button theme='borderless' type='danger'>删除</Button>
                    </Popconfirm>
                </span>
            ),
        }
    ]

    return (<Card style={{ marginTop: 15 }}>
        <Form style={{ marginBottom: 15 }}
            getFormApi={formApi => {
                form.current = formApi
            }}
            labelPosition='left'
        >
            <Row style={{ display: 'flex',alignItems:'center'}}>
                <Col span={5}>
                    <Form.Input field='keywords' noLabel={true} style={{ marginBottom: 0, width: '95%' }} placeholder="关键词：测点位置、监测因素" onChange={handleInputChange}>
                    </Form.Input>
                </Col>
                <Col span={2}>
                    <Form.Switch      label='批量启用'  field='switch' style={{ marginBottom: 0 }}  checked onChange={onSwitchChange}>
                    </Form.Switch>
                </Col>
                <Col span={3}>
                    <Form.Input field='iv' noLabel={true} style={{ marginBottom: 0, width: '93%' }}
                        rules={[{
                            required: true, message: "请输入正整数", validator: checkInterger
                        }]} trigger='blur'
                        onChange={e => batchInterrupt(e)} placeholder="中断阈值：正整数">
                    </Form.Input>
                </Col>
                <Col span={2}>
                    <Button style={{ marginBottom: 0 }}  onClick={batchSave}  type='primary' theme='solid'>批量保存</Button>
                </Col>
                <Col span={2}>
                    <Popconfirm title="确认批量删除选中的参数配置?" onConfirm={batchDelete}>
                        <Button style={{ fontSize: 13 }}  theme='solid' type='danger'>批量删除</Button>
                    </Popconfirm>
                </Col>
            </Row>
        </Form>
        <Table rowSelection={rowSelection} columns={columns} dataSource={tmpds} pagination={false}/>
        <div
               style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  padding: "20px 20px",
               }}
            >
               <span style={{ lineHeight: "30px", fontSize: 13, color: 'rgba(0,90,189,0.8)' }}>
                  共{limits}条信息
               </span>
               <Pagination
                  total={limits}
                  showSizeChanger
                  current={query.page + 1}
                  pageSizeOpts={[10, 20, 30, 40]}
                  onChange={(currentPage, pageSize) => {
                    changeQuery( pageSize, currentPage - 1)
                    //  page.current = currentPage - 1
                  }}
               />
            </div>               
        {modalVisible ? <InterruptModal
            structId={structId}
            open={true}
            project={project}
            sensorId={sensorId}
            closeModal={modalCancel}
            modalData={modalData}
            factorId={factorId}
        /> : ''}
    </Card>
    )
}












function mapStateToProps(state) {
    const { abnParam,global } = state;
    // let isRequesting = abnParamState?.isRequesting;

    return {
        isRequesting: false,//请求状态
        abnParam: abnParam?.data?.rows || [],
        actions:global.actions,
    }
}
export default connect(mapStateToProps)(Interrupt)
