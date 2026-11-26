"use strict";

import React, { useEffect, useState, useRef } from "react";
import { Modal, Form, DatePicker, Button, Input, Select } from "antd";
import { connect } from "react-redux";
import moment from "moment";

const ServerInfoModal = (props) => {
  const {
    visible,
    onClose,
    dispatch,
    recordRow,
    pepList,
    actions,
    projectList,
  } = props;
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const { service, facility } = actions;

  const [form] = Form.useForm();

  useEffect(() => {}, [recordRow]);
  const cancelHandler = () => {
    onClose();
  };
  const okHandler = () => {
    form.validateFields().then((res) => {
      const query = {
        id: recordRow?.id,
        sketch: res.sketch,
        reason: res.reason,
        repairman: res.repairman,
        remark: res.remark,
        maintenanceStartTime: res.maintenanceStartTime,
        maintenanceFinishTime: res.maintenanceFinishTime,
        state: res.state,
        msg: recordRow ? "编辑服务器信息维护记录" : "添加服务器信息维护记录",
      };
      dispatch(facility.editServerInfoMaintenanceRecord(query)).then((res) => {
        if (res.success) onClose();
        form.resetFields();
      });
    });
  };
  return (
    <Modal
      title={recordRow ? "编辑服务器信息维护记录" : "服务器维护记录添加"}
      open={visible}
      onCancel={cancelHandler}
      onOk={okHandler}
      // footer={recordRow?<Button onClick={cancelHandler}>取消</Button>:<div>
      //     <Button onClick={cancelHandler}>取消</Button>
      //     <Button theme='solid' type='primary' onClick={okHandler}>确定</Button>
      // </div>}
    >
      <Form
        form={form}
        labelCol={{ span: 6 }}
        wrapperCol={{ span: 18 }}
        initialValues={{
          sketch: recordRow?.sketch,
          reason: recordRow?.reason,
          repairman: recordRow?.serverMaintenanceRecordRepairmans?.map(
            (item) => {
              return item.pepUserId;
            }
          ),
          remark: recordRow?.remark,
          maintenanceStartTime: recordRow?.maintenanceStartTime
            ? moment(recordRow.maintenanceStartTime)
            : null,
          maintenanceFinishTime: recordRow?.maintenanceFinishTime
            ? moment(recordRow.maintenanceFinishTime)
            : null,
          state: recordRow?.state,
        }}
      >
        <Form.Item
          name="sketch"
          label="维护简述:"
          rules={[{ required: true, message: "请输入维护简述" }]}
        >
          <Input maxLength={50} />
        </Form.Item>
        <Form.Item
          name="reason"
          label="维修原因:"
          rules={[{ required: true, message: "请输入维修原因" }]}
        >
          <Input />
        </Form.Item>
        <Form.Item name="repairman" label="维修人:">
          <Select style={{ width: "100%" }} mode="multiple" showSearch>
            {pepList?.map((item) => {
              let allusers = [];
              item?.departmentUsers?.forEach((depUser) => {
                if (!allusers.some((item) => item.userId === depUser.userId)) {
                  allusers.push({
                    ...depUser,
                    id: depUser.userId,
                    name: depUser?.user?.name,
                  });
                }
              });
              return (
                <Select.OptGroup label={item.name}>
                  {allusers.map((item1) => {
                    return (
                      <Select.Option
                        value={item1.id}
                        label={item1.name}
                      ></Select.Option>
                    );
                  })}
                </Select.OptGroup>
              );
            })}
          </Select>
        </Form.Item>
        <Form.Item name="remark" label="备注">
          <Input />
        </Form.Item>
        <Form.Item name="maintenanceStartTime" label="维护开始时间:">
          <DatePicker showTime />
        </Form.Item>
        <Form.Item name="maintenanceFinishTime" label="维护完成时间:">
          <DatePicker showTime />
        </Form.Item>
        <Form.Item name="state" label="状态">
          <Select style={{ width: 200 }}>
            <Select.Option value="wait" label="待维修">
              待维修
            </Select.Option>
            <Select.Option value="underway" label="维修中">
              维修中
            </Select.Option>
            <Select.Option value="completed" label="维修完成">
              维修完成
            </Select.Option>
          </Select>
        </Form.Item>
      </Form>
    </Modal>
  );
};
function mapStateToProps(state) {
  const { auth, global, members, webSocket } = state;
  return {
    //   loading: members.isRequesting,
    //   user: auth.user,
    actions: global.actions,
    //   members: members.data,
    //   socket: webSocket.socket
  };
}

export default connect(mapStateToProps)(ServerInfoModal);
