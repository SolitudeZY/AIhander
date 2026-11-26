import React, { useState, useEffect, useRef } from "react";
import { connect } from "react-redux";
import {
  Form,
  Modal,
  Space,
  Button,
  Image,
  Select,
  Input,
  InputNumber,
  Switch,
  Radio,
  message,
} from "antd";
import { createSystemLog } from "../../../system/actions/log";
const { Option } = Select;
const defaultDeviceType = "ZHENXIAN";
const SOULI_DEVICE_TYPES = ["SOULI", "VIBRATIONS_SOULI"];
const VIBRATIONS_DEVICE_TYPES = ["VIBRATIONS", "VIBRATIONS_SOULI"];
const DEFAULT_MODULE_NO_DEVICE_TYPES = [
  ...new Set([...SOULI_DEVICE_TYPES, ...VIBRATIONS_DEVICE_TYPES]),
];
const DEFAULT_MODULE_NO = "101";
const DEFAULT_SUB_CHANNEL_LIMIT = 5;
const FS_M24_SUB_CHANNEL_LIMIT = 20;

const getInitialModuleNo = (deviceType, moduleNo) =>
  moduleNo ??
  (DEFAULT_MODULE_NO_DEVICE_TYPES.includes(deviceType)
    ? DEFAULT_MODULE_NO
    : undefined);

