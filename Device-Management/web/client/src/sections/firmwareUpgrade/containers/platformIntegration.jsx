import React, { useEffect, useMemo, useState } from "react";
import { connect } from "react-redux";
import {
  AutoComplete,
  Button,
  Col,
  Empty,
  Form,
  Input,
  message,
  Modal,
  Row,
  Select,
  Space,
  Switch,
  Table,
  Tabs,
  Tag,
  Tooltip,
} from "antd";

const toRows = (data) =>
  Array.isArray(data) ? data : Array.isArray(data?.rows) ? data.rows : Array.isArray(data?.items) ? data.items : [];

const KIND_TEXT = { mqtt: "MQTT 推送", http: "接口直连" };
const KIND_OPTIONS = [
  { label: "MQTT 推送", value: "mqtt" },
  { label: "接口直连", value: "http" },
];

// Topic 模板支持的占位符，推送时按实际值替换
const DEFAULT_TOPIC = "anxin/alarm/{deviceId}";

// 订阅按 detection_type 编码存，界面显示中文，避免文案调整导致历史订阅失效
const ALERT_TYPES = [
  { label: "边坡位移", value: "slope_deform" },
  { label: "人员闯入", value: "person" },
  { label: "画面严重遮挡", value: "screen_abnormal" },
];
const ALERT_TYPE_TEXT = {
  slope_deform: "边坡位移",
  person: "人员闯入",
  screen_abnormal: "画面严重遮挡",
};
const LEVEL_OPTIONS = ["高", "中"];
const TIMING_CONFIRMED = "confirmed";

// 连接状态取该平台最近一次投递结果，未投递过即未测试
const connectState = (record) => {
  if (record.enabled === false) return { text: "已停用", color: "default" };
  if (!record.lastPushStatus) return { text: "未测试", color: "default" };
  if (record.lastPushStatus === "success") return { text: "已连通", color: "green" };
  if (record.lastPushStatus === "failed") return { text: "连接异常", color: "red" };
  if (record.lastPushStatus === "pending") return { text: "推送中", color: "blue" };
  return { text: "未推送", color: "orange" };
};

