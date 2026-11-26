import { edgeFileUploadUrl } from "../components/common";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { connect } from "react-redux";
import { useHistory } from "react-router-dom";
import { AutoComplete, Button, Input, Modal, message, Select, Space, Table, Tag, Upload } from "antd";
import { ReloadOutlined, SearchOutlined, UploadOutlined } from "@ant-design/icons";
import { isAuthorized } from "$utils";
import "../style.less";
import {
  AbnormalTag,
  OnlineDot,
  fromNow,
  minutesSince,
} from "../components/common";
import { EDGE_PERMISSIONS, MODEL_PERMISSIONS } from "../constants";
import { AssignProjectModal } from "../components/device-modals";

const EdgeDeviceList = ({ actions, dispatch }) => {
  const history = useHistory();
  const { edgeDevice } = actions || {};

  const [projects, setProjects] = useState([]);
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [projectId, setProjectId] = useState(undefined);
  const [keyword, setKeyword] = useState("");
  const [online, setOnline] = useState(undefined);
  const [abnormal, setAbnormal] = useState(undefined);
  const [assigned, setAssigned] = useState(undefined);

  const [submitted, setSubmitted] = useState({});

  const [assignOpen, setAssignOpen] = useState(false);
  const [assignDevice, setAssignDevice] = useState(null);

  const [dispatchOpen, setDispatchOpen] = useState(false);
  const [dispatchTargetId, setDispatchTargetId] = useState(undefined);
  const [upgradeModels, setUpgradeModels] = useState([]);
  const [upgradeModelId, setUpgradeModelId] = useState(undefined);
  const [versionInput, setVersionInput] = useState("");
  const [newFile, setNewFile] = useState(null);
  const [upgradeLoading, setUpgradeLoading] = useState(false);
  const openDispatch = (record) => {
    setDispatchTargetId(record?.id);
    setDispatchOpen(true);
  };

  const modelLabel = (model) => `${model.modelName} ${model.version}`;

  const parseVersionInput = () => {
    const raw = (versionInput || "").trim();
    const matched = upgradeModels.find((m) => modelLabel(m) === raw);
    if (matched) return { matched, base: matched, version: matched.version };
    const byPrefix = upgradeModels.find((m) => raw.startsWith(`${m.modelName} `));
    const base =
      byPrefix ||
      upgradeModels.find((m) => String(m.id) === String(upgradeModelId)) ||
      upgradeModels[0] ||
      null;
    const version = (byPrefix ? raw.slice(byPrefix.modelName.length) : raw).trim();
    return { matched: null, base, version };
  };
  const versionParsed = parseVersionInput();
  const creatingVersion = Boolean(!versionParsed.matched && versionParsed.base && versionParsed.version);

  const onModelFileChange = (info) => {
    const body = info.file?.response || {};
    const data = body.payload?.data ?? body.payload ?? body.data ?? body;
    if (info.file.status === "done") {
      const fileId = data?.id ?? data?.file_id;
      if (!fileId) {
        setNewFile(null);
        message.error("平台未返回文件 ID");
        return;
      }
      setNewFile({ id: String(fileId), name: info.file.name, size: info.file.size });
    } else if (info.file.status === "error") {
      setNewFile(null);
      message.error("模型文件上传失败");
    }
  };

  const submitDispatch = async () => {
    const device = list.find((d) => d.id === dispatchTargetId);
    if (!device) {
      message.warning("请选择目标设备");
      return;
    }
    if (!device.projectId) {
      message.warning("目标设备未关联项目，请先分配项目");
      return;
    }
    const { matched, base, version } = versionParsed;
    if (!matched && (!base || !version)) {
      message.warning("请选择或输入配置版本");
      return;
    }
    setUpgradeLoading(true);
    try {
      let model = matched;
      if (!model) {
        if (upgradeModels.some((m) => m.modelName === base.modelName && m.version === version)) {
          message.warning("该版本已存在，请从列表选择");
          return;
        }
        if (!newFile?.id) {
          message.warning("请先上传新版本的模型文件");
          return;
        }
        const created = await dispatch(
          edgeDevice.uploadVisionModel({
            type: base.modelType,
            modelName: base.modelName,
            modelFormat: base.modelFormat,
            version,
            fileId: newFile.id,
            fileName: newFile.name,
            fileSize: newFile.size,
          }),
        );
        if (!created?.success) return;
        model = created.payload?.data || { modelName: base.modelName, version };
        await loadUpgradeModels();
      }
      const res = await dispatch(
        edgeDevice.dispatchVisionModelUpgrade({
          modelId: model.id,
          modelName: model.modelName,
          version: model.version,
          projectId: device.projectId,
          targetPath: "/opt/edge/models",
          deviceCodes: [device.id],
          targetIsDirectory: true,
        }),
      );
      if (res?.success) {
        setDispatchOpen(false);
      }
    } finally {
      setUpgradeLoading(false);
    }
  };

  const projectLabel = useMemo(() => {
    const map = new Map(projects.map((p) => [p.id, p.name]));
    return (id) => map.get(id) || "";
  }, [projects]);

  const fetchList = useCallback(
    async (params = {}) => {
      setLoading(true);
      try {
        const res = await dispatch(
          edgeDevice.queryEdgeDevices({
            page,
            pageSize,
            ...submitted,
            ...params,
          }),
        );
        if (res?.success) {
          const payloadData = res.payload?.data;
          const rows = Array.isArray(payloadData)
            ? payloadData
            : Array.isArray(payloadData?.rows)
              ? payloadData.rows
              : [];
          setList(rows);
        }
      } finally {
        setLoading(false);
      }
    },
    [actions, dispatch, edgeDevice, page, pageSize, submitted],
  );

  useEffect(() => {
    dispatch(edgeDevice.getEdgeProjects()).then((res) => {
      if (res?.success) {
        const data = res.payload?.data;
        const list = Array.isArray(data) ? data : (data?.rows || []);
        setProjects(list);
      }
    });
  }, []);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const loadUpgradeModels = useCallback(async () => {
    const res = await dispatch(edgeDevice.queryVisionModels({ page: 1, pageSize: 100 }));
    if (!res?.success) return [];
    const data = res.payload?.data;
    const models = Array.isArray(data) ? data : data?.rows || [];
    setUpgradeModels(models);
    return models;
  }, [dispatch, edgeDevice]);

  useEffect(() => {
    if (!dispatchOpen) return;
    setNewFile(null);
    loadUpgradeModels().then((models) => {
      if (models.length) {
        setUpgradeModelId(String(models[0].id));
        setVersionInput(`${models[0].modelName} ${models[0].version}`);
      } else {
        setUpgradeModelId(undefined);
        setVersionInput("");
      }
    });
  }, [dispatchOpen, loadUpgradeModels]);

  const goDetail = (id) => {
    history.push(`/device/edgeDevice/deviceDetail?id=${id}`);
  };

  const handleSearch = () => {
    setPage(1);
    setSubmitted({ projectId, keyword, online, abnormal, assigned });
  };

  const handleReset = () => {
    setProjectId(undefined);
    setKeyword("");
    setOnline(undefined);
    setAbnormal(undefined);
    setAssigned(undefined);
    setPage(1);
    setSubmitted({});
  };

  const openAssign = (record) => {
    setAssignDevice({
      ...record,
      projectName: record.projectId ? projectLabel(record.projectId) : "",
    });
    setAssignOpen(true);
  };

  const filteredList = useMemo(() => {
    const { projectId: pid, online: on, abnormal: ab, assigned: as } = submitted;
    if (pid !== "__UNASSIGNED__" && on == null && !ab && !as) return list;
    return list.filter((d) => {
      if (pid === "__UNASSIGNED__" && d.projectId) return false;
      if (on != null && Boolean(d.online) !== on) return false;
      if (ab) {
        const value = d.abnormal ?? "";
        const isAbnormal = value !== "" && value !== "normal" && value !== "正常";
        if (isAbnormal !== (ab === "abnormal")) return false;
      }
      if (as === "assigned" && !d.projectId) return false;
      if (as === "unassigned" && d.projectId) return false;
      return true;
    });
  }, [list, submitted]);

  const columns = [
    {
      title: "项目 / 分配状态",
      dataIndex: "projectId",
      width: 200,
      render: (pid) =>
        pid ? (
          projectLabel(pid)
        ) : (
          <Tag color="orange">待分配</Tag>
        ),
    },
    {
      title: "设备名称",
      dataIndex: "name",
      width: 160,
      render: (_, r) => (
        <a onClick={() => goDetail(r.id)} style={{ fontWeight: 600 }}>
          {r.name}
        </a>
      ),
    },
    {
      title: "设备 ID",
      dataIndex: "id",
      width: 170,
      render: (v) => v || "—",
    },
    {
      title: "设备 SKU",
      dataIndex: "sku",
      width: 150,
      render: (v) => v || "—",
    },
    {
      title: "云端状态",
      dataIndex: "online",
      width: 130,
      render: (online, r) => {
        const mins = online ? null : minutesSince(r.heartbeatAt);
        return (
          <OnlineDot
            online={online}
            sub={online ? "心跳正常" : mins == null ? "心跳超时" : `心跳超时 ${mins} 分钟`}
          />
        );
      },
    },
    {
      title: "异常状态",
      dataIndex: "abnormal",
      width: 110,
      render: (v) => (v ? <AbnormalTag value={v} /> : "—"),
    },
    {
      title: "通道数",
      key: "channels",
      width: 90,
      render: (_, r) =>
        r.channelOnline != null && r.channelTotal != null
          ? `${r.channelOnline} / ${r.channelTotal}`
          : r.channel_count != null
            ? String(r.channel_count)
            : "—",
    },
    {
      title: "实际软件版本",
      key: "version",
      width: 200,
      render: (_, r) => (
        <span>
          Runtime {r.runtimeVersion}
          {r.modelVersion ? ` / 模型 ${r.modelVersion}` : ""}
        </span>
      ),
    },
    {
      title: "最后心跳",
      dataIndex: "heartbeatAt",
      width: 110,
      render: (ts) => fromNow(ts),
    },
    {
      title: "操作",
      key: "action",
      width: 260,
      render: (_, r) => (
        <Space>
          {isAuthorized(EDGE_PERMISSIONS.view) && (
            <Button color="primary" variant="outlined" onClick={() => goDetail(r.id)}>
              查看详情
            </Button>
          )}
          {isAuthorized(MODEL_PERMISSIONS.dispatchUpgrade) && (
            <Button color="cyan" variant="outlined" onClick={() => openDispatch(r)}>
              下发任务
            </Button>
          )}
          {!r.projectId && isAuthorized(EDGE_PERMISSIONS.assignProject) ? (
            <Button color="cyan" variant="outlined" onClick={() => openAssign(r)}>
              分配项目
            </Button>
          ) : null}
        </Space>
      ),
    },
  ];

  const primaryFilters = (
    <>
      <span>所属项目：</span>
      <Select
        allowClear
        style={{ width: 220 }}
        placeholder="全部项目"
        value={projectId}
        onChange={setProjectId}
        options={[
          { label: "未分配", value: "__UNASSIGNED__" },
          ...projects.map((p) => ({ label: p.name, value: p.id })),
        ]}
      />
      <span>设备名称或设备ID:</span>
      <Input
        allowClear
        style={{ width: 200 }}
        placeholder="设备名称或设备ID"
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
        onPressEnter={handleSearch}
      />
    </>
  );

  const advancedFilters = (
    <>
      <span>在线状态：</span>
      <Select
        allowClear
        style={{ width: 110 }}
        placeholder="全部"
        value={online}
        onChange={setOnline}
        options={[
          { label: "在线", value: true },
          { label: "离线", value: false },
        ]}
      />
      <span>异常状态：</span>
      <Select
        allowClear
        style={{ width: 110 }}
        placeholder="全部"
        value={abnormal}
        onChange={setAbnormal}
        options={[
          { label: "正常", value: "normal" },
          { label: "存在异常", value: "abnormal" },
        ]}
      />
      <span>分配状态：</span>
      <Select
        allowClear
        style={{ width: 110 }}
        placeholder="全部"
        value={assigned}
        onChange={setAssigned}
        options={[
          { label: "已分配", value: "assigned" },
          { label: "待分配", value: "unassigned" },
        ]}
      />
    </>
  );

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
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", marginRight: 22 }}>
          <div
            style={{
              width: 0,
              height: 20,
              borderLeft: "3px solid #005ABD",
              borderTop: "3px solid transparent",
              borderBottom: "3px solid transparent",
            }}
          ></div>
          <div
            style={{
              fontFamily: "YouSheBiaoTiHei",
              fontSize: 24,
              color: "#101531",
              marginLeft: 8,
            }}
          >
            边缘设备
          </div>
          <div
            style={{
              marginLeft: 6,
              fontSize: 12,
              color: "#969799",
              fontFamily: "DINExp",
            }}
          >
            Edge Devices
          </div>
        </div>
        {primaryFilters}
        {advancedFilters}
          <Button type="primary" onClick={handleSearch}>
            查询
          </Button>
          <Button onClick={handleReset}>
            重置
          </Button>
          {/* <Button
            style={{ marginLeft: "auto" }}
            onClick={() => {
              setProjectId("__UNASSIGNED__");
              setAssigned("unassigned");
              setAbnormal(undefined);
              setOnline(undefined);
              setKeyword("");
              setPage(1);
              setSubmitted({ projectId: "__UNASSIGNED__", assigned: "unassigned" });
            }}
          >
            待分配设备 {unassignedCount}
          </Button> */}
      </div>
      <Table
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={filteredList}
        scroll={{ x: 1300 }}
        pagination={{
          current: page,
          pageSize,
          total: filteredList.length,
          showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条/共 ${total} 条`,
          onChange: (p, s) => {
            setPage(p);
            setPageSize(s);
          },
        }}
      />
      <AssignProjectModal
        open={assignOpen}
        device={assignDevice}
        projects={projects}
        onCancel={(refresh) => {
          setAssignOpen(false);
          if (refresh) fetchList();
        }}
        onSubmit={(id, pid) => dispatch(edgeDevice.assignEdgeDeviceProject(id, pid))}
      />
      <Modal
        title="下发任务"
        open={dispatchOpen}
        onCancel={() => setDispatchOpen(false)}
        onOk={submitDispatch}
        confirmLoading={upgradeLoading}
        width={480}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: "8px 0" }}>
          <div>
            <div style={{ marginBottom: 8 }}>任务类型</div>
            <Select
              style={{ width: "100%" }}
              value="software"
              options={[{ label: "软件升级", value: "software" }]}
            />
          </div>
          <div>
            <div style={{ marginBottom: 8 }}>目标范围</div>
            <Select
              style={{ width: "100%" }}
              value={dispatchTargetId}
              onChange={setDispatchTargetId}
              options={list.map((d) => ({ label: `${d.name} (${d.id})`, value: d.id }))}
            />
          </div>
          <div>
            <div style={{ marginBottom: 8 }}>配置版本</div>
            <AutoComplete
              style={{ width: "100%" }}
              placeholder="选择已上传的模型版本，或直接输入新版本号"
              value={versionInput}
              onChange={setVersionInput}
              onSelect={(value) => {
                const picked = upgradeModels.find((m) => modelLabel(m) === value);
                if (picked) setUpgradeModelId(String(picked.id));
              }}
              options={upgradeModels.map((model) => ({
                label: modelLabel(model),
                value: modelLabel(model),
              }))}
              filterOption={(input, option) =>
                (option?.value || "").toLowerCase().includes((input || "").toLowerCase())}
            />
          </div>
          {creatingVersion ? (
            <div>
              <div style={{ marginBottom: 8 }}>模型文件</div>
              <Upload
                maxCount={1}
                name="file"
                accept=".rknn,.onnx"
                action={edgeFileUploadUrl()}
                onChange={onModelFileChange}
              >
                <Button icon={<UploadOutlined />}>{newFile?.name || "上传模型文件"}</Button>
              </Upload>
            </div>
          ) : null}
        </div>
      </Modal>
    </div>
  );
};

function mapStateToProps(state) {
  return {
    actions: state.global.actions,
  };
}

export default connect(mapStateToProps)(EdgeDeviceList);
