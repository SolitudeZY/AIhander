import React, { useEffect, useState } from "react";
import { Alert, Button, Descriptions, Drawer, Empty, Image, Space, Tag, Timeline, Tooltip } from "antd";
import { aiReviewView, manualReviewView, pushStatusView, REVIEW_RESULT_TEXT } from "./common";

const SOURCE_TEXT = { web: "本平台确认", anxin: "安心云回传", api: "外部接口" };

const SectionTitle = ({ children, extra }) => (
  <div
    style={{
      fontWeight: 600,
      fontSize: 15,
      margin: "20px 0 12px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
    }}
  >
    <span>{children}</span>
    {extra}
  </div>
);

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
    <div style={{ width: 84, flex: "none", color: "#8c96a5" }}>{label}</div>
    <div style={{ flex: 1, minWidth: 0, color: "#101531", wordBreak: "break-all" }}>{children}</div>
  </div>
);

const Muted = ({ children }) => <span style={{ color: "#8c96a5" }}>{children || "—"}</span>;

const MetaTable = ({ meta }) => {
  const entries = meta && typeof meta === "object" ? Object.entries(meta) : [];
  if (!entries.length) return <Muted>无</Muted>;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2px 16px" }}>
      {entries.map(([key, value]) => (
        <div key={key} style={{ fontSize: 12, color: "#5c6675" }}>
          <span style={{ color: "#8c96a5" }}>{key}：</span>
          {typeof value === "object" ? JSON.stringify(value) : String(value)}
        </div>
      ))}
    </div>
  );
};

// 证据区
const EvidencePanel = ({ event }) => {
  const [active, setActive] = useState(0);
  const items = event?.evidenceItems || [];

  useEffect(() => setActive(0), [event?.id]);

  if (!items.length) {
    return (
      <div className="edge-evidence-empty">
        {event?.uploadStatusText === "上传中" ? "证据上传中" : "证据缺失"}
      </div>
    );
  }

  const current = items[Math.min(active, items.length - 1)] || items[0];
  const isVideo = current.kind === "video";

  return (
    <div>
      {items.length > 1 ? (
        <Space size={6} wrap style={{ marginBottom: 10 }}>
          {items.map((item, index) => (
            <Button
              key={item.id}
              size="small"
              type={index === active ? "primary" : "default"}
              onClick={() => setActive(index)}
            >
              {item.label}
              {item.captured_at ? <span style={{ marginLeft: 6, opacity: 0.75 }}>{String(item.captured_at).slice(11, 19)}</span> : null}
            </Button>
          ))}
        </Space>
      ) : null}

      <div className="edge-evidence-player">
        {isVideo ? (
          <video src={current.src} controls playsInline style={{ width: "100%", maxHeight: 320, background: "#000" }} />
        ) : (
          <Image
            src={current.src}
            alt={current.label}
            style={{ maxHeight: 320, objectFit: "contain" }}
            fallback="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMjAiIGhlaWdodD0iMTgwIj48cmVjdCB3aWR0aD0iMzIwIiBoZWlnaHQ9IjE4MCIgZmlsbD0iI2Y0ZjVmOCIvPjx0ZXh0IHg9IjE2MCIgeT0iOTAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiM4Yzk2YTUiIGZvbnQtc2l6ZT0iMTMiPui1hOaWmeWKoOi9veWksei0pTwvdGV4dD48L3N2Zz4="
          />
        )}
      </div>

      <div style={{ borderTop: "1px solid #f4f5f8", marginTop: 8 }}>
        <KvRow label="证据类型">{current.label}</KvRow>
        <KvRow label="采集时间">{current.captured_at || <Muted />}</KvRow>
        <KvRow label="证据状态">{event?.uploadStatusText || "已上传"}</KvRow>
        <KvRow label="元数据">
          <MetaTable meta={current.meta} />
        </KvRow>
      </div>
    </div>
  );
};

