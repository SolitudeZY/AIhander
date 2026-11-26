import React, { useCallback, useEffect, useMemo, useState } from "react";
import moment from "moment";
import { connect } from "react-redux";
import { Button, DatePicker, Descriptions, Input, Select, Space, Table, Modal, Popconfirm, message, Tag } from "antd";
import "../style.less";
import { toRows } from "../components/common";
import { TASK_STATUS, TASK_STATUS_COLOR, TASK_STATUS_OPTIONS } from "../constants";

const UpgradeTask = ({ actions, dispatch }) => {
  const { edgeDevice } = actions || {};
  const [projects, setProjects] = useState([]);
  const [list, setList] = useState([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [projectId, setProjectId] = useState(undefined);
  const [modelId, setModelId] = useState(undefined);
  const [taskId, setTaskId] = useState("");
  const [status, setStatus] = useState(undefined);
  const [date, setDate] = useState(null);
  const [models, setModels] = useState([]);
  const [submitted, setSubmitted] = useState({});
  const [detail, setDetail] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const projectLabel = useMemo(
    () => new Map(projects.map((p) => [p.id, p.name])),
    [projects],
  );

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await dispatch(
        edgeDevice.queryUpgradeDeviceRows({ page, pageSize, ...submitted, status: undefined }),
      );
      if (res?.success) {
        const rows = toRows(res.payload?.data);
        setList(rows);
        setCount(Number(res.payload?.data?.count ?? rows.length));
      }
    } finally {
      setLoading(false);
    }
  }, [actions, dispatch, edgeDevice, page, pageSize, submitted]);

  const rows = submitted.status ? list.filter((item) => item.status === submitted.status) : list;

  useEffect(() => {
    dispatch(edgeDevice.getEdgeProjects()).then((res) => {
      if (res?.success) setProjects(toRows(res.payload?.data));
    });
  }, []);

  useEffect(() => {
    dispatch(edgeDevice.queryVisionModelOptions()).then((res) => {
      if (res?.success) setModels(toRows(res.payload?.data));
    });
  }, []);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const columns = [
    {
      title: "任务编号",
      dataIndex: "deploymentId",
      width: 180,
      render: (v) => <code>{v}</code>,
    },
    {
      title: "所属项目",
      dataIndex: "projectId",
      width: 160,
      render: (pid) => projectLabel.get(pid) || pid || "-",
    },
    { title: "升级模型", dataIndex: "modelName", width: 160 },
    // { title: "模型类型", dataIndex: "modelType", width: 120 },
    { title: "目标版本", dataIndex: "modelVersion", width: 110 },
    { title: "设备名称", dataIndex: "deviceName", width: 160 },
    {
      title: "状态",
      dataIndex: "status",
      width: 110,
      render: (value) => <Tag color={TASK_STATUS_COLOR[value]}>{value || "—"}</Tag>,
    },
    {
      title: "下发时间",
      dataIndex: "dispatchedAt",
      width: 170,
      render: (value, record) => {
        const time = value || record.createdAt;
        return time ? moment(time).format("YYYY-MM-DD HH:mm") : "-";
      },
    },
    {
      title: "发起人",
      dataIndex: "initiator",
      width: 130,
      render: (value, record) => value || record.creator?.name || record.createdByName || record.createdBy || "-",
    },
    // {
    //   title: "操作",
    //   width: 150,
    //   render: (_, record) => (
    //     <Space size={4}>
    //       <Button
    //         type="link"
    //         size="small"
    //         onClick={async () => {
    //           const res = await dispatch(edgeDevice.getUpgradeTaskDetail(record.deploymentId));
    //           if (res?.success) {
    //             setDetail(res.payload?.data || {});
    //             setDetailOpen(true);
    //           }
    //         }}
    //       >
    //         详情
    //       </Button>
    //       <Button
    //         type="link"
    //         size="small"
    //         onClick={async () => {
    //           const res = await dispatch(edgeDevice.redispatchUpgradeTask(record.deploymentId));
    //           if (res?.success) {
    //             message.success("升级任务已重新下发");
    //             fetchList();
    //           }
    //         }}
    //       >
    //         重新下发
    //       </Button>
    //     </Space>
    //   ),
    // },
  ];

  return (
    <div className="edge-device" style={{
      background: "#FFFFFF",
      margin: "8px 12px",
      padding: "10px 20px 0",
      height: "calc(100vh - 80px)",
      overflow: "auto",
      display: "flex",
      flexDirection: "column",
    }}>
      <div style={{ display: "flex" }}>
        <div style={{ display: "flex", alignItems: "center", marginRight: 30 }}>
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
          }}>升级任务</div>
          <div style={{
            marginLeft: 6,
            fontSize: 12,
            color: "#969799",
            fontFamily: "DINExp",
          }}>Upgrade Tasks</div>
        </div>
        <Space>
          <span>所属项目：</span>
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            style={{ width: 200 }}
            placeholder="全部项目"
            value={projectId}
            onChange={setProjectId}
            options={projects.map((p) => ({ label: p.name, value: p.id }))}
          />
          <span>视觉模型：</span>
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            style={{ width: 180 }}
            placeholder="全部视觉模型"
            value={modelId}
            onChange={setModelId}
            options={models.map((model) => ({
              label: `${model.modelName} ${model.version}`,
              value: model.id,
            }))}
          />
          <span>任务状态：</span>
          <Select
            allowClear
            style={{ width: 120 }}
            placeholder="全部状态"
            value={status}
            onChange={setStatus}
            options={TASK_STATUS_OPTIONS.map((v) => ({ label: v, value: v }))}
          />
          <Input
            allowClear
            style={{ width: 240 }}
            placeholder="任务编号"
            value={taskId}
            onChange={(e) => setTaskId(e.target.value)}
            onPressEnter={() => {
              setPage(1);
              setSubmitted({ projectId, modelId, taskId: taskId || undefined, status });
            }}
          />
          
          <DatePicker
            value={date}
            onChange={setDate}
            allowClear
            style={{ width: 150 }}
          />
          <Button
            type="primary"
            onClick={() => {
              setPage(1);
              setSubmitted({
                projectId,
                modelId,
                taskId: taskId || undefined,
                status,
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
              setModelId(undefined);
              setTaskId("");
              setStatus(undefined);
              setDate(null);
              setPage(1);
              setSubmitted({});
            }}
          >
            重置
          </Button>
          <Popconfirm
            title="确认清理已结束的升级任务历史？"
            okText="确认"
            cancelText="取消"
            onConfirm={async () => {
              const res = await dispatch(edgeDevice.clearUpgradeTaskHistory());
              if (res?.success) {
                setPage(1);
                fetchList();
              }
            }}
          >
            {/* <Button>清理历史</Button> */}
          </Popconfirm>
        </Space>
      </div>
      <Table
        rowKey={(r) => `${r.deploymentId}-${r.deviceCode || r.deviceName}`}
        loading={loading}
        columns={columns}
        dataSource={rows}
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
      <Modal
        title={`升级任务详情${detail?.id ? `：${detail.id}` : ""}`}
        open={detailOpen}
        footer={null}
        width={900}
        onCancel={() => setDetailOpen(false)}
      >
        {detail?.deployment ? (
          <Descriptions column={2} size="small" bordered style={{ marginBottom: 14 }}>
            <Descriptions.Item label="记录来源">
              {detail.deployment.source === "node" ? "平台当前记录" : detail.deployment.source || "—"}
            </Descriptions.Item>
            <Descriptions.Item label="任务创建时间">
              {detail.deployment.createdAt ? moment(detail.deployment.createdAt).format("YYYY-MM-DD HH:mm:ss") : "—"}
            </Descriptions.Item>
            <Descriptions.Item label="执行结果" span={2}>
              {toRows(detail.deployment.tasks).length ? (
                <Table
                  size="small"
                  rowKey={(row) => `${row.device_id}-${row.id}`}
                  pagination={false}
                  dataSource={toRows(detail.deployment.tasks)}
                  columns={[
                    { title: "设备 ID", dataIndex: "device_id" },
                    {
                      title: "状态",
                      dataIndex: "status",
                      width: 120,
                      render: (v) => (
                        <Tag color={v === "succeeded" ? "green" : v === "failed" ? "red" : "blue"}>
                          {TASK_STATUS[v] || v || "—"}
                        </Tag>
                      ),
                    },
                    { title: "进度", dataIndex: "progress", width: 90, render: (v) => (v == null ? "—" : `${v}%`) },
                    { title: "结果信息", dataIndex: "message" },
                    {
                      title: "完成时间",
                      dataIndex: "finished_at",
                      width: 170,
                      render: (v) => (v ? moment(v).format("YYYY-MM-DD HH:mm:ss") : "—"),
                    },
                  ]}
                />
              ) : (
                "暂无设备执行记录"
              )}
            </Descriptions.Item>
          </Descriptions>
        ) : null}
        <Table
          size="small"
          rowKey={(row) => `${row.deploymentId}-${row.deviceCode}`}
          pagination={false}
          dataSource={toRows(detail?.rows)}
          columns={[
            { title: "设备名称", dataIndex: "deviceName" },
            { title: "设备 ID", dataIndex: "deviceCode" },
            { title: "模型名称", dataIndex: "modelName" },
            { title: "模型类型", dataIndex: "modelType" },
            { title: "版本", dataIndex: "modelVersion" },
            { title: "发布任务 ID", dataIndex: "deploymentId" },
          ]}
        />
      </Modal>
    </div>
  );
};

function mapStateToProps(state) {
  return {
    actions: state.global.actions,
  };
}

export default connect(mapStateToProps)(UpgradeTask);
