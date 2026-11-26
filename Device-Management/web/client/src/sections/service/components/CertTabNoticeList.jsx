import React, { useEffect, useState } from 'react';
import { WarningOutlined } from '@ant-design/icons';
import { Button, Popconfirm, Table } from 'antd';

const CertTabNoticeList = (props) => {
    const { data, seEditD, delNotice, certList, allPepUsers } = props

    return (
        <div>
            <Table
                columns={[{
                    title: '序号',
                    dataIndex: 'index',
                    render (text, record, index) {
                        return index + 1
                    }
                }, {
                    title: '项目名称',
                    dataIndex: 'pn',
                    render: (text, record, index) => {
                        record.project = [...new Set(certList.filter(item => record.certIds?.includes(item.id)).map(c => c.project))]
                        return record.project.join('、')
                    }
                }, {
                    title: '证书名称',
                    dataIndex: 'cn',
                    render: (text, record, index) => {
                        return certList.filter(item => record.certIds?.includes(item.id)).map(c => c.name).join('、')
                    }
                }, {
                    title: '提前提醒天数',
                    dataIndex: 'remain',
                }, {
                    title: '提醒人',
                    dataIndex: 'user',
                    render: (text, record, index) => {
                        return allPepUsers.filter(item => record.noticeUsers?.includes(item.id)).map(c => c.name).join('、')
                    }
                }, {
                    title: '操作',
                    dataIndex: 'op',
                    render: (text, record, index) => {
                        return (
                            <Button>
                                <Button type='primary' onClick={() => seEditD(record)}>
                                    编辑
                                </Button>
                                <Popconfirm
                                    title="确定要删除此配置？"
                                    content="此操作将不可逆"
                                    icon={<WarningOutlined style={{ color: 'var(--semi-color-warning)' }} size="extra-large" />}
                                    onConfirm={() => {
                                        delNotice({ id: record.id })
                                    }}
                                    onCancel={() => { }}
                                >
                                    <Button type='danger'>
                                        删除
                                    </Button>
                                </Popconfirm>
                            </Button>
                        )
                    }
                },]}
                dataSource={data}
            />
        </div>
    )
}

export default CertTabNoticeList