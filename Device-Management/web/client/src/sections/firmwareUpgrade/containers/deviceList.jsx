import React, { useEffect, useState, useRef, useCallback } from "react";
import { connect } from "react-redux";
import { push } from "react-router-redux";
import {
  Button,
  Table,
  Popconfirm,
  Select,
  Input,
  message,
  Space,
  Dropdown,
  Tag,
  Empty,
} from "antd";
import IssueInstructionsModal from "../components/issueInstructionsModal";
import RemoteUpgradedModal from "../components/remoteUpgradedModal";
import {
  DoubleRightOutlined,
  SortAscendingOutlined,
  SortDescendingOutlined,
} from "@ant-design/icons";
import { isAuthorized } from "$utils";
import moment from "moment";
import ProjectModal from "../../system/components/projectModal";
import {
  addExternalUserDevices,
  removeExternalUserDevices,
} from "../actions/device-manage-platform";
import { createSystemLog } from "../../system/actions/log";

const externalBindingKey = (productCode, deviceCode) =>
  `${String(productCode || "").trim()}::${String(deviceCode || "").trim()}`;

const externalFullDeviceCode = (productCode, deviceCode) =>
  `${String(productCode || "").trim()}${String(deviceCode || "").trim()}`;

const DeviceList = (props) => {
  const { actions, dispatch, devicesList, loading, user } = props;
  const { firmwareUpgrade } = actions;
  const isMountedRef = useRef(true);
  const lastFilterSignatureRef = useRef("");
  const queryParamsRef = useRef({});
  const sortDirRef = useRef("ASC");
  const sortRequestedRef = useRef(false);
  const hasInitializedRef = useRef(false);
  const restoreSearchRef = useRef(null);
  const currentPageRef = useRef(1);
  const pageSizeRef = useRef(10);

  const [queryParams, setQueryParams] = useState({});
  const [currentPage, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [selectedRowRecordByKey, setSelectedRowRecordByKey] = useState({});
  const [issueVisible, setIssueVisible] = useState(false);
  const [upgradeVisible, setUpgradeVisible] = useState(false);
  const [curDevices, setCurDevices] = useState([]);
  const [showTCPConfig, setShowTCPConfig] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [sortDir, setSortDir] = useState("ASC");
  const [sortRequested, setSortRequested] = useState(false);
  const selectedRows = selectedRowKeys
    .map((key) => selectedRowRecordByKey[String(key)])
    .filter(Boolean);
  useEffect(() => {
    queryParamsRef.current = queryParams || {};
  }, [queryParams]);

  useEffect(() => {
    sortDirRef.current = sortDir;
  }, [sortDir]);

  useEffect(() => {
    sortRequestedRef.current = sortRequested;
  }, [sortRequested]);

  useEffect(() => {
    currentPageRef.current = currentPage;
  }, [currentPage]);

  useEffect(() => {
    pageSizeRef.current = pageSize;
  }, [pageSize]);

  useEffect(() => {
    const searchObj = localStorage.getItem("searchObj");
    if (searchObj) {
      try {
        restoreSearchRef.current = JSON.parse(searchObj);
      } catch (_) {
        restoreSearchRef.current = null;
      }
    }

    const restoredSortRequested =
      typeof restoreSearchRef.current?.sortRequested === "boolean"
        ? restoreSearchRef.current.sortRequested
        : false;
    const restoredSortDir = restoreSearchRef.current?.sortDir || "ASC";
    const restoredPage = Number(restoreSearchRef.current?.page) || 1;
    const restoredPageSize = Number(restoreSearchRef.current?.pageSize) || 10;
    const restoredQueryParams = restoreSearchRef.current
      ? {
          projectId: restoreSearchRef.current.projectId,
          name: restoreSearchRef.current.name,
          deviceCode: restoreSearchRef.current.deviceCode,
          deviceModel: restoreSearchRef.current.deviceModel,
          tags: restoreSearchRef.current.tags,
        }
      : {};

    queryParamsRef.current = restoredQueryParams;
    currentPageRef.current = restoredPage;
    pageSizeRef.current = restoredPageSize;
    sortRequestedRef.current = restoredSortRequested;
    sortDirRef.current = restoredSortDir;

    if (restoreSearchRef.current) {
      setQueryParams(restoredQueryParams);
      setPage(restoredPage);
      setPageSize(restoredPageSize);
      setSortRequested(restoredSortRequested);
      setSortDir(restoredSortDir);
    }

    if (restoreSearchRef.current) {
      localStorage.removeItem("searchObj");
    }

    fetchData(restoredPage, restoredPageSize, restoredSortDir, {
      forceQueryParams: restoredQueryParams,
      forceSortRequested: restoredSortRequested,
      keepSearchCache: false,
      useRestoreSearch: false,
    });
    hasInitializedRef.current = true;

    return () => {
      isMountedRef.current = false;
    };
  }, [fetchData]);

  useEffect(() => {
    if (
      hasInitializedRef.current &&
      devicesList?.canSort &&
      !sortRequestedRef.current
    ) {
      setSortRequested(true);
      sortRequestedRef.current = true;
      fetchData(currentPageRef.current, pageSizeRef.current, sortDirRef.current, {
        forceQueryParams: queryParamsRef.current,
        forceSortRequested: true,
        useRestoreSearch: false,
      });
    }
  }, [devicesList?.canSort, fetchData]);
  const isExternalRegistered = (() => {
    try {
      const fromState = user?.userInfo?.userType;
      const fromSession = JSON.parse(sessionStorage.getItem("user"))?.userInfo
        ?.userType;
      const t = fromState ?? fromSession;
      if (t === undefined || t === null) return false;
      const v = String(t).toLowerCase();
      return v === "external";
    } catch (_) {
      return false;
    }
  })();
  const currentUsername = user?.userInfo?.username || "";

  const getFilterSignature = (params = {}) => {
    const filterKeys = ["projectId", "name", "deviceCode", "deviceModel", "tags"];
    const normalized = {};
    for (const k of filterKeys) {
      const v = params?.[k];
      normalized[k] =
        v === undefined || v === null ? "" : String(v).trim();
    }
    return JSON.stringify(normalized);
  };

  const fetchData = useCallback((
    currentPage = 1,
    currentPageSize = pageSize,
    sortOverrideDir,
    options = {}
  ) => {
    const {
      forceQueryParams,
      forceSortRequested,
      keepSearchCache = false,
      useRestoreSearch = true,
    } = options;
    let searchObj = useRestoreSearch ? localStorage.getItem("searchObj") : null;
    let query = null;
    if (searchObj) {
      let d = JSON.parse(searchObj);
      const savedPage = Number(d.page) || 1;
      const savedSize = Number(d.pageSize) || currentPageSize;
      const nextQueryParams = {
        projectId: d.projectId,
        name: d.name,
        deviceCode: d.deviceCode,
        deviceModel: d.deviceModel,
        tags: d.tags,
      };
      const nextSortRequested =
        typeof d.sortRequested === "boolean"
          ? d.sortRequested
          : sortRequestedRef.current;
      const nextSortDir = d.sortDir || sortDirRef.current;
      query = {
        ...nextQueryParams,
        page: savedPage,
        pageSize: savedSize,
        roles: JSON.stringify(user?.userInfo?.roles),
      };
      if (nextSortRequested) {
        query.sortField = "deviceCode";
        query.sortDir = sortOverrideDir || nextSortDir;
      }
      if (isMountedRef.current) {
        setQueryParams(nextQueryParams);
        setPage(savedPage);
        setPageSize(savedSize);
        setSortRequested(nextSortRequested);
        setSortDir(sortOverrideDir || nextSortDir);
      }
      queryParamsRef.current = nextQueryParams;
      currentPageRef.current = savedPage;
      pageSizeRef.current = savedSize;
      sortRequestedRef.current = nextSortRequested;
      sortDirRef.current = sortOverrideDir || nextSortDir;
      if (!keepSearchCache) {
        localStorage.removeItem("searchObj");
        restoreSearchRef.current = null;
      }
    } else {
      const nextQueryParams = forceQueryParams || queryParamsRef.current || {};
      const nextSortRequested =
        typeof forceSortRequested === "boolean"
          ? forceSortRequested
          : sortRequestedRef.current;
      const nextSortDir = sortOverrideDir || sortDirRef.current;
      query = {
        roles: JSON.stringify(user?.userInfo?.roles),
        pageSize: currentPageSize,
        page: currentPage,
        ...nextQueryParams,
      };
      if (nextSortRequested) {
        query.sortField = "deviceCode";
        query.sortDir = nextSortDir;
      }
      if (isMountedRef.current) {
        setPage(Number(currentPage) || 1);
      }
      currentPageRef.current = Number(currentPage) || 1;
      pageSizeRef.current = currentPageSize;
    }

    if (isMountedRef.current) {
      const nextSignature = getFilterSignature(query);
      if (nextSignature !== lastFilterSignatureRef.current) {
        setSelectedRowKeys([]);
        setSelectedRowRecordByKey({});
        lastFilterSignatureRef.current = nextSignature;
      }
      dispatch(firmwareUpgrade.getDevicesList(query));
    }
  }, [dispatch, firmwareUpgrade, pageSize, user?.userInfo?.roles]);

  const handlePageChange = (page, size) => {
    if (size && size !== pageSize) {
      setPageSize(size);
      fetchData(1, size);
    } else {
      fetchData(Number(page) || 1, size || pageSize);
    }
  };

  const handleJump = (record) => {
    dispatch(
      push(
        `/device/firmwareUpgrade/deviceDetail?deviceCode=${record.deviceCode}`
      )
    );
    sessionStorage.setItem("deviceDetail", JSON.stringify(record));
  };

  const bulkIssue = () => {
    if (!selectedRowKeys.length) {
      message.info("请选择设备");
      return;
    }
    const productCodeSet = new Set(
      selectedRows.map((d) => d?.productCode).filter(Boolean)
    );
    if (productCodeSet.size === 0) {
      message.warning("设备信息未加载，请重新勾选后再批量操作");
      return;
    }
    if (productCodeSet.size > 1) {
      message.info("请选择相同产品的设备");
      return;
    }
    const productCode = Array.from(productCodeSet)[0];
    const devicesForBatch = selectedRowKeys.map((k) => ({
      ...(selectedRowRecordByKey[String(k)] || {}),
      deviceCode: k,
      productCode,
    }));
    if (isMountedRef.current) {
      setCurDevices(devicesForBatch);
      setShowTCPConfig(true);
      setIssueVisible(true);
    }
  };
  const bulkOta = () => {
    if (!selectedRowKeys.length) {
      message.info("请选择设备");
      return;
    }
    const productCodeSet = new Set(
      selectedRows.map((d) => d?.productCode).filter(Boolean)
    );
    if (productCodeSet.size === 0) {
      message.warning("设备信息未加载，请重新勾选后再批量操作");
      return;
    }
    if (productCodeSet.size > 1) {
      message.info("请选择相同产品的设备");
      return;
    }
    const productCode = Array.from(productCodeSet)[0];
    const devicesForBatch = selectedRowKeys.map((k) => ({
      ...(selectedRowRecordByKey[String(k)] || {}),
      deviceCode: k,
      productCode,
    }));
    if (isMountedRef.current) {
      setCurDevices(devicesForBatch);
      setUpgradeVisible(true);
    }
  };

  const handleIssueClick = (record) => {
    if (isMountedRef.current) {
      setCurDevices([record]);
      setShowTCPConfig(false);
      setIssueVisible(true);
    }
  };
  const handleIssueClose = () => {
    if (isMountedRef.current) {
      setCurDevices([]);
      setIssueVisible(false);
    }
  };

  const handleUpgradeClick = (record) => {
    if (isMountedRef.current) {
      setCurDevices([record]);
      setUpgradeVisible(true);
    }
  };
  const handleUpgradeClose = () => {
    if (isMountedRef.current) {
      setCurDevices([]);
      setUpgradeVisible(false);
    }
  };

  const columns = [
    {
      title: "项目名称",
      dataIndex: "projectName",
      render: (_, record) => record.projects?.[0]?.name || "-",
    },
    {
      title: "设备名称",
      dataIndex: "name",
      render: (_, record) => record?.productLibrary?.name,
    },
    {
      title: (
        <span>
          设备ID
          {devicesList?.canSort && (
            <span
              style={{
                marginLeft: 8,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
              }}
              title={sortDir === "ASC" ? "升序" : "降序"}
              onClick={() => {
                const nextDir = sortDir === "ASC" ? "DESC" : "ASC";
                setSortRequested(true);
                setSortDir(nextDir);
                fetchData(currentPage, pageSize, nextDir);
              }}
            >
              {sortDir === "ASC" ? (
                <SortDescendingOutlined style={{ color: "#005ABD" }} />
              ) : (
                <SortAscendingOutlined style={{ color: "#005ABD" }} />
              )}
            </span>
          )}
        </span>
      ),
      dataIndex: "deviceCode",
    },
    {
      title: "设备型号",
      dataIndex: "deviceModel",
      render: (_, record) => record?.productLibrary?.model,
    },
    {
      title: "接入协议",
      dataIndex: "protocol",
    },
    {
      title: "通讯方式",
      dataIndex: "commMode",
    },
    {
      title: "标签",
      dataIndex: "tags",
      render: (text) => (
        <>
          {text?.split(",").map((tag, index) => (
            <Tag key={index} color="blue">
              {tag}
            </Tag>
          ))}
        </>
      ),
    },
    {
      title: "状态",
      dataIndex: "status",
      render: (_, record) => {
        let color = "red";
        if (record?.status === "在线") color = "green";
        else if (record?.status === "异常") color = "orange";
        return <span style={{ color }}>{record?.status}</span>;
      },
    },
    {
      title: "操作",
      dataIndex: "action",
      render: (text, record) => {
        // 根据权限动态生成菜单项
        const menuItems = [];

        if (isAuthorized("ISSUETHECOMMAND")) {
          menuItems.push({
            key: "issue",
            label: "下发指令",
            onClick: () => handleIssueClick(record),
          });
        }

        if (isAuthorized("REMOTEUPGRADE")) {
          menuItems.push({
            key: "upgrade",
            label: "远程升级",
            onClick: () => handleUpgradeClick(record),
          });
        }

        return (
          <Space>
            {isAuthorized("DEVICELISTVIEWDETAILS") && (
              <Button
                color="primary"
                variant="outlined"
                onClick={() => {
                  handleJump(record);
                  //将查询条件放在缓存中
                  let searchObj = {
                    ...queryParamsRef.current,
                    pageSize: pageSize,
                    page: currentPage,
                    sortDir: sortDirRef.current,
                    sortRequested: sortRequestedRef.current,
                  };
                  localStorage.setItem("searchObj", JSON.stringify(searchObj));
                }}
              >
                查看详情
              </Button>
            )}
            {menuItems.length > 0 && (
              <Dropdown
                menu={{
                  items: menuItems,
                }}
              >
                <Button color="cyan" variant="outlined">
                  操作
                </Button>
              </Dropdown>
            )}
          </Space>
        );
      },
    },
  ];
  const rowSelection = {
    preserveSelectedRowKeys: true,
    selectedRowKeys,
    getCheckboxProps: (record) => {
      let returnData = {};
      if (selectedRows.length) {
        returnData.disabled =
          selectedRows[0].productCode !== record.productCode;
      }
      return returnData;
    },
    onChange: (nextSelectedRowKeys, nextSelectedRows) => {
      if (!isMountedRef.current) return;
      const safeKeys = Array.isArray(nextSelectedRowKeys)
        ? nextSelectedRowKeys
        : [];
      const safeRows = Array.isArray(nextSelectedRows)
        ? nextSelectedRows.filter(Boolean)
        : [];
      setSelectedRowKeys(safeKeys);
      setSelectedRowRecordByKey((prev) => {
        const next = { ...prev };
        const keySet = new Set(safeKeys.map((k) => String(k)));
        for (const k of Object.keys(next)) {
          if (!keySet.has(k)) delete next[k];
        }
        for (const row of safeRows) {
          if (row?.deviceCode !== undefined && row?.deviceCode !== null) {
            next[String(row.deviceCode)] = row;
          }
        }
        for (const k of keySet) {
          if (!next[k]) {
            next[k] = { deviceCode: k };
          }
        }
        return next;
      });
    },
  };
  return (
    <div
      style={{
        background: "#FFFFFF",
        margin: "8px 12px",
        padding: "10px 20px 0",
        height: "calc(100vh - 80px)",
        overflow: "auto",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ display: "flex" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginRight: 30,
            height: 37,
          }}
        >
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
            设备列表
          </div>
          <div
            style={{
              marginLeft: 6,
              fontSize: 12,
              color: "#969799",
              fontFamily: "DINExp",
            }}
          >
            Device List
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <Space>
              项目名称:
              <Select
                placeholder="选择项目名称"
                value={queryParams.projectId}
                onChange={(v) => {
                  if (isMountedRef.current) {
                    setQueryParams({ ...queryParams, projectId: v });
                  }
                }}
                allowClear
                style={{ width: 180 }}
                showSearch
                optionFilterProp="children"
                getPopupContainer={(trigger) => trigger.parentNode}
              >
                {user?.userInfo?.projects.reduce((arr, item) => {
                  arr.push(
                    <Select.Option key={item.id} value={item.id}>
                      {item.name}
                    </Select.Option>
                  );
                  return arr;
                }, [])}
              </Select>
              设备名称:
              <Input
                placeholder="输入设备名称进行搜索"
                value={queryParams.name}
                onChange={(e) => {
                  if (isMountedRef.current) {
                    const nextQueryParams = {
                      ...queryParams,
                      name: e.target.value,
                    };
                    queryParamsRef.current = nextQueryParams;
                    setQueryParams(nextQueryParams);
                  }
                }}
                allowClear
                style={{ width: 180 }}
              />
              设备ID:
              <Input
                placeholder="输入设备ID进行搜索"
                value={queryParams.deviceCode}
                onChange={(e) => {
                  if (isMountedRef.current) {
                    const nextQueryParams = {
                      ...queryParams,
                      deviceCode: e.target.value,
                    };
                    queryParamsRef.current = nextQueryParams;
                    setQueryParams(nextQueryParams);
                  }
                }}
                allowClear
                style={{ width: 180 }}
              />
              设备型号:
              <Input
                placeholder="输入设备型号进行搜索"
                value={queryParams.deviceModel}
                onChange={(e) => {
                  if (isMountedRef.current) {
                    const nextQueryParams = {
                      ...queryParams,
                      deviceModel: e.target.value,
                    };
                    queryParamsRef.current = nextQueryParams;
                    setQueryParams(nextQueryParams);
                  }
                }}
                allowClear
                style={{ width: 180 }}
              />
              <Button type="primary" onClick={() => fetchData()}>
                查询
              </Button>
              {isExternalRegistered && (
                <ProjectModal
                  title="添加设备"
                  triggerRender={
                    <Button type="primary" style={{ width: 80 }} ghost>
                      添加设备
                    </Button>
                  }
                  dispatch={dispatch}
                  simpleDevicesOnly
                  nameRequired={false}
                  onFinish={async (values) => {
                    const list = Array.isArray(values?.devices)
                      ? values.devices
                      : [];
                    const payload = list
                      .map((d) => ({
                        model: (d?.model || "").trim(),
                        productCode: (d?.productCode || "").trim(),
                        deviceIds: Array.isArray(d?.deviceIds)
                          ? d.deviceIds
                              .map((s) => `${s}`.trim())
                              .filter(Boolean)
                          : `${d?.deviceIds || ""}`
                              .split(",")
                              .map((s) => s.trim())
                              .filter(Boolean),
                      }))
                      .filter(
                        (item) =>
                          item.model &&
                          item.productCode &&
                          item.deviceIds.length > 0
                      );

                    if (payload.length === 0) {
                      message.warning("请填写设备型号与设备ID");
                      return false;
                    }

                    const res = await dispatch(addExternalUserDevices(payload));
                    const data = res?.payload?.data;
                    const duplicated = Array.isArray(data?.duplicated)
                      ? data.duplicated
                      : [];
                    const duplicatedDetails = Array.isArray(
                      data?.duplicatedDetails
                    )
                      ? data.duplicatedDetails
                      : [];
                    const inputBindings = payload.flatMap((item) =>
                      item.deviceIds.map((deviceCode) => ({
                        productCode: item.productCode,
                        deviceCode,
                        fullDeviceCode: externalFullDeviceCode(
                          item.productCode,
                          deviceCode
                        ),
                      }))
                    );
                    const inputLabels = inputBindings.map(
                      (item) => item.fullDeviceCode
                    );
                    if (duplicated.length > 0) {
                      const duplicateKeys = new Set(
                        duplicatedDetails.map((item) =>
                          externalBindingKey(item.productCode, item.deviceCode)
                        )
                      );
                      const text = (
                        duplicatedDetails.length > 0
                          ? duplicatedDetails.map(
                              (item) =>
                                item.fullDeviceCode ||
                                externalFullDeviceCode(
                                  item.productCode,
                                  item.deviceCode
                                )
                            )
                          : duplicated
                      ).join("、");
                      const created = Number(data?.created) || 0;
                      if (created > 0) {
                        message.warning(
                          `成功添加${created}个设备，以下设备已存在：${text}`
                        );
                        const createdIds = inputBindings
                          .filter((item) =>
                            duplicatedDetails.length > 0
                              ? !duplicateKeys.has(
                                  externalBindingKey(
                                    item.productCode,
                                    item.deviceCode
                                  )
                                )
                              : !duplicated.includes(item.deviceCode)
                          )
                          .map((item) => item.fullDeviceCode);
                        const createdIdsText = Array.from(
                          new Set(createdIds)
                        );
                        dispatch(
                          createSystemLog({
                            content: `外部用户添加设备：成功添加${created}个；设备ID：${createdIdsText.join(
                              ","
                            )}；已存在${duplicated.length}个：${text}`,
                            module: "设备管理--设备列表",
                            url: window.location.href,
                            userId: user?.userInfo?.id || null,
                          })
                        );
                        fetchData(currentPage, pageSize);
                        return true;
                      } else {
                        message.error(`添加失败：以下设备已存在：${text}`);
                        return false;
                      }
                    }
                    if (res?.success === false) {
                      // const conflicts = data?.conflicts;
                      // if (Array.isArray(conflicts) && conflicts.length) {
                      //   const text = conflicts
                      //     .map(
                      //       (c) =>
                      //         `${c.deviceCode}${
                      //           c.user?.name ? `(${c.user.name})` : ""
                      //         }`
                      //     )
                      //     .join("、");
                      //   message.error(
                      //     `绑定失败：以下设备已被其他用户绑定：${text}`
                      //   );
                      // } else {
                      //   // message.error(res?.message);
                      // }
                      return false;
                    }
                    // message.success("设备添加成功");
                    dispatch(
                      createSystemLog({
                        content: `外部用户添加设备：成功添加${
                          inputLabels.length
                        }个；设备ID：${inputLabels.join(",")}`,
                        module: "设备管理--设备列表",
                        url: window.location.href,
                        userId: user?.userInfo?.id || null,
                      })
                    );
                    fetchData(currentPage, pageSize);
                    return true;
                  }}
                />
              )}
              {isExternalRegistered && (
                <ProjectModal
                  title="解绑设备"
                  triggerRender={
                    <Button type="primary" style={{ width: 80 }} ghost>
                      解绑设备
                    </Button>
                  }
                  dispatch={dispatch}
                  simpleDevicesOnly
                  nameRequired={false}
                  onFinish={async (values) => {
                    const list = Array.isArray(values?.devices)
                      ? values.devices
                      : [];
                    const bindings = list.flatMap((item) => {
                      const productCode = `${item?.productCode || ""}`.trim();
                      const deviceIds = Array.isArray(item?.deviceIds)
                        ? item.deviceIds
                            .map((id) => `${id}`.trim())
                            .filter(Boolean)
                        : [];
                      return deviceIds.map((deviceCode) => ({
                        productCode,
                        deviceCode,
                      }));
                    });
                    if (
                      bindings.length === 0 ||
                      bindings.some((item) => !item.productCode)
                    ) {
                      message.warning("请选择设备型号并填写设备ID");
                      return false;
                    }
                    const bindingLabels = bindings.map((item) =>
                      externalFullDeviceCode(item.productCode, item.deviceCode)
                    );
                    const res = await dispatch(
                      removeExternalUserDevices({ bindings })
                    );
                    if (res?.success === false) {
                      message.error(res?.message || "解绑设备失败");
                      return false;
                    }
                    const data = res?.payload?.data || {};
                    const removed = Number(data?.removed) || 0;
                    const notFound = Array.isArray(data?.notFound)
                      ? data.notFound
                      : [];
                    const serverMsg =
                      typeof data?.message === "string" ? data.message : "";
                    const text = notFound.join("、");
                    if (removed > 0 && notFound.length > 0) {
                      message.success(
                        `部分解绑成功：成功解绑${removed}个；未找到${notFound.length}个：${text}`
                      );
                      dispatch(
                        createSystemLog({
                          content: `外部用户解绑设备：成功解绑${removed}个；提交设备ID：${bindingLabels.join(
                            ","
                          )}；未找到${notFound.length}个：${text}`,
                          module: "设备管理--设备列表",
                          url: window.location.href,
                          userId: user?.userInfo?.id || null,
                        })
                      );
                      fetchData(currentPage, pageSize);
                      return true;
                    }
                    if (removed > 0) {
                      message.success(`设备解绑成功：成功解绑${removed}个`);
                      dispatch(
                        createSystemLog({
                          content: `外部用户解绑设备：成功解绑${removed}个；提交设备ID：${bindingLabels.join(
                            ","
                          )}`,
                          module: "设备管理--设备列表",
                          url: window.location.href,
                          userId: user?.userInfo?.id || null,
                        })
                      );
                      fetchData(currentPage, pageSize);
                      return true;
                    }
                    if (notFound.length > 0) {
                      message.warning(
                        `未解绑：以下设备未绑定或已解绑：${text}`
                      );
                      return false;
                    }
                    if (serverMsg) {
                      message.info(serverMsg);
                      dispatch(
                        createSystemLog({
                          content: `外部用户解绑设备完成：${serverMsg}；提交设备ID：${bindingLabels.join(
                            ","
                          )}`,
                          module: "设备管理--设备列表",
                          url: window.location.href,
                          userId: user?.userInfo?.id || null,
                        })
                      );
                    } else {
                      message.success("设备解绑完成");
                      dispatch(
                        createSystemLog({
                          content: `外部用户解绑设备完成：提交设备ID：${bindingLabels.join(
                            ","
                          )}`,
                          module: "设备管理--设备列表",
                          url: window.location.href,
                          userId: user?.userInfo?.id || null,
                        })
                      );
                    }
                    fetchData(currentPage, pageSize);
                    return true;
                  }}
                />
              )}
              {isAuthorized("BATCHDISTRIBUTION") && (
                <Button
                  color="primary"
                  variant="outlined"
                  theme="solid"
                  style={{ width: 80 }}
                  onClick={bulkIssue}
                >
                  批量下发
                </Button>
              )}
              {isAuthorized("BATCHUPGRADE") && (
                <Button
                  color="primary"
                  variant="outlined"
                  theme="solid"
                  style={{ width: 80 }}
                  onClick={bulkOta}
                >
                  批量升级
                </Button>
              )}
              <Button
                variant="outlined"
                style={{ border: "none" }}
                onClick={() => setShowAdvanced((v) => !v)}
                icon={
                  showAdvanced ? (
                    <DoubleRightOutlined
                      style={{ transform: "rotate(-90deg)", color: "#005ABD" }}
                    />
                  ) : (
                    <DoubleRightOutlined
                      style={{ transform: "rotate(90deg)", color: "#005ABD" }}
                    />
                  )
                }
              />
            </Space>
            {showAdvanced && (
              <div style={{ marginTop: 8 }}>
                <Space>
                  标签:
                  <Input
                    placeholder="输入标签进行搜索"
                    value={queryParams.tags}
                    onChange={(e) => {
                      if (isMountedRef.current) {
                        setQueryParams({
                          ...queryParams,
                          tags: e.target.value,
                        });
                      }
                    }}
                    allowClear
                    style={{ width: 180 }}
                  />
                </Space>
              </div>
            )}
          </div>
        </div>
      </div>
      <div style={{ marginTop: 10, flex: 1, overflow: "hidden" }}>
        <Table
          columns={columns}
          dataSource={devicesList?.rows || []}
          rowKey="deviceCode"
          rowSelection={rowSelection}
          loading={loading}
          scroll={
            devicesList?.rows?.length ? { y: "calc(100vh - 280px)" } : undefined
          }
          // locale={{
          //   emptyText: (
          //     <Empty
          //       image={
          //         <img
          //           src="/assets/images/background/no-data.png"
          //           alt="暂无数据"
          //           style={{ height: 500 }}
          //         />
          //       }
          //       description=""
          //       style={{ height: 500 }}
          //     />
          //   ),
          // }}
          pagination={{
            current: currentPage || 1,
            pageSize,
            total: devicesList?.count || 0,
            showSizeChanger: true,
            onChange: handlePageChange,
            onShowSizeChange: handlePageChange,
            showTotal: (total, range) =>
              `第 ${range[0]}-${range[1]} 条/共 ${total} 条`,
          }}
        />
      </div>
      <IssueInstructionsModal
        open={issueVisible}
        onClose={handleIssueClose}
        curDevices={curDevices}
        showTCPConfig={showTCPConfig}
      />
      <RemoteUpgradedModal
        open={upgradeVisible}
        onClose={handleUpgradeClose}
        curDevices={curDevices}
      />
    </div>
  );
};

function mapStateToProps(state) {
  const { auth, global, devicesList } = state;
  return {
    user: auth.user,
    actions: global.actions,
    loading: devicesList.isRequesting,
    devicesList: devicesList.data,
  };
}
export default connect(mapStateToProps)(DeviceList);

function areAllValuesSame(arr, prop) {
  if (arr.length === 0) {
    return true;
  }
  let firstValue = arr[0][prop];
  return arr.every((obj) => obj[prop] === firstValue);
}
