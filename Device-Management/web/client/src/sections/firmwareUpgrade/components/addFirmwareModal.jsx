import React, { useState, useEffect, useRef } from "react";
import { connect } from "react-redux";
import moment from "moment";
import {
  Button,
  Table,
  Modal,
  Form,
  notification,
  Upload,
  message,
  Input,
  Select,
} from "antd";
import { UploadOutlined, AppstoreOutlined } from "@ant-design/icons";
import { createSystemLog } from "../../system/actions/log";
import request from "superagent";

const AddFirmwareModal = (props) => {
  const {
    modalVis,
    onCancel,
    crawapi,
    recordRow,
    actions,
    dispatch,
    qiniu,
    apiRoot,
    user,
    firmwareToken,
    deviceTypeRefreshKey,
  } = props;
  const [form] = Form.useForm();
  const { domain } = qiniu; //七牛服务器地址
  const { firmwareUpgrade } = actions;
  const [uploadData, setUploadData] = useState({});
  const [options, setOptions] = useState([]); //设备类型的下拉选项
  const [fileObj, setFileObj] = useState({}); //文件对象
  const [fileUrl, setFileUrl] = useState(); //文件地址
  const fileUrlRef = useRef(); //使用ref保存最新的文件地址，避免闭包问题
  const userId = JSON.parse(sessionStorage.getItem("user"))?.userInfo?.id;
  const [removeFlag, setRemoveFlag] = useState(false); //文件是否清除过

  const loadDeviceTypeOptions = () => {
    dispatch(firmwareUpgrade.getDeviceType()).then((res) => {
      if (!res || !res.success) return;
      setOptions(
        res.payload.data?.map((item) => {
          return {
            label: item.model,
            value: item.id,
          };
        })
      );
    });
  };

  useEffect(() => {
    if (modalVis) {
      if (recordRow) {
        let filePathArr = recordRow.filepath.split("/");
        let fileName = filePathArr?.[filePathArr.length - 1];
        // debugger
        setFileObj({ name: fileName });
      } else {
        setFileObj(null);
      }
    }
  }, [modalVis]);

  // 监听 recordRow 变化，更新表单数据
  useEffect(() => {
    if (modalVis && form) {
      if (recordRow) {
        // 编辑模式：设置表单值为当前记录的数据
        form.setFieldsValue({
          firmwareName: recordRow.firmwareName,
          deviceName: recordRow.device_meta_id,
          versionNo: recordRow.versionNo,
          files: [
            {
              uid: "-1",
              name: recordRow.filepath.split("/")[
                recordRow.filepath.split("/")?.length - 1
              ],
              status: "done",
              url: `${domain}/${recordRow.filepath}`,
            },
          ],
          remark: recordRow.comment,
          md5Value: recordRow.md5Value,
          remarks: recordRow.remarks,
        });
      } else {
        // 新增模式：重置表单
        form.resetFields();
      }
    }
  }, [modalVis, recordRow, form, domain]);

  useEffect(() => {
    //获取设备类型
    loadDeviceTypeOptions();
  }, [deviceTypeRefreshKey]);

  const okHandler = () => {
    form.validateFields().then(async (res) => {
      const versionNo = String(res?.versionNo || "").trim();
      const deviceMetaName = options?.find(
        (item) => item.value === res?.deviceName,
      )?.label;
      let existingFirmwares;
      if (!recordRow) {
        try {
          const result = await dispatch(
            firmwareUpgrade.getFirmware({
              tokenup: firmwareToken,
              current: 1,
              pageSize: 100,
              version: versionNo,
              deviceMetaName,
            }),
          );
          if (!result?.success) throw new Error("无法查询固件库");
          existingFirmwares = result.payload?.data?.data || [];
        } catch (_) {
          notification.error({
            message: "新增固件包失败",
            description: "无法校验现有固件，请稍后重试",
            duration: 3,
          });
          return;
        }
      }
      const duplicate = existingFirmwares?.some(
        (item) =>
          String(item.versionNo || "").trim() === versionNo &&
          String(item.device_meta_id) === String(res?.deviceName),
      );
      if (duplicate) {
        notification.error({
          message: "新增固件包失败",
          description: `设备型号 ${deviceMetaName} 已存在版本号 ${versionNo}，不能重复新建，以防覆盖已有固件`,
          duration: 3,
        });
        return;
      }

      // 修正逻辑：优先使用新上传的文件，否则使用原有文件路径
      let finalFilePath;
      if (fileUrlRef.current) {
        // 有新上传的文件，使用新文件
        finalFilePath = `${domain}/` + fileUrlRef.current;
      } else if (recordRow && recordRow.filepath) {
        // 编辑模式且没有上传新文件，使用原文件路径
        finalFilePath = recordRow.filepath;
      } else {
        // 异常情况：新增模式但没有上传文件
        notification.error({
          message: "上传失败",
          description: "请先上传文件",
          duration: 3,
        });
        return;
      }

      request
        .post(crawapi + "/firmwareupgrade")
        // .set('Content-Type','application/octet-stream')
        // .attach('file',blobData,removeFlag?fileObj.name:recordRow?recordRow.firmwareName:fileObj.name)
        .field("filePath", finalFilePath)
        .field("userId", userId || "")
        .field("firmwareName", res?.firmwareName || "")
        .field("comment", res?.remark || "")
        .field("md5Value", res?.md5Value || "")
        .field(
          "device_meta_name",
          deviceMetaName || ""
        )
        .field("remarks", res?.remarks || "")
        .query({
          version: res?.versionNo,
          device_meta_id: res?.deviceName,
          token: "REPLACE_WITH_FIRMWARE_OPERATION_TOKEN",
        })
        .end((err, response) => {
          if (response?.ok) {
            notification.success({
              message: recordRow ? "编辑固件包" : "新增固件包",
              description: recordRow ? "编辑成功" : "新增成功",
              duration: 3,
            });
            setRemoveFlag(false);
            onCancel();

            dispatch(
              createSystemLog({
                content: recordRow
                  ? `编辑固件包：${res?.firmwareName}`
                  : `新增固件包：${res?.firmwareName}`,
                module: "固件库",
                url: window.location.href,
                userId: user?.id || null,
              })
            );
          } else {
            notification.error({
              message: recordRow ? "编辑固件包" : "新增固件包",
              description: recordRow ? "编辑失败" : "新增失败",
              duration: 3,
            });
          }
        });
    });
  };

  //  function readFileAsBlob(file) {
  //    return new Promise((resolve, reject) => {
  //      const reader = new FileReader();
  //      reader.onload = () => {
  //        const blob = new Blob([reader.result], { type: file.type });
  //        resolve(blob);
  //      };

  //      reader.onerror = (error) => {
  //        reject(error);
  //      };

  //      reader.readAsArrayBuffer(file);
  //    });
  //  }

  return (
    <>
      <Modal
        open={modalVis}
        onCancel={onCancel}
        title="固件上传"
        onOk={okHandler}
        zIndex={1100}
        styles={{
          mask: { zIndex: 1099 },
        }}
      >
        <Form
          form={form}
          labelCol={{ span: 7, offset: 1 }}
          wrapperCol={{ span: 15, offset: 1 }}
        >
          <Form.Item
            name="firmwareName"
            label="固件版本名称:"
            rules={[{ required: true, message: "固件版本名称必填" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="deviceName"
            label="设备型号:"
            rules={[{ required: true, message: "设备型号必填" }]}
          >
            <Select
              showSearch
              optionFilterProp="label"
              disabled={recordRow ? true : false}
              placeholder="请选择设备型号"
              options={options}
            />
          </Form.Item>
          <Form.Item
            name="versionNo"
            label="版本号:"
            rules={[{ required: true, message: "版本号必填" }]}
          >
            <Input disabled={recordRow ? true : false} />
          </Form.Item>
          <Form.Item
            name="md5Value"
            label="MD5码值:"
            rules={[{ required: true, message: "MD5码值必填" }]}
          >
            <Input />
          </Form.Item>
          <div title={fileObj?.name}>
            <Form.Item
              name="files"
              label="文件上传"
              rules={[{ required: true, message: "文件上传必填" }]}
              valuePropName="fileList"
              getValueFromEvent={(e) => {
                if (Array.isArray(e)) {
                  return e;
                }
                return e && e.fileList;
              }}
            >
              <Upload
                maxCount={1}
                action={`${apiRoot}/attachments/p`}
                onRemove={() => {
                  setUploadData({});
                  setRemoveFlag(true);
                  fileUrlRef.current = undefined; //清空ref
                }}
                onChange={(info) => {
                  if (info.file.status === "done") {
                    const file = info.file.originFileObj;
                    const responseBody = info.file.response;
                    setFileObj(file);
                    setFileUrl(responseBody?.uploaded);
                    fileUrlRef.current = responseBody?.uploaded; //同时更新ref，确保获取最新值
                    setRemoveFlag(false); // 上传新文件后重置删除标记
                    setUploadData({
                      name: file.name,
                      size: file.size,
                      url: responseBody?.uploaded,
                      uploadTime: moment().format("YYYY-MM-DD HH:mm:ss"),
                    });
                  }
                }}
              >
                <Button icon={<UploadOutlined />}>点击上传</Button>
              </Upload>
            </Form.Item>
          </div>
          <Form.Item name="remark" label="备注:">
            <Input placeholder="请输入项目介绍" />
          </Form.Item>
          <Form.Item name="remarks" label="固件功能描述:">
            <Input placeholder="请输入固件功能描述" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

function mapStateToProps(state) {
  const { auth, global } = state;
  return {
    user: auth.user?.userInfo,
    actions: global.actions,
    crawapi: global.crawapi,
    qiniu: global.qiniu,
    apiRoot: global.apiRoot,
  };
}

export default connect(mapStateToProps)(AddFirmwareModal);
