"use strict";
import React, { useEffect, useState, useRef, useMemo } from "react";
import { connect } from "react-redux";
import {
  Button,
  Table,
  Popconfirm,
  Image,
  Upload,
  message,
  Row,
  Col,
  Divider,
  Input,
  Space,
  notification,
  Modal,
  Select,
  Spin,
  Alert,
} from "antd";
import SubDeviceModal from "./subDeviceModal";
import { CopyOutlined, PlusOutlined } from "@ant-design/icons";
import DeviceConfigModal from "../deviceConfigModal";
import DetailModal from "./detailModal";
import G6 from "@antv/g6";
import { isAuthorized } from "$utils";
import { createSystemLog } from "../../../system/actions/log";
import "../../style.less";

async function copyTextToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    message.success("设备ID已复制到剪贴板");
  } catch (err) {
    console.error("无法复制文本: ", err);
    message.error("复制失败，请手动选择复制");
  }
}

let graph = null;
const DeviceOverview = (props) => {
  const {
    actions,
    dispatch,
    apiRoot,
    subDevices,
    loading,
    subDevicesDatasLoading,
    subDevicesDatas,
    user,
  } = props;
  const { firmwareUpgrade } = actions;
  const urlParams = new URLSearchParams(window.location.search);
  const deviceCode = urlParams.get("deviceCode");

  // 将deviceDetail改为状态变量，以便在更新后重新渲染
  const [deviceDetail, setDeviceDetail] = useState(() => {
    const detail = sessionStorage.getItem("deviceDetail");
    return detail ? JSON.parse(detail) : null;
  });

  const [tags, setTags] = useState([]);
  const [fileList, setFileList] = useState([]);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewImage, setPreviewImage] = useState("");
  const [curSubDevice, setSubCurDevice] = useState(null);
  const [subDeviceVisible, setSubDeviceVisible] = useState(false);
  // const [selectedKeys, setSelectedKeys] = useState([]);
  const [deleting, setDeleting] = useState(false);
  const [deviceConfModalVis, setDeviceConfModalVis] = useState(false);
  const [confLoading, setConfLoading] = useState(false); //统一配置的loading
  const [clearAllLoading, setClearAllLoading] = useState(false); //清除全部通道loading
  const [subConfLoading, setSubConfLoading] = useState(false); //子设备下发loading
  const [detailModalVis, setDetailModalVis] = useState(false);
  const [detailRecord, setDetailRecord] = useState(null);
  // const [curDevices,setCurDevices]=useState();
  const containerRef = useRef(null);
  const [importVisible, setImportVisible] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [sourceList, setSourceList] = useState([]);
  const [selectedSourceCode, setSelectedSourceCode] = useState(null);
  const [sourceLoading, setSourceLoading] = useState(false);
  const [sourceSearch, setSourceSearch] = useState("");
  const [sourcePage, setSourcePage] = useState(1);
  const [sourceTotal, setSourceTotal] = useState(0);
  const searchTimerRef = useRef(null);
  const currentSubDevices = (subDevices || []).filter((item) => !item.isDeleted);
  const filteredSourceList = useMemo(() => {
    const kw = String(sourceSearch || "")
      .trim()
      .toLowerCase();
    if (!kw) return sourceList;
    return sourceList.filter((r) => {
      const name = String(r.name || "").toLowerCase();
      const code = String(r.deviceCode || "").toLowerCase();
      return name.includes(kw) || code.includes(kw);
    });
  }, [sourceList, sourceSearch]);

  useEffect(() => {
    dispatch(firmwareUpgrade.getSensors());
    if (deviceDetail?.productLibrary?.productCode !== "GNSS") {
      fetchSubDevices();
    }
    setTags(deviceDetail?.tags?.split(","));

    // 组件卸载时销毁 G6 图
    return () => {
      if (graph) {
        console.log("销毁拓扑图");
        graph.destroy();
        graph = null;
      }
    };
  }, []);

  useEffect(() => {
    renderChart(currentSubDevices);
  }, [currentSubDevices]);

  // 监听deviceDetail变化，更新fileList
  useEffect(() => {
    if (deviceDetail?.picture) {
      setFileList([
        {
          uid: "-1",
          name: deviceDetail.picture.split("/").pop(),
          status: "done",
          url: `/_file-server/${deviceDetail.picture}`,
        },
      ]);
    } else {
      setFileList([]);
    }
  }, [deviceDetail?.picture]);

  function renderChart(syncSubDevices) {
    const mainNode = {
      id: deviceCode,
      label: deviceCode,
      style: { fill: "#C6E5FF", stroke: "#5B8FF9" },
      type: "rect",
      size: [40, 20],
      anchorPoints: [[0.5, 1]],
    };
    let data = {
      nodes: [mainNode],
      edges: [],
    };
    if (!graph) {
      graph = new G6.Graph({
        container: containerRef.current, // DOM 元素 ID
        width: 400,
        height: 160,
        modes: {
          default: ["drag-canvas", "zoom-canvas", "click-select"],
        },
        defaultNode: {
          size: 30,
          style: {
            fill: "#bbeec0",
            stroke: "#45de68",
          },
          labelCfg: {
            // 配置标签
            position: "bottom", // 将标签位置设置为底部
            offset: 3, // 设置标签与节点的距离
          },
        },
        defaultEdge: {
          type: "cubic-vertical", // 垂直方向的三阶贝塞尔曲线
          style: {
            stroke: "#F6BD16",
          },
        },
        layout: {
          type: "dagre", // 使用 dagre 层次布局
          rankdir: "TB", // 从上到下排列
          nodesep: 20, // 节点之间的间距
          ranksep: 20, // 不同层级之间的间距
        },
      });
      graph.data(data);
      graph.render();
    }
    const nodes = syncSubDevices.map((d) => ({
      id: d.id?.toString(),
      label: d.name,
    }));
    const edges = syncSubDevices.map((d) => ({
      source: mainNode.id,
      target: d.id?.toString(),
    }));
    data = {
      nodes: [mainNode, ...nodes],
      edges: edges,
    };
    graph.changeData(data);
    setTimeout(() => {
      graph.fitCenter(true, { duration: 100 });
    }, 0);
  }

  const modifyDevice = (data = {}) => {
    if (!deviceCode) {
      message.warning("设备ID参数缺失，请刷新页面后重试");
      return;
    }
    dispatch(firmwareUpgrade.modifyDevice(deviceCode, data))
      .then((res) => {
        if (res.success) {
          const updatedDetail = { ...deviceDetail, ...data };

          if (data.hasOwnProperty("tags")) {
            sessionStorage.setItem(
              "deviceDetail",
              JSON.stringify(updatedDetail),
            );
            setDeviceDetail(updatedDetail);
            message.success("设备标签更新成功");

            dispatch(
              createSystemLog({
                content: `更新设备标签：${tags.join(",")}`,
                module: "设备管理--设备列表--设备概述",
                url: window.location.href,
                userId: user?.id || null,
              }),
            );
          }
          if (data.hasOwnProperty("picture")) {
            sessionStorage.setItem(
              "deviceDetail",
              JSON.stringify(updatedDetail),
            );
            setDeviceDetail(updatedDetail);
            // 图片上传成功后不显示消息，因为在onChange中已经显示了
          }
        } else {
          message.error("设备信息更新失败，请重试");
        }
      })
      .catch((error) => {
        console.log(error, "-------");
        // message.error("网络异常，设备信息更新失败");
      });
  };

  const fetchSubDevices = (query = {}) => {
    if (!deviceCode) {
      message.warning("设备ID参数缺失，无法获取子设备信息");
      return;
    }
    dispatch(firmwareUpgrade.getSubDevices({ deviceCode, ...query }));
  };

  const handleTagsChange = (tags) => {
    setTags(tags);
    modifyDevice({ tags: tags.join(",") });
  };

  const bulkIssue = () => {
    setSubConfLoading(true);
    if (!currentSubDevices.length) {
      setSubConfLoading(false);
      message.info("当前设备暂无子设备，无法执行通道配置下发");
      return;
    }
    dispatch(
      firmwareUpgrade.issueSubCommand(deviceCode, {
        subids: currentSubDevices.map((item) => item.id).join(","),
      }),
    )
      .then((res) => {
        setSubConfLoading(false);
        if (res.success) {
          message.success(`成功向 ${currentSubDevices.length} 个子设备下发配置指令`);
          dispatch(
            createSystemLog({
              content: `向 ${currentSubDevices.length} 个子设备下发配置指令：设备ID：${deviceCode}`,
              module: "设备管理--设备列表--设备概述",
              url: window.location.href,
              userId: user?.id || null,
            }),
          );
        } else {
          message.error("通道配置下发失败，请检查设备连接状态后重试");
        }
      })
      .catch(() => {
        setSubConfLoading(false);
        message.error("网络异常，通道配置下发失败");
      });
  };

  const handleEditClick = (record) => {
    setSubCurDevice(record);
    setSubDeviceVisible(true);
  };
  const handleSubDeviceModalClose = () => {
    setSubCurDevice(null);
    setSubDeviceVisible(false);
  };
  const handleDelSubDevice = (id) => {
    setDeleting(true);
    dispatch(firmwareUpgrade.delSubDevices(id))
      .then((res) => {
        setDeleting(false);
        if (res.success) {
          message.success("子设备删除成功");
          dispatch(
            createSystemLog({
              content: `删除子设备，设备ID：${deviceCode}，子设备ID：${id}`,
              module: "设备管理--设备列表--设备概述--子设备",
              url: window.location.href,
              userId: user?.id || null,
            }),
          );
          fetchSubDevices();
        } else {
          message.error("子设备删除失败，请重试");
        }
      })
      .catch(() => {
        setDeleting(false);
        message.error("网络异常，子设备删除失败");
      });
  };

  const columns = [
    {
      title: "序号",
      dataIndex: "no",
      render: (text, record, index) => index + 1,
    },
    {
      title: "子设备名称",
      dataIndex: "name",
    },
    {
      title: "通道号",
      dataIndex: "channelNo",
      sorter: (a, b) => a.channelNo - b.channelNo,
      render: (_, r) => r?.channelNo || "/",
    },
    {
      title: "子通道号",
      dataIndex: "subChannelNo",
      sorter: (a, b) => a.subChannelNo - b.subChannelNo,
      render: (_, r) => r?.subChannelNo || "/",
    },
    {
      title: "模块号",
      dataIndex: "moduleNo",
      render: (_, r) => r?.moduleNo || "/",
    },
    {
      title: "传感器类型",
      dataIndex: "deviceType",
    },
    {
      title: "采集数据",
      render: (_, record) =>
        record.deviceType === "ZHENXIAN" &&
        isAuthorized("VIEWSUBDEVICES") && (
          <Button
            theme="borderless"
            type="primary"
            onClick={() => {
              dispatch(
                firmwareUpgrade.getSubDevicesData({
                  deviceCode,
                  channelNo: record.channelNo,
                  subChannelNo: record.subChannelNo,
                }),
              );
              setDetailModalVis(true);
              setDetailRecord(record);
            }}
          >
            查看
          </Button>
        ),
    },
    {
      title: "操作",
      dataIndex: "action",
      render: (text, record) => (
        <Space>
          {isAuthorized("MODIFYSUBDEVICES") && (
            <Button
              theme="solid"
              type="primary"
              size="small"
              onClick={() => handleEditClick(record)}
            >
              编辑
            </Button>
          )}
          {isAuthorized("DELETESUBDEVICES") && (
            <Popconfirm
              title="确定删除吗？"
              content="此操作将不可逆"
              onConfirm={() => handleDelSubDevice(record.id)}
            >
              <Button type="danger" size="small" loading={deleting}>
                删除
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];
  // const rowSelection = {
  //     getCheckboxProps: record => ({
  //         name: record.name,
  //     }),
  //     onChange: (selectedRowKeys, selectedRows) => {
  //         // console.log(`selectedRowKeys: ${selectedRowKeys}`, 'selectedRows: ', selectedRows);
  //         setSelectedKeys(selectedRowKeys);
  //     },
  // };
  const rowStyle = { margin: "12px 0" };
  const verticalAlign = { display: "flex", alignItems: "center" };
  let clearAll = () => {
    setClearAllLoading(true);
    dispatch(firmwareUpgrade.clearAll({ device: deviceCode }))
      .then((res) => {
        setClearAllLoading(false);
        if (res.success) {
          notification.success({
            message: "所有通道已清除完成",
            duration: 3,
          });

          dispatch(
            createSystemLog({
              content: `清除全部通道：设备ID：${deviceCode}`,
              module: "设备管理--设备列表--设备概述",
              url: window.location.href,
              userId: user?.id || null,
            }),
          );

          fetchSubDevices();
        }
      })
      .catch(() => {
        setClearAllLoading(false);
        notification.error({
          message: "网络异常，清除通道失败",
          duration: 3,
        });
      });
  };
  const handleClose = () => {
    setDeviceConfModalVis(false);
  };
  const openImportModal = () => {
    const model = deviceDetail?.productLibrary?.model;
    if (!model) {
      message.warning("设备型号缺失，无法加载同型号设备");
      return;
    }
    setImportVisible(true);
    setSourceLoading(true);
    setSourcePage(1);
    dispatch(
      firmwareUpgrade.getDevicesSlim({
        deviceModel: model,
        targetDeviceCode: deviceCode,
        pageSize: 10,
        page: 1,
      }),
    )
      .then((res) => {
        const rows = res?.payload?.data?.rows || res?.data?.rows || [];
        const total = res?.payload?.data?.count || res?.data?.count || 0;
        const mapped = (rows || []).map((r) => ({
          deviceCode: String(r?.deviceCode || r?.dataValues?.deviceCode || ""),
          name: String(r?.name || r?.dataValues?.name || ""),
          subDevices: r?.subDevices || r?.dataValues?.subDevices || [],
        }));
        setSourceList(mapped);
        setSourceTotal(Number(total) || 0);
        setSelectedSourceCode(null);
        setSourceSearch("");
        setSourceLoading(false);
      })
      .catch(() => {
        message.error("同型号设备列表加载失败");
        setSourceLoading(false);
      });
  };
  const handleImportConfirm = () => {
    if (!selectedSourceCode) {
      message.warning("请选择源设备ID");
      return;
    }
    setImportLoading(true);
    dispatch(
      firmwareUpgrade.importSubDevices({
        sourceDeviceCode: selectedSourceCode,
        targetDeviceCode: deviceCode,
      }),
    )
      .then((res) => {
        setImportLoading(false);
        if (res.success) {
          const ids = res?.payload?.ids || res?.data?.ids || [];
          const skipped = res?.payload?.skipped || res?.data?.skipped || [];
          const renamed = res?.payload?.renamed || res?.data?.renamed || [];
          message.success(`导入完成`);
          dispatch(
            createSystemLog({
              content: `导入子设备：源设备${selectedSourceCode} -> 目标设备${deviceCode}`,
              module: "设备管理--设备列表--设备概述",
              url: window.location.href,
              userId: user?.id || null,
            }),
          );
          setImportVisible(false);
          fetchSubDevices();
        } else {
          const msg = res?.message || "导入失败";
          message.error(msg);
        }
      })
      .catch((err) => {
        setImportLoading(false);
        const msg = err?.message || "网络异常，导入失败";
        message.error(msg);
      });
  };
  const formatAICAM = (values = []) => {
    return values
      .map((v, i) => {
        if (v.EN)
          return {
            AXY: v?.AXY,
            LAPRO: v?.LAPRO,
            N: i + 1,
          };
      })
      .filter(Boolean);
  };
  const distributeConf = () => {
    setConfLoading(true);
    if (!deviceDetail) {
      setConfLoading(false);
      message.warning("设备信息缺失，无法执行配置下发");
      return;
    }
    let casheData = localStorage.getItem("deviceConfCache");
    let data = { configParams: {} };
    if (casheData) {
      let d = JSON.parse(casheData);
      let curObj = d.find((item) => item.deviceId == deviceDetail?.deviceCode);
      if (curObj) {
        data = { configParams: curObj?.configParams };
        //处理AICAM的配置
        if (data.configParams.LAPRO && data.configParams.LAPRO.AICAM) {
          data.configParams.LAPRO.AICAM = formatAICAM(
            data?.configParams?.LAPRO?.AICAM,
          );
        }
      } else {
        setConfLoading(false);
        message.warning("当前设备尚未配置参数，请先进行设备参数配置");
        return;
      }
    } else {
      setConfLoading(false);
      message.warning("未找到配置缓存，请先进行设备参数配置");
      return;
    }
    dispatch(
      firmwareUpgrade.modifyDevice(
        [deviceDetail].map((d) => d.deviceCode).join(","),
        data,
      ),
    )
      .then((res) => {
        if (res.success) {
          dispatch(firmwareUpgrade.distributeConf({ device: deviceCode }))
            .then((rs) => {
              setConfLoading(false);
              if (rs.success) {
                message.success("设备配置下发成功，设备将按新配置运行");
              } else {
                message.error("配置下发失败，请检查设备连接状态后重试");
              }
            })
            .catch(() => {
              setConfLoading(false);
              message.error("网络异常，配置下发失败");
            });
        } else {
          setConfLoading(false);
          message.error("设备配置更新失败，请重试");
        }
      })
      .catch(() => {
        setConfLoading(false);
        message.error("网络异常，配置操作失败");
      });
  };
  const handleRow = (record, index) => {
    // 给删除了但是未同步的设置斑马纹
    if (record.isDeleted && !record.sync) {
      return {
        style: {
          background: "var(--semi-color-fill-0)",
        },
      };
    } else {
      return {};
    }
  };
  return (
    <div style={{ background: "#FFFFFF", padding: "6px 12px 12px" }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <div style={{ fontWeight: "bold" }}>基础信息</div>
        <div>
          {isAuthorized("DEVICEPARAMETERCONFIGURATION") && (
            <Button
              theme="solid"
              onClick={() => {
                setDeviceConfModalVis(true);
              }}
            >
              设备参数配置
            </Button>
          )}
          {isAuthorized("UNIFIEDDISTRIBUTIONOFCONFIGURATION") && (
            <Button
              theme="solid"
              loading={confLoading}
              onClick={distributeConf}
              style={{ marginLeft: 10 }}
            >
              统一下发配置
            </Button>
          )}
        </div>
      </div>
      <Divider margin="12px" />
      <div style={{ fontSize: 14 }}>
        <Row style={rowStyle} type="flex" align="middle">
          <Col span={12} style={verticalAlign}>
            设备名称： {deviceDetail?.productLibrary?.name}
            {deviceDetail?.productLibrary?.picture ? (
              <Image
                style={{ marginLeft: 8 }}
                src={"/_file-server/" + deviceDetail?.productLibrary?.picture}
                width={60}
                height={60}
              />
            ) : (
              ""
            )}
          </Col>
          <Col span={12}>
            设备ID： {deviceDetail?.deviceCode}{" "}
            <CopyOutlined
              style={{
                cursor: "pointer",
                marginLeft: 2,
                width: 19,
                height: 19,
                color: "#999999",
              }}
              onClick={() => copyTextToClipboard(deviceDetail?.deviceCode)}
            />
          </Col>
        </Row>
        <Row style={rowStyle} type="flex" align="middle">
          <Col span={12} style={verticalAlign}>
            通讯方式： {deviceDetail?.commMode}
          </Col>
          <Col span={12}>设备型号： {deviceDetail?.productLibrary?.model}</Col>
        </Row>
        <Row style={rowStyle} type="flex" align="middle">
          <Col span={12}>接入协议： {deviceDetail?.protocol}</Col>
          <Col span={12} style={verticalAlign}>
            标签：
            <Input
              style={{ maxWidth: 400 }}
              placeholder="请输入..."
              value={tags ? tags.join(",") : ""}
              onChange={(e) =>
                handleTagsChange(
                  e.target.value ? e.target.value.split(",") : [],
                )
              }
              disabled={!isAuthorized("ADDTAGS")}
            />
          </Col>
        </Row>
        <Row style={rowStyle} type="flex" align="middle">
          <Col span={12} style={verticalAlign}>
            设备拓扑图：
            <div
              ref={containerRef}
              style={{ border: "1px solid #d9d9d9" }}
            ></div>
          </Col>
          <Col span={12} style={verticalAlign}>
            设备安装图：{" "}
            <Upload
              disabled={!isAuthorized("DEVICEINSTALLATIONDIAGRAM")}
              action={`${apiRoot}/attachments/p`}
              listType="picture-card"
              accept="image/*"
              showUploadList={{
                showPreviewIcon: true,
                showRemoveIcon: true,
                showDownloadIcon: true,
              }}
              maxCount={1}
              fileList={fileList}
              onChange={(info) => {
                setFileList(info.fileList);

                const { status } = info.file;
                if (status === "error") {
                  message.error(`${info.file.name} 文件上传失败`);
                }
              }}
              onPreview={(file) => {
                setPreviewImage(file.url || file.preview);
                setPreviewVisible(true);
              }}
              onRemove={(file) => {
                modifyDevice({ picture: "" });
                dispatch(
                  createSystemLog({
                    content: `删除设备安装图：${file.name}`,
                    module: "设备管理--设备列表--设备概述",
                    url: window.location.href,
                    userId: user?.id || null,
                  }),
                );
                return true;
              }}
              onSuccess={(response, file, fileList) => {
                if (response && response.uploaded) {
                  message.success(`${file.name} 文件上传成功`);
                  modifyDevice({ picture: response.uploaded });
                  dispatch(
                    createSystemLog({
                      content: `上传设备安装图：${file.name}`,
                      module: "设备管理--设备列表--设备概述",
                      url: window.location.href,
                      userId: user?.id || null,
                    }),
                  );
                }
              }}
              onError={(error, file) => {
                console.error("Upload error:", error);
                message.error(`${file.name} 上传失败，请重试`);
              }}
            >
              {deviceDetail?.picture ? null : (
                <div>
                  <PlusOutlined />
                  <div style={{ marginTop: 8 }}>上传</div>
                </div>
              )}
            </Upload>
          </Col>
        </Row>
      </div>
      {deviceDetail?.productLibrary?.productCode !== "DTPT" &&
        deviceDetail?.productLibrary?.productCode !== "QJNB" &&
        deviceDetail?.productLibrary?.productCode !== "GNSS" &&
        deviceDetail?.productLibrary?.productCode !== "DYJC" && (
          <>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "end",
              }}
            >
              <div style={{ fontWeight: "bold" }}>子设备</div>
              <Space>
                {isAuthorized("CLEARALLCHANNELS") && (
                  <Button
                    theme="solid"
                    loading={clearAllLoading}
                    onClick={clearAll}
                  >
                    清除全部通道
                  </Button>
                )}
                {isAuthorized("CHANNELCONFIGURATIONISSUANCE") && (
                  <Button
                    theme="solid"
                    loading={subConfLoading}
                    onClick={bulkIssue}
                  >
                    通道配置下发
                  </Button>
                )}
                {isAuthorized("ADDSUBDEVICES") && (
                  <Button
                    theme="solid"
                    loading={sourceLoading}
                    onClick={openImportModal}
                  >
                    导入子设备
                  </Button>
                )}
                {isAuthorized("ADDSUBDEVICES") && (
                  <Button
                    theme="solid"
                    onClick={() => {
                      setSubDeviceVisible(true);
                    }}
                  >
                    新增
                  </Button>
                )}
              </Space>
            </div>
            <Divider margin="12px" />
            <Table
              columns={columns}
              dataSource={currentSubDevices}
              rowKey="id"
              loading={loading}
              onRow={handleRow}
              scroll={{ y: 140 }}
              style={{
                position: "relative",
              }}
              className="sub-device-table"
              // rowSelection={rowSelection}
            />
          </>
        )}

      {deviceDetail?.productLibrary?.productCode !== "GNSS" && (
        <SubDeviceModal
          open={subDeviceVisible}
          deviceCode={deviceCode}
          editData={curSubDevice}
          onClose={handleSubDeviceModalClose}
          fetchData={fetchSubDevices}
          productModel={deviceDetail?.productLibrary?.model}
        />
      )}
      <DeviceConfigModal
        open={deviceConfModalVis}
        curDevices={[deviceDetail]}
        onClose={handleClose}
        productCode={deviceDetail?.productLibrary?.productCode}
      />
      {detailModalVis && !subDevicesDatasLoading && (
        <DetailModal
          open={detailModalVis}
          loading={subDevicesDatasLoading}
          onClose={() => {
            setDetailModalVis(false);
            setDetailRecord(null);
          }}
          record={subDevicesDatas}
        />
      )}

      <Modal
        open={previewVisible}
        title="图片预览"
        footer={null}
        onCancel={() => setPreviewVisible(false)}
        width={800}
        centered
      >
        <img
          alt="preview"
          style={{ width: "100%", maxHeight: "70vh", objectFit: "contain" }}
          src={previewImage}
        />
      </Modal>
      <Modal
        open={importVisible}
        title="导入子设备"
        onCancel={() => setImportVisible(false)}
        onOk={handleImportConfirm}
        confirmLoading={importLoading}
        okButtonProps={{ disabled: sourceLoading || !selectedSourceCode }}
        okText="确认导入"
        cancelText="取消"
        centered
        styles={{
          body: {
            height: 520,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          },
        }}
      >
        {sourceLoading ? (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              padding: "24px 0",
            }}
          >
            <Spin tip="正在加载同型号设备..." />
          </div>
        ) : (
          <div
            style={{ display: "flex", flexDirection: "column", height: "100%" }}
          >
            <Alert
              type="info"
              showIcon
              message="功能说明"
              description={`您可以选择一台同型号（${deviceDetail?.productLibrary?.model || "-"}）的设备，将其子设备配置一键导入到当前设备中。导入后可继续手动调整。`}
              style={{ marginBottom: 12 }}
            />
            <Input
              placeholder="搜索设备ID"
              allowClear
              value={sourceSearch}
              onChange={(e) => {
                const val = e.target.value;
                setSourceSearch(val);
                if (searchTimerRef.current) {
                  clearTimeout(searchTimerRef.current);
                }
                searchTimerRef.current = setTimeout(() => {
                  const model = deviceDetail?.productLibrary?.model;
                  if (!model) return;
                  setSourceLoading(true);
                  setSourcePage(1);
                  dispatch(
                    firmwareUpgrade.getDevicesSlim({
                      deviceModel: model,
                      targetDeviceCode: deviceCode,
                      deviceCode: val,
                      pageSize: 10,
                      page: 1,
                    }),
                  )
                    .then((res) => {
                      const rows =
                        res?.payload?.data?.rows || res?.data?.rows || [];
                      const total =
                        res?.payload?.data?.count || res?.data?.count || 0;
                      const mapped = (rows || []).map((r) => ({
                        deviceCode: String(
                          r?.deviceCode || r?.dataValues?.deviceCode || "",
                        ),
                        name: String(r?.name || r?.dataValues?.name || ""),
                        subDevices:
                          r?.subDevices || r?.dataValues?.subDevices || [],
                      }));
                      setSourceList(mapped);
                      setSourceTotal(Number(total) || 0);
                      setSourceLoading(false);
                    })
                    .catch(() => {
                      message.error("同型号设备列表加载失败");
                      setSourceLoading(false);
                    });
                }, 300);
              }}
              style={{ marginBottom: 12 }}
            />
            <div style={{ flex: 1, minHeight: 0, overflow: "auto" }}>
              <Table
                columns={[
                  {
                    title: "设备名称",
                    dataIndex: "name",
                    width: 180,
                    render: (t) => t || "-",
                  },
                  { title: "设备ID", dataIndex: "deviceCode", width: 200 },
                  {
                    title: "子设备",
                    dataIndex: "subDevices",
                    width: 180,
                    render: (t, r) => r?.subDevices?.length || "-",
                  },
                ]}
                dataSource={filteredSourceList}
                rowKey="deviceCode"
                pagination={{
                  current: sourcePage,
                  pageSize: 10,
                  total: sourceTotal,
                  showSizeChanger: false,
                  onChange: (p) => {
                    const model = deviceDetail?.productLibrary?.model;
                    if (!model) return;
                    setSourceLoading(true);
                    setSourcePage(p);
                    dispatch(
                      firmwareUpgrade.getDevicesSlim({
                        deviceModel: model,
                        targetDeviceCode: deviceCode,
                        pageSize: 10,
                        page: p,
                      }),
                    )
                      .then((res) => {
                        const rows =
                          res?.payload?.data?.rows || res?.data?.rows || [];
                        const total =
                          res?.payload?.data?.count || res?.data?.count || 0;
                        const mapped = (rows || []).map((r) => ({
                          deviceCode: String(
                            r?.deviceCode || r?.dataValues?.deviceCode || "",
                          ),
                          name: String(r?.name || r?.dataValues?.name || ""),
                          subDevices:
                            r?.subDevices || r?.dataValues?.subDevices || [],
                        }));
                        setSourceList(mapped);
                        setSourceTotal(Number(total) || 0);
                        setSourceLoading(false);
                      })
                      .catch(() => {
                        message.error("同型号设备列表加载失败");
                        setSourceLoading(false);
                      });
                  },
                }}
                size="small"
                rowSelection={{
                  type: "radio",
                  selectedRowKeys: selectedSourceCode
                    ? [selectedSourceCode]
                    : [],
                  onChange: (keys) => setSelectedSourceCode(keys?.[0]),
                }}
                className="thin-scrollbar"
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

function mapStateToProps(state) {
  const { auth, global, subDevices, subDevicesDatas } = state;
  return {
    user: auth.user?.userInfo,
    apiRoot: global.apiRoot,
    actions: global.actions,
    subDevices: subDevices.data || [],
    loading: subDevices.isRequesting,
    subDevicesDatas: subDevicesDatas.data || [],
    subDevicesDatasLoading: subDevicesDatas.isRequesting,
  };
}
export default connect(mapStateToProps)(DeviceOverview);
