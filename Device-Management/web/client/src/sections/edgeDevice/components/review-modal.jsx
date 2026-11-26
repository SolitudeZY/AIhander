import React, { useEffect, useState } from "react";
import { Alert, Button, Image, Input, Modal, Space, Tag } from "antd";

const RESULT_OPTIONS = [
  { value: "real", label: "真实告警", },
  { value: "invalid", label: "无效告警"},
  { value: "unknown", label: "无法判断"},
];

const RESULT_TEXT = { real: "真实告警", invalid: "无效告警", unknown: "无法判断" };
const RESULT_COLOR = { real: "red", invalid: "green", unknown: "orange" };
const SOURCE_TEXT = { web: "本平台", anxin: "安心云回传", api: "外部接口" };
const STATUS_TEXT = { active: "持续中", recovered: "已恢复", closed: "已关闭", acknowledged: "已确认" };

const readUserName = () => {
  try {
    const u = JSON.parse(sessionStorage.getItem("user") || "null") || {};
    return u.userName || u.name || u.realName || u.username || u.account || "";
  } catch (e) {
    return "";
  }
};

const KvRow = ({ label, children }) => (
  <div
    style={{
      display: "flex",
      padding: "7px 0",
      fontSize: 13,
      lineHeight: "21px",
      borderBottom: "1px solid #f4f5f8",
    }}
  >
    <div style={{ width: 76, flex: "none", color: "#8c96a5" }}>{label}</div>
    <div style={{ flex: 1, minWidth: 0, color: "#101531", wordBreak: "break-all" }}>{children}</div>
  </div>
);

