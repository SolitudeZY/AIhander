import React, { useEffect, useMemo, useState } from "react";
import { connect } from "react-redux";
import {
  Button,
  DatePicker,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Table,
  Tree,
  Upload,
  message,
} from "antd";
import {
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  FolderOpenOutlined,
  PlusOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import moment from "moment";
import { isAuthorized } from "$utils";
import "../style.less";

const { RangePicker } = DatePicker;

const APP_PERMISSIONS = {
  add: "ADDAPPINSTALLAPPLICATION",
  edit: "EDITAPPINSTALLAPPLICATION",
  remove: "DELETEAPPINSTALLAPPLICATION",
  addPackage: "ADDAPPINSTALLPACKAGE",
  editPackage: "EDITAPPINSTALLPACKAGE",
  removePackage: "DELETEAPPINSTALLPACKAGE",
  download: "DOWNLOADAPPINSTALLPACKAGE",
};

const formatDate = (value) =>
  value ? moment(value).format("YYYY-MM-DD HH:mm:ss") : "-";

const sameApplicationId = (left, right) =>
  String(left) === String(right);

const AppPackageManagement = ({ actions, dispatch, qiniu }) => {
  const [applications, setApplications] = useState([]);
  const [selectedAppId, setSelectedAppId] = useState(null);
  const [packages, setPackages] = useState([]);
  const [total, setTotal] = useState(0);
  const [loadingApps, setLoadingApps] = useState(false);
  const [loadingPackages, setLoadingPackages] = useState(false);
  const [appModalOpen, setAppModalOpen] = useState(false);
  const [packageModalOpen, setPackageModalOpen] = useState(false);
  const [editingApp, setEditingApp] = useState(null);
  const [editingPackage, setEditingPackage] = useState(null);
  const [appForm] = Form.useForm();
  const [packageForm] = Form.useForm();
  const [filters, setFilters] = useState({ version: "", dateRange: [] });
  const [submittedFilters, setSubmittedFilters] = useState({});
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10 });
  const { firmwareUpgrade } = actions || {};

  const selectedApp = useMemo(
    () => applications.find((item) => sameApplicationId(item.id, selectedAppId)),
    [applications, selectedAppId],
  );

  const getErrorMessage = (res, fallback) =>
    res?.payload?.data?.message || res?.message || fallback;

  const loadApplications = async (preferredId) => {
    if (!firmwareUpgrade) return;
    setLoadingApps(true);
    try {
      const res = await dispatch(firmwareUpgrade.getAppInstallApplications());
      if (!res?.success) {
        message.error(getErrorMessage(res, "获取应用列表失败"));
        return;
      }
      const next = Array.isArray(res?.payload?.data) ? res.payload.data : [];
      setApplications(next);
      setSelectedAppId((current) => {
        const desired = preferredId ?? current;
        const selected = next.find((item) => sameApplicationId(item.id, desired));
        // 首次进入或原选中应用已不存在时，默认展示第一条应用的安装包。
        return selected?.id ?? next[0]?.id ?? null;
      });
    } finally {
      setLoadingApps(false);
    }
  };

  const loadPackages = async (
    appId = selectedAppId,
    query = submittedFilters,
    nextPagination = pagination,
  ) => {
    if (!firmwareUpgrade || !appId) {
      setPackages([]);
      setTotal(0);
      return;
    }
    setLoadingPackages(true);
    try {
      const res = await dispatch(
        firmwareUpgrade.getAppInstallPackages({
          appId,
          version: query.version || undefined,
          onlineStart: query.onlineStart || undefined,
          onlineEnd: query.onlineEnd || undefined,
          page: nextPagination.current,
          pageSize: nextPagination.pageSize,
        }),
      );
      if (!res?.success) {
        message.error(getErrorMessage(res, "获取安装包列表失败"));
        return;
      }
      const data = res?.payload?.data || {};
      setPackages(data.rows || []);
      setTotal(Number(data.count) || 0);
    } finally {
      setLoadingPackages(false);
    }
  };

  useEffect(() => {
    loadApplications();
  }, []);

  useEffect(() => {
    setPagination((previous) => ({ ...previous, current: 1 }));
    loadPackages(selectedAppId, submittedFilters, {
      ...pagination,
      current: 1,
    });
  }, [selectedAppId]);

  const openCreateApp = () => {
    setEditingApp(null);
    appForm.resetFields();
    setAppModalOpen(true);
  };

  const openEditApp = (app) => {
    setEditingApp(app);
    appForm.setFieldsValue({ name: app.name });
    setAppModalOpen(true);
  };

  const submitApp = async () => {
    const values = await appForm.validateFields();
    const res = editingApp
      ? await dispatch(
          firmwareUpgrade.updateAppInstallApplication(editingApp.id, values),
        )
      : await dispatch(firmwareUpgrade.createAppInstallApplication(values));
    if (!res?.success) {
      message.error(getErrorMessage(res, editingApp ? "编辑应用失败" : "新增应用失败"));
      return;
    }
    const appId = editingApp ? editingApp.id : res?.payload?.data?.id;
    setAppModalOpen(false);
    await loadApplications(appId);
    message.success(editingApp ? "应用已更新" : "应用新增成功");
  };

  const removeApp = async (app) => {
    const res = await dispatch(firmwareUpgrade.deleteAppInstallApplication(app.id));
    if (!res?.success) {
      message.error(getErrorMessage(res, "删除应用失败"));
      return;
    }
    const nextApps = applications.filter((item) => item.id !== app.id);
    const nextId = app.id === selectedAppId ? nextApps[0]?.id : selectedAppId;
    await loadApplications(nextId);
    message.success("应用已删除");
  };

  const packageFileList = (record) => {
    if (!record?.packageUrl) return [];
    return [
      {
        uid: "-1",
        name: record.packageName,
        status: "done",
        url: getPackageDownloadUrl(record),
        response: { uploaded: record.packageUrl },
      },
    ];
  };

  const getPackageDownloadUrl = (record) => {
    const url = record?.packageUrl || "";
    if (/^https?:\/\//i.test(url)) return url;
    const domain = qiniu?.domain || "";
    if (!domain) return url;
    return `${domain.replace(/\/$/, "")}/${url.replace(/^\//, "")}`;
  };

  const openCreatePackage = () => {
    if (!selectedApp) {
      message.warning("请先新增并选择应用");
      return;
    }
    setEditingPackage(null);
    packageForm.resetFields();
    packageForm.setFieldsValue({ appId: selectedApp.id, files: [] });
    setPackageModalOpen(true);
  };

  const openEditPackage = (record) => {
    setEditingPackage(record);
    packageForm.setFieldsValue({
      appId: record.appId,
      version: record.version,
      description: record.description || "",
      files: packageFileList(record),
    });
    setPackageModalOpen(true);
  };

  const normalizeFileList = (event) =>
    Array.isArray(event) ? event : event?.fileList || [];

  const submitPackage = async () => {
    const values = await packageForm.validateFields();
    const file = (values.files || [])[0];
    const packageUrl = file?.response?.uploaded || editingPackage?.packageUrl;
    const packageName = file?.name || editingPackage?.packageName;
    const payload = {
      appId: values.appId,
      version: values.version?.trim(),
      description: values.description?.trim() || "",
      packageUrl,
      packageName,
    };
    const res = editingPackage
      ? await dispatch(
          firmwareUpgrade.updateAppInstallPackage(editingPackage.id, payload),
        )
      : await dispatch(firmwareUpgrade.createAppInstallPackage(payload));
    if (!res?.success) {
      message.error(
        getErrorMessage(res, editingPackage ? "编辑安装包失败" : "新增安装包失败"),
      );
      return;
    }
    setPackageModalOpen(false);
    const current = { ...pagination, current: editingPackage ? pagination.current : 1 };
    setPagination(current);
    await loadPackages(selectedAppId, submittedFilters, current);
    message.success(editingPackage ? "安装包已更新" : "安装包新增成功");
  };

  const removePackage = async (record) => {
    const res = await dispatch(firmwareUpgrade.deleteAppInstallPackage(record.id));
    if (!res?.success) {
      message.error(getErrorMessage(res, "删除安装包失败"));
      return;
    }
    const current = {
      ...pagination,
      current: packages.length === 1 && pagination.current > 1 ? pagination.current - 1 : pagination.current,
    };
    setPagination(current);
    await loadPackages(selectedAppId, submittedFilters, current);
    message.success("安装包已删除");
  };

  const downloadPackage = (record) => {
    const link = document.createElement("a");
    link.href = getPackageDownloadUrl(record);
    link.download = record.packageName || `${record.version}.apk`;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const search = () => {
    const [start, end] = filters.dateRange || [];
    const query = {
      version: filters.version?.trim() || "",
      onlineStart: start ? start.startOf("day").format() : "",
      onlineEnd: end ? end.endOf("day").format() : "",
    };
    const current = { ...pagination, current: 1 };
    setSubmittedFilters(query);
    setPagination(current);
    loadPackages(selectedAppId, query, current);
  };

  const reset = () => {
    const current = { ...pagination, current: 1 };
    setFilters({ version: "", dateRange: [] });
    setSubmittedFilters({});
    setPagination(current);
    loadPackages(selectedAppId, {}, current);
  };

  const selectApplication = (keys) => {
    const key = keys[0];
    // Ant Design Tree 再次点击已选节点会传回空数组；保留当前选中项。
    if (typeof key === "undefined") return;
    const app = applications.find((item) => sameApplicationId(item.id, key));
    if (app) setSelectedAppId(app.id);
  };

  const treeData = applications.map((app) => ({ key: String(app.id), title: app.name }));
  const columns = [
    {
      title: "序号",
      width: 72,
      align: "center",
      render: (_, __, index) => (pagination.current - 1) * pagination.pageSize + index + 1,
    },
    {
      title: "版本号",
      dataIndex: "version",
      width: 140,
      render: (value) =>
        value ? <span className="app-package-management__version-tag">{value}</span> : "-",
    },
    {
      title: "版本说明",
      dataIndex: "description",
      render: (value) => value || "-",
    },
    {
      title: "上线时间",
      dataIndex: "onlineTime",
      width: 180,
      render: formatDate,
    },
    {
      title: "安装包",
      dataIndex: "packageName",
      width: 230,
      ellipsis: true,
      render: (value) => value || "-",
    },
    {
      title: "操作",
      width: 230,
      align: "center",
      render: (_, record) => (
        <div style={{ display: "flex", justifyContent: "center", gap: 8 }}>
          {isAuthorized(APP_PERMISSIONS.editPackage) && (
            <Button size="small" icon={<EditOutlined />} onClick={() => openEditPackage(record)}>
              编辑
            </Button>
          )}
          {isAuthorized(APP_PERMISSIONS.removePackage) && (
            <Popconfirm title="确定删除该安装包版本？" onConfirm={() => removePackage(record)}>
              <Button size="small" danger icon={<DeleteOutlined />}>删除</Button>
            </Popconfirm>
          )}
          {isAuthorized(APP_PERMISSIONS.download) && (
            <Button size="small" type="primary" icon={<DownloadOutlined />} onClick={() => downloadPackage(record)}>
              下载
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="app-package-management">
      <aside className="app-package-management__tree">
        <div className="app-package-management__tree-header">
          <span>应用管理</span>
          {isAuthorized(APP_PERMISSIONS.add) && (
            <Button type="primary" size="small" icon={<PlusOutlined />} onClick={openCreateApp}>新增应用</Button>
          )}
        </div>
        <Tree
          blockNode
          showIcon
          icon={<FolderOpenOutlined />}
          selectedKeys={selectedAppId ? [String(selectedAppId)] : []}
          treeData={treeData}
          loading={loadingApps}
          onSelect={selectApplication}
          titleRender={(node) => {
            const app = applications.find((item) => String(item.id) === node.key);
            return (
              <div className="app-package-management__tree-node">
                <span title={node.title}>{node.title}</span>
                <span className="app-package-management__tree-actions">
                  {isAuthorized(APP_PERMISSIONS.edit) && <Button type="link" size="small" onClick={(event) => { event.stopPropagation(); openEditApp(app); }}>编辑</Button>}
                  {isAuthorized(APP_PERMISSIONS.remove) && <Popconfirm title="确定删除该应用？" onConfirm={() => removeApp(app)}><Button type="link" danger size="small" onClick={(event) => event.stopPropagation()}>删除</Button></Popconfirm>}
                </span>
              </div>
            );
          }}
        />
        {!loadingApps && !applications.length && <div className="app-package-management__empty">暂无应用，请先新增应用</div>}
      </aside>
      <section className="app-package-management__content">
        <div className="app-package-management__title">{selectedApp ? `${selectedApp.name} 安装包列表` : "安装包列表"}</div>
        <div className="app-package-management__filters">
          <span>版本号：</span>
          <Input className="app-package-management__version-input" allowClear placeholder="请输入版本号" value={filters.version} onChange={(event) => setFilters({ ...filters, version: event.target.value })} onPressEnter={search} />
          <span>上线时间：</span>
          <RangePicker value={filters.dateRange} onChange={(dateRange) => setFilters({ ...filters, dateRange: dateRange || [] })} />
          <Button type="primary" onClick={search} disabled={!selectedApp}>查询</Button>
          <Button onClick={reset}>重置</Button>
          {isAuthorized(APP_PERMISSIONS.addPackage) && <Button type="primary" icon={<PlusOutlined />} onClick={openCreatePackage}>新增安装包</Button>}
        </div>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={packages}
          loading={loadingPackages}
          locale={{ emptyText: selectedApp ? "暂无版本数据" : "请先选择应用" }}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total,
            showSizeChanger: true,
            showTotal: (count, range) => `第 ${range[0]}-${range[1]} 条/共 ${count} 条`,
            onChange: (current, pageSize) => {
              const next = { current, pageSize };
              setPagination(next);
              loadPackages(selectedAppId, submittedFilters, next);
            },
          }}
        />
      </section>

      <Modal title={editingApp ? "编辑应用" : "新增应用"} open={appModalOpen} onCancel={() => setAppModalOpen(false)} onOk={submitApp} destroyOnClose>
        <Form form={appForm} layout="vertical">
          <Form.Item name="name" label="应用名称" rules={[{ required: true, whitespace: true, message: "请输入应用名称" }, { max: 100, message: "应用名称不能超过100个字符" }]}>
            <Input placeholder="请输入应用名称" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal title={editingPackage ? "编辑安装包版本" : "新增安装包版本"} open={packageModalOpen} onCancel={() => setPackageModalOpen(false)} onOk={submitPackage} width={620} destroyOnClose>
        <Form form={packageForm} layout="vertical">
          <Form.Item name="appId" label="应用名称" rules={[{ required: true, message: "请选择应用" }]}>
            <Select disabled={!editingPackage} options={applications.map((app) => ({ label: app.name, value: app.id }))} />
          </Form.Item>
          <Form.Item name="version" label="版本号" rules={[{ required: true, whitespace: true, message: "请输入版本号" }, { max: 100, message: "版本号不能超过100个字符" }]}>
            <Input placeholder="例如 v2.4.1" />
          </Form.Item>
          <Form.Item name="files" label="安装包上传" valuePropName="fileList" getValueFromEvent={normalizeFileList} rules={[{ required: true, message: "请上传 APK 安装包" }]}>
            <Upload
              maxCount={1}
              // 安装包文件由本项目的附件服务接收，避免直传 API_POMS_URL。
              action="/_upload/attachments"
              accept=".apk,application/vnd.android.package-archive"
              beforeUpload={(file) => {
                const valid = /\.apk$/i.test(file.name);
                if (!valid) message.error("仅支持 .apk 格式文件");
                return valid || Upload.LIST_IGNORE;
              }}
              onChange={(info) => {
                if (info.file.status === "error") {
                  message.error(
                    info.file.response?.error ||
                      info.file.response?.message ||
                      "APK 上传失败，请重试",
                  );
                }
              }}
            >
              <Button icon={<UploadOutlined />}>选择 APK 文件</Button>
            </Upload>
          </Form.Item>
          <Form.Item name="description" label="版本说明">
            <Input.TextArea rows={4} maxLength={1000} showCount placeholder="请输入版本说明" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

function mapStateToProps(state) {
  const { global } = state;
  return {
    actions: global.actions,
    qiniu: global.qiniu,
  };
}

export default connect(mapStateToProps)(AppPackageManagement);
