import React, { useEffect, useState, useRef, useMemo } from 'react';
import { connect } from 'react-redux';
import CardTitle from './cardTitle';
import { Select, Button, Table, Input, Modal } from 'antd';
import { DownOutlined } from '@ant-design/icons';
import Battery from './battery';
import MapModal from './mapModal';
import './detailStyle.less'
const DetailFullModal = (props) => {
    const {
        fullScreenVis,
        onCancelFullScreen,
        data,
        columns,
        optList,
        projectOpt,
        inputVal,
        structId,
        projectId,
        structChangeHandler,
        searchHandler,
        projectOptClear,
        clearOpt,
        projectChangeHandler,
        inputChange
    }=props
    const [mapModalVis, setMapModalVis] = useState(false)
    const [longitudeAndLatitude, setLongitudeAndLatitude] = useState([])//经纬度
    const [recordData, setRecordData] = useState([])
    const [power, setPower] = useState('')//电量
    // const [inputVal, setInputVal] = useState(undefined)
    const [record, setRecord] = useState({})
    // const [structId, setStructId] = useState(undefined)
    const loadMapHandler = (record) => {
        setMapModalVis(true)
        setRecord(record)
        setPower(record.Data )
        // setLongitudeAndLatitude([record.longitude,record.latitude])
    }
    const onCancel = () => {
        setMapModalVis(false)
    }
    // useEffect(() => {
    //     if (structId) {
    //         const dataList = data?.filter(item => item.structureId == structId)
    //         setRecordData(dataList)
    //     }
    // }, [structId])
    // const structChangeHandler = (id) => {
    //     setStructId(id)
    // }
    // const searchHandler = () => {
    //     if (inputVal&&structId) {
    //         const dataList = data?.filter(item => item.deviceName.indexOf(inputVal) > -1 && item.structureId == structId)
    //         setRecordData(dataList)
    //     } else if(inputVal){
    //         const dataList = data?.filter(item => item.deviceName.indexOf(inputVal) > -1)
    //         setRecordData(dataList)
    //     }else if(structId){
    //         const dataList = data?.filter(item => item.structureId == structId)
    //         setRecordData(dataList)
    //     }else{
    //         setRecordData(data) 
    //     }
    // }
    // const clearOpt = () => {
    //     let dataList = []
    //     if (inputVal) {

    //         dataList = data?.filter(item => item.deviceName.indexOf(inputVal) > -1)
    //     } else {
    //         dataList = data
    //     }
    //     setRecordData(dataList)
    // }
    useEffect(() => {
        if(data&&data.length){
            setRecordData(data?.map(item=>({...item,data:item.Data})))
        }else{
            setRecordData([])
        }

    }, [data])
    return (
        <Modal 
            open={fullScreenVis}
            onCancelFullScreen={onCancelFullScreen}
            fullScreen
            closable={false}
            footer={null}
        >
        <div style={{width:'100%',height:'100%',background:'#fff'}} id='fullScreen'>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <CardTitle englishName='DETAIL OF POINTS' chineseName='点位详情'>
                </CardTitle>
                <div style={{ display: 'flex', margin: '10px 10px 0 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} >
                        <a className='full-screen' onClick={onCancelFullScreen}>{'退出全屏'}</a>
                        <Select allowClear onClear={projectOptClear} style={{ width: 200,marginRight:10 }} placeholder='请选择项目' filter
                            value={projectId} options={projectOpt} onChange={projectChangeHandler}></Select>
                        <Select allowClear onClear={clearOpt} style={{ width: 200 }} placeholder='请选择结构物'
                        filter
                            value={structId} options={optList} onChange={structChangeHandler}></Select>
                        <Input placeholder='请输入设备名称' style={{ width: 200,marginLeft:10 }} value={inputVal} onChange={inputChange}></Input>
                        <Button theme="solid" type='primary' onClick={searchHandler} style={{marginLeft:10}}>查询</Button>
                    </div>
                </div>
            </div>

            <div className='detail-content' id='detail-content'>
                <Table columns={columns}
                    dataSource={recordData}
                ></Table>
            </div>
            {mapModalVis && <MapModal
                record={record}
                power={power}
                onCancel={onCancel}
                mapModalVis={mapModalVis} l
                ongitudeAndLatitude={longitudeAndLatitude} />}


        </div>
        </Modal>
    )
}

function mapStateToProps(state) {
    const { } = state;
    return {

    };
}

export default connect(mapStateToProps)(DetailFullModal);
