"use strict";

import React, { useEffect, useMemo, useState } from "react";
import {
  Modal,
  Form,
  Input,
  Button,
  Select,
  Switch,
  Tabs,
  Collapse,
  Card,
  Typography,
  message,
} from "antd";
import { DeleteOutlined, HolderOutlined } from "@ant-design/icons";

const defaultSchema = [
  {
    name: "基本参数",
    field: "BF",
    children: [
      { field: "DR", name: "采集粒度(秒)", dataType: "number" },
      { field: "TIME", name: "平台时间", dataType: "TIME" },
    ],
  },
  {
    name: "平台参数",
    field: "SER",
    children: [{ field: "TCP", name: "TCP" }],
  },
];

const makeUid = () =>
  `${Date.now()}_${Math.random().toString(16).slice(2)}_${Math.random()
    .toString(16)
    .slice(2)}`;

const EDITOR_RESERVED_KEYS = new Set([
  "_uid",
  "optionsText",
  "advancedText",
  "children",
  "options",
  "required",
  "issueSelectable",
  "defaultSelected",
  "requiredFields",
  "requiredFieldsText",
]);

const isSelectNode = (node) => {
  const src = node || {};
  return (
    String(src.componentType || "") === "select" ||
    String(src.dataType || "") === "select"
  );
};

const buildAdvancedText = (node) => {
  const src = node || {};
  const advanced = {};
  Object.keys(src).forEach((k) => {
    if (
      k === "name" ||
      k === "field" ||
      k === "dataType" ||
      k === "componentType"
    ) {
      return;
    }
    if (EDITOR_RESERVED_KEYS.has(k)) return;
    advanced[k] = src[k];
  });
  return Object.keys(advanced).length ? JSON.stringify(advanced, null, 2) : "";
};

const toSchemaArray = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  return [];
};

const validateChcChannels = (schema) => {
  const validateNodes = (nodes) => {
    for (const node of toSchemaArray(nodes)) {
      if (!node || typeof node !== "object") continue;
      if (
        node.field === "CHC" &&
        Object.prototype.hasOwnProperty.call(node, "channels")
      ) {
        if (!Array.isArray(node.channels) || node.channels.length === 0) {
          return "通道控制的 channels 必须为非空数组";
        }

        const channelNames = new Set();
        for (let index = 0; index < node.channels.length; index += 1) {
          const channel = node.channels[index] || {};
          const channelNo = Number(channel.channelNo);
          const expectedChannelNo = index + 1;
          if (!Number.isInteger(channelNo) || channelNo !== expectedChannelNo) {
            return "通道控制的通道号必须从 1 开始连续递增，不能跳号或重复";
          }

          const channelName =
            typeof channel.name === "string" ? channel.name.trim() : "";
          if (!channelName) return `通道${channelNo}的名称不能为空`;

          const channelNameKey = channelName.toLocaleLowerCase();
          if (channelNames.has(channelNameKey)) {
            return `通道名称不能重复：${channelName}`;
          }
          channelNames.add(channelNameKey);
        }
      }

      const childrenError = validateNodes(node.children);
      if (childrenError) return childrenError;
    }
    return null;
  };

  return validateNodes(schema);
};

const withUids = (schema) =>
  toSchemaArray(schema).map((node) => {
    const next = { ...(node || {}), _uid: makeUid() };
    if (["TCP", "MQTT"].includes(next.field)) {
      next.requiredFieldsText = Array.isArray(next.requiredFields)
        ? next.requiredFields.join(", ")
        : "";
    }
    if (isSelectNode(next)) {
      next.optionsText = JSON.stringify(next.options || [], null, 2);
    }
    if (Array.isArray(next.children)) {
      next.children = withUids(next.children);
    }
    next.advancedText =
      typeof next.advancedText === "string"
        ? next.advancedText
        : buildAdvancedText(next);
    return next;
  });

