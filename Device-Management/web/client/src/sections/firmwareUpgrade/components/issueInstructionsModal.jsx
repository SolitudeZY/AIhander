import React, { useState, useEffect } from "react";
import { connect } from "react-redux";
import {
  Form,
  Modal,
  Checkbox,
  Switch,
  Tooltip,
  Space,
  Button,
  message,
  Card,
  Input,
  InputNumber,
  Select,
} from "antd";
import { hydrateTemplateSchema } from "../constants";
import {
  getMqttConfigLength,
  getTcpConfigLength,
} from "../constants/platformConfig";
import {
  MinusCircleOutlined,
  PlusCircleOutlined,
  PlusOutlined,
  QuestionCircleOutlined,
} from "@ant-design/icons";
import moment from "moment";
import { createSystemLog } from "../../system/actions/log";

function IssueInstructionsModal({
  actions,
  dispatch,
  open,
  onClose,
  curDevices = [],
  showTCPConfig = false,
}) {
  const { firmwareUpgrade } = actions;
  const [form] = Form.useForm();
  const [curConfig, setCurConfig] = useState([]);
  const [checkedType, setCheckedType] = useState([]);
  const [isIssue, setIsIssue] = useState(false);
  const [committing, setCommitting] = useState(false);
  // 缓存 productCode（防止下发后丢失）
  const [cachedProductCode, setCachedProductCode] = useState(null);

  // 当 curDevices 有值时缓存
  useEffect(() => {
    const code = curDevices?.[0]?.productCode;
    if (code) {
      setCachedProductCode(code);
    }
  }, [curDevices]);

  useEffect(() => {
    if (!open) {
      setCurConfig([]);
      setCheckedType([]);
      form.resetFields();
      return;
    }

    // 优先当前，其次缓存
    const code = curDevices?.[0]?.productCode || cachedProductCode;

    //  关键保护：没有 productCode 不请求
    if (!code) {
      console.warn("param resolve skipped: missing productCode");
      return;
    }

    dispatch(
      firmwareUpgrade.getParamTemplatesResolve({
        productCode: code,
        mode: "with_cd",
      }),
    )
      .then((res) => {
        const data = res?.payload?.data || {};
        const schema = data?.schema;
        if (!Array.isArray(schema) || schema.length === 0) {
          message.warning(
            "未找到相应参数模板，请检查或联系相关人员新建参数模板",
          );
          setCurConfig([]);
          return;
        }
        const normalized = [];
        schema.forEach((group) => {
          if (group?.componentType === "select") {
            const selectOptions = (group.options || []).filter(
              (o) =>
                o && typeof o.label === "string" && typeof o.value === "string",
            );
            normalized.push({ ...group, options: selectOptions });
            (group.options || [])
              .filter((o) => o && o.children && o.field)
              .forEach((o) => {
                normalized.push({
                  name: o.name || o.field,
                  field: o.field,
                  children: o.children || [],
                  componentType: o.componentType || undefined,
                  tcpConfigLength: o.tcpConfigLength,
                  mqttConfigLength: o.mqttConfigLength,
                });
              });
          } else {
            normalized.push(group);
          }
        });
        setCurConfig(hydrateTemplateSchema(normalized));
      })
      .catch(() => {
        message.error("获取模板失败，请检查并新建模板");
        setCurConfig([]);
      });
  }, [open, curDevices, cachedProductCode, dispatch, actions, form]);

  const handleOk = (isIssue = false) => {
    if (!checkedType.length) {
      message.info("请勾选要下发的参数");
      return;
    }
    setIsIssue(isIssue);
    form.submit();
  };

  const handleSubmit = (values) => {
    let configParams = {};
    checkedType.forEach((groupField) => {
      let result = {};
      const curGroup = curConfig.find((c) => c.field === groupField);

      // 安全检查：如果找不到对应的配置组，跳过处理
      if (!curGroup) {
        console.warn(`未找到字段 ${groupField} 的配置，跳过处理`);
        return;
      }

      switch (curGroup.componentType) {
        case "select":
          try {
            result = JSON.parse(values[groupField]);
          } catch (e) {
            console.warn(
              `选择项解析失败: ${groupField}, value:`,
              values[groupField],
            );
            result = {};
          }
          break;
        case "groupPackage":
          if (groupField === "SW") {
            result = `${values.moduleNo}_${values.lineLength}_${values.correctionFactor}_${values.depthThreshold}_${values.gravityAcceleration}`;
          } else if (groupField === "QY") {
            result = values.pressureCalibrationFactor;
          }
          break;
        default:
          for (let item of curGroup.children) {
            if (Object.keys(values).includes(item.field)) {
              if (item.dataType === "object") {
                try {
                  result[item.field] = values[item.field]
                    ? JSON.parse(values[item.field])
                    : {};
                } catch (e) {
                  console.error(
                    "JSON parse error:",
                    e,
                    "value:",
                    values[item.field],
                  );
                  result[item.field] = values[item.field] || {};
                }
              } else if (item.dataType === "GL") {
                result[item.field] =
                  `${values.GL.longitude}E_${values.GL.latitude}N`;
              } else if (item.dataType === "TIME") {
                // 仅在“平台时间”勾选框启用时才写入，不勾选则不下发该字段
                if (values[item.field] === true) {
                  result[item.field] = moment().format("YYYY-MM-DD HH:mm:ss");
                }
              } else if (item.field === "TCP") {
                result[item.field] = values[item.field]?.map((v, i) => ({
                  ...v,
                  EN: v.EN ? 1 : 0,
                  N: i + 1,
                }));
              } else if (item.field === "MQTT") {
                result[item.field] = {
                  CON: values[item.field]?.map((v, i) => {
                    const PUB = v.PUB?.map((v, i) => ({
                      ...v,
                      EN: v.EN ? 1 : 0,
                      N: i + 1,
                    }));
                    const SUB = v.SUB?.map((v, i) => ({
                      ...v,
                      EN: v.EN ? 1 : 0,
                      N: i + 1,
                    }));
                    return { ...v, EN: v.EN ? 1 : 0, N: i + 1, PUB, SUB };
                  }),
                };
              } else {
                if (item.field === "TF") {
                  result[item.field] = values[item.field] == true ? 0 : 1;
                } else {
                  result[item.field] = values[item.field];
                }
              }
            }
          }
          break;
      }
      configParams[groupField] = result;
    });

    // debugger
    // console.log('configParams:', configParams);
    let obj = {};
    for (let f in configParams) {
      if (f === "TF1") {
        if (configParams["BF"]) {
          obj["BF"] = Object.assign({}, configParams["BF"], {
            TF: configParams["TF1"]["TF"],
          });
        } else {
          obj["BF"] = { TF: configParams["TF1"]["TF"] };
        }
      } else {
        obj[f] = configParams[f];
      }
    }
    let data = { configParams: obj };
    // debugger
    setCommitting(true);
    const deviceCodes = curDevices.map((d) => d.deviceCode);

    dispatch(firmwareUpgrade.modifyDevice(deviceCodes.join(","), data))
      .then((res) => {
        if (res.success) {
          message.success("设备配置修改成功");
          if (isIssue) {
            // 继续下发指令
            const userInfo = window.sessionStorage.getItem("user");
            const id = userInfo ? JSON.parse(userInfo)?.userInfo?.id : null;
            dispatch(
              firmwareUpgrade.issueCommand({
                devices: deviceCodes,
                userId: id,
              }),
            )
              .then((issueRes) => {
                setCommitting(false);
                if (issueRes.success) {
                  message.success("指令下发成功");
                  try {
                    dispatch(
                      createSystemLog({
                        content: `下发指令：设备数${
                          deviceCodes.length
                        }，设备ID：${deviceCodes.join(",")}`,
                        module: "设备列表--指令下发",
                        url: window.location.href,
                        userId: id || null,
                      }),
                    );
                  } catch (e) {
                    console.warn("log error", e);
                  }
                  onClose();
                } else {
                  message.error(
                    `指令下发失败: ${issueRes.message || "未知错误"}`,
                  );
                }
              })
              .catch((err) => {
                setCommitting(false);
                message.error("指令下发过程中发生错误");
                console.error("Issue command error:", err);
              });
          } else {
            setCommitting(false);
            onClose();
          }
        } else {
          setCommitting(false);
          message.error(`设备配置修改失败: ${res.message || "未知错误"}`);
        }
      })
      .catch((err) => {
        setCommitting(false);
        message.error("设备配置修改过程中发生错误");
        console.error("Modify device error:", err);
      });
  };

  const renderTcpFields = (group, item) => {
    if (!showTCPConfig) return null;
    const maxLength = getTcpConfigLength(group);
    return (
      <Card style={{ width: 660, margin: "12px 0" }}>
        <Form.List name={item.field} initialValue={[{ EN: true }]}>
          {(fields, { add, remove }) => (
            <>
              {fields.map(({ key, name, ...restField }, i) => (
                <div key={key} style={{ display: "flex" }}>
                  <Form.Item
                    {...restField}
                    name={[name, "EN"]}
                    label={`使能`}
                    rules={[
                      {
                        required:
                          checkedType.includes(group.field) &&
                          item?.required !== false,
                        message: ``,
                      },
                    ]}
                    valuePropName="checked"
                  >
                    <Checkbox />
                  </Form.Item>
                  <Form.Item
                    {...restField}
                    name={[name, "PT"]}
                    label={`端口号`}
                    rules={[
                      {
                        required:
                          checkedType.includes(group.field) &&
                          item?.required !== false,
                        message: `请输入端口号`,
                      },
                    ]}
                  >
                    <InputNumber
                      controls={false}
                      min={0}
                      max={65535}
                      style={{ width: 80, marginRight: 16 }}
                    />
                  </Form.Item>
                  <Form.Item
                    {...restField}
                    name={[name, "IP"]}
                    label={`IP地址`}
                    rules={[
                      {
                        required:
                          checkedType.includes(group.field) &&
                          item?.required !== false,
                        message: `请输入IP地址`,
                      },
                    ]}
                  >
                    <Input style={{ width: 180, marginRight: 16 }} />
                  </Form.Item>
                  <Button
                    danger
                    icon={<MinusCircleOutlined />}
                    onClick={() => remove(name)}
                    disabled={fields.length <= 1}
                  />
                  {i === fields.length - 1 && fields.length < maxLength ? (
                    <Button
                      icon={<PlusCircleOutlined />}
                      style={{ marginLeft: 8 }}
                      onClick={() => add({ EN: true })}
                    />
                  ) : (
                    ""
                  )}
                </div>
              ))}
            </>
          )}
        </Form.List>
      </Card>
    );
  };

  const renderMqttTopicFields = (item, connectionIndex, topicType) => (
    <div>
      <Form.Item
        name={[item.field, connectionIndex, topicType, 0, "EN"]}
        label={`${topicType === "PUB" ? "发布" : "订阅"}使能`}
        valuePropName="checked"
      >
        <Checkbox />
      </Form.Item>
      <Form.Item
        name={[item.field, connectionIndex, topicType, 0, "QOS"]}
        label="消息质量等级"
      >
        <InputNumber style={{ width: 120, marginRight: 16 }} />
      </Form.Item>
      <Form.Item
        name={[item.field, connectionIndex, topicType, 0, "NM"]}
        label="主题名称"
      >
        <Input style={{ width: 120, marginRight: 16 }} />
      </Form.Item>
    </div>
  );

  const renderMqttFields = (group, item) => {
    const maxLength = getMqttConfigLength(group);

    return (
      <Form.List
        name={item.field}
        initialValue={[{ EN: true, PUB: [{ EN: false }], SUB: [{ EN: false }] }]}
      >
        {(fields, { add, remove }) => (
          <>
            {fields.map(({ key, name, ...restField }, i) => (
              <Card key={key} style={{ width: 660, margin: "12px 0" }}>
                <div style={{ display: "flex", flexWrap: "wrap" }}>
                  <Form.Item
                    {...restField}
                    name={[name, "EN"]}
                    label="使能"
                    valuePropName="checked"
                  >
                    <Checkbox />
                  </Form.Item>
                  <Form.Item {...restField} name={[name, "USR"]} label="用户名">
                    <Input style={{ width: 120, marginRight: 16 }} />
                  </Form.Item>
                  <Form.Item {...restField} name={[name, "KEY"]} label="密钥">
                    <Input style={{ width: 120, marginRight: 16 }} />
                  </Form.Item>
                  <Form.Item {...restField} name={[name, "CR"]} label="遗言">
                    <InputNumber style={{ width: 80, marginRight: 16 }} />
                  </Form.Item>
                  <Form.Item {...restField} name={[name, "ID"]} label="客户端ID">
                    <Input style={{ width: 80, marginRight: 16 }} />
                  </Form.Item>
                  <Button
                    danger
                    icon={<MinusCircleOutlined />}
                    onClick={() => remove(name)}
                    disabled={fields.length <= 1}
                  />
                  {i === fields.length - 1 && fields.length < maxLength ? (
                    <Button
                      icon={<PlusCircleOutlined />}
                      style={{ marginLeft: 8 }}
                      onClick={() =>
                        add({
                          EN: true,
                          PUB: [{ EN: false }],
                          SUB: [{ EN: false }],
                        })
                      }
                    />
                  ) : null}
                </div>
                <div style={{ marginTop: 16 }}>
                  发布主题：
                  <Card style={{ width: 520, margin: "12px 0 12px 24px" }}>
                    {renderMqttTopicFields(item, name, "PUB")}
                  </Card>
                  订阅主题：
                  <Card style={{ width: 520, margin: "12px 0 0 24px" }}>
                    {renderMqttTopicFields(item, name, "SUB")}
                  </Card>
                </div>
              </Card>
            ))}
          </>
        )}
      </Form.List>
    );
  };

  const renderFields = (group, item) => {
    switch (item.dataType) {
      case "number":
        return (
          <Form.Item
            key={`${group.field}-${item.field}`}
            name={item.field}
            label={item.name}
            rules={[
              {
                required:
                  checkedType.includes(group.field) && item?.required !== false,
                message: `请输入${item.name}`,
              },
            ]}
          >
            <InputNumber />
          </Form.Item>
        );
      case "GL":
        return (
          <Space>
            <Form.Item
              key="longitude"
              name="GL.longitude"
              label="经度（E）"
              rules={[
                {
                  required:
                    checkedType.includes(group.field) &&
                    item?.required !== false,
                  message: `请输入${item.name}`,
                },
              ]}
            >
              <InputNumber min={-180} max={180} />
            </Form.Item>
            <Form.Item
              key="latitude"
              name="GL.latitude"
              label="纬度（N）"
              rules={[
                {
                  required:
                    checkedType.includes(group.field) &&
                    item?.required !== false,
                  message: `请输入${item.name}`,
                },
              ]}
            >
              <InputNumber min={-90} max={90} />
            </Form.Item>
          </Space>
        );
      case "TIME":
        return (
          <Form.Item
            key={`${group.field}-${item.field}`}
            name={item.field}
            label={item.name}
            valuePropName="checked"
          >
            <Checkbox />
          </Form.Item>
        );
      case "select":
        return (
          <Form.Item
            key={`${group.field}-${item.field}`}
            name={item.field}
            label={item.name}
          >
            <Select
              options={item.options}
              style={{ width: 200 }}
              getPopupContainer={(trigger) => trigger.parentNode}
            />
          </Form.Item>
        );
      case "switch":
        return (
          <Form.Item
            key={`${group.field}-${item.field}`}
            name={item.field}
            label={item.name}
            rules={[
              {
                required:
                  checkedType.includes(group.field) && item?.required !== false,
                message: `请选择${item.name}`,
              },
            ]}
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
        );
      default:
        return (
          <Form.Item
            key={`${group.field}-${item.field}`}
            name={item.field}
            label={item.name}
            rules={[
              {
                required:
                  checkedType.includes(group.field) && item?.required !== false,
                message: `请输入${item.name}`,
              },
            ]}
          >
            <Input />
          </Form.Item>
        );
    }
  };
  return (
    <Modal
      title="下发指令"
      open={open}
      onOk={handleOk}
      width={720}
      onCancel={onClose}
      maskClosable={false}
      confirmLoading={committing}
      footer={
        <Space>
          <Button
            theme="solid"
            loading={committing}
            onClick={() => handleOk(true)}
          >
            下发
          </Button>
          {/* <Button theme='solid' loading={committing} onClick={() => handleOk(false)}>保存</Button> */}
        </Space>
      }
    >
      <Form onFinish={handleSubmit} form={form}>
        <Checkbox.Group
          value={checkedType}
          onChange={(v) => {
            console.log("v:", v);
            setCheckedType(v);
          }}
        >
          {curConfig.map((group) => {
            // 如果是TCP且showTCPConfig为false，则不渲染
            if (
              group.children?.some((item) => item.field === "TCP") &&
              !showTCPConfig
            ) {
              return null;
            }
            return (
              <div key={group.field}>
                <Checkbox value={group.field}>{group.name}</Checkbox>
                {group?.componentType === "select" ? (
                  <Form.Item
                    name={group.field}
                    label={group.name}
                    rules={[
                      {
                        required:
                          checkedType.includes(group.field) &&
                          group?.required !== false,
                        message: `请选择${group.name}`,
                      },
                    ]}
                    style={{ marginTop: 8, marginBottom: 16 }}
                  >
                    <Select
                      placeholder={`请选择${group.name}`}
                      options={group.options}
                      style={{ width: 200 }}
                      allowClear
                      showSearch
                      optionFilterProp="label"
                      disabled={!checkedType.includes(group.field)}
                      getPopupContainer={(trigger) => trigger.parentNode}
                    />
                  </Form.Item>
                ) : (
                  group.children?.map((item) => {
                    switch (item.field) {
                      case "TCP":
                        return renderTcpFields(group, item);
                      case "MQTT":
                        return renderMqttFields(group, item);
                      default:
                        return renderFields(group, item);
                    }
                  })
                )}
              </div>
            );
          })}
        </Checkbox.Group>
      </Form>
    </Modal>
  );
}

function mapStateToProps(state) {
  const { auth, global } = state;
  return {
    user: auth.user,
    actions: global.actions,
  };
}
export default connect(mapStateToProps)(IssueInstructionsModal);
