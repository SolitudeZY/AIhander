import React, { useEffect, useState, useMemo } from "react";
import { connect } from "react-redux";
import { Alert, Button, Table, Popconfirm, Input, message, Select } from "antd";
import AddFirmwareModal from "../components/addFirmwareModal";
import AddDeviceModelModal from "../components/addDeviceModelModal";
import { createSystemLog } from "../../system/actions/log";
import { getAllUsers } from "../../system/actions/member";
import { isAuthorized } from "$utils";

const TOKEN_UP = "REPLACE_WITH_FIRMWARE_OPERATION_TOKEN"; // 固件操作的token

const FirmwareLibrary = (props) => {
  const { actions, dispatch, loading, user } = props;
  const [modalVis, setModalVis] = useState(false); //添加固件弹框的显示与隐藏
  const [deviceModelModalVis, setDeviceModelModalVis] = useState(false);
  const [deviceTypeRefreshKey, setDeviceTypeRefreshKey] = useState(0); //添加设备型号弹框的显示与隐藏
  const [recordRow, setRecordRow] = useState();
  const [data, setData] = useState([]); //列表数据
  const [searchVal, setSearchVal] = useState(null); //存储搜索框的值
  const [deviceSearchVal, setDeviceSearchVal] = useState(null); //存储设备型号搜索框的值
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  }); //分页信息
  const [deviceMetaNameDict, setDeviceMetaNameDict] = useState([]);
  const [versionDict, setVersionDict] = useState([]);
  const [users, setUsers] = useState([]); //所有用户信息
  const [services, setServices] = useState(null);
  const [serviceError, setServiceError] = useState("");
  const { service, firmwareUpgrade } = actions;
  const getData = (
    query = {},
    page = pagination.current,
    size = pagination.pageSize,
  ) => {
    const params = {
      tokenup: TOKEN_UP,
      current: page,
      pageSize: size,
      ...query,
    };
    dispatch(firmwareUpgrade.getFirmware(params)).then((res) => {
      if (res.success) {
        setData(res.payload.data.data || []);
        setPagination((prev) => ({
          ...prev,
          current: page,
          pageSize: size,
          total: res.payload.data.total || 0,
        }));
      }
    });
  };
  useEffect(() => {
    let active = true;
    // Check dependencies once before starting the legacy service requests.
    dispatch(firmwareUpgrade.getFirmwareCapabilities()).then((res) => {
      if (!active) return;
      if (!res?.success) {
        setServiceError("无法确认固件服务状态，请稍后刷新重试");
        return;
      }
      const capabilities = res.payload.data;
      setServices(capabilities);
      if (!capabilities.firmware) return;
      getData();
      dispatch(firmwareUpgrade.getdeviceMetaNameDict({ tokenup: TOKEN_UP })).then((res) => {
        if (active && res.success) setDeviceMetaNameDict(res.payload.data);
      });
      dispatch(firmwareUpgrade.getVersionDict({ tokenup: TOKEN_UP })).then((res) => {
        if (active && res.success) setVersionDict(res.payload.data);
      });
      dispatch(getAllUsers()).then((res) => {
        if (active && res.success) setUsers(res.payload?.data?.data);
      });
    }).catch(() => { if (active) setServiceError("无法确认固件服务状态，请稍后刷新重试"); });
    return () => { active = false; };
  }, []);

  const searchHandler = () => {
    const query = { version: searchVal, filename: searchVal };
    if (searchVal) query.version = searchVal;
    if (deviceSearchVal) query.deviceMetaName = deviceSearchVal;
    getData(query, 1, pagination.pageSize); // 搜索时重置到第一页
  };

  // 处理分页变化
  const handleTableChange = (pageInfo) => {
    const query = {};
    if (searchVal) query.version = searchVal;
    if (deviceSearchVal) query.deviceMetaName = deviceSearchVal;
    getData(query, pageInfo.currentPage, pageInfo.pageSize);
  };

  const onConfirm = (record) => {
    const query = {
      version: record?.versionNo,
      device_meta_id: record?.device_meta_id,
      tokenup: TOKEN_UP,
    };
    dispatch(firmwareUpgrade.deleteFirmware(query)).then((res) => {
      if (res.success) {
        // 删除后重新加载当前页数据，保持筛选条件
        const searchQuery = {};
        if (searchVal) searchQuery.version = searchVal;
        if (deviceSearchVal) searchQuery.deviceMetaName = deviceSearchVal;
        getData(searchQuery, pagination.current, pagination.pageSize);
        dispatch(
          createSystemLog({
            content: `删除固件包：${record?.firmwareName}`,
            module: "固件库",
            url: window.location.href,
            userId: user?.id || null,
          }),
        );
      }
    });
  };

  const onCancel = () => {
    message.warning("取消删除");
  };
  let columns = [
    {
      title: "序号",
      width: 80,
      align: "center",
      render: (t, r, i) => {
        return i + 1;
      },
    },
    {
      title: "固件名称",
      dataIndex: "firmwareName",
      width: 150,
    },
    {
      title: "设备型号",
      dataIndex: "deviceMetaName",
      width: 120,
    },
    {
      title: "版本号",
      dataIndex: "versionNo",
      width: 120,
      align: "center",
    },
    {
      title: "MD5码值",
      dataIndex: "md5Value",
      width: 220,
      render: (_, record) => {
        return record.md5Value ? (
          <span>{record.md5Value}</span>
        ) : (
          <span style={{ color: "#999" }}>--</span>
        );
      },
    },
    {
      title: "上传时间",
      dataIndex: "uploadTime",
      width: 160,
      align: "center",
    },
    {
      title: "上传人",
      width: 130,
      align: "center",
      render: (_, record) => {
        return (
          <span>
            {users?.find((item) => item.id == record.uploader)?.username ||
              "--"}
          </span>
        );
      },
    },
    {
      title: "备注",
      dataIndex: "comment",
      render: (text) => {
        return text || <span style={{ color: "#999" }}>--</span>;
      },
    },
    {
      title: "固件功能描述",
      dataIndex: "remarks",
      render: (text) => {
        return text || <span style={{ color: "#999" }}>--</span>;
      },
    },
    {
      title: "操作",
      width: 160,
      align: "center",
      render: (_, record) => {
        return (
          <div
            style={{ display: "flex", gap: "8px", justifyContent: "center" }}
          >
            {isAuthorized("EDITFIRMWARE") && (
              <Button
                type="default"
                disabled={!services?.firmware || !services?.deviceTypes}
                onClick={() => {
                  setModalVis(true);
                  setRecordRow(record);
                }}
              >
                编辑
              </Button>
            )}
            {isAuthorized("DELETEFIRMWARE") && (
              <Popconfirm
                title="确定是否要删除？"
                onConfirm={() => onConfirm(record)}
                onCancel={onCancel}
                placement="topRight"
                zIndex={1000}
              >
                <Button type="primary" danger>
                  删除
                </Button>
              </Popconfirm>
            )}
          </div>
        );
      },
    },
  ];
  return (
    <>
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
              固件库
            </div>
            <div
              style={{
                marginLeft: 6,
                fontSize: 12,
                color: "#969799",
                fontFamily: "DINExp",
              }}
            >
              Firmware Library
            </div>
          </div>
          <Select
            placeholder="请选择设备型号"
            style={{ width: 300, marginRight: 10 }}
            value={deviceSearchVal}
            onChange={(value) => {
              setDeviceSearchVal(value);
            }}
            options={deviceMetaNameDict}
            disabled={!services?.firmware}
            showSearch
            allowClear
            notFoundContent="暂无数据"
          />
          <Select
            placeholder="请选择版本号"
            style={{ width: 300, marginRight: 10 }}
            value={searchVal}
            onChange={(value) => {
              setSearchVal(value);
            }}
            options={versionDict}
            disabled={!services?.firmware}
            showSearch
            allowClear
            notFoundContent="暂无数据"
          />
          <Button
            style={{ marginRight: 10 }}
            type="primary"
            disabled={!services?.firmware}
            onClick={searchHandler}
          >
            查询
          </Button>
          {isAuthorized("UPLOADFIRMWARE") && (
            <Button
              color="primary"
              variant="outlined"
              disabled={!services?.firmware || !services?.deviceTypes}
              style={{ marginRight: 10 }}
              onClick={() => {
                setModalVis(true);
              }}
            >
              上传
            </Button>
          )}
          {isAuthorized("ADDDEVICEMODEL") && (
            <Button
              color="primary"
              variant="outlined"
              disabled={!services?.deviceTypes}
              onClick={() => {
                setDeviceModelModalVis(true);
              }}
            >
              添加设备型号
            </Button>
          )}
        </div>
        {serviceError || (services && (!services.firmware || !services.deviceTypes)) ? (
          <Alert
            style={{ marginTop: 16 }} type="warning" showIcon
            message={serviceError || (!services.firmware ? "固件服务未启用，暂时无法查询和上传固件" : "设备型号服务未启用，暂时无法上传固件或添加型号")}
            description={<>完整固件管理需要启用对应平台服务。RK3576 请使用 <a href="/device/edgeDevice/edgeDevices">边缘设备</a> 和 <a href="/device/edgeDevice/visionModels">视觉模型库</a>。</>}
          />
        ) : null}
        <div style={{ marginTop: 20 }}>
          <Table
            columns={columns}
            dataSource={data}
            loading={loading}
            rowKey="id"
            size="middle"
            scroll={{ y: 600 }}
            pagination={{
              current: pagination.current,
              pageSize: pagination.pageSize,
              total: pagination.total,
              showTotal: (total, range) =>
                `第 ${range[0]}-${range[1]} 条/共 ${total} 条`,
              onChange: (current, pageSize) =>
                handleTableChange({
                  currentPage: current,
                  pageSize: pageSize,
                }),
              onShowSizeChange: (current, pageSize) =>
                handleTableChange({
                  currentPage: current,
                  pageSize: pageSize,
                }),
            }}
            style={{
              backgroundColor: "#fff",
            }}
            className="horizontal-border-only"
          />
          {modalVis && services?.firmware && services?.deviceTypes ? <AddFirmwareModal
            modalVis={modalVis}
            recordRow={recordRow}
            firmwareToken={TOKEN_UP}
            deviceTypeRefreshKey={deviceTypeRefreshKey}
            onCancel={() => {
              setSearchVal("");
              setDeviceSearchVal("");
              getData();
              setModalVis(false);
              setRecordRow(null);
            }}
          /> : null}
          {deviceModelModalVis && services?.deviceTypes ? <AddDeviceModelModal
            open={deviceModelModalVis}
            onClose={() => {
              setDeviceModelModalVis(false);
            }}
            onSuccess={() => {
              getData();
              setDeviceTypeRefreshKey((prev) => prev + 1);
            }}
          /> : null}
        </div>
      </div>
    </>
  );
};

function mapStateToProps(state) {
  const { auth, global, firmware } = state;
  return {
    loading: firmware.isRequesting,
    user: auth.user?.userInfo,
    actions: global.actions,
  };
}

export default connect(mapStateToProps)(FirmwareLibrary);
