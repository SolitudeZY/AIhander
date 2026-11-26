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
import request from "superagent";

const AddFirmwareModal = (props) => {
  const { modalVis, onCancel, crawapi, recordRow, actions, dispatch, qiniu } =
    props;
  const [form] = Form.useForm();
  const { domain } = qiniu; //七牛服务器地址
  const { service } = actions;
  const [uploadData, setUploadData] = useState({});
  const [options, setOptions] = useState([]); //设备类型的下拉选项
  const [fileObj, setFileObj] = useState({}); //文件对象
  const [fileUrl, setFileUrl] = useState(); //文件地址
  const userId = JSON.parse(sessionStorage.getItem("user"))?.userInfo?.id;
  const [removeFlag, setRemoveFlag] = useState(false); //文件是否清除过
  useEffect(() => {
    //获取设备类型
    dispatch(service.getDeviceType()).then((res) => {
      setOptions(
        res.payload.data?.map((item) => {
          return {
            label: item.model,
            value: item.id,
          };
        })
      );
    });
  }, []);

  const okHandler = () => {
    form.validateFields().then(async (res) => {
      // const query = {
      //    version:res?.versionNo,
      //    qiniu:domain,
      //    device_meta_id: res?.deviceName,
      //    tokenup: 'REPLACE_WITH_FIRMWARE_OPERATION_TOKEN',
      //    wholeFile:fileUrl,
      // }
      // const body={
      //    filePath:fileUrl,
      //    userId:userId,
      //    comment:res?.remark,
      //    deviceMetaName:options?.find(item=>item.value===res?.deviceName)?.label,
      //    fileObj:fileObj
      // }
      // dispatch(service.upgradeFirmware(query,body)).then(res=>{
      // })
      const responseData = await request
        .get(qiniu + "/" + fileUrl)
        .responseType("blob");
      const blobData = responseData.body;
      request
        .post(crawapi + "/firmwareupgrade")
        // .set('Content-Type','application/octet-stream')
        .attach(
          "file",
          blobData,
          removeFlag
            ? fileObj.name
            : recordRow
            ? recordRow.firmwareName
            : fileObj.name
        )
        .field(
          "filePath",
          removeFlag ? fileUrl : recordRow ? recordRow.filepath : fileUrl
        )
        .field("userId", userId || "")
        .field("comment", res?.remark || "")
        .field(
          "device_meta_name",
          options?.find((item) => item.value === res?.deviceName)?.label || ""
        )
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
          } else {
            console.error("Superagent request failed:");
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
      >
        <Form
          form={form}
          initialValues={{
            firmwareName: recordRow?.firmwareName,
            deviceName: recordRow?.device_meta_id,
            versionNo: recordRow?.versionNo,
            files: recordRow
              ? [
                  {
                    url: `${domain}/${recordRow?.filepath}`,
                    name: recordRow?.firmwareName,
                  },
                ]
              : [],
            remark: recordRow?.remark,
          }}
          labelCol={{ span: 7, offset: 1 }}
          wrapperCol={{ span: 15, offset: 1 }}
        >
          <Form.Item
            name="firmwareName"
            label="固件版本名称:"
            rules={[{ required: true, message: "固件版本名称必填" }]}
          >
            <Input style={{ width: "80%" }} />
          </Form.Item>
          <Form.Item
            name="deviceName"
            label="设备型号:"
            rules={[{ required: true, message: "设备型号必填" }]}
          >
            <Select placeholder="请选择设备型号" options={options} />
          </Form.Item>
          <Form.Item
            name="versionNo"
            label="版本号:"
            rules={[{ required: true, message: "版本号必填" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="files"
            label="文件上传"
            rules={[{ required: true, message: "文件上传必填" }]}
          >
            <Upload
              maxCount={1}
              action={`/_upload/attachments`}
              onRemove={() => {
                setUploadData({});
                setRemoveFlag(true);
              }}
              onChange={({ file, fileList }) => {
                if (file.status === "done") {
                  setFileObj(file);
                  setFileUrl(file.response?.uploaded);
                  setUploadData({
                    name: file.name,
                    size: file.size,
                    url: file.response?.uploaded,
                    uploadTime: moment().format("YYYY-MM-DD HH:mm:ss"),
                  });
                }
              }}
            >
              <Button icon={<UploadOutlined />}>点击上传</Button>
            </Upload>
          </Form.Item>
          <Form.Item name="remark" label="备注:">
            <Input placeholder="请输入项目介绍" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

function mapStateToProps(state) {
  const { auth, global } = state;
  return {
    user: auth.user,
    actions: global.actions,
    crawapi: global.crawapi,
    qiniu: global.qiniu,
  };
}

export default connect(mapStateToProps)(AddFirmwareModal);
