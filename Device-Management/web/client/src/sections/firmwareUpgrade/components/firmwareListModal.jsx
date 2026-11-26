import React, { useState, useEffect, useRef } from "react";
import { connect } from "react-redux";
import moment from "moment";
import { Button, Table, Modal, Form, Radio } from "antd";
import { UploadOutlined } from "@ant-design/icons";

const firmwareListModal = (props) => {
  const {
    modalVis,
    onCancel,
    apiRoot,
    recordRow,
    versionData,
    vData,
    actions,
    dispatch,
  } = props;
  const api = useRef();
  const [uploadData, setUploadData] = useState({});
  const [data, setData] = useState();
  const [form] = Form.useForm();
  const { firmwareUpgrade } = actions;
  const okHandler = () => {
    form.validateFields().then((res) => {
      const query = {
        version: res?.type,
        device_meta_id: data[0]?.device_meta_id,
        tokenup: "REPLACE_WITH_FIRMWARE_OPERATION_TOKEN",
      };
      const body = [
        {
          thing_id: data[0]?.thing_id,
          device_ids: data?.map((item) => item.deviceId),
          devices: data?.map((item) => {
            return {
              deviceId: item.deviceId,
              deviceType: item.deviceType,
            };
          }),
        },
      ];
      dispatch(firmwareUpgrade.distributeConfiguration(query, body)).then(
        (res) => {
          if (res.success) onCancel();
        }
      );
    });
  };

  useEffect(() => {
    if (
      recordRow &&
      recordRow.length &&
      versionData &&
      versionData.length &&
      vData &&
      vData.length
    ) {
      //匹配设备id
      const res = versionData
        ?.filter((item) => recordRow?.some((p) => p.deviceId === item.deviceId))
        ?.map((child) => {
          return {
            device_meta_id: child.devicemetaId,
            deviceId: child.deviceId,
            thing_id: child.thingId,
            firmwareNo: child.firmwareNo,
            firmwareName: child.firmwareName,
            versionList: vData.filter(
              (n) => n.device_meta_id == child.devicemetaId
            ),
          };
        });
      setData(res);
    }
  }, [recordRow, versionData, vData]);

  return (
    <>
      <Modal
        open={modalVis}
        onCancel={onCancel}
        title="固件升级"
        onOk={okHandler}
        maskClosable={false}
      >
        <Form
          initialValues={{}}
          form={form}
          labelCol={{ span: 7 }}
          wrapperCol={{ span: 15 }}
          labelAlign="left"
        >
          <Form.Item
            name="type"
            label="固件包"
            rules={[{ required: true, message: "版本号必填" }]}
          >
            <Radio.Group>
              {data &&
              data.length &&
              data[0].versionList &&
              data[0].versionList.length
                ? data[0].versionList.map((item, index) => (
                    <Radio
                      key={index}
                      value={item.versionNo}
                      style={{ display: 'block', marginBottom: 8 }}
                    >{`版本名称:${item.firmwareName}-版本号:${item.versionNo}`}</Radio>
                  ))
                : ""}
            </Radio.Group>
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
    apiRoot: global.apiRoot,
  };
}

export default connect(mapStateToProps)(firmwareListModal);
