import { edgeFileUploadUrl } from "./common";
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Descriptions,
  Drawer,
  Form,
  Input,
  Modal,
  Select,
  Table,
  Tag,
  Upload,
  message,
} from "antd";
import { InboxOutlined } from "@ant-design/icons";
import {
  RECOGNITION_TYPES,
  TYPE_FORMAT_MAP,
  TYPE_NAME_MAP,
} from "../constants";

const TYPE_OPTIONS = Object.keys(RECOGNITION_TYPES).map((value) => ({
  label: RECOGNITION_TYPES[value],
  value,
}));

// 上传视觉模型
export const UploadModelModal = ({ open, onCancel, onSubmit }) => {
  const [form] = Form.useForm();
  const typeValue = Form.useWatch("type", form);
  const versionValue = Form.useWatch("version", form);
  const [uploadedFile, setUploadedFile] = useState(null); // { id, fileName, fileSize, sha256 }
  const [uploadStatus, setUploadStatus] = useState("idle");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      form.setFieldsValue({ type: "slope", version: "" });
      setUploadedFile(null);
      setUploadStatus("idle");
    }
  }, [open]);

  const autoName = typeValue ? TYPE_NAME_MAP[typeValue] : "";
  const autoFormat = typeValue ? TYPE_FORMAT_MAP[typeValue] : "";
  // 模型名称固定，随类型与版本号同步展示
  const fullName = `${autoName}${versionValue ? " " + versionValue : ""}`;

  const handleOk = async () => {
    if (uploadStatus === "uploading" || uploadStatus === "processing" || submitting) return;
    const values = await form.validateFields();
    if (!uploadedFile?.id) {
      message.warning("请先上传模型文件");
      return;
    }
    setSubmitting(true);
    try {
      const res = await onSubmit({
        type: values.type,
        version: values.version.trim(),
        fileId: uploadedFile.id,
        fileName: uploadedFile.fileName,
        fileSize: uploadedFile.fileSize,
        sha256: uploadedFile.sha256,
      });
      if (res?.success) {
        onCancel(true);
      } else {
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title="上传视觉模型"
      open={open}
      onCancel={() => onCancel(false)}
      onOk={handleOk}
      confirmLoading={submitting}
      okButtonProps={{ disabled: uploadStatus === "uploading" || uploadStatus === "processing" || !uploadedFile?.id }}
      destroyOnClose
      maskClosable={false}
    >
      <Form form={form} layout="vertical">
        <Form.Item label="模型名称">
          <Input value={fullName} disabled placeholder="选择识别类型后自动生成" />

        </Form.Item>
        <div style={{ display: "flex", gap: 12 }}>
          <Form.Item
            name="type"
            label="识别类型"
            style={{ flex: 1 }}
            rules={[{ required: true, message: "请选择识别类型" }]}
          >
            <Select options={TYPE_OPTIONS} placeholder="选择识别类型" />
          </Form.Item>
          <Form.Item
            name="version"
            label="版本号"
            style={{ flex: 1 }}
            rules={[
              { required: true, message: "请输入版本号" },
              {
                pattern: /^\d+\.\d+\.\d+([.-][0-9A-Za-z]+)*$/,
                message: "版本号格式示例：1.3.2 或 1.4.0-beta",
              },
            ]}
          >
            <Input placeholder="如 1.3.3" />
          </Form.Item>
        </div>
        <Form.Item label="模型格式">
          <Input value={autoFormat} disabled addonAfter="按识别类型自动选择" />
        </Form.Item>
      </Form>
      <Upload.Dragger
        maxCount={1}
        name="file"
        accept=".rknn,.onnx"
        disabled={submitting}
        action={edgeFileUploadUrl()}
        onChange={(info) => {
          if (info.file.status === "uploading") {
            setUploadedFile(null);
            setUploadStatus(info.file.percent >= 100 ? "processing" : "uploading");
          } else if (info.file.status === "done") {
            const resp = info.file.response || {};

            const fileBody = resp.payload?.data ?? resp.payload ?? resp.data ?? resp;
            const fileId = fileBody?.id ?? fileBody?.file_id;
            if (!fileId) {
              message.error("平台未返回文件 ID");
              setUploadedFile(null);
              setUploadStatus("error");
              return;
            }
            setUploadedFile({
              id: String(fileId),
              fileName: info.file.name,
              fileSize: info.file.size,
              sha256: fileBody?.sha256 || fileBody?.hash || null,
            });
            setUploadStatus("done");
            message.success("模型文件上传成功，请点击确定保存模型版本");
          } else if (info.file.status === "error") {
            const errorBody = info.file.response || {};
            message.error(errorBody.message || `${info.file.name} 上传失败`);
            setUploadedFile(null);
            setUploadStatus("error");
          }
        }}
        onRemove={() => { setUploadedFile(null); setUploadStatus("idle"); }}
      >
        <p className="ant-upload-drag-icon">
          <InboxOutlined />
        </p>
        <p className="ant-upload-text">选择模型文件或拖拽到这里</p>
        <p className="ant-upload-hint">上传文件后创建模型版本</p>
      </Upload.Dragger>
      {uploadStatus === "processing" ? <Alert style={{ marginTop: 12 }} type="info" showIcon message="文件传输完成，正在存储到七牛云，请稍候…" /> : null}
      {uploadStatus === "done" ? <Alert style={{ marginTop: 12 }} type="success" showIcon message="模型文件上传成功，请点击确定保存模型版本" /> : null}
      {uploadStatus === "error" ? <Alert style={{ marginTop: 12 }} type="error" showIcon message="文件上传未完成，请重新选择文件上传" /> : null}
    </Modal>
  );
};

export const DispatchUpgradeModal = ({
  open,
  model,
  devices = [],
  onCancel,
  onSubmit,
}) => {
  const [projectId, setProjectId] = useState(undefined);
  const [deviceIds, setDeviceIds] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setProjectId(undefined);
      setDeviceIds([]);
    }
  }, [open]);

  const projectOptions = useMemo(() => {
    const map = new Map();
    devices.forEach((d) => {
      if (d.projectId && !map.has(d.projectId)) {
        map.set(d.projectId, d.projectName || d.projectId);
      }
    });
    return [...map.entries()].map(([value, label]) => ({ value, label }));
  }, [devices]);

  const targetDevices = useMemo(
    () => devices.filter((d) => (projectId ? d.projectId === projectId : true)),
    [devices, projectId],
  );

  const handleOk = async () => {
    if (!deviceIds.length) {
      message.warning("请至少选择一台目标设备");
      return;
    }
    setSubmitting(true);
    try {
      const res = await onSubmit(model?.code, deviceIds);
      if (res?.success) {
        message.success(
          `升级任务 ${res.payload.data.taskId} 已创建，共 ${res.payload.data.deviceCount} 台设备`,
        );
        onCancel(true);
      } else {
        message.error(res?.message || "任务创建失败");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    { title: "设备名称", dataIndex: "name" },
    {
      title: "设备 ID",
      dataIndex: "id",
      render: (v) => <code style={{ fontSize: 12 }}>{v}</code>,
    },
    {
      title: "在线状态",
      dataIndex: "online",
      width: 90,
      render: (online) => <Tag color={online ? "green" : "default"}>{online ? "在线" : "离线"}</Tag>,
    },
    {
      title: "当前模型版本",
      dataIndex: "modelVersion",
      width: 120,
      render: (v) => v || "未安装",
    },
  ];

  return (
    <Modal
      title="下发视觉模型升级任务"
      open={open}
      width={860}
      onCancel={() => onCancel(false)}
      onOk={handleOk}
      confirmLoading={submitting}
      okText="下发任务"
      destroyOnClose
      maskClosable={false}
    >
      <Descriptions column={2} size="small" style={{ marginBottom: 12 }}>
        <Descriptions.Item label="升级模型">
          {model?.name} {model?.version}
        </Descriptions.Item>
        <Descriptions.Item label="模型格式">{model?.format}</Descriptions.Item>
      </Descriptions>
      <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
        <Select
          allowClear
          showSearch
          optionFilterProp="label"
          placeholder="按所属项目筛选设备"
          style={{ width: 320 }}
          options={projectOptions}
          value={projectId}
          onChange={(v) => {
            setProjectId(v);
            setDeviceIds([]);
          }}
        />
        <Alert
          type="info"
          showIcon
          style={{ flex: 1, padding: "4px 12px" }}
          message="离线设备保留等待状态，上线后重新检查任务有效性；升级结果以设备成功回执为准。"
        />
      </div>
      <Table
        size="small"
        rowKey="id"
        columns={columns}
        dataSource={targetDevices}
        pagination={{ pageSize: 6, showSizeChanger: false }}
        rowSelection={{
          selectedRowKeys: deviceIds,
          onChange: setDeviceIds,
        }}
      />
    </Modal>
  );
};

// 视觉模型详情
export const ModelDetailDrawer = ({
  open,
  model,
  canDispatch,
  onClose,
  onDispatch,
}) => (
  <Drawer
    title="视觉模型详情"
    width={560}
    open={open}
    onClose={onClose}
    destroyOnClose
    footer={
      <>
        <Button onClick={onClose}>关闭</Button>
        {canDispatch ? (
          <Button type="primary" onClick={() => onDispatch(model)} style={{ marginLeft: 8 }}>
            下发升级任务
          </Button>
        ) : null}
      </>
    }
  >
    <Descriptions column={1} bordered size="small">
      <Descriptions.Item label="模型名称">{model?.name}</Descriptions.Item>
      <Descriptions.Item label="模型编号">
        <code>{model?.code}</code>
      </Descriptions.Item>
      <Descriptions.Item label="识别类型">
        {RECOGNITION_TYPES[model?.type] || model?.type}
      </Descriptions.Item>
      <Descriptions.Item label="版本号">{model?.version}</Descriptions.Item>
      <Descriptions.Item label="模型格式">{model?.format}</Descriptions.Item>
      <Descriptions.Item label="文件大小">
        {model?.sizeMB ? `${model.sizeMB} MB` : "-"}
      </Descriptions.Item>
      <Descriptions.Item label="上传时间">{model?.uploadedAt}</Descriptions.Item>
    </Descriptions>
  </Drawer>
);
