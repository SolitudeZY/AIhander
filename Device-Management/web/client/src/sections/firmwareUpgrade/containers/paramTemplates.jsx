import React, { useEffect, useState } from "react";
import { connect } from "react-redux";
import {
  Button,
  Table,
  Modal,
  Input,
  Space,
  message,
  Typography,
  Select,
} from "antd";
import ParamTemplateModal from "../components/paramTemplateModal";
import moment from "moment";
import { createSystemLog } from "../../system/actions/log";
import { isAuthorized } from "$utils";
import { LinkOutlined } from "@ant-design/icons";

const PARAM_TEMPLATE_DOC_URL =
  "https://doc.weixin.qq.com/doc/w3_AcoAAgZZAFQCNC3dT7XFFT1y9yQ3H?scode=AAkAvwd3ABEW37LTSU";

const ParamTemplates = ({ actions, dispatch, user, ...props }) => {
  const [list, setList] = useState([]);
  const [total, setTotal] = useState(0);
  const [tableLoading, setTableLoading] = useState(false);
  const [queryName, setQueryName] = useState("");
  const [queryCode, setQueryCode] = useState("");
  const [queryMode, setQueryMode] = useState(undefined);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [schemaPreviewOpen, setSchemaPreviewOpen] = useState(false);
  const [schemaPreviewTitle, setSchemaPreviewTitle] = useState("");
  const [schemaPreviewText, setSchemaPreviewText] = useState("");
  const { firmwareUpgrade } = actions || {};
  const [currentPage, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const stringifyForLog = (value, maxLen = 1800) => {
    let text = "";
    try {
      text = JSON.stringify(value, null, 2);
    } catch (e) {
      text = String(value);
    }
    if (!text) return "";
    if (text.length <= maxLen) return text;
    return `${text.slice(0, maxLen)}...（已截断，原始长度${text.length}）`;
  };

  const buildTemplateLogContent = ({ action, after, before }) => {
    const afterBrief = {
      id: after?.id,
      name: after?.name,
      productCode: after?.productCode,
      mode: after?.mode,
      remark: after?.remark,
      schema: after?.schema,
    };
    if (action === "create") {
      return `新增参数模板\n${stringifyForLog(afterBrief)}`;
    }
    if (action === "update") {
      const beforeBrief = {
        id: before?.id,
        name: before?.name,
        productCode: before?.productCode,
        mode: before?.mode,
        remark: before?.remark,
        schema: before?.schema,
      };
      return `修改参数模板\n修改前:\n${stringifyForLog(beforeBrief)}\n修改后:\n${stringifyForLog(afterBrief)}`;
    }
    return "";
  };

  const toListRow = (t) => ({
    id: t.id,
    name: t.name,
    productCode: t.productCode,
    mode: typeof t.mode === "undefined" ? null : t.mode,
    createdAt: t.createdAt || t.created_at || null,
    remark: t.remark || "",
    schema: t.schema || [],
    updatedAt: t.updatedAt || t.updated_at || null,
  });

  const fetchList = async ({ page, size, templateName, productCode, mode }) => {
    setTableLoading(true);
    try {
      const res = await dispatch(
        firmwareUpgrade.getParamTemplates({
          templateName: templateName || undefined,
          productCode: productCode || undefined,
          mode: mode || undefined,
          page,
          pageSize: size,
        }),
      );
      if (!res?.success) {
        message.error("获取参数模板失败");
        return;
      }
      const data = res?.payload?.data;
      const rows = Array.isArray(data) ? data : data?.rows || [];
      const count = Array.isArray(data)
        ? rows.length
        : Number(data?.count) || 0;
      setList(rows.map(toListRow));
      setTotal(count);
    } finally {
      setTableLoading(false);
    }
  };

  const normalizeSchemaValue = (schemaValue) => {
    if (typeof schemaValue === "string") {
      const trimmed = schemaValue.trim();
      if (!trimmed) return [];
      try {
        return JSON.parse(trimmed);
      } catch (e) {
        return trimmed;
      }
    }
    if (typeof schemaValue === "undefined" || schemaValue === null) return [];
    return schemaValue;
  };

  const toSchemaText = (schemaValue, pretty = false) => {
    const normalized = normalizeSchemaValue(schemaValue);
    if (typeof normalized === "string") return normalized;
    try {
      return JSON.stringify(normalized, null, pretty ? 2 : 0);
    } catch (e) {
      return String(normalized);
    }
  };

  const openSchemaPreview = (record) => {
    setSchemaPreviewTitle(
      record?.name ? `${record.name} - 配置项预览` : "配置项预览",
    );
    setSchemaPreviewText(toSchemaText(record?.schema, true));
    setSchemaPreviewOpen(true);
  };

  useEffect(() => {
    fetchList({
      page: 1,
      size: pageSize,
      templateName: "",
      productCode: "",
      mode: "",
    });
  }, []);

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (record) => {
    setEditing(record);
    setModalOpen(true);
  };

  const remove = (record) => {
    Modal.confirm({
      title: "确定删除该模板？",
      content: `${record.name}（${record.productCode}）`,
      onOk: async () => {
        const res = await dispatch(
          firmwareUpgrade.deleteParamTemplate(record.id),
        );
        if (res?.success) {
          dispatch(
            createSystemLog({
              content: `删除参数模板：${record?.name || ""}（${record?.productCode || ""}）`,
              module: "参数模板",
              url: window.location.href,
              userId: user?.userInfo?.id || null,
            }),
          );
          const nextPage =
            list.length <= 1 && currentPage > 1 ? currentPage - 1 : currentPage;
          setPage(nextPage);
          await fetchList({
            page: nextPage,
            size: pageSize,
            templateName: queryName,
            productCode: queryCode,
            mode: queryMode,
          });
          message.success("已删除");
        } else {
          message.error("删除失败");
        }
      },
    });
  };

  const handleSubmit = async (payload) => {
    if (saving) return;
    setSaving(true);
    try {
      const isUpdate = editing && typeof editing.id === "number";
      const saveRes = isUpdate
        ? await dispatch(
            firmwareUpgrade.updateParamTemplate(editing.id, payload),
          )
        : await dispatch(firmwareUpgrade.createParamTemplate(payload));

      if (!saveRes?.success) {
        return;
      }

      const afterRecord = {
        ...(isUpdate ? editing : {}),
        ...payload,
        id: isUpdate ? editing?.id : saveRes?.payload?.data?.id,
      };
      dispatch(
        createSystemLog({
          content: buildTemplateLogContent({
            action: isUpdate ? "update" : "create",
            before: isUpdate ? editing : null,
            after: afterRecord,
          }),
          module: "参数模板",
          url: window.location.href,
          userId: user?.userInfo?.id || null,
        }),
      );

      const nextPage = editing ? currentPage : 1;
      setPage(nextPage);
      await fetchList({
        page: nextPage,
        size: pageSize,
        templateName: queryName,
        productCode: queryCode,
        mode: queryMode,
      });

      setModalOpen(false);
      setEditing(null);
      message.success("已保存");
    } catch (e) {
      message.error("保存失败");
    } finally {
      setSaving(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    fetchList({
      page: 1,
      size: pageSize,
      templateName: queryName,
      productCode: queryCode,
      mode: queryMode,
    });
  };

  const handleReset = () => {
    setQueryName("");
    setQueryCode("");
    setQueryMode(undefined);
    setPage(1);
    fetchList({
      page: 1,
      size: pageSize,
      templateName: "",
      productCode: "",
      mode: "",
    });
  };

  const columns = [
    { title: "模板名称", dataIndex: "name", key: "name", width: 200 },
    {
      title: "产品编码",
      dataIndex: "productCode",
      key: "productCode",
      width: 140,
    },
    {
      title: "模板模式",
      dataIndex: "mode",
      key: "mode",
      width: 190,
      render: (value) => {
        const modeLabels = {
          without_cd: "without_cd（设备参数配置）",
          with_cd: "with_cd（下发指令）",
          original: "original（原始组合模板）",
        };
        return modeLabels[value] || value || "-";
      },
    },
    {
      title: "配置项预览",
      key: "schema",
      render: (_, r) => {
        const txt = toSchemaText(r.schema, false);
        return (
          <div style={{ maxWidth: 420 }}>
            <Typography.Paragraph
              ellipsis={{ rows: 2, expandable: false }}
              style={{ marginBottom: 4 }}
            >
              {txt}
            </Typography.Paragraph>
            <Typography.Link onClick={() => openSchemaPreview(r)}>
              预览
            </Typography.Link>
          </div>
        );
      },
    },
    {
      title: "备注",
      dataIndex: "remark",
      key: "remark",
      width: 200,
    },
    {
      title: "创建时间",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 180,
      render: (v) => (v ? moment(v).format("YYYY-MM-DD HH:mm:ss") : "-"),
    },
    {
      title: "更新时间",
      dataIndex: "updatedAt",
      key: "updatedAt",
      width: 180,
      render: (v) => (v ? moment(v).format("YYYY-MM-DD HH:mm:ss") : "-"),
    },
    {
      title: "操作",
      key: "action",
      width: 200,
      render: (_, r) => (
        <Space>
          {isAuthorized("EDITPARAMETERTEMPLATE") && (
            <Button onClick={() => openEdit(r)}>编辑</Button>
          )}
          {isAuthorized("DELETEPARAMETERTEMPLATE") && (
            <Button type="primary" danger onClick={() => remove(r)}>
              删除
            </Button>
          )}
        </Space>
      ),
    },
  ];

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
            参数模板
          </div>
          <div
            style={{
              marginLeft: 6,
              fontSize: 12,
              color: "#969799",
              fontFamily: "DINExp",
            }}
          >
            Param Templates
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <Space>
              模板名称:
              <Input
                placeholder="输入模板名称进行搜索"
                value={queryName}
                onChange={(e) => setQueryName(e.target.value)}
                allowClear
                style={{ width: 180 }}
              />
              产品编码:
              <Input
                placeholder="输入产品编码进行搜索"
                value={queryCode}
                onChange={(e) => setQueryCode(e.target.value)}
                allowClear
                style={{ width: 180 }}
              />
              模板模式:
              <Select
                value={queryMode}
                onChange={(v) => setQueryMode(v)}
                allowClear
                style={{ width: 160 }}
                placeholder="全部"
                options={[
                  { label: "设备参数配置", value: "without_cd" },
                  { label: "下发指令", value: "with_cd" },
                ]}
              />
              <Button type="primary" onClick={handleSearch}>
                查询
              </Button>
              <Button onClick={handleReset}>重置</Button>
              <Button
                icon={<LinkOutlined />}
                href={PARAM_TEMPLATE_DOC_URL}
                target="_blank"
                rel="noopener noreferrer"
              >
                参数模板说明
              </Button>
              {isAuthorized("ADDPARAMETERTEMPLATE") && (
                <Button type="primary" onClick={openCreate} ghost>
                  新建模板
                </Button>
              )}
            </Space>
          </div>
        </div>
      </div>
      <div style={{ marginTop: 10, flex: 1, overflow: "hidden" }}>
        <Table
          rowKey="id"
          columns={columns}
          loading={tableLoading}
          dataSource={list}
          scroll={list.length ? { y: "calc(100vh - 280px)" } : undefined}
          pagination={{
            current: currentPage || 1,
            pageSize,
            total,
            showSizeChanger: true,
            onChange: (p, s) => {
              if (s && s !== pageSize) {
                setPageSize(s);
                setPage(1);
                fetchList({
                  page: 1,
                  size: s,
                  templateName: queryName,
                  productCode: queryCode,
                  mode: queryMode,
                });
              } else {
                setPage(p || 1);
                fetchList({
                  page: p || 1,
                  size: pageSize,
                  templateName: queryName,
                  productCode: queryCode,
                  mode: queryMode,
                });
              }
            },
            showTotal: (total, range) =>
              `第 ${range[0]}-${range[1]} 条/共 ${total} 条`,
          }}
        />
      </div>
      <ParamTemplateModal
        open={modalOpen}
        initialValues={editing}
        confirmLoading={saving}
        onCancel={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        onSubmit={handleSubmit}
      />
      <Modal
        title={schemaPreviewTitle}
        open={schemaPreviewOpen}
        width={760}
        footer={null}
        onCancel={() => {
          setSchemaPreviewOpen(false);
          setSchemaPreviewTitle("");
          setSchemaPreviewText("");
        }}
      >
        <Typography.Paragraph copyable={{ text: schemaPreviewText }}>
          <pre
            style={{
              margin: 0,
              maxHeight: "60vh",
              overflow: "auto",
              background: "#f7f7f7",
              padding: 12,
              borderRadius: 6,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          >
            {schemaPreviewText}
          </pre>
        </Typography.Paragraph>
      </Modal>
    </div>
  );
};
function mapStateToProps(state) {
  const { auth, global } = state;
  return {
    user: auth.user,
    actions: global.actions,
  };
}

export default connect(mapStateToProps)(ParamTemplates);
