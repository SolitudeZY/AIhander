import React, { Children, useEffect, useState } from "react";
import { connect } from "react-redux";
import { Button, Table, Spin, Select, Input, Switch, message } from "antd";
import FirmwareListModal from "./firmwareListModal";

const AnxinCloud = (props) => {
  const {
    actions,
    dispatch,
    pepProjectId,
    user,
    loading,
    strucAndDeviceType,
    struc,
    thingIds,
    vData,
    platform,
  } = props;
  const { firmwareUpgrade } = actions;
  const [updataButtonDisabled, setUpdataButtonDisabled] = useState(true); //批量升级的按钮的显示与隐藏
  const [firmwareModalVis, setFirmwareModalVis] = useState(false);
  // const [strucAndDeviceType, setStrucAndDeviceType] = useState([])//
  // const [struc, setStruc] = useState([])//
  const [deviceType, setDeviceType] = useState([]); //设备类型的optionList
  const [data, setData] = useState([]); //列表数据
  // const [thingIds, setThingIds] = useState([])//结构物id数组
  const [defaultVal, setDefaultVal] = useState(""); //设备类型id
  const [thingId, setThingId] = useState(); //单个结构物id
  const [searchVal, setSearchVal] = useState(); //搜索框值
  const [recordRow, setRecordRow] = useState();
  const [selectedRows, setSelectedRows] = useState([]); //选择的key
  const [selectdR, setSelectedR] = useState([]); //选择行
  // const [vData, setVData] = useState([])//版本信息
  const [id, setId] = useState(); //初始化展示的结构物
  const getData = (data) => {
    dispatch(firmwareUpgrade.getThingMessages(data)).then((res) => {
      if (res.success) {
        setData(res.payload.data);
      }
    });
  };
  // //测试
  // useEffect(() => {
  //     //结构物和设备类型
  //     dispatch(firmwareUpgrade.getStruc({ pepProjectId })).then((res) => {
  //         if (res.success) {
  //             setStrucAndDeviceType(res.payload.data)
  //             setStruc(res.payload.data?.map(item => {
  //                 return { label: item.strucName, value: item.thingId }
  //             }))
  //             setThingIds(res.payload.data?.map(item => item.thingId)?.join(',') || '')
  //         }
  //     })
  //     dispatch(firmwareUpgrade.getFirmware({ tokenup: 'REPLACE_WITH_FIRMWARE_OPERATION_TOKEN' })).then(res => {
  //         if (res.success) setVData(res.payload.data)
  //     })
  // }, [pepProjectId])
  useEffect(() => {
    setData([]);
    setId(null);
    if (thingIds && thingIds.length) {
      const data = { thingIds: thingIds.split(",")[0] || "000" }; //给一个初始化的值
      setId(thingIds.split(",")[0]);
      setThingId(thingIds.split(",")[0]);
      getData(data);
    }
  }, [thingIds]);
  const structChange = (value) => {
    setId(value);
    clearSelectedRows();
    setUpdataButtonDisabled(true);
    const deviceTypeList =
      strucAndDeviceType
        ?.find((item) => item.thingId == value)
        ?.deviceType?.map((child) => {
          return {
            label: child.model,
            value: child.id,
          };
        }) || [];
    setDefaultVal("");
    setDeviceType(deviceTypeList);
    setThingId(value);
    const data = { thingIds: value, device_meta_id: defaultVal };
    getData(data);
  };
  const deviceTypeChange = (value) => {
    setUpdataButtonDisabled(true);
    clearSelectedRows();
    setDefaultVal(value);
    const data = { thingIds: thingId, device_meta_id: value };
    if (thingId !== undefined && value !== undefined) {
      getData(data);
    }
  };
  //清除结构物的逻辑
  const clearHandler = () => {
    setUpdataButtonDisabled(true);
    clearSelectedRows();
    const data = { thingIds };
    getData(data);
  };
  //清楚设备类型的逻辑
  const cleartypeHandler = () => {
    setUpdataButtonDisabled(true);
    clearSelectedRows();
    setDefaultVal(null);
  };
  //搜索按钮的逻辑
  const searchHandler = () => {
    if (!thingId && !defaultVal) {
      const data = { thingIds };
      getData(data);
    } else {
      const data = { thingIds: thingId, device_meta_id: defaultVal, searchVal };
      getData(data);
    }
  };
  const clearSelectedRows = () => {
    setSelectedRows([]);
  };
  const rowSelection = {
    selectedRowKeys: selectedRows, // 已选择的行的 keys
    getCheckboxProps: (record) => ({
      name: record.name,
    }),

    // onSelect: (record, selected) => {
    // },
    onSelectAll: (selected, selectedRows) => {
      setUpdataButtonDisabled(
        !selectedRows.every(
          (item) =>
            selectedRows[0]?.deviceType === item.deviceType && item.switchStatus
        )
      );
    },
    onChange: (selectedRowKeys, selectedRows) => {
      setSelectedR(selectedRows);
      setSelectedRows(selectedRowKeys);
      //选择之后，清空选择
      if (selectedRows && selectedRows.length === 0) {
        setUpdataButtonDisabled(true);
      }
      //选择很多的时候，如果有设备型号不对应的情况
      if (selectedRows && selectedRows.length > 0) {
        setUpdataButtonDisabled(
          !selectedRows.every(
            (item) =>
              selectedRows[0].deviceType === item.deviceType &&
              item.switchStatus
          )
        );
      }
    },
  };

  let columns = [
    {
      title: "序号",
      render: (t, r, i) => {
        return i + 1;
      },
    },
    {
      title: "设备名称",
      dataIndex: "deviceName",
    },
    {
      title: "设备型号",
      dataIndex: "deviceType",
    },
    {
      title: "固件名称",
      dataIndex: "firmwareName",
    },
    {
      title: "固件版本号",
      dataIndex: "firmwareNo",
    },
    {
      title: "升级状态",
      render: (_, record) => {
        return record.status;
      },
    },
    {
      title: "升级开关状态",
      dataIndex: "switchStatus",
      render: (_, record) => {
        return (
          <Switch
            disabled
            defaultChecked={JSON.parse(record.switchStatus)}
          ></Switch>
        );
      },
    },
    {
      title: "操作",
      render: (_, record) => {
        return (
          <div>
            <Button
              type="secondary"
              onClick={() => {
                if (record.switchStatus) {
                  if (record.status !== "升级中") {
                    setFirmwareModalVis(true);
                    setRecordRow([record]);
                  } else {
                    message.info("该设备仍在升级中，请在完成升级后再操作。");
                  }
                } else {
                  message.info(`请到${platform}平台打开升级开关后进行升级。`);
                }
              }}
            >
              固件升级
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <Spin spinning={loading}>
      <div
        style={{
          background: "#FFFFFF",
          margin: "8px 12px",
          padding: "20px 20px 0px 20px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center" }}>
          <div
            style={{ display: "flex", alignItems: "center", marginRight: 30 }}
          >
            <div
              style={{
                width: 0,
                height: 20,
                borderLeft: "3px solid #005ABD",
                borderTop: "3px solid transparent",
                borderBottom: "3px solid transparent",
              }}
            ></div>
            <div
              style={{
                fontFamily: "YouSheBiaoTiHei",
                fontSize: 24,
                color: "#101531",
                marginLeft: 8,
              }}
            >
              设备管理
            </div>
            <div
              style={{
                marginLeft: 6,
                fontSize: 12,
                color: "#969799",
                fontFamily: "DINExp",
              }}
            >
              Device Management
            </div>
          </div>
          <Select
            placeholder="请选择结构物"
            options={struc}
            filter={
              true
              //     (sugInput, option)=>{
              //     if(sugInput){
              //         console.log('option?.props?.children',option?.label?.props?.children,sugInput)
              //         if(option?.label?.props?.children?.includes(sugInput)){
              //             return true

              //         }else{
              //             return false

              //         }
              //     }else{
              //         return true
              //     }

              // }
            }
            allowClear={false}
            onChange={structChange}
            onClear={clearHandler}
            value={id} // 设置默认值为第一个选项的值
            style={{ width: 300, marginRight: 10 }}
          ></Select>
          <Select
            placeholder="请选择设备型号"
            value={defaultVal}
            options={deviceType}
            onClear={cleartypeHandler}
            onChange={deviceTypeChange}
            filter
            allowClear
            style={{ width: 300, marginRight: 10 }}
          ></Select>
          <Button
            style={{ marginRight: 10 }}
            type="secondary"
            disabled={updataButtonDisabled}
            onClick={() => {
              setFirmwareModalVis(true);
              setRecordRow(selectdR);
            }}
          >
            固件升级
          </Button>
          <Input
            placeholder="请输入设备名称"
            style={{ width: 300, marginRight: 10 }}
            onChange={(e) => {
              setSearchVal(e);
            }}
          ></Input>
          <Button
            style={{ marginRight: 10 }}
            type="secondary"
            theme="solid"
            onClick={searchHandler}
          >
            查询
          </Button>
        </div>
        <div style={{ marginTop: 10 }}>
          <Table
            columns={columns}
            rowSelection={rowSelection}
            dataSource={data}
          ></Table>
          <FirmwareListModal
            vData={vData}
            versionData={data}
            modalVis={firmwareModalVis}
            recordRow={recordRow}
            onCancel={() => {
              setFirmwareModalVis(false);
              setRecordRow(null);
            }}
          ></FirmwareListModal>
        </div>
      </div>
    </Spin>
  );
};

function mapStateToProps(state) {
  const { auth, global, getPush, structAndDeviceType } = state;
  return {
    loading: structAndDeviceType.isRequesting,
    user: auth.user,
    actions: global.actions,
    pepProjectId: global.pepProjectId,
  };
}

export default connect(mapStateToProps)(AnxinCloud);