const cleanNode = (node) => {
  const src = node || {};
  const { _uid, optionsText, advancedText, children, requiredFieldsText, ...rest } = src;
  const next = { ...rest };
  if (isSelectNode(next)) {
    if (typeof optionsText !== "undefined") {
      let parsed = [];
      try {
        parsed = JSON.parse(optionsText || "[]");
      } catch {
        throw new Error("select.options");
      }
      if (!Array.isArray(parsed)) {
        throw new Error("select.options");
      }
      next.options = parsed;
    } else if (typeof next.options !== "undefined" && !Array.isArray(next.options)) {
      throw new Error("select.options");
    }
  } else {
    delete next.options;
  }
  if (typeof advancedText === "string" && advancedText.trim()) {
    let adv = {};
    try {
      adv = JSON.parse(advancedText || "{}");
    } catch {
      throw new Error("advanced.json");
    }
    if (!adv || typeof adv !== "object" || Array.isArray(adv)) {
      throw new Error("advanced.json");
    }
    Object.keys(adv).forEach((k) => {
      if (
        k === "name" ||
        k === "field" ||
        k === "dataType" ||
        k === "componentType"
      ) {
        return;
      }
      if (k === "required") return;
      if (k === "children" || k === "options") return;
      next[k] = adv[k];
    });
  }
  if (["TCP", "MQTT"].includes(next.field)) {
    const requiredFields = String(requiredFieldsText || "")
      .split(",")
      .map((field) => field.trim())
      .filter(Boolean);
    if (requiredFields.length) {
      next.requiredFields = [...new Set(requiredFields)];
    } else {
      delete next.requiredFields;
    }
  }
  if (Array.isArray(children)) {
    next.children = children.map(cleanNode);
  }
  return next;
};

const cleanSchema = (schema) => toSchemaArray(schema).map(cleanNode);

const moveInArray = (arr, fromIndex, toIndex) => {
  const list = Array.isArray(arr) ? [...arr] : [];
  if (
    fromIndex === toIndex ||
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= list.length ||
    toIndex >= list.length
  ) {
    return list;
  }
  const [picked] = list.splice(fromIndex, 1);
  list.splice(toIndex, 0, picked);
  return list;
};

