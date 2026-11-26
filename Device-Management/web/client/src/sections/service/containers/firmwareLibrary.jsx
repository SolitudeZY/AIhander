import React, { useEffect, useState } from 'react';
import { connect } from 'react-redux';
import { Button, Table, Popconfirm, Pagination, Input, message } from 'antd';
import moment from 'moment'
import AddFirmwareModal from '../components/addFirmwareModal'



const FirmwareLibrary = (props) => {
    const { actions, dispatch } = props
    const [modalVis, setModalVis] = useState(false)//添加固件弹框的显示与隐藏
    const [recordRow, setRecordRow] = useState()
    const [data, setData] = useState([])//列表数据
    const [searchVal, setSearchVal] = useState('')//存储搜索框的值
    const [users, setUsers] = useState([])//所有用户信息
    const { service } = actions
    const getData = (query) => {
        dispatch(service.getFirmware(query)).then(res => {
            if (res.success) setData(res.payload.data.data)
        })
    }
    useEffect(() => {
        //获得已上传的固件列表
        getData()
        //用户信息
        dispatch(service.getOrganizationUsers()).then(res => {
            setUsers(res.payload.data)
        })
    }, [])

    const searchHandler = () => {
        const query = { version: searchVal }
        getData(query)

    }
    const onConfirm = (record) => {
        const query = { version: record?.versionNo, device_meta_id: record?.device_meta_id, tokenup: 'REPLACE_WITH_FIRMWARE_OPERATION_TOKEN' }
        dispatch(service.deleteFirmware(query)).then(res => {
            if (res.success) {
                getData()
                // message.success('删除成功');

            }

        })
    };

    const onCancel = () => {
        message.warning('取消删除');
    };
    let columns = [{
        title: '序号',
        render: (t, r, i) => {
            return i + 1;
        }
    }, {
        title: '固件名称',
        dataIndex: 'firmwareName'
    }, {
        title: '设备型号',
        dataIndex: 'deviceMetaName'
    },
    {
        title: '版本号',
        dataIndex: 'versionNo'
    },
    {
        title: '上传时间',
        dataIndex: 'uploadTime'
    },
    {
        title: '上传人',
        render: (_, record) => {
            return <span>{users?.find(item => item.id == record.uploader)?.name || ''}</span>
        }
    },
    {
        title: '备注',
        dataIndex: 'comment'
    },
    {
        title: '操作',
        render: (_, record) => {
            return <div> <Popconfirm
                title="确定是否要删除？"
                onConfirm={() => onConfirm(record)}
                onCancel={onCancel}
            >
                <Button type="danger" theme='light'>删除</Button>
            </Popconfirm>
                <Button type="secondary" theme='solid' onClick={() => {
                    setModalVis(true);
                    setRecordRow(record)
                }}>编辑</Button>
            </div>
        }
    }




    ]
    return <><div style={{ background: '#FFFFFF', margin: '8px 12px', padding: '20px 20px 0px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginRight: 30 }}>
                <div style={{ width: 0, height: 20, borderLeft: '3px solid #005ABD', borderTop: '3px solid transparent', borderBottom: '3px solid transparent' }}></div>
                <div style={{ fontFamily: "YouSheBiaoTiHei", fontSize: 24, color: '#101531', marginLeft: 8 }}>固件库</div>
                <div style={{ marginLeft: 6, fontSize: 12, color: '#969799', fontFamily: "DINExp", }}>Firmware Library</div>
            </div>
            <Input placeholder='请输入名称版本号' style={{ width: 300, marginRight: 10 }} onChange={(e) => { setSearchVal(e) }}></Input>
            <Button style={{ marginRight: 10 }} type="secondary" theme='solid' onClick={searchHandler}>查询</Button>
            <Button type="secondary" theme='solid' onClick={() => { setModalVis(true) }}>上传</Button>
        </div>
        <div style={{ marginTop: 10 }}>
            <Table columns={columns} pagination dataSource={data} ></Table>
            <AddFirmwareModal modalVis={modalVis} recordRow={recordRow} onCancel={() => { getData({ version: searchVal }); setModalVis(false); setRecordRow(null) }}></AddFirmwareModal>
        </div>
    </div>
    </>


}

function mapStateToProps (state) {
    const { auth, global, getPush } = state;
    return {
        loading: getPush.isRequesting,
        user: auth.user,
        actions: global.actions,
    };
}

export default connect(mapStateToProps)(FirmwareLibrary);