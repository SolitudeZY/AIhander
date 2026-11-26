import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { connect } from "react-redux";
import { useHistory, useLocation } from "react-router-dom";
import { isAuthorized } from "$utils";
import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  Empty,
  Modal,
  Pagination,
  Row,
  Select,
  Space,
  Switch,
  Table,
  Tabs,
  Tag,
  Timeline,
  message,
} from "antd";
import {
  ArrowLeftOutlined,
  EditOutlined,
  ExclamationCircleOutlined,
  PlusOutlined,
  PoweroffOutlined,
} from "@ant-design/icons";
import "../style.less";
import { ABNORMAL_STATUS, AUDIT_PERMISSIONS, EDGE_PERMISSIONS, EVENT_PERMISSIONS, EXCEPTION_STATUS, SELF_CHECK_RESULT } from "../constants";
import {
  DETECTION_TYPES,
  EXCEPTION_TYPES,
  OnlineDot,
  connectColor,
  fromNow,
  qualityColor,
  toRows,
} from "../components/common";
import {
  AssignProjectModal,
  RebootModal,
  RecoveryDrawer,
} from "../components/device-modals";
import {
  ChannelModal,
  PictureCheckModal,
} from "../components/channel-modals";
import {
  CreateSessionModal,
  FileTransferModal,
  SessionHistoryDrawer,
} from "../components/remote-modals";
import { useTerminalSocket } from "../hooks/useTerminalSocket";
import TerminalView from "../components/terminal-view";
import moment from "moment";

// 操作审计分类
const AUDIT_KINDS = [
  { label: "项目", keys: ["分配", "项目"] },
  { label: "重启", keys: ["重启"] },
  { label: "远程会话", keys: ["会话", "终端"] },
  { label: "文件", keys: ["文件"] },
  { label: "命令", keys: ["命令", "指令"] },
  { label: "通道", keys: ["通道"] },
  { label: "升级任务", keys: ["升级", "下发"] },
];
const auditKind = (content = "") =>
  (AUDIT_KINDS.find((k) => k.keys.some((key) => content.includes(key))) || {}).label || "其他";

const REGISTER_METHOD = { agent: "设备主动注册（Agent）", manual: "手动添加", import: "批量导入" };

// 操作审计取系统日志（module=边缘设备管理），按设备号/名称过滤，再映射成表格字段
const toAuditRows = (logs, code, name) =>
  toRows(logs)
    .filter((r) => {
      const content = r.content || "";
      return content.includes(code) || (name && content.includes(name));
    })
    .map((r) => ({
      id: r.id,
      time: r.logTime ? moment(r.logTime).format("YYYY-MM-DD HH:mm:ss") : "—",
      operator: r.user?.name || r.user?.username || `用户${r.userId ?? "-"}`,
      target: code,
      action: auditKind(r.content),
      params: r.content,
      result: "成功",
      receipt: r.url || "—",
    }));

