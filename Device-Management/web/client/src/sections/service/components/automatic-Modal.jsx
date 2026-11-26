import React, { useState, useRef, useEffect } from "react";
import { connect } from "react-redux";
import { Modal, Form, notification, Tooltip, Upload, Button, Checkbox, Collapse, Input, Select, DatePicker, Radio, InputNumber } from 'antd';
import { MinusCircleOutlined, PlusCircleOutlined, PlusOutlined, UploadOutlined } from '@ant-design/icons';
import moment from "moment";
import { useMemo } from "react";

// const sectionableFactors = ['1004', '3001', '3003', '4004', '2001', '4001'];
//挠度监测原型
const deflection =['4004']
let timer = null;
const AutomaticModal = ({ actions, dispatch, apiRoot, qiniuUrl, visible, eidtData, close, success, projectList }) => {
  // console.log('xxx',((strucData || [])));

  const { service, problem } = actions;
  const [form] = Form.useForm();//表单
  const [strucData, setStrucData] = useState([])  //结构物数据

  const [projectId, setProjectId] = useState();    //项目id
  const [structId, setStructId] = useState([]);      //结构物id
  const [factorId, setFactorId] = useState([]);     //监测因素id
  const [factorList, setFactorList] = useState([]);     //监测因素
  const [structChech, setStructChech] = useState([]);     //选中的结构物
  const [factorChech, setFactorChech] = useState({});     //选中的结构物
  const [descriptions, setDescriptions] = useState({});     //
  const [reportType, setReportType] = useState(eidtData?.reportType || "月报表"); //报表类型


  useEffect(()=>{
    if(eidtData&&(strucData || []).length&&form){
      if((eidtData?.structId || [])?.length===strucData.length){
        form?.current.setValue('structId',[0])
      }
    }
  },[eidtData, strucData])
  useEffect(()=>{
    return () => {
      if (timer) {
        clearTimeout(timer)
      }
    };
  },[])
  useEffect(async () => {
    if (eidtData?.id) {
      setProjectId(eidtData?.projectId)
      setStructId(eidtData?.structId || [])
      setFactorId(eidtData?.factors?.map(s => s.codeName) || [])

      let data = await getData(eidtData?.projectId)
      let struc = data?.filter(s => eidtData?.structId?.includes(s.strucId)) || []
      
      setStructChech(struc)
      let Factor = {}
      struc?.forEach(d => {
        let structFind = eidtData?.structList?.find(p => p.structId == d.strucId) || {}
        let newData= d.factor?.filter(w => {
          let obj=eidtData?.structList?.find(h => h.structId == d.strucId)?.factors?.map(g => g.codeName)?.includes(w.id)            
          return obj
        })
        newData?.forEach(dd=>{
          let findObj =structFind?.factors?.find(c => c.codeName == dd.id) || {}
          if(findObj){
            dd.aggrMethod=findObj.aggrMethod
            dd.dataFormat=findObj.dataFormat
            dd.dataType=findObj.dataType
            dd.initialType=findObj.initialType
            dd.initialTime=findObj.initialTime
            dd.selectedSensors=findObj.selectedSensorsInitialForce
            dd.sensorNames=findObj.sensorNames
          }
        })
        
        Factor[d.strucId] =newData
      })
      eidtData?.structList?.forEach(d => {
        d.factors?.forEach(f => {
          setDescriptions(prevDescriptions => ({
            ...prevDescriptions,
            [d.structId]: {
              ...(prevDescriptions[d.strucId] || {}),
              [f.codeName]: f.pointDescrip,

            }
          }));
        })
      })
      // console.log('xxx1', Factor)
      setFactorChech(Factor)
      // setActiveKey(eidtData?.factors?.map(s => s.codeName) || [])
    }
  }, [])
  const allProto = useMemo(() => {
  const result = [];
  structChech.forEach(s => {
    (factorChech[s.strucId] || []).forEach(f => {
      if (f.proto) result.push(f.proto + '');
    });
  });
  return result;
}, [structChech, factorChech]);

const currentSectionableFactors = useMemo(() => {
  return reportType === '事件响应报告'
    ? allProto
    : ['1004', '3001', '3003', '4004', '2001', '4001'];
}, [reportType, allProto]);

  const getData = async (projectId) => {
    let data = []
    await dispatch(service.getFactorList({ pepProjectId: projectId })).then((res) => {
      if (res.success) {
        // debugger
        setStrucData(res.payload.data)
        data = res.payload.data
      }
    })
    return data
  }
  const addDescription = (structId, factorId) => {
    setDescriptions(prevDescriptions => ({
      ...prevDescriptions,
      [structId]: {
        ...(prevDescriptions[structId] || {}),
        [factorId]: [...(prevDescriptions[structId]?.[factorId] || []), []]
      }
    }));
  }
  return (
    <>
      <Modal
        title={eidtData.id ? "编辑报表生成规则" : '新增报表生成规则'}
        okText="确定"
        cancelText="取消"
        open={visible}
        onOk={() => {
          form.validateFields().then((v) => {
            let hasReapeatTime=false;
            let data = {
              id: eidtData?.id,
              reportName: v.reportName,   //报表名称
              xmName: v.reportName,
              projectId: v.projectId,    //所属项目
              projectName: v.projectName,    //项目名称
              reportType: v.reportType,  //报表类型
              reportPicPath: v.reportPicPath && v.reportPicPath[0] ? (v.reportPicPath[0]?.response?.url || eidtData.reportPicPath) : "",  //首页图片
              // framer: v.framer,   //制定者
              // auditor: v.auditor,  //审核者
              // ratifier: v.ratifier,   //批准者
              // coverTime: v.coverTime && moment(v.coverTime),
              eventName:v.eventName,
              eventSummary:v.eventSummary,
              structId: (v.structId.length===1&&v.structId[0]===0)&& structId || v.structId,    //结构物id
              structList: [],
              reportStartTime: v.reportTime && v.reportTime[0] && moment(v.reportTime[0]).format('YYYY-MM-DD HH:mm:ss'),//开始时间
              reportEndTime: v.reportTime && v.reportTime[1] && moment(v.reportTime[1]).format('YYYY-MM-DD HH:mm:ss'),//结束时间
              monitoringBasis: v.monitoringBasis,  //监测依据

            }

            data.structId?.forEach(p => {
              let externalPlatform=strucData?.find(q => q.strucId == p)?.externalPlatform || '';
              let localStructId = strucData?.find(q => q.strucId == p)?.localStructId || '';
              let structFind = eidtData?.structList?.find(d => d.structId == p) || {}
              let structData = { structId: p ,
                Project:externalPlatform,
                localStructId:localStructId,
              }
              let structNameIndex = p.toString().length || 0

              for (let key in v) {
                if (key?.indexOf(p) != -1) {
                  //项目概况
                  if (key?.slice(structNameIndex) == 'projectOverview') structData.projectOverview = v[key]
                  //项目整体图
                  if (key?.slice(structNameIndex) == 'overview') structData.overview = v[key] && v[key][0] ? (v[key][0]?.response?.url || structFind.overview) : ""
                  //监测设备列表
                  if (key?.slice(structNameIndex) == 'equipmentPicPaths') {
                    if (v[key] && v[key].length) {

                      //d?.url=/_file-server/p/b0c97322-b016-4035-8,切掉/_file-server/

                      structData.equipmentPicPaths = v[key]?.map(d => d?.response?.url || qiniuUrl + '/' + d?.url?.split('/_file-server/')[1]) || structFind.equipmentPicPaths
                    }
                    // structData.deviceList = [0] ? (v[key][0]?.response?.url || structFind.deviceList) : ""

                  }
                  //采集箱布置图
                  if (key?.slice(structNameIndex) == 'jcbzPicPaths') {
                    if (v[key] && v[key].length) {
                      structData.jcbzPicPaths = v[key]?.map(d => d?.response?.url || qiniuUrl + '/' + d?.url?.split('/_file-server/')[1]) || structFind.jcbzPicPaths
                    }
                    // structData.collection = v[key] && v[key][0] ? (v[key][0]?.response?.url || structFind.collection) : ""
                  }

                  // //结论
                  // if (key?.slice(structNameIndex) == 'conclusion') structData.conclusion = v[key]
                  //开始结束时间
                  // if (key?.slice(structNameIndex) == 'reportTime') {
                  //     structData.reportStartTime = v[key] && v[key][0] && moment(v[key][0])
                  //     structData.reportEndTime = v[key] && v[key][1] && moment(v[key][1])
                  // }
                  //包含的监测因素
                  structData.factors = []
                }
              }

              // debugger
              let factorList = (factorChech[p] || [])?.map(d => d.id)
              factorList?.forEach(d => {
                let factorFind = structFind?.factors?.find(c => c.codeName == d) || {}
                let index = d.toString().length + structNameIndex + 5
                let factorData = {}
                for (let key in v) {
                  factorData.codeName = d
                  factorData.tempName = factorData.tempName || []
                  if (key?.indexOf(p + 'struc') != -1 && key?.indexOf('struc' + d) != -1) {
                    //布点图片
                    if (key?.slice(index) == 'pointPicPath') {
                      factorData.pointPicPath = v[key] && v[key].length ? (v[key].map(d => d?.response?.url || qiniuUrl + '/' + d?.url?.split('/_file-server/')[1]) ||
                        factorFind.pointPicPath) : ''
                      // factorData.pointDescrip = []
                      // let pointPicPath = v[key] && v[key].length ? v[key]?.map(d => d?.response?.url || qiniuUrl + '/' + d?.url?.split('/_file-server/')[1]) : []
                      // pointPicPath.forEach((d, inx) => {
                      //     factorData.pointDescrip.push({
                      //         url: d,
                      //         index: inx,
                      //     })
                      // })
                    }
                    //布点描述
                    // if (key?.slice(index).includes('pointDescrip')) {
                    //     factorData.pointDescrip.forEach((d,inx)=>{
                    //         if(key?.slice(index).includes('pointDescrip'+inx)){
                    //             d.description=v[key]
                    //         }
                    //     })
                    // }
                    if (key?.slice(index) == 'pointDescribe') factorData.pointDescribe = v[key]
                    //索力监测描述
                    if (key?.slice(index) == 'factorDescrip') factorData.factorDescrip = v[key]
                    //测点选择
                    if (key?.slice(index) == 'sensorNames'){
                      let sensorNames=[];
                      // debugger
                      if(v[key]?.length===1 && v[key][0]===0){
                        // debugger
                        sensorNames=factorChech[p]?.find(p => p.id == d)?.sensor?.map(c => ({ id: c.id, name: c.name })) || []
                      }else{
                        sensorNames= factorChech[p]?.find(p => p.id == d)?.sensor?.filter(f => v[key]?.includes(f.id))?.map(c => ({ id: c.id, name: c.name })) || []
                      }
                      factorData.sensorNames = sensorNames
                    }
                    //数据类型
                    if (key?.slice(index) == 'dataType') factorData.dataType = v[key]
                    //聚集方式
                    if (key?.slice(index) == 'aggrMethod') factorData.aggrMethod = v[key]
                    //数据格式
                    if (key?.slice(index) == 'dataFormat') factorData.dataFormat = v[key]
                    //数据初始时间、初始索力值
                    if (key?.slice(index) == 'initialType') factorData.initialType = v[key]
                    //数据初始索力值
                    if (key?.slice(index) == 'initialForce') {
                      factorData.initialForce = v[key];
                    }
                    //如果选了初始索力值，组合所选测点的初始索力值
                    if(key?.includes('initialForceList')){
                      // field={s.strucId +'struc' + p.id +'initialForceList' + sensorItem.id} 
                      let sensorId=key?.slice(index+16);
                      let sensorItem=factorChech[p]?.find(p => p.id == d)?.sensor?.find(f => f.id==sensorId) || {};
                      if(!(factorData.selectedSensorsInitialForce || []).length){
                        factorData.selectedSensorsInitialForce=[];
                      }
                      factorData.selectedSensorsInitialForce.push({
                        id:sensorId,
                        name:sensorItem?.name,
                        value:v[key]
                      })
                    }
                    //数据初始时间
                    if (key?.slice(index) == 'initialTime') factorData.initialTime = v[key] && moment(v[key])
                    //截面分组
                    if (key?.slice(index) == 'sensorSections') factorData.sensorSections = v[key]
                    //开始结束时间
                    if (key?.slice(index) == 'releStartTimeEndTime') {
                      factorData.releStartTime = v[key] && v[key][0] && moment(v[key][0])
                      factorData.releEndTime = v[key] && v[key][1] && moment(v[key][1])
                    }
                    //挠曲线数组
                    if(key?.slice(index) == 'deflectionSections'){
                      factorData.deflectionSections = v[key];
                      //校验时间是否重复
                      for(let i=0;i<v[key]?.length;i++){
                        let times=v[key][i]?.deflectionTimes
                        const timeSet=new Set([...times.map(s=>moment(s).format('YYYY-MM-DD'))])
                        // debugger
                        if(timeSet.size!=times.length){
                          hasReapeatTime=true;
                        }
                      }
                    }
                    //关联温度的测点
                    if (key?.slice(index) == 'tempName1') {
                      factorData.tempName?.push({
                        index: 1,
                        id: v[key],
                        name: factorChech[p]?.find(p => p.id == d)?.sensor?.find(f => v[key] == f.id)?.name
                      })
                    }
                    //温度测点
                    if (key?.slice(index) == 'tempName2') {
                      factorData.tempName?.push({
                        index: 2,
                        id: v[key],
                        name: factorChech[p]?.find(p => p.proto == 1004)?.sensor?.find(f => v[key] == f.id)?.name
                      })
                    }
                    //数据初始时间
                    if (key?.slice(index) == 'initialTime') factorData.initialTime = v[key] && moment(v[key])
                    //关联开始结束时间
                    if (key?.slice(index) == 'releTime') {
                      factorData.releStartTime = v[key] && v[key][0] && moment(v[key][0])
                      factorData.releEndTime = v[key] && v[key][1] && moment(v[key][1])
                    }
                    //限速值
                    if (key?.slice(index) == 'speedLimit') factorData.speedLimit = v[key]
                    //限重值
                    if (key?.slice(index) == 'weightLimit') factorData.weightLimit = v[key]
                  }
                }
                factorData.glStaName = factorData?.tempName?.find(s => s.index == 1)?.name
                factorData.tempStaName = factorData?.tempName?.find(s => s.index == 2)?.name || factorData?.tempName?.find(s => s.index == 1)?.name
                structData.factors?.push(factorData)
              })

              data.structList.push(structData)
            })
            if(hasReapeatTime){
              notification.error({
                message: '提示',
                description:'挠曲线分组内时间取值不能重复',
                duration:3
              });
              return;
            }
            // debugger
            dispatch(service.postAutomaticReport(data)).then((res) => {
              if (res.success) {
                close()
                success()
              }
            })
          })
        }}
        width={structId && structId.length ? 1500 : 770}
        onCancel={() => close()}
      >
        <Form
          form={form}
          labelCol={{ span: 6 }}
          wrapperCol={{ span: 18 }}
          onValuesChange={(changedValues, allValues) => {
            // 重新校验所有 sectionName 字段
            const changedKey = Object.keys(changedValues)[0];
            if (changedKey && changedKey.endsWith('].sectionName')) {
              const sensorSectionsField = changedKey.split('[')[0]
              const sensorSectionsValue = allValues[sensorSectionsField]
              if (sensorSectionsValue) {
                sensorSectionsValue.forEach((item, i) => {
                  form.validateFields([`${sensorSectionsField}[${i}].sectionName`]).catch(() => {});
                });
              }
            }
            // 重新校验所有 sensors 字段
            if (changedKey && changedKey.endsWith('].sensors')) {
              const sensorSectionsField = changedKey.split('[')[0]
              const sensorSectionsValue = allValues[sensorSectionsField]
              if (sensorSectionsValue) {
                sensorSectionsValue.forEach((item, i) => {
                  form.validateFields([`${sensorSectionsField}[${i}].sensors`]).catch(() => {});
                });
              }
            }
          }}
        >
          <div style={{ display: 'flex' }}>

            <div style={{ flex: 1 }}>
              <Form.Input field="reportName" label='报表名称' style={{ width: 300 }} placeholder="请输入报表名称(不超过15字)" allowClear
                initValue={eidtData?.reportName || ""} maxLength={15}
              // rules={[{ required: true, message: "请输入报表名称" }]}
              />
              <Form.Select label="所属项目" field="projectId" placeholder="请选择项目" allowClear style={{ width: 300 }} filter
                initValue={eidtData?.projectId || ""}
                rules={[{ required: true, message: "请选择项目" }]}
                onChange={v => {
                  setProjectId(v)
                  getData(v)
                  form.setFieldsValue({'structId': []})
                  setStructId([])
                  // setFactorList([])
                  // form.current.setValue('factorId', [])
                  setStructChech([])
                }} >
                {projectList?.map((item) => {
                  return <Select.Option value={item.id} key={item.id} label={item.name || item.pepProjectName}></Select.Option>

                })}
              </Form.Select>
              <Form.Input field="projectName" label='项目名称' style={{ width: 300 }} placeholder="请输入项目名称" allowClear
                initValue={eidtData?.projectName || ""}
                rules={[{ required: true, message: "请输入项目名称" }]}
              />
              <Form.Select label="报表类型" field="reportType" placeholder="请选择报表类型" allowClear style={{ width: 300 }}
                rules={[{ required: true, message: "请选择报表类型" }]}
                initValue={eidtData?.reportType || "月报表"}
                options={[{ value: "月报表", label: "月报表" },{ value: "事件响应报告", label: "事件响应报告" }]}
                onChange={v=>setReportType(v)}
              // options={[{ value: "月报表", label: "月报表" }, { value: "季报表", label: "季报表" }, { value: "年报表", label: "年报表" }]}
              />
                {reportType === '事件响应报告' &&
                  (<><Form.Input
                  field="eventName"
                  label='事件名称'
                  style={{ width: 300 }}
                  placeholder="请输入事件名称"
                  allowClear
                  initValue={eidtData?.eventName || ""}
                  rules={[
                      { required: true, message: "请输入事件名称" },
                      { max: 2000, message: "事件名称不能超过2000个字符" }
                  ]}
              />
              <Form.Input
                  field="eventSummary"
                  label='事件简述'
                  style={{ width: 300 }}
                  placeholder="请输入事件简述"
                  allowClear
                  initValue={eidtData?.eventSummary || ""}
                  rules={[
                      { required: true, message: "请输入事件简述" },
                      { max: 2000, message: "事件简述不能超过2000个字符" }
                  ]}
              /></>)}
              {reportType !== '事件响应报告' &&
              (<Form.Upload label="首页图片" field="reportPicPath" style={{ display: 'inline-block', }}
                initValue={eidtData?.reportPicPath && [{ url: `/_file-server/${eidtData?.reportPicPath?.slice(qiniuUrl.length + 1)}`, name: eidtData.reportPicPath?.split('/')?.pop(), status: 'success', preview: ['png', 'jpg', 'jpeg'].includes(eidtData.reportPicPath?.split('.')?.pop()?.replace('.', '')) }] || null}
                rules={[{ required: true, message: "请上传首页图片" }]}
                action={`${apiRoot}/attachments/p`}
                accept={'.png, .jpg, .jpeg'}
                // accept={'.txt, .doc, .docx, .xls, .xlsx, .pdf, .png, .jpg, .rar, .zip'}
                limit={1} maxSize={5120}
              >
                <Button icon={<UploadOutlined />} theme="light">
                  文件上传
                </Button>
              </Form.Upload>
              )}
              <Form.DatePicker field="reportTime" label='开始结束时间' type='dateTimeRange' allowClear
                initValue={(eidtData?.reportStartTime && eidtData?.reportEndTime) &&
                  [moment(eidtData?.reportStartTime).format('YYYY-MM-DD HH:mm:ss'),
                  moment(eidtData?.reportEndTime).format('YYYY-MM-DD HH:mm:ss')] || null}
                style={{ width: 390 }}
                rules={[{ required: true, message: "请选择开始结束时间" }]}
              />
              {reportType !== '事件响应报告' &&
                  (
              <Form.Input field="monitoringBasis" label='监测依据'
                style={{ width: 390 }}
                // autosize={{ minRows: 2, maxRows: 10 }}
                placeholder="请输入监测依据" allowClear
                initValue={eidtData?.monitoringBasis || ""}
                rules={[{ required: true, message: "请输入监测依据" }]}
              />
              )}
              {/* <Form.Input field="framer" label='制定者' style={{ width: 300 }} placeholder="请输入制定者" allowClear
                        initValue={eidtData?.framer || ""}
                        rules={[{ required: true, message: "请输入制定者" }]}
                    />
                    <Form.Input field="auditor" label='审核者' style={{ width: 300 }} placeholder="请输入审核者" allowClear
                        initValue={eidtData?.auditor || ""}
                        rules={[{ required: true, message: "请输入审核者" }]}
                    />
                    <Form.Input field="ratifier" label='批准者' style={{ width: 300 }} placeholder="请输入批准者" allowClear
                        initValue={eidtData?.ratifier || ""}
                        rules={[{ required: true, message: "请输入批准者" }]}
                    />
                    <Form.DatePicker label="封面时间" field="coverTime" allowClear style={{ width: 300 }}
                        initValue={eidtData?.coverTime && mome nt(eidtData?.coverTime).format('YYYY-MM-DD') || ""}
                    /> */}
              {/**结构物带全选的逻辑 */}
              {/* <Form.Select label="结构物" field="structId" placeholder="请选择结构物" allowClear style={{ width: 300 }} filter
                rules={[{ required: true, message: "请选择结构物" }]} disabled={projectId ? false : true}
                //回显的初始值判断是否全选，选项置换为0(页面显示全选)
                // initValue={eidtData?.structId?.length == strucData?.length? [0] : eidtData?.structId || []}
                initValue={eidtData?.structId || ""} 
                multiple={true}
                onChange={v => {
                  if(timer) clearTimeout(timer);
                  const handleSelectionUpdate = (selectedIds, allIds) => {
                    timer = setTimeout(() => {
                      form.setFieldsValue({'structId': selectedIds});
                    }, 0);
                    setStructId(allIds);
                    setStructChech(strucData?.filter(s => allIds.includes(s.strucId)) || []);
                  };
                let stList = [{strucId:0,strucName:'全部'},...strucData];
                 const allOptionIds = stList
                    .map((item) => item.strucId)
                    .filter((id) => id !== 0);
                  const isSelectAll = v.includes(0);
                  const isAllSelected = allOptionIds.every(id => v.includes(id));
                 if (isSelectAll) {
                    if (v.length === 1 || isAllSelected) {
                      handleSelectionUpdate([0], allOptionIds);
                    } else if (v[v.length - 1] === 0) {
                     handleSelectionUpdate([0], allOptionIds);
                    } else {
                      const filteredSelection = v.filter(s => s !== 0);
                          handleSelectionUpdate(filteredSelection, filteredSelection);
                    }
                  } else {
                    if (isAllSelected) {
                     handleSelectionUpdate([0], allOptionIds);
                    } else {
                     handleSelectionUpdate(v, v);
                   }
                 }
                }}
                >
                {((strucData || []).length?([{strucId:0,strucName:'全部'},...strucData]):[])?.map((item) => {
                  return <Select.Option value={item.strucId} key={item.strucId} label={item.strucName}></Select.Option>

                })}
              </Form.Select> */}
              <Form.Select label="结构物" field="structId" placeholder="请选择结构物" allowClear style={{ width: 300 }} filter
                rules={[{ required: true, message: "请选择结构物" }]} disabled={projectId ? false : true}
                initValue={eidtData?.structId || ""} multiple={true}
                onChange={v => {
                  // setFactorList(strucData?.find(s => v.includes(s.stdrucId)) || [])
                  setStructId(v)
                  // form.current.setValue('factorId', [])
                  setStructChech(strucData?.filter(s => v.includes(s.strucId)) || [])
                }} >
                {strucData?.map((item) => {
                  return <Select.Option value={item.strucId} key={item.strucId} label={item.strucName}></Select.Option>

                })}
              </Form.Select>
            </div>
            {(structId && structId.length) ? <div style={{ flex: 1, overflow: 'auto', height: 600 }}>
              {/*所选结构物 */}
              {structChech?.length > 0 ? <Collapse style={{ margin: '20px 0 20px 30px', width: '90%', background: '#b7c9e624' }}
                // activeKey={activeKey}
                keepDOM={true}
                onChange={v => {
                  // setActiveKey(v)
                }}
              >
                {
                  structChech?.map(s => {
                    let structFind = eidtData?.structList?.find(d => d.structId == s.strucId) || {}
                    return <Collapse.Panel header={s.strucName} itemKey={`'${s.strucId}'`} key={s.strucId}>
                      <div style={{ background: "#FFF" }}>
                        {reportType !== '事件响应报告' &&
                  (<><Form.Input field={s.strucId + "projectOverview"} label='项目概况' style={{ width: 390 }} autosize={{ minRows: 2, maxRows: 10 }} placeholder="请输入项目概况" allowClear
                          initValue={structFind?.projectOverview || ""}
                          rules={[{ required: true, message: "请输入项目概况" }]}
                        />
                        <Form.Upload label="项目整体图" field={s.strucId + "overview"} style={{ display: 'inline-block', }}
                          initValue={structFind?.overview && [{ url: `/_file-server/${structFind?.overview?.slice(qiniuUrl.length + 1)}`, name: structFind.overview?.split('/')?.pop(), status: 'success', preview: ['png', 'jpg', 'jpeg'].includes(structFind.overview?.split('.')?.pop()?.replace('.', '')) }] || null}
                          action={`${apiRoot}/attachments/p`}
                          accept={'.png,.jpg,.jpeg'}
                          limit={1} maxSize={5120}
                          rules={[{ required: true, message: "请选择项目整体图" }]}
                        >
                          <Button icon={<UploadOutlined />} theme="light">
                            文件上传
                          </Button>
                        </Form.Upload>
                        <Form.Upload label="监测设备列表" field={s.strucId + "equipmentPicPaths"} style={{ display: 'inline-block', }}
                          initValue={structFind?.equipmentPicPaths && structFind?.equipmentPicPaths?.length ? structFind?.equipmentPicPaths?.map(d => {
                            return { url: `/_file-server/${d?.slice(qiniuUrl.length + 1)}`, name: d?.split('/')?.pop(), status: 'success', preview: ['png', 'jpg', 'jpeg'].includes(d?.split('.')?.pop()?.replace('.', '')) }
                          }) : null}
                          action={`${apiRoot}/attachments/p`}
                          accept={'.png,.jpg,.jpeg'}
                          maxSize={5120}
                          rules={[{ required: true, message: "请上传监测设备列表" }]}
                        >
                          <Button icon={<UploadOutlined />} theme="light">
                            文件上传
                          </Button>
                        </Form.Upload>
                        <Form.Upload label="采集箱布置图" field={s.strucId + "jcbzPicPaths"} style={{ display: 'inline-block', }}
                          initValue={structFind?.jcbzPicPaths && structFind?.jcbzPicPaths?.length ? structFind?.jcbzPicPaths?.map(d => {
                            return { url: `/_file-server/${d?.slice(qiniuUrl.length + 1)}`, name: d?.split('/')?.pop(), status: 'success', preview: ['png', 'jpg', 'jpeg'].includes(d?.split('.')?.pop()?.replace('.', '')) }
                          }) : null}
                          action={`${apiRoot}/attachments/p`}
                          accept={'.png,.jpg,.jpeg'}
                          maxSize={5120}
                        >
                          <Button icon={<UploadOutlined />} theme="light">
                            文件上传
                          </Button>
                        </Form.Upload>
                        </>
                        )}
                        {/* <Form.Input field={s.strucId + "conclusion"} label='结论' style={{ width: 390 }} autosize={{ minRows: 2, maxRows: 10 }} placeholder="请输入结论" allowClear
                                                initValue={eidtData?.structList?.find(d => d.structId == s.strucId)?.conclusion || ""}
                                            // rules={[{ required: true, message: "请输入结论" }]}
                                            /> */}
                        {/* <Form.DatePicker field={s.strucId + 'reportTime'} label='开始结束时间' type='dateTimeRange' allowClear
                                                initValue={structFind?.reportStartTime && [moment(structFind?.reportStartTime).format('YYYY-MM-DD HH:mm:ss'), moment(structFind?.reportEndTime).format('YYYY-MM-DD HH:mm:ss')] || null} style={{ width: 390 }}
                                                rules={[{ required: true, message: "请选择开始结束时间" }]}
                                            /> */}
                        <Form.Select label="监测因素" 
                          field={s.strucId + "factorId"} 
                          placeholder="请选择监测因素" 
                          allowClear 
                          style={{ width: 300 }} 
                          filter
                          // value={[0]}
                          multiple={true}
                          //回显的初始值判断是否全选，选项置换为0(页面显示全选)
                          initValue={(structFind?.factor?.length&&(structFind?.factors || []).length===(s.factor || []).length)? [0] : (structFind?.factors || []).map(d => d.codeName)}
                          rules={[{ required: true, message: "请选择监测因素" }]} disabled={structId ? false : true}
                          onChange={v => {
                            timer && clearTimeout(timer);
                            const newFactorList = [{id: 0, name: '全部'}, ...s.factor];
                            const allOptionIds = newFactorList
                              .map(item => item.id)
                              .filter(id => id !== 0);

                            const updateSelection = (selectedIds, filterCondition) => {
                              timer = setTimeout(() => {
                                form.current.setValue(s.strucId + "factorId", selectedIds);
                              }, 0);
    
                              setFactorChech({
                                ...factorChech,
                                [s.strucId]: s.factor?.filter(filterCondition) || []
                              });
                            };

                            if(v.includes(0)) {
                              if(v.length === 1 || allOptionIds.every(id => v.includes(id)) || v[v.length - 1] === 0) {
                                updateSelection([0], d => true);
                              } else {
                                updateSelection(
                                  v.filter(id => id !== 0),
                                  d => v.includes(d.id)
                                );
                              }
                            } else {
                              const isAllSelected = allOptionIds.every(id => v.includes(id));
                              if(isAllSelected) {
                                updateSelection([0], d => true);
                              } else {
                               updateSelection(v, d => v.includes(d.id));
                              }
                            }
                          }}
                          >
                          {((s.factor || []).length?([...[{
                            id:0,
                            name: '全部'
                          }],...s.factor]):[])?.map((item) => {
                            return <Select.Option value={item.id} key={item.id} label={item.name}></Select.Option>
                          })}
                        </Form.Select>

                        {factorChech[s.strucId] ? <Collapse style={{ margin: '20px 0 0 30px', width: '90%', background: '#b7c9e624' }}
                          // activeKey={activeKey}
                          keepDOM={true}
                          onChange={v => {
                            // setActiveKey(v)
                          }}
                        >
                          {
                            factorChech[s.strucId]?.map(p => {
                              let factorFind = structFind?.factors?.find(c => c.codeName == p.id) || {}
                              return <Collapse.Panel header={p.name} itemKey={p.id + ''} key={p.id}>
                                <div style={{ background: "#FFF" }}>
                              {reportType !== '事件响应报告' &&
                                (<>
                                  <Form.Upload label="布点图" field={s.strucId + 'struc' + p.id + "pointPicPath"} style={{ display: 'inline-block', }}
                                    initValue={factorFind?.pointPicPath &&
                                      factorFind?.pointPicPath?.length ? factorFind?.pointPicPath?.map(d => {
                                        return { url: `/_file-server/${d?.slice(qiniuUrl.length + 1)}`, name: d?.split('/')?.pop(), status: 'success', preview: ['png', 'jpg', 'jpeg'].includes(d?.split('.')?.pop()?.replace('.', '')) }
                                      }) : null}
                                    rules={[{ required: true, message: "请上传布点图" }]}
                                    action={`${apiRoot}/attachments/p`}
                                    accept={'.png, .jpg, .jpeg'}
                                    // limit={1} 
                                    maxSize={5120}
                                  >
                                    <Button icon={<UploadOutlined />} theme="light">
                                      文件上传
                                    </Button>
                                    {/* <Button onClick={(e)=>{
                                                                        e.stopPropagation();
                                                                        addDescription(s.strucId,p.id)
                                                                    }} style={{ marginLeft: '10px' }}>+</Button>  */}
                                  </Form.Upload>
                                  <Form.Input field={s.strucId + 'struc' + p.id + "pointDescribe"}
                                    label='布点描述' style={{ width: 340 }}
                                    autosize={{ minRows: 2, maxRows: 10 }}
                                    placeholder="请输入布点描述"
                                    initValue={factorFind?.pointDescribe || ""}
                                  // rules={[{ required: true, message: "请输入布点描述" }]}
                                  />
                                  <Form.DatePicker field={s.strucId + 'struc' + p.id + 'releStartTimeEndTime'} label='拟合开始结束时间' type='dateTimeRange' allowClear style={{ width: 360 }}
                                    initValue={factorFind?.releStartTime && [moment(factorFind?.releStartTime).format('YYYY-MM-DD HH:mm:ss'), moment(factorFind?.releEndTime).format('YYYY-MM-DD HH:mm:ss')] || null}
                                  // rules={[{ required: true, message: "请选择拟合开始结束时间" }]}
                                  />
                                  {s.proto == 2001 &&
                                    <Form.Input field={s.strucId + 'struc' + p.id + "factorDescrip"} label='索力监测描述' style={{ width: 400 }} autosize={{ minRows: 2, maxRows: 10 }} placeholder="请输入布点描述" allowClear
                                      initValue={factorFind?.factorDescrip || ""}
                                    />
                                  }</>)}
                                  <Form.Select label="测点选择" field={s.strucId + 'struc' + p.id + "sensorNames"} multiple={true} placeholder="请选择测点选择" style={{ width: 280 }} allowClear filter
                                    //回显的初始值判断是否全选，选项置换为0(页面显示全选)
                                    initValue={(factorFind?.sensorNames || []).map(d => d.id)}
                                    rules={[{ required: true, message: "请选择测点选择" }]}
                                    onChange={v => {
                                              const key = s.strucId + 'struc' + p.id + "sensorNames";
                                              timer && clearTimeout(timer);
                                              timer = setTimeout(() => {
                                                form.current.setValue(key, v);
                                                setFactorChech({
                                                  ...factorChech,
                                                  [s.strucId]: factorChech[s.strucId].map(f => {
                                                    if (f.id === p.id) {
                                                      return {
                                                        ...f,
                                                        selectedSensors:p.sensor.filter(s => v.includes(s.id))
                                                      };
                                                    }
                                                    return f;
                                                  })
                                                })
                                              }, 0);
                                          }}
                                    outerBottomSlot={
                                      <p style={{ margin: "6px 26px" }}>
                                        <Button 
                                          theme="borderless" 
                                          onClick={() => {
                                            const key = s.strucId + 'struc' + p.id + "sensorNames";
                                            const allOptionIds = p.sensor.map(item => item.id);
                                            form.current.setValue(key, allOptionIds);
                                            setFactorChech({
                                              ...factorChech,
                                              [s.strucId]: factorChech[s.strucId].map(f => {
                                                if (f.id === p.id) {
                                                  return {
                                                    ...f,
                                                    selectedSensors: p.sensor
                                                  };
                                                }
                                                return f;
                                              })
                                            });
                                          }}
                                        >
                                          所有测点
                                        </Button>
                                        <Button 
                                          theme="borderless" 
                                          onClick={() => {
                                            const key = s.strucId + 'struc' + p.id + "sensorNames";
                                            form.current.setValue(key, []);
                                            setFactorChech({
                                              ...factorChech,
                                              [s.strucId]: factorChech[s.strucId].map(f => {
                                                if (f.id === p.id) {
                                                  return {
                                                    ...f,
                                                    selectedSensors: []
                                                  };
                                                }
                                                return f;
                                              })
                                            });
                                          }}
                                        >
                                          取消选择
                                        </Button>
                                      </p>
                                    }
                                  >
                                    {(p.sensor || []).map((item) => {
                                      return <Select.Option key={item.id} value={item.id} label={item.name}></Select.Option>
                                    })}
                                  </Form.Select>
                                  {/* radio 选择实时数据还是聚集数据 */}
                                  <Form.Radio
                                  rules={[{ required: true, message: "请选择数据类型" }]}
                                  initValue={factorFind?.dataType || 1001}
                                  onChange={(v) => {
                                    setFactorChech({
                                      ...factorChech,
                                      [s.strucId]: factorChech[s.strucId]?.map(f => {
                                        if (f.id == p.id) {
                                          return {
                                            ...f,
                                            dataType: v.target.value
                                          }
                                        }
                                        return f;
                                      })
                                    })
                                  }}
                                  options={[
                                    {
                                      label: '实时数据',
                                      value: 1001,
                                    },
                                    {
                                      label: '聚集数据',
                                      value: 1002,
                                    },
                                  ]}
                                  field={s.strucId +'struc' + p.id + "dataType"}
                                   label='数据类型' 
                                   style={{ width: 300 }}>
                                  </Form.Radio>
                                  {/*选择聚集数据需要选择【聚集方式】、【数据格式*/}
                                  {
                                    (p.dataType==1002) &&
                                    <div>
                                      <Form.Select label="聚集方式" field={s.strucId +'struc' + p.id + "aggrMethod"} 
                                      placeholder="请选择聚集方式" 
                                      style={{ width: 280 }} allowClear
                                        initValue={factorFind?.aggrMethod}
                                        rules={[{ required: true, message: "请选择聚集方式" }]}
                                        options={[
                                          {value:'10min',label:'10min'},{value:'30min',label:'30min'},{value:'1h',label:'1h'},{value:'3h',label:'3h'},
                                          {value:'6h',label:'6h'},{value:'12h',label:'12h'},{value:'day',label:'天'},{value:'week',label:'周'},
                                        ]}
                                      >
                                       
                                      </Form.Select>
                                      <Form.Select label="数据格式" field={s.strucId +'struc' + p.id + "dataFormat"} 
                                    
                                      placeholder="请选择数据格式" 
                                      style={{ width: 280 }} 
                                      allowClear
                                        initValue={factorFind?.dataFormat}
                                        options={[
                                          {value:'avg',label:'平均值'},{value:'max',label:'最大值'},{value:'min',label:'最小值'},{value:'median',label:'中值'},
                                        ]}
                                        rules={[{ required: true, message: "请选择数据格式" }]}
                                      >
                        
                                      </Form.Select>
                                    </div>
                                  }
                                  {currentSectionableFactors.includes(p.proto+'') &&
                                  <Form field={s.strucId + 'struc' + p.id + "sensorSections"} initValue={factorFind?.sensorSections || []}>
                                    {({ add, arrayFields, addWithInitValue }) => (<>
                                      <Button icon={<PlusOutlinedCircle />} onClick={add} style={{ marginLeft: 16 }}>截面分组</Button>
                                      {arrayFields.map(({ field, key, remove }, arrayFieldsIdx) => {
                                      let selectedSensors = form.current.getValue(s.strucId +'struc' + p.id + "sensorNames")
                                        return (
                                        <div key={key} style={{ display: 'flex', alignItems: 'center', background: '#fff' }}>
                                          <Form.Input
                                            field={`${field}.sectionName`}
                                            label={`名称`} labelWidth={60} placeholder="输入截面名称"
                                            style={{ width: 120, marginRight: 8 }}
                                            rules={[{ required: true, message: `请输入截面名称` }]}
                                            validate={(val) => {
                                              if (!val) return '请输入截面名称';
                                              function findFirstDuplicateName(array) {
                                                const seen = new Set();
                                                for (const item of array) {
                                                  if (seen.has(item.sectionName)) {
                                                    return item.sectionName;
                                                  }
                                                  seen.add(item.sectionName);
                                                }
                                                return null;
                                              }
                                              const sensorSections = form.current.getValue(s.strucId + 'struc' + p.id + "sensorSections")
                                              const duplicateName = findFirstDuplicateName(sensorSections)
                                              if (duplicateName && duplicateName === val) return '截面名称不能重复';
                                              return '';
                                            }}
                                          />
                                          <Form.Select
                                            field={`${field}.sensors`}
                                            label="测点" labelWidth={60}
                                            multiple={true} placeholder="请选择测点" style={{ width: 130 }} allowClear filter
                                            rules={[{ required: true, message: "请选择测点" }]}
                                            validate={(val) => {
                                              if (!val?.length) return '请选择测点';
                                              let sensorNames = form.current.getValue(s.strucId + 'struc' + p.id + "sensorNames")
                                              if(sensorNames.includes(0)&&sensorNames.length==1){
                                                sensorNames = p.sensor.map(item => item.id)
                                              }
                                              const sensorSections = form.current.getValue(s.strucId + 'struc' + p.id + "sensorSections")
                                              const every = sensorNames.every(s => {
                                                let has = false
                                                for (let section of sensorSections) {
                                                  if (section?.sensors?.includes(s)) {
                                                    has = true
                                                  }
                                                }
                                                return has
                                              })
                                              if (!every) return '分组需包含全部已选测点';
                                              return '';
                                            }}
                                          >
                                            {

                                            selectedSensors&&selectedSensors.length&&
                      selectedSensors[0] == 0 ? 
                      p.sensor
                      ?.filter(item => !form.current.getValue(s.strucId + 'struc' + p.id + "sensorSections")?.find((c, i) => c?.sensors?.includes(item.id) && i !== arrayFieldsIdx))
                      .map((item) => <Select.Option key={item.id} value={item.id} label={item.name} />)
                    : 
                                            p.sensor
                                              ?.filter(item => form.current.getValue(s.strucId + 'struc' + p.id + "sensorNames")?.includes(item.id))
                                              .filter(item => !form.current.getValue(s.strucId + 'struc' + p.id + "sensorSections")?.find((c, i) => c?.sensors?.includes(item.id) && i !== arrayFieldsIdx))
                                              .map((item) => <Select.Option key={item.id} value={item.id} label={item.name} />)
                                              }
                                          </Form.Select>
                                          <Button
                                            type='danger'
                                            icon={<MinusCircleOutlined />}
                                            onClick={remove}
                                            style={{ marginLeft: 8 }}
                                          />
                                          <Button icon={<PlusOutlinedCircle />} onClick={add} style={{ marginLeft: 8 }} />
                                        </div>
                                      )})}
                                    </>)}
                                  </Form>}
                               
                                  {/* <Form.DatePicker field={s.strucId + 'struc' + p.id + 'startEndTime'} label='开始结束时间' type='dateTimeRange' allowClear style={{ width: 360 }}
                                                                    initValue={factorFind?.startTime && [moment(factorFind?.startTime).format('YYYY-MM-DD HH:mm:ss'), moment(factorFind?.endTime).format('YYYY-MM-DD HH:mm:ss')] || null}
                                                                    rules={[{ required: true, message: "请选择开始结束时间" }]}
                                                                /> */}
                                    {
                                    [ '4004', '4007', '4008'].includes(p.proto) && reportType !== '事件响应报告' &&
                  
                                    <Form.DatePicker field={s.strucId + 'struc' + p.id + 'initialTime'} label='数据初始时间' type='dateTime' allowClear
                                      // rules={[{ required: true, message: "请选择数据初始时间" }]}
                                      initValue={factorFind?.initialTime && moment(factorFind?.initialTime).format('YYYY-MM-DD HH:mm:ss')}
                                    />
                                  }                              
                                  {
                                    //数据初始时间、初始索力值只能2选1
                                    ['2001'].includes(p.proto) && <Form.Radio
                                        field={s.strucId +'struc' + p.id + "initialType"}
                                        label='数据初始时间、初始索力值'
                                        rules={[{ required: true, message: "请选择数据初始时间、初始索力值" }]}
                                        initValue={factorFind?.initialType || 'initialTime'}
                                        onChange={(v) => {
                                          setFactorChech({
                                           ...factorChech,
                                            [s.strucId]: factorChech[s.strucId]?.map(f => {
                                              if (f.id == p.id) {
                                                return {
                                                 ...f,
                                                  initialType: v.target.value,
                                                }
                                              }
                                              return f;
                                            })
                                          })
                                        }}
                                        options={[
                                          {
                                            label: '数据初始时间',
                                            value: 'initialTime',
                                          },
                                          {
                                            label: '初始索力值',
                                            value: 'initialForce',
                                          },
                                        ]}
                                     >
                                      
                                     </Form.Radio>
                                     
                                    // ['2001', '4004', '4007', '4008'].includes(p.proto) &&
                                    // <Form.DatePicker field={s.strucId + 'struc' + p.id + 'initialTime'} label='数据初始时间' type='dateTime' allowClear
                                    //   // rules={[{ required: true, message: "请选择数据初始时间" }]}
                                    //   initValue={factorFind?.initialTime && moment(factorFind?.initialTime).format('YYYY-MM-DD HH:mm:ss')}
                                    // />
                                  }
                                  {
                                    (['2001'].includes(p.proto) &&
                                    (p.initialType == 'initialTime' || form.current.getValue(s.strucId +'struc' + p.id + "initialType")==='initialTime'))?
                                    <Form.DatePicker field={s.strucId + 'struc' + p.id + 'initialTime'} label='数据初始时间' type='dateTime' allowClear
                                      rules={[{ required: true, message: "请选择数据初始时间" }]}
                                      initValue={factorFind?.initialTime && moment(factorFind?.initialTime).format('YYYY-MM-DD HH:mm:ss')}
                                    />:p.initialType == 'initialForce'&&((p.selectedSensors?.length &&p.selectedSensors) || p.sensorNames)?.map(sensorItem=>{
                                      return <Form.InputNumber
                                        rules={[{ required: true, message: "请输入初始索力值" }]}
                                        field={s.strucId +'struc' + p.id +'initialForceList' + sensorItem.id} 
                                        label={sensorItem.name }
                                        initValue={sensorItem?.value}
                                        suffix={'kN'} min={0} precision={3} allowClear
                                      />
                                    })
                                    
                                  }
                                     {/*挠度*/}
                                     {
deflection.includes(p.proto) && <Form
  field={s.strucId + 'struc' + p.id + "deflectionSections"} 
  initValue={factorFind?.deflectionSections?.map(section => {
    // console.log('xxxsection',section.deflectionTimes);
    return {
      deflectionName: section.deflectionName,
      sensorAndDistance: section.sensorAndDistance || [],
      deflectionTimes: (section.deflectionTimes || [])
    }
    
  }) || []}
>
  {({ add, arrayFields, addWithInitValue }) => (<>
    <Button icon={<PlusOutlinedCircle />} onClick={add} style={{ marginLeft: 16 }}>挠曲线</Button>

    {arrayFields.map(({ field, key, remove }, arrayFieldsIdx) => (
      <div key={key}>
        <div style={{display:'flex', alignItems: 'center', background: '#fff'}}>
          <Form.Input
            field={`${field}.deflectionName`}
            label={`名称`}  
            // initValue={factorFind?.deflectionSections?.[arrayFieldsIdx]?.deflectionName}
            placeholder="输入挠曲线名称"
            labelWidth={60}
            style={{ width: 130, marginRight: 8 }}
            rules={[{ required: true, message: `请输入挠曲线名称` }]}
            validate={(val) => !val ? '请输入挠曲线名称' : ''}
          />
          <Button type='danger' icon={<MinusCircleOutlined />} onClick={remove} style={{ marginLeft: 8 }} />
          {/* <Button icon={<PlusOutlinedCircle />} onClick={add} style={{ marginLeft: 8 }} /> */}
        </div>

        <Form 
          field={`${field}.sensorAndDistance`}
          // initValue={factorFind?.deflectionSections?.[arrayFieldsIdx]?.sensorAndDistance?.map. }
        >
          {({ add: addSensor, arrayFields: sensorFields,  }) => (
            <>
              {/* Add a default sensor and date group when adding a new deflection curve */}
              {sensorFields.length === 0 && addSensor()}
              
              {/* <div style={{display: 'flex', marginLeft: 16, marginBottom: 8}}>
                <Button onClick={addSensor}>添加测点和距离组</Button>
                <Button onClick={addTime} style={{marginLeft: 8}}>添加取值日期组</Button>
              </div> */}
              
              {sensorFields.map(({field: sensorField, key: sensorKey,remove: removeSensor}, sensorIdx) => {
                let selectedSensors = form.current.getValue(s.strucId +'struc' + p.id + "sensorNames")                                  
               return  <div key={sensorKey} style={{display:'flex', alignItems: 'center', background: '#fff', marginTop: 8}}>
                  <Form.Select
                    field={`${sensorField}.sensors`}
                    // inintValue={factorFind?.deflectionSections?.[arrayFieldsIdx]?.sensorAndDistance?.[sensorIdx]?.sensors}
                    label="测点" 
                    labelWidth={60}
                    // multiple={true}
                    placeholder="请选择测点" 
                    style={{ width: 130 }}
                    allowClear
                    filter
                    rules={[{ required: true, message: "请选择测点" }]}
                  >
                    {selectedSensors&&selectedSensors.length&&
                     selectedSensors[0] == 0 ? p.sensor .map((item) => (
                      <Select.Option key={item.id} value={item.id} label={item.name} />
                    )) : 
                    p.sensor
                      ?.filter(item => form.current.getValue(s.strucId + 'struc' + p.id + "sensorNames")?.includes(item.id))
                      .map((item) => (
                        <Select.Option key={item.id} value={item.id} label={item.name} />
                      ))}
                  </Form.Select>

                  <Form.InputNumber
                    field={`${sensorField}.distance`}
                    // initValue={factorFind?.deflectionSections?.[arrayFieldsIdx]?.sensorAndDistance?.[sensorIdx]?.distance}
                    precision={4}
                    min={0}
                    labelWidth={60}
                    label={`距离`}
                    placeholder="输入距离"
                    style={{width:120, marginLeft: 8}}
                    rules={[{ required: true, message: `请输入距离` }]}
                  />
                  <Button  icon={<PlusOutlinedCircle />} onClick={addSensor} style={{marginLeft: 8}} />
                  <Button type='danger' icon={<MinusCircleOutlined />} onClick={()=> removeSensor(sensorIdx)} style={{marginLeft: 8}} />
                </div>
                            })}
            </>
          )}
        </Form>

        <Form
          field={`${field}.deflectionTimes`} 
          // initValue={factorFind?.deflectionSections?.[arrayFieldsIdx]?.deflectionTimes?.map(item=>moment(item.deflectionTimes).format('YYYY-MM-DD HH:mm:ss')) || []}
        >
          {({ add: addTime, arrayFields: timeFields,addWithInitValue:addTimeInitVal }) => (
            <>
            {/* {addTimeInitVal(factorFind?.deflectionSections?.[arrayFieldsIdx]?.deflectionTimes?.[timeIdx]&&moment(factorFind?.deflectionSections?.[arrayFieldsIdx]?.deflectionTimes?.[timeIdx]).format('YYYY-MM-DD'))} */}
            {timeFields.length === 0 && addTime()}
              {timeFields.map(({field: timeField, key: timeKey, remove: removeTime}, timeIdx) => {
                
                return (
                  <div key={timeKey} style={{display:'flex', alignItems: 'center', background: '#fff', marginTop: 8}}>
                    <Form.DatePicker
                      field={timeField} 
                      // inintValue={}
                      label='取值日期'
                      type='date'
                      allowClear
                      labelWidth={88}
                      style={{width: 300}}
//                       validate={(value) => {
//   //同组内时间不能重复 
//   const sensorSections = form.current.getValue(s.strucId +'struc' + p.id + "deflectionSections")
//   const sensorSectionsIdx = arrayFieldsIdx;
//   const sensorSectionsTime = sensorSections[sensorSectionsIdx]?.deflectionTimes
//   const timeTimesObj=sensorSectionsTime.reduce((p, c) => {
//     let formatVal=moment(c).format('YYYY-MM-DD');
//     if (p[formatVal]) {
//       p[formatVal] += 1;
//     }else{
//       p[formatVal] = 1;
//     }
//     return p;
//   }, {});
// for(let key in timeTimesObj){
//   if(timeTimesObj[key]>1){
//     return '同组内时间不能重复';
//   }
// }

// const timeFields = value[s.strucId + 'struc' + p.id + "deflectionSections"]?.map((_, index) => 
//   `${s.strucId}struc${p.id}deflectionSections[${index}].time`
// );

// form.current.validateFields([
//   s.strucId + 'struc' + p.id + "deflectionSections",
//   ...(timeFields || [])
// ]);
//   return '';
//                       }}
                      rules={[{ required: true, message: "请选择取值日期" },
                       
                      ]}
                    />
                    <Button icon={<PlusOutlinedCircle />} onClick={addTime} style={{marginLeft: 8}} />
                    <Button type='danger' icon={<MinusCircleOutlined />} onClick={()=>removeTime(timeIdx)} style={{marginLeft: 8}} />
                  </div>
                )
              })}
            </>
          )}
        </Form>
      </div>
    ))}
  </>)}
</Form>
                                  }
                                  {'2002' == p.proto && <> {/* 2002:车辆载荷监测 */}
                                    <Form.InputNumber
                                      field={s.strucId + 'struc' + p.id + 'speedLimit'} label='限速值'
                                      initValue={factorFind?.speedLimit}
                                      suffix={'km/h'} min={0} precision={0} allowClear
                                    />
                                    <Form.InputNumber
                                      field={s.strucId + 'struc' + p.id + 'weightLimit'} label='限重值'
                                      initValue={factorFind?.weightLimit}
                                      suffix={'t'} min={0} precision={0} allowClear
                                    />
                                  </>}
                                  {
                                    ['4009', '3001', '3003', '4004', '4001', '4007'].includes(s.proto) && <>
                                      <Form.Select label="关联温度的测点" field={s.strucId + 'struc' + p.id + "tempName1"} allowClear placeholder="请选择关联的温度测点" style={{ width: 300 }} filter
                                        initValue={factorFind?.tempName?.find(c => c.index == 1)?.id || ""}
                                        onChange={v => {

                                        }}
                                      >
                                        {p.sensor?.map((item) => {
                                          return <Select.Option value={item.id} label={item.name}></Select.Option>
                                        })}
                                      </Form.Select>
                                      <Form.Select label="温度测点" field={s.strucId + 'struc' + p.id + "tempName2"} placeholder="请选择温度测点" style={{ width: 300 }} filter allowClear
                                        initValue={factorFind?.tempName?.find(c => c.index == 2)?.id || ""}
                                      >
                                        {s.factors?.find(d => d.proto == 1004 || d.proto == 1002)?.sensor?.map((item) => {
                                          return <Select.Option value={item.name} label={item.name}></Select.Option>
                                        })}
                                      </Form.Select>
                                      <Form.DatePicker field={s.strucId + 'struc' + p.id + 'releTime'} label='关联开始结束时间' type='dateTimeRange' allowClear style={{ width: 360 }}
                                        initValue={factorFind?.releStartTime && [moment(factorFind?.releStartTime).format('YYYY-MM-DD HH:mm:ss'), moment(factorFind?.releEndTime).format('YYYY-MM-DD HH:mm:ss')] || null}
                                      />
                                    </>
                                  }
                                </div>
                              </Collapse.Panel>
                            })
                          }
                        </Collapse> : ""}
                      </div>
                    </Collapse.Panel>
                  })
                }


              </Collapse> : "请选择结构物"}
            </div> : ''
            }
          </div>

        </Form>
      </Modal >
    </>
  );
}
function mapStateToProps(state) {
  const { auth, global, members } = state;

  return {
    //   loading: members.isRequesting,
    user: auth.user,
    actions: global.actions,
    apiRoot: global.apiRoot,
    qiniuUrl: global.qiniu?.domain
  };
}

export default connect(mapStateToProps)(AutomaticModal);
