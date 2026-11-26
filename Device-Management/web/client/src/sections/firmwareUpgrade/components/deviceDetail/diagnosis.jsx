import React, { useEffect, useRef, useState } from "react";
import { connect } from "react-redux";
import {
  Button,
  Table,
  message,
  DatePicker,
  ConfigProvider,
  Space,
  Card,
  Checkbox,
  Popover,
} from "antd";
import { ExportData } from "$components";
import dayjs from "dayjs";
import "dayjs/locale/zh-cn";
import zhCN from "antd/locale/zh_CN";
import { ApiTable } from "$utils";

const pageSize = 10;
const requiredColumnKeys = ["deviceCode", "atTime", "createdAt"];

function withRequiredColumnKeys(keys) {
  return [...new Set([...requiredColumnKeys, ...keys])];
}

function getStoredColumnKeys(storageKey) {
  try {
    const stored = window.localStorage.getItem(storageKey);
    const keys = stored ? JSON.parse(stored) : null;
    return Array.isArray(keys) ? keys : null;
  } catch (error) {
    return null;
  }
}

const DiagnosisData = (props) => {
  const { actions, dispatch } = props;
  const { firmwareUpgrade } = actions;
  const urlParams = new URLSearchParams(window.location.search);
  const deviceCode = urlParams.get("deviceCode");
  const productCode = (() => {
    try {
      const detail = sessionStorage.getItem("deviceDetail");
      return detail
        ? JSON.parse(detail)?.productLibrary?.productCode || ""
        : "";
    } catch (error) {
      return "";
    }
  })();
  const columnPreferenceKey = `diagnostic-visible-columns:v1:${productCode || "default"}`;

  // 设置dayjs中文语言环境
  dayjs.locale("zh-cn");

  const [currentPage, setPage] = useState(1);
  const [dateRange, setDateRange] = useState([]);
  const [diagnosticHistories, setDiagnosticHistories] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedColumnKeys, setSelectedColumnKeys] = useState(() =>
    getStoredColumnKeys(columnPreferenceKey),
  );
  // 同一 Redux 数据源会被不同设备详情页共用；用递增请求号避免慢请求回写当前设备页面。
  const latestRequestRef = useRef(0);

  useEffect(() => {
    fetchData();
    return () => {
      latestRequestRef.current += 1;
    };
  }, [deviceCode]);

  useEffect(() => {
    setSelectedColumnKeys(getStoredColumnKeys(columnPreferenceKey));
  }, [columnPreferenceKey]);

  const fetchData = async (currentPage = 1) => {
    if (!deviceCode) {
      message.warning("缺少页面参数，请返回重试");
      setDiagnosticHistories(null);
      return;
    }
    const requestId = latestRequestRef.current + 1;
    latestRequestRef.current = requestId;
    setPage(currentPage);
    setDiagnosticHistories(null);
    setLoading(true);
    let query = {
      pageSize: pageSize,
      page: currentPage,
      deviceCode,
    };
    if (dateRange && dateRange.length === 2) {
      query.startTime = dayjs(dateRange[0]).format("YYYY-MM-DD") + " 00:00:00";
      query.endTime = dayjs(dateRange[1]).format("YYYY-MM-DD") + " 23:59:59";
    }
    try {
      const action = await dispatch(
        firmwareUpgrade.getDiagnosticHistories(query),
      );
      // 只接收最后一次请求的结果，防止切换设备后旧请求晚到覆盖新页面。
      if (requestId === latestRequestRef.current) {
        setDiagnosticHistories(action?.payload?.data || null);
      }
    } catch (error) {
      if (requestId === latestRequestRef.current) {
        setDiagnosticHistories(null);
      }
    } finally {
      if (requestId === latestRequestRef.current) {
        setLoading(false);
      }
    }
  };

  const handlePageChange = (page) => {
    fetchData(page);
  };

  const isGNSS = productCode === "GNSS";
  const isYTZD = productCode === "YTZD";
  const isDYJC = productCode === "DYJC";
  const isDCZD = productCode === "DCZD";
  const isDCQX = productCode === "DCQX";

  // 统一校验接口返回的数值，避免空值或非法值参与计算。
  const toFiniteNumber = (value) => {
    if (
      value === null ||
      value === undefined ||
      (typeof value === "string" && value.trim() === "")
    ) {
      return null;
    }
    const numberValue = Number(value);
    return Number.isFinite(numberValue) ? numberValue : null;
  };

  // 信号强度优先使用设备直接上报的 DB；缺失时按 CSQ * 2 - 113 换算。
  const getSignalStrength = (record) => {
    const db = toFiniteNumber(record.DB);
    if (db !== null) return db;

    const csq = toFiniteNumber(record.CSQ);
    return csq === null ? null : csq * 2 - 113;
  };

  const getBatteryDisplay = (value) => {
    const battery = toFiniteNumber(value);
    return battery !== null && battery > 100 ? "市电" : value;
  };

  // 基于最终信号强度统一判定信号质量：差(<-110)、中([-110,-80))、优(>=-80)。
  const getSignalQuality = (record) => {
    const signalStrength = getSignalStrength(record);
    if (signalStrength === null) return null;
    if (signalStrength < -110) return { text: "差", color: "red" };
    if (signalStrength >= -80) return { text: "优", color: "green" };
    return { text: "中", color: "orange" };
  };

  const hasReturnedField = (field) =>
    diagnosticHistories?.rows?.some((row) =>
      Object.prototype.hasOwnProperty.call(row || {}, field),
    ) || false;
  const hasSignalData = hasReturnedField("DB") || hasReturnedField("CSQ");
  const allColumns = [
    {
      key: "deviceCode",
      title: "设备编码",
      dataIndex: "deviceCode",
      available: hasReturnedField("deviceCode"),
    },
    {
      key: "createdAt",
      title: "接收时间",
      dataIndex: "createdAt",
      render: (text) => dayjs(text).format("YYYY-MM-DD HH:mm:ss"),
      rowStyle: "mso-number-format: '@';",
      available: hasReturnedField("createdAt"),
    },
    {
      key: "atTime",
      title: "上报时间",
      dataIndex: "atTime",
      render: (text) => dayjs(text).format("YYYY-MM-DD HH:mm:ss"),
      rowStyle: "mso-number-format: '@';",
      available: hasReturnedField("atTime"),
    },
    {
      key: "BAT",
      title: "上次电量(%)",
      dataIndex: "BAT",
      render: (text) => getBatteryDisplay(text),
      available: hasReturnedField("BAT"),
    },
    // ...(isGNSS || isDYJC
    //   ? [
    {
      key: "VOL",
      title: "电源电压(V)",
      dataIndex: "VOL",
      render: (text) => {
        const voltage = toFiniteNumber(text);
        if (voltage === null) return text;
        const displayVoltage = voltage > 1000 ? voltage / 1000 : voltage;
        return displayVoltage.toFixed(2);
      },
      available: hasReturnedField("VOL"),
    },
    //   ]
    // : []),
    {
      key: "signalStrength",
      title: "信号强度(dB)",
      dataIndex: "DB",
      render: (_, record) => getSignalStrength(record) ?? "",
      available: hasSignalData,
    },
    {
      key: "signalQuality",
      title: "信号质量",
      dataIndex: "signalQuality",
      render: (_, record) => {
        const signalQuality = getSignalQuality(record);
        return signalQuality ? (
          <span style={{ color: signalQuality.color }}>
            {signalQuality.text}
          </span>
        ) : (
          ""
        );
      },
      available: hasSignalData,
    },
    {
      key: "SVER",
      title: "设备固件版本",
      dataIndex: "SVER",
      available: hasReturnedField("SVER"),
    },
    {
      key: "HVER",
      title: "设备硬件版本",
      dataIndex: "HVER",
      available: hasReturnedField("HVER"),
    },
    {
      key: "CCID",
      title: "SIM卡号",
      dataIndex: "CCID",
      rowStyle: "mso-number-format: '@';",
      available: hasReturnedField("CCID"),
    },
    {
      key: "ERR",
      title: "设备运行状态码",
      dataIndex: "ERR",
      render: (text) => text?.toString(),
      available: hasReturnedField("ERR"),
    },
    {
      key: "GL",
      title: "经纬度",
      dataIndex: "GL",
      available: hasReturnedField("GL"),
    },
    // ...(isYTZD || isDCZD || isDCQX
    //   ? [
    {
      key: "JY",
      title: "积压条数",
      dataIndex: "JY",
      available: hasReturnedField("JY"),
    },
    //   ]
    // : []),
    {
      key: "CV",
      title: "配置版本号",
      dataIndex: "CV",
      available: hasReturnedField("CV"),
    },
    {
      key: "CNT",
      title: "工作次数",
      dataIndex: "CNT",
      available: hasReturnedField("CNT"),
    },
  ];
  const availableColumnKeys = allColumns
    .filter((column) => column.available)
    .map((column) => column.key);
  const effectiveSelectedColumnKeys = withRequiredColumnKeys(
    selectedColumnKeys === null ? availableColumnKeys : selectedColumnKeys,
  );
  const visibleColumns = allColumns.filter(
    (column) =>
      column.available && effectiveSelectedColumnKeys.includes(column.key),
  );
  const exportColumns = visibleColumns.map((column) =>
    column.key === "signalQuality"
      ? {
          ...column,
          render: (_, record) => getSignalQuality(record)?.text || "",
        }
      : column,
  );
  const selectedAvailableColumnKeys = effectiveSelectedColumnKeys.filter(
    (key) => availableColumnKeys.includes(key),
  );
  const handleColumnSelection = (keys) => {
    const unavailableSelectedKeys = (selectedColumnKeys || []).filter(
      (key) => !availableColumnKeys.includes(key),
    );
    const nextKeys = withRequiredColumnKeys([
      ...unavailableSelectedKeys,
      ...keys,
    ]);
    setSelectedColumnKeys(nextKeys);
    try {
      window.localStorage.setItem(
        columnPreferenceKey,
        JSON.stringify(nextKeys),
      );
    } catch (error) {
      // 本地存储不可用时，仅在当前页面保留用户选择。
    }
  };
  const columnSettings = (
    <Checkbox.Group
      value={selectedAvailableColumnKeys}
      onChange={handleColumnSelection}
    >
      <Space direction="vertical">
        {allColumns.map((column) => (
          <Checkbox
            key={column.key}
            value={column.key}
            disabled={
              !column.available || requiredColumnKeys.includes(column.key)
            }
          >
            {column.title}
          </Checkbox>
        ))}
      </Space>
    </Checkbox.Group>
  );

  return (
    <ConfigProvider locale={zhCN}>
      <div style={{ background: "#FFFFFF", padding: "8px 8px 0" }}>
        <Card size="small" style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Space align="center">
              <span style={{ fontSize: 14 }}>时间筛选：</span>
              <DatePicker.RangePicker
                style={{ width: 280 }}
                value={dateRange}
                onChange={(dates) => setDateRange(dates)}
                allowClear={true}
                placeholder={["开始日期", "结束日期"]}
                locale={zhCN.DatePicker}
              />
              <Button type="primary" onClick={() => fetchData(1)}>
                查询
              </Button>
              {diagnosticHistories?.rows?.length && visibleColumns.length ? (
                <ExportData
                  style={{ marginLeft: 12 }}
                  fileName="诊断数据"
                  exportType="fileSaver"
                  exportUrl={ApiTable.getDiagnosticHistories}
                  exportQuery={
                    dateRange && dateRange.length === 2
                      ? {
                          deviceCode,
                          startTime:
                            dayjs(dateRange[0]).format("YYYY-MM-DD") +
                            " 00:00:00",
                          endTime:
                            dayjs(dateRange[1]).format("YYYY-MM-DD") +
                            " 23:59:59",
                          exportAll: 1,
                        }
                      : { deviceCode, exportAll: 1 }
                  }
                  columns={exportColumns}
                  data={diagnosticHistories?.rows || []}
                  key="export"
                />
              ) : (
                ""
              )}
            </Space>
            <div style={{ marginLeft: "auto" }}>
              <Popover
                content={columnSettings}
                trigger="click"
                placement="bottomRight"
              >
                <Button>字段设置</Button>
              </Popover>
            </div>
          </div>
        </Card>
        <Table
          rowKey={(record) => record.id}
          columns={visibleColumns}
          dataSource={
            visibleColumns.length ? diagnosticHistories?.rows || [] : []
          }
          pagination={{
            current: currentPage,
            pageSize,
            total: diagnosticHistories?.count,
            onChange: handlePageChange,
            showSizeChanger: false,
          }}
          locale={{
            emptyText: visibleColumns.length
              ? "暂无诊断数据"
              : "请在字段设置中选择展示字段",
          }}
          loading={loading}
        />
      </div>
    </ConfigProvider>
  );
};

function mapStateToProps(state) {
  const { auth, global } = state;
  return {
    user: auth.user,
    actions: global.actions,
  };
}
export default connect(mapStateToProps)(DiagnosisData);
