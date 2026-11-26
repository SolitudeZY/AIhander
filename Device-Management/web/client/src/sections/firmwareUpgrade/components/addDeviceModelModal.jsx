import React, { useEffect, useState } from "react";
import { connect } from "react-redux";
import { Button, Input, message, Modal, Table, Tag } from "antd";
import { createSystemLog } from "../../system/actions/log";

function AddDeviceModelModal({
  open,
  onClose,
  actions,
  dispatch,
  user,
  onSuccess,
}) {
  const { firmwareUpgrade } = actions;
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dataSource, setDataSource] = useState([]);
  const [selectedRows, setSelectedRows] = useState([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [duplicatedModels, setDuplicatedModels] = useState([]);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });

  const queryList = (page = 1, pageSize = pagination.pageSize, model = keyword) => {
    setLoading(true);
    dispatch(
      firmwareUpgrade.getDeviceMetaModels({
        page,
        pageSize,
        model,
      }),
    )
      .then((res) => {
        if (!res || !res.success) return;
        const payload = (res.payload && res.payload.data) || {};
        const rows = payload.rows || [];
        setDataSource(rows);
        setPagination({
          current: payload.page || page,
          pageSize: payload.pageSize || pageSize,
          total: payload.count || 0,
        });
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    if (!open) {
      setKeyword("");
      setDataSource([]);
      setSelectedRows([]);
      setSelectedRowKeys([]);
      setPagination({ current: 1, pageSize: 10, total: 0 });
      return;
    }
    queryList(1, 10, "");
  }, [open]);

  const handleSearch = () => {
    queryList(1, pagination.pageSize, keyword.trim());
  };

  const handleReset = () => {
    setKeyword("");
    queryList(1, pagination.pageSize, "");
  };

  const handleTableChange = (pageInfo) => {
    queryList(pageInfo.current, pageInfo.pageSize, keyword.trim());
  };

  const handleSelectChange = (keys, rows) => {
    const currentPageModels = new Set(dataSource.map((item) => item.model));
    const preservedRows = selectedRows.filter((item) => !currentPageModels.has(item.model));
    const nextRowMap = new Map();

    preservedRows.concat(rows).forEach((item) => {
      if (item && item.model) {
        nextRowMap.set(item.model, item);
      }
    });

    const nextRows = Array.from(nextRowMap.values());
    setSelectedRows(nextRows);
    setSelectedRowKeys(nextRows.map((item) => item.model));
    if (duplicatedModels.length) {
      const nextModelSet = new Set(nextRows.map((item) => item.model));
      setDuplicatedModels(duplicatedModels.filter((item) => nextModelSet.has(item)));
    }
  };

  const handleRemoveSelected = (model) => {
    const nextRows = selectedRows.filter((item) => item.model !== model);
    setSelectedRows(nextRows);
    setSelectedRowKeys(nextRows.map((item) => item.model));
    if (duplicatedModels.length) {
      setDuplicatedModels(duplicatedModels.filter((item) => item !== model));
    }
  };

  const handleClearSelected = () => {
    setSelectedRows([]);
    setSelectedRowKeys([]);
    setDuplicatedModels([]);
  };

  const handleConfirm = () => {
    if (!selectedRows.length) {
      message.warning("请先选择设备型号");
      return;
    }
    setSaving(true);
    dispatch(
      firmwareUpgrade.addDeviceModels({
        models: selectedRows.map((item) => item.model),
      }),
    )
      .then((res) => {
        if (!res || !res.success) return;
        const payload = (res.payload && res.payload.data) || {};
        const duplicatedModelList = payload.duplicatedModels || [];
        setDuplicatedModels(duplicatedModelList);
        if (duplicatedModelList.length) {
          message.warning("存在重复设备型号：" + duplicatedModelList.join("、") + "，请手动去除后重试");
          return;
        }
        message.success("添加成功");
        dispatch(
          createSystemLog({
            content: "添加设备型号：" + selectedRows.map((item) => item.model).join("、"),
            module: "固件库",
            url: window.location.href,
            userId: user && user.id ? user.id : null,
          }),
        );
        if (onSuccess) onSuccess();
        onClose();
      })
      .finally(() => {
        setSaving(false);
      });
  };

  const columns = [
    {
      title: "设备名称",
      dataIndex: "name",
      key: "name",
      render: (text) => text || <span style={{ color: "#999" }}>--</span>,
    },
    {
      title: "设备型号",
      dataIndex: "model",
      key: "model",
    },
  ];

  return (
    <Modal
      title="添加设备型号"
      open={open}
      onCancel={onClose}
      maskClosable={false}
      width={730}
      footer={null}
      className="add-device-model-modal"
      styles={{
        body: {
          padding: "20px 24px 24px",
        },
      }}
    >
      <div>
        <div style={{ marginBottom: 10, color: "#666", fontSize: 14 }}>型号关键字</div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <Input
            placeholder="请输入设备型号"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onPressEnter={handleSearch}
            style={{ width: 298, height: 38, borderRadius: 8 }}
          />
          <Button
            type="primary"
            onClick={handleSearch}
            style={{ width: 60, height: 38, borderRadius: 8 }}
          >
            查询
          </Button>
          <Button onClick={handleReset} style={{ width: 60, height: 38, borderRadius: 8 }}>
            重置
          </Button>
        </div>

        <div
          style={{
            minHeight: 40,
            maxHeight: 170,
            overflowY: "auto",
            background: "#F7FAFF",
            border: "1px solid #E3ECFF",
            borderRadius: 10,
            padding: "7px 12px",
            marginBottom: 14,
            display: "flex",
            alignItems: "flex-start",
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          <span style={{ color: "#7A869A", lineHeight: "26px", marginRight: 4 }}>已选择</span>
          {selectedRows.length ? (
            <Button
              type="link"
              onClick={handleClearSelected}
              style={{ height: 26, padding: 0, lineHeight: "26px" }}
            >
              清空
            </Button>
          ) : null}
          {selectedRows.length ? (
            selectedRows.map((item) => {
              const isDuplicate = duplicatedModels.indexOf(item.model) > -1;
              return (
                <Tag
                  key={item.model}
                  closable
                  onClose={(e) => {
                    e.preventDefault();
                    handleRemoveSelected(item.model);
                  }}
                  style={{
                    marginInlineEnd: 0,
                    height: 26,
                    lineHeight: "24px",
                    borderRadius: 13,
                    padding: "0 10px",
                    color: isDuplicate ? "#D4380D" : "#4B79F6",
                    background: isDuplicate ? "#FFF2E8" : "#EEF4FF",
                    border: isDuplicate ? "1px solid #FFBB96" : "1px solid #DCE8FF",
                  }}
                >
                  {item.model}
                </Tag>
              );
            })
          ) : (
            <span style={{ color: "#B0B7C3", lineHeight: "26px" }}>暂无</span>
          )}
        </div>

        {duplicatedModels.length ? (
          <div
            style={{
              color: "#D4380D",
              fontSize: 13,
              lineHeight: "20px",
              marginBottom: 10,
            }}
          >
            重复设备型号：{duplicatedModels.join("、")}，请在上方已选列表中手动删除后再确认添加。
          </div>
        ) : null}

        <div
          style={{
            color: "#8F96A3",
            fontSize: 13,
            lineHeight: "20px",
            marginBottom: 12,
          }}
        >
          设备型号数据从CK获取（以太数据同步至CK库，数据同步频度：2小时）
        </div>

        <div
          style={{
            border: "1px solid #EEF1F5",
            borderRadius: 12,
            overflow: "hidden",
            marginBottom: 10,
          }}
        >
          <Table
            rowKey="model"
            loading={loading}
            columns={columns}
            dataSource={dataSource}
            pagination={{
              current: pagination.current,
              pageSize: pagination.pageSize,
              total: pagination.total,
              showSizeChanger: false,
              showTotal: (total, range) => "第 " + range[0] + "-" + range[1] + " 条/共 " + total + " 条",
            }}
            rowSelection={{
              selectedRowKeys,
              preserveSelectedRowKeys: true,
              onChange: handleSelectChange,
            }}
            onChange={handleTableChange}
            scroll={{ y: 250 }}
            size="middle"
            className="thin-scrollbar"
          />
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            color: "#8F96A3",
            fontSize: 13,
            marginBottom: 22,
          }}
        >
          <span></span>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
          <Button onClick={onClose} style={{ width: 88, height: 40, borderRadius: 8 }}>
            取消
          </Button>
          <Button
            type="primary"
            loading={saving}
            onClick={handleConfirm}
            style={{ width: 116, height: 40, borderRadius: 8 }}
          >
            确认添加
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function mapStateToProps(state) {
  const auth = state.auth;
  const global = state.global;
  return {
    user: auth.user && auth.user.userInfo,
    actions: global.actions,
  };
}

export default connect(mapStateToProps)(AddDeviceModelModal);
