import React, { useState, useEffect } from "react";
import { connect } from "react-redux";
import {
  Form,
  Modal,
  Checkbox,
  Divider,
  Tooltip,
  Space,
  Button,
  message,
  Card,
  Input,
  InputNumber,
  Select,
  Switch,
} from "antd";
import { hydrateTemplateSchema } from "../constants";
import {
  getMqttConfigLength,
  getTcpConfigLength,
} from "../constants/platformConfig";
import {
  MinusCircleOutlined,
  PlusCircleOutlined,
  QuestionCircleOutlined,
} from "@ant-design/icons";
import moment from "moment";
import { createSystemLog } from "../../system/actions/log";

function DeviceConfigModal({
  actions,
  dispatch,
  open,
  onClose,
  curDevices = [],
  productCode,
  user,
}) {
  const [curConfig, setCurConfig] = useState([]);
  const { firmwareUpgrade } = actions;
  const [form] = Form.useForm();
  const tcpConfigValues = Form.useWatch("TCP", form) || [];
  const mqttConfigValues = Form.useWatch("MQTT", form) || [];
  const [isIssue, setIsIssue] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [checkedType, setCheckedType] = useState([]);
  // SER（平台配置）下的 TCP/MQTT 可独立选择下发，不能再只由 SER 的勾选状态控制。
  const [selectedPlatformItems, setSelectedPlatformItems] = useState({});
  const [deviceConfCache, setDeviceConfCache] = useState();
  const [mqttPubEnList, setMqttPubEnList] = useState(new Map());
  const [mqttSubEnList, setMqttSubEnList] = useState(new Map());
  const [aicamEnList, setAicamEnList] = useState(new Map());
  const [chfEnabled, setChfEnabled] = useState(false);
  const [triggerEnabled, setTriggerEnabled] = useState(false); // QJNB触发功能开关状态
  const [chcCheckedChannels, setChcCheckedChannels] = useState([]);

  const resolvedProductCode =
    curDevices?.[0]?.productCode ||
    curDevices?.[0]?.productLibrary?.productCode ||
    productCode;

  const isDvjc = resolvedProductCode === "DYJC";
  const shouldConvertUdrToSeconds = ["DYJC", "SPBR", "SPSC"].includes(
    resolvedProductCode,
  );

  const normalizeTemplateSchema = (base) => {
    const normalized = [];
    (base || []).forEach((group) => {
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
              channelCount: o.channelCount,
              channels: o.channels,
              statusOptions: o.statusOptions,
            });
          });
      } else {
        normalized.push(group);
      }
    });
    return normalized;
  };

  useEffect(() => {
    if (!open) {
      setCurConfig([]);
      setCheckedType([]);
      setSelectedPlatformItems({});
      form.resetFields();
      return;
    }
    const code = resolvedProductCode;
    if (!code) {
      message.warning("未识别到设备编码，请联系相关人员");
      setCurConfig([]);
      return;
    }

    let canceled = false;
    dispatch(
      firmwareUpgrade.getParamTemplatesResolve({
        productCode: code,
        mode: "without_cd",
      }),
    )
      .then((res) => {
        if (canceled) return;
        const data = res?.payload?.data || {};
        const schema = data?.schema;
        if (!Array.isArray(schema) || schema.length === 0) {
          message.warning(
            "未找到相应参数模板，请检查或联系相关人员新建参数模板",
          );
          setCurConfig([]);
          return;
        }
        setCurConfig(hydrateTemplateSchema(normalizeTemplateSchema(schema)));
      })
      .catch(() => {
        if (canceled) return;
        message.error("获取参数模板失败，请检查或联系相关人员新建参数模板");
        setCurConfig([]);
      });

    return () => {
      canceled = true;
    };
  }, [open, resolvedProductCode]);

  // 未配置 tcpConfigLength 的历史模板继续沿用产品编码限制。
  const legacyTcpConfigLength =
    productCode === "QJNB"
      ? 1
      : productCode === "YTJD" || productCode === "SPMX"
        ? 2
        : 5; // 根据产品编码设置TCP字段长度
  const sixDecimalRule = (_, value) => {
    if (value === undefined || value === null || value === "") {
      return Promise.resolve();
    }
    const strValue = String(value);
    if (!/^-?\d+(\.\d+)?$/.test(strValue)) {
      return Promise.reject(new Error("请输入有效数字"));
    }
    const decimalPart = strValue.split(".")[1];
    if (decimalPart && decimalPart.length > 6) {
      return Promise.reject(new Error("系数最多6位小数"));
    }
    return Promise.resolve();
  };

  const isPlatformConfigItem = (group, item) =>
    group?.field === "SER" && ["TCP", "MQTT"].includes(item?.field);

  const isPlatformItemSelectable = (group, item) =>
    isPlatformConfigItem(group, item) && item?.issueSelectable !== false;

  const getDefaultPlatformItems = (groups = curConfig) => {
    const platformGroup = (groups || []).find((group) => group?.field === "SER");
    return (platformGroup?.children || [])
      .filter(
        (item) =>
          isPlatformItemSelectable(platformGroup, item) &&
          item?.defaultSelected === true,
      )
      .map((item) => item.field);
  };

  const isPlatformItemSelected = (group, item) => {
    if (!isPlatformItemSelectable(group, item)) return true;
    return (selectedPlatformItems[group.field] || []).includes(item.field);
  };

  const isPlatformFieldRequired = (
    group,
    item,
    field,
    connectionEnabled = true,
  ) => {
    if (!checkedType.includes(group.field) || !connectionEnabled) return false;
    if (!isPlatformItemSelected(group, item) || item?.required === false) {
      return false;
    }
    const defaultRequiredFields =
      item?.field === "TCP"
        ? ["PT", "IP"]
        : ["USR", "KEY", "CR", "ID", "PUB.QOS", "PUB.NM", "SUB.QOS", "SUB.NM"];
    const requiredFields = Array.isArray(item?.requiredFields)
      ? item.requiredFields
      : defaultRequiredFields;
    return requiredFields.includes(field);
  };

  const togglePlatformItem = (group, item, selected) => {
    setSelectedPlatformItems((previous) => {
      const current = previous[group.field] || [];
      const next = selected
        ? [...new Set([...current, item.field])]
        : current.filter((field) => field !== item.field);
      return { ...previous, [group.field]: next };
    });
    if (selected && !checkedType.includes(group.field)) {
      setCheckedType((previous) => [...previous, group.field]);
    }
  };

  const renderPlatformItem = (group, item, content) => {
    if (!isPlatformItemSelectable(group, item)) return content;
    const selected = isPlatformItemSelected(group, item);
    const groupSelected = checkedType.includes(group.field);
    return (
      <div key={`${group.field}-${item.field}-selection`} style={{ marginTop: 12 }}>
        <Checkbox
          checked={selected}
          disabled={!groupSelected}
          onChange={(event) => togglePlatformItem(group, item, event.target.checked)}
        >
          下发{item.name || item.field}配置
        </Checkbox>
        {selected ? content : null}
      </div>
    );
  };

  const hasEmptyPlatformSelection = () => {
    if (!checkedType.includes("SER")) return false;
    const platformGroup = curConfig.find((group) => group?.field === "SER");
    const selectableItems = (platformGroup?.children || []).filter((item) =>
      isPlatformItemSelectable(platformGroup, item),
    );
    return (
      selectableItems.length > 0 &&
      !(selectedPlatformItems.SER || []).some((field) =>
        selectableItems.some((item) => item.field === field),
      )
    );
  };

  useEffect(() => {
    if (open) {
      let data = localStorage.getItem("deviceConfCache");

      let withOutCasheConf = {
        TCP: [{ EN: true }],
        MQTT: [{ EN: true, PUB: [{ EN: false }], SUB: [{ EN: false }] }],
      };
      if (data) {
        let d = JSON.parse(data);
        let curObj = d.find(
          (item) => item.deviceId == curDevices?.[0]?.deviceCode,
        );
        if (curObj) {
          setCheckedType(curObj.checkedType);
          // 旧缓存没有二级选择信息，保持原有“勾选平台配置即下发全部”的行为，避免升级后意外漏发。
          setSelectedPlatformItems(
            curObj.selectedPlatformItems ||
              (curObj.checkedType?.includes("SER")
                ? { SER: ["TCP", "MQTT"] }
                : { SER: getDefaultPlatformItems() }),
          );
          // 处理TCA类型的缓存回显
          const processedRecoveryParams = { ...curObj.recoveryParams };
          if (isDvjc) {
            const tcp = Array.isArray(processedRecoveryParams?.TCP)
              ? processedRecoveryParams.TCP
              : withOutCasheConf.TCP;
            processedRecoveryParams.TCP = (
              tcp && tcp.length ? tcp : withOutCasheConf.TCP
            ).slice(0, 1);
          }

          // 遍历当前配置，找到TCA类型的字段并处理
          curConfig.forEach((group) => {
            group.children?.forEach((item) => {
              if (item.dataType === "TCA") {
                if (curObj.recoveryParams[`${item.field}_a`] !== undefined) {
                  processedRecoveryParams[`${item.field}_a`] =
                    curObj.recoveryParams[`${item.field}_a`];
                  processedRecoveryParams[`${item.field}_b`] =
                    curObj.recoveryParams[`${item.field}_b`];
                  processedRecoveryParams[`${item.field}_c`] =
                    curObj.recoveryParams[`${item.field}_c`];
                } else if (curObj.recoveryParams[item.field]) {
                  const tcaValue = curObj.recoveryParams[item.field];
                  if (typeof tcaValue === "string" && tcaValue.includes("_")) {
                    const parts = tcaValue.split("_");
                    processedRecoveryParams[`${item.field}_a`] =
                      parseFloat(parts[0]) || 0;
                    processedRecoveryParams[`${item.field}_b`] =
                      parseFloat(parts[1]) || 0;
                    processedRecoveryParams[`${item.field}_c`] =
                      parseFloat(parts[2]) || 0;
                  }
                }
              }
            });
          });

          setDeviceConfCache(processedRecoveryParams);
          // 同步表单初始值（确保 Form.List 展示默认项）
          form.setFieldsValue({
            TCP:
              processedRecoveryParams?.TCP &&
              Array.isArray(processedRecoveryParams.TCP)
                ? processedRecoveryParams.TCP
                : withOutCasheConf.TCP,
            MQTT:
              processedRecoveryParams?.MQTT &&
              Array.isArray(processedRecoveryParams.MQTT)
                ? processedRecoveryParams.MQTT
                : withOutCasheConf.MQTT,
            ...processedRecoveryParams,
          });

          // 初始化MQTT发布/订阅主题的启用状态
          const pubMap = new Map();
          const subMap = new Map();
          curObj.recoveryParams?.MQTT?.forEach((mqttItem, mqttIndex) => {
            mqttItem.PUB?.forEach((pubItem, pubIndex) => {
              pubMap.set(`MQTT[${mqttIndex}].PUB[${pubIndex}].EN`, pubItem.EN);
            });
            mqttItem.SUB?.forEach((subItem, subIndex) => {
              subMap.set(`MQTT[${mqttIndex}].SUB[${subIndex}].EN`, subItem.EN);
            });
          });
          setMqttPubEnList(pubMap);
          setMqttSubEnList(subMap);
          // AICAM EN 恢复
          const aicamMap = new Map();
          curObj.recoveryParams?.AICAM?.forEach((aicamItem, aicamIndex) => {
            aicamMap.set(`AICAM[${aicamIndex}].EN`, aicamItem.EN);
          });
          setAicamEnList(aicamMap);

          // CHF_ENABLED
          if (curObj.recoveryParams?.CHF_ENABLED !== undefined) {
            setChfEnabled(curObj.recoveryParams.CHF_ENABLED);
          }

          // QJNB设备初始化TR触发功能状态
          if (
            productCode === "QJNB" &&
            curObj.recoveryParams?.TR !== undefined
          ) {
            // TR值可能是boolean (true/false) 或数字 (0/1)
            // 0或true表示开启，1或false表示关闭
            const trValue = curObj.recoveryParams.TR;
            setTriggerEnabled(trValue === 0 || trValue === true);
          }
        } else {
          const nextDefault = isDvjc
            ? { ...withOutCasheConf, TCP: withOutCasheConf.TCP.slice(0, 1) }
            : withOutCasheConf;
          setDeviceConfCache(nextDefault);
          setSelectedPlatformItems({ SER: getDefaultPlatformItems() });
          // 无缓存时写入默认表单值
          form.setFieldsValue(nextDefault);
          // 初始化默认的发布/订阅启用状态为未勾选
          const pubMap = new Map();
          pubMap.set(`MQTT[0].PUB[0].EN`, false);
          setMqttPubEnList(pubMap);
          const subMap = new Map();
          subMap.set(`MQTT[0].SUB[0].EN`, false);
          setMqttSubEnList(subMap);
          // QJNB设备初始化TR触发功能状态为关闭
          if (productCode === "QJNB") {
            setTriggerEnabled(false);
          }
          setChcCheckedChannels([]);
        }
      } else {
        const nextDefault = isDvjc
          ? { ...withOutCasheConf, TCP: withOutCasheConf.TCP.slice(0, 1) }
          : withOutCasheConf;
        setDeviceConfCache(nextDefault);
        setSelectedPlatformItems({ SER: getDefaultPlatformItems() });
        // 首次打开时写入默认表单值
        form.setFieldsValue(nextDefault);
        // 初始化默认的发布/订阅启用状态为未勾选
        const pubMap = new Map();
        pubMap.set(`MQTT[0].PUB[0].EN`, false);
        setMqttPubEnList(pubMap);
        const subMap = new Map();
        subMap.set(`MQTT[0].SUB[0].EN`, false);
        setMqttSubEnList(subMap);
        // QJNB设备初始化TR触发功能状态为关闭
        if (productCode === "QJNB") {
          setTriggerEnabled(false);
        }
        setChcCheckedChannels([]);
      }
    }
  }, [open, curConfig, productCode, isDvjc]);
  // 更新MQTT发布主题启用状态的函数
  const updateMqttPubEnList = (fieldPath, isEnabled) => {
    setMqttPubEnList((prev) => {
      const newMap = new Map(prev);
      newMap.set(fieldPath, isEnabled);
      return newMap;
    });
  };
  // 更新MQTT订阅主题启用状态的函数
  const updateMqttSubEnList = (fieldPath, isEnabled) => {
    setMqttSubEnList((prev) => {
      const newMap = new Map(prev);
      newMap.set(fieldPath, isEnabled);
      return newMap;
    });
  };
  const updateAicamEnList = (fieldPath, isEnabled) => {
    setAicamEnList((prev) => {
      const newMap = new Map(prev);
      newMap.set(fieldPath, isEnabled);
      return newMap;
    });
  };
  const pruneEmptyValues = (input) => {
    const prune = (v) => {
      if (v === null || v === undefined) return undefined;
      if (typeof v === "string" && v.trim() === "") return undefined;
      if (Array.isArray(v)) {
        const nextArr = v.map(prune).filter((x) => x !== undefined);
        return nextArr;
      }
      if (typeof v === "object") {
        const nextObj = {};
        Object.keys(v).forEach((k) => {
          const nextVal = prune(v[k]);
          if (nextVal === undefined) return;
          nextObj[k] = nextVal;
        });
        return nextObj;
      }
      return v;
    };
    return prune(input);
  };

  const getChcChannelDefinitions = (item) => {
    // 新模板可配置 channels，例如：[{ channelNo: 1, name: "主电源" }]。
    // 未配置时继续兼容 channelCount 和历史设备的 4 通道默认值。
    const configuredChannels = Array.isArray(item?.channels)
      ? item.channels.reduce((channels, channel) => {
          const channelNo = Number(channel?.channelNo);
          if (
            !Number.isInteger(channelNo) ||
            channelNo <= 0 ||
            channels.some((entry) => entry.channelNo === channelNo)
          ) {
            return channels;
          }
          const configuredName =
            typeof channel?.name === "string" ? channel.name.trim() : "";
          channels.push({
            channelNo,
            name: configuredName || `通道${channelNo}`,
          });
          return channels;
        }, [])
      : [];
    if (configuredChannels.length > 0) return configuredChannels;

    const channelCount = Number(item?.channelCount);
    const count =
      Number.isInteger(channelCount) && channelCount > 0
        ? channelCount
        : 4;
    return Array.from({ length: count }, (_, index) => ({
      channelNo: index + 1,
      name: `通道${index + 1}`,
    }));
  };

  const getChcChannels = (item) =>
    getChcChannelDefinitions(item).map((channel) => channel.channelNo);

  const getChcStatusOptions = (item) => {
    const configuredOptions = Array.isArray(item?.statusOptions)
      ? item.statusOptions.reduce((options, option) => {
          const label =
            typeof option?.label === "string" ? option.label.trim() : "";
          const value = Number(option?.value);
          if (
            !label ||
            !Number.isFinite(value) ||
            options.some((entry) => entry.value === value)
          ) {
            return options;
          }
          options.push({ label, value });
          return options;
        }, [])
      : [];

    return configuredOptions.length > 0
      ? configuredOptions
      : [
          { label: "关闭", value: 0 },
          { label: "开启", value: 1 },
          { label: "重启", value: 2 },
        ];
  };

  const buildChcValue = (values = {}, channels = []) =>
    channels.map((channel) => ({
      N: channel,
      OP: Number(values[`CHC_OP_${channel}`] ?? 0),
    }));

  const renderChcFields = (group, item) => {
    const checked = checkedType.includes(group.field);
    const chcChannelDefinitions = getChcChannelDefinitions(item);
    const chcChannels = chcChannelDefinitions.map(
      (channel) => channel.channelNo,
    );
    const chcStatusOptions = getChcStatusOptions(item);
    const selectedChannels = chcCheckedChannels.filter((channel) =>
      chcChannels.includes(channel),
    );
    const chcValue = buildChcValue(
      form.getFieldsValue(true),
      selectedChannels,
    );
    const allChecked = chcChannels.length > 0 && chcChannels.every((channel) =>
      selectedChannels.includes(channel),
    );
    return (
      <Card
        key={`${group.field}-${item.field}`}
        title={item.name}
        style={{
          width: 700,
          margin: "12px 0",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
        }}
      >
        <Space direction="vertical" size={12} style={{ width: "100%" }}>
          <Checkbox
            checked={allChecked}
            indeterminate={
              selectedChannels.length > 0 &&
              selectedChannels.length < chcChannels.length
            }
            onChange={(e) => {
              if (e.target.checked) {
                setChcCheckedChannels(chcChannels);
                return;
              }
              setChcCheckedChannels([]);
            }}
            disabled={!checked}
          >
            全选 / 反选
          </Checkbox>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {chcChannelDefinitions.map(({ channelNo: channel, name }) => {
              const rowChecked = selectedChannels.includes(channel);
              return (
                <div
                  key={`CHC_ROW_${channel}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "8px 12px",
                    border: "1px solid #f0f0f0",
                    borderRadius: 6,
                  }}
                >
                  <Checkbox
                    checked={rowChecked}
                    disabled={!checked}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setChcCheckedChannels((prev) =>
                          [...prev, channel].sort((a, b) => a - b),
                        );
                        return;
                      }
                      setChcCheckedChannels((prev) =>
                        prev.filter((itemChannel) => itemChannel !== channel),
                      );
                    }}
                  >
                    {name}
                  </Checkbox>

                  <Form.Item
                    key={`CHC_OP_${channel}`}
                    name={`CHC_OP_${channel}`}
                    label="通道状态"
                    initialValue={
                      Array.isArray(deviceConfCache?.CHC)
                        ? deviceConfCache.CHC.find((v) => v?.N === channel)?.OP
                        : undefined
                    }
                    rules={[
                      {
                        required: checked && rowChecked,
                        message: `请选择${name}状态`,
                      },
                    ]}
                    style={{ marginBottom: 0 }}
                  >
                    <Select
                      style={{ width: 180 }}
                      placeholder={`请选择${name}状态`}
                      options={chcStatusOptions}
                      getPopupContainer={(trigger) => trigger.parentNode}
                      disabled={!checked}
                    />
                  </Form.Item>
                </div>
              );
            })}
          </div>
        </Space>
      </Card>
    );
  };

  const handleParams = (values) => {
    const normalizeEnumValue = (v) => {
      if (typeof v !== "string") return v;
      const t = v.trim();
      if (!t) return v;
      if (/^-?\d+(\.\d+)?$/.test(t)) return Number(t);
      return v;
    };
    let configParams = {};
    checkedType.forEach((groupField) => {
      let result = {};
      const curGroup = curConfig.find((c) => c.field === groupField);
      if (!curGroup) return;
      switch (curGroup.componentType) {
        case "select":
          result = JSON.parse(values[groupField]);
          break;
        case "groupPackage":
          if (groupField === "SW") {
            // 处理SW（水位计）的嵌套groupPackage结构
            const swResult = {};
            const subGroups = curGroup.children || [];

            subGroups.forEach((subGroup) => {
              if (subGroup.dataType === "groupPackage") {
                const subGroupData = {};
                Object.keys(values).forEach((key) => {
                  // 匹配格式：SW-BA-moduleNo 或 SW-XS-moduleNo
                  const prefix = `${groupField}-${subGroup.field}-`;
                  if (key.startsWith(prefix)) {
                    const actualFieldName = key.replace(prefix, "");
                    subGroupData[actualFieldName] = values[key];
                  }
                });

                if (Object.keys(subGroupData).length > 0) {
                  const joinNonEmptyFields = (fieldValues) =>
                    fieldValues
                      .filter((value) => value !== undefined && value !== null && value !== "")
                      .join("_");

                  // 根据subGroup.field组合成字符串
                  if (subGroup.field === "BA") {
                    // BA组合规则：模块号_线长(m)_修正系数_埋深阈值（m）_重力加速度_修正气压（hPa）
                    const baString = joinNonEmptyFields([
                      subGroupData.moduleNo,
                      subGroupData.lineLength,
                      subGroupData.correctionFactor,
                      subGroupData.depthThreshold,
                      subGroupData.gravityAcceleration,
                      subGroupData.pressureCorrection,
                    ]);
                    if (baString) {
                      swResult[subGroup.field] = baString;
                    }
                  } else if (subGroup.field === "XS") {
                    // XS组合规则：模块号_线长(m)_埋深阈值（m）_二次项水位修正系数_一次项水位修正系数_水位修正常量_二次项水温修正系数_一次项水温修正系数_水温修正常量
                    const xsString = joinNonEmptyFields([
                      subGroupData.moduleNo,
                      subGroupData.lineLength,
                      subGroupData.depthThreshold,
                      subGroupData.correctionFactorSecondaryItem,
                      subGroupData.correctionFactor1,
                      subGroupData.correctionConstant1,
                      subGroupData.waterTemperatureSecondaryItem,
                      subGroupData.waterTemperature1,
                      subGroupData.waterTemperatureConstant,
                    ]);
                    if (xsString) {
                      swResult[subGroup.field] = xsString;
                    }
                  }
                }
              }
            });
            result = swResult;
          } else {
            // 处理其他groupPackage类型
            const groupResult = {};
            Object.keys(values).forEach((key) => {
              if (key.startsWith(`${groupField}-`)) {
                const actualFieldName = key.replace(`${groupField}-`, "");
                groupResult[actualFieldName] = values[key];
              }
            });
            result = groupResult;
          }
          break;
        default:
          // 特殊处理QY（气压计），将字段值拼接为下划线字符串
          if (groupField === "QY") {
            const qyValues = [];
            (curGroup.children || []).forEach((child) => {
              const fieldValue = values[child.field];
              qyValues.push(fieldValue ?? "");
            });
            result = qyValues.join("_");
          } else {
            const valueKeys = Object.keys(values);
            const isDcmMcf =
              groupField === "MCF" &&
              ["DCM2", "DCM3"].includes(resolvedProductCode);
            // 处理普通的子字段
            for (let item of curGroup.children || []) {
              // 平台配置按二级选择项组包。未勾选的 TCP/MQTT 即使表单中保留了默认值或缓存，
              // 也绝不能进入下发报文。
              if (
                isPlatformItemSelectable(curGroup, item) &&
                !isPlatformItemSelected(curGroup, item)
              ) {
                continue;
              }
              if (item.dataType === "groupPackage") {
                const prefix = `${groupField}-${item.field}-`;
                const groupData = {};
                const childDefs = item.children || [];
                const childDefMap = new Map(childDefs.map((d) => [d.field, d]));
                valueKeys.forEach((key) => {
                  if (!key.startsWith(prefix)) return;
                  const actualFieldName = key.replace(prefix, "");
                  const def = childDefMap.get(actualFieldName);
                  const rawValue = values[key];
                  if (def?.dataType === "select") {
                    groupData[actualFieldName] = normalizeEnumValue(rawValue);
                    return;
                  }
                  groupData[actualFieldName] = rawValue;
                });
                if (Object.keys(groupData).length > 0) {
                  const axisFields = ["X", "Y", "Z"];
                  const isAxisTriplet =
                    axisFields.every((k) => k in groupData) &&
                    Object.keys(groupData).every((k) => axisFields.includes(k));
                  const axisArray = [
                    Number(groupData.X) || 0,
                    Number(groupData.Y) || 0,
                    Number(groupData.Z) || 0,
                  ];
                  if (isDcmMcf && isAxisTriplet) {
                    result[item.field] = axisArray;
                  } else if (
                    item.field === "THTR_ACC" ||
                    item.field === "THUP_ACC"
                  ) {
                    result[item.field] = axisArray;
                  } else {
                    result[item.field] = isAxisTriplet
                      ? `${groupData.X ?? 0}_${groupData.Y ?? 0}_${groupData.Z ?? 0}`
                      : groupData;
                  }
                }
                continue;
              }
              if (item.field === "CHC") {
                const chcChannels = getChcChannels(item);
                const selectedChannels = chcCheckedChannels.filter((channel) =>
                  chcChannels.includes(channel),
                );
                const chcValue = buildChcValue(values, selectedChannels);
                if (chcValue.length > 0) {
                  result[item.field] = chcValue;
                }
                continue;
              }
              if (
                Object.keys(values).includes(item.field) ||
                String(item.field || "").includes("TCA")
              ) {
                if (item.dataType === "object") {
                  try {
                    result[item.field] = JSON.parse(values[item.field]);
                  } catch (e) {
                    console.error(e);
                    result[item.field] = values[item.field];
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
                      })).filter((v) => v.EN !== 0);
                      const SUB = v.SUB?.map((v, i) => ({
                        ...v,
                        EN: v.EN ? 1 : 0,
                        N: i + 1,
                      })).filter((v) => v.EN !== 0);
                      return { ...v, EN: v.EN ? 1 : 0, N: i + 1, PUB, SUB };
                    }),
                  };
                } else if (item.field === "AGRE") {
                  result[item.field] = [{ TYPE: values[item.field] }];
                } else if (item.dataType === "TCA") {
                  const aValue = values[`${item.field}_a`] || 0;
                  const bValue = values[`${item.field}_b`] || 0;
                  const cValue = values[`${item.field}_c`] || 0;
                  result[item.field] = `${aValue}_${bValue}_${cValue}`;
                } else {
                  // 处理TF和TR字段：开启状态为0，关闭状态为1
                  if (item.field === "TF" || item.field === "TR") {
                    result[item.field] = values[item.field] == true ? 0 : 1;
                  } else {
                    result[item.field] = values[item.field];
                  }
                }
              }
            }
          }
          // QJNB设备：触发功能关闭时，移除触发阈值和加报阈值
          if (
            productCode === "QJNB" &&
            groupField === "BF" &&
            result.TR === 1
          ) {
            delete result.ACCTH;
            delete result.ANGTH;
          }
          break;
      }
      configParams[groupField] = result;
    });
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
      } else if (f === "BPBS") {
        const temp = configParams[f];
        // 转换EN字段
        const newTemp = {};
        Object.keys(temp).forEach((key) => {
          newTemp[key] = {
            ...temp[key],
            EN: temp[key].EN === true ? 1 : 0,
          };
        });
        obj["BPBS"] = newTemp;
      } else if (f === "LAPRO") {
        //如果没有勾选启用传感器配置
        if (!chfEnabled) {
          const { CHF, ...restParams } = configParams[f];
          obj["LAPRO"] = restParams;
        } else {
          obj["LAPRO"] = configParams[f];
        }
      } else if (f === "MCF") {
        const temp = configParams[f] || {};
        const next = { ...temp };
        // const isDcmMcf = ["DCM2", "DCM3"].includes(resolvedProductCode);

        const maybePromoteLegacyXYZ = (baseField) => {
          const xKey = `${baseField}_X`;
          const yKey = `${baseField}_Y`;
          const zKey = `${baseField}_Z`;
          const hasAny =
            next[xKey] !== undefined ||
            next[yKey] !== undefined ||
            next[zKey] !== undefined;
          if (!hasAny) return;
          next[baseField] = [
            Number(next[xKey]) || 0,
            Number(next[yKey]) || 0,
            Number(next[zKey]) || 0,
          ];
          delete next[xKey];
          delete next[yKey];
          delete next[zKey];
        };

        maybePromoteLegacyXYZ("THH_ACC");
        maybePromoteLegacyXYZ("THH_ANG");
        maybePromoteLegacyXYZ("THTR_ACC");
        maybePromoteLegacyXYZ("THUP_ACC");
        maybePromoteLegacyXYZ("CZ_ANG");
        maybePromoteLegacyXYZ("CZ_ACC");
        maybePromoteLegacyXYZ("CZ_WY");
        // if (isDcmMcf) {
        //   maybePromoteLegacyXYZ("CZ_ANG");
        //   maybePromoteLegacyXYZ("CZ_ACC");
        if (next.CZ_WY !== undefined && !Array.isArray(next.CZ_WY)) {
          next.CZ_WY = [Number(next.CZ_WY) || 0];
        }
        // }

        obj["MCF"] = [next];
      } else {
        obj[f] = configParams[f];
      }
    }

    const pruned = pruneEmptyValues(obj);
    return { configParams: pruned || {} };
  };
  const handleSave = () => {
    if (!checkedType.length) {
      message.info("请勾选需要保存的参数");
      return;
    }
    if (hasEmptyPlatformSelection()) {
      message.info("请选择至少一项平台配置后再保存");
      return;
    }
    form.validateFields().then((values) => {
      const { configParams } = handleParams(values);
      const recoveryParams = {
        ...values,
        CHF_ENABLED: chfEnabled, // 保存CHF启用状态
      };

      // 处理TCA类型字段的保存 - 将a_b_c格式转换为原始格式以便回显
      curConfig.forEach((group) => {
        group.children?.forEach((item) => {
          if (item.dataType === "TCA") {
            recoveryParams[`${item.field}_a`] =
              values[`${item.field}_a`] ?? null;
            recoveryParams[`${item.field}_b`] =
              values[`${item.field}_b`] ?? null;
            recoveryParams[`${item.field}_c`] =
              values[`${item.field}_c`] ?? null;
          } else if (item.dataType === "groupPackage") {
            // 处理嵌套在普通group中的groupPackage（如THTR_ACC, THUP_ACC）
            item.children?.forEach((child) => {
              const fieldKey = `${group.field}-${item.field}-${child.field}`;
              if (values[fieldKey] !== undefined) {
                recoveryParams[fieldKey] = values[fieldKey];
              }
            });
          }
        });
        // 处理groupPackage类型字段的保存
        if (group.componentType === "groupPackage" && group.children) {
          if (group.field === "SW") {
            // 处理SW（水位计）的嵌套groupPackage结构
            group.children.forEach((subGroup) => {
              if (subGroup.dataType === "groupPackage" && subGroup.children) {
                subGroup.children.forEach((child) => {
                  const fieldKey = `${group.field}-${subGroup.field}-${child.field}`;
                  if (values[fieldKey] !== undefined) {
                    recoveryParams[child.field] = values[fieldKey];
                  }
                });
              }
            });
          } else {
            // 处理其他groupPackage类型
            group.children.forEach((child) => {
              const fieldKey = `${group.field}-${child.field}`;
              if (values[fieldKey] !== undefined) {
                recoveryParams[child.field] = values[fieldKey];
              }
            });
          }
        }
      });

      const deviceId = curDevices?.[0]?.deviceCode;
      const deviceConfCache = JSON.parse(
        localStorage.getItem("deviceConfCache") || "[]",
      );
      const existingIndex = deviceConfCache.findIndex(
        (item) => item.deviceId === deviceId,
      );
      const newCacheItem = {
        checkedType,
        selectedPlatformItems,
        configParams,
        recoveryParams,
        deviceId,
      };
      if (existingIndex !== -1) {
        deviceConfCache[existingIndex] = newCacheItem;
      } else {
        deviceConfCache.push(newCacheItem);
      }
      localStorage.setItem("deviceConfCache", JSON.stringify(deviceConfCache));

      // 记录系统日志
      const logContent = `保存设备参数配置，设备ID：${deviceId}，设备名称：${curDevices?.[0]?.deviceName || ""}，勾选参数：${checkedType.join("、")}`;
      dispatch(
        createSystemLog({
          content: logContent,
          module: "设备管理--设备列表--设备概述--设备参数配置",
          url: window.location.href,
          userId: user?.userInfo?.id || null,
        }),
      );

      message.info("保存成功");
      onClose();
    });
  };
  const handleOk = (isIssue = false) => {
    if (!checkedType.length) {
      message.info("请勾选要下发的参数");
      return;
    }
    if (hasEmptyPlatformSelection()) {
      message.info("请选择至少一项平台配置后再下发");
      return;
    }
    setIsIssue(isIssue);
    form.submit();
  };
  const formatAICAM = (values = []) => {
    return values
      .map((v, i) => {
        if (v.EN)
          return {
            AXY: v?.AXY,
            LAPRO: v?.LAPRO,
            N: i + 1,
          };
      })
      .filter(Boolean);
  };

  const handleSubmit = (values) => {
    let data = handleParams(values);
    if (shouldConvertUdrToSeconds && data?.configParams?.BF?.UDR !== undefined) {
      const udrMinutes = Number(data.configParams.BF.UDR);
      if (Number.isFinite(udrMinutes)) {
        data.configParams.BF.UDR = udrMinutes * 60;
      }
    }
    if (data.configParams.LAPRO && data.configParams.LAPRO.AICAM) {
      data.configParams.LAPRO.AICAM = formatAICAM(
        data?.configParams?.LAPRO?.AICAM,
      );
    }
    setCommitting(true);
    dispatch(
      firmwareUpgrade.modifyDevice(
        curDevices.map((d) => d.deviceCode).join(","),
        data,
      ),
    ).then((res) => {
      setCommitting(false);
      if (res.success) {
        try {
          const deviceCodes = curDevices.map((d) => d.deviceCode);
          const userId =
            JSON.parse(window.sessionStorage.getItem("user"))?.userInfo?.id ||
            null;
          dispatch(
            createSystemLog({
              content: `设备参数配置：设备数${
                deviceCodes.length
              }，设备ID：${deviceCodes.join(",")}`,
              module: "设备管理--设备列表--设备概述",
              url: window.location.href,
              userId,
            }),
          );
        } catch (e) {
          // ignore log error
          console.warn("log error", e);
        }
        if (isIssue) {
          const id = JSON.parse(window.sessionStorage.getItem("user"))?.userInfo
            ?.id;
          dispatch(
            firmwareUpgrade.issueCommand({
              devices: curDevices.map((d) => d.deviceCode),
              userId: id,
            }),
          ).then((res) => {
            if (res.success) {
              try {
                const deviceCodes = curDevices.map((d) => d.deviceCode);
                dispatch(
                  createSystemLog({
                    content: `统一下发配置指令：设备数${
                      deviceCodes.length
                    }，设备ID：${deviceCodes.join(",")}`,
                    module: "设备管理--设备列表--设备概述",
                    url: window.location.href,
                    userId: id || null,
                  }),
                );
              } catch (e) {
                console.warn("log error", e);
              }
              onClose();
            }
          });
        } else {
          onClose();
        }
      }
    });
  };

  const renderTcpFields = (group, item) => {
    const maxLength = getTcpConfigLength(group, legacyTcpConfigLength);
    const maxMqttLength = getMqttConfigLength(group);
    const canAddLinkedMqtt =
      productCode !== "RTDZ" || mqttConfigValues.length < maxMqttLength;

    return (
      <Card
      style={{
        width: 660,
        margin: "12px 0",
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
      }}
    >
      <Form.List key={`${group.field}-${item.field}`} name={item.field}>
        {(fields, { add, remove }) => (
          <React.Fragment>
            {fields.map(({ key, name, ...restField }, i) => (
              <div key={key} style={{ display: "flex" }}>
                <Form.Item
                  {...restField}
                  name={[name, "EN"]}
                  valuePropName="checked"
                  rules={[
                    {
                      required:
                        checkedType.includes(group.field) &&
                        item?.required !== false,
                      message: ``,
                    },
                  ]}
                >
                  <Checkbox>使能（{i + 1}）</Checkbox>
                </Form.Item>
                <Form.Item
                  {...restField}
                  name={[name, "PT"]}
                  label={productCode === "GNSS" ? "平台端口" : "端口号"}
                  rules={[
                    {
                      required: isPlatformFieldRequired(
                        group,
                        item,
                        "PT",
                        tcpConfigValues?.[name]?.EN !== false,
                      ),
                      message: `请输入端口号`,
                    },
                  ]}
                >
                  <InputNumber
                    min={0}
                    max={65535}
                    style={{ width: 80, marginRight: 16 }}
                  />
                </Form.Item>
                <Form.Item
                  {...restField}
                  name={[name, "IP"]}
                  label={productCode === "GNSS" ? "平台地址" : "IP地址"}
                  rules={[
                    {
                      required: isPlatformFieldRequired(
                        group,
                        item,
                        "IP",
                        form.getFieldValue([item.field, name, "EN"]) !== false,
                      ),
                      message: `请输入IP地址`,
                    },
                  ]}
                >
                  <Input style={{ width: 180, marginRight: 16 }} />
                </Form.Item>
                <Button
                  danger
                  icon={<MinusCircleOutlined />}
                  onClick={() => {
                    if (productCode === "RTDZ") {
                      const mqtt = form.getFieldValue("MQTT") || [];
                      const newMqtt = mqtt.filter((_, idx) => idx !== name);
                      form.setFieldsValue({ MQTT: newMqtt });
                      const pubMap = new Map();
                      const subMap = new Map();
                      newMqtt.forEach((mqttItem, mqttIndex) => {
                        mqttItem.PUB?.forEach((pubItem, pubIndex) => {
                          pubMap.set(
                            `MQTT[${mqttIndex}].PUB[${pubIndex}].EN`,
                            pubItem.EN,
                          );
                        });
                        mqttItem.SUB?.forEach((subItem, subIndex) => {
                          subMap.set(
                            `MQTT[${mqttIndex}].SUB[${subIndex}].EN`,
                            subItem.EN,
                          );
                        });
                      });
                      setMqttPubEnList(pubMap);
                      setMqttSubEnList(subMap);
                    }
                    remove(name);
                  }}
                  disabled={
                    (isDvjc && group.field === "SER") || fields.length <= 1
                  }
                />
                {i === fields.length - 1 &&
                fields.length < maxLength &&
                canAddLinkedMqtt &&
                !(isDvjc && group.field === "SER") ? (
                  <Button
                    icon={<PlusCircleOutlined />}
                    style={{ marginLeft: 8 }}
                    onClick={() => {
                      add({ EN: true });
                      if (productCode === "RTDZ") {
                        const mqtt = form.getFieldValue("MQTT") || [];
                        const newIndex = mqtt.length;
                        const newMqtt = [
                          ...mqtt,
                          {
                            EN: true,
                            PUB: [{ EN: false }],
                            SUB: [{ EN: false }],
                          },
                        ];
                        form.setFieldsValue({ MQTT: newMqtt });
                        updateMqttPubEnList(
                          `MQTT[${newIndex}].PUB[0].EN`,
                          false,
                        );
                        updateMqttSubEnList(
                          `MQTT[${newIndex}].SUB[0].EN`,
                          false,
                        );
                      }
                    }}
                    disabled={productCode === "SWYT"}
                  />
                ) : (
                  ""
                )}
              </div>
            ))}
          </React.Fragment>
        )}
      </Form.List>
      {productCode === "SWYT" && (
        <Form.Item
          name={"AGRE"}
          label={"平台类型"}
          initialValue={deviceConfCache?.AGRE}
          rules={[
            {
              required:
                checkedType.includes(group.field) && item?.required !== false,
              message: `请选择平台类型`,
            },
          ]}
        >
          <Select
            style={{ width: 200 }}
            options={[
              { label: "知物云", value: 1 },
              { label: "安心云", value: 2 },
              { label: "深圳平台", value: 3 },
              { label: "广州平台", value: 4 },
            ]}
            getPopupContainer={(trigger) => trigger.parentNode}
          />
        </Form.Item>
      )}
      </Card>
    );
  };

  const renderMqttFields = (group, item) => {
    const maxLength = getMqttConfigLength(group);

    return (
      <Form.List key={`${group.field}-${item.field}`} name={item.field}>
      {(fields, { add, remove }) => (
        <React.Fragment>
          {fields.map(({ key, name, ...restField }, i) => {
            const connectionEnabled = mqttConfigValues?.[name]?.EN !== false;
            return (
              <Card key={key} style={{ width: 660, margin: "12px 0" }}>
                <div style={{ display: "flex", flexWrap: "wrap" }}>
                  <Form.Item
                    {...restField}
                    name={[name, "EN"]}
                    valuePropName="checked"
                  >
                    <Checkbox>使能（{i + 1}）</Checkbox>
                  </Form.Item>
                  <Form.Item
                    {...restField}
                    name={[name, "USR"]}
                    label="用户名"
                    rules={[
                      {
                        required: isPlatformFieldRequired(
                          group,
                          item,
                          "USR",
                          connectionEnabled,
                        ),
                        message: "请输入用户名",
                      },
                    ]}
                  >
                    <Input style={{ width: 120, marginRight: 16 }} />
                  </Form.Item>
                  <Form.Item
                    {...restField}
                    name={[name, "KEY"]}
                    label="密钥"
                    rules={[
                      {
                        required: isPlatformFieldRequired(
                          group,
                          item,
                          "KEY",
                          connectionEnabled,
                        ),
                        message: "请输入密钥",
                      },
                    ]}
                  >
                    <Input style={{ width: 120, marginRight: 16 }} />
                  </Form.Item>
                  <Form.Item
                    {...restField}
                    name={[name, "CR"]}
                    label="遗言"
                    rules={[
                      {
                        required: isPlatformFieldRequired(
                          group,
                          item,
                          "CR",
                          connectionEnabled,
                        ),
                        message: "请输入遗言",
                      },
                    ]}
                  >
                    <InputNumber style={{ width: 80, marginRight: 16 }} />
                  </Form.Item>
                  <Form.Item
                    {...restField}
                    name={[name, "ID"]}
                    label="客户端ID"
                    rules={[
                      {
                        required: isPlatformFieldRequired(
                          group,
                          item,
                          "ID",
                          connectionEnabled,
                        ),
                        message: "请输入客户端ID",
                      },
                    ]}
                  >
                    <Input style={{ width: 80, marginRight: 16 }} />
                  </Form.Item>
                  {productCode !== "RTDZ" ? (
                    <>
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
                    </>
                  ) : null}
                </div>
                <Divider orientation="left">发布主题</Divider>
                <Card style={{ width: 580, margin: "12px 0 12px 24px" }}>
                  {renderPubFields(group, name, item)}
                </Card>
                <Divider orientation="left">订阅主题</Divider>
                <Card style={{ width: 580, margin: "12px 0 0 24px" }}>
                  {renderSubFields(group, name, item)}
                </Card>
              </Card>
            );
          })}
        </React.Fragment>
      )}
      </Form.List>
    );
  };

  const renderBpbsFields = (group, item) => {
    switch (item.field) {
      case "CAM":
        return (
          <Card
            key={`${group.field}-${item.field}`}
            title={item.name}
            style={{
              width: 660,
              margin: "12px 0",
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
            }}
          >
            <div style={{ display: "flex" }}>
              <Form.Item
                name={[item.field, "EN"]}
                valuePropName="checked"
                initialValue={deviceConfCache?.CAM?.EN}
              >
                <Checkbox>使能</Checkbox>
              </Form.Item>
              <Form.Item
                name={[item.field, "CH"]}
                label="通道"
                initialValue={deviceConfCache?.CAM?.CH}
                rules={[
                  {
                    required:
                      checkedType.includes(group.field) &&
                      item?.required !== false,
                    message: `请输入通道`,
                  },
                ]}
              >
                <InputNumber style={{ width: 120, marginRight: 16 }} />
              </Form.Item>
              <Form.Item
                name={[item.field, "CODE"]}
                label="摄像头编号"
                initialValue={deviceConfCache?.CAM?.CODE}
                rules={[
                  {
                    required:
                      checkedType.includes(group.field) &&
                      item?.required !== false,
                    message: `请输入摄像头编号`,
                  },
                ]}
              >
                <Input style={{ width: 120, marginRight: 16 }} />
              </Form.Item>
            </div>
          </Card>
        );
      case "BS":
        return (
          <Card
            key={`${group.field}-${item.field}`}
            title={item.name}
            style={{
              width: 660,
              margin: "12px 0",
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
            }}
          >
            <div style={{ display: "flex", flexWrap: "wrap" }}>
              <Form.Item
                name={[item.field, "EN"]}
                valuePropName="checked"
                initialValue={deviceConfCache?.BS?.EN}
              >
                <Checkbox>使能</Checkbox>
              </Form.Item>
              <Form.Item
                name={[item.field, "CH"]}
                label="通道"
                initialValue={deviceConfCache?.BS?.CH}
                rules={[
                  {
                    required:
                      checkedType.includes(group.field) &&
                      item?.required !== false,
                    message: `请输入通道`,
                  },
                ]}
              >
                <InputNumber style={{ width: 120, marginRight: 16 }} />
              </Form.Item>
              <Form.Item
                name={[item.field, "NUM"]}
                label="触发爆闪条件数"
                initialValue={deviceConfCache?.BS?.NUM}
                rules={[
                  {
                    required:
                      checkedType.includes(group.field) &&
                      item?.required !== false,
                    message: `请输入触发爆闪条件数`,
                  },
                ]}
              >
                <InputNumber
                  min={1}
                  max={2}
                  style={{ width: 120, marginRight: 16 }}
                />
              </Form.Item>
              {productCode !== "RTDZ" && (
                <Form.Item
                  name={[item.field, "CODE"]}
                  label="爆闪编码"
                  initialValue={deviceConfCache?.BS?.CODE}
                  rules={[
                    {
                      required:
                        checkedType.includes(group.field) &&
                        item?.required !== false,
                      message: `请输入爆闪编码`,
                    },
                  ]}
                >
                  <Input style={{ width: 120, marginRight: 16 }} />
                </Form.Item>
              )}
            </div>
          </Card>
        );
      case "LORA":
        return (
          <Card
            key={`${group.field}-${item.field}`}
            title={item.name}
            style={{
              width: 660,
              margin: "12px 0",
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
            }}
          >
            <div style={{ display: "flex" }}>
              <Form.Item
                name={[item.field, "EN"]}
                valuePropName="checked"
                initialValue={deviceConfCache?.LORA?.EN}
              >
                <Checkbox>使能</Checkbox>
              </Form.Item>
              <Form.Item
                name={[item.field, "SW"]}
                label="1一体化,2:AI摄像头和一体化"
                initialValue={deviceConfCache?.LORA?.SW}
                rules={[
                  {
                    required:
                      checkedType.includes(group.field) &&
                      item?.required !== false,
                    message: `请输入功能模式`,
                  },
                ]}
              >
                <InputNumber
                  max={2}
                  min={1}
                  style={{ width: 120, marginRight: 16 }}
                />
              </Form.Item>
            </div>
          </Card>
        );
      default:
        return "";
    }
  };

  const renderPubFields = (group, parentField, item) => {
    return (
      <Form.List name={[parentField, "PUB"]}>
        {(fields, { add, remove }) => (
          <React.Fragment>
            {fields.map(({ key, name, ...restField }, i) => {
              // 构建唯一的字段路径
              const fieldPath = `MQTT[${parentField}].PUB[${i}].EN`;
              // 从状态中获取启用状态
              const isEnabled = mqttPubEnList.get(fieldPath) || false;

              return (
                <div key={key} style={{ marginBottom: 8 }}>
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <Form.Item
                      {...restField}
                      name={[name, "EN"]}
                      valuePropName="checked"
                    >
                      <Checkbox
                        onChange={(e) => {
                          updateMqttPubEnList(fieldPath, e.target.checked);
                        }}
                      >
                        启用开关（{i + 1}）
                      </Checkbox>
                    </Form.Item>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      flexWrap: "wrap",
                    }}
                  >
                    <Form.Item
                      {...restField}
                      name={[name, "QOS"]}
                      label="消息质量等级"
                      rules={[
                        {
                          required: isPlatformFieldRequired(
                            group,
                            item,
                            "PUB.QOS",
                            isEnabled,
                          ),
                          message: `请输入消息质量等级`,
                        },
                      ]}
                      style={{ marginBottom: 0 }}
                    >
                      <InputNumber style={{ width: 120, marginRight: 16 }} />
                    </Form.Item>
                    <Form.Item
                      {...restField}
                      name={[name, "NM"]}
                      label="主题名称"
                      rules={[
                        {
                          required: isPlatformFieldRequired(
                            group,
                            item,
                            "PUB.NM",
                            isEnabled,
                          ),
                          message: `请输入主题名称`,
                        },
                      ]}
                      style={{ marginBottom: 0 }}
                    >
                      <Input style={{ width: 120, marginRight: 16 }} />
                    </Form.Item>
                    <Button
                      danger
                      icon={<MinusCircleOutlined />}
                      onClick={() => remove(name)}
                      disabled={fields.length <= 1}
                    />
                    {i === fields.length - 1 && fields.length < 5 ? (
                      <Button
                        icon={<PlusCircleOutlined />}
                        style={{ marginLeft: 8 }}
                        onClick={() => {
                          const newIndex = fields.length;
                          const newFieldPath = `MQTT[${parentField}].PUB[${newIndex}].EN`;
                          add({ EN: false });
                          updateMqttPubEnList(newFieldPath, false);
                        }}
                      />
                    ) : (
                      ""
                    )}
                  </div>
                </div>
              );
            })}
          </React.Fragment>
        )}
      </Form.List>
    );
  };
  const renderSubFields = (group, parentField, item) => {
    return (
      <Form.List name={[parentField, "SUB"]}>
        {(fields, { add, remove }) => (
          <React.Fragment>
            {fields.map(({ key, name, ...restField }, i) => {
              // 构建唯一的字段路径
              const fieldPath = `MQTT[${parentField}].SUB[${i}].EN`;
              // 从状态中获取启用状态
              const isEnabled = mqttSubEnList.get(fieldPath) || false;
              return (
                <div key={key} style={{ marginBottom: 8 }}>
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <Form.Item
                      {...restField}
                      name={[name, "EN"]}
                      valuePropName="checked"
                    >
                      <Checkbox
                        onChange={(e) => {
                          updateMqttSubEnList(fieldPath, e.target.checked);
                        }}
                      >
                        启用开关（{i + 1}）
                      </Checkbox>
                    </Form.Item>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      flexWrap: "wrap",
                    }}
                  >
                    <Form.Item
                      {...restField}
                      name={[name, "QOS"]}
                      label="消息质量等级"
                      rules={[
                        {
                          required: isPlatformFieldRequired(
                            group,
                            item,
                            "SUB.QOS",
                            isEnabled,
                          ),
                          message: `请输入消息质量等级`,
                        },
                      ]}
                      style={{ marginBottom: 0 }}
                    >
                      <InputNumber style={{ width: 120, marginRight: 16 }} />
                    </Form.Item>
                    <Form.Item
                      {...restField}
                      name={[name, "NM"]}
                      label="主题名称"
                      rules={[
                        {
                          required: isPlatformFieldRequired(
                            group,
                            item,
                            "SUB.NM",
                            isEnabled,
                          ),
                          message: `请输入主题名称`,
                        },
                      ]}
                      style={{ marginBottom: 0 }}
                    >
                      <Input style={{ width: 120, marginRight: 16 }} />
                    </Form.Item>
                    <Button
                      danger
                      icon={<MinusCircleOutlined />}
                      onClick={() => remove(name)}
                      disabled={fields.length <= 1}
                    />
                    {i === fields.length - 1 && fields.length < 5 ? (
                      <Button
                        icon={<PlusCircleOutlined />}
                        style={{ marginLeft: 8 }}
                        onClick={() => {
                          const newIndex = fields.length;
                          const newFieldPath = `MQTT[${parentField}].SUB[${newIndex}].EN`;
                          add({ EN: false });
                          updateMqttSubEnList(newFieldPath, false);
                        }}
                      />
                    ) : (
                      ""
                    )}
                  </div>
                </div>
              );
            })}
          </React.Fragment>
        )}
      </Form.List>
    );
  };

  // 渲染嵌套的groupPackage（如水位计配置），支持二选一下拉切换
  const [swConfigType, setSwConfigType] = useState("BA"); // 默认选中BA（气压补偿参数配置）
  const renderNestedGroupPackage = (group) => {
    const options = group.children.map((item) => ({
      label: item.name,
      value: item.field,
    }));
    const selectedConfig = group.children.find(
      (item) => item.field === swConfigType,
    );
    // 保证Form.Select始终渲染且受控
    return (
      <div key={`${group.field}-nestedPackage`}>
        <div style={{ margin: "12px 0" }}>
          <span style={{ fontWeight: 500, marginBottom: 4, display: "block" }}>
            请选择配置类型
          </span>
          <Select
            options={options}
            value={swConfigType}
            defaultValue="BA"
            onChange={(v) => setSwConfigType(v)}
            style={{ width: 240, marginBottom: 16 }}
            placeholder="请选择配置类型"
            getPopupContainer={(trigger) => trigger.parentNode}
          />
        </div>
        {selectedConfig && (
          <Card
            key={`${group.field}-${selectedConfig.field}`}
            title={selectedConfig.name}
            style={{
              width: 700,
              margin: "12px 0",
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              {selectedConfig.children?.map((child) => {
                const fieldName = `SW-${selectedConfig.field}-${child.field}`;
                // 根据子字段的dataType渲染对应的表单组件
                const renderChildField = () => {
                  // 构建校验规则
                  const baseRules = [
                    {
                      required:
                        checkedType.includes(group.field) &&
                        child?.required !== false,
                      message: `请输入${child.name}`,
                    },
                  ];

                  // 如果字段有自定义校验规则，仅在当前组被勾选时添加到规则列表
                  const allRules =
                    checkedType.includes(group.field) && child.rules
                      ? [...baseRules, ...child.rules]
                      : baseRules;

                  switch (child.dataType) {
                    case "number":
                      return (
                        <Form.Item
                          key={fieldName}
                          name={fieldName}
                          label={child.name}
                          rules={allRules}
                        >
                          <InputNumber
                            placeholder={`请输入${child.name}`}
                            style={{ width: 200, marginRight: 16 }}
                            defaultValue={deviceConfCache?.[fieldName]}
                          />
                        </Form.Item>
                      );
                    case "select":
                      return (
                        <Form.Item
                          key={fieldName}
                          name={fieldName}
                          label={child.name}
                          rules={[
                            {
                              required:
                                checkedType.includes(group.field) &&
                                child?.required !== false,
                              message: `请选择${child.name}`,
                            },
                            ...(checkedType.includes(group.field)
                              ? child.rules || []
                              : []),
                          ]}
                        >
                          <Select
                            options={child.options || []}
                            style={{ width: 200, marginRight: 16 }}
                            placeholder={`请选择${child.name}`}
                            getPopupContainer={(trigger) => trigger.parentNode}
                          />
                        </Form.Item>
                      );
                    default:
                      return (
                        <Form.Item
                          key={fieldName}
                          name={fieldName}
                          label={child.name}
                          rules={allRules}
                        >
                          <Input
                            placeholder={`请输入${child.name}`}
                            style={{ width: 200, marginRight: 16 }}
                            defaultValue={deviceConfCache?.[fieldName]}
                          />
                        </Form.Item>
                      );
                  }
                };

                return renderChildField();
              })}
            </div>
          </Card>
        )}
      </div>
    );
  };

  const renderFields = (group, item) => {
    switch (item.dataType) {
      case "number":
        // QJNB设备的ACCTH和ANGTH字段，仅在触发功能开启时必填
        const isQjnbThresholdField =
          productCode === "QJNB" &&
          (item.field === "ACCTH" || item.field === "ANGTH");
        const baseGroupRequired =
          checkedType.includes(group.field) && item?.required !== false;
        const isFieldRequired = isQjnbThresholdField
          ? baseGroupRequired && triggerEnabled
          : baseGroupRequired;
        // QJNB设备的ACCTH和ANGTH字段，触发功能关闭时禁用输入
        const isFieldDisabled = isQjnbThresholdField && !triggerEnabled;

        // 构建校验规则
        const baseRules = [
          {
            required: isFieldRequired,
            message: `请输入${item.name}`,
          },
        ];

        // 如果字段有自定义校验规则，仅在当前组被勾选时添加到规则列表
        const allRules =
          checkedType.includes(group.field) && item.rules
            ? [...baseRules, ...item.rules]
            : baseRules;

        return (
          <Form.Item
            key={`${group.field}-${item.field}`}
            name={item.field}
            label={
              <span>
                {item.name}
                {item.extra && (
                  <Tooltip title={item.extra}>
                    <QuestionCircleOutlined
                      style={{ color: "#999", marginLeft: 4 }}
                    />
                  </Tooltip>
                )}
              </span>
            }
            rules={allRules}
          >
            <InputNumber disabled={isFieldDisabled} />
          </Form.Item>
        );
      case "FLOAT":
        return (
          <Form.Item
            key={`${group.field}-${item.field}`}
            name={item.field}
            label={
              <span>
                {item.name}
                {item.extra && (
                  <Tooltip title={item.extra}>
                    <QuestionCircleOutlined
                      style={{ color: "#999", marginLeft: 4 }}
                    />
                  </Tooltip>
                )}
              </span>
            }
          >
            <InputNumber step={0.001} />
          </Form.Item>
        );
      case "TEXTAREA":
        return (
          <Form.Item
            key={`${group.field}-${item.field}`}
            name={item.field}
            label={
              <span>
                {item.name}
                {item.extra && (
                  <Tooltip title={item.extra}>
                    <QuestionCircleOutlined
                      style={{ color: "#999", marginLeft: 4 }}
                    />
                  </Tooltip>
                )}
              </span>
            }
            rules={[
              {
                required:
                  checkedType.includes(group.field) && item?.required !== false,
                message: `请输入${item.name}`,
              },
              ...(checkedType.includes(group.field) ? item.rules : []),
            ]}
          >
            <Input.TextArea
              placeholder={item.placeholder || `请输入${item.name}`}
              style={{ height: 100 }}
            />
          </Form.Item>
        );
      case "GL":
        return (
          <Space>
            <Form.Item
              key="longitude"
              name={["GL", "longitude"]}
              label="经度（E）"
              initialValue={deviceConfCache?.GL?.["longitude"]}
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
              name={["GL", "latitude"]}
              label="纬度（N）"
              initialValue={deviceConfCache?.GL?.["latitude"]}
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
            valuePropName="checked"
            initialValue={false}
          >
            <Checkbox>{item.name}</Checkbox>
          </Form.Item>
        );
      case "inputNumber":
        // 允许的数字范围
        const min = typeof item.minValue === "number" ? item.minValue : 0;
        const max = typeof item.maxValue === "number" ? item.maxValue : 1;
        const allowedReg = new RegExp(
          `[^${Array.from({ length: max - min + 1 }, (_, i) => i + min).join(
            "",
          )}]`,
          "g",
        );
        return (
          <Form.Item
            key={`${group.field}-${item.field}`}
            name={item.field}
            label={item.name}
            initialValue={deviceConfCache?.[item.field] || 0}
            rules={[
              {
                required:
                  checkedType.includes(group.field) && item?.required !== false,
                message: `请输入${item.name}`,
              },
            ]}
          >
            <InputNumber
              min={item.minValue ? item.minValue : 0}
              max={item.maxValue ? item.maxValue : 1}
              step={1}
              keyboard={false} // 禁用键盘输入
              style={{ width: 100 }}
              formatter={(value) => `${value}`.replace(allowedReg, "")}
              parser={(value) => {
                const v = `${value}`.replace(allowedReg, "");
                // 转为数字并限制范围
                let num = parseInt(v, 10);
                if (isNaN(num)) num = min;
                if (num < min) num = min;
                if (num > max) num = max;
                return num;
              }}
            />
          </Form.Item>
        );
      case "select":
        return (
          <Form.Item
            key={`${group.field}-${item.field}`}
            name={item.field}
            label={item.name}
            initialValue={
              productCode === "QJNB"
                ? item.options?.[0]?.value
                : deviceConfCache?.[item.field]
            }
            rules={[
              {
                required:
                  checkedType.includes(group.field) && item?.required !== false,
                message: `请选择${item.name}`,
              },
            ]}
          >
            <Select
              options={item.options}
              style={{ width: 200 }}
              disabled={productCode === "QJNB"}
              getPopupContainer={(trigger) => trigger.parentNode}
            />
          </Form.Item>
        );
      case "AICAM":
        return (
          <Form.List
            key={`${group.field}-${item.field}`}
            name={item.field}
            initialValue={
              deviceConfCache?.AICAM || [{ EN: false, AXY: "", LAPRO: "" }]
            } // 确保至少有一个初始项
          >
            {(fields, { add, remove }) => {
              // 如果没有项，自动添加一个
              if (fields.length === 0) {
                add({ EN: false, AXY: "", LAPRO: "" });
              }
              return (
                <Card
                  title="AI摄像头配置"
                  style={{
                    width: 660,
                    margin: "12px 0",
                    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
                  }}
                >
                  {fields.map(({ key, name, ...restField }, i) => {
                    // 构建唯一的字段路径
                    const fieldPath = `AICAM[${i}].EN`;
                    // 从状态中获取启用状态，默认为 false
                    const isEnabled = aicamEnList.get(fieldPath) || false;
                    return (
                      <div
                        key={key}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          marginBottom: 12,
                          flexWrap: "wrap",
                        }}
                      >
                        <Form.Item
                          {...restField}
                          name={[name, "EN"]}
                          valuePropName="checked"
                        >
                          <Checkbox
                            onChange={(e) => {
                              // 更新状态
                              updateAicamEnList(fieldPath, e.target.checked);
                            }}
                          >
                            启用开关（{i + 1}）
                          </Checkbox>
                        </Form.Item>
                        <Form.Item
                          {...restField}
                          name={[name, "AXY"]}
                          label="AI摄像头安心云编号"
                          rules={[
                            {
                              required: isEnabled,
                              message: `请输入AI摄像头安心云编号`,
                            },
                          ]}
                        >
                          <Input
                            placeholder="请输入AI摄像头安心云编号"
                            style={{ width: 200, marginRight: 16 }}
                          />
                        </Form.Item>
                        <Form.Item
                          {...restField}
                          name={[name, "LAPRO"]}
                          label="AI摄像头路安编号"
                          rules={[
                            {
                              required: isEnabled,
                              message: `请输入AI摄像头路安编号`,
                            },
                          ]}
                        >
                          <Input
                            placeholder="请输入AI摄像头路安编号"
                            style={{ width: 200, marginRight: 16 }}
                          />
                        </Form.Item>
                        <Button
                          danger
                          icon={<MinusCircleOutlined />}
                          onClick={() => remove(name)}
                          disabled={fields.length <= 1}
                          style={{ marginBottom: "24px" }}
                        />
                        {i === fields.length - 1 && fields.length < 2 ? (
                          <Button
                            icon={<PlusCircleOutlined />}
                            style={{ marginLeft: 8, marginBottom: "24px" }}
                            onClick={() => {
                              add({
                                EN: false,
                                AXY: "",
                                LAPRO: "",
                              });
                            }}
                          />
                        ) : (
                          ""
                        )}
                      </div>
                    );
                  })}
                </Card>
              );
            }}
          </Form.List>
        );
      case "switch":
        // 处理初始值：对于TR和TF字段，0表示开启(true)，1表示关闭(false)
        const cachedValue = deviceConfCache?.[item.field];
        let switchInitialValue = false;
        if (item.field === "TR" || item.field === "TF") {
          // 0表示开启(true)，1表示关闭(false)，其他情况默认false
          switchInitialValue =
            cachedValue === 0 ? true : cachedValue === 1 ? false : false;
        } else {
          switchInitialValue = cachedValue || false;
        }

        return (
          <Form.Item
            key={`${group.field}-${item.field}`}
            name={item.field}
            label={item.name}
            valuePropName="checked"
            initialValue={switchInitialValue}
            rules={[
              {
                required:
                  checkedType.includes(group.field) && item?.required !== false,
                message: `请选择${item.name}`,
              },
            ]}
          >
            <Switch
              onChange={(checked) => {
                // QJNB设备的TR字段变化时，更新触发功能状态
                if (productCode === "QJNB" && item.field === "TR") {
                  setTriggerEnabled(checked);
                  // 关闭触发功能时，清空触发阈值和加报阈值
                  if (!checked) {
                    form.setFieldsValue({
                      ACCTH: undefined,
                      ANGTH: undefined,
                    });
                  }
                }
              }}
            />
          </Form.Item>
        );
      case "CHF":
        const config = item.arrayConfig;
        const generateInitValue = () => {
          const initObj = {};
          config.forEach((field) => {
            initObj[field.name] = null;
          });
          return initObj;
        };

        return (
          <div>
            <Form.Item
              name="CHF_ENABLED"
              valuePropName="checked"
              initialValue={deviceConfCache?.CHF_ENABLED || false}
              style={{ marginBottom: 12 }}
            >
              <Checkbox
                onChange={(e) => {
                  setChfEnabled(e.target.checked);
                }}
              >
                启用传感器配置
              </Checkbox>
            </Form.Item>
            <Form.List
              name={item.field}
              initialValue={
                deviceConfCache?.CHF?.length > 0
                  ? deviceConfCache.CHF
                  : [generateInitValue()]
              }
            >
              {(fields, { add, remove }) => (
                <Card
                  style={{
                    width: 660,
                    margin: "12px 0",
                    opacity: chfEnabled ? 1 : 0.6, // 视觉反馈
                    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
                  }}
                >
                  {fields.map((field, i) => (
                    <div
                      key={field.key}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        marginBottom: 12,
                        flexWrap: "wrap", // 支持换行
                      }}
                    >
                      {/* 根据config动态渲染字段 */}
                      {config.map((fieldConfig, fieldIndex) => {
                        switch (fieldConfig.dataType) {
                          case "number":
                            return (
                              <Form.Item
                                key={fieldConfig.name}
                                name={[field.name, fieldConfig.name]}
                                label={fieldConfig.label}
                                rules={[
                                  {
                                    required: chfEnabled,
                                    message: `请输入${fieldConfig.label}`,
                                  },
                                ]}
                              >
                                <InputNumber
                                  placeholder={`请输入${fieldConfig.label}`}
                                  style={{ width: 130, marginRight: 16 }}
                                  disabled={!chfEnabled}
                                />
                              </Form.Item>
                            );
                          case "select":
                            return (
                              <Form.Item
                                key={fieldConfig.name}
                                name={[field.name, fieldConfig.name]}
                                label={fieldConfig.label}
                                rules={[
                                  {
                                    required: chfEnabled,
                                    message: `请选择${fieldConfig.label}`,
                                  },
                                ]}
                              >
                                <Select
                                  placeholder={`请选择${fieldConfig.label}`}
                                  style={{ width: 130, marginRight: 16 }}
                                  disabled={!chfEnabled}
                                  options={fieldConfig.options || []}
                                  getPopupContainer={(trigger) =>
                                    trigger.parentNode
                                  }
                                />
                              </Form.Item>
                            );
                          case "text":
                          default:
                            return (
                              <Form.Item
                                key={fieldConfig.name}
                                name={[field.name, fieldConfig.name]}
                                label={fieldConfig.label}
                                rules={[
                                  {
                                    required: chfEnabled,
                                    message: `请输入${fieldConfig.label}`,
                                  },
                                ]}
                              >
                                <Input
                                  placeholder={`请输入${fieldConfig.label}`}
                                  style={{ width: 130, marginRight: 16 }}
                                  disabled={!chfEnabled}
                                />
                              </Form.Item>
                            );
                        }
                      })}

                      {/* 操作按钮 */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          marginBottom: 24,
                        }}
                      >
                        <Button
                          danger
                          icon={<MinusCircleOutlined />}
                          onClick={() => remove(field.name)}
                          disabled={fields.length <= 1 || !chfEnabled}
                        />
                        {i === fields.length - 1 ? (
                          <Button
                            icon={<PlusCircleOutlined />}
                            style={{ marginLeft: 8 }}
                            disabled={!chfEnabled}
                            onClick={() => {
                              add(generateInitValue());
                            }}
                          />
                        ) : null}
                      </div>
                    </div>
                  ))}
                </Card>
              )}
            </Form.List>
          </div>
        );
      case "TCA":
        return (
          <div
            key={`${group.field}-${item.field}`}
            style={{
              marginBottom: 16,
              padding: "16px",
              marginRight: "8px",
              border: "1px solid #e8e8e8",
              borderRadius: "6px",
            }}
          >
            <div
              style={{
                marginBottom: 12,
                fontWeight: 500,
                fontSize: "14px",
                color: "#262626",
              }}
            >
              {item.name}
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "8px 0",
              }}
            >
              <Form.Item
                name={`${item.field}_a`}
                label="a"
                initialValue={deviceConfCache?.[`${item.field}_a`]}
                rules={[
                  {
                    required:
                      checkedType.includes(group.field) &&
                      item?.required !== false,
                    message: `请输入${item.name}a系数`,
                  },
                  ...(checkedType.includes(group.field)
                    ? [
                        {
                          validator: sixDecimalRule,
                          message: `系数最多6位小数`,
                        },
                      ]
                    : []),
                ]}
              >
                <InputNumber
                  step={0.000001}
                  placeholder="a系数"
                  style={{ width: 130 }}
                />
              </Form.Item>
              <span
                style={{
                  color: "#8c8c8c",
                  fontWeight: "bold",
                  fontSize: "16px",
                }}
              >
                _
              </span>
              <Form.Item
                name={`${item.field}_b`}
                label="b"
                initialValue={deviceConfCache?.[`${item.field}_b`]}
                rules={[
                  {
                    required:
                      checkedType.includes(group.field) &&
                      item?.required !== false,
                    message: `请输入${item.name}b系数`,
                  },
                  ...(checkedType.includes(group.field)
                    ? [
                        {
                          validator: sixDecimalRule,
                          message: `系数最多6位小数`,
                        },
                      ]
                    : []),
                ]}
              >
                <InputNumber
                  step={0.000001}
                  placeholder="b系数"
                  style={{ width: 130 }}
                />
              </Form.Item>
              <span
                style={{
                  color: "#8c8c8c",
                  fontWeight: "bold",
                  fontSize: "16px",
                }}
              >
                _
              </span>
              <Form.Item
                name={`${item.field}_c`}
                label="c"
                initialValue={deviceConfCache?.[`${item.field}_c`]}
                rules={[
                  {
                    required:
                      checkedType.includes(group.field) &&
                      item?.required !== false,
                    message: `请输入${item.name}c系数`,
                  },
                  ...(checkedType.includes(group.field)
                    ? [
                        {
                          validator: sixDecimalRule,
                          message: `系数最多6位小数`,
                        },
                      ]
                    : []),
                ]}
              >
                <InputNumber
                  step={0.000001}
                  placeholder="c系数"
                  style={{ width: 130 }}
                />
              </Form.Item>
            </div>
          </div>
        );
      case "groupPackage": // 添加 groupPackage 的处理
        return (
          <Card
            key={`${group.field}-${item.field}`}
            title={item.name}
            style={{
              width: 700,
              margin: "12px 0",
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              {item.children?.map((child) => {
                const fieldName = `${group.field}-${item.field}-${child.field}`;
                const isYtzdPackage =
                  group.field === "MCF" && item.field === "YTZD";
                const ytzdFrFieldName = `${group.field}-${item.field}-FR`;
                const ytzdTimeFieldName = `${group.field}-${item.field}-TIME`;
                const needsYtzdLimitCheck =
                  isYtzdPackage &&
                  (child.field === "FR" || child.field === "TIME");
                const ytzdOtherFieldName =
                  child.field === "FR" ? ytzdTimeFieldName : ytzdFrFieldName;
                const renderChildField = () => {
                  switch (child.dataType) {
                    case "number":
                      const numberRules = [
                        {
                          required:
                            checkedType.includes(group.field) &&
                            child?.required !== false,
                          message: `请输入${child.name}`,
                        },
                        ...(checkedType.includes(group.field)
                          ? child.rules || []
                          : []),
                        ...(needsYtzdLimitCheck
                          ? [
                              {
                                validator: async (_, value) => {
                                  if (!checkedType.includes(group.field))
                                    return;
                                  const frValue =
                                    child.field === "FR"
                                      ? value
                                      : form.getFieldValue(ytzdFrFieldName);
                                  const timeValue =
                                    child.field === "TIME"
                                      ? value
                                      : form.getFieldValue(ytzdTimeFieldName);
                                  const frNum = Number(frValue);
                                  const timeNum = Number(timeValue);
                                  if (
                                    !Number.isFinite(frNum) ||
                                    !Number.isFinite(timeNum)
                                  ) {
                                    return;
                                  }
                                  if (frNum * timeNum > 2560) {
                                    throw new Error(
                                      "采样频率×采样时间不能大于2560",
                                    );
                                  }
                                },
                              },
                            ]
                          : []),
                      ];
                      return (
                        <Form.Item
                          key={fieldName}
                          name={fieldName}
                          label={child.name}
                          initialValue={
                            deviceConfCache?.[fieldName] ||
                            deviceConfCache?.[child.field]
                          }
                          rules={numberRules}
                          {...(needsYtzdLimitCheck
                            ? { dependencies: [ytzdOtherFieldName] }
                            : {})}
                        >
                          <InputNumber
                            placeholder={`请输入${child.name}`}
                            style={{ width: 180, marginRight: 16 }}
                          />
                        </Form.Item>
                      );
                    case "select":
                      return (
                        <Form.Item
                          key={fieldName}
                          name={fieldName}
                          label={child.name}
                          initialValue={
                            deviceConfCache?.[fieldName] ||
                            deviceConfCache?.[child.field]
                          }
                          rules={[
                            {
                              required:
                                checkedType.includes(group.field) &&
                                child?.required !== false,
                              message: `请选择${child.name}`,
                            },
                            ...(checkedType.includes(group.field)
                              ? child.rules || []
                              : []),
                          ]}
                        >
                          <Select
                            options={child.options || []}
                            style={{ width: 180, marginRight: 16 }}
                            placeholder={`请选择${child.name}`}
                            getPopupContainer={(trigger) => trigger.parentNode}
                          />
                        </Form.Item>
                      );
                    default:
                      return (
                        <Form.Item
                          key={fieldName}
                          name={fieldName}
                          label={child.name}
                          initialValue={
                            deviceConfCache?.[fieldName] ||
                            deviceConfCache?.[child.field]
                          }
                          rules={[
                            {
                              required:
                                checkedType.includes(group.field) &&
                                child?.required !== false,
                              message: `请输入${child.name}`,
                            },
                            ...(checkedType.includes(group.field)
                              ? child.rules || []
                              : []),
                          ]}
                        >
                          <Input
                            placeholder={`请输入${child.name}`}
                            style={{ width: 180, marginRight: 16 }}
                          />
                        </Form.Item>
                      );
                  }
                };

                return renderChildField();
              })}
            </div>
          </Card>
        );
      default:
        const rules = item.rules || [];
        return (
          <Form.Item
            key={`${group.field}-${item.field}`}
            name={item.field}
            label={
              <>
                {item.name}
                {item.extra ? (
                  <Tooltip title={item.extra}>
                    <QuestionCircleOutlined
                      style={{ color: "rgba(0, 0, 0, 0.45)", marginLeft: 4 }}
                    />
                  </Tooltip>
                ) : null}
              </>
            }
            initialValue={deviceConfCache?.[item.field]}
            rules={[
              {
                required:
                  checkedType.includes(group.field) && item?.required !== false,
                message: `请输入${item.name}`,
              },
              ...(checkedType.includes(group.field) ? rules : []),
            ]}
          >
            <Input
              style={{
                width:
                  item.inputWidth || (group.field === "GX" ? 240 : undefined),
              }}
            />
          </Form.Item>
        );
    }
  };
  return (
    <Modal
      title="下发指令"
      open={open}
      onOk={handleOk}
      width={800}
      onCancel={onClose}
      maskClosable={false}
      confirmLoading={committing}
      zIndex={2000}
      styles={{
        body: {
          height: "60vh", // 设置Modal内容区域高度为视窗高度的60%
          overflow: "auto", // 启用滚动
          maxHeight: "500px", // 可选：设置最大高度
          position: "relative", // 确保内容定位正确
        },
        mask: {
          zIndex: 1999, // 遮罩层z-index
        },
      }}
      footer={
        <Space>
          <Button
            theme="solid"
            loading={committing}
            onClick={() => handleOk(true)}
          >
            下发
          </Button>
          <Button
            theme="solid"
            loading={committing}
            onClick={() => handleSave(false)}
          >
            保存
          </Button>
        </Space>
      }
    >
      <Form form={form} onFinish={handleSubmit} initialValues={deviceConfCache}>
        {curConfig.map((group, gi) => (
          <div key={`${group.field}-${gi}`}>
            <Divider style={{ margin: "10px 0" }} />
            {/* 每组独立的选择复选框，不使用 Checkbox.Group 以避免覆盖其他组选择 */}
            <Checkbox
              checked={checkedType.includes(group.field)}
              onChange={(e) => {
                const checked = e.target.checked;
                if (!checked && group.field === "SER") {
                  setSelectedPlatformItems((previous) => ({
                    ...previous,
                    SER: [],
                  }));
                }
                if (checked && group.field === "SER") {
                  setSelectedPlatformItems((previous) => ({
                    ...previous,
                    SER:
                      previous.SER?.length > 0
                        ? previous.SER
                        : getDefaultPlatformItems(),
                  }));
                }
                setCheckedType((prev) => {
                  if (checked && !prev.includes(group.field)) {
                    return [...prev, group.field];
                  }
                  if (!checked && prev.includes(group.field)) {
                    return prev.filter((f) => f !== group.field);
                  }
                  return prev;
                });
              }}
            >
              {group.name}
            </Checkbox>

            {group?.componentType === "select" ? (
              <Form.Item
                name={group.field}
                initialValue={deviceConfCache?.[group.field]}
                rules={[
                  {
                    required:
                      checkedType.includes(group.field) &&
                      group?.required !== false,
                    message: `请选择${group.name}`,
                  },
                ]}
              >
                <Select
                  options={group.options}
                  style={{ width: 200 }}
                  getPopupContainer={(trigger) => trigger.parentNode}
                />
              </Form.Item>
            ) : group?.componentType === "groupPackage" ? (
              // 处理嵌套的groupPackage（如水位计配置）
              renderNestedGroupPackage(group)
            ) : (
              group.children?.map((item) =>
                productCode === "QJNB" &&
                group.field === "BF" &&
                item.field === "TR" ? (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      flexWrap: "wrap",
                    }}
                    key={`${group.field}-TR-ACCTH`}
                  >
                    {renderFields(group, item)}
                    {renderFields(
                      group,
                      group.children?.find((c) => c.field === "ACCTH") || {
                        field: "ACCTH",
                        name: "触发阈值(mg)",
                        dataType: "number",
                      },
                    )}
                  </div>
                ) : productCode === "QJNB" &&
                  group.field === "BF" &&
                  item.field === "ACCTH" ? null : item.field === "TCP" ? (
                  renderPlatformItem(
                    group,
                    item,
                    renderTcpFields(group, item),
                  )
                ) : item.field === "MQTT" ? (
                  renderPlatformItem(
                    group,
                    item,
                    renderMqttFields(group, item),
                  )
                ) : item.field === "CHC" ? (
                  renderChcFields(group, item)
                ) : item.field === "CAM" ||
                  item.field === "BS" ||
                  item.field === "LORA" ? (
                  renderBpbsFields(group, item)
                ) : item.field === "AGRE" && productCode === "SWYT" ? null : (
                  renderFields(group, item)
                ),
              )
            )}
          </div>
        ))}
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
export default connect(mapStateToProps)(DeviceConfigModal);
