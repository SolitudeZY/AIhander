import React, { useEffect, useMemo, useRef, useState } from "react";
import moment from "moment";
import {
  Alert,
  Button,
  Descriptions,
  Drawer,
  Form,
  Input,
  Modal,
  Select,
  message,
} from "antd";

// 分配 / 调整所属项目
export const AssignProjectModal = ({ open, device, projects = [], onCancel, onSubmit }) => {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const isAssign = useMemo(() => device && !device.projectId, [device]);

  useEffect(() => {
    if (open) {
      form.setFieldsValue({ projectId: device?.projectId || undefined });
    }
  }, [open, device]);

  const handleOk = async () => {
    const values = await form.validateFields();
    setSubmitting(true);
    try {
      const res = await onSubmit(device.id, values.projectId);
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
      title={isAssign ? "分配项目" : "调整所属项目"}
      open={open}
      onCancel={() => onCancel(false)}
      onOk={handleOk}
      confirmLoading={submitting}
      destroyOnClose
      maskClosable={false}
    >
      <Descriptions column={1} bordered size="small" style={{ marginBottom: 16 }}>
        <Descriptions.Item label="设备名称">{device?.name}</Descriptions.Item>
        <Descriptions.Item label="设备 ID">{device?.id}</Descriptions.Item>
        <Descriptions.Item label="当前项目">
          {device?.projectName || "未分配"}
        </Descriptions.Item>
      </Descriptions>
      <Form form={form} layout="vertical">
        <Form.Item
          name="projectId"
          label="目标项目"
          rules={[{ required: true, message: "请选择目标项目" }]}
        >
          <Select
            placeholder="请选择目标项目"
            options={projects.map((p) => ({ label: p.name, value: p.id }))}
            showSearch
            optionFilterProp="label"
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

// 重启设备二次确认
const newIdempotencyKey = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const REBOOT_STATUS_TEXT = {
  requested: "已登记，等待设备确认",
  accepted: "设备已接受，等待重新上线",
  unknown: "执行结果不确定，需要用原操作查询",
  failed: "执行失败或未执行",
  succeeded: "设备已重启并恢复上报",
};

export const RebootModal = ({ open, device, onCancel, onSubmit, onQuery }) => {
  const [confirmName, setConfirmName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [operation, setOperation] = useState(null);
  const [operationKey, setOperationKey] = useState("");
  const autoClosedRef = useRef(false);

  useEffect(() => {
    if (open) {
      setConfirmName("");
      setOperation(null);
      setOperationKey(newIdempotencyKey());
    }
  }, [open]);

  const settled = operation && ["succeeded", "failed"].includes(operation.status);

  useEffect(() => {
    if (open) autoClosedRef.current = false;
  }, [open]);

  useEffect(() => {
    if (!open || autoClosedRef.current) return;
    if (operation?.status === "succeeded") {
      autoClosedRef.current = true;
      onCancel(true);
    }
  }, [open, operation?.status, onCancel]);

  useEffect(() => {
    if (!open || !operation?.id || settled || !onQuery) return undefined;
    const timer = setInterval(async () => {
      const res = await onQuery(device.id, operation.id);
      if (res?.success) setOperation({ ...operation, ...(res.payload?.data || {}) });
    }, 4000);
    return () => clearInterval(timer);
  }, [open, operation, settled, device, onQuery]);

  const handleOk = async () => {
    if (confirmName !== device?.name) {
      message.warning("输入的设备名称与目标设备不一致");
      return;
    }
    setSubmitting(true);
    try {
      const res = await onSubmit(device.id, operationKey);
      if (res?.success) {
        const data = res.payload?.data || {};
        setOperation({ ...data, status: data.status || "requested" });
      } else {
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title="重启设备"
      open={open}
      onCancel={() => onCancel(false)}
      onOk={operation ? () => onCancel(true) : handleOk}
      confirmLoading={submitting}
      okText={operation ? "关闭" : "确认重启"}
      okButtonProps={{ danger: true }}
      okType="danger"
      destroyOnClose
      maskClosable={false}
    >
      <Alert
        type="warning"
        showIcon
        style={{ marginBottom: 14 }}
        message="高风险操作"
        description="设备将在重启期间离线，预计 2–5 分钟，视频通道和视觉识别会暂时中断；重新上线后平台将检查设备连接、视频通道与视觉识别状态并形成恢复记录。"
      />
      <Descriptions column={1} bordered size="small" style={{ marginBottom: 16 }}>
        <Descriptions.Item label="设备">{device?.name}</Descriptions.Item>
        <Descriptions.Item label="影响范围">
          {device?.channelTotal ?? 0} 路视频通道 · 当前视觉识别任务
        </Descriptions.Item>
      </Descriptions>
      <div style={{ marginBottom: 6 }}>
        <span style={{ color: "#ff4d4f" }}>*</span> 请输入设备名称进行二次确认
      </div>
      <Input
        value={confirmName}
        placeholder={`请输入 ${device?.name || ""}`}
        onChange={(e) => setConfirmName(e.target.value)}
        disabled={Boolean(operation)}
      />
      {operation ? (
        <Alert
          style={{ marginTop: 14 }}
          type={operation.status === "succeeded" ? "success" : operation.status === "failed" ? "error" : "info"}
          showIcon
          message={`重启操作 ${operation.id || ""}`}
          description={`当前状态：${REBOOT_STATUS_TEXT[operation.status] || operation.status || "已提交"}${
            operation.message ? `（${operation.message}）` : ""
          }`}
        />
      ) : null}
    </Modal>
  );
};

// 仅展示后端记录的动作和自检结果；缺失结果不能视为成功。
export const RecoveryDrawer = ({ open, detail, onClose }) => (
  <Drawer title="异常与恢复详情" width={560} open={open} onClose={onClose} destroyOnClose>
    {detail ? <>
      <Descriptions column={1} bordered size="small">
        <Descriptions.Item label="触发时间">{detail.triggeredAtLabel}</Descriptions.Item>
        <Descriptions.Item label="触发原因">{detail.trigger_reason || "—"}</Descriptions.Item>
        <Descriptions.Item label="恢复动作">{detail.actionLabel}</Descriptions.Item>
        <Descriptions.Item label="恢复前状态">{detail.before_state || "—"}</Descriptions.Item>
        <Descriptions.Item label="恢复后自检结果">{detail.after_self_check || "尚无自检结果"}</Descriptions.Item>
        <Descriptions.Item label="异常类型">{detail.typeLabel}</Descriptions.Item>
        <Descriptions.Item label="异常对象">{detail.target || "—"}</Descriptions.Item>
        <Descriptions.Item label="开始时间">{detail.startedAtLabel}</Descriptions.Item>
        <Descriptions.Item label="持续时间">{detail.durationLabel}</Descriptions.Item>
        <Descriptions.Item label="当前状态">{detail.statusLabel}</Descriptions.Item>
        <Descriptions.Item label="确认时间">{detail.acknowledged_at ? moment(detail.acknowledged_at).format("YYYY-MM-DD HH:mm:ss") : "—"}</Descriptions.Item>
        <Descriptions.Item label="确认人">{detail.acknowledgedByLabel || "—"}</Descriptions.Item>
        <Descriptions.Item label="结果">{detail.resultLabel}</Descriptions.Item>
      </Descriptions>
      {detail.rebooted === false && <Alert style={{ marginTop: 16 }} type="info" message="本次恢复记录未执行整机重启" />}
      {detail.rebooted === true && <Alert style={{ marginTop: 16 }} type="warning" message="本次恢复已执行整机重启" />}
    </> : <div>暂无详情</div>}
  </Drawer>
);