const OptionCard = ({ active, disabled, title, desc, onClick }) => (
  <div
    onClick={disabled ? undefined : onClick}
    style={{
      border: `1px solid ${active ? "#005ABD" : "#e5e8ee"}`,
      background: active ? "#f2f7ff" : "#fff",
      borderRadius: 6,
      padding: "10px 12px",
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.55 : 1,
      transition: "all .15s",
    }}
  >
    <div style={{ display: "flex", alignItems: "center" }}>
      <span
        style={{
          width: 14,
          height: 14,
          flex: "none",
          borderRadius: "50%",
          border: `1px solid ${active ? "#005ABD" : "#c9cfd8"}`,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          marginRight: 8,
        }}
      >
        {active ? <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#005ABD" }} /> : null}
      </span>
      <span style={{ fontSize: 13, fontWeight: 600, color: "#101531" }}>{title}</span>
    </div>
    <div style={{ color: "#8c96a5", fontSize: 12, marginTop: 4, paddingLeft: 22 }}>{desc}</div>
  </div>
);

export const ReviewModal = ({ open, event, submitting, pushResult, onClose, onSubmit }) => {
  const [choice, setChoice] = useState();
  const [remark, setRemark] = useState("");

  useEffect(() => {
    if (open) {
      setChoice(undefined);
      setRemark("");
    }
  }, [open, event?.id]);

  const ai = event?.aiReview || {};
  const manual = event?.manualReview || {};
  const evidenceItems = event?.evidence?.items || [];
  const imageUrls = event?.evidence?.imageUrls || [];
  const alreadyConfirmed = Boolean(manual.result);

  const needsSupplement = Boolean(manual.confirmed) && !manual.result;
  const userName = readUserName();
  const statusText = STATUS_TEXT[event?.status] || "—";

  const handleOk = () => {
    if (!choice) return;
    onSubmit?.({ result: choice, remark: remark.trim() });
  };

  const footer = pushResult ? (
    <div style={{ textAlign: "right" }}>
      <Button type="primary" onClick={onClose}>
        关闭
      </Button>
    </div>
  ) : (
    <div style={{ textAlign: "right" }}>
      <Space>
        <Button onClick={onClose} disabled={submitting}>
          取消
        </Button>
        <Button type="primary" loading={submitting} disabled={!choice || alreadyConfirmed} onClick={handleOk}>
          确认并保存
        </Button>
      </Space>
    </div>
  );

  return (
    <Modal
      title="确认告警"
      open={open}
      width={640}
      onCancel={onClose}
      maskClosable={!submitting}
      footer={footer}
      destroyOnClose
      styles={{ body: { maxHeight: "62vh", overflowY: "auto", paddingRight: 4 } }}
    >
      {pushResult ? (
        <Alert
          showIcon
          type={pushResult.status === "success" ? "success" : pushResult.status === "skipped" ? "info" : "warning"}
          message={
            pushResult.status === "success"
              ? "已同步至安心云，声光报警已触发"
              : pushResult.status === "skipped"
                ? "确认结果已保存，本条告警未同步"
                : "同步失败，可在推送记录中重新触发"
          }
          description={pushResult.message}
          style={{ marginBottom: 14 }}
        />
      ) : null}

      <div style={{ borderTop: "1px solid #f4f5f8" }}>
        <KvRow label="告警">
          <code>{event?.alarmId || event?.id || "—"}</code>
          {event?.type ? <span style={{ color: "#5c6675" }}> · {event.type}</span> : null}
        </KvRow>
        <KvRow label="确认人">{userName || "当前登录用户"}</KvRow>
        <KvRow label="过程状态">{statusText}</KvRow>
        <KvRow label="发生时间">{event?.occurredAt || "—"}</KvRow>
        <KvRow label="证据">
          {imageUrls.length ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Image.PreviewGroup>
                {imageUrls.slice(0, 3).map((url, i) => (
                  <Image
                    key={i}
                    src={url}
                    width={96}
                    height={72}
                    style={{ objectFit: "cover", borderRadius: 4 }}
                    fallback="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI5NiIgaGVpZ2h0PSI3MiI+PHJlY3Qgd2lkdGg9Ijk2IiBoZWlnaHQ9IjcyIiBmaWxsPSIjZjRmNWY4Ii8+PC9zdmc+"
                  />
                ))}
              </Image.PreviewGroup>
              {/* <span style={{ color: "#8c96a5", fontSize: 12 }}>
                {evidenceItems.length > 1 ? `共 ${evidenceItems.length} 项证据，点击可放大` : "点击图片可放大查看"}
              </span> */}
            </div>
          ) : (
            <span style={{ color: "#8c96a5" }}>{event?.uploadStatusText || "缺失"}</span>
          )}
        </KvRow>
        <KvRow label="AI 建议">
          {ai.status === "done" && ai.result ? (
            <div>
              <Tag color={RESULT_COLOR[ai.result] || "default"}>{RESULT_TEXT[ai.result] || ai.result}</Tag>
              <div style={{ color: "#5c6675", fontSize: 12, marginTop: 4, lineHeight: 1.7 }}>
                {ai.reason || "无判断依据"}
              </div>
            </div>
          ) : ai.status === "failed" ? (
            <span style={{ color: "#ff4d4f" }}>复核失败：{ai.error || "服务异常"}</span>
          ) : ai.status === "running" ? (
            <span style={{ color: "#1677ff" }}>复核中，可先人工确认</span>
          ) : ai.status === "waiting_evidence" ? (
            <span style={{ color: "#8c96a5" }}>等待证据上传</span>
          ) : (
            <span style={{ color: "#8c96a5" }}>待复核，可先人工确认</span>
          )}
        </KvRow>
      </div>

      {alreadyConfirmed ? (
        <div style={{ marginTop: 16 }}>
          <Alert
            type="info"
            showIcon
            message={`该告警已确认：${RESULT_TEXT[manual.result] || manual.result}`}
            description={
              <div style={{ fontSize: 12, lineHeight: 1.8 }}>
                <div>
                  确认人 {manual.userName || "—"} · {manual.time || "—"} ·{" "}
                  {SOURCE_TEXT[manual.source] || SOURCE_TEXT.web}
                </div>
                {manual.remark ? <div style={{ color: "#5c6675" }}>备注：{manual.remark}</div> : null}
                <div style={{ color: "#8c96a5" }}>同一告警按首次有效确认生效，重复确认不会覆盖已有结论。</div>
              </div>
            }
          />
        </div>
      ) : (
        <>
          {needsSupplement ? (
            <Alert
              type="warning"
              showIcon
              style={{ marginTop: 14 }}
              message="未记录结论"
              description="该事件历史上有确认动作但没有保存结论，可在下方补充，补充后按本次结论生效。"
            />
          ) : null}
          <div style={{ fontWeight: 600, fontSize: 13, margin: "16px 0 8px" }}>确认结果</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            {RESULT_OPTIONS.map((opt) => (
              <OptionCard
                key={opt.value}
                active={choice === opt.value}
                disabled={submitting}
                title={opt.label}
                desc={opt.desc}
                onClick={() => setChoice(opt.value)}
              />
            ))}
          </div>

          <div style={{ fontWeight: 600, fontSize: 13, margin: "16px 0 8px" }}>确认备注</div>
          <Input.TextArea
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
            maxLength={500}
            rows={3}
            placeholder="可填写判断依据或现场核查情况"
          />

          <div style={{ textAlign: "right", fontSize: 12, color: "#8c96a5", marginTop: 4 }}>
            {remark.length}/500
          </div>
        </>
      )}
    </Modal>
  );
};
