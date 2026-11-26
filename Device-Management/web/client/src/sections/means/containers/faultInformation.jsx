import React, { useEffect, useState, useMemo } from 'react';
import { connect } from 'react-redux';
import { Input, Button, Tree, Modal, Table, Upload, Pagination, Popconfirm } from 'antd';
import { DeleteOutlined, EditOutlined, UploadOutlined, ExclamationCircleOutlined, SearchOutlined } from '@ant-design/icons';
import SimpleBar from 'simplebar-react';
import PerfectScrollbar from "perfect-scrollbar";
import FileModal from '../components/fileModal';
import moment from 'moment';
import './style.less'


let itemList
let folderList
let tableList
const Rest = (props) => {
    const { dispatch, actions, user, qiniu, loading, clientHeight, overallProjectId, apiRoot } = props
    const { install, means } = actions
    const [pomsList, setPomsList] = useState([]);  //项目
    const [showPomsList, setShowPomsList] = useState([]);  //项目
    const [pepProjectId, setPepProjectId] = useState()  //项目id
    const [projectSearch, setProjectSearch] = useState()  //项目搜索
    const [isFileModal, setIsFileModal] = useState(false)   //添加文件弹窗
    const [editData, setEditData] = useState({})  //编辑参数
    const [treeData, settreeData] = useState([]); //文件夹列表
    const [higherFile, setHigherFile] = useState([]); //上级文件夹
    const [fileId, setFileId] = useState(); //文件夹id
    const [uploadModal, setUploadModal] = useState(false)  //上传弹窗
    const [uploadData, setUploadData] = useState({})
    const [dataSource, setDataSource] = useState([])  //表格数据
    const [query, setQuery] = useState({ limit: 10, page: 0 })
    const [count, setCount] = useState(0)
    const [videoModalV, setVideoModalV] = useState(false);
    const [videoUrl, setvideoUrl] = useState(null);
    const [hint, setHint] = useState(false);
    const [fileSearch, setFileSearch] = useState([])  //文件搜索



    useEffect(() => {
        dispatch(install.getProjectPoms({ global: 1 })).then((res => {
            if (res.success) {
                let data = res.payload.data?.rows?.filter(v => v.pepProjectIsDelete !== 1)?.map(v => ({ pepProjectId: v.id, pepProjectName: v.pepProjectName || v.name }))
                setPomsList(data)
                setShowPomsList(data)
            }
        }))
        // setPepProjectId(data[0]?.pepProjectId)
        fileList(null)

        const domItem = document.getElementById("itemList");
        if (domItem) {
            itemList = new PerfectScrollbar("#itemList", {
                suppressScrollX: true,
            });
        }
        const domFolder = document.getElementById("folderList");
        if (domFolder) {
            folderList = new PerfectScrollbar("#folderList", {
                suppressScrollX: true,
            });
        }
        const domTable = document.getElementById("tableList");
        if (domTable) {
            tableList = new PerfectScrollbar("#tableList", {
                suppressScrollX: true,
            });
        }
    }, [])

    useEffect(() => {
        const domItem = document.getElementById("itemList");
        if (domItem && itemList) {
            itemList.update();
        }
        const domFolder = document.getElementById("folderList");
        if (domFolder && folderList) {
            folderList.update();
        }
        const domTable = document.getElementById("tableList");
        if (domTable && tableList) {
            tableList.update();
        }
    })

    useEffect(() => {
        let data
        if (overallProjectId) {
            data = pomsList?.filter(v => (v.pepProjectName?.indexOf(projectSearch) != -1 && v.pepProjectId == overallProjectId))
        } else {
            data = pomsList?.filter(v => v.pepProjectName?.indexOf(projectSearch) != -1)
        }
        setShowPomsList(data)
        setPepProjectId(data[0]?.pepProjectId || null)
        fileList(data[0]?.pepProjectId || null)
        setDataSource([])
        setFileId('')
        setFileSearch('')
    }, [projectSearch])

    useEffect(() => {
        setProjectSearch('')
        let data
        if (overallProjectId) {
            data = pomsList?.filter(v => v.pepProjectId == overallProjectId)
        } else {
            data = pomsList
        }
        setShowPomsList(data)
        setPepProjectId(data[0]?.pepProjectId || null)
        fileList(data[0]?.pepProjectId || null)
        setDataSource([])
        setFileId('')
        setFileSearch('')
    }, [overallProjectId])

    useEffect(() => {
        if (fileId) {
            filfolderFileListe()
            setQuery({ limit: 10, page: 0 })
            setFileSearch('')
        }
    }, [fileId])

    const fileList = (id) => {

        dispatch(means.fileList({ projectId: id, type: 3 })).then((res => {
            if (res.success) {
                let data = res.payload.data
                let oneLevel = res.payload.data?.filter(f => !f.higherFileId) || []
                setHigherFile(data?.map(d => ({ name: d.fileName, value: d.id })))
                dispatch(means.folderFileList({ fileId: JSON.stringify(data?.map(d => d.id)) })).then((s => {
                    if (s.success) {
                        // setFileLists(s.payload.data?.rows)
                        settreeData(listErgodic(oneLevel, data, s.payload.data?.rows))
                    }
                }))
            }
        }))
    }



    const filfolderFileListe = (params) => {
        let fileIds = []
        const treeDataList = (data, value) => {
            data?.map(c => {
                if (c.key == fileId || value) {
                    fileIds.push(c.key)
                    if (c.children?.length) {
                        treeDataList(c.children, true)
                    }
                } else if (c.children?.length) {
                    treeDataList(c.children)
                }
            })
        }
        treeDataList(treeData)
        let datas = params || query
        dispatch(means.folderFileList({ keyword: fileSearch, fileId: JSON.stringify(fileIds), ...datas, })).then((res => {
            if (res.success) {
                setDataSource(res.payload.data?.rows || [])
                setCount(res.payload.data?.count)
            }
        }))
    }

    const listErgodic = (level, datas, lists) => {
        let data = []
        level.map(async v => {
            let list = {
                value: v.id,
                key: v.id,
            }
            let childrenList = datas?.filter(c => c.higherFileId == list.value)
            if (childrenList?.length) {
                list.children = listErgodic(childrenList, datas, lists)
            }
            let fileData = lists?.filter(d => d.fileId == v.id)?.length
            list.label = <div className='dd' title={v.fileName} style={{ width: '100%', display: 'flex', }}>
                <div style={{ width: '100%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{v.fileName}</div>
                <EditOutlined className='tip' style={{ color: '#827777c7' }} onClick={() => {
                    setIsFileModal(true)
                    setEditData({ id: v.id, fileName: v.fileName, higherFileId: v.higherFileId })
                }} />
                <Popconfirm
                    title={(fileData || list?.children?.length) ? '请删除该文件下的文件或文件夹' : "是否确认删除文件夹？"}
                    onConfirm={() => {
                        if (!fileData && !list?.children?.length) {
                            dispatch(means.delFile(v.id)).then((res => {
                                if (res.success) {
                                    fileList(v.projectId || null)
                                }
                            }))
                        }
                    }}
                // onCancel={onCancel}
                >
                    <DeleteOutlined className='tip' style={{ margin: '0 8px', color: '#827777c7' }} />
                </Popconfirm>

            </div>

            data.push(list)
        })
        return data
    }


    const column = [
        {
            title: '文件名',
            dataIndex: 'name',
            key: 'name',
            render: (text) => text?.length > 30 ? <div title={text}>{text.slice(0, 30)}...</div> : text
        },
        {
            title: '文件大小',
            dataIndex: 'size',
            key: 'size',
            render: (text) => {
                let show = '--'
                if (text < 1048576) {
                    show = (text / 1024).toFixed(1) + ' KB'
                } else {
                    show = (text / 1048576).toFixed(1) + ' MB'
                }
                return show
            }
        },
        {
            title: '上传时间',
            dataIndex: 'uploadTime',
            key: 'uploadTime',
            render: (text) => text ? moment(text).format("YYYY-MM-DD HH:mm:ss") : '--'
        },
        {
            title: '操作',
            key: 'operation',
            dataIndex: 'operation',
            render: (_, r) => {
                return <div style={{ minWidth: 174 }}>
                    <Button theme='borderless' type='primary' style={{ marginRight: 8 }} ><a href={`/_file-server/${r.url + '?filename=' + encodeURIComponent(r.name)}`}>
                        下载
                    </a></Button>
                    <Popconfirm
                        title="是否确认删除文件？"
                        // content="此修改将不可逆"
                        onConfirm={() => {
                            dispatch(means.delfolderFile(r.id)).then((res => {
                                if (res.success) {
                                    filfolderFileListe({ limit: 10, page: 0 })
                                    setQuery({ limit: 10, page: 0 })
                                }
                            }))
                        }}
                    // onCancel={onCancel}
                    >
                        <Button theme='borderless' type='danger' >删除</Button>
                    </Popconfirm>
                    {(r.url?.indexOf("txt") !== -1 || r.url?.indexOf("rar") !== -1 || r.url?.indexOf("zip") !== -1) ? ""
                        : <Button theme='borderless' type='primary' style={{ marginRight: 8 }} onClick={() => {
                            preview(r.url)
                        }}>
                            预览
                        </Button>

                    }



                </div>
            }
        },
    ]
    const data = [
        {
            key: '1',
            name: 'John Brown',
            age: 32,
            address: 'New York No. 1 Lake Park',
            tags: ['nice', 'developer'],
        },
        {
            key: '2',
            name: 'Jim Green',
            age: 42,
            address: 'London No. 1 Lake Park',
            tags: ['loser'],
        },
        {
            key: '3',
            name: 'Joe Black',
            age: 32,
            address: 'Sydney No. 1 Lake Park',
            tags: ['cool', 'teacher'],
        },
    ];

    const preview = (url) => {
        let link = encodeURI(`${qiniu}/${url}`)
        if (url.indexOf("pdf") !== -1) {
            window.open(link)
        } else if (url.indexOf("png") !== -1 || url.indexOf("jpg") !== -1) {
            setVideoModalV(true)
            setvideoUrl(link)
        } else {
            window.open(`https://view.officeapps.live.com/op/view.aspx?src=${link}`)
        }
    }

    return (
        // <div>
        <div style={{ width: '100%', height: clientHeight - 72, display: 'flex', }}>

            <div style={{ width: 200, height: '100%', padding: '16px 10px', boxShadow: '0 0 4px 2px #0000000d' }}>
                <Input placeholder='请输入项目名称' value={projectSearch} onChange={v => setProjectSearch(v)} />
                {/* <SimpleBar style={{ height: 'calc(100% - 24px', }} forceVisible="y"  > */}
                <div id='itemList' style={{ height: 'calc(100% - 24px', }}>

                    <div style={{ cursor: 'pointer', background: pepProjectId == null ? 'rgb(15 126 251 / 16%)' : '', width: 180, height: 30, display: 'flex', alignItems: 'center' }}
                        onClick={() => {
                            setPepProjectId(null)
                            fileList(null)
                            setDataSource([])
                            setFileId('')
                        }}>
                        <img src="/assets/images/icon/project-icon.png" style={{ width: 14, marginRight: 8 }} />
                        <div style={{ fontSize: 14, width: 152, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>项目通用</div>
                    </div>
                    {showPomsList?.map(v => {
                        return <div key={'pepProjectId' + v.pepProjectId} title={v.pepProjectName} style={{ cursor: 'pointer', background: v.pepProjectId == pepProjectId ? 'rgb(15 126 251 / 16%)' : '', width: 180, height: 30, display: 'flex', alignItems: 'center' }}
                            onClick={() => {
                                setPepProjectId(v.pepProjectId)
                                fileList(v.pepProjectId)
                                setDataSource([])
                                setFileId('')
                            }}>
                            <img src="/assets/images/icon/project-icon.png" style={{ width: 14, marginRight: 8 }} />
                            <div style={{ fontSize: 14, width: 152, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}> {v.pepProjectName}</div>

                        </div>
                    })}
                    {/* </SimpleBar> */}
                </div>
            </div>

            <div style={{ height: '100%', display: 'flex', flex: 1 }}>
                {/* 文件夹———树 */}
                <div style={{
                    minWidth: 200, maxWidth: 500, width: 300, height: '100%', boxShadow: '0 2px 8px 0 #c8c9cc80',
                    resize: 'horizontal', overflow: 'auto',
                }}>
                    <Button theme='borderless' type='secondary' style={{ border: ' 1px solid #005ABD', borderRadius: 2, margin: '20px 0 0 10px' }} onClick={() => {
                        setIsFileModal(true)
                    }}> 新建文件夹 </Button>
                    {/* 添加文件弹窗 */}
                    {isFileModal ?
                        <FileModal
                            editData={editData}
                            higherFile={higherFile}
                            pepProjectId={pepProjectId || null}
                            type={3}
                            close={() => {
                                setIsFileModal(false)
                                setEditData({})
                            }}
                            success={() => {
                                fileList(pepProjectId || null)
                            }}
                        /> : ""
                    }
                    {/* <SimpleBar style={{ height: 'calc(100% - 70px' }} forceVisible='y'  > */}
                    <div id='folderList' style={{ height: 'calc(100% - 70px', }}>

                        <Tree
                            treeData={treeData}
                            defaultExpandAll
                            value={fileId}
                            // style={style}
                            onSelect={(selectedKey, selected, selectedNode) => {
                                setFileId(selectedKey)
                                setFileSearch('')
                            }}
                        />
                        {/* </SimpleBar> */}

                    </div>
                </div>
                {/* 表格 */}
                <div style={{
                    flex: 1, height: '100%',
                    // border: '1px solid rgb(24 22 22)'
                }}>
                    <div style={{ margin: '20px 0 10px 10px', display: 'flex', alignItems: 'center', width: 'calc(100% - 20px)' }}>
                        <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                <Button theme='solid' type='primary' style={{ width: 80, background: '#005ABD', marginRight: 10 }} onClick={() => {
                                    if (higherFile?.filter(c => c.value == fileId)?.length) {
                                        setUploadModal(true)
                                    }
                                }}> 上传 </Button>
                                <div style={{ display: 'flex' }}>当前文件夹：{higherFile?.filter(c => c.value == fileId)[0]?.name || <div style={{ color: '#c31515' }}>请选择文件夹</div>}</div>
                            </div>
                            <Input placeholder='请输入文件名称'
                                style={{ width: 220 }}
                                suffix={<SearchOutlined />}
                                value={fileSearch}
                                onChange={v => {
                                    setFileSearch(v)
                                    filfolderFileListe({ keyword: v, limit: 10, page: 0 })
                                    setQuery({ limit: 10, page: 0 })
                                }} />
                        </div>

                        {uploadModal ?
                            <Modal
                                title={'上传文件'}
                                okText="确定"
                                cancelText="取消"
                                open={true}
                                onOk={() => {
                                    if (uploadData?.name) {
                                        dispatch(means.addFile({ ...uploadData, fileId: fileId })).then(v => {
                                            if (v.success) {
                                                setUploadModal(false)
                                                filfolderFileListe({ limit: 10, page: 0 })
                                                setQuery({ limit: 10, page: 0 })
                                                setUploadData({})
                                                setHint(false)
                                            }
                                        })
                                    } else {
                                        setHint(true)
                                    }
                                }}
                                width={607}
                                onCancel={() => {
                                    setUploadModal(false)
                                    setHint(false)
                                    setUploadData({})
                                }}
                            >
                                <div style={{ display: 'flex', marginLeft: 30 }}>
                                    <div style={{ marginTop: 6 }}>文件<span style={{ color: 'red' }}>*</span>：</div>
                                    <Upload
                                        style={{ display: 'inline-block' }}
                                        action={`${apiRoot}/attachments/p`}
                                        accept={'.txt, .doc, .docx, .xls, .xlsx, .pdf, .png, .jpg, .rar, .zip'}
                                        limit={1}
                                        maxSize={51200}
                                        onRemove={() => {
                                            setUploadData({})
                                        }}
                                        onSuccess={(responseBody, file) => {
                                            setUploadData({
                                                name: file.name,
                                                size: file.size,
                                                url: responseBody?.uploaded,
                                                uploadTime: moment().format("YYYY-MM-DD HH:mm:ss")
                                            })
                                        }}
                                    >
                                        <Button icon={<UploadOutlined />} theme="light">
                                            文件上传
                                        </Button>
                                    </Upload>
                                </div>
                                {hint && !uploadData?.name && <div style={{ color: '#ff0000b3', marginLeft: 78, display: 'flex', alignItems: 'center' }}><ExclamationCircleOutlined />请上传文件</div>}
                            </Modal> : ""

                        }
                    </div>
                    {/* <SimpleBar style={{ height: 'calc(100% - 100px' }} forceVisible='y'  > */}
                    <div id='tableList' style={{ height: 'calc(100% - 100px', }}>

                        <Table
                            style={{ width: 'calc(100% - 10px)', marginLeft: 10 }}
                            columns={column}
                            dataSource={dataSource}
                            pagination={false}
                            bordered={false}
                            empty={
                                <div>
                                    <img src="/assets/images/problem/shield.png" style={{ width: 20 }} />暂无文件
                                </div>
                            }
                            onRow={(record, index) => {
                                if (index % 1 === 0) {
                                    return { style: { background: '#FAFCFF' } }
                                }
                            }}
                        // rowSelection={{
                        //    // selectedRowKeys: selected || [],
                        //    getCheckboxProps: record => ({
                        //       // disabled: record.confirmTime ? true : false,
                        //       // name: record.name,
                        //    }),
                        //    onSelect: (record, selected) => {
                        //    },
                        //    // onSelectAll: (selected, selectedRows) => {
                        //    // },
                        //    onChange: (selectedRowKeys, selectedRows) => {
                        //       // setSelected(selectedRows?.map(v => v.id))
                        //    },
                        // }}
                        />
                        {/* </SimpleBar> */}
                    </div>

                    {count > 0 ? <div style={{ display: 'flex', width: '100%', justifyContent: 'flex-end', alignItems: 'center', marginTop: 12 }}>
                        <span style={{ lineHeight: "30px", fontSize: 13 }}>
                            共{count}个文件
                        </span>
                        <Pagination
                            className="22"
                            total={count}
                            showSizeChanger
                            current={(query?.page || 0) + 1}
                            pageSize={query?.limit || 10}
                            pageSizeOpts={[10, 20, 50]}
                            onChange={(currentPage, pageSize) => {
                                setQuery({ limit: pageSize, page: currentPage - 1 });
                                filfolderFileListe({ limit: pageSize, page: currentPage - 1 })
                            }}
                        />
                    </div> : ""}
                    {/* <div
                  style={{
                     display: "flex",
                     justifyContent: "space-between",
                     padding: "20px 20px",
                  }}
               >
                  <div>
                     <div style={{ display: 'inline-block', lineHeight: '30px', fontSize: 13 }}>勾选<span style={{ fontWeight: 400, color: '#0F7EFB', margin: '0 6px' }}>{selected.length}条</span>问题</div>
                     <Button onClick={() => {
                        if (checkAll) {
                           setSelected((route == 'useAbnormal' || route == 'videoAbnormal' ? tableData.slice(query.page * query.limit, (query.page + 1) * query.limit) || [] : tableData)?.map(v => {
                              if (['videoAbnormal', 'useAbnormal'].includes(route)) {
                                 if (!v.confirmTime) {
                                    return v.id
                                 }
                              } else {
                                 if (!(v.State > 2)) {
                                    return v.id
                                 }
                              }
                           })?.filter(v => v))
                        } else {
                           setSelected([])
                        }
                        setCheckAll(!checkAll)
                     }}
                        style={{ width: 93, height: 24, borderRadius: '1px', border: '1px solid #0F7EFB', color: '#0F7EFB', background: "#FFFFFF", fontWeight: 400, margin: '0 10px' }}>
                        {checkAll ? '全选' : "取消全选"}
                     </Button>
                     <Button type='primary' theme='solid' onClick={() => (setIfBulk(true), setConfirm(true))} style={{ width: 93, height: 24, borderRadius: '1px', border: '1px solid #0F7EFB', color: '#FFFFFF', fontWeight: 400, }}>批量确认</Button>
                  </div>
                  {count > 0 ? <div style={{ display: 'flex', }}>
                     <span style={{ lineHeight: "30px", fontSize: 13 }}>
                        共{count}个问题
                     </span>
                     <Pagination
                        className="22"
                        total={count}
                        showSizeChanger
                        current={(query?.page || 0) + 1}
                        pageSizeOpts={[10, 20, 30, 40]}
                        onChange={(currentPage, pageSize) => {
                           setQuery({ limit: pageSize, page: currentPage - 1 });
                        }}
                     />
                  </div> : ""}

               </div> */}
                </div>
            </div>
            {
                videoModalV ?
                    <Modal
                        open={true}
                        destroyOnHidden
                        closable={false}
                        onCancel={() => {
                            setVideoModalV(false)
                            setvideoUrl('')
                        }} width={400}
                        footer={null}>
                        <img src={videoUrl} style={{ width: 350 }} />
                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <Button theme='solid' type='secondary' onClick={() => {
                                setVideoModalV(false)
                                setvideoUrl('')
                            }}>关闭</Button>
                        </div>
                    </Modal>
                    : ''
            }
        </div >
        // </div>
    )
}

function mapStateToProps (state) {
    const { auth, global, members, webSocket } = state;
    return {
        //   loading: members.isRequesting,
        user: auth.user,
        actions: global.actions,
        overallProjectId: global.pepProjectId,
        //   socket: webSocket.socket
        clientHeight: global.clientHeight,
        qiniu: global.qiniu?.domain,
        apiRoot: global.apiRoot
    };
}

export default connect(mapStateToProps)(Rest);
