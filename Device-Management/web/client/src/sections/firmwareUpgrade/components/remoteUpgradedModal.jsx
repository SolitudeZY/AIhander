import React, { useState, useEffect, useRef } from "react";
import { connect } from "react-redux";
import { Modal, message, Radio, Spin, Empty, Alert, Divider } from "antd";
import { createSystemLog } from "../../system/actions/log";

function RemoteUpgradedModal({
  actions,
  dispatch,
  open,
  onClose,
  curDevices = [],
}) {
  const { firmwareUpgrade } = actions;
  const [firmware, setFirmware] = useState(1);
  const [committing, setCommitting] = useState(false);
  const [data, setData] = useState([]);
  const [filterData, setFilterData] = useState([]);
  const [loading, setLoading] = useState(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    getData();
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (curDevices.length) {
      setFilterData(
        data.filter(
          (d) => d.deviceMetaName === curDevices[0]?.productLibrary?.model
        )
      );
    } else {
      setFilterData([]);
    }
  }, [curDevices, data]);

  const getData = () => {
    if (isMountedRef.current) {
      setLoading(true);
    }
    dispatch(
      firmwareUpgrade.getFirmware({
        tokenup: "REPLACE_WITH_FIRMWARE_OPERATION_TOKEN",
      })
    )
      .then((res) => {
        if (isMountedRef.current) {
          setLoading(false);
          if (res.success) {
            setData(res.payload.data.data);
          }
        }
      })
      .catch((error) => {
        if (isMountedRef.current) {
          setLoading(false);
          console.error("Get firmware error:", error);
        }
      });
  };

  const handleOk = () => {
    if (!firmware) {
      message.warning("请选择固件版本");
      return;
    }

    const selectedFirmware = filterData.find(
      (item) => item.versionNo === firmware
    );
    if (!selectedFirmware) {
      message.error("选择的固件版本无效");
      return;
    }

    if (isMountedRef.current) {
      setCommitting(true);
    }

    const deviceCodes = curDevices.map((d) => d.deviceCode);

    dispatch(
      firmwareUpgrade.otaDevice({
        devices: deviceCodes,
        version: firmware,
      })
    )
      .then((res) => {
        if (isMountedRef.current) {
          setCommitting(false);
          if (res.success) {
            message.success(
              `固件升级任务已下发，共${deviceCodes.length}个设备`
            );
            try {
              const actionLabel = deviceCodes.length > 1 ? "批量升级" : "远程升级";
              const userId = (JSON.parse(window.sessionStorage.getItem("user"))?.userInfo?.id) || null;
              dispatch(
                createSystemLog({
                  content: `${actionLabel}：设备数${deviceCodes.length}，版本${firmware}，设备ID：${deviceCodes.join(",")}`,
                  module: "固件升级",
                  url: window.location.href,
                  userId,
                })
              );
            } catch (e) {
              console.warn("log error", e);
            }
            onClose();
          } else {
            message.error(`固件升级失败: ${res.message || "未知错误"}`);
          }
        }
      })
      .catch((error) => {
        if (isMountedRef.current) {
          setCommitting(false);
          message.error("固件升级过程中发生错误，请稍后重试");
          console.error("OTA device error:", error);
        }
      });
  };

  return (
    <Modal
      title={`固件升级 - ${
        curDevices.length > 0
          ? `${curDevices[0]?.productLibrary?.model || "未知型号"} (${
              curDevices.length
            }个设备)`
          : "无设备"
      }`}
      okText={committing ? "升级中..." : "开始升级"}
      cancelText="取消"
      open={open}
      onOk={handleOk}
      width={600}
      onCancel={onClose}
      confirmLoading={committing}
      centered
      style={{ top: 20 }}
      styles={{
        body: {
          maxHeight: "calc(100vh - 200px)",
          padding: 0,
          overflow: "hidden",
        },
      }}
      okButtonProps={{
        disabled: !firmware || !filterData.length,
      }}
    >
      {/* 固定的头部信息区域 */}
      <div
        style={{ padding: "20px 24px 0", borderBottom: "1px solid #f0f0f0" }}
      >
        {curDevices.length > 0 && (
          <Alert
            message={`当前选择了 ${curDevices.length} 个设备`}
            description={`设备型号: ${
              curDevices[0]?.productLibrary?.model || "未知型号"
            } | 设备编码: ${curDevices.map((d) => d.deviceCode).join(", ")}`}
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        {!filterData.length && !loading && (
          <Alert
            message="暂无可用固件"
            description="当前设备型号暂无可升级的固件版本，请联系管理员上传对应固件。"
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        <Divider orientation="left" style={{ margin: "16px 0" }}>
          选择固件版本
        </Divider>
      </div>

      {/* 可滚动的内容区域 */}
      <div
        style={{
          padding: "16px 24px 20px",
          maxHeight: "calc(100vh - 350px)",
          overflowY: "auto",
        }}
      >
        <Spin spinning={loading}>
          <Radio.Group
            style={{ width: "100%" }}
            onChange={(e) => setFirmware(e.target.value)}
            value={firmware}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                padding: "4px",
                marginBottom: 40,
              }}
            >
              {filterData.length || loading ? (
                filterData.map((item) => (
                  <Radio
                    key={item.filepath}
                    value={item.versionNo}
                    style={{
                      padding: "8px 12px",
                      border: "1px solid #d9d9d9",
                      borderRadius: "6px",
                      margin: "4px 0",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: "bold", marginBottom: "4px" }}>
                        版本名称：{item.firmwareName}
                      </div>
                      <div style={{ color: "#666", fontSize: "12px" }}>
                        版本号：{item.versionNo}
                      </div>
                    </div>
                  </Radio>
                ))
              ) : (
                <Empty description={"此设备暂无固件"} style={{ padding: 30 }} />
              )}
            </div>
          </Radio.Group>
        </Spin>
      </div>
    </Modal>
  );
}

function mapStateToProps(state) {
  const { auth, global } = state;
  return {
    user: auth.user,
    actions: global.actions,
  };
}
export default connect(mapStateToProps)(RemoteUpgradedModal);
