import React, { useEffect, useState, useRef, useMemo } from 'react';
import { connect } from 'react-redux';
import { Modal, Table } from 'antd';
import { ClearOutlined } from '@ant-design/icons';

import CardTitle from './cardTitle';
const RateModal = (props) => {
    const { rateModalVis, onCancel, data } = props
    const columns = [
        {
            title: '地区',
            dataIndex: 'projectName',
            key: 'area',
            ellipsis: true
        },
        {
            title: '滑坡仪总数',
            key: 'huapoyiCount',
            ellipsis: true,
            render: (_, record) => <span>{record.huapoyiCount}</span>
        },
        {
            title: '滑坡仪在线率',
            key: 'huapoyiRate',
            ellipsis: true,
            //比例保留两位小数
            render: (_, record) => <span>{Math.round(record.huapoyiOnlineCount / record.huapoyiCount * 100 *100) / 100 || 0 }%</span>
        },
        {
            title: '设备总数',
            dataIndex: 'total',
            key: 'total',
            ellipsis: true,
        },
        {
            title: '设备在线率',
            key: 'rate',
            ellipsis: true,
            //比例保留两位小数
            render: (_, record) => <span>{Math.round(record.deviceOnline / record.deviceTotal * 100 *100) / 100 || 0 }%</span>
        },
        {
            title: '传感器总数',
            key: 'sensorCount',
            ellipsis: true,
            render: (_, record) => <span>{record.sensor}</span>
        },
        {
            title: '传感器在线率',
            key: 'sensorOnlineRate',
            ellipsis: true,
            //比例保留两位小数
            render: (_, record) => <span>{Math.round(record.sensorOnline / record.sensor * 100 *100) / 100 || 0}%</span>
        },
     
       
    ]

    const scroll = useMemo(() => ({ y: 300, }), []);

    return (
        <>
            <div style={{ position: 'relative' }}>
                <Modal open={rateModalVis}
                    footer={null}
                    closeIcon={<ClearOutlined style={{ color: '#005ABD' }} />}
                    onCancel={onCancel}
                    style={{ position: 'absolute', top: 387, left: 517, width: 1000 }}
                >
                    <CardTitle chineseName='地灾在线率' englishName='ONLINE DISASTER RATE' />
                    <div style={{ height: 10 }}></div>
                    <Table columns={columns}
                        dataSource={data}
                        pagination={false}
                        scroll={scroll}
                    ></Table>
                </Modal>
            </div>
        </>
    )
}

function mapStateToProps (state) {
    const { } = state;
    return {

    };
}

export default connect(mapStateToProps)(RateModal);
