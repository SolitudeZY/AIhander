import React, { useEffect, useState } from 'react';
import { WarningOutlined } from '@ant-design/icons';
import { Input, Button, Popconfirm, Table } from 'antd';

const CertTabList = (props) => {
    const { data, seEditD, delCert } = props;

    // 提取表格列配置为独立变量
    const columns = [
        {
            title: '序号',
            dataIndex: 'index',
            render: (text, record, index) => index + 1
        },
        {
            title: '证书名称',
            dataIndex: 'name'
        },
        {
            title: '开始日期',
            dataIndex: 'dayStart'
        },
        {
            title: '过期时间',
            dataIndex: 'dayEnd'
        },
        {
            title: '所属项目',
            dataIndex: 'project'
        },
        {
            title: '剩余天数',
            dataIndex: 'remain',
            render: (text, record, index) => record.remain > 0 ? record.remain + '天' : '已过期',
            sorter: (a, b) => (a.remain - b.remain > 0 ? 1 : -1)
        },
        {
            title: '操作',
            dataIndex: '',
            render: (text, record, index) => (
                <Button>
                    <Button type='primary' onClick={() => seEditD(record)}>
                        编辑
                    </Button>
                    <Popconfirm
                        title="确定要删除此配置？"
                        content="此操作将不可逆"
                        icon={<WarningOutlined style={{ color: 'var(--semi-color-warning)' }} size="extra-large" />}
                        onConfirm={() => {
                            delCert({ id: record.id })
                        }}
                        onCancel={() => { }
                        }
                    >
                        <Button type='danger'>
                            删除
                        </Button>
                    </Popconfirm>
                </Button>
            )
        }
    ];

    return (
        <div>
            <Table columns={columns} dataSource={data} />
        </div>
    );
};

export default CertTabList;