function SubDeviceModal({
  actions,
  dispatch,
  open,
  onClose,
  deviceCode,
  fetchData,
  editData,
  sensorList,
  productModel,
  user,
}) {
  const { firmwareUpgrade } = actions;
  const [form] = Form.useForm();
  const subChannelLimit =
    String(productModel || "").trim().toUpperCase() === "FS-M24"
      ? FS_M24_SUB_CHANNEL_LIMIT
      : DEFAULT_SUB_CHANNEL_LIMIT;
  const subChannelRules = [
    { required: true, message: "请输入子通道号" },
    {
      validator: (_, value) => {
        if (value === undefined || value === null || value === "") {
          return Promise.resolve();
        }
        const subChannelNo = Number(value);
        if (
          !Number.isInteger(subChannelNo) ||
          subChannelNo < 1 ||
          subChannelNo > subChannelLimit
        ) {
          return Promise.reject(
            new Error(`子通道号必须为1~${subChannelLimit}的整数`),
          );
        }
        return Promise.resolve();
      },
    },
  ];

  const [deviceTypeOptions, setDeviceTypeOptions] = useState([]);
  const [STMMLoading, setSTMMLoading] = useState(false);
  const [sensorTypeModelMapping, setSensorTypeModelMapping] = useState([]);
  const [formulaData, setFormulaData] = useState([]);
  const [formulaVersion, setFormulaVersion] = useState(0);

  const [modelOptions, setModelOptions] = useState([]);
  const [committing, setCommitting] = useState(false);
  const [isIssue, setIsIssue] = useState(false);
  const [modelAbout, setModelAbout] = useState({});
  const deviceTypes = useRef([]);
  const [calcParamLabels, setCalcParamLabels] = useState({
    p1: "计算参数1",
    p2: "计算参数2",
    p3: "计算参数3",
    p4: "计算参数4",
  });
  const formulaDataRef = useRef([]);
  const sensorTypeModelMappingRef = useRef([]);
  const [batchAddEnabled, setBatchAddEnabled] = useState(false);
  const [batchMode, setBatchMode] = useState("module");
  const [moduleRange, setModuleRange] = useState({
    start: undefined,
    end: undefined,
  });
  const [channelRange, setChannelRange] = useState({
    start: undefined,
    end: undefined,
  });
  useEffect(() => {
    if (open) {
      setModelAbout({});
    }
  }, [open]);
  useEffect(() => {
    getFormulaData();
    getDeviceTypeOptions();
  }, []);
  const getDeviceTypeOptions = async () => {
    // 获取传感器类型数据
    const res = await dispatch(firmwareUpgrade.getSensorTypes());
    if (res.success) {
      deviceTypes.current = res.payload.data.map((type) => ({
        value: type.sensorKey,
        label: type.sensorName,
      }));
      // 获取完传感器类型后再获取映射关系
      getSensorTypeModelMapping();
    }
  };
  const getSensorTypeModelMapping = () => {
    // 确保deviceTypes.current有数据
    if (deviceTypes.current.length === 0) {
      console.warn(
        "deviceTypes.current is empty, skipping getSensorTypeModelMapping",
      );
      return;
    }

    setSTMMLoading(true);
    dispatch(
      firmwareUpgrade.getSensorTypeModelMapping({
        collectorName: productModel,
      }),
    ).then((res) => {
      setSTMMLoading(false);
      if (res.success) {
        setSensorTypeModelMapping(res.payload.data);
        sensorTypeModelMappingRef.current = res.payload.data;

        // 更新设备类型选项
        const uniqueSensorTypes = [
          ...new Set(res.payload.data.map((item) => item.sensorType)),
        ];
        const availableDeviceTypes = deviceTypes.current.filter((deviceType) =>
          uniqueSensorTypes.includes(deviceType.value),
        );
        setDeviceTypeOptions(availableDeviceTypes);

        setModelOptions(
          res.payload?.data?.filter(
            (item) => item.sensorType === defaultDeviceType,
          ) || [],
        );
      }
    });
  };
  const getFormulaData = () => {
    setSTMMLoading(true);
    dispatch(firmwareUpgrade.getFormulaData()).then((res) => {
      setSTMMLoading(false);
      if (res.success) {
        let data = res.payload.data || [];
        data = data.map((item) => ({ value: item.id, label: item.expression }));
        formulaDataRef.current = data;
        setFormulaData(data);
        setFormulaVersion((v) => v + 1);
      }
    });
  };
  const resetCalcParamLabels = () =>
    setCalcParamLabels({
      p1: "计算参数1",
      p2: "计算参数2",
      p3: "计算参数3",
      p4: "计算参数4",
    });
  const resetCalcParamLabelsAndValues = () => {
    resetCalcParamLabels();
    form.setFieldsValue({
      calcParam1: undefined,
      calcParam2: undefined,
      calcParam3: undefined,
      calcParam4: undefined,
    });
  };
  const getSensorMappingIdByFormulaId = (formulaId) => {
    const values = form.getFieldsValue();
    const fid = Number(formulaId);
    const matched = sensorTypeModelMappingRef.current.find((item) => {
      const formulaIds = Array.isArray(item.formulaIds)
        ? item.formulaIds.map((id) => Number(id))
        : [];
      return (
        item.sensorType === values.deviceType &&
        item.axyModel === values.axyModel &&
        String(item.protocolNo) === String(values.protocolNo) &&
        formulaIds.includes(fid)
      );
    });
    return Number(matched?.id) || null;
  };
  const loadCalcParamLabelsByFormulaId = async (fid) => {
    if (fid === null || fid === undefined || String(fid).trim() === "") {
      resetCalcParamLabelsAndValues();
      return;
    }
    const n = Number(fid);
    if (Number.isNaN(n) || n < 0) {
      resetCalcParamLabelsAndValues();
      return;
    }
    const sensorMappingId = getSensorMappingIdByFormulaId(n);
    if (!sensorMappingId) {
      resetCalcParamLabels();
      return;
    }
    const res = await dispatch(
      firmwareUpgrade.getFormulaParamNames({
        sensorMappingId,
        ids: String(n),
      }),
    );
    const row =
      res && res.success && Array.isArray(res.payload?.data)
        ? res.payload.data[0]
        : null;
    setCalcParamLabels({
      p1: row?.param1Name || "计算参数1",
      p2: row?.param2Name || "计算参数2",
      p3: row?.param3Name || "计算参数3",
      p4: row?.param4Name || "计算参数4",
    });
  };
  const handleOk = (isIssue = false) => {
    if (isIssue) {
      Modal.confirm({
        title: "确认下发",
        content: (
          <div>
            <div>设备原有配置将会被该下发配置覆盖，设备将仅生效该配置。</div>
            <div style={{ marginTop: 8 }}>
              如需所有通道配置生效，请点击“通道配置下发”按钮，将统一下发当前所有通道配置。
            </div>
          </div>
        ),
        okText: "确认下发",
        cancelText: "取消",
        zIndex: 2100,
        onOk: () => {
          setIsIssue(true);
          form.submit();
        },
      });
      return;
    }
    setIsIssue(false);
    form.submit();
  };
  const handleCancel = () => {
    setBatchAddEnabled(false);
    setBatchMode("module");
    setModuleRange({ start: undefined, end: undefined });
    setChannelRange({ start: undefined, end: undefined });
    form.resetFields();
    resetCalcParamLabelsAndValues();
    onClose();
  };

  const handleSubmit = async (values) => {
    if (batchAddEnabled) {
      if (batchMode === "module") {
        if (
          moduleRange.start === undefined ||
          moduleRange.end === undefined ||
          isNaN(Number(moduleRange.start)) ||
          isNaN(Number(moduleRange.end))
        ) {
          message.error("请填写有效的模块号范围");
          return;
        }
        if (
          !Number.isInteger(Number(moduleRange.start)) ||
          !Number.isInteger(Number(moduleRange.end)) ||
          Number(moduleRange.start) <= 0 ||
          Number(moduleRange.end) <= 0
        ) {
          message.error("模块号范围必须为正整数");
          return;
        }
        if (Number(moduleRange.start) > Number(moduleRange.end)) {
          message.error("模块号范围起始值不能大于结束值");
          return;
        }
      } else {
        if (
          channelRange.start === undefined ||
          channelRange.end === undefined ||
          isNaN(Number(channelRange.start)) ||
          isNaN(Number(channelRange.end))
        ) {
          message.error("请填写有效的通道号范围");
          return;
        }
        if (
          !Number.isInteger(Number(channelRange.start)) ||
          !Number.isInteger(Number(channelRange.end)) ||
          Number(channelRange.start) <= 0 ||
          Number(channelRange.end) <= 0
        ) {
          message.error("通道号范围必须为正整数");
          return;
        }
        if (Number(channelRange.start) > Number(channelRange.end)) {
          message.error("通道号范围起始值不能大于结束值");
          return;
        }
      }
    }
    let extraParams = {
      resolution: values.resolution,
      wire: values.wire,
      operatingMode: values.operatingMode,
    };
    let dcmParams = {};
    for (let item of vibrationItems) {
      const v = values[item.field];
      if (v !== undefined && v !== null && v !== "") {
        extraParams[item.field] = v;
      }
    }
    for (let item of souliItems) {
      const v = values[item.field];
      if (v !== undefined && v !== null && v !== "") {
        extraParams[item.field] = v;
      }
    }
    for (let item of vibrationConfigItems) {
      const v = values[item.field];
      if (v !== undefined && v !== null && v !== "") {
        extraParams[item.field] = v;
      }
    }
    for (let item of dcm2OrDcm3Items) {
      dcmParams[item.field] = values[item.field];
    }
    const baseData = {
      deviceCode,
      deviceType: values.deviceType,
      axyModel: values.axyModel,
      protocolNo: values.protocolNo,
      formulaId: values.formulaId,
      calcParam1: values.calcParam1,
      calcParam2: values.calcParam2,
      calcParam3: values.calcParam3,
      calcParam4: values.calcParam4,
      threshold:
        values.low !== null || values.middle !== null || values.top !== null
          ? [values.low, values.middle, values.top]
          : null,
      extraParams,
      dcmParams,
    };

    setCommitting(true);
    if (batchAddEnabled && !editData) {
      const payloadList = [];
      if (batchMode === "module") {
        for (
          let m = Number(moduleRange.start);
          m <= Number(moduleRange.end);
          m++
        ) {
          payloadList.push({
            ...baseData,
            name: `${values.name}${m}`,
            moduleNo: String(m),
            channelNo: values.channelNo,
            subChannelNo: values.subChannelNo,
          });
        }
      } else {
        for (
          let c = Number(channelRange.start);
          c <= Number(channelRange.end);
          c++
        ) {
          payloadList.push({
            ...baseData,
            name: `${values.name}${c}`,
            channelNo: String(c),
            subChannelNo: values.subChannelNo,
            moduleNo: values.moduleNo,
          });
        }
      }
      const res = await dispatch(firmwareUpgrade.addSubDevices(payloadList));
      if (res?.success) {
        const createdIds = Array.isArray(res.payload?.data?.ids)
          ? res.payload.data.ids
          : [];
        if (isIssue && createdIds.length) {
          const issueRes = await dispatch(
            firmwareUpgrade.issueSubCommand(deviceCode, {
              subids: createdIds.join(","),
            }),
          );
          if (issueRes?.success) {
            const batchDesc = `设备ID:${deviceCode}; 操作:批量下发; 模式:${batchMode === "module" ? "模块号递增" : "通道号递增"}; 范围:${batchMode === "module" ? `${moduleRange.start}-${moduleRange.end}` : `${channelRange.start}-${channelRange.end}`}; 名称前缀:${values.name}; 固定模块号:${batchMode === "channel" ? (values.moduleNo ?? "-") : "-"}; 固定通道号:${batchMode === "module" ? (values.channelNo ?? "-") : "-"}; 子通道号:${values.subChannelNo ?? "-"}; 数量:${payloadList.length}; 设备类型:${values.deviceType}; 型号:${values.axyModel ?? "-"}; 协议号:${values.protocolNo ?? "-"}; 公式ID:${values.formulaId ?? "-"}`;
            await dispatch(
              createSystemLog({
                content: `新增并下发子设备，${batchDesc}`,
                module: "设备管理--设备列表--设备概述--子设备",
                url: window.location.href,
                userId: user?.id || null,
              }),
            );
          }
        } else {
          const batchDesc = `设备ID:${deviceCode}; 操作:批量保存; 模式:${batchMode === "module" ? "模块号递增" : "通道号递增"}; 范围:${batchMode === "module" ? `${moduleRange.start}-${moduleRange.end}` : `${channelRange.start}-${channelRange.end}`}; 名称前缀:${values.name}; 固定模块号:${batchMode === "channel" ? (values.moduleNo ?? "-") : "-"}; 固定通道号:${batchMode === "module" ? (values.channelNo ?? "-") : "-"}; 子通道号:${values.subChannelNo ?? "-"}; 数量:${payloadList.length}; 设备类型:${values.deviceType}; 型号:${values.axyModel ?? "-"}; 协议号:${values.protocolNo ?? "-"}; 公式ID:${values.formulaId ?? "-"}`;
          await dispatch(
            createSystemLog({
              content: `新增保存子设备，${batchDesc}`,
              module: "设备管理--设备列表--设备概述--子设备",
              url: window.location.href,
              userId: user?.id || null,
            }),
          );
        }
        setCommitting(false);
        fetchData();
        handleCancel();
        return;
      } else {
        setCommitting(false);
        return;
      }
    }

    const singleData = {
      ...baseData,
      name: values.name,
      moduleNo: values.moduleNo,
      channelNo: values.channelNo,
      subChannelNo: values.subChannelNo,
    };

    let res = null;
    if (editData) {
      res = await dispatch(
        firmwareUpgrade.modifySubDevice(editData.id, singleData),
      );
    } else {
      res = await dispatch(firmwareUpgrade.addSubDevices(singleData));
    }
    if (res?.success) {
      if (isIssue) {
        const issueRes = await dispatch(
          firmwareUpgrade.issueSubCommand(deviceCode, {
            subids: editData ? editData.id : res.payload.data.id,
          }),
        );
        if (issueRes?.success) {
          const singleDesc = `设备ID:${deviceCode}; 操作:${editData ? "修改并下发" : "新增并下发"}; 名称:${singleData.name}; 模块号:${singleData.moduleNo ?? "-"}; 通道号:${singleData.channelNo ?? "-"}; 子通道号:${singleData.subChannelNo ?? "-"}; 设备类型:${singleData.deviceType}; 型号:${singleData.axyModel ?? "-"}; 协议号:${singleData.protocolNo ?? "-"}; 公式ID:${singleData.formulaId ?? "-"}`;
          await dispatch(
            createSystemLog({
              content: `${singleDesc}`,
              module: "设备管理--设备列表--设备概述--子设备",
              url: window.location.href,
              userId: user?.id || null,
            }),
          );
        }
      } else {
        const singleDesc = `设备ID:${deviceCode}; 操作:${editData ? "修改保存" : "新增保存"}; 名称:${singleData.name}; 模块号:${singleData.moduleNo ?? "-"}; 通道号:${singleData.channelNo ?? "-"}; 子通道号:${singleData.subChannelNo ?? "-"}; 设备类型:${singleData.deviceType}; 型号:${singleData.axyModel ?? "-"}; 协议号:${singleData.protocolNo ?? "-"}; 公式ID:${singleData.formulaId ?? "-"}`;
        await dispatch(
          createSystemLog({
            content: `${singleDesc}`,
            module: "设备管理--设备列表--设备概述--子设备",
            url: window.location.href,
            userId: user?.id || null,
          }),
        );
      }
      setCommitting(false);
      fetchData();
      handleCancel();
    } else {
      setCommitting(false);
    }
  };
  useEffect(() => {
    if ((editData?.deviceType && editData?.axyModel) || editData?.formulaId) {
      // 根据设备类型，筛选axyModel
      setModelOptions(
        sensorTypeModelMappingRef.current
          .filter((item) => item.sensorType === editData.deviceType)
          .reduce((unique, item) => {
            // 根据 axyModel 去重
            if (!unique.find((u) => u.axyModel === item.axyModel)) {
              unique.push(item);
            }
            return unique;
          }, []),
      );
    }
  }, [editData]);

  useEffect(() => {
    if (!open) return;
    setBatchAddEnabled(!editData ? batchAddEnabled : false);
    const nextValues = {
      deviceType: editData?.deviceType || defaultDeviceType,
      name: editData?.name,
      axyModel: editData?.axyModel,
      moduleNo: getInitialModuleNo(
        editData?.deviceType || defaultDeviceType,
        editData?.moduleNo,
      ),
      channelNo: editData?.channelNo,
      subChannelNo: editData?.subChannelNo,
      protocolNo: editData?.protocolNo,
      formulaId:
        editData?.formulaId !== undefined && editData?.formulaId !== null
          ? Number(editData?.formulaId)
          : undefined,
      calcParam1: editData?.calcParam1,
      calcParam2: editData?.calcParam2,
      calcParam3: editData?.calcParam3,
      calcParam4: editData?.calcParam4,
      resolution: editData?.extraParams?.resolution,
      wire: editData?.extraParams?.wire,
      operatingMode: editData?.extraParams?.operatingMode,
      channel: editData?.extraParams?.channel,
      gain:
        editData?.extraParams?.gain ||
        (productModel === "FS-LPWAN08"
          ? "0"
          : (editData?.deviceType || defaultDeviceType) === "ZHENXIAN"
            ? "0"
            : undefined),
      souliModuleNo: editData?.extraParams?.souliModuleNo,
      cableLength:
        editData?.extraParams?.cableLength ??
        (SOULI_DEVICE_TYPES.includes(editData?.deviceType || defaultDeviceType)
          ? 10.0
          : undefined),
      linearDensity:
        editData?.extraParams?.linearDensity ??
        (SOULI_DEVICE_TYPES.includes(editData?.deviceType || defaultDeviceType)
          ? 1.0
          : undefined),
      naturalFrequency:
        editData?.extraParams?.naturalFrequency ??
        (SOULI_DEVICE_TYPES.includes(editData?.deviceType || defaultDeviceType)
          ? 20.0
          : undefined),
      frequencyError:
        editData?.extraParams?.frequencyError ??
        (SOULI_DEVICE_TYPES.includes(editData?.deviceType || defaultDeviceType)
          ? 20.0
          : undefined),
      correctionEnabled:
        editData?.extraParams?.correctionEnabled ??
        (SOULI_DEVICE_TYPES.includes(editData?.deviceType || defaultDeviceType)
          ? "1"
          : undefined),
      signalNoiseThreshold:
        editData?.extraParams?.signalNoiseThreshold ??
        (SOULI_DEVICE_TYPES.includes(editData?.deviceType || defaultDeviceType)
          ? -100.0
          : undefined),
      temperatureCompensation:
        editData?.extraParams?.temperatureCompensation ??
        (SOULI_DEVICE_TYPES.includes(editData?.deviceType || defaultDeviceType)
          ? 0.0
          : undefined),
      order:
        editData?.extraParams?.order ??
        (SOULI_DEVICE_TYPES.includes(editData?.deviceType || defaultDeviceType)
          ? 1
          : undefined),
      vibrationGainLevel:
        editData?.extraParams?.vibrationGainLevel ??
        (VIBRATIONS_DEVICE_TYPES.includes(
          editData?.deviceType || defaultDeviceType,
        )
          ? "0"
          : undefined),
      triggerMode:
        editData?.extraParams?.triggerMode ??
        (VIBRATIONS_DEVICE_TYPES.includes(
          editData?.deviceType || defaultDeviceType,
        )
          ? "0"
          : undefined),
      removeDc:
        editData?.extraParams?.removeDc ??
        (VIBRATIONS_DEVICE_TYPES.includes(
          editData?.deviceType || defaultDeviceType,
        )
          ? "1"
          : undefined),
      samplingFrequencyHz:
        editData?.extraParams?.samplingFrequencyHz ??
        (VIBRATIONS_DEVICE_TYPES.includes(
          editData?.deviceType || defaultDeviceType,
        )
          ? "7"
          : undefined),
      filterFactor:
        editData?.extraParams?.filterFactor ??
        (VIBRATIONS_DEVICE_TYPES.includes(
          editData?.deviceType || defaultDeviceType,
        )
          ? "0"
          : undefined),
      triggerLevel:
        editData?.extraParams?.triggerLevel ??
        (VIBRATIONS_DEVICE_TYPES.includes(
          editData?.deviceType || defaultDeviceType,
        )
          ? 10000.0
          : undefined),
      linkedTrigger:
        editData?.extraParams?.linkedTrigger ??
        (VIBRATIONS_DEVICE_TYPES.includes(
          editData?.deviceType || defaultDeviceType,
        )
          ? "0"
          : undefined),
      samplingDuration:
        editData?.extraParams?.samplingDuration ??
        (VIBRATIONS_DEVICE_TYPES.includes(
          editData?.deviceType || defaultDeviceType,
        )
          ? 5
          : undefined),
      lagDuration:
        editData?.extraParams?.lagDuration ??
        (VIBRATIONS_DEVICE_TYPES.includes(
          editData?.deviceType || defaultDeviceType,
        )
          ? 0
          : undefined),
      vibrationModuleNo:
        editData?.extraParams?.vibrationModuleNo ??
        (VIBRATIONS_DEVICE_TYPES.includes(
          editData?.deviceType || defaultDeviceType,
        )
          ? 1000
          : undefined),
      conversionFactor:
        editData?.extraParams?.conversionFactor ??
        (VIBRATIONS_DEVICE_TYPES.includes(
          editData?.deviceType || defaultDeviceType,
        )
          ? 1.0
          : undefined),
      dcDrift:
        editData?.extraParams?.dcDrift ??
        (VIBRATIONS_DEVICE_TYPES.includes(
          editData?.deviceType || defaultDeviceType,
        )
          ? 0.0
          : undefined),
      amplitudeCorrection:
        editData?.extraParams?.amplitudeCorrection ??
        (VIBRATIONS_DEVICE_TYPES.includes(
          editData?.deviceType || defaultDeviceType,
        )
          ? 1.0
          : undefined),
      incentiveSwitch:
        editData?.extraParams?.incentiveSwitch ||
        (productModel === "FS-LPWAN08"
          ? "1"
          : (editData?.deviceType || defaultDeviceType) === "ZHENXIAN"
            ? "1"
            : undefined),
      channelCheck:
        editData?.extraParams?.channelCheck ||
        (productModel === "FS-LPWAN08"
          ? "1"
          : (editData?.deviceType || defaultDeviceType) === "ZHENXIAN"
            ? "1"
            : undefined),
      sampleFrequency:
        editData?.extraParams?.sampleFrequency ||
        (productModel === "FS-LPWAN08"
          ? "0"
          : (editData?.deviceType || defaultDeviceType) === "ZHENXIAN"
            ? "0"
            : undefined),
      incentiveMethod:
        editData?.extraParams?.incentiveMethod ||
        (productModel === "FS-LPWAN08"
          ? "1"
          : (editData?.deviceType || defaultDeviceType) === "ZHENXIAN"
            ? "1"
            : undefined),
      printSwitch:
        editData?.extraParams?.printSwitch ||
        (productModel === "FS-LPWAN08"
          ? "0"
          : (editData?.deviceType || defaultDeviceType) === "ZHENXIAN"
            ? "0"
            : undefined),
      initFrequency:
        editData?.extraParams?.initFrequency ||
        ((editData?.deviceType || defaultDeviceType) === "ZHENXIAN"
          ? "0"
          : undefined),
      errorCorrecting:
        editData?.extraParams?.errorCorrecting ||
        ((editData?.deviceType || defaultDeviceType) === "ZHENXIAN"
          ? "1.0"
          : undefined),
      gains:
        (editData?.deviceType || defaultDeviceType) === "ZHENXIAN"
          ? getDefaultGainsByProductModel(productModel)
          : undefined,
      angXHLimit: editData?.dcmParams?.angXHLimit,
      angYHLimit: editData?.dcmParams?.angYHLimit,
      angZHLimit: editData?.dcmParams?.angZHLimit,
      angXLLimit: editData?.dcmParams?.angXLLimit,
      angYLLimit: editData?.dcmParams?.angYLLimit,
      angZLLimit: editData?.dcmParams?.angZLLimit,
      accXHLimit: editData?.dcmParams?.accXHLimit,
      accYHLimit: editData?.dcmParams?.accYHLimit,
      accZHLimit: editData?.dcmParams?.accZHLimit,
      accXLLimit: editData?.dcmParams?.accXLLimit,
      accYLLimit: editData?.dcmParams?.accYLLimit,
      accZLLimit: editData?.dcmParams?.accZLLimit,
      wyLLimit: editData?.dcmParams?.wyLLimit,
      wyHLimit: editData?.dcmParams?.wyHLimit,
      low:
        editData?.threshold?.[0] !== undefined
          ? editData?.threshold?.[0]
          : null,
      middle:
        editData?.threshold?.[1] !== undefined
          ? editData?.threshold?.[1]
          : null,
      top:
        editData?.threshold?.[2] !== undefined
          ? editData?.threshold?.[2]
          : null,
    };

    form.setFieldsValue({ deviceType: nextValues.deviceType });
    form.setFieldsValue(nextValues);

    const obj = sensorList?.rows?.find(
      (item) => item.opsModel === nextValues.axyModel,
    );
    setModelAbout({
      manufacturer: obj ? obj.manufacturer : "",
      picture: obj ? obj.picture : "",
    });
    const opts =
      sensorTypeModelMappingRef.current
        .filter((item) => item.sensorType === nextValues.deviceType)
        .reduce((unique, item) => {
          if (!unique.find((u) => u.axyModel === item.axyModel)) {
            unique.push(item);
          }
          return unique;
        }, []) || [];
    setModelOptions(opts);
    if (!editData) {
      form.setFieldsValue({
        axyModel: null,
        protocolNo: null,
        formulaId: undefined,
      });
    }
  }, [editData, open]);

  const getFormulaOptionsByTypeModel = (
    deviceType,
    axyModel,
    extraFormulaIds,
  ) => {
    if (!deviceType || !axyModel) return [];
    const rows = sensorTypeModelMappingRef.current.filter(
      (item) => item.sensorType === deviceType && item.axyModel === axyModel,
    );
    const ids = rows
      .map((item) => item.formulaIds)
      .flat()
      .concat(Array.isArray(extraFormulaIds) ? extraFormulaIds : [])
      .map((id) => Number(id))
      .filter((n) => Number.isFinite(n) && n >= 0);
    const uniqueIds = [...new Set(ids)];
    if (uniqueIds.length === 0) return [];
    return formulaDataRef.current.filter((opt) =>
      uniqueIds.includes(Number(opt.value)),
    );
  };

  useEffect(() => {
    if (!open || !editData) return;
    const deviceType =
      form.getFieldValue("deviceType") ||
      editData?.deviceType ||
      defaultDeviceType;
    const axyModel = form.getFieldValue("axyModel") || editData?.axyModel;
    const currentFidRaw = form.getFieldValue("formulaId");
    const currentFid =
      currentFidRaw !== undefined &&
      currentFidRaw !== null &&
      String(currentFidRaw).trim() !== ""
        ? Number(currentFidRaw)
        : null;

    if (deviceType && axyModel) {
      const opts = getFormulaOptionsByTypeModel(
        deviceType,
        axyModel,
        currentFid !== null && Number.isFinite(currentFid) ? [currentFid] : [],
      );
      setFormulaData(opts);
      if (currentFid === null && opts.length === 1) {
        const nextId = Number(opts[0].value);
        form.setFieldsValue({ formulaId: nextId });
        loadCalcParamLabelsByFormulaId(nextId);
      }
      return;
    }

    if (currentFid !== null && Number.isFinite(currentFid) && currentFid >= 0) {
      setFormulaData(
        formulaDataRef.current.filter(
          (opt) => Number(opt.value) === currentFid,
        ),
      );
    } else {
      setFormulaData([]);
    }
  }, [open, editData, sensorTypeModelMapping, formulaVersion]);

  const handleValueChange = (changedValues, allValues) => {
    if (changedValues.hasOwnProperty("formulaId")) {
      const fid = changedValues.formulaId;
      if (fid === null || fid === undefined || String(fid).trim() === "") {
        resetCalcParamLabelsAndValues();
      } else {
        loadCalcParamLabelsByFormulaId(fid);
      }
    }
    if (changedValues.hasOwnProperty("deviceType")) {
      resetCalcParamLabelsAndValues();
      setModelOptions(
        sensorTypeModelMapping
          .filter((item) => item.sensorType === changedValues.deviceType)
          .reduce((unique, item) => {
            // 根据 axyModel 去重
            if (!unique.find((u) => u.axyModel === item.axyModel)) {
              unique.push(item);
            }
            return unique;
          }, []),
      );
      const isSouliType = SOULI_DEVICE_TYPES.includes(changedValues.deviceType);
      const isVibrationsType = VIBRATIONS_DEVICE_TYPES.includes(
        changedValues.deviceType,
      );
      const isDefaultModuleNoType = DEFAULT_MODULE_NO_DEVICE_TYPES.includes(
        changedValues.deviceType,
      );
      form.setFieldsValue({
        axyModel: null,
        protocolNo: null,
        formulaId: null,
        moduleNo: isDefaultModuleNoType ? DEFAULT_MODULE_NO : null,
        cableLength: isSouliType ? 10.0 : undefined,
        linearDensity: isSouliType ? 1.0 : undefined,
        naturalFrequency: isSouliType ? 20.0 : undefined,
        frequencyError: isSouliType ? 20.0 : undefined,
        correctionEnabled: isSouliType ? "1" : undefined,
        signalNoiseThreshold: isSouliType ? -100.0 : undefined,
        temperatureCompensation: isSouliType ? 0.0 : undefined,
        order: isSouliType ? 1 : undefined,
        vibrationGainLevel: isVibrationsType ? "0" : undefined,
        triggerMode: isVibrationsType ? "0" : undefined,
        removeDc: isVibrationsType ? "1" : undefined,
        samplingFrequencyHz: isVibrationsType ? "7" : undefined,
        filterFactor: isVibrationsType ? "0" : undefined,
        triggerLevel: isVibrationsType ? 10000.0 : undefined,
        linkedTrigger: isVibrationsType ? "0" : undefined,
        samplingDuration: isVibrationsType ? 5 : undefined,
        lagDuration: isVibrationsType ? 0 : undefined,
        vibrationModuleNo: isVibrationsType ? 1000 : undefined,
        conversionFactor: isVibrationsType ? 1.0 : undefined,
        dcDrift: isVibrationsType ? 0.0 : undefined,
        amplitudeCorrection: isVibrationsType ? 1.0 : undefined,
      });
      setFormulaData([]);
    }
    if (changedValues.hasOwnProperty("axyModel")) {
      resetCalcParamLabelsAndValues();
      let obj = sensorList?.rows?.find(
        (item) => item.opsModel === changedValues.axyModel,
      );
      setModelAbout({
        manufacturer: obj ? obj.manufacturer : "",
        picture: obj ? obj.picture : "",
      });
      const nextProtocolNo = modelOptions.find(
        (item) => item.axyModel === changedValues.axyModel,
      )?.protocolNo;
      const nextFormulaOptions = getFormulaOptionsByTypeModel(
        allValues.deviceType,
        changedValues.axyModel,
      );
      const shouldAutoSelectFormula = nextFormulaOptions.length === 1;
      const nextFormulaId = shouldAutoSelectFormula
        ? Number(nextFormulaOptions[0].value)
        : null;
      form.setFieldsValue({
        protocolNo: nextProtocolNo ?? null,
        formulaId: nextFormulaId,
      });
      setFormulaData(nextFormulaOptions);
      if (nextFormulaId !== null) {
        loadCalcParamLabelsByFormulaId(nextFormulaId);
      }
    }
  };
  useEffect(() => {
    if (!open) return;
    const fid = editData?.formulaId;
    if (fid !== undefined && fid !== null) {
      loadCalcParamLabelsByFormulaId(fid);
    } else {
      resetCalcParamLabels();
    }
  }, [open, editData, sensorTypeModelMapping]);

  const vibrationItems = [
    {
      label: "通道号",
      field: "channel",
    },
    {
      label: "增益",
      field: "gain",
    },
    {
      label: "激励开关",
      field: "incentiveSwitch",
    },
    {
      label: "通路检查",
      field: "channelCheck",
    },
    {
      label: "采样频率",
      field: "sampleFrequency",
    },
    {
      label: "激励方式",
      field: "incentiveMethod",
    },
    {
      label: "打印开关",
      field: "printSwitch",
    },
    {
      label: productModel == "ZSJ-iVW08" ? "激励频率" : "补偿频率",
      field: "initFrequency",
    },
    {
      label: "修正误差",
      field: "errorCorrecting",
    },
  ];

  const souliItems = [
    {
      label: "线缆长度(m)",
      field: "cableLength",
      type: "number",
    },
    {
      label: "线密度(kg/m)",
      field: "linearDensity",
      type: "number",
    },
    {
      label: "固有频率(Hz)",
      field: "naturalFrequency",
      type: "number",
    },
    {
      label: "频率误差(Hz)",
      field: "frequencyError",
      type: "number",
    },
    {
      label: "修正算法",
      field: "correctionEnabled",
      type: "switch",
      checkedValue: "1",
      unCheckedValue: "0",
    },
    {
      label: "信噪比阈值(dB)",
      field: "signalNoiseThreshold",
      type: "number",
    },
    {
      label: "温度补偿",
      field: "temperatureCompensation",
      type: "number",
    },
    {
      label: "阶数",
      field: "order",
      type: "number",
      min: 1,
      precision: 0,
      step: 1,
    },
  ];

  const vibrationConfigItems = [
    {
      label: "放大倍数",
      field: "vibrationGainLevel",
      type: "select",
      options: [
        { value: "0", label: "1" },
        { value: "1", label: "10" },
        { value: "2", label: "100" },
        { value: "3", label: "1000" },
      ],
    },
    {
      label: "触发模式",
      field: "triggerMode",
      type: "select",
      options: [
        { value: "0", label: "绝对值" },
        { value: "1", label: "上升沿" },
        { value: "2", label: "下降沿" },
        { value: "3", label: "峰峰值" },
      ],
    },
    {
      label: "去直流",
      field: "removeDc",
      type: "switch",
      checkedValue: "1",
      unCheckedValue: "0",
    },
    {
      label: "采样频率(Hz)",
      field: "samplingFrequencyHz",
      type: "select",
      options: [
        { value: "1", label: "1" },
        { value: "2", label: "2" },
        { value: "4", label: "4" },
        { value: "8", label: "8" },
        { value: "16", label: "16" },
        { value: "32", label: "32" },
        { value: "64", label: "64" },
        { value: "128", label: "128" },
        { value: "256", label: "256" },
        { value: "512", label: "512" },
        { value: "1024", label: "1024" },
        { value: "2048", label: "2048" },
        { value: "4096", label: "4096" },
        { value: "8192", label: "8192" },
        { value: "16384", label: "16384" },
      ],
    },
    {
      label: "滤波系数",
      field: "filterFactor",
      type: "select",
      options: [
        { value: "0", label: "1/2" },
        { value: "1", label: "1/4" },
        { value: "2", label: "1/8" },
        { value: "3", label: "1/16" },
      ],
    },
    {
      label: "触发电平(mV)",
      field: "triggerLevel",
      type: "number",
      min: 30,
      max: 10000,
    },
    {
      label: "关联触发",
      field: "linkedTrigger",
      type: "switch",
      checkedValue: "1",
      unCheckedValue: "0",
    },
    {
      label: "采集时长(秒)",
      field: "samplingDuration",
      type: "number",
      min: 1,
      precision: 0,
      step: 1,
    },
    {
      label: "滞后时长(秒)",
      field: "lagDuration",
      type: "number",
      min: 0,
      precision: 0,
      step: 1,
      dependencies: ["samplingDuration"],
      rules: [
        ({ getFieldValue }) => ({
          validator(_, value) {
            if (value === undefined || value === null || value === "") {
              return Promise.resolve();
            }
            const lagDuration = Number(value);
            if (!Number.isFinite(lagDuration) || lagDuration < 0) {
              return Promise.reject(new Error("滞后时长最小为0"));
            }
            const samplingDuration = Number(getFieldValue("samplingDuration"));
            if (
              Number.isFinite(samplingDuration) &&
              lagDuration >= samplingDuration
            ) {
              return Promise.reject(new Error("滞后时长必须小于采集时长"));
            }
            return Promise.resolve();
          },
        }),
      ],
    },
    {
      label: "转换系数",
      field: "conversionFactor",
      type: "number",
    },
    {
      label: "直流漂移",
      field: "dcDrift",
      type: "number",
    },
    {
      label: "幅值修正",
      field: "amplitudeCorrection",
      type: "number",
    },
  ];

  const renderConfigItem = (item) => {
    if (item.type === "select") {
      return (
        <Form.Item
          key={item.field}
          name={item.field}
          label={item.label}
          rules={item.rules}
          dependencies={item.dependencies}
        >
          <Select
            style={{ width: 300 }}
            options={item.options}
            getPopupContainer={(trigger) => trigger.parentNode}
          />
        </Form.Item>
      );
    }

    if (item.type === "switch") {
      return (
        <Form.Item
          key={item.field}
          name={item.field}
          label={item.label}
          valuePropName="checked"
          getValueProps={(value) => ({ checked: value === item.checkedValue })}
          getValueFromEvent={(checked) =>
            checked ? item.checkedValue : item.unCheckedValue
          }
        >
          <Switch checkedChildren="是" unCheckedChildren="否" />
        </Form.Item>
      );
    }

    return (
      <Form.Item
        key={item.field}
        name={item.field}
        label={item.label}
        rules={item.rules}
        dependencies={item.dependencies}
      >
        <InputNumber
          min={item.min}
          max={item.max}
          precision={item.precision}
          step={item.step}
          placeholder={`请输入${item.label}`}
          style={{ width: "100%" }}
        />
      </Form.Item>
    );
  };

  // FS-LPWAN08 + ZHENXIAN 特殊配置字段
  const fsLpwan08ZhenxianItems = [
    {
      label: "通道号",
      field: "channel",
      type: "input",
    },
    {
      label: "增益",
      field: "gains",
      type: "input",
      disabled: true,
      defaultValue: undefined,
    },
    {
      label: "激励电压",
      field: "gain", // 复用gain字段但显示为激励电压
      type: "select",
      options: [
        { value: "0", label: "12V" },
        { value: "1", label: "24V" },
      ],
      defaultValue: "0",
    },
    {
      label: "激励开关",
      field: "incentiveSwitch",
      type: "select",
      options: [
        { value: "0", label: "关闭激励" },
        { value: "1", label: "打开激励" },
      ],
      defaultValue: "1",
    },
    {
      label: "通路检查",
      field: "channelCheck",
      type: "select",
      options: [
        { value: "0", label: "关闭检查" },
        { value: "1", label: "打开检查" },
      ],
      defaultValue: "1",
    },
    {
      label: "采样频率",
      field: "sampleFrequency",
      type: "select",
      options: [
        { value: "0", label: "8K" },
        { value: "1", label: "16K" },
        { value: "2", label: "32K" },
      ],
      defaultValue: "0",
    },
    {
      label: "激励方式",
      field: "incentiveMethod",
      type: "select",
      options: [
        { value: "0", label: "单脉冲" },
        { value: "1", label: "多脉冲" },
        { value: "2", label: "共振激励" },
      ],
      defaultValue: "1",
    },
    {
      label: "打印开关",
      field: "printSwitch",
      type: "select",
      options: [
        { value: "0", label: "关闭打印" },
        { value: "1", label: "打印时域" },
        { value: "2", label: "打印频域" },
        { value: "3", label: "打印时域+频域" },
      ],
      defaultValue: "0",
    },
    {
      label: "补偿频率",
      field: "initFrequency",
      type: "input",
      defaultValue: "0",
    },
    {
      label: "修正误差",
      field: "errorCorrecting",
      type: "input",
      defaultValue: "1.0",
    },
  ];

  const getDefaultGainsByProductModel = (model) => {
    const map = {
      "FS-FXXL": "511",
      "FS-iFWL-ZXSJ": "511",
      "FS-RTU-P4-SL": "511",
    };
    if (!model) return "100";
    return map[model] || "100";
  };

  // ZHENXIAN 通用配置（非 FS-LPWAN08）
  const commonZhenxianItems = [
    {
      label: "通道号",
      field: "channel",
      type: "input",
    },
    {
      label: "增益",
      field: "gains",
      type: "input",
      disabled: true,
      defaultValue: getDefaultGainsByProductModel(productModel),
    },
    {
      label: "激励电压",
      field: "gain", // 复用gain字段但显示为激励电压
      type: "select",
      options: [
        { value: "0", label: "12V" },
        { value: "1", label: "24V" },
      ],
      defaultValue: "0",
    },
    {
      label: "激励开关",
      field: "incentiveSwitch",
      type: "select",
      options: [
        { value: "0", label: "关闭激励" },
        { value: "1", label: "打开激励" },
      ],
      defaultValue: "1",
    },
    {
      label: "通路检查",
      field: "channelCheck",
      type: "select",
      options: [
        { value: "0", label: "关闭检查" },
        { value: "1", label: "打开检查" },
      ],
      defaultValue: "1",
    },
    {
      label: "采样频率",
      field: "sampleFrequency",
      type: "select",
      options: [
        { value: "0", label: "8K" },
        { value: "1", label: "16K" },
        { value: "2", label: "32K" },
      ],
      defaultValue: "0",
    },
    {
      label: "激励方式",
      field: "incentiveMethod",
      type: "select",
      options: [
        { value: "0", label: "单脉冲" },
        { value: "1", label: "多脉冲" },
        { value: "2", label: "共振激励" },
      ],
      defaultValue: "1",
    },
    {
      label: "打印开关",
      field: "printSwitch",
      type: "select",
      options: [
        { value: "0", label: "关闭打印" },
        { value: "1", label: "打印时域" },
        { value: "2", label: "打印频域" },
        { value: "3", label: "打印时域+频域" },
      ],
      defaultValue: "0",
    },
    {
      label: "补偿频率",
      field: "initFrequency",
      type: "input",
      defaultValue: "0",
    },
    {
      label: "修正误差",
      field: "errorCorrecting",
      type: "input",
      defaultValue: "1.0",
    },
  ];

  const dcm2OrDcm3Items = [
    {
      label: "角度X上限",
      field: "angXHLimit",
    },
    {
      label: "角度Y上限",
      field: "angYHLimit",
    },
    {
      label: "角度Z上限",
      field: "angZHLimit",
    },
    {
      label: "角度X下限",
      field: "angXLLimit",
    },
    {
      label: "角度Y下限",
      field: "angYLLimit",
    },
    {
      label: "角度Z下限",
      field: "angZLLimit",
    },

    {
      label: "加速度X上限",
      field: "accXHLimit",
    },
    {
      label: "加速度Y上限",
      field: "accYHLimit",
    },
    {
      label: "加速度Z上限",
      field: "accZHLimit",
    },
    {
      label: "加速度X下限",
      field: "accXLLimit",
    },
    {
      label: "加速度Y下限",
      field: "accYLLimit",
    },
    {
      label: "加速度Z下限",
      field: "accZLLimit",
    },
    {
      label: "位移上限",
      field: "wyHLimit",
    },
    {
      label: "位移下限",
      field: "wyLLimit",
    },
  ];
  return (
    <Modal
      title={`${editData ? "编辑" : "新增"}子设备`}
      open={open}
      style={{ width: 720 }}
      onCancel={handleCancel}
      destroyOnClose={true}
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
            onClick={() => handleOk(false)}
          >
            保存
          </Button>
        </Space>
      }
    >
      <Form
        form={form}
        onFinish={handleSubmit}
        initialValues={{
          deviceType: editData?.deviceType || defaultDeviceType,
          name: editData?.name,
          axyModel: editData?.axyModel,
          moduleNo: getInitialModuleNo(
            editData?.deviceType || defaultDeviceType,
            editData?.moduleNo,
          ),
          channelNo: editData?.channelNo,
          subChannelNo: editData?.subChannelNo,
          protocolNo: editData?.protocolNo,
          formulaId: Number(editData?.formulaId) || undefined,
          calcParam1: editData?.calcParam1,
          calcParam2: editData?.calcParam2,
          calcParam3: editData?.calcParam3,
          calcParam4: editData?.calcParam4,

          resolution: editData?.extraParams?.resolution,
          wire: editData?.extraParams?.wire,
          operatingMode: editData?.extraParams?.operatingMode,

          channel: editData?.extraParams?.channel,
          gain:
            editData?.extraParams?.gain ||
            (productModel === "FS-LPWAN08"
              ? "0"
              : defaultDeviceType === "ZHENXIAN"
                ? "0"
                : undefined),
          souliModuleNo: editData?.extraParams?.souliModuleNo,
          cableLength:
            editData?.extraParams?.cableLength ??
            (SOULI_DEVICE_TYPES.includes(
              editData?.deviceType || defaultDeviceType,
            )
              ? 10.0
              : undefined),
          linearDensity:
            editData?.extraParams?.linearDensity ??
            (SOULI_DEVICE_TYPES.includes(
              editData?.deviceType || defaultDeviceType,
            )
              ? 1.0
              : undefined),
          naturalFrequency:
            editData?.extraParams?.naturalFrequency ??
            (SOULI_DEVICE_TYPES.includes(
              editData?.deviceType || defaultDeviceType,
            )
              ? 20.0
              : undefined),
          frequencyError:
            editData?.extraParams?.frequencyError ??
            (SOULI_DEVICE_TYPES.includes(defaultDeviceType) ? 20.0 : undefined),
          correctionEnabled:
            editData?.extraParams?.correctionEnabled ??
            (SOULI_DEVICE_TYPES.includes(
              editData?.deviceType || defaultDeviceType,
            )
              ? "1"
              : undefined),
          signalNoiseThreshold:
            editData?.extraParams?.signalNoiseThreshold ??
            (SOULI_DEVICE_TYPES.includes(
              editData?.deviceType || defaultDeviceType,
            )
              ? -100.0
              : undefined),
          temperatureCompensation:
            editData?.extraParams?.temperatureCompensation ??
            (SOULI_DEVICE_TYPES.includes(defaultDeviceType) ? 0.0 : undefined),
          order:
            editData?.extraParams?.order ??
            (SOULI_DEVICE_TYPES.includes(defaultDeviceType) ? 1 : undefined),
          vibrationGainLevel:
            editData?.extraParams?.vibrationGainLevel ??
            (VIBRATIONS_DEVICE_TYPES.includes(
              editData?.deviceType || defaultDeviceType,
            )
              ? "0"
              : undefined),
          triggerMode:
            editData?.extraParams?.triggerMode ??
            (VIBRATIONS_DEVICE_TYPES.includes(
              editData?.deviceType || defaultDeviceType,
            )
              ? "0"
              : undefined),
          removeDc:
            editData?.extraParams?.removeDc ??
            (VIBRATIONS_DEVICE_TYPES.includes(
              editData?.deviceType || defaultDeviceType,
            )
              ? "1"
              : undefined),
          samplingFrequencyHz:
            editData?.extraParams?.samplingFrequencyHz ??
            (VIBRATIONS_DEVICE_TYPES.includes(
              editData?.deviceType || defaultDeviceType,
            )
              ? "7"
              : undefined),
          filterFactor:
            editData?.extraParams?.filterFactor ??
            (VIBRATIONS_DEVICE_TYPES.includes(
              editData?.deviceType || defaultDeviceType,
            )
              ? "0"
              : undefined),
          triggerLevel:
            editData?.extraParams?.triggerLevel ??
            (VIBRATIONS_DEVICE_TYPES.includes(
              editData?.deviceType || defaultDeviceType,
            )
              ? 10000.0
              : undefined),
          linkedTrigger:
            editData?.extraParams?.linkedTrigger ??
            (VIBRATIONS_DEVICE_TYPES.includes(
              editData?.deviceType || defaultDeviceType,
            )
              ? "0"
              : undefined),
          samplingDuration:
            editData?.extraParams?.samplingDuration ??
            (VIBRATIONS_DEVICE_TYPES.includes(
              editData?.deviceType || defaultDeviceType,
            )
              ? 5
              : undefined),
          lagDuration:
            editData?.extraParams?.lagDuration ??
            (VIBRATIONS_DEVICE_TYPES.includes(
              editData?.deviceType || defaultDeviceType,
            )
              ? 0
              : undefined),
          vibrationModuleNo:
            editData?.extraParams?.vibrationModuleNo ??
            (VIBRATIONS_DEVICE_TYPES.includes(
              editData?.deviceType || defaultDeviceType,
            )
              ? 1000
              : undefined),
          conversionFactor:
            editData?.extraParams?.conversionFactor ??
            (VIBRATIONS_DEVICE_TYPES.includes(
              editData?.deviceType || defaultDeviceType,
            )
              ? 1.0
              : undefined),
          dcDrift:
            editData?.extraParams?.dcDrift ??
            (VIBRATIONS_DEVICE_TYPES.includes(
              editData?.deviceType || defaultDeviceType,
            )
              ? 0.0
              : undefined),
          amplitudeCorrection:
            editData?.extraParams?.amplitudeCorrection ??
            (VIBRATIONS_DEVICE_TYPES.includes(
              editData?.deviceType || defaultDeviceType,
            )
              ? 1.0
              : undefined),
          gains:
            defaultDeviceType === "ZHENXIAN"
              ? getDefaultGainsByProductModel(productModel)
              : undefined,
          incentiveSwitch:
            editData?.extraParams?.incentiveSwitch ||
            (productModel === "FS-LPWAN08"
              ? "1"
              : defaultDeviceType === "ZHENXIAN"
                ? "1"
                : undefined),
          channelCheck:
            editData?.extraParams?.channelCheck ||
            (productModel === "FS-LPWAN08"
              ? "1"
              : defaultDeviceType === "ZHENXIAN"
                ? "1"
                : undefined),
          sampleFrequency:
            editData?.extraParams?.sampleFrequency ||
            (productModel === "FS-LPWAN08"
              ? "0"
              : defaultDeviceType === "ZHENXIAN"
                ? "0"
                : undefined),
          incentiveMethod:
            editData?.extraParams?.incentiveMethod ||
            (productModel === "FS-LPWAN08"
              ? "1"
              : defaultDeviceType === "ZHENXIAN"
                ? "1"
                : undefined),
          printSwitch:
            editData?.extraParams?.printSwitch ||
            (productModel === "FS-LPWAN08"
              ? "0"
              : defaultDeviceType === "ZHENXIAN"
                ? "0"
                : undefined),
          initFrequency:
            editData?.extraParams?.initFrequency ||
            (defaultDeviceType === "ZHENXIAN" ? "0" : undefined),
          errorCorrecting:
            editData?.extraParams?.errorCorrecting ||
            (defaultDeviceType === "ZHENXIAN" ? "1.0" : undefined),

          angXHLimit: editData?.dcmParams?.angXHLimit,
          angYHLimit: editData?.dcmParams?.angYHLimit,
          angZHLimit: editData?.dcmParams?.angZHLimit,
          angXLLimit: editData?.dcmParams?.angXLLimit,
          angYLLimit: editData?.dcmParams?.angYLLimit,
          angZLLimit: editData?.dcmParams?.angZLLimit,

          accXHLimit: editData?.dcmParams?.accXHLimit,
          accYHLimit: editData?.dcmParams?.accYHLimit,
          accZHLimit: editData?.dcmParams?.accZHLimit,
          accXLLimit: editData?.dcmParams?.accXLLimit,
          accYLLimit: editData?.dcmParams?.accYLLimit,
          accZLLimit: editData?.dcmParams?.accZLLimit,

          wyLLimit: editData?.dcmParams?.wyLLimit,
          wyHLimit: editData?.dcmParams?.wyHLimit,

          low:
            editData?.threshold?.[0] !== undefined
              ? editData.threshold[0]
              : null,
          middle:
            editData?.threshold?.[1] !== undefined
              ? editData.threshold[1]
              : null,
          top:
            editData?.threshold?.[2] !== undefined
              ? editData.threshold[2]
              : null,
        }}
        layout="horizontal"
        onValuesChange={handleValueChange}
      >
        <Form.Item
          name="deviceType"
          label="设备类型"
          // rules={[{ required: true, message: "请选择设备类型" }]}
        >
          <Select
            style={{ width: 300 }}
            options={deviceTypeOptions}
            getPopupContainer={(trigger) => trigger.parentNode}
          />
        </Form.Item>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            marginBottom: 24,
          }}
        >
          <Form.Item
            name="axyModel"
            label="传感器型号"
            style={{ marginBottom: 0 }}
          >
            <Select
              showSearch
              style={{ width: 300 }}
              loading={STMMLoading}
              placeholder="请选择传感器型号"
              getPopupContainer={(trigger) => trigger.parentNode}
            >
              {modelOptions?.map((item) => (
                <Option key={item.axyModel} value={item.axyModel}>
                  {item.axyModel}
                </Option>
              ))}
            </Select>
          </Form.Item>
          {(() => {
            const deviceType = Form.useWatch("deviceType", form);
            const axyModel = Form.useWatch("axyModel", form);
            return deviceType && axyModel;
          })() && (
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Form.Item label="图片" style={{ marginBottom: 0 }}>
                {modelAbout?.picture ? (
                  <Image
                    width={56}
                    height={56}
                    src={`/_file-server/${modelAbout?.picture}`}
                  />
                ) : (
                  <div
                    style={{
                      width: 120,
                      height: 56,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#999",
                      fontSize: 12,
                    }}
                  >
                    暂无图片
                  </div>
                )}
              </Form.Item>
              <Form.Item label="厂家" style={{ marginBottom: 0 }}>
                <div
                  title={modelAbout?.manufacturer}
                  style={{
                    maxWidth: 300,
                    wordBreak: "break-word",
                    whiteSpace: "normal",
                    lineHeight: "20px",
                  }}
                >
                  {modelAbout?.manufacturer || "-"}
                </div>
              </Form.Item>
            </div>
          )}
        </div>
        <Form.Item
          name="name"
          label="子设备名称"
          rules={[{ required: true, message: "请输入子设备名称" }]}
        >
          <Input placeholder="请输入子设备名称" />
        </Form.Item>
        {!editData && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 16,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span>批量添加:</span>
              <Switch
                checked={batchAddEnabled}
                onChange={(checked) => {
                  setBatchAddEnabled(checked);
                  if (checked) {
                    setBatchMode("module");
                  }
                }}
              />
            </div>
            {batchAddEnabled && (
              <Radio.Group
                value={batchMode}
                onChange={(e) => setBatchMode(e.target.value)}
              >
                <Radio value="module">模块号递增</Radio>
                <Radio value="channel">通道号递增</Radio>
              </Radio.Group>
            )}
          </div>
        )}
        {!editData &&
          batchAddEnabled &&
          batchMode === "module" && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 16,
              }}
            >
              <span style={{ width: 84, textAlign: "right" }}>模块号:</span>
              <InputNumber
                value={moduleRange.start}
                onChange={(v) => setModuleRange((s) => ({ ...s, start: v }))}
                min={1}
                precision={0}
                step={1}
                placeholder=""
                max={200}
                style={{ width: 120 }}
              />
              <span>-</span>
              <InputNumber
                value={moduleRange.end}
                onChange={(v) => setModuleRange((s) => ({ ...s, end: v }))}
                min={1}
                precision={0}
                step={1}
                placeholder=""
                max={200}
                style={{ width: 120 }}
              />
            </div>
          )}
        {!editData && batchAddEnabled && batchMode === "channel" && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 16,
            }}
          >
            <span style={{ width: 84, textAlign: "right" }}>通道号:</span>
            <InputNumber
              value={channelRange.start}
              onChange={(v) => setChannelRange((s) => ({ ...s, start: v }))}
              min={1}
              precision={0}
              step={1}
              placeholder=""
              max={30}
              style={{ width: 120 }}
            />
            <span>-</span>
            <InputNumber
              value={channelRange.end}
              onChange={(v) => setChannelRange((s) => ({ ...s, end: v }))}
              min={1}
              precision={0}
              step={1}
              placeholder=""
              max={30}
              style={{ width: 120 }}
            />
          </div>
        )}

        {(() => {
          const deviceType = Form.useWatch("deviceType", form);
          return (
            [
              "ZHENXIAN",
              "RS485",
              "干节点",
              "IIC",
              "VOLTAGE_12V",
              "VOLTAGE_24V",
              "CURRENT_12V",
              "CURRENT_24V",
              "BRIDGE",
            ].includes(deviceType) ||
            (!deviceType && defaultDeviceType === "ZHENXIAN")
          );
        })() ? (
          <>
            {!batchAddEnabled || batchMode !== "channel" ? (
              <Form.Item
                name="channelNo"
                label="通道号"
                rules={[{ required: true, message: "请输入通道号" }]}
              >
                <InputNumber
                  min={1}
                  precision={0}
                  step={1}
                  placeholder="请输入通道号"
                  style={{ width: "100%" }}
                />
              </Form.Item>
            ) : null}
            <Form.Item
              name="subChannelNo"
              label="子通道号"
              rules={subChannelRules}
              extra={`允许范围：1~${subChannelLimit}`}
            >
              <InputNumber
                min={1}
                max={subChannelLimit}
                precision={0}
                step={1}
                placeholder="请输入子通道号"
                style={{ width: "100%" }}
              />
            </Form.Item>
            {!batchAddEnabled || batchMode !== "module" ? (
              <Form.Item
                name="moduleNo"
                label="模块号"
                rules={[{ required: true, message: "请输入模块号" }]}
              >
                <InputNumber
                  min={1}
                  precision={0}
                  step={1}
                  placeholder="请输入模块号"
                  style={{ width: "100%" }}
                />
              </Form.Item>
            ) : null}
            <Form.Item name="low" label="阈值1">
              <InputNumber
                precision={2}
                placeholder="请输入阈值1"
                style={{ width: "100%" }}
              />
            </Form.Item>
            <Form.Item name="middle" label="阈值2">
              <InputNumber
                precision={2}
                placeholder="请输入阈值2"
                style={{ width: "100%" }}
              />
            </Form.Item>
            <Form.Item name="top" label="阈值3">
              <InputNumber
                precision={2}
                placeholder="请输入阈值3"
                style={{ width: "100%" }}
              />
            </Form.Item>
            <Form.Item name="formulaId" label="公式">
              <Select
                style={{ width: 300 }}
                placeholder="请选择公式"
                options={formulaData}
                getPopupContainer={(trigger) => trigger.parentNode}
              />
            </Form.Item>
            <Form.Item name="protocolNo" label="协议号">
              <Input disabled placeholder="协议号" />
            </Form.Item>
            <Form.Item name="calcParam1" label={calcParamLabels.p1}>
              <Input placeholder={"请输入" + calcParamLabels.p1} />
            </Form.Item>
            <Form.Item name="calcParam2" label={calcParamLabels.p2}>
              <Input placeholder={"请输入" + calcParamLabels.p2} />
            </Form.Item>
            <Form.Item name="calcParam3" label={calcParamLabels.p3}>
              <Input placeholder={"请输入" + calcParamLabels.p3} />
            </Form.Item>
            <Form.Item name="calcParam4" label={calcParamLabels.p4}>
              <Input placeholder={"请输入" + calcParamLabels.p4} />
            </Form.Item>
            <Form.Item name="resolution" label="分辨率">
              <InputNumber
                precision={2}
                placeholder="请输入分辨率"
                style={{ width: "100%" }}
              />
            </Form.Item>
            <Form.Item name="wire" label="（有线/无线）对应（0/1）">
              <InputNumber
                precision={0}
                placeholder="0或1"
                style={{ width: "100%" }}
              />
            </Form.Item>
            <Form.Item name="operatingMode" label="工作模式(0~5)">
              <InputNumber
                precision={0}
                placeholder="0-5"
                style={{ width: "100%" }}
              />
            </Form.Item>
          </>
        ) : null}
        {(() => {
          const deviceType = Form.useWatch("deviceType", form);
          return ["SOULI", "VIBRATIONS", "VIBRATIONS_SOULI"].includes(
            deviceType,
          );
        })() ? (
          <>
            {!batchAddEnabled || batchMode !== "channel" ? (
              <Form.Item
                name="channelNo"
                label="通道号"
                rules={[{ required: true, message: "请输入通道号" }]}
              >
                <InputNumber
                  min={1}
                  precision={0}
                  step={1}
                  placeholder="请输入通道号"
                  style={{ width: "100%" }}
                />
              </Form.Item>
            ) : null}
            <Form.Item
              name="subChannelNo"
              label="子通道号"
              rules={subChannelRules}
              extra={`允许范围：1~${subChannelLimit}`}
            >
              <InputNumber
                min={1}
                max={subChannelLimit}
                precision={0}
                step={1}
                placeholder="请输入子通道号"
                style={{ width: "100%" }}
              />
            </Form.Item>
            {!batchAddEnabled || batchMode !== "module" ? (
              <Form.Item
                name="moduleNo"
                label="模块号"
                rules={[{ required: true, message: "请输入模块号" }]}
              >
                <InputNumber
                  min={1}
                  precision={0}
                  step={1}
                  placeholder="请输入模块号"
                  style={{ width: "100%" }}
                />
              </Form.Item>
            ) : null}
          </>
        ) : null}
        {(() => {
          const deviceType = Form.useWatch("deviceType", form);
          return deviceType === "TEMP";
        })() ? (
          <>
            {!batchAddEnabled || batchMode !== "channel" ? (
              <Form.Item
                name="channelNo"
                label="通道号"
                rules={[{ required: true, message: "请输入通道号" }]}
              >
                <InputNumber
                  parser={(value) => Number(value)}
                  formatter={(value) => String(value)}
                  min={1}
                  precision={0}
                  step={1}
                  placeholder="请输入通道号"
                  style={{ width: "100%" }}
                />
              </Form.Item>
            ) : null}
            <Form.Item
              name="subChannelNo"
              label="子通道号"
              rules={subChannelRules}
              extra={`允许范围：1~${subChannelLimit}`}
            >
              <InputNumber
                parser={(value) => Number(value)}
                formatter={(value) => String(value)}
                min={1}
                max={subChannelLimit}
                precision={0}
                step={1}
                placeholder="请输入子通道号"
                style={{ width: "100%" }}
              />
            </Form.Item>
            {!batchAddEnabled || batchMode !== "module" ? (
              <Form.Item
                name="moduleNo"
                label="模块号"
                rules={[{ required: true, message: "请输入模块号" }]}
              >
                <InputNumber
                  parser={(value) => Number(value)}
                  formatter={(value) => String(value)}
                  min={1}
                  precision={0}
                  step={1}
                  placeholder="请输入模块号"
                  style={{ width: "100%" }}
                />
              </Form.Item>
            ) : null}
            <Form.Item
              name="protocolNo"
              label="协议号"
              rules={[{ required: true, message: "请输入协议号" }]}
            >
              <Input disabled placeholder="协议号" />
            </Form.Item>
            <Form.Item name="formulaId" label="公式">
              <Select
                style={{ width: 300 }}
                placeholder="请选择公式"
                options={formulaData}
                getPopupContainer={(trigger) => trigger.parentNode}
              />
            </Form.Item>
            <Form.Item name="calcParam1" label={calcParamLabels.p1}>
              <InputNumber
                placeholder={"请输入" + calcParamLabels.p1}
                style={{ width: "100%" }}
              />
            </Form.Item>
            <Form.Item name="calcParam2" label={calcParamLabels.p2}>
              <InputNumber
                placeholder={"请输入" + calcParamLabels.p2}
                style={{ width: "100%" }}
              />
            </Form.Item>
            <Form.Item name="calcParam3" label={calcParamLabels.p3}>
              <InputNumber
                placeholder={"请输入" + calcParamLabels.p3}
                style={{ width: "100%" }}
              />
            </Form.Item>
            <Form.Item name="calcParam4" label={calcParamLabels.p4}>
              <InputNumber
                placeholder={"请输入" + calcParamLabels.p4}
                style={{ width: "100%" }}
              />
            </Form.Item>
          </>
        ) : null}
        {(() => {
          const deviceType = Form.useWatch("deviceType", form);
          return deviceType === "ZHENXIAN"
            ? productModel === "FS-LPWAN08"
              ? fsLpwan08ZhenxianItems.map((item) => {
                  if (item.type === "select") {
                    return (
                      <Form.Item
                        key={item.field}
                        name={item.field}
                        label={item.label}
                      >
                        <Select
                          style={{ width: 300 }}
                          options={item.options}
                          getPopupContainer={(trigger) => trigger.parentNode}
                        />
                      </Form.Item>
                    );
                  } else {
                    return (
                      <Form.Item
                        key={item.field}
                        name={item.field}
                        label={item.label}
                      >
                        <Input
                          placeholder={`请输入${item.label}`}
                          disabled={!!item.disabled}
                        />
                      </Form.Item>
                    );
                  }
                })
              : commonZhenxianItems.map((item) => {
                  if (item.type === "select") {
                    return (
                      <Form.Item
                        key={item.field}
                        name={item.field}
                        label={item.label}
                      >
                        <Select
                          style={{ width: 300 }}
                          options={item.options}
                          getPopupContainer={(trigger) => trigger.parentNode}
                        />
                      </Form.Item>
                    );
                  } else {
                    return (
                      <Form.Item
                        key={item.field}
                        name={item.field}
                        label={item.label}
                      >
                        <Input
                          placeholder={`请输入${item.label}`}
                          disabled={!!item.disabled}
                        />
                      </Form.Item>
                    );
                  }
                })
            : null;
        })()}
        {(() => {
          const deviceType = Form.useWatch("deviceType", form);
          const showSouli = SOULI_DEVICE_TYPES.includes(deviceType);
          const showVibrations = VIBRATIONS_DEVICE_TYPES.includes(deviceType);

          if (!showSouli && !showVibrations) {
            return null;
          }

          return (
            <>
              {showSouli ? souliItems.map(renderConfigItem) : null}
              {showVibrations
                ? vibrationConfigItems.map(renderConfigItem)
                : null}
            </>
          );
        })()}
        {(() => {
          const deviceType = Form.useWatch("deviceType", form);
          return deviceType === "SPI" || deviceType === "RESISTOR"
            ? dcm2OrDcm3Items.map((item) => (
                <Form.Item
                  key={item.field}
                  name={item.field}
                  label={item.label}
                >
                  <InputNumber
                    placeholder={`请输入${item.label}`}
                    style={{ width: "100%" }}
                  />
                </Form.Item>
              ))
            : null;
        })()}
      </Form>
    </Modal>
  );
}

function mapStateToProps(state) {
  const { auth, global, sensorList } = state;
  return {
    user: auth.user?.userInfo,
    actions: global.actions,
    apiRoot: global.apiRoot,
    sensorList: sensorList.data || [],
  };
}
export default connect(mapStateToProps)(SubDeviceModal);
