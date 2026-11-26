import React, { useEffect, useState } from "react";
import { connect } from "react-redux";
import {
  Button,
  Descriptions,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import {
  CopyOutlined,
  EyeOutlined,
  ReloadOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import moment from "moment";

const MODE_LABELS = {
  without_cd: "without_cd（设备参数配置）",
  with_cd: "with_cd（下发指令）",
};

const MODE_OPTIONS = Object.keys(MODE_LABELS).map((value) => ({
  label: MODE_LABELS[value],
  value,
}));

const formatTime = (value) =>
  value ? moment(value).format("YYYY-MM-DD HH:mm:ss") : "-";

const toRow = (record) => ({
  ...record,
  createdAt: record.createdAt || record.created_at || null,
});

const toDetailJson = (record) => {
  if (!record) return "";
  let schema = record.schema || [];
  if (typeof schema === "string") {
    try {
      schema = JSON.parse(schema || "[]");
    } catch (error) {
      return schema;
    }
  }
  return JSON.stringify(schema, null, 2);
};

const ParamTemplateHistory = ({ actions, dispatch }) => {
  const { firmwareUpgrade } = actions || {};
  const [list, setList] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState(null);
  const [queryName, setQueryName] = useState("");
  const [queryCode, setQueryCode] = useState("");
  const [queryMode, setQueryMode] = useState(undefined);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const fetchList = async ({
    page = currentPage,
    size = pageSize,
    templateName = queryName,
    productCode = queryCode,
    mode = queryMode,
  } = {}) => {
    setLoading(true);
    try {
      const res = await dispatch(
        firmwareUpgrade.getParamTemplateHistories({
          templateName: templateName || undefined,
          productCode: productCode || undefined,
          mode: mode || undefined,
          page,
          pageSize: size,
        }),
      );
      if (!res?.success) {
        message.error("获取参数模板历史记录失败");
        return;
      }
      const data = res?.payload?.data;
      const rows = Array.isArray(data) ? data : data?.rows || [];
      setList(rows.map(toRow));
      setTotal(Array.isArray(data) ? rows.length : Number(data?.count) || 0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList({ page: 1, size: pageSize, templateName: "", productCode: "" });
  }, []);

  const openDetail = async (record) => {
    setDetailOpen(true);
    setDetail(null);
    setDetailLoading(true);
    try {
      const res = await dispatch(
        firmwareUpgrade.getParamTemplateHistoryDetail(record.id),
      );
      if (!res?.success) {
        message.error("获取参数模板历史详情失败");
        setDetailOpen(false);
        return;
      }
      setDetail(toRow(res?.payload?.data || {}));
    } finally {
      setDetailLoading(false);
    }
  };

  const handleSearch = () => {
    setCurrentPage(1);
    fetchList({ page: 1 });
  };

  const handleReset = () => {
    setQueryName("");
    setQueryCode("");
    setQueryMode(undefined);
    setCurrentPage(1);
    fetchList({ page: 1, templateName: "", productCode: "", mode: "" });
  };

  const columns = [
    { title: "模板名称", dataIndex: "name", key: "name", width: 220 },
    {
      title: "产品编码",
      dataIndex: "productCode",
      key: "productCode",
      width: 160,
    },
    {
      title: "模板模式",
      dataIndex: "mode",
      key: "mode",
      width: 230,
      render: (value) => MODE_LABELS[value] || value || "-",
    },
    {
      title: "备注",
      dataIndex: "remark",
      key: "remark",
      width: 260,
      ellipsis: true,
      render: (value) => value || "-",
    },
    {
      title: "创建时间",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 180,
      render: formatTime,
    },
    {
      title: "操作",
      key: "action",
      width: 120,
      fixed: detailOpen ? undefined : "right",
      render: (_, record) => (
        <Button
          type="link"
          onClick={() => openDetail(record)}
        >
          查看详情
        </Button>
      ),
    },
  ];

  const detailText = toDetailJson(detail);

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
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", height: 37 }}>
          <div
            style={{
              width: 0,
              height: 20,
              borderLeft: "3px solid #005ABD",
              borderTop: "3px solid transparent",
              borderBottom: "3px solid transparent",
            }}
          />
          <div
            style={{
              fontFamily: "YouSheBiaoTiHei",
              fontSize: 24,
              color: "#101531",
              marginLeft: 8,
            }}
          >
            参数模板历史记录
          </div>
          <div
            style={{
              marginLeft: 6,
              fontSize: 12,
              color: "#969799",
              fontFamily: "DINExp",
            }}
          >
            Param Template History
          </div>
        </div>
        <Space wrap>
          <span>模板名称:</span>
          <Input
            placeholder="输入模板名称"
            value={queryName}
            onChange={(e) => setQueryName(e.target.value)}
            allowClear
            style={{ width: 180 }}
          />
          <span>产品编码:</span>
          <Input
            placeholder="输入产品编码"
            value={queryCode}
            onChange={(e) => setQueryCode(e.target.value)}
            allowClear
            style={{ width: 160 }}
          />
          <span>模板模式:</span>
          <Select
            value={queryMode}
            onChange={setQueryMode}
            allowClear
            placeholder="全部"
            options={MODE_OPTIONS}
            style={{ width: 220 }}
          />
          <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
            查询
          </Button>
          <Button icon={<ReloadOutlined />} onClick={handleReset}>
            重置
          </Button>
        </Space>
      </div>

      <div style={{ marginTop: 10, flex: 1, overflow: "hidden" }}>
        <Table
          rowKey="id"
          columns={columns}
          loading={loading}
          dataSource={list}
          style={{ position: "relative", zIndex: 0 }}
          scroll={{ x: 1270, y: "calc(100vh - 280px)" }}
          pagination={{
            current: currentPage,
            pageSize,
            total,
            showSizeChanger: true,
            onChange: (page, size) => {
              const nextSize = size || pageSize;
              const nextPage = size !== pageSize ? 1 : page;
              setPageSize(nextSize);
              setCurrentPage(nextPage);
              fetchList({ page: nextPage, size: nextSize });
            },
            showTotal: (count, range) =>
              `第 ${range[0]}-${range[1]} 条/共 ${count} 条`,
          }}
        />
      </div>

      <Modal
        title="参数模板历史详情"
        open={detailOpen}
        width={860}
        footer={null}
        zIndex={2000}
        styles={{
          mask: { zIndex: 1999 },
        }}
        onCancel={() => {
          setDetailOpen(false);
          setDetail(null);
        }}
        maskClosable={false}
      >
        {detailLoading ? (
          <div style={{ padding: 40, textAlign: "center" }}>加载中...</div>
        ) : detail ? (
          <>
            <Descriptions bordered size="small" column={2}>
              <Descriptions.Item label="模板名称">{detail.name}</Descriptions.Item>
              <Descriptions.Item label="产品编码">
                {detail.productCode}
              </Descriptions.Item>
              <Descriptions.Item label="模板模式">
                {MODE_LABELS[detail.mode] || detail.mode || "-"}
              </Descriptions.Item>
              <Descriptions.Item label="变更类型">
                <Tag color={detail.changeType === "create" ? "green" : "blue"}>
                  {detail.changeType === "create" ? "新增" : "编辑"}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="备注" span={2}>
                {detail.remark || "-"}
              </Descriptions.Item>
              <Descriptions.Item label="创建时间">
                {formatTime(detail.createdAt)}
              </Descriptions.Item>
            </Descriptions>
            <div style={{ marginTop: 16, marginBottom: 8, fontWeight: 600 }}>
              模板结构（JSON）
            </div>
            <Typography.Paragraph
              copyable={{
                text: detailText,
                icon: [<CopyOutlined key="copy" />, "复制JSON"],
              }}
              style={{ marginBottom: 0 }}
            >
              <pre
                style={{
                  margin: 0,
                  maxHeight: "55vh",
                  overflow: "auto",
                  background: "#f7f7f7",
                  padding: 12,
                  borderRadius: 6,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {detailText}
              </pre>
            </Typography.Paragraph>
          </>
        ) : null}
      </Modal>
    </div>
  );
};

function mapStateToProps(state) {
  return {
    actions: state.global.actions,
  };
}

export default connect(mapStateToProps)(ParamTemplateHistory);
