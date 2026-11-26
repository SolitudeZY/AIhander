import React, { useState, useEffect } from "react";
import { connect } from "react-redux";
import { Form, Modal, Upload, Input, message, Button, Image } from "antd";
import {
  UploadOutlined,
  PlusOutlined,
  EyeOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import { createSystemLog } from "../../system/actions/log";

function ProductLibraryModal({
  actions,
  dispatch,
  apiRoot,
  open,
  onClose,
  fetchData,
  editData,
  user,
}) {
  const { firmwareUpgrade } = actions;
  const [form] = Form.useForm();
  const [committing, setCommitting] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState("");
  const [previewTitle, setPreviewTitle] = useState("");
  const [formChanged, setFormChanged] = useState(false);
  const [fileList, setFileList] = useState([]);

  useEffect(() => {
    if (open && editData) {
      const pictureList = editData.picture
        ? [
            {
              name: editData.picture.split("/").pop(),
              url: `/_file-server/${editData.picture}`,
              response: { uploaded: editData.picture },
            },
          ]
        : [];

      form.setFieldsValue({
        name: editData.name,
        productCode: editData.productCode,
        model: editData.model,
        productType: editData.productType,
        picture: pictureList,
      });
      setFileList(pictureList);
      setFormChanged(false);
    } else if (open) {
      form.resetFields();
      setFileList([]);
      setFormChanged(false);
    }
  }, [open, editData, form]);

  // 监听表单值变化
  const handleFormChange = () => {
    setFormChanged(true);
  };

  const handleOk = () => {
    form.submit();
  };

  const handleCancel = () => setPreviewOpen(false);

  const handleModalClose = () => {
    if (formChanged && !committing) {
      form.resetFields();
      setFormChanged(false);
      onClose();
    } else {
      form.resetFields();
      setFormChanged(false);
      onClose();
    }
  };

  const handlePreview = async (file) => {
    if (!file.url && !file.preview) {
      file.preview = await getBase64(file.originFileObj);
    }
    setPreviewImage(file.url || file.preview);
    setPreviewOpen(true);
    setPreviewTitle(
      file.name || file.url.substring(file.url.lastIndexOf("/") + 1)
    );
  };

  const getBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });

  const buildProductLogContent = ({ isEdit, newData, oldData }) => {
    const labels = {
      name: "产品名称",
      model: "设备型号",
      productCode: "设备编码",
      productType: "设备类型",
    };

    const formatVal = (key, val) => {
      if (val == null) return "";
      return String(val);
    };

    if (!isEdit) {
      // 新增：列出所有字段取值
      const pairs = Object.keys(labels)
        .map((key) => `${labels[key]}=${formatVal(key, newData[key])}`)
        .join("，");
      return `添加产品：${newData.name}（${pairs}）`;
    }

    // 编辑：仅列出有变化的字段
    const changes = Object.keys(labels).reduce((arr, key) => {
      const oldVal = oldData?.[key];
      const newVal = newData[key];
      const oldS = oldVal == null ? "" : String(oldVal);
      const newS = newVal == null ? "" : String(newVal);
      if (oldS !== newS) {
        arr.push(
          `${labels[key]}：“${formatVal(key, oldVal)}” → “${formatVal(
            key,
            newVal
          )}”`
        );
      }
      return arr;
    }, []);

    const changeText = changes.length ? changes.join("；") : "无字段变更";
    return `更新产品：${newData.name}（变更：${changeText}）`;
  };

  const handleSubmit = async (values) => {
    try {
      // 数据预处理和验证
      const picture =
        values.picture?.[0]?.response?.uploaded ||
        values.picture?.[0]?.url?.replace("/_file-server/", "");

      if (!picture) {
        message.error("请上传型号图片");
        return;
      }

      const data = {
        name: values.name?.trim(),
        model: values.model?.trim(),
        picture,
        productType: values.productType?.trim(),
        productCode: values.productCode?.trim(),
      };

      // 检查必填字段
      const requiredFields = ["name", "model", "productType", "productCode"];
      for (const field of requiredFields) {
        if (!data[field]) {
          message.error(
            `${
              field === "name"
                ? "产品名称"
                : field === "model"
                ? "设备型号"
                : field === "productType"
                ? "设备类型"
                : "设备编码"
            }不能为空`
          );
          return;
        }
      }

      setCommitting(true);

      let res;
      if (editData) {
        message.loading({ content: "正在更新产品信息...", key: "updating" });
        res = await dispatch(
          firmwareUpgrade.putProductLibrary(editData.id, {
            ...data,
            id: editData.id,
          })
        );
      } else {
        message.loading({ content: "正在添加产品...", key: "adding" });
        res = await dispatch(firmwareUpgrade.postProductLibrary(data));
      }

      if (res.success) {
        message.success({
          content: editData ? "产品信息更新成功！" : "产品添加成功！",
          key: editData ? "updating" : "adding",
        });
        form.resetFields();
        setFormChanged(false);
        fetchData();
        onClose();
        dispatch(
          createSystemLog({
            content: buildProductLogContent({
              isEdit: !!editData,
              newData: data,
              oldData: editData,
            }),
            module: "产品库--产品列表",
            url: window.location.href,
            userId: user?.id || null,
          })
        );
      } else {
        message.error({
          content:
            res.message || (editData ? "更新失败，请重试" : "添加失败，请重试"),
          key: editData ? "updating" : "adding",
        });
      }
    } catch (error) {
      console.error("提交失败:", error);
      message.error({
        content: "操作失败，请检查网络连接后重试",
        key: editData ? "updating" : "adding",
      });
    } finally {
      setCommitting(false);
    }
  };

  return (
    <>
      <Modal
        title={
          <span>
            {editData ? "编辑产品库" : "新增产品库"}
            {formChanged && (
              <span style={{ color: "#ff4d4f", marginLeft: 8 }}>*</span>
            )}
          </span>
        }
        open={open}
        onOk={handleOk}
        onCancel={handleModalClose}
        confirmLoading={committing}
        okText="确定"
        cancelText="取消"
        width={600}
        footer={[
          <Button key="cancel" onClick={handleModalClose} disabled={committing}>
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
        ]}
        maskClosable={false}
      >
        <Form
          form={form}
          onFinish={handleSubmit}
          onValuesChange={handleFormChange}
          layout="horizontal"
          labelCol={{ span: 4 }}
          wrapperCol={{ span: 20 }}
        >
          <Form.Item
            name="name"
            label="产品名称"
            rules={[{ required: true, message: "请输入产品名称" }]}
          >
            <Input placeholder="请输入产品名称" />
          </Form.Item>
          <Form.Item
            name="model"
            label="设备型号"
            rules={[{ required: true, message: "请输入设备型号" }]}
          >
            <Input placeholder="请输入设备型号" />
          </Form.Item>
          <Form.Item
            name="productCode"
            label="设备编码"
            rules={[{ required: true, message: "请输入设备编码" }]}
          >
            <Input placeholder="请输入设备编码" />
          </Form.Item>
          <Form.Item
            name="productType"
            label="设备类型"
            rules={[{ required: true, message: "请输入设备类型" }]}
          >
            <Input placeholder="请输入设备类型" />
          </Form.Item>
          <Form.Item
            name="picture"
            label="型号图片"
            rules={[{ required: true, message: "请上传型号图片" }]}
            valuePropName="fileList"
            getValueFromEvent={(e) => {
              if (Array.isArray(e)) {
                return e;
              }
              return e && e.fileList;
            }}
          >
            <Upload
              action={`${apiRoot}/attachments/p`}
              listType="picture-card"
              accept="image/*"
              maxCount={1}
              fileList={fileList}
              showUploadList={{
                showPreviewIcon: true,
                showRemoveIcon: true,
                showDownloadIcon: false,
              }}
              beforeUpload={(file) => {
                const isLt20M = file.size / 1024 / 1024 < 20;
                if (!isLt20M) {
                  message.error("图片大小不能超过20MB!");
                }
                return isLt20M;
              }}
              onChange={(info) => {
                setFileList(info.fileList);
                // 同步更新表单字段
                form.setFieldsValue({ picture: info.fileList });
              }}
              onPreview={handlePreview}
            >
              {fileList.length < 1 && (
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
      </Modal>
      <Modal
        open={previewOpen}
        title={previewTitle}
        footer={null}
        onCancel={handleCancel}
        width={800}
        centered
      >
        <Image
          alt="预览图片"
          style={{ width: "100%" }}
          src={previewImage}
          preview={false}
        />
      </Modal>
    </>
  );
}

function mapStateToProps(state) {
  const { auth, global } = state;
  return {
    user: auth?.user?.userInfo,
    actions: global.actions,
    apiRoot: global.apiRoot,
  };
}
export default connect(mapStateToProps)(ProductLibraryModal);
