import React, { useState, useEffect, useRef } from "react";
import {
  Form,
  Modal,
  Image,
  Button,
  message,
  Select,
  Input,
  AutoComplete,
  Upload,
} from "antd";
import { connect } from "react-redux";
import { PlusOutlined, DeleteOutlined } from "@ant-design/icons";
import { createSystemLog } from "../../system/actions/log";

function SensorModal(props) {
  const {
    actions,
    dispatch,
    apiRoot,
    open,
    onClose,
    fetchData,
    editData,
    options,
    STMMLoading,
    title,
    controllerData,
    formulaData,
    sensorTypes,
    user,
  } = props;
  const [form] = Form.useForm();
  const { firmwareUpgrade } = actions;
  const [committing, setCommitting] = useState(false);
  const [formChanged, setFormChanged] = useState(false);
  const [formulas, setFormulas] = useState([
    { formulaId: "", formulaExpression: "" },
  ]);
  const [fileList, setFileList] = useState([]);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewImage, setPreviewImage] = useState("");
  const fetchedParamCacheRef = useRef(new Map());
  const lastIdsKeyRef = useRef("");

  // 当 editData 或 formulaData 改变时，初始化公式数据
  useEffect(() => {
    if (open && editData?.formulaIds && formulaData) {
      const initialFormulas = editData.formulaIds.map((id) => {
        const foundFormula = formulaData.find((item) => item.id == id);
        return {
          formulaId: id,
          formulaExpression: foundFormula?.expression || "",
        };
      });
      setFormulas(initialFormulas);
      setFormChanged(false);
    } else if (open) {
      setFormulas([{ formulaId: "", formulaExpression: "" }]);
      setFormChanged(false);
    }
  }, [open, editData, formulaData]);

  // 当模态框打开时初始化非公式相关字段（避免在选择公式时重置整个表单）
  useEffect(() => {
    if (open) {
      // 先清空所有状态，避免显示上一次的数据
      setFileList([]);
      setPreviewVisible(false);
      setPreviewImage("");
      
      const pictureList = editData?.picture
        ? [
            {
              uid: "-1",
              name: editData?.picture?.split("/")?.pop(),
              status: "done",
              url: `/_file-server/${editData?.picture}`,
              response: { uploaded: editData?.picture },
            },
          ]
        : [];

      const initialValues = {};
      const setIfPresent = (key, val) => {
        if (val !== undefined && val !== null && val !== "") {
          initialValues[key] = val;
        }
      };

      if (editData) {
        // 编辑模式：设置现有数据
        setIfPresent("collectorId", editData.collectorId);
        setIfPresent("name", editData.sensorName);
        setIfPresent("sensorType", editData.sensorType);
        setIfPresent("opsModel", editData.opsModel);
        setIfPresent("protocolNo", editData.protocolNo);
        setIfPresent("manufacturer", editData.manufacturer);
        initialValues.picture = pictureList;
        
        form.setFieldsValue(initialValues);
        setFileList(pictureList);
      } else {
        // 新增模式：重置表单并清空所有字段
        form.resetFields();
        form.setFieldsValue({
          collectorId: undefined,
          name: undefined,
          sensorType: undefined,
          opsModel: undefined,
          protocolNo: undefined,
          manufacturer: undefined,
          picture: [],
        });
      }
    } else {
      // 关闭时重置状态
      setFileList([]);
      setPreviewVisible(false);
      setPreviewImage("");
    }
  }, [open, editData, form]);

  // 仅在公式集合变化时同步公式相关字段到表单（不影响其他已填写项）
  useEffect(() => {
    if (open) {
      const formulaFieldValues = {};
      formulas.forEach((formula, index) => {
        formulaFieldValues[`formula_${index}_id`] = formula.formulaId;
        formulaFieldValues[`formula_${index}_expression`] =
          formula.formulaExpression;
        const fid = Number(formula.formulaId);
        if (!fid || Number.isNaN(fid) || fid <= 0) {
          formulaFieldValues[`formula_${index}_param1Name`] = "";
          formulaFieldValues[`formula_${index}_param2Name`] = "";
          formulaFieldValues[`formula_${index}_param3Name`] = "";
          formulaFieldValues[`formula_${index}_param4Name`] = "";
        }
      });
      form.setFieldsValue(formulaFieldValues);
    }
  }, [open, formulas, form]);
  useEffect(() => {
    if (!open) {
      fetchedParamCacheRef.current.clear();
      lastIdsKeyRef.current = "";
    }
  }, [open]);
  useEffect(() => {
    if (!open) return;
    let disposed = false;
    const sensorMappingId = Number(editData?.id);
    const ids = formulas
      .map((f) => String(f.formulaId || "").trim())
      .filter((v) => v && /^\d+$/.test(v) && Number(v) > 0);
    const buildAndPatch = () => {
      const patch = {};
      formulas.forEach((f, index) => {
        const fid = String((f && f.formulaId) || "");
        const row = cache.get(`${sensorMappingId}:${fid}`);
        patch[`formula_${index}_param1Name`] = row?.param1Name || "";
        patch[`formula_${index}_param2Name`] = row?.param2Name || "";
        patch[`formula_${index}_param3Name`] = row?.param3Name || "";
        patch[`formula_${index}_param4Name`] = row?.param4Name || "";
      });
      form.setFieldsValue(patch);
      lastIdsKeyRef.current = idsKey;
    };
    if (!Number.isInteger(sensorMappingId) || sensorMappingId <= 0 || ids.length === 0) {
      form.setFieldsValue(
        formulas.reduce((patch, _, index) => ({
          ...patch,
          [`formula_${index}_param1Name`]: "",
          [`formula_${index}_param2Name`]: "",
          [`formula_${index}_param3Name`]: "",
          [`formula_${index}_param4Name`]: "",
        }), {})
      );
      return;
    }
    const uniq = Array.from(new Set(ids));
    const idsKey = uniq.slice().sort().join(",");
    const cache = fetchedParamCacheRef.current;
    const needIds = uniq.filter((id) => !cache.has(`${sensorMappingId}:${id}`));
    if (needIds.length === 0) {
      buildAndPatch();
      return;
    }
    dispatch(
      firmwareUpgrade.getFormulaParamNames({
        sensorMappingId,
        ids: needIds.join(","),
      })
    ).then((res) => {
      if (disposed) return;
      const rows =
        res && res.success && Array.isArray(res.payload?.data)
          ? res.payload.data
          : [];
      rows.forEach((row) => {
        const fid = String(row.formulaId);
        if (fid) cache.set(`${sensorMappingId}:${fid}`, row);
      });
      buildAndPatch();
    });
    return () => {
      disposed = true;
    };
  }, [open, formulas, editData?.id, dispatch, firmwareUpgrade, form]);

  // 监听表单值变化
  const handleFormChange = () => {
    setFormChanged(true);
  };

  // 处理图片上传变化
  const handleUploadChange = (info) => {
    let newFileList = [...info.fileList];

    // // 限制只能上传一张图片
    // newFileList = newFileList.slice(-1);

    // // 更新文件状态
    // newFileList = newFileList.map((file) => {
    //   if (file.response) {
    //     file.url =
    //       file.response.url || `/_file-server/${file.response.uploaded}`;
    //   }
    //   return file;
    // });

    setFileList(newFileList);
    form.setFieldsValue({ picture: newFileList });
    setFormChanged(true);
  };

  // 处理图片预览
  const handlePreview = async (file) => {
    console.log(file, "==========");
    if (!file.url && !file.preview) {
      file.preview = await getBase64(file.originFileObj);
    }
    setPreviewImage(file.url || file.preview);
    setPreviewVisible(true);
  };

  // 处理图片删除
  const handleRemove = (file) => {
    const newFileList = fileList.filter((item) => item.uid !== file.uid);
    setFileList(newFileList);
    form.setFieldsValue({ picture: newFileList });
    setFormChanged(true);
  };

  // 获取base64预览
  const getBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });
  };

  const addFormula = () => {
    const newIndex = formulas.length;
    setFormulas([...formulas, { formulaId: "", formulaExpression: "" }]);

    // 为新添加的公式字段设置默认值
    form.setFieldsValue({
      [`formula_${newIndex}_id`]: "",
      [`formula_${newIndex}_expression`]: "",
      [`formula_${newIndex}_param1Name`]: "",
      [`formula_${newIndex}_param2Name`]: "",
      [`formula_${newIndex}_param3Name`]: "",
      [`formula_${newIndex}_param4Name`]: "",
    });
  };

  const removeFormula = (index) => {
    const newFormulas = formulas.filter((_, i) => i !== index);
    setFormulas(newFormulas);

    // 清理对应的表单字段
    form.setFieldsValue({
      [`formula_${index}_id`]: undefined,
      [`formula_${index}_expression`]: undefined,
      [`formula_${index}_param1Name`]: undefined,
      [`formula_${index}_param2Name`]: undefined,
      [`formula_${index}_param3Name`]: undefined,
      [`formula_${index}_param4Name`]: undefined,
    });

    // 延迟触发所有剩余公式字段的重新验证以检测重复
    setTimeout(() => {
      const fieldsToValidate = [];
      newFormulas.forEach((_, idx) => {
        fieldsToValidate.push(`formula_${idx}_id`);
        fieldsToValidate.push(`formula_${idx}_expression`);
      });
      form.validateFields(fieldsToValidate);
    }, 100);
  };

  const updateFormula = (index, field, value) => {
    const newFormulas = [...formulas];
    newFormulas[index][field] = value;

    // 如果是更新formulaId，自动填入对应的表达式
    if (field === "formulaId") {
      const foundFormula = formulaData?.find((item) => item.id == value);
      if (foundFormula) {
        newFormulas[index].formulaExpression = foundFormula.expression;
      } else {
        newFormulas[index].formulaExpression = "";
      }
    }
    // 如果是更新表达式，自动填入对应的ID
    else if (field === "formulaExpression") {
      const foundFormula = formulaData?.find(
        (item) => item.expression === value
      );
      if (foundFormula) {
        newFormulas[index].formulaId = foundFormula.id;
      }
    }

    setFormulas(newFormulas);
  };

  // 构造系统日志内容：新增时列出所有字段；编辑时仅列出变化字段
  const buildSensorLogContent = ({
    isEdit,
    newData,
    oldData,
    formulaData,
    controllerData,
  }) => {
    const labels = {
      collectorId: "采集仪类型",
      sensorName: "传感器名称",
      sensorType: "传感器类型",
      opsModel: "运维中台型号",
      protocolNo: "传感器协议号",
      manufacturer: "制造商",
      picture: "型号图片",
    };

    const mapCollectorLabel = (id) => {
      if (id === undefined || id === null) return "";
      const found = controllerData?.find(
        (item) => String(item.id) === String(id)
      );
      return found?.model ? String(found.model) : String(id);
    };

    const formatVal = (key, val) => {
      if (val === undefined || val === null) return "";
      const s = String(val);
      if (key === "picture") return s.split("/").pop();
      if (key === "collectorId") return mapCollectorLabel(val);
      return s;
    };

    const formatFormulaItem = (item) => {
      if (!item) return "";
      const idStr =
        item.id !== undefined && item.id !== null ? String(item.id) : "";
      const exprStr =
        item.expression !== undefined && item.expression !== null
          ? String(item.expression)
          : "";
      return `ID:${idStr}${exprStr ? ` 表达式:${exprStr}` : ""}`;
    };

    const oldFormulaMap = (() => {
      const map = new Map();
      const ids = oldData?.formulaIds || [];
      ids.forEach((fid) => {
        const found = formulaData?.find((f) => String(f.id) === String(fid));
        map.set(String(fid), found ? String(found.expression) : "");
      });
      return map;
    })();

    const newFormulaList = Array.isArray(newData?.formulaList)
      ? newData.formulaList
      : Array.isArray(newData?.formulaIds)
      ? newData.formulaIds.map((id) => ({ id, expression: "" }))
      : [];

    if (!isEdit) {
      const basePairs = Object.keys(labels)
        .map((key) => `${labels[key]}=${formatVal(key, newData[key])}`)
        .join("，");
      const formulaPairs = newFormulaList.length
        ? `，公式=[${newFormulaList.map(formatFormulaItem).join("，")}]`
        : "";
      return `添加传感器：${newData.sensorName}（${basePairs}${formulaPairs}）`;
    }

    const changes = [];
    Object.keys(labels).forEach((key) => {
      const oldS =
        oldData && oldData[key] !== undefined && oldData[key] !== null
          ? String(oldData[key])
          : "";
      const newS =
        newData && newData[key] !== undefined && newData[key] !== null
          ? String(newData[key])
          : "";
      if (oldS !== newS) {
        changes.push(
          `${labels[key]}：“${formatVal(key, oldS)}” → “${formatVal(
            key,
            newS
          )}”`
        );
      }
    });

    // 公式变更：新增/移除/表达式变化
    const newFormulaMap = new Map();
    newFormulaList.forEach((it) =>
      newFormulaMap.set(String(it.id), String(it.expression || ""))
    );

    const oldIds = new Set([...oldFormulaMap.keys()]);
    const newIds = new Set([...newFormulaMap.keys()]);

    // 移除的公式
    oldIds.forEach((id) => {
      if (!newIds.has(id)) {
        const oldExpr = oldFormulaMap.get(id) || "";
        changes.push(
          `公式移除：ID:${id}${oldExpr ? `，表达式:${oldExpr}` : ""}`
        );
      }
    });

    // 新增的公式
    newIds.forEach((id) => {
      if (!oldIds.has(id)) {
        const newExpr = newFormulaMap.get(id) || "";
        changes.push(
          `公式新增：ID:${id}${newExpr ? `，表达式:${newExpr}` : ""}`
        );
      }
    });

    // 表达式变化的公式（ID相同）
    newIds.forEach((id) => {
      if (oldIds.has(id)) {
        const oldExpr = oldFormulaMap.get(id) || "";
        const newExpr = newFormulaMap.get(id) || "";
        if (oldExpr !== newExpr) {
          changes.push(
            `公式更新：ID:${id} 表达式：“${oldExpr}” → “${newExpr}”`
          );
        }
      }
    });

    const changeText = changes.length ? changes.join("；") : "无字段变更";
    return `更新传感器：${newData.sensorName}（变更：${changeText}）`;
  };

  const handleSubmit = async (values) => {
    try {
      setCommitting(true);

      // 收集公式数据，包含id和表达式
      const formulaList = [];
      const formulaParamNames = [];
      formulas.forEach((_, index) => {
        const formulaId = values[`formula_${index}_id`];
        const formulaExpression = values[`formula_${index}_expression`];
        // 允许id为0
        if (formulaId !== undefined && formulaId !== null && formulaId !== "") {
          formulaList.push({
            id: Number(formulaId),
            expression: formulaExpression || "",
          });
          formulaParamNames.push({
            formulaId: Number(formulaId),
            param1Name:
              values[`formula_${index}_param1Name`] !== undefined &&
              values[`formula_${index}_param1Name`] !== null
                ? String(values[`formula_${index}_param1Name`]).slice(0, 20)
                : "",
            param2Name:
              values[`formula_${index}_param2Name`] !== undefined &&
              values[`formula_${index}_param2Name`] !== null
                ? String(values[`formula_${index}_param2Name`]).slice(0, 20)
                : "",
            param3Name:
              values[`formula_${index}_param3Name`] !== undefined &&
              values[`formula_${index}_param3Name`] !== null
                ? String(values[`formula_${index}_param3Name`]).slice(0, 20)
                : "",
            param4Name:
              values[`formula_${index}_param4Name`] !== undefined &&
              values[`formula_${index}_param4Name`] !== null
                ? String(values[`formula_${index}_param4Name`]).slice(0, 20)
                : "",
          });
        }
      });

      const data = {
        collectorId: Number(values.collectorId),
        sensorName: values.name,
        sensorType: values.sensorType,
        opsModel: values.opsModel,
        protocolNo: values.protocolNo,
        formulaIds: formulaList.map((f) => f.id), // 兼容旧接口
        formulaList, // 新增：包含id和表达式
        formulaParamNames,
        manufacturer: values.manufacturer,
        axyModel: values.opsModel, //实际上是运维中台型号，这个字段废弃了，不用了，写上确保能够新增成功
        picture: values.picture?.[0]?.response?.uploaded || "",
        ...(editData?.id && { id: editData.id }), // 编辑时添加id
      };

      message.loading({
        content: editData ? "正在更新传感器信息..." : "正在添加传感器...",
        key: "submitting",
      });

      const res = await dispatch(firmwareUpgrade.addOrEditSensor(data));

      if (res.success) {
        fetchedParamCacheRef.current.clear();
        lastIdsKeyRef.current = "";
        message.success({
          content: editData ? "传感器信息更新成功！" : "传感器添加成功！",
          key: "submitting",
        });
        setFormChanged(false);
        fetchData();
        onClose();
        dispatch(
          createSystemLog({
            content: buildSensorLogContent({
              isEdit: !!editData,
              newData: data,
              oldData: editData,
              formulaData,
              controllerData,
            }),
            module: "产品库--传感器列表",
            url: window.location.href,
            userId: user?.id || null,
          })
        );
      } else {
        message.error({
          content:
            res.message || (editData ? "更新失败，请重试" : "添加失败，请重试"),
          key: "submitting",
        });
      }
    } catch (error) {
      console.error("提交失败:", error);
      message.error({
        content: "操作失败，请检查网络连接后重试",
        key: "submitting",
      });
    } finally {
      setCommitting(false);
    }
  };
  const handleOk = () => {
    form.submit();
  };

  const handleModalClose = () => {
    setFormChanged(false);
    form.resetFields(); // 重置表单字段和校验状态
    setFileList([]); // 清空图片列表
    setPreviewVisible(false);
    setPreviewImage("");
    onClose();
  };

  return (
    <Modal
      open={open}
      destroyOnHidden
      title={<span>{title}</span>}
      onOk={handleOk}
      onCancel={handleModalClose}
      width={720}
      style={{ top: 60 }}
      styles={{
        body: {
          maxHeight: "calc(100vh - 200px)",
          overflowY: "auto",
          overflowX: "hidden",
          paddingRight: 8,
        },
      }}
      className="sensor-modal-custom-scrollbar"
      confirmLoading={committing}
      footer={
        title === "详情"
          ? null
          : [
              <Button
                key="cancel"
                onClick={handleModalClose}
                disabled={committing}
              >
                取消
              </Button>,
              <Button
                key="submit"
                type="primary"
                loading={committing}
                onClick={handleOk}
              >
                确定
              </Button>,
            ]
      }
      maskClosable={false}
    >
      <Form
        key={editData?.id || "new"}
        form={form}
        layout="horizontal"
        labelCol={{ span: 6 }}
        wrapperCol={{ span: 18 }}
        onFinish={handleSubmit}
        onValuesChange={handleFormChange}
        initialValues={(() => {
          const initialValues = {
            collectorId: editData?.collectorId,
            name: editData?.sensorName,
            sensorType: editData?.sensorType,
            opsModel: editData?.opsModel,
            protocolNo: editData?.protocolNo,
            manufacturer: editData?.manufacturer,
            picture: editData?.picture
              ? [
                  {
                    name: editData?.picture?.split("/")?.pop(),
                    url: `/_file-server/${editData?.picture}`,
                    response: { uploaded: editData?.picture },
                  },
                ]
              : [],
          };

          // 动态添加公式字段的初始值
          formulas.forEach((formula, index) => {
            initialValues[`formula_${index}_id`] = formula.formulaId;
            initialValues[`formula_${index}_expression`] =
              formula.formulaExpression;
          });

          return initialValues;
        })()}
      >
        <Form.Item
          key="collectorId"
          label="采集仪类型"
          name="collectorId"
          rules={[{ required: true, message: "请选择采集仪类型" }]}
        >
          <Select
            disabled={title === "详情"}
            options={controllerData?.map((item) => ({
              value: item.id,
              label: item.model,
            }))}
          />
        </Form.Item>
        <Form.Item
          key="name"
          label="传感器名称"
          name="name"
          rules={[{ required: true, message: "请填写传感器名称" }]}
        >
          <Input disabled={title === "详情"} />
        </Form.Item>
        <Form.Item
          key="sensorType"
          label="传感器类型"
          name="sensorType"
          rules={[{ required: true, message: "请选择或填写传感器类型" }]}
        >
          <Select
            disabled={title === "详情"}
            options={sensorTypes?.map((item) => ({
              value: item.value,
              label: item.label + "-" + item.value,
            }))}
          />
        </Form.Item>

        <Form.Item
          key="opsModel"
          label="运维中台型号"
          name="opsModel"
          rules={[{ required: true, message: "请选择或填写运维中台型号" }]}
        >
          <AutoComplete
            loading={STMMLoading}
            disabled={title === "详情"}
            options={options?.map((item) => ({
              value: item.value,
              label: item.label,
            }))}
            allowClear
          />
        </Form.Item>
        <Form.Item
          key="protocolNo"
          label="传感器协议号"
          name="protocolNo"
          rules={[{ required: true, message: "请填写传感器协议号" }]}
        >
          <Input disabled={title === "详情"} />
        </Form.Item>
        <div style={{ marginBottom: 24 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginBottom: 16,
              paddingLeft: "5.666667%", // 对应 span: 4 的宽度
            }}
          >
            <label style={{ fontWeight: 500, marginRight: 8 }}>公式配置</label>
          </div>
          {formulas.map((formula, index) => (
            <div
              key={index}
              style={{
                marginBottom: 24,
                paddingLeft: "5.666667%", // 对应 span: 4 的宽度，与其他表单项对齐
                border: "1px solid #d9d9d9",
                borderRadius: 6,
                padding: 16,
                backgroundColor: "#fafafa",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 16,
                }}
              >
                <span style={{ fontWeight: 500, color: "#666" }}>
                  公式 {index + 1}
                </span>
                {title !== "详情" && formulas.length > 1 && (
                  <Button
                    type="danger"
                    icon={<DeleteOutlined />}
                    onClick={() => removeFormula(index)}
                    size="small"
                  />
                )}
              </div>

              <Form.Item
                name={`formula_${index}_id`}
                label="公式ID"
                style={{ marginBottom: 16 }}
                rules={[
                  { required: true, message: "请选择或填写公式id" },
                  {
                    validator: (_, value) => {
                      if (
                        value !== undefined &&
                        value !== null &&
                        value !== "" &&
                        !/^\d+$/.test(value)
                      ) {
                        return Promise.reject(new Error("公式id必须为数字"));
                      }
                      return Promise.resolve();
                    },
                  },
                  {
                    validator: (_, value) => {
                      if (
                        value !== undefined &&
                        value !== null &&
                        value !== ""
                      ) {
                        // 检查当前公式ID是否与其他公式ID重复
                        const currentFormulaIds = [];
                        formulas.forEach((_, idx) => {
                          const formulaId = form.getFieldValue(
                            `formula_${idx}_id`
                          );
                          if (
                            formulaId !== undefined &&
                            formulaId !== null &&
                            formulaId !== ""
                          ) {
                            currentFormulaIds.push(String(formulaId));
                          }
                        });

                        const duplicateCount = currentFormulaIds.filter(
                          (id) => id === String(value)
                        ).length;
                        if (duplicateCount > 1) {
                          return Promise.reject(new Error("公式id不允许重复"));
                        }
                      }
                      return Promise.resolve();
                    },
                  },
                ]}
              >
                <AutoComplete
                  placeholder="请输入或选择公式ID"
                  disabled={title === "详情"}
                  options={
                    formulaData && formulaData.length > 0
                      ? formulaData
                          .map((item, idx) => ({
                            value: String(item.id),
                            label: String(item.id),
                            key: `id_${item.id}_${idx}`, // 使用id和索引确保唯一性
                          }))
                          .sort((a, b) => Number(a.value) - Number(b.value))
                      : []
                  }
                  onChange={(value) => {
                    updateFormula(index, "formulaId", value);
                    // 同步更新表单字段
                    const foundFormula = formulaData?.find(
                      (item) => item.id == value
                    );
                    if (foundFormula) {
                      form.setFieldsValue({
                        [`formula_${index}_expression`]:
                          foundFormula.expression,
                      });
                      updateFormula(
                        index,
                        "formulaExpression",
                        foundFormula.expression
                      );
                    } else {
                      form.setFieldsValue({
                        [`formula_${index}_expression`]: "",
                      });
                      updateFormula(index, "formulaExpression", "");
                    }
                    const v = String(value || "").trim();
                    if (!v || !/^\d+$/.test(v) || Number(v) <= 0) {
                      form.setFieldsValue({
                        [`formula_${index}_param1Name`]: "",
                        [`formula_${index}_param2Name`]: "",
                        [`formula_${index}_param3Name`]: "",
                        [`formula_${index}_param4Name`]: "",
                      });
                    }

                    // 触发所有公式ID字段的重新验证以检测重复
                    setTimeout(() => {
                      formulas.forEach((_, idx) => {
                        form.validateFields([
                          `formula_${idx}_id`,
                          `formula_${idx}_expression`,
                        ]);
                      });
                    }, 0);
                  }}
                />
              </Form.Item>

              <Form.Item
                name={`formula_${index}_expression`}
                label="公式表达式"
                style={{ marginBottom: 0 }}
                rules={[
                  { required: true, message: "请选择或填写公式表达式" },
                  {
                    validator: (_, value) => {
                      if (
                        value !== undefined &&
                        value !== null &&
                        value !== ""
                      ) {
                        // 检查当前公式表达式是否与其他公式表达式重复
                        const currentFormulaExpressions = [];
                        formulas.forEach((_, idx) => {
                          const formulaExpression = form.getFieldValue(
                            `formula_${idx}_expression`
                          );
                          if (
                            formulaExpression !== undefined &&
                            formulaExpression !== null &&
                            formulaExpression !== ""
                          ) {
                            currentFormulaExpressions.push(
                              String(formulaExpression)
                            );
                          }
                        });

                        const duplicateCount = currentFormulaExpressions.filter(
                          (expression) => expression === String(value)
                        ).length;
                        if (duplicateCount > 1) {
                          return Promise.reject(
                            new Error("公式表达式不允许重复")
                          );
                        }
                      }
                      return Promise.resolve();
                    },
                  },
                ]}
              >
                <AutoComplete
                  placeholder="请输入或选择公式表达式"
                  disabled={title === "详情"}
                  options={(() => {
                    const foundFormula = formulaData?.find(
                      (item) => item.id == formula.formulaId
                    );
                    if (foundFormula && formulaData && formulaData.length > 0) {
                      return formulaData.map((item, idx) => ({
                        value: item.expression,
                        label: item.expression,
                        key: `expression_${item.id}_${idx}`, // 使用id和索引确保唯一性
                      }));
                    }
                    return [];
                  })()}
                  onChange={(value) => {
                    updateFormula(index, "formulaExpression", value);
                    // 同步更新表单字段
                    const foundFormula = formulaData?.find(
                      (item) => item.expression === value
                    );
                    if (foundFormula) {
                      form.setFieldsValue({
                        [`formula_${index}_id`]: foundFormula.id,
                      });
                      updateFormula(index, "formulaId", foundFormula.id);
                    } else {
                      const v = String(value || "").trim();
                      if (!v || v === "无") {
                        form.setFieldsValue({
                          [`formula_${index}_id`]: "",
                          [`formula_${index}_param1Name`]: "",
                          [`formula_${index}_param2Name`]: "",
                          [`formula_${index}_param3Name`]: "",
                          [`formula_${index}_param4Name`]: "",
                        });
                        updateFormula(index, "formulaId", "");
                      }
                    }

                    // 触发所有公式表达式字段的重新验证以检测重复
                    setTimeout(() => {
                      formulas.forEach((_, idx) => {
                        form.validateFields([`formula_${idx}_expression`]);
                      });
                    }, 0);
                  }}
                />
              </Form.Item>
              <Form.Item
                name={`formula_${index}_param1Name`}
                label="计算参数1"
                style={{ marginTop: 16 }}
                rules={[
                  {
                    validator: (_, value) => {
                      if (
                        value !== undefined &&
                        value !== null &&
                        String(value).length > 20
                      ) {
                        return Promise.reject(new Error("不超过20个字符"));
                      }
                      return Promise.resolve();
                    },
                  },
                ]}
              >
                <Input disabled={title === "详情"} maxLength={20} />
              </Form.Item>
              <Form.Item
                name={`formula_${index}_param2Name`}
                label="计算参数2"
                rules={[
                  {
                    validator: (_, value) => {
                      if (
                        value !== undefined &&
                        value !== null &&
                        String(value).length > 20
                      ) {
                        return Promise.reject(new Error("不超过20个字符"));
                      }
                      return Promise.resolve();
                    },
                  },
                ]}
              >
                <Input disabled={title === "详情"} maxLength={20} />
              </Form.Item>
              <Form.Item
                name={`formula_${index}_param3Name`}
                label="计算参数3"
                rules={[
                  {
                    validator: (_, value) => {
                      if (
                        value !== undefined &&
                        value !== null &&
                        String(value).length > 20
                      ) {
                        return Promise.reject(new Error("不超过20个字符"));
                      }
                      return Promise.resolve();
                    },
                  },
                ]}
              >
                <Input disabled={title === "详情"} maxLength={20} />
              </Form.Item>
              <Form.Item
                name={`formula_${index}_param4Name`}
                label="计算参数4"
                rules={[
                  {
                    validator: (_, value) => {
                      if (
                        value !== undefined &&
                        value !== null &&
                        String(value).length > 20
                      ) {
                        return Promise.reject(new Error("不超过20个字符"));
                      }
                      return Promise.resolve();
                    },
                  },
                ]}
              >
                <Input disabled={title === "详情"} maxLength={20} />
              </Form.Item>
            </div>
          ))}
          {title !== "详情" && (
            <div style={{ paddingLeft: "5.666667%" }}>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={addFormula}
                size="small"
                style={{ marginTop: 8 }}
              >
                添加公式
              </Button>
            </div>
          )}
        </div>
        <Form.Item key="manufacturer" name="manufacturer" label="厂家">
          <Input disabled={title === "详情"} />
        </Form.Item>
        <Form.Item
          name="picture"
          label="图片"
          valuePropName="fileList"
          getValueFromEvent={(e) => {
            if (Array.isArray(e)) {
              return e;
            }
            return e?.fileList || [];
          }}
        >
          <Upload
            disabled={title === "详情"}
            action={`${apiRoot}/attachments/p`}
            listType="picture-card"
            accept="image/*"
            fileList={fileList}
            maxCount={1}
            beforeUpload={(file) => {
              const isLt20M = file.size / 1024 / 1024 < 20;
              if (!isLt20M) {
                message.error("图片大小不能超过 20MB!");
              }
              return isLt20M;
            }}
            onChange={handleUploadChange}
            onPreview={handlePreview}
            onRemove={handleRemove}
            showUploadList={{
              showPreviewIcon: true,
              showRemoveIcon: title !== "详情",
              showDownloadIcon: false,
            }}
          >
            {title !== "详情" && fileList.length < 1 && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "100%",
                  color: "#999",
                  fontSize: "14px",
                }}
              >
                <PlusOutlined
                  style={{ fontSize: "24px", marginBottom: "8px" }}
                />
                <div>上传图片</div>
              </div>
            )}
          </Upload>
        </Form.Item>
      </Form>

      {/* 图片预览Modal */}
      <Modal
        open={previewVisible}
        title="图片预览"
        footer={null}
        onCancel={() => setPreviewVisible(false)}
        centered
        width={800}
      >
        <Image
          alt="预览图片"
          style={{ width: "100%" }}
          src={previewImage}
          preview={false}
        />
      </Modal>
    </Modal>
  );
}

function mapStateToProps(state) {
  const { auth, global, productLibrary } = state;
  return {
    user: auth?.user?.userInfo,
    actions: global.actions,
    productLibrary: productLibrary.data,
    loading: productLibrary.isRequesting,
    apiRoot: global.apiRoot,
  };
}
export default connect(mapStateToProps)(SensorModal);
