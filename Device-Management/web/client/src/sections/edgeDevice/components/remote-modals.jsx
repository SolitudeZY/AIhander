import { remoteFileUrl } from "./common";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Descriptions,
  Drawer,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  Upload,
  message,
} from "antd";
import { InboxOutlined } from "@ant-design/icons";

// 创建远程会话
export const CreateSessionModal = ({ open, device, onCancel, onSubmit }) => {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) form.setFieldsValue({ durationMinutes: 20, purpose: "" });
  }, [open]);

  const handleOk = async () => {
    const values = await form.validateFields();
    setSubmitting(true);
    try {
      const res = await onSubmit(values);
      if (res?.success) {
        message.info("正在连接远程终端，请等待设备确认");
        onCancel(true, values);
      } else {
        message.error(res?.message || "会话创建失败");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title="新建远程会话"
      open={open}
      onCancel={() => onCancel(false)}
      onOk={handleOk}
      confirmLoading={submitting}
      okText="创建并连接"
      destroyOnClose
      maskClosable={false}
    >
      <Alert
        type="warning"
        showIcon
        style={{ marginBottom: 14 }}
        message="远程会话需要远程运维权限；系统记录会话发起人、时长、命令与文件传输审计，会话到期自动断开。"
      />
      <Form form={form} layout="vertical">
        <Form.Item label="目标设备">
          <Input value={`${device?.name || ""} (${device?.id || ""})`} disabled />
        </Form.Item>
        <Form.Item
          name="durationMinutes"
          label="会话时长"
          rules={[{ required: true, message: "请选择会话时长" }]}
        >
          <Select
            options={[20, 40, 60].map((m) => ({ label: `${m} 分钟`, value: m }))}
          />
        </Form.Item>
        <Form.Item
          name="purpose"
          label="操作原因"
          rules={[{ required: true, whitespace: true, message: "请填写本次操作原因" }]}
        >
          <Input placeholder="请填写本次操作原因" maxLength={64} />
        </Form.Item>
      </Form>
    </Modal>
  );
};

// 历史会话明细
export const SessionHistoryDrawer = ({ open, session, onClose }) => (
  <Drawer
    title={`历史会话 #${session?.id || ""}`}
    width={720}
    open={open}
    onClose={onClose}
    destroyOnClose
    footer={
      <Button type="primary" onClick={onClose}>
        关闭
      </Button>
    }
  >
    <Descriptions column={1} bordered size="small" style={{ marginBottom: 16 }}>
      <Descriptions.Item label="操作人">{session?.operator}</Descriptions.Item>
      <Descriptions.Item label="会话状态">
        <Tag color={session?.status === "正常结束" ? "green" : "red"}>
          {session?.status}
        </Tag>
      </Descriptions.Item>
      <Descriptions.Item label="时间">
        {session?.startedAt} ~ {session?.endedAt}（{session?.duration}）
      </Descriptions.Item>
    </Descriptions>
    <div style={{ fontWeight: 600, marginBottom: 10 }}>命令明细</div>
    <Table
      size="small"
      rowKey={(r, i) => `${r.time}-${i}`}
      pagination={false}
      dataSource={session?.commands || []}
      columns={[
        { title: "开始 / 提交时间", dataIndex: "time", width: 150 },
        {
          title: "命令",
          dataIndex: "command",
          render: (v) => <code style={{ fontSize: 12 }}>{v}</code>,
        },
        { title: "耗时", dataIndex: "cost", width: 90, render: (v) => v == null || v === "" ? "未采集" : `${v} ms` },
        // { title: "退出码", dataIndex: "code", width: 80, render: (v) => v == null || v === "" ? "未采集" : v },
        {
          title: "结果",
          dataIndex: "result",
          width: 110,
          render: (v) => {
            const states = {
              succeeded: ["green", "成功"], failed: ["red", "失败"],
              running: ["blue", "执行中"], interrupted: ["orange", "中断"],
              submitted: ["default", "已提交"],
              成功: ["green", "成功"], 失败: ["red", "失败"],
            };
            const [color, text] = states[v] || ["default", "未采集"];
            return <Tag color={color}>{text}</Tag>;
          },
        },
      ]}
    />
  </Drawer>
);

// 文件传输
export const FileTransferModal = ({ open, deviceId, onCancel }) => {
  const [direction, setDirection] = useState("upload");
  const [directory, setDirectory] = useState("");
  const [directoryError, setDirectoryError] = useState("");
  const [downloadName, setDownloadName] = useState("");
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open && deviceId) {
      setDirection("upload");
      setDirectory(""); setDirectoryError(""); setDownloadName("");
      setFile(null);
      const controller = new AbortController();
      fetch(remoteFileUrl(deviceId), { signal: controller.signal }).then(async response => {
        const body = await response.json();
        if (!response.ok || !body.directory) throw new Error(body.message || "无法获取文件目录，请检查设备连接并更新 Agent");
        if (!controller.signal.aborted) setDirectory(body.directory);
      }).catch(error => { if (!controller.signal.aborted) setDirectoryError(error.message || "无法获取文件目录"); });
      return () => controller.abort();
    }
    return undefined;
  }, [open, deviceId]);

  const handleOk = async () => {
    if (direction === "upload" && !file) {
      message.warning("请先选择要上传的文件");
      return;
    }
    const name = direction === "upload" ? file.name : downloadName.trim();
    if (!name || name.startsWith(".") || /[/\\:\x00\r\n]/.test(name)) {
      message.warning("请填写传输目录内的文件名，不要填写路径"); return;
    }
    setSubmitting(true);
    try {
      if (direction === "upload") {
        const formData = new FormData(); formData.append("file", file);
        const response = await fetch(remoteFileUrl(deviceId), { method: "POST", body: formData });
        const body = await response.json().catch(() => null);
        if (!response.ok) throw new Error(body?.message || "文件上传失败");
      } else {
        const response = await fetch(remoteFileUrl(deviceId, name));
        if (!response.ok) {
          const body = await response.json().catch(() => null);
          throw new Error(body?.message || "文件下载失败");
        }
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a"); link.href = url; link.download = name;
        document.body.appendChild(link); link.click(); link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
      message.success(direction === "upload" ? "文件已上传到设备" : "文件下载完成");
      onCancel(true);
    } catch (error) {
      message.error(error.message || "文件传输失败");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title="远程文件传输"
      open={open}
      onCancel={() => onCancel(false)}
      onOk={handleOk}
      confirmLoading={submitting}
      okButtonProps={{ disabled: !directory }}
      cancelButtonProps={{ disabled: submitting }}
      closable={!submitting}
      okText="开始传输"
      cancelText="取消"
      destroyOnClose
      maskClosable={false}
    >
      <Alert
        type={directoryError ? "error" : "info"}
        showIcon
        style={{ marginBottom: 12 }}
        message={directoryError || (directory ? `文件目录：${directory}` : "正在读取设备文件目录…")}
      />
      <Space style={{ marginBottom: 12 }}>
        <Button
          type={direction === "upload" ? "primary" : "default"}
          disabled={submitting}
          onClick={() => setDirection("upload")}
        >
          上传到设备
        </Button>
        <Button
          type={direction === "download" ? "primary" : "default"}
          disabled={submitting}
          onClick={() => setDirection("download")}
        >
          从设备下载
        </Button>
      </Space>
      {direction === "upload" ? (
        <Upload.Dragger
          maxCount={1}
          beforeUpload={(f) => {
            if (f.size > 200 * 1024 * 1024) { message.warning("文件不能超过200 MB"); return Upload.LIST_IGNORE; }
            setFile(f);
            return false;
          }}
          onRemove={() => setFile(null)}
          disabled={submitting}
        >
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p className="ant-upload-text">选择文件或拖拽到这里</p>
          <p className="ant-upload-hint">单文件最大 200 MB，传输结果写入操作审计</p>
        </Upload.Dragger>
      ) : (
        <Input
          value={downloadName}
          onChange={(event) => setDownloadName(event.target.value)}
          disabled={submitting}
          placeholder="输入该目录中的文件名，如 runtime.log"
        />
      )}
    </Modal>
  );
};
