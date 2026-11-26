import React, { useEffect, useState } from "react";
import moment from "moment";
import {
  Alert,
  Button,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Tag,
} from "antd";

// 添加 / 编辑视频通道
export const ChannelModal = ({ open, channel, models = [], onCancel, onTest, onSubmit }) => {
  const [form] = Form.useForm();
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const isEdit = !!channel?.id;
  const modelOptions = models
    .map((model) => {
      const value = model.fileName || model.file_name || model.modelName || model.model_name;
      if (!value) return null;
      const name = model.modelName || model.model_name || value;
      const version = model.version ? ` ${model.version}` : "";
      const fileName = value !== name ? `（${value}）` : "";
      return { value, label: `${name}${version}${fileName}` };
    })
    .filter(Boolean);

  if (channel?.modelName && !modelOptions.some((option) => option.value === channel.modelName)) {
    modelOptions.unshift({ value: channel.modelName, label: channel.modelName });
  }

  useEffect(() => {
    if (open) {
      setTestResult(null);
      form.setFieldsValue(
        channel
          ? {
              name: channel.name,
              rtsp_url: channel.rtsp,
              modelName: channel.modelName,
              username: channel.username ?? channel.account,
              password: "",
            }
          : { name: "", rtsp_url: "", modelName: "", username: "", password: "" },
      );
    }
  }, [open, channel]);

  const handleTest = async () => {
    const values = await form.validateFields();
    setTesting(true);
    setTestResult(null);
    try {
      const reuseSaved =
        channel?.id &&
        values.rtsp_url === channel.rtsp &&
        (values.username || "") === (channel.username || "") &&
        !values.password;
      const res = await onTest(
        reuseSaved
          ? { channel_id: channel.id }
          : {
              channel_id: channel?.id,
              rtsp_url: values.rtsp_url,
              username: values.username,
              password: values.password,
              transport: channel?.transport,
            },
      );
      const data = res?.payload?.data;
      if (res?.success && (data?.success ?? data?.connected)) {
        const cost = data?.duration_ms ?? data?.latency;
        setTestResult({
          ok: true,
          text: `连接成功${cost ? ` · ${Math.round(Number(cost))} ms` : ""}${data?.codec ? ` · ${data.codec}` : ""}${data?.resolution ? ` · ${data.resolution}` : ""}`,
        });
      } else {
        setTestResult({
          ok: false,
          text: data?.message || res?.message || "连接失败",
        });
      }
    } finally {
      setTesting(false);
    }
  };

  const handleOk = async () => {
    const values = await form.validateFields();
    setSubmitting(true);
    try {
      const payload = { ...channel, ...values };
      if (!values.password) delete payload.password;
      const res = await onSubmit(payload);
      if (res?.success) {
        onCancel(true);
      } else {
        // 编辑失败时保留原通道配置（不关闭弹窗）
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={isEdit ? "编辑视频通道" : "添加视频通道"}
      open={open}
      onCancel={() => onCancel(false)}
      onOk={handleOk}
      confirmLoading={submitting}
      destroyOnClose
      maskClosable={false}
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="name"
          label="通道名称"
          rules={[{ required: true, message: "请输入通道名称" }]}
        >
          <Input placeholder="如：西侧边坡全景" maxLength={30} />
        </Form.Item>
        <Form.Item
          name="rtsp_url"
          label="RTSP 地址"
          rules={[{ required: true, message: "请输入 RTSP 地址" }]}
        >
          <Input placeholder="rtsp://192.168.1.33:554/stream01" />
        </Form.Item>
        <Form.Item
          name="modelName"
          label="模型名称"
          rules={[{ required: true, message: "请输入模型名称" }]}
          extra="请选择已上传到平台 的视觉模型文件"
        >
          <Select
            showSearch
            optionFilterProp="label"
            options={modelOptions}
            placeholder="请选择视觉模型"
            notFoundContent={models.length ? "暂无可用模型" : "暂无已上传模型"}
          />
        </Form.Item>
        <Space size={12} style={{ display: "flex" }}>
          <Form.Item name="username" label="访问账号" style={{ flex: 1 }}>
            <Input placeholder="camera_operator" />
          </Form.Item>
          <Form.Item
            name="password"
            label={isEdit ? "访问密码（留空不修改）" : "访问密码"}
            style={{ flex: 1 }}
            rules={isEdit ? [] : [{ required: true, message: "请输入访问密码" }]}
          >
            <Input.Password placeholder="********" />
          </Form.Item>
        </Space>
      </Form>
      <Button block loading={testing} onClick={handleTest}>
        测试视频连接
      </Button>
      {testResult ? (
        <Alert
          style={{ marginTop: 12 }}
          type={testResult.ok ? "success" : "error"}
          showIcon
          message={
            testResult.ok ? (
              <span>{testResult.text}</span>
            ) : (
              <span>
                {testResult.text}
                <Tag color="red" style={{ marginLeft: 8 }}>
                  连接失败
                </Tag>
              </span>
            )
          }
        />
      ) : null}
    </Modal>
  );
};

// 画面检测弹窗
const PICTURE_METRIC_ITEMS = [
  { key: "black_screen", label: "黑屏检测", unit: "%" },
  { key: "occlusion", label: "遮挡检测", unit: "%" },
  { key: "blur", label: "模糊检测", unit: "" },
  { key: "brightness_abnormal", label: "亮度异常", unit: "%" },
];

// 分数 >= 80 视为异常
const METRIC_ABNORMAL_SCORE = 80;
const METRIC_STALE_MS = 60 * 1000;

const pictureItems = (channel) => {
  const metrics = channel?.pictureMetrics;
  if (!metrics) return [];
  const fresh =
    channel.status === "running" &&
    channel.observedAt &&
    Date.now() - new Date(channel.observedAt).getTime() <= METRIC_STALE_MS;
  return PICTURE_METRIC_ITEMS.map((m) => {
    const score = metrics[m.key];
    const valid = typeof score === "number" && Number.isFinite(score) && score >= 0 && score <= 100;
    const state = !valid || !fresh ? "unknown" : score >= METRIC_ABNORMAL_SCORE ? "abnormal" : "normal";
    return { key: m.key, label: m.label, metric: valid ? `${score}${m.unit}` : "—", state };
  });
};

const METRIC_STATE_TEXT = { normal: "正常", abnormal: "异常", unknown: "暂无数据" };
const METRIC_STATE_COLOR = { normal: "green", abnormal: "red", unknown: "default" };

export const PictureCheckModal = ({ open, channel, onCancel }) => (
  <Modal
    title={`${channel?.name || ""} · 画面检测`}
    open={open}
    width="86vw"
    centered
    footer={
      <Button type="primary" onClick={() => onCancel()}>
        关闭
      </Button>
    }
    onCancel={onCancel}
    destroyOnClose
  >
    <div style={{ display: "grid", gridTemplateColumns: "1.65fr 1fr", gap: 16 }}>
      <div
        className="edge-video"
        style={{ height: "calc(90vh - 320px)", minHeight: 320, borderRadius: 8 }}
      >
        {channel?.snapshot ? (
          <img
            src={`data:${channel.snapshotMimeType || "image/jpeg"};base64,${channel.snapshot}`}
            alt="通道画面"
            style={{ width: "100%", objectFit: "contain", border: "none" }}
          />
        ) : (
          <div className="edge-video-frame" />
        )}
        {/* <div className="edge-video-bottom">
          <span>
            <span style={{ color: channel?.status === "running" ? "#52c41a" : channel?.snapshot ? "#faad14" : "#ff4d4f" }}>●</span>
            {channel?.status === "running"
              ? "画面可用于识别"
              : channel?.snapshot
                ? `通道状态 ${channel.status || channel.connect || "未知"}`
                : "当前无有效画面"}
          </span>
          <span>
            {channel?.observedAt ? moment(channel.observedAt).format("MM-DD HH:mm:ss") : "—"}
          </span>
        </div> */}
      </div>
      <div>
        <div style={{ fontWeight: 600, marginBottom: 6 }}>检测结果</div>
        {pictureItems(channel).map((item) => (
          <div
            key={item.key}
            style={{
              display: "flex",
              alignItems: "center",
              padding: "15px 4px",
              borderBottom: "1px solid #f0f0f0",
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background:
                  item.state === "normal" ? "#52c41a" : item.state === "abnormal" ? "#ff4d4f" : "#bfbfbf",
                marginRight: 8,
              }}
            />
            <div>
              <b>{item.label}</b>
              <div style={{ fontSize: 12, color: "#8c96a5" }}>{item.metric}</div>
            </div>
            <Tag color={METRIC_STATE_COLOR[item.state]} style={{ marginLeft: "auto" }}>
              {METRIC_STATE_TEXT[item.state]}
            </Tag>
          </div>
        ))}
      </div>
    </div>
  </Modal>
);
