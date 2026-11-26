import React, { useEffect, useState, useMemo } from "react";
import { connect } from "react-redux";
import { Spin, Popconfirm, Input, Tag, Button, App, Popover } from "antd";
import ProTable from "@ant-design/pro-table";
import ProCard from "@ant-design/pro-card";
import { LayoutContent } from "@peace/components";
import { Func, isAuthorized } from "$utils";
import { createSystemLog } from "../actions/log";
import ProjectModal from "../components/projectModal";
import {
  getProjects,
  createProject,
  modifyProject,
  deleteProject,
  bindProjectDevices,
  unbindProjectDevice,
  getAllProductLibrary,
} from "../actions/project";

function Project(props) {
  const { dispatch, loading, user } = props;
  const { message } = App.useApp();
  const [projects, setProjects] = useState([]);
  const [search, setSearch] = useState("");
  const [deviceSearch, setDeviceSearch] = useState("");
  const pageStyle = Func.getPaginationStyle();
  const [productLibraryAll, setProductLibraryAll] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(pageStyle?.pageSize || 10);
  const [total, setTotal] = useState(0);

  const buildFilters = () => {
    const s = String(deviceSearch || "").trim();
    const focus = !s
      ? {}
      : s.startsWith("[") || s.includes(",")
      ? { focusDeviceIds: s }
      : { focusDeviceId: s };
    return {
      keyword: search || "",
      ...focus,
    };
  };

  const fetchProjects = async (params = {}, p = page, ps = pageSize) => {
    try {
      const normalized =
        typeof params === "string" ? { keyword: params } : params || {};
      const res = await dispatch(
        getProjects({
          ...normalized,
          page: p,
          pageSize: ps,
        })
      );
      const list = res?.payload?.data?.rows || [];
      const cnt = res?.payload?.data?.count || 0;
      setProjects(Array.isArray(list) ? list : []);
      setTotal(Number.isFinite(cnt) ? cnt : 0);
    } catch (e) {
      message.error("获取项目列表失败");
    }
  };

  useEffect(() => {
    setPage(1);
    fetchProjects({}, 1, pageSize);
  }, []);

  useEffect(() => {
    dispatch(getAllProductLibrary()).then((res) => {
      if (res?.success) setProductLibraryAll(res?.payload?.data || []);
    });
  }, [dispatch]);

  const columns = useMemo(
    () => [
      {
        title: "项目名称",
        dataIndex: "name",
        ellipsis: true,
      },
      {
        title: "所在地区",
        dataIndex: "locationName",
        ellipsis: true,
      },
      {
        title: "关联设备",
        dataIndex: "focusDeviceCodes",
        render: (codes) => {
          const extractIds = () => {
            try {
              if (!codes) return [];
              if (typeof codes === "string") {
                const trimmed = codes.trim();
                if (trimmed.startsWith("[")) {
                  const parsed = JSON.parse(trimmed);
                  if (Array.isArray(parsed)) {
                    if (parsed.every((it) => typeof it === "string")) {
                      return parsed
                        .filter(Boolean)
                        .map((s) => `${s}`.trim())
                        .filter(Boolean);
                    }
                    return parsed
                      .map((it) => {
                        const prefix = it?.productCode
                          ? `${it.productCode}`
                          : "";
                        const list = Array.isArray(it?.deviceIds)
                          ? it.deviceIds
                          : `${it?.deviceIds || ""}`
                              .split(",")
                              .map((s) => s.trim());
                        return list
                          .filter(Boolean)
                          .map((id) => `${prefix}${id}`);
                      })
                      .flat()
                      .filter((s) => s);
                  }
                }
                return trimmed
                  .split(",")
                  .map((s) => s.trim())
                  .filter((s) => s);
              }
              if (Array.isArray(codes)) {
                if (codes.every((it) => typeof it === "string")) {
                  return codes
                    .filter(Boolean)
                    .map((s) => `${s}`.trim())
                    .filter(Boolean);
                }
                return codes
                  .map((it) => {
                    const prefix = it?.productCode ? `${it.productCode}` : "";
                    const list = Array.isArray(it?.deviceIds)
                      ? it.deviceIds
                      : `${it?.deviceIds || ""}`
                          .split(",")
                          .map((s) => s.trim());
                    return list.filter(Boolean).map((id) => `${prefix}${id}`);
                  })
                  .flat()
                  .filter((s) => s);
              }
              return [];
            } catch (_) {
              return [];
            }
          };
          const ids = extractIds();
          if (!ids.length) return <span>-</span>;
          const max = 4;
          const show = ids.slice(0, max);
          const overflow = ids.slice(max);
          return (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {show.map((c) => (
                <Tag key={c}>{c}</Tag>
              ))}
              {overflow.length > 0 && (
                <Popover
                  placement="top"
                  content={
                    <div
                      style={{
                        maxWidth: 280,
                        maxHeight: 240,
                        overflow: "auto",
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 4,
                      }}
                    >
                      {overflow.map((c) => (
                        <Tag key={`pop-${c}`}>{c}</Tag>
                      ))}
                    </div>
                  }
                >
                  <a style={{ marginLeft: 4 }}>更多({overflow.length})</a>
                </Popover>
              )}
            </div>
          );
        },
      },
      {
        title: "项目描述",
        dataIndex: "description",
        ellipsis: true,
        render: (text) => text || "--",
      },
      {
        title: "操作",
        key: "option",
        valueType: "option",
        render: (text, record) => [
          isAuthorized("EDITPROJECT") && (
            <ProjectModal
              key="edit"
              title="编辑项目"
              editData={record}
              triggerRender={<a>编辑</a>}
              dispatch={dispatch}
              productLibraryAll={productLibraryAll}
              onFinish={async (values) => {
                const payload = {
                  ...values,
                  focusDeviceCodes: JSON.stringify(values.devices || []),
                };
                delete payload.devices;
                const modRes = await dispatch(
                  modifyProject(record.id, payload)
                );
                const modOk = modRes?.success === true;
                if (!modOk) return false;

                // 解析 devices，提取带前缀的设备编码数组用于绑定
                const toFlatDeviceCodes = () => {
                  try {
                    const arr = values?.devices || [];
                    if (!Array.isArray(arr)) return [];
                    return arr
                      .map((it) => {
                        const prefix = it?.productCode
                          ? `${it.productCode}`
                          : "";
                        const list = Array.isArray(it?.deviceIds)
                          ? it.deviceIds
                          : `${it?.deviceIds || ""}`
                              .split(",")
                              .map((s) => s.trim());
                        return list
                          .filter(Boolean)
                          .map((id) => `${prefix}${id}`.trim())
                          .filter(Boolean);
                      })
                      .flat();
                  } catch (_) {
                    return [];
                  }
                };
                const deviceCodes = toFlatDeviceCodes();

                // 解析旧的 focusDeviceCodes，得到当前已绑定的设备编码列表（带前缀）
                const parseOldDeviceCodes = () => {
                  try {
                    const raw = record?.focusDeviceCodes;
                    if (!raw) return [];
                    if (typeof raw === "string") {
                      const trimmed = raw.trim();
                      if (trimmed.startsWith("[")) {
                        const arr = JSON.parse(trimmed);
                        if (Array.isArray(arr)) {
                          if (arr.every((it) => typeof it === "string")) {
                            return arr
                              .filter(Boolean)
                              .map((s) => `${s}`.trim())
                              .filter(Boolean);
                          }
                          return arr
                            .map((it) => {
                              const prefix = it?.productCode
                                ? `${it.productCode}`
                                : "";
                              const list = Array.isArray(it?.deviceIds)
                                ? it.deviceIds
                                : `${it?.deviceIds || ""}`
                                    .split(",")
                                    .map((s) => s.trim());
                              return list
                                .filter(Boolean)
                                .map((id) => `${prefix}${id}`.trim())
                                .filter(Boolean);
                            })
                            .flat();
                        }
                      }
                      return trimmed
                        .split(",")
                        .map((s) => s.trim())
                        .filter((s) => s);
                    }
                    if (Array.isArray(raw)) {
                      if (raw.every((it) => typeof it === "string")) {
                        return raw
                          .filter(Boolean)
                          .map((s) => `${s}`.trim())
                          .filter(Boolean);
                      }
                      return raw
                        .map((it) => {
                          const prefix = it?.productCode
                            ? `${it.productCode}`
                            : "";
                          const list = Array.isArray(it?.deviceIds)
                            ? it.deviceIds
                            : `${it?.deviceIds || ""}`
                                .split(",")
                                .map((s) => s.trim());
                          return list
                            .filter(Boolean)
                            .map((id) => `${prefix}${id}`.trim())
                            .filter(Boolean);
                        })
                        .flat();
                    }
                    return [];
                  } catch (_) {
                    return [];
                  }
                };
                const oldCodes = parseOldDeviceCodes();

                // 需要解绑/绑定的设备：集合差
                const newSet = new Set(deviceCodes);
                const toUnbind = oldCodes.filter((c) => !newSet.has(c));
                const oldSet = new Set(oldCodes);
                const toBind = deviceCodes.filter((c) => !oldSet.has(c));
                if (record?.id && toUnbind.length > 0) {
                  for (const code of toUnbind) {
                    await dispatch(unbindProjectDevice(record.id, code));
                  }
                }
                if (record?.id && toBind.length > 0) {
                  const bindRes = await dispatch(
                    bindProjectDevices({
                      projectId: record.id,
                      deviceCodes: toBind,
                    })
                  );
                  if (bindRes?.success === false) {
                    message.error("绑定设备失败：部分设备已绑定其他项目");
                  }
                }

                await dispatch(
                  createSystemLog({
                    content: `编辑项目：${values?.name || record?.name || "-"}`,
                    module: "项目管理",
                    url: window.location.pathname,
                    userId: user?.id || null,
                  })
                );

                await fetchProjects(buildFilters(), page, pageSize);
              }}
            />
          ),
          isAuthorized("DELETEPROJECT") && (
            <Popconfirm
              key="del"
              title={
                <span>
                  删除此项目后，与项目对应的设备也会在设备列表删除，是否确认删除？
                </span>
              }
              onConfirm={async () => {
                await dispatch(deleteProject(record.id));
                await dispatch(
                  createSystemLog({
                    content: `删除项目：${record?.name || "-"}（ID：${
                      record?.id
                    }）`,
                    module: "项目管理",
                    url: window.location.pathname,
                    userId: user?.id || null,
                  })
                );
                await fetchProjects(buildFilters(), page, pageSize);
              }}
            >
              <a>删除</a>
            </Popconfirm>
          ),
          // isAuthorized("EXPORTPROJECT") && (
          <a
            key="import"
            type="primary"
            disabled
            onClick={() => message.warning("功能开发中...")}
          >
            导入设备
          </a>,
          // ),
        ],
      },
    ],
    [dispatch, search, deviceSearch, page, pageSize]
  );

  return (
    <LayoutContent style={{ padding: 12 }}>
      <ProCard ghost>
        <ProTable
          rowKey="id"
          loading={loading}
          pagination={pageStyle}
          search={false}
          options={false}
          headerTitle={
            <div style={{ display: "flex", gap: 12 }}>
              <Input.Search
                placeholder="按项目名称搜索"
                allowClear
                onChange={(e) => {
                  const val = e?.target?.value ?? "";
                  setSearch(val);
                  const other = String(deviceSearch || "").trim();
                  if (!val.trim() && !other) {
                    setPage(1);
                    fetchProjects({}, 1, pageSize);
                  }
                }}
                onSearch={(val) => {
                  setSearch(val || "");
                  const s = String(deviceSearch || "").trim();
                  const focus = !s
                    ? {}
                    : s.startsWith("[") || s.includes(",")
                    ? { focusDeviceIds: s }
                    : { focusDeviceId: s };
                  setPage(1);
                  fetchProjects(
                    {
                      keyword: val || "",
                      ...focus,
                    },
                    1,
                    pageSize
                  );
                }}
                style={{ width: 260 }}
              />
              <Input.Search
                placeholder="按关联设备ID搜索，只要后八位"
                allowClear
                onChange={(e) => {
                  const val = e?.target?.value ?? "";
                  const v = String(val || "").trim();
                  setDeviceSearch(v);
                  const other = String(search || "").trim();
                  if (!v && !other) {
                    setPage(1);
                    fetchProjects({}, 1, pageSize);
                  }
                }}
                onSearch={(val) => {
                  const v = String(val || "").trim();
                  setDeviceSearch(v);
                  const focus = !v
                    ? {}
                    : v.startsWith("[") || v.includes(",")
                    ? { focusDeviceIds: v }
                    : { focusDeviceId: v };
                  setPage(1);
                  fetchProjects(
                    {
                      keyword: search || "",
                      ...focus,
                    },
                    1,
                    pageSize
                  );
                }}
                style={{ width: 300 }}
              />
              {isAuthorized("ADDPROJECT") && (
                <ProjectModal
                  title="新增项目"
                  triggerRender={<Button type="primary">新增项目</Button>}
                  dispatch={dispatch}
                  productLibraryAll={productLibraryAll}
                  onFinish={async (values) => {
                    values.focusDeviceCodes = JSON.stringify(values.devices);
                    delete values.devices;
                    try {
                      const createdRes = await dispatch(createProject(values));
                      const ok = createdRes?.success === true;
                      if (!ok) return false;
                      const createdId = createdRes?.payload?.data?.id;
                      if (!createdId) {
                        message.error("新增项目失败");
                        return false;
                      }
                      const toFlatDeviceCodes = () => {
                        try {
                          const raw = values?.focusDeviceCodes;
                          const arr =
                            typeof raw === "string" ? JSON.parse(raw) : raw;
                          if (!Array.isArray(arr)) return [];
                          if (arr.every((it) => typeof it === "string")) {
                            return arr
                              .filter(Boolean)
                              .map((s) => `${s}`.trim())
                              .filter(Boolean);
                          }
                          return arr
                            .map((it) => {
                              const prefix = it?.productCode
                                ? `${it.productCode}`
                                : "";
                              const list = Array.isArray(it?.deviceIds)
                                ? it.deviceIds
                                : `${it?.deviceIds || ""}`
                                    .split(",")
                                    .map((s) => s.trim());
                              return list
                                .filter(Boolean)
                                .map((id) => `${prefix}${id}`.trim())
                                .filter(Boolean);
                            })
                            .flat();
                        } catch (_) {
                          return [];
                        }
                      };
                      const deviceCodes = toFlatDeviceCodes();
                      if (createdId && deviceCodes.length > 0) {
                        const bindRes = await dispatch(
                          bindProjectDevices({
                            projectId: createdId,
                            deviceCodes,
                          })
                        );
                        if (bindRes?.success === false) {
                          message.error("绑定设备失败：部分设备已绑定其他项目");
                        }
                      }
                      await dispatch(
                        createSystemLog({
                          content: `新增项目：${values?.name || "-"}（ID：${
                            createdId || ""
                          }）`,
                          module: "项目管理",
                          url: window.location.pathname,
                          userId: user?.id || null,
                        })
                      );
                      await fetchProjects(buildFilters(), page, pageSize);
                      return true;
                    } catch (e) {
                      // message.error("新增项目失败");
                      return false;
                    }
                  }}
                />
              )}
            </div>
          }
          columns={columns}
          dataSource={projects}
          pagination={{
            ...pageStyle,
            current: page,
            pageSize,
            total,
          }}
          onChange={(p) => {
            const current = p?.current || 1;
            const size = p?.pageSize || pageSize;
            setPage(current);
            setPageSize(size);
            fetchProjects(buildFilters(), current, size);
          }}
        />
      </ProCard>
    </LayoutContent>
  );
}

function mapStateToProps(state) {
  const { projects, auth } = state || {};
  return { loading: projects.isRequesting, user: auth?.user?.userInfo };
}

export default connect(mapStateToProps)(Project);