// AI 复核
const AiReviewBlock = ({ ai = {}, onRetry, retrying }) => {
  const view = aiReviewView(ai);
  const canRetry = ["failed", "waiting_evidence", "pending"].includes(ai.status);
  return (
    <div style={{ borderTop: "1px solid #f4f5f8" }}>
      <KvRow label="复核结论">
        <Tag color={view.color}>{view.text}</Tag>
        {ai.attempt > 1 ? <span style={{ color: "#8c96a5", fontSize: 12, marginLeft: 6 }}>第 {ai.attempt} 次执行</span> : null}
      </KvRow>
      <KvRow label="复核时间">{ai.executedAt ? ai.executedAt : <Muted>未复核</Muted>}</KvRow>
      <KvRow label="模型版本">{ai.modelVersion || <Muted />}</KvRow>
      <KvRow label="判断依据">
        {ai.reason ? <span style={{ color: "#5c6675" }}>{ai.reason}</span> : <Muted>无</Muted>}
      </KvRow>
      {ai.status === "failed" ? (
        <KvRow label="失败原因">
          <span style={{ color: "#ff4d4f" }}>{ai.error || "复核服务异常"}</span>
        </KvRow>
      ) : null}
      {canRetry ? (
        <KvRow label="操作">
          <Button size="small" loading={retrying} onClick={() => onRetry?.(ai.status)}>
            {ai.status === "failed" ? "重新复核" : "立即复核"}
          </Button>
        </KvRow>
      ) : null}
    </div>
  );
};

const ManualReviewBlock = ({ manual = {} }) => {
  const view = manualReviewView(manual);
  return (
    <div style={{ borderTop: "1px solid #f4f5f8" }}>
      <KvRow label="复核结论">
        <Tag color={view.color}>{view.text}</Tag>
      </KvRow>
      <KvRow label="确认人">
        {manual.userName || <Muted>{manual.result ? "未记录" : "未确认"}</Muted>}
      </KvRow>
      <KvRow label="确认时间">{manual.time || <Muted />}</KvRow>
      <KvRow label="确认来源">
        {manual.result ? SOURCE_TEXT[manual.source] || SOURCE_TEXT.web : <Muted />}
      </KvRow>
      <KvRow label="确认备注">
        {manual.remark ? <span style={{ color: "#5c6675" }}>{manual.remark}</span> : <Muted>无</Muted>}
      </KvRow>
    </div>
  );
};

const PushBlock = ({ push = {}, onRetry, retrying }) => {
  const view = pushStatusView(push);
  const summary = push.summary;
  const canRetry = ["failed", "partial", "skipped"].includes(push.status);
  return (
    <div style={{ borderTop: "1px solid #f4f5f8" }}>
      <KvRow label="推送结果">
        <Tag color={view.color}>{view.text}</Tag>
      </KvRow>
      <KvRow label="对接方式">
        {push.channel ? (push.channel === "mqtt" ? "MQTT" : "接口直连") : <Muted>未配置</Muted>}
      </KvRow>
      {summary && summary.total > 1 ? (
        <KvRow label="投递明细">
          共 {summary.total} 个平台：成功 {summary.success}，失败 {summary.failed}
          {summary.skipped ? `，跳过 ${summary.skipped}` : ""}
        </KvRow>
      ) : null}
      <KvRow label="推送时间">{push.time || <Muted />}</KvRow>
      <KvRow label="异常信息">
        {push.error ? <span style={{ color: "#ff4d4f" }}>{push.error}</span> : <Muted>无</Muted>}
      </KvRow>
      {canRetry && onRetry ? (
        <KvRow label="操作">
          <Button size="small" loading={retrying} onClick={() => onRetry()}>
            重新推送
          </Button>
        </KvRow>
      ) : null}
    </div>
  );
};