const ParamTemplateModal = ({
  open,
  onCancel,
  onSubmit,
  initialValues,
  confirmLoading,
}) => {
  const [form] = Form.useForm();
  const [activeTab, setActiveTab] = useState("builder");
  const [builderSchema, setBuilderSchema] = useState([]);

  const syncSchemaText = (nextBuilder) => {
    try {
      const nextClean = cleanSchema(nextBuilder);
      form.setFieldsValue({
        schemaText: JSON.stringify(nextClean, null, 2),
      });
    } catch (e) {
      if (String(e?.message || "") === "advanced.json") {
        message.error("高级配置需为合法的 JSON 对象");
      } else {
        message.error("模板结构中存在不合法的 JSON 配置（如 select.options）");
      }
    }
  };

  const setBuilderAndSync = (updater) => {
    setBuilderSchema((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      syncSchemaText(next);
      return next;
    });
  };

  useEffect(() => {
    if (!open) {
      setActiveTab("builder");
      setBuilderSchema([]);
      form.resetFields();
      return;
    }
    const nextInitialValues = {
      name: initialValues?.name || "",
      productCode: initialValues?.productCode || "",
      mode:
        typeof initialValues !== "undefined" && initialValues !== null
          ? initialValues?.mode
          : "without_cd",
      schemaText: JSON.stringify(
        initialValues?.schema || defaultSchema,
        null,
        2,
      ),
      remark: initialValues?.remark || "",
    };
    form.setFieldsValue(nextInitialValues);
    setActiveTab("builder");
    const currentText = nextInitialValues.schemaText;
    let parsed = [];
    try {
      parsed = JSON.parse(currentText || "[]");
      if (!Array.isArray(parsed)) parsed = [];
    } catch {
      parsed = [];
    }
    const nextBuilder = withUids(parsed);
    setBuilderSchema(nextBuilder);
    syncSchemaText(nextBuilder);
  }, [open, initialValues, form]);

  const palette = useMemo(
    () => [
      {
        key: "group",
        title: "分组",
        create: () => ({
          _uid: makeUid(),
          name: "新分组",
          field: "",
          children: [],
        }),
      },
      {
        key: "item",
        title: "单项",
        create: () => ({
          _uid: makeUid(),
          name: "新单项",
          field: "",
          dataType: "",
        }),
      },
      {
        key: "select",
        title: "下拉选择",
        create: () => ({
          _uid: makeUid(),
          name: "新下拉",
          field: "",
          componentType: "select",
          optionsText: "[]",
        }),
      },
      {
        key: "groupPackage",
        title: "组包",
        create: () => ({
          _uid: makeUid(),
          name: "新组包",
          field: "",
          componentType: "groupPackage",
          dataType: "groupPackage",
          children: [],
        }),
      },
    ],
    [],
  );

  const createFromPalette = (kind) => {
    const hit = palette.find((p) => p.key === kind);
    return hit ? hit.create() : null;
  };

  const updateNodeByUid = (nodes, uid, updater) => {
    const list = Array.isArray(nodes) ? nodes : [];
    return list.map((n) => {
      if (!n) return n;
      if (n._uid === uid) return updater(n);
      if (Array.isArray(n.children)) {
        return { ...n, children: updateNodeByUid(n.children, uid, updater) };
      }
      return n;
    });
  };

  const removeNodeByUid = (nodes, uid) => {
    const list = Array.isArray(nodes) ? nodes : [];
    const filtered = list.filter((n) => n && n._uid !== uid);
    return filtered.map((n) => {
      if (!n) return n;
      if (Array.isArray(n.children)) {
        return { ...n, children: removeNodeByUid(n.children, uid) };
      }
      return n;
    });
  };

  const renderNodeEditor = (node, level = 0) => {
    const isGroup = Array.isArray(node.children);
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Input
            value={node.name || ""}
            placeholder="名称"
            style={{ flex: 1, minWidth: 160 }}
            onChange={(e) => {
              const v = e.target.value;
              setBuilderAndSync((prev) =>
                updateNodeByUid(prev, node._uid, (x) => ({ ...x, name: v })),
              );
            }}
          />
          <Input
            value={node.field || ""}
            placeholder="字段(field)"
            style={{ width: 160 }}
            onChange={(e) => {
              const v = e.target.value;
              setBuilderAndSync((prev) =>
                updateNodeByUid(prev, node._uid, (x) => ({ ...x, field: v })),
              );
            }}
          />
          <Input
            value={node.componentType || ""}
            placeholder="组件(componentType，可选)"
            style={{ width: 200 }}
            onChange={(e) => {
              const v = e.target.value;
              setBuilderAndSync((prev) =>
                updateNodeByUid(prev, node._uid, (x) => {
                  const next = { ...x, componentType: v || undefined };
                  if (isSelectNode({ ...next, componentType: v || undefined })) {
                    next.optionsText =
                      typeof next.optionsText === "string"
                        ? next.optionsText
                        : JSON.stringify(next.options || [], null, 2);
                  } else {
                    delete next.optionsText;
                  }
                  return next;
                }),
              );
            }}
          />
          <Input
            value={node.dataType || ""}
            placeholder="数据类型(dataType，可选)"
            style={{ width: 200 }}
            onChange={(e) => {
              const v = e.target.value;
              setBuilderAndSync((prev) =>
                updateNodeByUid(prev, node._uid, (x) => {
                  const next = { ...x, dataType: v };
                  if (isSelectNode(next)) {
                    next.optionsText =
                      typeof next.optionsText === "string"
                        ? next.optionsText
                        : JSON.stringify(next.options || [], null, 2);
                  } else {
                    delete next.optionsText;
                  }
                  return next;
                }),
              );
            }}
          />
        </div>

        {!isGroup ? (
          <>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Typography.Text>是否必填：</Typography.Text>
            <Switch
              size="small"
              checked={node?.required !== false}
              onChange={(checked) => {
                setBuilderAndSync((prev) =>
                  updateNodeByUid(prev, node._uid, (x) => {
                    const next = { ...(x || {}) };
                    if (checked) {
                      delete next.required;
                    } else {
                      next.required = false;
                    }
                    return next;
                  }),
                );
              }}
            />
          </div>
          {["TCP", "MQTT"].includes(node.field) ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Typography.Text>允许单独选择下发</Typography.Text>
                <Switch
                  size="small"
                  checked={node?.issueSelectable !== false}
                  onChange={(checked) =>
                    setBuilderAndSync((prev) =>
                      updateNodeByUid(prev, node._uid, (x) => ({
                        ...(x || {}),
                        issueSelectable: checked,
                      })),
                    )
                  }
                />
                <Typography.Text>默认选择</Typography.Text>
                <Switch
                  size="small"
                  disabled={node?.issueSelectable === false}
                  checked={node?.defaultSelected === true}
                  onChange={(checked) =>
                    setBuilderAndSync((prev) =>
                      updateNodeByUid(prev, node._uid, (x) => ({
                        ...(x || {}),
                        defaultSelected: checked,
                      })),
                    )
                  }
                />
              </div>
              <Input
                value={node.requiredFieldsText || ""}
                placeholder={
                  node.field === "TCP"
                    ? "启用后必填字段，例如：PT, IP"
                    : "启用后必填字段，例如：USR, KEY, CR, ID, PUB.QOS, PUB.NM, SUB.QOS, SUB.NM"
                }
                onChange={(e) => {
                  const value = e.target.value;
                  setBuilderAndSync((prev) =>
                    updateNodeByUid(prev, node._uid, (x) => ({
                      ...(x || {}),
                      requiredFieldsText: value,
                    })),
                  );
                }}
              />
            </div>
          ) : null}
          </>
        ) : null}

        {isSelectNode(node) ? (
          <Input.TextArea
            value={node.optionsText || "[]"}
            placeholder='options(JSON数组)，如：[{"label":"A","value":"1"}]'
            rows={4}
            style={{ fontFamily: "monospace" }}
            onChange={(e) => {
              const v = e.target.value;
              setBuilderAndSync((prev) =>
                updateNodeByUid(prev, node._uid, (x) => ({
                  ...x,
                  optionsText: v,
                })),
              );
            }}
          />
        ) : null}

        <Input.TextArea
          value={typeof node.advancedText === "string" ? node.advancedText : ""}
          placeholder='其它字段(JSON对象)，如：{\"placeholder\":\"...\",\"rules\":[...]}'
          rows={4}
          style={{ fontFamily: "monospace" }}
          onChange={(e) => {
            const v = e.target.value;
            setBuilderAndSync((prev) =>
              updateNodeByUid(prev, node._uid, (x) => ({
                ...x,
                advancedText: v,
              })),
            );
          }}
        />

        {isGroup ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                try {
                  const raw = e.dataTransfer.getData("application/json");
                  const payload = JSON.parse(raw || "{}");
                  if (payload?.type !== "palette") return;
                  const child = createFromPalette(String(payload.kind || ""));
                  if (!child) return;
                  setBuilderAndSync((prev) =>
                    updateNodeByUid(prev, node._uid, (x) => ({
                      ...x,
                      children: [
                        ...(Array.isArray(x.children) ? x.children : []),
                        child,
                      ],
                    })),
                  );
                } catch {}
              }}
              style={{
                padding: "8px 10px",
                border: "1px dashed #d9d9d9",
                borderRadius: 6,
                color: "#8c8c8c",
                background: "#fafafa",
              }}
            >
              拖到这里新增子项
            </div>

            {(node.children || []).map((c) => (
              <Card
                key={c._uid}
                size="small"
                bodyStyle={{ padding: 10 }}
                style={{ borderRadius: 6 }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <HolderOutlined />
                  <Typography.Text style={{ flex: 1 }}>
                    {c.name || "未命名"}（{c.field || "无字段"}）
                  </Typography.Text>
                  <Button
                    size="small"
                    danger
                    type="text"
                    icon={<DeleteOutlined />}
                    onClick={() => {
                      setBuilderAndSync((prev) =>
                        removeNodeByUid(prev, c._uid),
                      );
                    }}
                  />
                </div>
                <div style={{ marginTop: 8 }}>
                  {renderNodeEditor(c, level + 1)}
                </div>
              </Card>
            ))}
          </div>
        ) : null}
      </div>
    );
  };

  const builderItems = useMemo(
    () =>
      builderSchema.map((item, index) => {
        const isGroup = Array.isArray(item.children);
        const header = (
          <div
            draggable
            onDragStart={(e) => {
              e.dataTransfer.effectAllowed = "move";
              e.dataTransfer.setData(
                "application/json",
                JSON.stringify({ type: "top", fromIndex: index }),
              );
            }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              try {
                const raw = e.dataTransfer.getData("application/json");
                const payload = JSON.parse(raw || "{}");
                if (payload?.type === "top") {
                  const fromIndex = Number(payload.fromIndex);
                  const toIndex = index;
                  if (Number.isNaN(fromIndex) || fromIndex === toIndex) return;
                  setBuilderAndSync((prev) =>
                    moveInArray(prev, fromIndex, toIndex),
                  );
                  return;
                }
                if (payload?.type === "palette") {
                  const node = createFromPalette(String(payload.kind || ""));
                  if (!node) return;
                  setBuilderAndSync((prev) => {
                    const next = [...prev];
                    next.splice(index, 0, node);
                    return next;
                  });
                }
              } catch {}
            }}
            style={{ display: "flex", alignItems: "center", gap: 8 }}
          >
            <HolderOutlined />
            <span style={{ flex: 1 }}>
              {isGroup ? "分组" : "单项"}：{item.name || "未命名"}（
              {item.field || "无字段"}）
            </span>
          </div>
        );
        return {
          key: item._uid,
          label: header,
          extra: (
            <Button
              size="small"
              danger
              type="text"
              icon={<DeleteOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                setBuilderAndSync((prev) => removeNodeByUid(prev, item._uid));
              }}
            />
          ),
          children: renderNodeEditor(item),
        };
      }),
    [builderSchema, palette],
  );

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      let schema = [];
      try {
        schema = JSON.parse(values.schemaText || "[]");
        if (!Array.isArray(schema)) {
          throw new Error();
        }
      } catch {
        form.setFields([
          {
            name: "schemaText",
            errors: ["模板结构需为合法的数组 JSON"],
          },
        ]);
        return;
      }
      const chcChannelsError = validateChcChannels(schema);
      if (chcChannelsError) {
        form.setFields([
          {
            name: "schemaText",
            errors: [chcChannelsError],
          },
        ]);
        return;
      }
      const payload = {
        name: values.name?.trim(),
        productCode: values.productCode?.trim(),
        mode: values.mode,
        remark: values.remark?.trim(),
        schema,
      };
      await onSubmit?.(payload);
    } catch {}
  };

  const handleCancel = () => {
    setActiveTab("builder");
    setBuilderSchema([]);
    form.resetFields();
    onCancel?.();
  };

  return (
    <Modal
      title={initialValues ? "编辑模板" : "新建模板"}
      open={open}
      onOk={handleOk}
      onCancel={handleCancel}
      confirmLoading={confirmLoading}
      width={800}
      maskClosable={false}
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="name"
          label="模板名称"
          rules={[{ required: true, message: "请输入模板名称" }]}
        >
          <Input placeholder="如：地下水RTU默认模板" />
        </Form.Item>
        <Form.Item
          name="productCode"
          label="产品编码"
          extra="与设备的 productCode 一致时生效；产品编码与模板模式组合不可重复"
          rules={[{ required: true, message: "请输入产品编码" }]}
        >
          <Input placeholder="如：RTDS" />
        </Form.Item>
        <Form.Item
          name="mode"
          label="模板模式"
          extra="without_cd（设备参数配置） | with_cd（下发指令）"
          rules={[{ required: true, message: "请选择模板模式" }]}
        >
          <Select
            placeholder="请选择模板模式"
            options={[
              { value: "without_cd", label: "without_cd（设备参数配置）" },
              { value: "with_cd", label: "with_cd（下发指令）" },
            ]}
          />
        </Form.Item>
        <Tabs
          activeKey={activeTab}
          onChange={(key) => {
            if (key === "builder") {
              const currentText = form.getFieldValue("schemaText");
              let parsed = [];
              try {
                parsed = JSON.parse(currentText || "[]");
                if (!Array.isArray(parsed)) parsed = [];
              } catch {
                message.error("当前 JSON 不合法，无法切换到拖拽编辑");
                return;
              }
              const nextBuilder = withUids(parsed);
              setBuilderSchema(nextBuilder);
              syncSchemaText(nextBuilder);
              setActiveTab("builder");
              return;
            }
            setActiveTab(key);
          }}
          items={[
            {
              key: "builder",
              label: "拖拽编辑",
              children: (
                <div style={{ display: "flex", gap: 12 }}>
                  <div style={{ width: 220, flex: "0 0 220px" }}>
                    <Card
                      title="组件库"
                      size="small"
                      bodyStyle={{ padding: 10 }}
                      style={{ borderRadius: 8 }}
                    >
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 8,
                        }}
                      >
                        {palette.map((p) => (
                          <div
                            key={p.key}
                            draggable
                            onDragStart={(e) => {
                              e.dataTransfer.effectAllowed = "copy";
                              e.dataTransfer.setData(
                                "application/json",
                                JSON.stringify({
                                  type: "palette",
                                  kind: p.key,
                                }),
                              );
                            }}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                              padding: "8px 10px",
                              border: "1px solid #f0f0f0",
                              borderRadius: 6,
                              cursor: "grab",
                              userSelect: "none",
                            }}
                          >
                            <HolderOutlined />
                            <span style={{ flex: 1 }}>{p.title}</span>
                          </div>
                        ))}
                        <Typography.Text type="secondary">
                          拖到右侧进行添加
                        </Typography.Text>
                      </div>
                    </Card>
                  </div>

                  <div
                    style={{
                      flex: 1,
                      display: "flex",
                      flexDirection: "column",
                      gap: 10,
                    }}
                  >
                    <div
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        try {
                          const raw =
                            e.dataTransfer.getData("application/json");
                          const payload = JSON.parse(raw || "{}");
                          if (payload?.type !== "palette") return;
                          const node = createFromPalette(
                            String(payload.kind || ""),
                          );
                          if (!node) return;
                          setBuilderAndSync((prev) => [...prev, node]);
                        } catch {}
                      }}
                      style={{
                        padding: "10px 12px",
                        border: "1px dashed #d9d9d9",
                        borderRadius: 8,
                        background: "#fafafa",
                        color: "#8c8c8c",
                      }}
                    >
                      拖到这里新增顶层项（分组/单项）
                    </div>

                    <Collapse
                      items={builderItems}
                      bordered
                      style={{ background: "#fff" }}
                    />

                    <Form.Item
                      name="schemaText"
                      label="模板结构（JSON，预览）"
                      extra="数组，元素为分组对象：{ name, field, children/componentType/... }。"
                      rules={[
                        { required: true, message: "请输入模板结构JSON" },
                      ]}
                    >
                      <Input.TextArea
                        readOnly
                        style={{ height: 180, fontFamily: "monospace" }}
                        placeholder={JSON.stringify(defaultSchema, null, 2)}
                      />
                    </Form.Item>
                  </div>
                </div>
              ),
            },
            {
              key: "json",
              label: "JSON 编辑",
              children: (
                <Form.Item
                  name="schemaText"
                  label="模板结构（JSON）"
                  extra="数组，元素为分组对象：{ name, field, children/componentType/... }。"
                  rules={[{ required: true, message: "请输入模板结构JSON" }]}
                >
                  <Input.TextArea
                    style={{ height: 360, fontFamily: "monospace" }}
                    placeholder={JSON.stringify(defaultSchema, null, 2)}
                  />
                </Form.Item>
              ),
            },
          ]}
        />
        <Form.Item name="remark" label="备注">
          <Input.TextArea rows={3} />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default ParamTemplateModal;
