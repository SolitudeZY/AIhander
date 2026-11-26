import React from "react";
import { Modal, Form, Spin, Input } from "antd";
import moment from "moment";
export default function DetailModal(props) {
  const { open, onClose, loading, record } = props;

  return (
    <Spin spinning={loading}>
      <Modal
        title="采集上报数据"
        open={open}
        footer={null}
        onCancel={onClose}
        maskClosable={false}
      >
        <Form
          initialValues={{
            channelNo: record.channelNo,
            subChannelNo: record.subChannelNo,
            sensor_status: record.data?.sensor_status,
            frequency: record.data?.frequency,
            temperature: record.data?.temperature,
            amplitude: record.data?.amplitude,
            snr: record.data?.snr,
            createdAt: moment(record.createdAt).format("YYYY-MM-DD HH:mm:ss"),
          }}
        >
          <Form.Item
            key="通道号"
            name="channelNo"
            label="通道号"
          >
            <Input disabled />
          </Form.Item>
          <Form.Item
            key="子通道号"
            name="subChannelNo"
            label="子通道号"
          >
            <Input disabled />
          </Form.Item>
          <Form.Item
            key="传感器状态"
            name="sensor_status"
            label="传感器状态"
          >
            <Input disabled />
          </Form.Item>
          <Form.Item
            key="频率"
            name="frequency"
            label="频率"
          >
            <Input disabled />
          </Form.Item>
          <Form.Item
            key="温度"
            name="temperature"
            label="温度"
          >
            <Input disabled />
          </Form.Item>
          <Form.Item
            key="幅值"
            name="amplitude"
            label="幅值"
          >
            <Input disabled />
          </Form.Item>
          <Form.Item
            key="信噪比"
            name="snr"
            label="信噪比"
          >
            <Input disabled />
          </Form.Item>
          <Form.Item
            key="采集时间"
            name="createdAt"
            label="采集时间"
          >
            <Input disabled />
          </Form.Item>
        </Form>
      </Modal>
    </Spin>
  );
}