export const EventDetailDrawer = ({ open, event, onClose, onConfirm, onRetryAI, onRetryPush, aiRetrying, pushRetrying }) => {
  // 与列表按钮同一套可用性判断：已确认过、或未形成告警都不能再确认
  const confirmed = Boolean(event?.manualReview?.result);
  const noAlarm = event?.hasAlarm === false;
  const confirmable = !confirmed && !noAlarm;
  const confirmReason = confirmed ? "该告警已经人工确认" : noAlarm ? "事件尚未形成告警" : "";

  return (
  <Drawer
    title={`事件与告警详情 · ${event?.id || ""}`}
    width={720}
    open={open}
    onClose={onClose}
    destroyOnClose
    footer={
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <Button onClick={onClose}>关闭</Button>
        {onConfirm ? (
          // disabled 的按钮不派发鼠标事件，tooltip 要挂在外层 span 上
          <Tooltip title={confirmReason}>
            <span>
              <Button type="primary" ghost disabled={!confirmable} onClick={() => onConfirm(event)}>
                确认告警
              </Button>
            </span>
          </Tooltip>
        ) : null}
      </div>
    }
  >
    <EvidencePanel event={event} />

    <Descriptions column={1} bordered size="small" style={{ marginTop: 12 }}>
      <Descriptions.Item label="事件编号">
        <code>{event?.id}</code>
      </Descriptions.Item>
      <Descriptions.Item label="事件类型">{event?.type}</Descriptions.Item>
      <Descriptions.Item label="置信度">
        {Math.round((event?.confidence || 0) * 100)}%
      </Descriptions.Item>
      <Descriptions.Item label="来源设备">{event?.deviceName}</Descriptions.Item>
      <Descriptions.Item label="来源通道">{event?.channelName}</Descriptions.Item>
      <Descriptions.Item label="发生时间">{event?.occurredAt}</Descriptions.Item>
      <Descriptions.Item label="视觉模型版本">
        {event?.modelVersion || "—"}
      </Descriptions.Item>
      <Descriptions.Item label="上传状态">{event?.uploadStatusText || "—"}</Descriptions.Item>
      <Descriptions.Item label="证据文件">
        {event?.evidence?.images || 0} 张图片
        {event?.evidence?.videos ? ` · ${event.evidence.videos} 段视频` : ""}
      </Descriptions.Item>
    </Descriptions>

    <SectionTitle>AI 复核结果</SectionTitle>
    <AiReviewBlock ai={event?.aiReview} onRetry={onRetryAI} retrying={aiRetrying} />

    <SectionTitle>人工复核结果</SectionTitle>
    <ManualReviewBlock manual={event?.manualReview} />
    {event?.manualReview?.confirmed && !event?.manualReview?.result ? (
      <Alert
        type="warning"
        showIcon
        style={{ marginTop: 10 }}
        message="未记录结论"
        description="该事件历史上有确认动作但没有保存结论，可从列表或详情的「确认告警」入口补充。"
      />
    ) : null}

    <SectionTitle>推送状态</SectionTitle>
    <PushBlock push={event?.push} onRetry={onRetryPush} retrying={pushRetrying} />

    <SectionTitle>时间脉络</SectionTitle>
    {event?.timeline?.length ? (
      <Timeline
        items={event.timeline.map((node) => ({
          color: node.title.includes("失败") || node.title.includes("未上传") ? "red" : node.title.includes("通知") ? "gray" : "blue",
          children: (
            <div>
              <b>{node.title}</b>
              {node.desc ? <div style={{ color: "#8c96a5", fontSize: 12 }}>{node.desc}</div> : null}
              {node.time ? (
                <div style={{ color: "#8c96a5", fontSize: 12, marginTop: 2 }}>{node.time}</div>
              ) : (
                <div style={{ color: "#bfbfbf", fontSize: 12, marginTop: 2 }}>未配置</div>
              )}
            </div>
          ),
        }))}
      />
    ) : (
      <Empty description="暂无时间脉络" />
    )}
  </Drawer>
  );
};

export { REVIEW_RESULT_TEXT };
