import React, { useCallback, useEffect, useState } from "react";
import { connect } from "react-redux";
import { Button, DatePicker, message, Select, Space, Table, Tag, Tooltip } from "antd";
import "../style.less";
import { EventDetailDrawer } from "../components/event-components";
import { ReviewModal } from "../components/review-modal";
import {
  aiReviewView,
  eventImageSrc,
  manualReviewView,
  pushStatusView,
  REVIEW_RESULT_TEXT,
  toRows,
} from "../components/common";
import { isAuthorized } from "$utils";
import { DETECTION_TYPE_CODES, DETECTION_TYPE_OPTIONS, EVENT_PERMISSIONS } from "../constants";


// 按 upload_status 精确匹配（uploaded / not_uploaded）
const EVIDENCE_STATUS_OPTIONS = [
  { label: "有证据", value: "uploaded" },
  { label: "无证据", value: "not_uploaded" },
];

const EventAlarm = ({ actions, dispatch }) => {
  const { edgeDevice } = actions || {};
  const [projects, setProjects] = useState([]);
  const [list, setList] = useState([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [projectId, setProjectId] = useState(undefined);
  const [type, setType] = useState(undefined);
  const [evidenceStatus, setEvidenceStatus] = useState(undefined);
  const [date, setDate] = useState(null);
  const [submitted, setSubmitted] = useState({});

  const [detailEvent, setDetailEvent] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewEvent, setReviewEvent] = useState(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [pushResult, setPushResult] = useState(null);
  const [aiRetrying, setAiRetrying] = useState(false);
  const [pushRetrying, setPushRetrying] = useState(false);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await dispatch(
        edgeDevice.queryEdgeEvents({
          page,
          pageSize,
          ...submitted,
        }),
      );
      if (res?.success) {
        const data = res.payload?.data || {};
        const items = Array.isArray(data) ? data : data.items || [];
        setList(items);
        setCount(Number(data?.total ?? items.length));
        return items;
      }
      return null;
    } finally {
      setLoading(false);
    }
  }, [actions, dispatch, edgeDevice, page, pageSize, submitted]);

  useEffect(() => {
    dispatch(edgeDevice.getEdgeProjects()).then((res) => {
      if (res?.success) setProjects(toRows(res.payload?.data));
    });
  }, []);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const submitReview = async ({ result, remark }) => {
    if (!reviewEvent) return;
    setReviewLoading(true);
    try {
      const res = await dispatch(edgeDevice.confirmEdgeEvent(reviewEvent, { result, remark }));
      if (res?.success) {
        const data = res.payload?.data || res.payload || {};
        const push = data.push || {};
        const label = { real: "真实告警", invalid: "无效告警", unknown: "无法判断" }[result] || "已确认";
        // 结论保存后直接关闭弹窗，推送结果用轻提示反馈，不留在弹窗里
        setReviewOpen(false);
        setPushResult(null);
        if (push.status === "success") {
          message.success(`已确认为${label}，${push.message || "已同步至安心云"}`);
        } else if (push.status === "failed") {
          message.warning(`已确认为${label}，但推送失败：${push.message || "请稍后重试"}`);
        } else {
          message.info(`已确认为${label}：${push.message || "本条告警未同步"}`);
        }
        // 列表和详情抽屉一起刷新，避免详情还显示「待人工确认」
        await syncDetail();
      } else if (res?.message) {
        message.error(res.message);
      }
    } finally {
      setReviewLoading(false);
    }
  };

  // 刷新列表并把详情抽屉的数据同步成最新
  const syncDetail = async () => {
    const items = await fetchList();
    if (!detailEvent || !items) return;
    const fresh = items.find((item) => item.id === detailEvent.id);
    if (fresh) {
      setDetailEvent(fresh);
      setReviewEvent(fresh);
    }
  };

  const retryAI = async () => {
    if (!detailEvent) return;
    setAiRetrying(true);
    try {
      const res = await dispatch(edgeDevice.reviewEdgeEventWithAI(detailEvent));
      if (res?.success) {
        const data = res.payload?.data || res.payload || {};
        if (data.ai_review_status === "done") {
          message.success(`AI 复核完成：${REVIEW_RESULT_TEXT[data.ai_review_result] || data.ai_review_result || ""}`);
        } else if (data.ai_review_status === "waiting_evidence") {
          message.warning("暂无可用证据，AI 无法复核");
        } else {
          message.warning(`AI 复核失败：${data.ai_review_error || "服务异常"}`);
        }
        await syncDetail();
      }
    } finally {
      setAiRetrying(false);
    }
  };

  const retryPush = async () => {
    if (!detailEvent) return;
    setPushRetrying(true);
    try {
      const res = await dispatch(edgeDevice.pushEdgeEvent(detailEvent));
      if (res?.success) {
        const data = res.payload?.data || res.payload || {};
        const push = data.push || {};
        if (push.status === "success") message.success(push.message || "已重新推送");
        else if (push.status === "failed") message.warning(push.message || "重新推送失败");
        else message.info(push.message || "未推送");
        await syncDetail();
      } else if (res?.message) {
        message.error(res.message);
      }
    } finally {
      setPushRetrying(false);
    }
  };

  // 详情抽屉的确认入口，与列表按钮走同一套动作
  const openConfirm = (target) => {
    if (!target) return;
    setPushResult(null);
    setReviewEvent(target);
    setReviewOpen(true);
  };

  const columns = [
    {
      title: "事件编号",
      dataIndex: "id",
      width: 160,
      render: (v) => (
        <code
          style={{ cursor: "pointer", color: "#1677ff" }}
          onClick={() => {
            const target = list.find((r) => r.id === v);
            setDetailEvent(target);
            setDetailOpen(true);
          }}
        >
          {v}
        </code>
      ),
    },
    {
      title: "证据",
      key: "evidence",
      width: 130,
      render: (_, r) => (
        <div
          className="edge-evidence-thumb"
          onClick={() => {
            setDetailEvent(r);
            setDetailOpen(true);
          }}
        >
          {r.hasImage ? (
            <img
              src={r.evidence?.imageUrls?.[0] || eventImageSrc(r)}
              alt="证据"
              style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 5 }}
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          ) : (
            <span className="edge-evidence-status">{r.uploadStatusText || "缺失"}</span>
          )}
        </div>
      ),
    },
    {
      title: "事件类型",
      dataIndex: "type",
      width: 160,
      render: (v, r) => (
        <span>
          <b>{v}</b>
          <div style={{ fontSize: 12, color: "#8c96a5" }}>
            置信度 {Math.round((r.confidence || 0) * 100)}%
          </div>
        </span>
      ),
    },
    {
      title: "来源设备 / 通道",
      key: "source",
      width: 190,
      render: (_, r) => (
        <span>
          {r.deviceName}
          <div style={{ fontSize: 12, color: "#8c96a5" }}>{r.channelName}</div>
        </span>
      ),
    },
    { title: "发生时间", dataIndex: "occurredAt", width: 180 },
        {
      title: "AI 复核结果",
      key: "aiReview",
      width: 132,
      render: (_, r) => {
        const view = aiReviewView(r.aiReview);
        const tip = r.aiReview?.reason || r.aiReview?.error || "";
        return (
          <Tooltip title={tip}>
            <Tag color={view.color}>{view.text}</Tag>
            {/* {r.aiReview?.modelVersion ? (
              <div style={{ fontSize: 12, color: "#8c96a5" }}>{r.aiReview.modelVersion}</div>
            ) : null} */}
          </Tooltip>
        );
      },
    },
    {
      title: "人工复核结果",
      key: "manualReview",
      width: 150,
      render: (_, r) => {
        const view = manualReviewView(r.manualReview);
        const tip = r.manualReview?.remark || "";
        return (
          <Tooltip title={tip}>
            <Tag color={view.color} style={{ whiteSpace: "nowrap" }}>{view.text}</Tag>
            {r.manualReview?.userName ? (
              <div style={{ fontSize: 12, color: "#8c96a5" }}>
                {r.manualReview.userName} · {r.manualReview.time}
              </div>
            ) : null}
          </Tooltip>
        );
      },
    },
    {
      title: "推送状态",
      key: "push",
      width: 112,
      render: (_, r) => {
        const view = pushStatusView(r.push);
        const summary = r.push?.summary;
        const tip = [
          r.push?.error,
          summary && summary.total > 1 ? `共 ${summary.total} 个平台：成功 ${summary.success}，失败 ${summary.failed}${summary.skipped ? `，跳过 ${summary.skipped}` : ""}` : "",
          r.push?.time,
        ].filter(Boolean).join("\n");
        return (
          <Tooltip title={tip}>
            <Tag color={view.color}>{view.text}</Tag>
            {summary && summary.total > 1 ? (
              <div style={{ fontSize: 12, color: summary.failed ? "#ff4d4f" : "#8c96a5" }}>
                成功 {summary.success}/{summary.total}
              </div>
            ) : null}
          </Tooltip>
        );
      },
    },
    {
      title: "操作",
      key: "action",
      width: 178,
      render: (_, r) => {
        if (!isAuthorized(EVENT_PERMISSIONS.view)) return null;
        const confirmed = Boolean(r.manualReview?.result);
        const noAlarm = r.hasAlarm === false;
        const disabled = confirmed || noAlarm;
        const reason = confirmed ? "该告警已经人工确认" : noAlarm ? "事件尚未形成告警" : "";
        return (
          <Space size={8}>
            <Button
              size="small"
              color="primary"
              variant="outlined"
              onClick={() => {
                setDetailEvent(r);
                setDetailOpen(true);
              }}
            >
              查看详情
            </Button>
            <Tooltip title={reason}>
              <Button
                size="small"
                type="primary"
                ghost
                disabled={disabled}
                onClick={(e) => {
                  e.stopPropagation();
                  setPushResult(null);
                  setReviewEvent(r);
                  setReviewOpen(true);
                }}
              >
                确认告警
              </Button>
            </Tooltip>
          </Space>
        );
      },
    },
  ];

  const primaryFilters = (
    <>
      <span>所属项目：</span>
      <Select
        allowClear
        showSearch
        optionFilterProp="label"
        style={{ width: 220 }}
        placeholder="全部项目"
        value={projectId}
        onChange={setProjectId}
        options={projects.map((p) => ({ label: p.name, value: p.id }))}
      />
      {/* <span>发生日期：</span> */}
      <DatePicker value={date} onChange={setDate} allowClear style={{ width: 150 }} />
    </>
  );

  const advancedFilters = (
    <>
      <span>事件类型：</span>
      <Select
        allowClear
        style={{ width: 150 }}
        placeholder="全部类型"
        value={type}
        onChange={setType}
        options={DETECTION_TYPE_OPTIONS.map((v) => ({ label: v, value: DETECTION_TYPE_CODES[v] || v }))}
      />
      <span>证据状态：</span>
      <Select
        allowClear
        style={{ width: 120 }}
        placeholder="全部状态"
        value={evidenceStatus}
        onChange={setEvidenceStatus}
        options={EVIDENCE_STATUS_OPTIONS}
      />
    </>
  );

  return (
    <div
      className="edge-device"
      style={{
        background: "#FFFFFF",
        margin: "8px 12px",
        padding: "10px 20px 0",
        height: "calc(100vh - 80px)",
        overflow: "auto",
        display: "flex",
        flexDirection: "column",
      }}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", marginRight: 22 }}>
          <div style={{
            width: 0,
            height: 20,
            borderLeft: "3px solid #005ABD",
            borderTop: "3px solid transparent",
            borderBottom: "3px solid transparent",
          }}></div>
          <div style={{
            fontFamily: "YouSheBiaoTiHei",
            fontSize: 24,
            color: "#101531",
            marginLeft: 8,
          }}>事件与告警</div>
          <div style={{
            marginLeft: 6,
            fontSize: 12,
            color: "#969799",
            fontFamily: "DINExp",
          }}>Events & Alarms</div>
        </div>
        {primaryFilters}
        {advancedFilters}
          <Button
            type="primary"
            onClick={() => {
              setPage(1);
              setSubmitted({
                projectId,
                detectionType: type,
                evidenceStatus,
                startTime: date ? `${date.format("YYYY-MM-DD")}T00:00:00+08:00` : undefined,
                endTime: date ? `${date.format("YYYY-MM-DD")}T23:59:59+08:00` : undefined,
              });
            }}
          >
            查询
          </Button>
          <Button
            onClick={() => {
              setProjectId(undefined);
              setType(undefined);
              setEvidenceStatus(undefined);
              setDate(null);
              setPage(1);
              setSubmitted({});
            }}
          >
            重置
          </Button>
      </div>
      <Table
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={list}
        scroll={{ x: 1300 }}
        onRow={(r) => ({
          onDoubleClick: () => {
            setDetailEvent(r);
            setDetailOpen(true);
          },
        })}
        pagination={{
          current: page,
          pageSize,
          total: count,
          showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条/共 ${total} 条`,
          onChange: (p, s) => {
            setPage(p);
            setPageSize(s);
          },
        }}
      />
      <EventDetailDrawer
        open={detailOpen}
        event={detailEvent}
        onClose={() => setDetailOpen(false)}
        onConfirm={isAuthorized(EVENT_PERMISSIONS.view) ? openConfirm : undefined}
        onRetryAI={retryAI}
        onRetryPush={retryPush}
        aiRetrying={aiRetrying}
        pushRetrying={pushRetrying}
      />
      <ReviewModal
        open={reviewOpen}
        event={reviewEvent}
        submitting={reviewLoading}
        pushResult={pushResult}
        onClose={() => {
          setReviewOpen(false);
          setPushResult(null);
        }}
        onSubmit={submitReview}
      />
    </div>
  );
};

function mapStateToProps(state) {
  return {
    actions: state.global.actions,
  };
}

export default connect(mapStateToProps)(EventAlarm);
