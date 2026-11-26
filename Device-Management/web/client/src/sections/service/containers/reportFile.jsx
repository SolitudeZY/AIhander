import React, { useEffect, useRef, useState } from 'react';
import { connect } from 'react-redux';
import { Skeleton, Button, Pagination, Form, Popconfirm, Table, Tooltip, Input } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { SkeletonScreen, } from "$components";
import moment from "moment";
import FileModal from '../components/fileModal'
import SimpleBar from 'simplebar-react';


const ReportFile = ({ dispatch, actions, user, clientHeight, loading, socket, qiniuUrl, projectPoms, pepProjectId }) => {

   const { service, } = actions;

   const [query, setQuery] = useState({ limit: 10, page: 0 }); //页码信息
   const [limits, setLimits] = useState()//总数
   const mylimits = useRef(); //每页实际条数
   const [fileModal, setFileModal] = useState(false)  //信鸽弹框
   const [change, setChange] = useState(false)  //是否改变

   const [tableData, setTableData] = useState([])  //表格数据
   const [projectList, setProjectList] = useState([])  //项目数据
   const [projectId, setProjectId] = useState()  //项目id
   const [projectSearch, setProjectSearch] = useState()  //项目搜索

   const page = useRef(query.page);//哪一页



   useEffect(() => {
      if (projectPoms?.length) {
         let dataList = projectPoms?.filter(v => (!projectSearch || (v.name || v.pepProjectName).indexOf(projectSearch) != -1) && v.pepProjectIsDelete != 1 && (!pepProjectId || (pepProjectId?.length > 0 ? pepProjectId?.split(',')?.map(s => Number(s.id))?.includes(v.id) : pepProjectId)))
         setProjectId(dataList[0]?.id)
         setProjectList(dataList)
         getData({ projectId: dataList[0]?.id, limit: 10, page: 0 })
         setQuery({ limit: 10, page: 0 })

      }
   }, [projectPoms, pepProjectId, projectSearch])


   const getData = (data = {}) => {
      dispatch(service.getReportFile({ projectId: projectId, ...query, ...data })).then((res) => {
         if (res.success) {
            setTableData(res.payload.data?.rows)
            setLimits(res.payload.data?.count)
         }
      })
   }

   const columns = [{
      title: "文件名称",
      dataIndex: "fileName",
      key: 'fileName',
   }, {
      title: "报表类型",
      dataIndex: "reportType",
      key: 'reportType',
   }, {
      title: "最近生产时间",
      dataIndex: "startTime",
      key: 'tistartTimeme',
      render: (txet, row) => txet && moment(txet).format('YYYY-MM-DD HH:mm:ss') || '--'
   }, {
      title: "操作",
      dataIndex: "text",
      key: 'text',
      render: (_, row) => {
         return (
            <div style={{ display: "flex" }}>
               <Button theme="borderless">
                  <a href={`/_file-server/${row?.url?.slice(qiniuUrl.length) + '?filename=' + encodeURIComponent(row?.fileName + '.' + row?.url.split('.')?.pop())}`}>
                     下载
                  </a>
               </Button>
               <Popconfirm
                  title="确定删除该报表文件吗？"
                  arrow={{ pointAtCenter: false }}
                  showArrow={true}
                  position="topRight"
                  onConfirm={() => {
                     dispatch(service.delReportFile(row.id)).then((res) => {
                        if (res.success) {
                           setQuery({ limit: 10, page: 0 })
                           getData({ limit: 10, page: 0 })
                        }
                     })
                  }}
               >
                  <Button theme="borderless">删除</Button>
               </Popconfirm>
            </div>
         );
      },
   },
   ]

   function handleRow (record, index) {//斑马条纹
      // 给偶数行设置斑马纹
      if (index % 2 === 0) {
         return {
            style: {
               background: '#FAFCFF',
            }
         };
      } else {
         return {};
      }
   }


   return (
      <>
         <div style={{ background: '#FFFFFF', margin: '8px 12px', padding: '20px 20px 0px 20px', }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
               <div style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={{ width: 0, height: 20, borderLeft: '3px solid #005ABD', borderTop: '3px solid transparent', borderBottom: '3px solid transparent' }}></div>
                  <div style={{ fontFamily: "YouSheBiaoTiHei", fontSize: 24, color: '#101531', marginLeft: 8 }}>报表文件</div>
                  <div style={{ marginLeft: 6, fontSize: 12, color: '#969799', fontFamily: "DINExp", }}>REPORT FILE</div>
               </div>
               <Button style={{ width: 78 }} theme='solid' type='secondary' onClick={() => setFileModal(true)}>上传 </Button>
            </div>
            <div style={{ display: 'flex' }}>
               <div style={{ width: 200, height: '100%', padding: '16px 10px', boxShadow: '0 0 4px 2px #0000000d', marginRight: 20 }}>
                  <Input placeholder='请输入项目名称' value={projectSearch} onChange={v => setProjectSearch(v)} />
                  <SimpleBar style={{ width: 200, height: clientHeight - 190 }} forceVisible="y">
                     {projectList?.map(v => {
                        return <div key={'pepProjectId' + v.id} title={v.name || v.pepProjectName}
                           style={{
                              cursor: 'pointer', background: v.id == projectId ? 'rgb(15 126 251 / 16%)' : '',
                              width: 180, height: 30, display: 'flex', alignItems: 'center'
                           }}
                           onClick={() => {
                              setProjectId(v.id)
                              setQuery({ limit: 10, page: 0 })
                              getData({ projectId: v.id, limit: 10, page: 0 })
                           }}>
                           <img src="/assets/images/icon/project-icon.png" style={{ width: 14, marginRight: 8 }} />
                           <div style={{ fontSize: 14, width: 152, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}> {v.name || v.pepProjectName}</div>

                        </div>
                     })}
                  </SimpleBar>
               </div>

               <div style={{ marginTop: 20, width: 'calc(100% - 200px)' }}>
                  <Skeleton
                     loading={loading}
                     // loading={false}
                     active={true}
                     placeholder={SkeletonScreen()}
                  >
                     <Table
                        rowKey="name"
                        columns={columns}
                        dataSource={tableData}
                        bordered={false}
                        hideExpandedColumn={false}
                        empty="暂无数据"
                        pagination={false}
                        onRow={handleRow}
                     />
                  </Skeleton>
                  {limits > 0 && <div
                     style={{
                        display: "flex",
                        justifyContent: "space-between",
                        padding: "20px 20px",
                     }}
                  >
                     <div>
                     </div>
                     <div style={{ display: 'flex', }}>
                        <span style={{ lineHeight: "30px", fontSize: 13, color: 'rgba(0,90,189,0.8)' }}>
                           共{limits}条信息
                        </span>
                        <Pagination
                           className="22"
                           total={limits}
                           showSizeChanger
                           current={query.page + 1}
                           pageSizeOpts={[10, 20, 30, 40]}
                           onChange={(currentPage, pageSize) => {
                              setQuery({ limit: pageSize, page: currentPage - 1 });
                              getData({ limit: pageSize, page: currentPage - 1 })
                           }}
                        />
                     </div>
                  </div>}
               </div>

            </div>

         </div>
         {//推送配置弹框
            fileModal ?
               <FileModal
                  open={true}
                  projectList={projectList}
                  close={() => {
                     setFileModal(false);
                  }}
                  success={() => {
                     setQuery({ limit: 10, page: 0 })
                     getData({ limit: 10, page: 0 })
                  }}
               /> : ''
         }
      </>
   )
}

function mapStateToProps (state) {
   const { auth, global, reportFile, ProjectPoms } = state;
   return {
      loading: reportFile.isRequesting,
      user: auth.user,
      actions: global.actions,
      qiniuUrl: global.qiniu?.domain,
      pepProjectId: global.pepProjectId,
      clientHeight: global?.clientHeight,
      projectPoms: ProjectPoms?.data?.rows
   };
}

export default connect(mapStateToProps)(ReportFile);
