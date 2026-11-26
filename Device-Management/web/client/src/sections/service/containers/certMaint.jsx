import React, { useEffect, useState, useRef, forwardRef } from 'react';
import { connect } from 'react-redux';
import { SearchOutlined } from '@ant-design/icons';
import { Input, Space, Button, Tabs, Spin } from 'antd';
import CertTabList from '../components/certTabList';
import CertTabNoticeList from '../components/CertTabNoticeList.jsx';
import CertModal from '../components/certModal';
import CertNoticeModal from '../components/certNoticeModal';

const CertMaint = (props) => {
    const { dispatch, actions, allPepUsers, certList, certNoticeList } = props
    const certModalR = useRef()
    const certNoticeModal = useRef()
    const [query, setQuery] = useState({})
    const [certEditD, setCertEditD] = useState()
    const [certNoticeEditD, setCertNoticeEditD] = useState()
    const [optioning, setOptioning] = useState(false)
    const [curTabKey, setCurTabKey] = useState('cert')
    const { service } = actions

    const initTable = () => {
        dispatch(service.getCert(query))
    }

    const initTableNotice = () => {
        dispatch(service.getCertNotice(query))
    }

    useEffect(() => {
        if (!allPepUsers?.data?.length) {
            dispatch(service.getOrganizationUsers())
        }
        initTable()
        initTableNotice()
    }, [])

    const clearEditD = () => {
        setCertEditD()
        setCertNoticeEditD()
    }

    const delCert = (query) => {
        setOptioning(true)
        dispatch(service.delCert(query)).then(res => {
            if (res.success) {
                initTable()
            }
            setOptioning(false)
        })
    }

    const delCertNotice = (query) => {
        setOptioning(true)
        dispatch(service.delCertNotice(query)).then(res => {
            if (res.success) {
                initTableNotice()
            }
            setOptioning(false)
        })
    }

    useEffect(() => {
        if (certEditD) {
            certModalR?.current?.toggle()
        }
    }, [certEditD])

    useEffect(() => {
        if (certNoticeEditD) {
            certNoticeModal?.current?.toggle()
        }
    }, [certNoticeEditD])

    return (
        <div style={{ background: '#FFFFFF', padding: '12px 12px 12px 12px', minHeight: 'calc(100vh - 75px)' }}>
            <div style={{ display: 'flex', marginTop: 20, alignItems: 'flex-end' }}>
                <div style={{ display: 'flex', alignItems: 'center', marginRight: 20 }}>
                    <div style={{ width: 0, height: 20, borderLeft: '3px solid #005ABD', borderTop: '3px solid transparent', borderBottom: '3px solid transparent' }}></div>
                    <div style={{ fontFamily: "YouSheBiaoTiHei", fontSize: 24, color: '#101531', marginLeft: 8 }}>证书维护</div>
                </div>
                <div style={{}}>
                    <Space>
                        <Input prefix={<SearchOutlined />} onChange={v => {
                            setQuery({ ...query, keyword: v })
                        }} />
                        <Button onClick={() => {
                            if (curTabKey === 'cert') {
                                initTable()
                            } else {
                                initTableNotice()
                            }
                        }} style={{ marginRight: 12 }}>查询</Button>
                        <Button onClick={() => certModalR?.current?.toggle()}>新增证书</Button>
                        <Button onClick={() => certNoticeModal?.current?.toggle()} loading={allPepUsers?.isRequesting}>设置到期提醒</Button>
                    </Space>
                </div>
            </div>
            <div>
                <Tabs 
                    activeKey={curTabKey} 
                    onChange={(k) => {
                        setCurTabKey(k)
                    }}
                    items={[
                        {
                            key: "cert",
                            label: "证书列表",
                            children: (
                                <Spin spinning={optioning || certList?.isRequesting}>
                                    <CertTabList data={certList?.data ?? []} seEditD={setCertEditD} delCert={delCert} />
                                </Spin>
                            )
                        },
                        {
                            key: "notice",
                            label: "提醒列表",
                            children: (
                                <Spin spinning={optioning || certNoticeList?.isRequesting}>
                                    <CertTabNoticeList key={Math.random()} data={certNoticeList?.data ?? []} seEditD={setCertNoticeEditD} delNotice={delCertNotice} certList={certList?.data ?? []} allPepUsers={allPepUsers?.data ?? []} />
                                </Spin>
                            )
                        }
                    ]}
                />
            </div>
            <CertModal ref={certModalR} dispatch={dispatch} actions={actions} initTable={initTable} editD={certEditD} clearEditD={clearEditD} />
            <CertNoticeModal ref={certNoticeModal} allPepUsers={allPepUsers?.data ?? []} dispatch={dispatch} actions={actions} initTable={initTableNotice} editD={certNoticeEditD} clearEditD={clearEditD} certList={certList?.data ?? []} />
        </div>
    )
}

function mapStateToProps (state) {

    return {
        actions: state.global.actions,
        allPepUsers: state.allPepUsers,
        certList: state.certList,
        certNoticeList: state.certNoticeList
    };
}

export default connect(mapStateToProps)(CertMaint);