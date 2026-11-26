import React, { useState, useRef, useEffect } from "react";
import { connect } from "react-redux";
import { Modal, Table, Pagination, Spin, Tooltip, Button } from 'antd';
import { ExportData } from '$components'
import '../style.less'

function anomalePointModal (props) {
    const { projectData, visible, cancel, dispatch, actions } = props;
    const { install } = actions;
    const [loading, setLoading] = useState(true);
    const [query, setQuery] = useState({ limit: 10, page: 0 }); //页码信息
    const [total, setTotal] = useState(3)//总页数
    const [initData, setInitData] = useState([])//初始数据
    // 分页数据
    const [abnormalPointData, setAnomalePointData] = useState([])

    useEffect(async () => {
        let data = { projectId: projectData?.id }


        dispatch(install.AbnormalPointList(data)).then((res) => {
            console.log('异常点位数据', res?.payload?.data?.abnormalPoint)
            setInitData(res?.payload?.data?.abnormalPoint)
            setTotal(res?.payload?.data?.abnormalPoint?.length)
            setAnomalePointData(res?.payload?.data?.abnormalPoint.slice(query.page * query.limit, (query.page + 1) * query.limit))
            setLoading(false)
        });
    }, [])
    const changePage = (page, limit) => {
        setAnomalePointData(initData.slice(page * limit, (page + 1) * limit))
    }

    const columns = [
        {
            title: '结构物名称',
            dataIndex: 'strucName',
            key: 'strucName',
            render: (text) => (
                <Tooltip content={text} >{text.length > 8 ? `${text.slice(0, 8)}...` : text}</Tooltip>
            ),
        },
        {
            title: '点位名称',
            dataIndex: 'sensorName',
            key: 'sensorName',
            // render: (text) => (

            // )
        },
        {
            title: '中断时间',
            dataIndex: 'collectTime',
            key: 'collectTime',
        },
        {
            title: '异常类型',
            dataIndex: 'abnormalType',
            key: 'abnormalType',
        },
        {
            title: '备注',
            dataIndex: 'context',
            key: 'context',
            render: (text) => (
                <Tooltip content={text} >{text.length > 15 ? `${text.slice(0, 15)}...` : text}</Tooltip>
            ),
        },

    ];

    return (<>
        <Modal
            className="anomalyModal"
            title={
                <div style={{}}>
                    <span>异常点位数据</span>
                    {
                        abnormalPointData.length ?
                            <ExportData
                                style={{ marginLeft: 24 }}
                                fileName='异常点位数据'
                                exportType='fileSaver'
                                data={initData}
                                columns={columns.map(item => ({
                                    title: item.title,
                                    dataIndex: item.dataIndex,
                                    key: item.key,
                                }))}
                                key='export'
                            /> : ''
                    }
                </div>
            }
            open={visible}
            onCancel={() => cancel()}
            width={880}
            // maxHeight={800}
            footer={
                <span>

                </span>
            }
        >

            <Spin spinning={loading}>
                {/* <div style={{overflowY:"auto",maxHeight:"800px"}}> */}
                <Table
                    columns={columns}
                    bordered={false}
                    empty="暂无数据"
                    pagination={false}
                    dataSource={abnormalPointData}
                />
                {/* </div> */}


                <div style={{ display: 'flex', marginTop: "15px", justifyContent: " flex-end" }}>
                    <span style={{ lineHeight: "30px", fontSize: 13, color: 'rgba(0,90,189,0.8)' }}>
                        共{total}条信息
                    </span>
                    <Pagination
                        className="22"
                        total={total}
                        showSizeChanger
                        current={query.page + 1}
                        pageSizeOpts={[10, 20, 30]}
                        onChange={(currentPage, pageSize) => {
                            setQuery({ limit: pageSize, page: currentPage - 1 });
                            changePage(currentPage - 1, pageSize);
                        }}
                    />
                </div>
            </Spin>
        </Modal >


    </>)
}
function mapStateToProps (state) {
    const { auth, global, members } = state;
    return {
        //   loading: members.isRequesting,
        user: auth.user,
        actions: global.actions,
        traitLabel: global.traitLabel,
    };
}

export default connect(mapStateToProps)(anomalePointModal);