const DeviceDetail = ({ actions, dispatch }) => {
  const history = useHistory();
  const location = useLocation();
  const deviceId = useMemo(
    () => new URLSearchParams(location.search).get("id"),
    [location.search],
  );
  const { edgeDevice } = actions || {};

  const [device, setDevice] = useState(null);
  const [projects, setProjects] = useState([]);
  const [visionModels, setVisionModels] = useState([]);
  const [channels, setChannels] = useState([]);
  const [exceptions, setExceptions] = useState([]);
  const [confirmingException, setConfirmingException] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [sessionPage, setSessionPage] = useState(1);
  const [sessionPageSize, setSessionPageSize] = useState(10);
  const [sessionTotal, setSessionTotal] = useState(0);
  const [audits, setAudits] = useState([]);
  const [dataAvailability, setDataAvailability] = useState({
    channels: true,
    exceptions: true,
    sessions: true,
    audits: true,
    reboot: false,
  });
  const [activeTab, setActiveTab] = useState("overview");

  const [assignOpen, setAssignOpen] = useState(false);
  const [rebootOpen, setRebootOpen] = useState(false);
  const [channelOpen, setChannelOpen] = useState(false);
  const [editingChannel, setEditingChannel] = useState(null);
  const [previewChannelId, setPreviewChannelId] = useState(undefined);
  const previewChannel = channels.find((c) => c.id === previewChannelId);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [sessionOpen, setSessionOpen] = useState(false);
  const [historySession, setHistorySession] = useState(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);

  useEffect(() => {
    if (!channelOpen) return;
    dispatch(edgeDevice.queryVisionModels({ page: 1, pageSize: 100 })).then((res) => {
      if (res?.success) setVisionModels(toRows(res.payload?.data));
    });
  }, [channelOpen, dispatch, edgeDevice]);

  // 终端
  const terminalViewRef = useRef(null);
  const [wsConnected, setWsConnected] = useState(false);

  const terminal = useTerminalSocket({
    deviceId,
    onOpened: () => {
      setWsConnected(true);
    },
    onOutput: (data) => {
      terminalViewRef.current?.write(data);
    },
    onExited: (msg) => {
      setWsConnected(false);
      terminalViewRef.current?.write(`\r\n[终端已退出，退出码 ${msg?.exit_code ?? msg?.code ?? 0}]\r\n`);
    },
    onError: (msg) => {
      setWsConnected(false);
      terminalViewRef.current?.write(`\r\n[${msg?.code || "连接失败"}] ${msg?.message || "终端连接失败"}\r\n`);
      message.error(msg?.message || "终端连接失败");
    },
    onClosed: () => setWsConnected(false),
  });

  // 异常筛选 + 分页（事件接口服务端分页：page/page_size/total）
  const [exType, setExType] = useState(undefined);
  const [exStatus, setExStatus] = useState(undefined);
  const [exceptionDetail, setExceptionDetail] = useState(null);
  const [exPage, setExPage] = useState(1);
  const [exPageSize, setExPageSize] = useState(10);
  const [exTotal, setExTotal] = useState(0);
  // 审计筛选 + 分页（系统日志接口服务端分页：page/pageSize/count）
  const [auditAction, setAuditAction] = useState(undefined);
  const [auditTypes, setAuditTypes] = useState([]);
  const [auditPage, setAuditPage] = useState(1);
  const [auditPageSize, setAuditPageSize] = useState(10);
  const [auditTotal, setAuditTotal] = useState(0);


  const reloadAudits = useCallback(() => {
    return dispatch(
      edgeDevice.getEdgeDeviceAudits(deviceId, { page: auditPage, pageSize: auditPageSize }),
    ).then((res) => {
      setDataAvailability((cur) => ({ ...cur, audits: Boolean(res?.success) }));
      if (res?.success) {
        const data = res.payload?.data || {};
        setAudits(toAuditRows(data, deviceId, device?.name));
        setAuditTotal(Number(data.count ?? 0));
      }
    });
  }, [dispatch, edgeDevice, deviceId, auditPage, auditPageSize, auditAction, device?.name]);

  const reloadExceptions = useCallback(() => {
    return dispatch(
      edgeDevice.queryEdgeExceptions(deviceId, { page: exPage, pageSize: exPageSize, type: exType, status: exStatus }),
    ).then((res) => {
      setDataAvailability((cur) => ({ ...cur, exceptions: Boolean(res?.success) }));
      if (res?.success) {
        const data = res.payload?.data || {};
        setExceptions(data.items || []);
        setExTotal(Number(data.total ?? 0));
      }
    });
  }, [dispatch, edgeDevice, deviceId, exPage, exPageSize, exType, exStatus]);

  useEffect(() => {
    if (deviceId) reloadExceptions();
  }, [deviceId, reloadExceptions]);

  // 操作类型筛选选项：取自该设备实际已有的审计记录
  useEffect(() => {
    if (!deviceId) return;
    dispatch(edgeDevice.getEdgeDeviceAudits(deviceId, { page: 1, pageSize: 500 })).then((res) => {
      if (!res?.success) return;
      const kinds = toAuditRows(res.payload?.data, deviceId, device?.name).map((row) => row.action);
      setAuditTypes([...new Set(kinds)]);
    });
  }, [dispatch, edgeDevice, deviceId, device?.name]);

  const reloadSessions = useCallback(() => {
    return dispatch(
      edgeDevice.getEdgeDeviceSessions(deviceId, { page: sessionPage, pageSize: sessionPageSize }),
    ).then((res) => {
      setDataAvailability((cur) => ({ ...cur, sessions: Boolean(res?.success) }));
      if (res?.success) {
        const data = res.payload?.data || {};
        setSessions(toRows(data));
        setSessionTotal(Number(data.total ?? 0));
      }
    });
  }, [dispatch, edgeDevice, deviceId, sessionPage, sessionPageSize]);

  useEffect(() => {
    if (deviceId) reloadSessions();
  }, [deviceId, reloadSessions]);

  useEffect(() => {
    if (deviceId) reloadAudits();
  }, [deviceId, reloadAudits]);

  const loadAll = useCallback(async () => {
    const [d, c, p, l] = await Promise.all([
      dispatch(edgeDevice.getEdgeDeviceDetail(deviceId)),
      dispatch(edgeDevice.getEdgeDeviceChannels(deviceId)),
      dispatch(edgeDevice.getEdgeProjects()),
      dispatch(edgeDevice.queryEdgeDevices({})),
    ]);
    if (d?.success) {
      const row = toRows(l?.payload?.data).find((item) => item && item.id === deviceId);
      const detail = d.payload.data || {};
      setDevice(row ? { ...detail, health: { ...row.health, ...detail.health } } : detail);
    }
    setDataAvailability((cur) => ({
      ...cur,
      channels: Boolean(c?.success),
    }));
    if (c?.success) setChannels(toRows(c.payload?.data));
    if (p?.success) setProjects(toRows(p.payload?.data));
  }, [dispatch, edgeDevice, deviceId]);

  useEffect(() => {
    if (deviceId) loadAll();
  }, [deviceId, loadAll]);
  useEffect(() => {
    if (activeTab !== "channels") return undefined;
    const timer = setInterval(() => {
      dispatch(edgeDevice.getEdgeDeviceChannels(deviceId)).then((res) => {
        if (res?.success) setChannels(toRows(res.payload?.data));
      });
    }, 4000);
    return () => clearInterval(timer);
  }, [activeTab, dispatch, edgeDevice, deviceId]);

  const startTerminal = (shell, sessionOptions = {}) => {
    setWsConnected(false);
    terminalViewRef.current?.reset();
    const { cols = 120, rows = 35 } = terminalViewRef.current?.dimensions() || {};
    terminal.connect(shell, cols, rows, sessionOptions);
  };

  /* ---------------- 概况 ---------------- */
  const renderOverview = () => {

    const h = device.health || {
      cpu: device.cpu_percent ?? device.cpuPercent,
      memPercent: device.memory_used_percent ?? device.memoryUsedPercent,
      memUsed: device.memory_total_gb ?? device.memoryTotalGb,
      diskPercent: device.disk_used_percent ?? device.diskUsedPercent,
      diskUsed: device.disk_total_gb ?? device.diskTotalGb,
      temperature: device.temperature_celsius,
    };
    const metric = (v, unit) => (Number.isFinite(v) ? `${v.toFixed(2)}${unit}` : "—");
    const pct = (v) => metric(v, "%");
    const healthCards = [
      { label: "CPU 使用率", value: pct(h.cpu), foot: h.cpuStatus, percent: h.cpu || 0, warn: h.cpu > 65 },
      { label: "内存使用率", value: pct(h.memPercent), foot: h.memUsed, percent: h.memPercent || 0, warn: h.memPercent > 85 },
      { label: "磁盘使用率", value: pct(h.diskPercent), foot: h.diskUsed, percent: h.diskPercent || 0, warn: h.diskPercent > 85 },
      {
        label: "设备温度",
        value: metric(h.temperature, "℃"),
        foot: h.temperatureThreshold ? `阈值 ${h.temperatureThreshold}℃` : undefined,
        warn: h.temperature != null && h.temperature >= h.temperatureThreshold - 5,
      },
    ];
    const valueOrDash = (value) => (value == null || value === "" ? "—" : value);
    // 近期状态
    const stateNodes = [];
    if (device?.id) {
      const heartbeat = device.heartbeatAt ? moment(device.heartbeatAt) : null;
      stateNodes.push({
        ts: heartbeat ? heartbeat.format("YYYY-MM-DD HH:mm:ss") : "",
        title: device.online ? "设备在线" : "设备离线",
        desc: `${ABNORMAL_STATUS[device.abnormal] || device.abnormal || "—"} · 最后心跳 ${
          heartbeat ? heartbeat.format("MM-DD HH:mm") : "—"
        }`,
      });
    }
    exceptions.slice(0, 5).forEach((e) => {
      stateNodes.push({
        ts: e.startedAt ? `${e.startedAt}:00` : "",
        title: EXCEPTION_TYPES[e.type] || DETECTION_TYPES[e.type] || e.type || "异常",
        desc: [e.reason, EXCEPTION_STATUS[e.status] || e.status, SELF_CHECK_RESULT[e.result] || e.result]
          .filter(Boolean)
          .join(" · "),
      });
    });
    audits.slice(0, 5).forEach((a) => {
      stateNodes.push({
        ts: a.time === "—" ? "" : a.time,
        title: a.action,
        desc: [a.params, a.operator].filter(Boolean).join(" · "),
      });
    });
    const stateTimeline = stateNodes
      .filter((n) => n.title)
      .sort((a, b) => (a.ts < b.ts ? 1 : -1))
      .slice(0, 6);
    return (
      <div style={{ padding: "14px 4px 4px" }}>
        <Row gutter={[12, 12]}>
          {healthCards.map((card) => (
            <Col span={6} key={card.label}>
              <Card size="small" className="edge-health-card">
                <div style={{ display: "flex", justifyContent: "space-between", color: "#6b7483", fontSize: 13 }}>
                  <span>{card.label}</span>
                  <span>{card.foot}</span>
                </div>
                <div className="edge-health-value">{card.value}</div>
                {card.percent != null && <div className="edge-health-scale">
                  <i className={card.warn ? "warn" : ""} style={{ width: `${card.percent}%` }} />
                </div>}
              </Card>
            </Col>
          ))}
        </Row>
        <Row gutter={[12, 12]} style={{ marginTop: 14 }}>
          <Col span={12}>
            <Card size="small" title="设备与注册信息">
              <Descriptions column={2} size="small" bordered>
                <Descriptions.Item label="设备 ID">{valueOrDash(device.id)}</Descriptions.Item>
                <Descriptions.Item label="设备 SKU">{valueOrDash(device.sku)}</Descriptions.Item>
                <Descriptions.Item label="所属项目">
                  <Space size={6}>
                    {device.projectName || <Tag color="orange">未分配</Tag>}
                    {isAuthorized(EDGE_PERMISSIONS.assignProject) && (
                      <Button
                        type="link"
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => setAssignOpen(true)}
                      >
                        {device.projectId ? "调整" : "分配"}
                      </Button>
                    )}
                  </Space>
                </Descriptions.Item>
                <Descriptions.Item label="注册方式">{REGISTER_METHOD[device.registrationMethod] || valueOrDash(device.registrationMethod)}</Descriptions.Item>
                <Descriptions.Item label="首次注册时间">
              {device.firstRegisterAt ? moment(device.firstRegisterAt).format("YYYY-MM-DD HH:mm:ss") : "—"}
            </Descriptions.Item>
                <Descriptions.Item label="最近注册地址">{valueOrDash(device.registerAddress || device.lastRegisterAddress)}</Descriptions.Item>
              </Descriptions>
            </Card>
          </Col>
          <Col span={12}>
            <Card size="small" title="连接与版本">
              <Descriptions column={2} size="small" bordered>
                <Descriptions.Item label="连接状态">
                  <OnlineDot online={device.online} sub={device.online ? "" : "原因：心跳超时"} />
                </Descriptions.Item>
                <Descriptions.Item label="最后心跳">{fromNow(device.heartbeatAt)}</Descriptions.Item>
                <Descriptions.Item label="设备地址">{valueOrDash(device.address)}</Descriptions.Item>
                <Descriptions.Item label="基础软件版本">{device.runtimeVersion ? `Edge Runtime ${device.runtimeVersion}` : "—"}</Descriptions.Item>
                <Descriptions.Item label="视觉模型版本">
                  {device.modelVersion || "未安装"}
                </Descriptions.Item>
              </Descriptions>
            </Card>
          </Col>
          <Col span={24}>
            <Card size="small" title="近期状态">
              {stateTimeline.length ? <Timeline
                items={stateTimeline.map((t) => ({
                  children: (
                    <div>
                      <b>{t.title}</b>
                      {t.desc ? <div style={{ color: "#8c96a5", fontSize: 12 }}>{t.desc}</div> : null}
                      <div style={{ color: "#8c96a5", fontSize: 12 }}>{t.ts ? moment(t.ts).format("MM-DD HH:mm") : "—"}</div>
                      </div>
                  ),
                }))}
              /> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无状态时间线" />}
            </Card>
          </Col>
        </Row>
      </div>
    );
  };

  /* ---------------- 视频通道 ---------------- */
  const confirmToggle = (channel, enabled) => {
    const action = () => {
      dispatch(edgeDevice.toggleEdgeChannel(deviceId, channel, enabled)).then((res) => {
        if (res?.success) {
          // Agent 更新后会递增 revision，重新查询避免下一次编辑携带旧版本。
          dispatch(edgeDevice.getEdgeDeviceChannels(deviceId)).then((channelRes) => {
            if (channelRes?.success) setChannels(toRows(channelRes.payload?.data));
          });
          reloadAudits();
          reloadExceptions();
        }
      });
    };
    if (!enabled) {
      Modal.confirm({
        title: "停用通道",
        icon: <ExclamationCircleOutlined />,
        content: `停用「${channel.name}」后，该通道关联的识别任务将停止。确认停用？`,
        okText: "确认停用",
        okButtonProps: { danger: true },
        cancelText: "取消",
        onOk: action,
      });
    } else {
      action();
    }
  };

  const renderChannels = () => (
    <div style={{ padding: "14px 4px 4px" }}>
      <div style={{ display: "flex", alignItems: "center", marginBottom: 12 }}>
        <b>视频通道</b>
        <span style={{ color: "#8c96a5", fontSize: 12, marginLeft: 10 }}>
          视频连接状态与画面质量状态分开呈现；断流时画面质量显示“无法检测”
        </span>
        {isAuthorized("CHANNELCONFIGURATIONISSUANCE") && (          <Button
            type="primary"
            icon={<PlusOutlined />}
            size="small"
            style={{ marginLeft: "auto" }}
            disabled={!dataAvailability.channels}
            onClick={() => {
              setEditingChannel(null);
              setChannelOpen(true);
            }}
          >
            添加通道
          </Button>
        )}
      </div>
      {!dataAvailability.channels ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="视频通道数据获取失败" />
      ) : !channels.length ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无视频通道" />
      ) : <Row gutter={[14, 14]}>
        {channels.map((channel) => {
          const broken = channel.connect === "断流";
          return (
            <Col span={8} key={channel.id}>
              <Card size="small" bodyStyle={{ padding: 0 }}>
                <div className={`edge-video ${broken ? "broken" : ""}`}>
                  {broken ? (
                    <div style={{ zIndex: 2, textAlign: "center" }}>
                      <b>视频流中断</b>
                      <div style={{ color: "#cbd5e1", fontSize: 12 }}>RTSP 连接超时</div>
                    </div>
                  ) : channel.snapshot ? (
                    <img
                      src={`data:${channel.snapshotMimeType || "image/jpeg"};base64,${channel.snapshot}`}
                      alt={`${channel.name} 画面`}
                      style={{ width: "100%", height: "100%", objectFit: "contain", border: "none" }}
                    />
                  ) : (
                    <div className="edge-video-frame" />
                  )}
                  <div className="edge-video-bottom">
                    <span>
                      <span style={{ color: broken ? "#ff4d4f" : "#52c41a" }}>●</span>{" "}
                      {channel.connect}
                    </span>
                    <span>{broken ? "—" : `${channel.fps} FPS`}</span>
                  </div>
                </div>
                <div style={{ padding: "12px 14px" }}>
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <b>{channel.name}</b>
                    <Switch
                      size="small"
                      style={{ marginLeft: "auto" }}
                      checked={channel.enabled}
                      onChange={(checked) => confirmToggle(channel, checked)}
                    />
                  </div>
                  <div style={{ fontSize: 12, color: "#8c96a5", marginTop: 4 }}>
                    {channel.id} · {channel.codec} · {channel.resolution}
                    {channel.lastTestAt
                      ? ` · 最近测试 ${moment(channel.lastTestAt).format("MM-DD HH:mm")}${
                          channel.lastTestDurationMs ? `（${channel.lastTestDurationMs} ms）` : ""
                        }`
                      : ""}
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <Space size={6}>
                      <Tag color={connectColor(channel.connect)}>连接：{channel.connect}</Tag>
                      {channel.quality ? (
                        <Tag color={qualityColor(channel.quality)}>画面：{channel.quality}</Tag>
                      ) : null}
                    </Space>
                  </div>
                  <div style={{ marginTop: 10, textAlign: "right" }}>
                    <Button
                      size="small"
                      disabled={broken || !channel.enabled}
                      onClick={() => {
                        setPreviewChannelId(channel.id);
                        setPreviewOpen(true);
                      }}
                    >
                      查看画面
                    </Button>
                    {isAuthorized("CHANNELCONFIGURATIONISSUANCE") && (
                      <Button
                        type="link"
                        size="small"
                        onClick={() => {
                          setEditingChannel(channel);
                          setChannelOpen(true);
                        }}
                      >
                        编辑
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            </Col>
          );
        })}
      </Row>}
    </div>
  );

  // 异常与恢复记录：由服务端筛选和分页。
  const confirmException = record => {
    Modal.confirm({
      title: "确认异常",
      content: "确认后该记录将变为灰色并退出待处理异常汇总。视频流和识别的实际故障状态仍会保留。",
      okText: "确认异常", cancelText: "取消",
      onOk: async () => {
        setConfirmingException(record.id);
        try {
          const result = await dispatch(edgeDevice.acknowledgeEdgeException(deviceId, record.id));
          if (!result?.success) throw new Error("确认失败");
          await Promise.all([
            reloadExceptions(), reloadAudits(),
            dispatch(edgeDevice.getEdgeDeviceDetail(deviceId)).then(res => { if (res?.success) setDevice(res.payload.data); }),
            dispatch(edgeDevice.queryEdgeDevices({})),
          ]);
        } finally { setConfirmingException(null); }
      },
    });
  };

  const renderExceptions = () => (
    <div style={{ padding: "14px 4px 4px" }}>
      <Card size="small">
        <div className="edge-toolbar" style={{ marginBottom: 12 }}>
          <b>异常与恢复记录</b>
          <Select
            allowClear
            style={{ width: 150, marginLeft: "auto" }}
            placeholder="全部类型"
            value={exType}
            onChange={(v) => {
              setExType(v);
              setExPage(1);
            }}
            options={Object.entries(EXCEPTION_TYPES).map(([value, label]) => ({ label, value }))}
          />
          <Select
            allowClear
            style={{ width: 130 }}
            placeholder="全部状态"
            value={exStatus}
            onChange={(v) => {
              setExStatus(v);
              setExPage(1);
            }}
            options={[{ label: "进行中", value: "active" }, { label: "已恢复", value: "recovered" }, { label: "已关闭", value: "closed" }, { label: "已确认", value: "acknowledged" }]}
          />
        </div>
        {!dataAvailability.exceptions ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="异常与恢复记录获取失败" /> : <Table
          rowKey="id"
          size="small"
          pagination={{
            current: exPage,
            pageSize: exPageSize,
            total: exTotal,
            showSizeChanger: true,
            pageSizeOptions: ["10", "20", "50"],
            showTotal: (total) => `共 ${total} 条`,
            onChange: (page, pageSize) => {
              setExPage(page);
              setExPageSize(pageSize);
            },
          }}
          dataSource={exceptions}
          rowClassName={record => record.acknowledged ? "edge-exception-acknowledged" : ""}
          columns={[
            { title: "记录类型", dataIndex: "recordTypeLabel", width: 90 },
            { title: "异常类型", dataIndex: "typeLabel", width: 110 },
            { title: "异常对象", dataIndex: "target", ellipsis: true },
            { title: "原因", dataIndex: "reason", ellipsis: true },
            { title: "开始时间", dataIndex: "startedAtLabel", width: 180 },
            { title: "持续时间", dataIndex: "durationLabel", width: 100 },
            { title: "当前状态", dataIndex: "statusLabel", width: 90,
              render: (v, r) => <Tag color={r.acknowledged ? "default" : r.status === "active" ? "red" : "green"}>{v}</Tag> },
            { title: "结果", dataIndex: "resultLabel", width: 90 },
            { title: "操作", key: "detail", width: 150,
              render: (_, r) => <Space size={0}>
                <Button type="link" onClick={() => setExceptionDetail(r)}>详情</Button>
                {r.record_type === "exception" && !r.acknowledged ? <Button type="link" loading={confirmingException === r.id} disabled={Boolean(confirmingException)} onClick={() => confirmException(r)}>确认</Button> : null}
              </Space> },
          ]}
        />}
      </Card>
    </div>
  );

  /* ---------------- 远程会话 ---------------- */
  const renderRemote = () => {
    const active = sessions.find((s) => s.active);
    return (
      <div style={{ padding: "14px 4px 4px" }}>
        {!device.online ? (
          <Alert
            type="error"
            showIcon
            style={{ marginBottom: 12 }}
            message="设备已离线：整机重启、远程终端和文件传输均不可用。"
          />
        ) : null}
        {!dataAvailability.sessions ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="远程会话数据获取失败" /> : <Row gutter={[14, 14]}>
          <Col span={7}>
            <Card
              size="small"
              title="远程会话"
              extra={
                <Button
                  type="primary"
                  size="small"
                  disabled={!device.online || !dataAvailability.sessions}
                  onClick={() => setSessionOpen(true)}
                >
                  新建
                </Button>
              }
            >
              {sessions.map((s) => (
                <div
                  key={s.id}
                  onClick={() => {
                    if (!s.active) {
                      setHistorySession(s);
                      setHistoryOpen(true);
                      // 详情接口（含录制摘要/输入明细），后端落地后有值
                      dispatch(edgeDevice.getEdgeSessionDetail(s.id)).then((res) => {
                        if (res?.success) {
                          setHistorySession((cur) => (cur?.id === s.id ? { ...cur, ...(res.payload?.data || {}) } : cur));
                        }
                      });
                    }
                  }}
                  style={{
                    border: `1px solid ${s.active ? "#91caff" : "#edf0f5"}`,
                    background: s.active ? "#e6f4ff" : "#fff",
                    borderRadius: 7,
                    padding: 12,
                    marginBottom: 8,
                    cursor: s.active ? "default" : "pointer",
                  }}
                >
                  <b>运维会话 #{s.id}</b>
                  <div style={{ fontSize: 12, color: "#8c96a5", marginTop: 4 }}>
                    {s.active ? (
                      <span>
                        <span style={{ color: "#52c41a" }}>●</span> {s.status} · 开始于{" "}
                        {s.startedAt}
                      </span>
                    ) : (
                      <span>
                        {s.operator} · {s.status} · {s.duration}
                      </span>
                    )}
                  </div>
                </div>
              ))}
              <Pagination
                current={sessionPage}
                pageSize={sessionPageSize}
                total={sessionTotal}
                showSizeChanger
                pageSizeOptions={["10", "20", "50"]}
                showTotal={(total) => `共 ${total} 条`}
                onChange={(page, pageSize) => {
                  setSessionPage(page);
                  setSessionPageSize(pageSize);
                }}
                style={{ marginTop: 16, justifyContent: "flex-end" }}
              />
            </Card>
          </Col>
          <Col span={17}>
            <div className="edge-terminal">
              <div className="edge-terminal-bar">
                <span style={{ color: wsConnected ? "#52c41a" : "#8c96a5" }}>●</span>
                <span>
                  {device.name} · {device.id}
                </span>
                {isAuthorized(EDGE_PERMISSIONS.fileTransfer) && (
                  <Button
                    size="small"
                    disabled={!wsConnected}
                    onClick={() => setTransferOpen(true)}
                    style={{ marginLeft: "auto", background: "#26364b", borderColor: "#40536c", color: "#fff" }}
                  >
                    上传/下载
                  </Button>
                )}
                <Button
                  size="small"
                  danger
                  type="primary"
                  disabled={!wsConnected}
                  style={{
                    background: wsConnected ? "#ff4d4f" : undefined,
                    borderColor: wsConnected ? "#ff4d4f" : undefined,
                    color: wsConnected ? "#fff" : "#cbd5e1",
                  }}
                  onClick={() => {
                    terminal.close();
                    setWsConnected(false);
                    reloadSessions();
                    reloadAudits();
                  }}
                >
                  结束会话
                </Button>
              </div>
              <div className="edge-terminal-body">
                <div>Edge Runtime {device.runtimeVersion} (GNU/Linux 5.10.110)</div>
                <div>
                  {wsConnected
                    ? `WebSocket 已连接。命令与文件传输全程审计。`
                    : active
                    ? `会话已创建，正在建立终端连接…`
                    : "当前没有进行中的会话，点击左侧「新建」创建受控运维会话。"}
                </div>
                <TerminalView
                  ref={terminalViewRef}
                  connected={wsConnected}
                  onData={terminal.send}
                  onResize={terminal.resize}
                />
              </div>
            </div>
          </Col>
        </Row>}
      </div>
    );
  };

  /*操作审计*/
  const auditTypeOptions = useMemo(
    () =>
      [...new Set([...auditTypes, ...audits.map((row) => row.action)])].map((value) => ({
        label: value,
        value,
      })),
    [auditTypes, audits],
  );
  const filteredAudits = audits.filter((a) => !auditAction || a.action.includes(auditAction));
  const renderAudit = () => (
    <div style={{ padding: "14px 4px 4px" }}>
      <Card
        size="small"
        title="该设备操作审计"
      >
        <div className="edge-toolbar" style={{ marginBottom: 12 }}>
          <Select
            allowClear
            style={{ width: 180 }}
            placeholder="全部操作类型"
            value={auditAction}
            onChange={(v) => {
              setAuditAction(v);
              setAuditPage(1);
            }}
            options={auditTypeOptions}
          />
        </div>
        {!dataAvailability.audits ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="操作审计数据获取失败" /> : <Table
          rowKey="id"
          size="small"
          pagination={{
            current: auditPage,
            pageSize: auditPageSize,
            total: auditTotal,
            showSizeChanger: true,
            pageSizeOptions: ["10", "20", "50", "100"],
            showTotal: (total) => `共 ${total} 条`,
            onChange: (page, pageSize) => {
              setAuditPage(page);
              setAuditPageSize(pageSize);
            },
          }}
          dataSource={filteredAudits}
          columns={[
            { title: "操作时间", dataIndex: "time", width: 160 },
            { title: "操作人", dataIndex: "operator", width: 100 },
            { title: "操作对象", dataIndex: "target", width: 170 },
            { title: "操作内容", dataIndex: "action", width: 130 },
            {
              title: "参数摘要",
              dataIndex: "params",
              render: (v) => <code style={{ fontSize: 12 }}>{v}</code>,
            },
            {
              title: "结果",
              dataIndex: "result",
              width: 90,
              render: (v) => (
                <Tag color={v === "成功" ? "green" : v === "已提交" ? "blue" : "red"}>{v}</Tag>
              ),
            },
            { title: "回执", dataIndex: "receipt", render: (v) => v || "—" },
          ]}
        />}
      </Card>
    </div>
  );

  if (!device) {
    return (
      <div style={{ background: "white", padding: "10px 20px 0" }}>
        <Empty description="设备不存在或加载中" />
      </div>
    );
  }

  return (
    <div className="edge-device" style={{
      background: "white",
      margin: "8px 12px",
      padding: "10px 20px 0",
      height: "calc(100vh - 80px)",
      overflow: "auto",
    }}>
      <div style={{ display: "flex", alignItems: "center", marginBottom: 12 }}>
        <div style={{
          width: 48, height: 48, borderRadius: 8,
          background: "#e6f4ff", color: "#1677ff",
          display: "grid", placeItems: "center", fontSize: 22, marginRight: 13,
        }}>▣</div>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>
            {device.name}
            <Tag color={device.online ? "green" : "red"} style={{ marginLeft: 10 }}>
              {device.online ? "在线" : "离线"}
            </Tag>
          </div>
          <div style={{ color: "#86909c", marginTop: 4, fontSize: 13 }}>
            {device.id} · {device.sku} · {device.projectName || "未分配"}
          </div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 34 }}>
          <div>
            <div style={{ fontSize: 12, color: "#8c96a5" }}>最后心跳</div>
            <div style={{ fontWeight: 600, marginTop: 4 }}>{fromNow(device.heartbeatAt)}</div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: "#8c96a5" }}>异常状态</div>
            <div style={{ fontWeight: 600, marginTop: 4 }}>{ABNORMAL_STATUS[device.abnormal] || device.abnormal || "—"}</div>
            </div>
          {isAuthorized(EDGE_PERMISSIONS.reboot) && (
            <Button
              danger type="primary" ghost
              icon={<PoweroffOutlined />}
              disabled={!device.online}
              onClick={() => setRebootOpen(true)}
            >
              重启设备
            </Button>
          )}
        </div>
      </div>
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        tabBarExtraContent={
          <Button icon={<ArrowLeftOutlined />} onClick={() => history.push("/device/edgeDevice/edgeDevices")}>返回</Button>
        }
        items={[
          { key: "overview", label: "概况", children: renderOverview() },
          { key: "channels", label: "视频通道", children: renderChannels() },
          isAuthorized(EVENT_PERMISSIONS.view) && {
            key: "exceptions",
            label: "异常记录",
            children: renderExceptions(),
          },
          isAuthorized(EDGE_PERMISSIONS.remoteSession) && {
            key: "remote",
            label: "远程会话",
            children: renderRemote(),
          },
          isAuthorized(AUDIT_PERMISSIONS.view) && {
            key: "audit",
            label: "操作审计",
            children: renderAudit(),
          },
        ].filter(Boolean)}
      />

      <AssignProjectModal
        open={assignOpen}
        device={device}
        projects={projects}
        onCancel={(refresh) => {
          setAssignOpen(false);
          if (refresh) loadAll();
        }}
        onSubmit={(id, pid) => dispatch(edgeDevice.assignEdgeDeviceProject(id, pid))}
      />
      <RecoveryDrawer open={Boolean(exceptionDetail)} detail={exceptionDetail} onClose={() => setExceptionDetail(null)} />
      <RebootModal
        open={rebootOpen}
        device={device}
        onCancel={(submitted) => {
          setRebootOpen(false);
          if (submitted) {
            loadAll();
            reloadAudits();
          }
        }}
        onSubmit={(id, key) => dispatch(edgeDevice.rebootEdgeDevice(id, key))}
        onQuery={(id, operationId) => dispatch(edgeDevice.getEdgeDeviceOperation(id, operationId))}
      />
      <ChannelModal
        open={channelOpen}
        channel={editingChannel}
        models={visionModels}
        onCancel={(refresh) => {
          setChannelOpen(false);
          if (refresh) {
            dispatch(edgeDevice.getEdgeDeviceChannels(deviceId)).then((res) => {
              if (res?.success) setChannels(toRows(res.payload?.data));
            });
          }
        }}
        onTest={(values) => dispatch(edgeDevice.testEdgeChannel(deviceId, values))}
        onSubmit={(payload) => dispatch(edgeDevice.saveEdgeChannel(deviceId, payload))}
      />
      <PictureCheckModal
        open={previewOpen}
        channel={previewChannel}
        onCancel={() => setPreviewOpen(false)}
      />
      <CreateSessionModal
        open={sessionOpen}
        device={device}
        onCancel={(created, values) => {
          setSessionOpen(false);
          if (created) {
            setSessionPage(1);
            reloadSessions();
            reloadAudits();
            // 会话创建成功后建立终端 WebSocket 连接
            startTerminal(values?.shell, values);
          }
        }}
        onSubmit={(values) => dispatch(edgeDevice.createEdgeRemoteSession(deviceId, values))}
      />
      <SessionHistoryDrawer
        open={historyOpen}
        session={historySession}
        onClose={() => setHistoryOpen(false)}
      />
      <FileTransferModal
        open={transferOpen}
        deviceId={deviceId}
        onCancel={(done) => {
          setTransferOpen(false);
          if (done) reloadAudits();
        }}
      />
    </div>
  );
};

function mapStateToProps(state) {
  return {
    actions: state.global.actions,
  };
}

export default connect(mapStateToProps)(DeviceDetail);