const PlatformIntegration = ({ actions, dispatch }) => {
  const { firmwareUpgrade, edgeDevice } = actions || {};
  const [tab, setTab] = useState("平台接入");

  const [platforms, setPlatforms] = useState([]);
  const [mappings, setMappings] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [projects, setProjects] = useState([]);
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(false);

  const [platformOpen, setPlatformOpen] = useState(false);
  const [platformEditing, setPlatformEditing] = useState(null);
  const [mappingOpen, setMappingOpen] = useState(false);
  const [mappingEditing, setMappingEditing] = useState(null);
  const [subscriptionOpen, setSubscriptionOpen] = useState(false);
  const [subscriptionEditing, setSubscriptionEditing] = useState(null);

  const [platformForm] = Form.useForm();
  const [mappingForm] = Form.useForm();
  const [subscriptionForm] = Form.useForm();
  const mappingProjectId = Form.useWatch("projectId", mappingForm);
  const mappingDeviceCode = Form.useWatch("deviceCode", mappingForm);
  const platformKind = Form.useWatch("kind", platformForm);

  // 选中设备后拉取该设备的视频通道，通道来源与设备详情一致
  const [channels, setChannels] = useState([]);
  const [channelLoading, setChannelLoading] = useState(false);

  // 结构物候选：平台配了结构物查询接口才有，否则退回手工填写
  const [structureOptions, setStructureOptions] = useState([]);
  const [structureConfigured, setStructureConfigured] = useState(true);
  const [structureLoading, setStructureLoading] = useState(false);
  const mappingConfigId = Form.useWatch("platformConfigId", mappingForm);

  useEffect(() => {
    if (!mappingOpen || !mappingConfigId || !mappingProjectId) {
      setStructureOptions([]);
      return undefined;
    }
    let cancelled = false;
    setStructureLoading(true);
    dispatch(firmwareUpgrade.queryPlatformStructures(mappingConfigId, mappingProjectId))
      .then((res) => {
        if (cancelled) return;
        const data = res?.payload?.data || {};
        const rows = Array.isArray(data) ? data : data.items || [];
        setStructureConfigured(data.configured !== false);
        setStructureOptions(rows.map((row) => ({ value: row.id, label: row.name ? `${row.name}（${row.id}）` : row.id, name: row.name })));
      })
      .finally(() => {
        if (!cancelled) setStructureLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [mappingOpen, mappingConfigId, mappingProjectId]);

  useEffect(() => {
    if (!mappingDeviceCode) {
      setChannels([]);
      return undefined;
    }
    let cancelled = false;
    setChannelLoading(true);
    dispatch(edgeDevice.getEdgeDeviceChannels(mappingDeviceCode))
      .then((res) => {
        if (cancelled) return;
        setChannels(res?.success ? toRows(res.payload?.data) : []);
      })
      .finally(() => {
        if (!cancelled) setChannelLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [mappingDeviceCode]);

  const loadPlatforms = async () => {
    setLoading(true);
    try {
      const res = await dispatch(firmwareUpgrade.queryPlatformConfigs());
      if (res?.success) setPlatforms(toRows(res.payload?.data));
    } finally {
      setLoading(false);
    }
  };

  const loadMappings = async () => {
    const res = await dispatch(firmwareUpgrade.queryPlatformMappings());
    if (res?.success) setMappings(toRows(res.payload?.data));
  };

  const loadSubscriptions = async () => {
    const res = await dispatch(firmwareUpgrade.queryPlatformSubscriptions());
    if (res?.success) setSubscriptions(toRows(res.payload?.data));
  };

  useEffect(() => {
    loadPlatforms();
    loadMappings();
    loadSubscriptions();
    dispatch(edgeDevice.getEdgeProjects()).then((res) => {
      if (res?.success) setProjects(toRows(res.payload?.data));
    });
    dispatch(edgeDevice.queryEdgeDevices({})).then((res) => {
      if (res?.success) setDevices(toRows(res.payload?.data));
    });
  }, []);

  const projectOptions = useMemo(
    () => projects.map((p) => ({ label: p.name, value: p.id })),
    [projects],
  );

  const platformOptions = useMemo(
    () => platforms.map((p) => ({ label: p.name, value: p.id })),
    [platforms],
  );

  const deviceOptions = useMemo(
    () =>
      devices
        .filter((d) => !mappingProjectId || d.projectId === mappingProjectId)
        .map((d) => ({ label: `${d.name || d.code || d.id}`, value: d.code || d.id })),
    [devices, mappingProjectId],
  );

  const channelOptions = useMemo(
    () =>
      channels.map((c) => ({
        label: c.enabled === false ? `${c.name}（停用）` : c.name,
        value: c.name,
      })),
    [channels],
  );

  /* ---------------- 接收平台 ---------------- */

  const openPlatform = (record) => {
    setPlatformEditing(record || null);
    platformForm.resetFields();
    platformForm.setFieldsValue(
      record
        ? {
            name: record.name,
            kind: record.kind === "http" ? "http" : "mqtt",
            pushUrl: record.pushUrl,
            credential: record.credential,
            mqttBroker: record.mqttBroker,
            mqttTopic: record.mqttTopic,
            mqttClientId: record.mqttClientId,
            mqttUsername: record.mqttUsername,
            mqttPassword: record.mqttPassword,
            confirmCallback: record.confirmCallback === true,
          }
        : {
            kind: "mqtt",
            confirmCallback: false,
            mqttTopic: DEFAULT_TOPIC,
          },
    );
    setPlatformOpen(true);
  };

  const savePlatform = async () => {
    const values = await platformForm.validateFields();
    const res = await dispatch(
      firmwareUpgrade.savePlatformConfig({
        ...values,
        // 报文模板已从界面移除，保存时带上库里的原值，避免编辑后把已有配置清空
        pushPayloadTemplate: platformEditing?.pushPayloadTemplate,
        id: platformEditing?.id,
        enabled: platformEditing ? platformEditing.enabled !== false : true,
      }),
    );
    if (res?.success) {
      setPlatformOpen(false);
      loadPlatforms();
    }
  };

  const togglePlatform = async (record, enabled) => {
    const res = await dispatch(
      firmwareUpgrade.savePlatformConfig({
        id: record.id,
        name: record.name,
        kind: record.kind,
        pushUrl: record.pushUrl,
        credential: record.credential,
        mqttBroker: record.mqttBroker,
        mqttTopic: record.mqttTopic,
        mqttClientId: record.mqttClientId,
        mqttUsername: record.mqttUsername,
        mqttPassword: record.mqttPassword,
        pushPayloadTemplate: record.pushPayloadTemplate,
        confirmCallback: record.confirmCallback,
        enabled,
      }),
    );
    if (res?.success) loadPlatforms();
  };

  const testPlatform = async (record) => {
    const hide = message.loading(
      record.kind === "mqtt" ? `正在连接 ${record.name} 的 Broker…` : `正在测试 ${record.name} 的推送地址…`,
      0,
    );
    const res = await dispatch(firmwareUpgrade.testPlatformConfig(record.id));
    hide();
    if (!res?.success) return;
    const data = res.payload?.data || {};
    if (data.reachable) {
      message.success(
        data.kind === "mqtt"
          ? `Broker 连接成功（${data.durationMs || 0} ms）`
          : `地址可达（HTTP ${data.statusCode || "—"}，${data.durationMs || 0} ms）`,
      );
    } else {
      message.error(`${data.kind === "mqtt" ? "Broker 连接失败" : "地址不可达"}：${data.error || "连接失败"}`);
    }
  };

  /* ---------------- 对象关联 ---------------- */

  const openMapping = (record) => {
    setMappingEditing(record || null);
    mappingForm.resetFields();
    mappingForm.setFieldsValue(
      record
        ? {
            platformConfigId: record.platformConfigId,
            projectId: record.projectId,
            deviceCode: record.deviceCode,
            channelName: record.channelName,
            structureName: record.structureName,
            structureId: record.structureId,
            sourceName: record.sourceName,
            sourceId: record.sourceId,
          }
        : {},
    );
    setMappingOpen(true);
  };

  const saveMapping = async () => {
    const values = await mappingForm.validateFields();
    const res = await dispatch(
      firmwareUpgrade.savePlatformMapping({ ...values, id: mappingEditing?.id }),
    );
    if (res?.success) {
      setMappingOpen(false);
      loadMappings();
    }
  };

  const removeMapping = (record) => {
    Modal.confirm({
      title: "删除对象关联",
      content: `确认删除「${record.projectName || record.projectId} / ${record.deviceCode}」的结构物关联？删除后该设备不再推送。`,
      okType: "danger",
      onOk: async () => {
        const res = await dispatch(firmwareUpgrade.removePlatformMapping(record.id));
        if (res?.success) loadMappings();
      },
    });
  };

  /* ---------------- 推送订阅 ---------------- */

  const openSubscription = (record) => {
    setSubscriptionEditing(record || null);
    subscriptionForm.resetFields();
    subscriptionForm.setFieldsValue(
      record
        ? {
            projectId: record.projectId,
            platformConfigId: record.platformConfigId,
            types: record.types || [],
            levels: record.levels || [],
          }
        : {},
    );
    setSubscriptionOpen(true);
  };

  const saveSubscription = async () => {
    const values = await subscriptionForm.validateFields();
    const res = await dispatch(
      firmwareUpgrade.savePlatformSubscription({
        ...values,
        id: subscriptionEditing?.id,
        timings: [TIMING_CONFIRMED],
        enabled: subscriptionEditing ? subscriptionEditing.enabled !== false : true,
      }),
    );
    if (res?.success) {
      setSubscriptionOpen(false);
      loadSubscriptions();
    }
  };

  const toggleSubscription = async (record) => {
    const res = await dispatch(
      firmwareUpgrade.savePlatformSubscription({
        id: record.id,
        projectId: record.projectId,
        platformConfigId: record.platformConfigId,
        types: record.types || [],
        levels: record.levels || [],
        timings: [TIMING_CONFIRMED],
        enabled: record.enabled === false,
      }),
    );
    if (res?.success) loadSubscriptions();
  };

  /* ---------------- 列定义 ---------------- */

  const platformColumns = [
    {
      title: "接收平台",
      width: 220,
      render: (_, r) => (
        <Space size={8}>
          <span
            style={{
              width: 22,
              height: 22,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 4,
              fontSize: 12,
              background: r.kind === "http" ? "#f2f3f5" : "#e8f0ff",
              color: r.kind === "http" ? "#5c6675" : "#005ABD",
            }}
          >
            {r.kind === "http" ? "↗" : "M"}
          </span>
          <span>{r.name || "—"}</span>
        </Space>
      ),
    },
    {
      title: "对接方式",
      width: 150,
      render: (_, r) => KIND_TEXT[r.kind] || "—",
    },
    {
      title: "推送地址",
      width: 300,
      render: (_, r) =>
        r.kind === "mqtt" ? (
          <span>
            <code style={{ wordBreak: "break-all" }}>{r.mqttBroker || "未配置"}</code>
            <div style={{ fontSize: 12, color: "#8c96a5" }}>topic: {r.mqttTopic || DEFAULT_TOPIC}</div>
          </span>
        ) : (
          <Tooltip title={r.pushUrl}>
            <span style={{ wordBreak: "break-all" }}>{r.pushUrl || "未配置"}</span>
          </Tooltip>
        ),
    },
    {
      title: "确认回传",
      width: 150,
      render: (_, r) =>
        r.confirmCallback ? (
          <Tag color="green">已配置（待联调）</Tag>
        ) : (
          <span style={{ color: "#8c96a5" }}>单向推送</span>
        ),
    },
    {
      title: "连接状态",
      width: 110,
      render: (_, r) => {
        const state = connectState(r);
        return (
          <Tooltip title={r.lastPushError || (r.lastPushAt ? `最近投递 ${r.lastPushAt}` : "尚无投递记录")}>
            <Tag color={state.color}>{state.text}</Tag>
          </Tooltip>
        );
      },
    },
    {
      title: "启用状态",
      width: 100,
      render: (_, r) => (
        <Tag color={r.enabled === false ? "" : "green"}>{r.enabled === false ? "停用" : "启用"}</Tag>
      ),
    },
    {
      title: "操作",
      width: 180,
      render: (_, r) => (
        <Space size={4}>
          <Button size="small" type="link" onClick={() => openPlatform(r)}>
            配置
          </Button>
          <Button size="small" type="link" onClick={() => testPlatform(r)}>
            测试连接
          </Button>
          <Button size="small" type="link" onClick={() => togglePlatform(r, r.enabled === false)}>
            {r.enabled === false ? "启用" : "停用"}
          </Button>
        </Space>
      ),
    },
  ];

  const mappingColumns = [
    { title: "接收平台", dataIndex: "platformName", width: 150, render: (v) => v || "—" },
    { title: "本平台项目", dataIndex: "projectName", width: 200, render: (v, r) => v || r.projectId || "—" },
    {
      title: "设备 / 视频通道",
      width: 240,
      render: (_, r) => (
        <span>
          {r.deviceCode || "—"}
          {r.channelName ? <div style={{ fontSize: 12, color: "#8c96a5" }}>{r.channelName}</div> : null}
        </span>
      ),
    },
    {
      title: "外部结构物",
      width: 200,
      render: (_, r) => (
        <span>
          {r.structureName || "—"}
          {r.structureId ? <div style={{ fontSize: 12, color: "#8c96a5" }}>{r.structureId}</div> : null}
        </span>
      ),
    },
    {
      title: "外部告警源",
      width: 200,
      render: (_, r) => (
        <span>
          {r.sourceName || "—"}
          {r.sourceId ? <div style={{ fontSize: 12, color: "#8c96a5" }}>{r.sourceId}</div> : null}
        </span>
      ),
    },
    {
      title: "操作",
      width: 110,
      render: (_, r) => (
        <Space size={4}>
          <Button size="small" type="link" onClick={() => openMapping(r)}>
            编辑
          </Button>
          <Button size="small" type="link" danger onClick={() => removeMapping(r)}>
            删除
          </Button>
        </Space>
      ),
    },
  ];

  const subscriptionColumns = [
    { title: "所属项目", dataIndex: "projectName", width: 200, render: (v, r) => v || r.projectId || "—" },
    { title: "接收平台", dataIndex: "platformName", width: 150, render: (v) => v || "—" },
    {
      title: "告警类型 / 等级",
      width: 260,
      render: (_, r) => (
        <span>
          {(r.types || []).map((t) => ALERT_TYPE_TEXT[t] || t).join("、") || "—"}
          <div style={{ fontSize: 12, color: "#8c96a5" }}>{(r.levels || []).join(" / ")}</div>
        </span>
      ),
    },
    {
      title: "推送时机",
      width: 220,
      render: () => <Tag>人工确认</Tag>,
    },
    {
      title: "状态",
      width: 90,
      render: (_, r) => <Tag color={r.enabled === false ? "" : "green"}>{r.enabled === false ? "停用" : "启用"}</Tag>,
    },
    {
      title: "操作",
      width: 140,
      render: (_, r) => (
        <Space size={4}>
          <Button size="small" type="link" onClick={() => openSubscription(r)}>
            编辑
          </Button>
          <Button size="small" type="link" onClick={() => toggleSubscription(r)}>
            {r.enabled === false ? "启用" : "停用"}
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ background: "#fff", margin: "8px 12px", padding: "16px 20px", minHeight: "calc(100vh - 80px)" }}>
      <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
        <div style={{ width: 0, height: 20, borderLeft: "3px solid #005ABD", borderTop: "3px solid transparent", borderBottom: "3px solid transparent" }} />
        <div style={{ fontFamily: "YouSheBiaoTiHei", fontSize: 24, color: "#101531", marginLeft: 8 }}>平台对接</div>
        <div style={{ marginLeft: 6, fontSize: 12, color: "#969799", fontFamily: "DINExp" }}>Platform Integration</div>
        <div style={{ flex: 1 }} />
        {tab === "平台接入" ? (
          <Button type="primary" onClick={() => openPlatform(null)}>
            新增平台
          </Button>
        ) : null}
        {tab === "对象关联" ? (
          <Button type="primary" onClick={() => openMapping(null)}>
            新增关联
          </Button>
        ) : null}
        {tab === "推送订阅" ? (
          <Button type="primary" onClick={() => openSubscription(null)}>
            新增订阅
          </Button>
        ) : null}
      </div>

      <Tabs
        activeKey={tab}
        onChange={setTab}
        items={[
          {
            key: "平台接入",
            label: "平台接入",
            children: (
              <Table
                rowKey="id"
                loading={loading}
                columns={platformColumns}
                dataSource={platforms}
                pagination={false}
                locale={{ emptyText: <Empty description="尚未配置接收平台" /> }}
              />
            ),
          },
          {
            key: "对象关联",
            label: "对象关联",
            children: (
              <Table
                rowKey="id"
                columns={mappingColumns}
                dataSource={mappings}
                pagination={false}
                locale={{ emptyText: <Empty description="暂无关联，请先配置接收平台" /> }}
              />
            ),
          },
          {
            key: "推送订阅",
            label: "推送订阅",
            children: (
              <Table
                rowKey="id"
                columns={subscriptionColumns}
                dataSource={subscriptions}
                pagination={false}
                locale={{ emptyText: <Empty description="暂无订阅" /> }}
              />
            ),
          },
        ]}
      />

      {/* 新增 / 配置接收平台 */}
      <Modal
        title={platformEditing ? "配置接收平台" : "新增接收平台"}
        open={platformOpen}
        width={620}
        onCancel={() => setPlatformOpen(false)}
        onOk={savePlatform}
        okText="保存配置"
        cancelText="取消"
        destroyOnClose
      >
        <Form form={platformForm} layout="vertical" style={{ marginTop: 12 }}>
          <Form.Item label="平台名称" name="name" rules={[{ required: true, message: "请填写平台名称" }]}>
            <Input placeholder="如：安心云" allowClear />
          </Form.Item>
          <Form.Item label="对接方式" name="kind" rules={[{ required: true, message: "请选择对接方式" }]}>
            <Select options={KIND_OPTIONS} />
          </Form.Item>
          {platformKind === "mqtt" ? (
            <>
              <Form.Item label="Broker 地址" name="mqttBroker">
                <Input placeholder="mqtt://host:1883" allowClear />
              </Form.Item>
              <Form.Item
                label="Topic 模板"
                name="mqttTopic"
              >
                <Input placeholder={DEFAULT_TOPIC} allowClear />
              </Form.Item>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item label="用户名" name="mqttUsername">
                    <Input placeholder="选填" allowClear autoComplete="off" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="密码" name="mqttPassword">
                    <Input.Password placeholder="选填" allowClear autoComplete="new-password" />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item label="ClientId" name="mqttClientId">
                <Input placeholder="选填" allowClear />
              </Form.Item>
            </>
          ) : (
            <>
              <Form.Item
                label="推送地址"
                name="pushUrl"
              >
                <Input placeholder="https://…/structure/{structureId}/flashDevices/invoke?token={token}" allowClear />
              </Form.Item>
              <Form.Item
                label="接口凭证"
                name="credential"
              >
                <Input placeholder="选填" allowClear />
              </Form.Item>
            </>
          )}
          <Form.Item label="确认结果回传">
            <Space size={8}>
              <Form.Item name="confirmCallback" valuePropName="checked" noStyle>
                <Switch size="small" />
              </Form.Item>
              <span style={{ fontSize: 12, color: "#5c6675" }}>允许接收平台回传人工确认结果</span>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 新增 / 编辑对象关联 */}
      <Modal
        title={mappingEditing ? "编辑对象关联" : "新增对象关联"}
        open={mappingOpen}
        width={720}
        onCancel={() => setMappingOpen(false)}
        onOk={saveMapping}
        okText="保存关联"
        cancelText="取消"
        destroyOnClose
      >
        <Form form={mappingForm} layout="vertical" style={{ marginTop: 12 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="接收平台" name="platformConfigId" rules={[{ required: true, message: "请选择接收平台" }]}>
                <Select options={platformOptions} placeholder="选择已配置的接收平台" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="本平台项目" name="projectId" rules={[{ required: true, message: "请选择项目" }]}>
                <Select showSearch optionFilterProp="label" options={projectOptions} placeholder="选择设备管理平台项目" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="设备" name="deviceCode" rules={[{ required: true, message: "请选择设备" }]}>
                <Select
                  showSearch
                  optionFilterProp="label"
                  options={deviceOptions}
                  placeholder="选择该项目下的边缘设备"
                  onChange={() => mappingForm.setFieldsValue({ channelName: undefined })}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="视频通道" name="channelName">
                <Select
                  allowClear
                  loading={channelLoading}
                  options={channelOptions}
                  disabled={!mappingDeviceCode}
                  placeholder={mappingDeviceCode ? "选择该设备的视频通道" : "请先选择设备"}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="外部结构物名称" name="structureName" rules={[{ required: true, message: "请填写结构物名称" }]}>
                <Input placeholder="接收平台侧的结构物名称" allowClear />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="外部结构物 ID"
                name="structureId"
                rules={[{ required: true, message: "请选择或填写结构物 ID" }]}
              >
                <AutoComplete
                  allowClear
                  loading={structureLoading}
                  options={structureOptions}
                  placeholder="接收平台侧的结构物 ID"
                  filterOption={(input, option) =>
                    String(option?.value || "").toLowerCase().includes(input.toLowerCase()) ||
                    String(option?.label || "").toLowerCase().includes(input.toLowerCase())
                  }
                  onChange={(value) => {
                    const hit = structureOptions.find((opt) => opt.value === value);
                    if (hit && hit.name) mappingForm.setFieldsValue({ structureName: hit.name });
                  }}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="外部告警源名称" name="sourceName" rules={[{ required: true, message: "请填写告警源名称" }]}>
                <Input placeholder="接收平台侧的告警源名称" allowClear />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="外部告警源 ID" name="sourceId" rules={[{ required: true, message: "请填写告警源 ID" }]}>
                <Input placeholder="接收平台侧的告警源 ID" allowClear />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* 新增 / 编辑推送订阅 */}
      <Modal
        title={subscriptionEditing ? "编辑推送订阅" : "新增推送订阅"}
        open={subscriptionOpen}
        width={560}
        onCancel={() => setSubscriptionOpen(false)}
        onOk={saveSubscription}
        okText="保存订阅"
        cancelText="取消"
        destroyOnClose
      >
        <Form form={subscriptionForm} layout="vertical" style={{ marginTop: 12 }}>
          <Form.Item label="所属项目" name="projectId" rules={[{ required: true, message: "请选择项目" }]}>
            <Select showSearch optionFilterProp="label" options={projectOptions} placeholder="选择设备管理平台项目" />
          </Form.Item>
          <Form.Item label="接收平台" name="platformConfigId" rules={[{ required: true, message: "请选择接收平台" }]}>
            <Select options={platformOptions} placeholder="选择已配置的接收平台" />
          </Form.Item>
          <Form.Item label="告警类型" name="types" rules={[{ required: true, message: "请选择告警类型" }]}>
            <Select mode="multiple" options={ALERT_TYPES} placeholder="可多选" />
          </Form.Item>
          <Form.Item label="告警级别" name="levels" rules={[{ required: true, message: "请选择告警级别" }]}>
            <Select mode="multiple" options={LEVEL_OPTIONS.map((t) => ({ label: t, value: t }))} placeholder="可多选" />
          </Form.Item>
          <Form.Item label="推送时机">
            <span style={{ color: "#5c6675" }}>人工确认后推送</span>
          </Form.Item>
        </Form>
      </Modal>

    </div>
  );
};

function mapStateToProps(state) {
  return { actions: state.global.actions };
}

export default connect(mapStateToProps)(PlatformIntegration);
