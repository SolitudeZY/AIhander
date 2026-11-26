import React,{useEffect, useState} from "react";
import * as XLSX from 'xlsx'

import { Table, Button, Form, DatePicker, Modal, Input, Upload, Drawer, Popconfirm, Spin, message } from 'antd';
import { connect } from "react-redux";
import moment from "moment";

const TemperatureCompensation = (props) => {
  const { dispatch, actions } = props;
  const [visible, setVisible] = React.useState(false);
  const [sideVisible, setSideVisible] = React.useState(false);
  const {data:d}=actions;
  const {getcode,loginDz} =d;
  const [captchaPath,setCaptchaPath]=useState('');
  const [sessionId,setSessionId]=useState('');
  const [fileUrl,setFileUrl]=useState('');
  const [fileData,setFileData]=useState([]);
  const [loading,setLoading]=useState(false);
  const [dataList,setDataList]=useState([]);
  const [editRecord,setEditRecord]=useState(null);
  const [total,setTotal]=useState(0);
  const [pageQuery,setPageQuery]=useState({
      page:1,
      pageSize:10
  });
  const [time,setTime]=useState({
    start:'1990-01-01',
    end:'2099-12-31'
  });
  const fetchData = () => {
    setLoading(true);
    let queryData={
      page:pageQuery.page,
      pageSize:pageQuery.pageSize,
      start:time.start,
      end:time.end
    }
    dispatch(d.findAllRecord(queryData)).then(res=>{
      if(res.success){
        setLoading(false);
        setTotal(res.payload.data.count);
        setDataList(res.payload.data.rows);
      }
    })
  }
  useEffect(() => {
    fetchData();
  },[pageQuery,time]);
  const handleDelete = (record) => {
    if(record.state!=2){
      message.error("未执行完成得任务不能删除！");
    }
    dispatch(d.delRecord({id:record.id})).then(res=>{
      if(res.success){
        // message.success("删除成功！");
        setPageQuery({
          page:1,
          pageSize:10
        })
      }
    })
  };


  const change = (record) => {
      setEditRecord(record);
    setSideVisible(!sideVisible);
  };

  const showDialog = () => {
    setLoading(true);
    dispatch(getcode()).then(res=>{
      if(res.success){
        setCaptchaPath(res.payload.data.data.captchaPath);
        setSessionId(res.payload.data.data.sessionId);
        setLoading(false);
      }
    })
    setVisible(true);
  };

  const handleOk = () => {
    setLoading(true);
    const user = JSON.parse(sessionStorage.getItem("user"));
    let userName='';
    if(user){
        userName=user.userInfo.name
      }
    if(!document.getElementById('captchaText').value ||!fileUrl){
      message.error('请填写完整信息');
      setLoading(false);
      return
    }
    dispatch(loginDz({
      captchaText:document.getElementById('captchaText').value,
      sessionId,
      fileUrl,
      fileData,
      createBy:userName,
      state:0,
      createAt:moment().format('YYYY-MM-DD HH:mm:ss')
    })).then(res=>{
      if(res.success){
        setLoading(false);
        setCaptchaPath('');
        setFileData([]);
        setFileUrl('');
        setVisible(false);
        message.success('上传成功');
        setTimeout(() => {
          fetchData();
        }, 100);
      }
    })
  };

  const columns = [
    // {
    //   title: "序号",
    //   dataIndex: "id",
    //   width: 80,
    // },
    {
      title: "名称",
      dataIndex: "name",
      render: (text) => <a>温补自动下发</a>,
    },
    {
      title: "状态",
      dataIndex: "state",
      render:(_,record)=> record.state==2?'执行完成':'执行中'

    },
    {
      title: "执行时间",
      dataIndex: "createAt",
      render: (_,record) => moment(record.createAt).format("YYYY-MM-DD HH:mm:ss"),
    },
    {
      title: "创建人",
      dataIndex: "createBy",
    },
    {
      title: "结果",
      dataIndex: "result",
      render: (_,record) =>record.resultUrl&& <a href={`/_file-server/${record.resultUrl}`}>执行结果</a>
    },
    {
      title: "操作",
      render: (_,record) => (
        <>
          <Button type="primary" onClick={()=>change(record)}>
            查看详情
          </Button>

          <Popconfirm
            title="确定要删除吗？"
            content="删除后将无法恢复"
            onConfirm={()=>handleDelete(record)}
            okText="确认"
            cancelText="取消"
          >
            <Button type="danger">删除</Button>
          </Popconfirm>
        </>
      ),
    },
  ];

  
  
  return (
    <>
      <div style={{ padding: 24 }}>
        <div style={{ marginBottom: 16, width: "100%", display: "flex" }}>
          <Form layout="horizontal">
            <DatePicker
              type="dateRange"
              density="compact"
              onChange={(e) => {
                setTime({
                  start: moment(e[0]).format("YYYY-MM-DD"),
                  end:moment(e[1]).format("YYYY-MM-DD"),
                });
              }}
              style={{ width: 260 }}
            />
            {/* <Button type="primary" onClick={fetchData}>查询</Button> */}
          </Form>

          <Button style={{marginLeft:20}} type="primary" theme='solid' onClick={showDialog}>
            新增
          </Button>
        </div>

        <Table columns={columns} dataSource={dataList} pagination={
          {
            currentPage:pageQuery.page,
            pageSize:pageQuery.pageSize,
            total:total,
            onChange:(page,pageSize)=>{
              setPageQuery({
                page,
                pageSize
              })
            }
          }
        } />
      </div>

      <Modal
        title="新增温补任务"
        open={visible}
        onOk={handleOk}
        closeOnEsc={true}
        onCancel={() => {
          setVisible(false);
          setCaptchaPath('');
          setFileData([]);
          setFileUrl('');
        }}
        confirmLoading={loading}
        maskClosable={false}
      >
        <Form>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "16px",
              padding: "16px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ minWidth: "120px" }}>地大平台鉴权</span>
              <Input id="captchaText" style={{ flex: 1 }} />
             <Spin spinning={loading}> <img src={captchaPath} alt="" style={{ width: "100px", height: "100px" }} /></Spin>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ minWidth: "120px" }}>需温补设备文件</span>
              <Upload action="/_upload/attachments"
                limit={1}
                onSuccess={(res, file) => {
                  setFileUrl(res)
                  const reader = new FileReader();
                  reader.onload = function (e) {
                    const data = e.target.result;
                    const workbook = XLSX.read(data, { type: 'binary' });
                    const sheetNames = workbook.SheetNames
                    let dataList=[];
                    for(let i = 0; i < sheetNames.length; i++) {
                      const sheetName = workbook.SheetNames[i];
                      const worksheet = workbook.Sheets[sheetName];
                      const jsonData = XLSX.utils.sheet_to_json(worksheet,{header:1});
                      for(let j = 0; j < jsonData.length; j++){
                        // debugger
                        let cur= jsonData[j];
                        if(cur.length>6&&cur[0]!="结构物名称"&&cur[1]!='DTU编号'&&cur[2]!="模块号"){
                          if(cur[2].includes('QJ')){
                            let model = cur[2].replace('QJ','');
                            dataList.push(model);
                          }
                          
                        }

                      }
                    }
                    setFileData(dataList)
                  }
                  reader.readAsBinaryString(file);

                }}
              >
                <Button theme="light">点击上传</Button>
              </Upload>
            </div>
          </div>
        </Form>
      </Modal>

      <Drawer
        title="滑动侧边栏"
        open={sideVisible}
        onCancel={change}
        width={400}
      >
        <div style={{ padding: "16px" }}>
          <div style={{ marginBottom: "12px" }}>
            <strong>需温补设备文件：</strong> <a href={`/_file-server/${editRecord?.fileUrl}`}>导入.xls</a>
          </div>
          <div style={{ marginBottom: "12px" }}>
            <strong>执行结果文件：</strong> <a href={`/_file-server/${editRecord?.resultUrl}`}>导出.xls</a>
          </div>
          <div style={{ marginBottom: "12px" }}>
            <strong>执行时间：</strong> {
              editRecord?.createTime ? moment(editRecord.createTime).format('YYYY-MM-DD HH:mm:ss') : ''
            }
          </div>
          <div style={{ marginBottom: "12px" }}>
            <strong>执行人：</strong> {editRecord?.createBy}
          </div>
        </div>
      </Drawer>
    </>
  );
};

function mapStateToProps(state) {
  const { global } = state;
  return {
    actions: global.actions,
  };
}

export default connect(mapStateToProps)(TemperatureCompensation);
