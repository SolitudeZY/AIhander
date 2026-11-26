import React from "react";
import {
  Button,
  Descriptions,
  Drawer,
  Empty,
  Table,
  Tag,
  Timeline,
} from "antd";
import { EXEC_STATUS_COLOR, TASK_STATUS_COLOR } from "../constants";

// 升级任务详情
export const UpgradeTaskDetailDrawer = ({ open, loading, detail, onClose }) => (
  <Drawer
    title={`升级任务详情 · ${detail?.taskId || ""}`}
    width={860}
    open={open}
    onClose={onClose}
    destroyOnClose
    footer={
      <Button type="primary" onClick={onClose}>
        关闭
      </Button>
    }
  >
    {detail ? (
      <>
        <Descriptions column={2} bordered size="small">
          <Descriptions.Item label="升级模型">
            {detail.modelName} {detail.targetVersion}
          </Descriptions.Item>
          <Descriptions.Item label="任务状态">
            <Tag color={TASK_STATUS_COLOR[detail.status] || "default"}>{detail.status}</Tag>
            <span style={{ color: "#8c96a5", marginLeft: 8 }}>
              {detail.successCount} / {detail.total} 台升级成功
            </span>
          </Descriptions.Item>
          <Descriptions.Item label="所属项目">{detail.projectName}</Descriptions.Item>
          <Descriptions.Item label="发起人">{detail.creator}</Descriptions.Item>
          <Descriptions.Item label="下发时间" span={2}>
            {detail.dispatchedAt}
          </Descriptions.Item>
        </Descriptions>

        <div style={{ fontWeight: 600, fontSize: 15, margin: "20px 0 12px" }}>执行时间线</div>
        <Timeline
          items={(detail.timeline || []).map((node) => ({
            color: node.title.includes("失败") ? "red" : "blue",
            children: (
              <div>
                <b>{node.title}</b>
                {node.desc ? (
                  <div style={{ color: "#8c96a5", fontSize: 12 }}>{node.desc}</div>
                ) : null}
                {node.time ? (
                  <div style={{ color: "#8c96a5", fontSize: 12, marginTop: 2 }}>{node.time}</div>
                ) : null}
              </div>
            ),
          }))}
        />

        <div style={{ fontWeight: 600, fontSize: 15, margin: "20px 0 12px" }}>设备执行明细</div>
        <Table
          size="small"
          rowKey={(r) => `${r.taskId}-${r.deviceName}`}
          loading={loading}
          pagination={false}
          dataSource={detail.devices || []}
          columns={[
            { title: "设备名称", dataIndex: "deviceName", width: 150 },
            { title: "原版本", dataIndex: "fromVersion", width: 90 },
            { title: "目标版本", dataIndex: "targetVersion", width: 90 },
            {
              title: "执行结果",
              dataIndex: "execStatus",
              width: 100,
              render: (v, r) => (
                <span>
                  <Tag color={EXEC_STATUS_COLOR[v] || "default"}>{v}</Tag>
                  {r.failStage ? (
                    <div style={{ fontSize: 12, color: "#cf1322", marginTop: 4 }}>
                      失败阶段：{r.failStage}
                    </div>
                  ) : null}
                </span>
              ),
            },
            {
              title: "失败原因",
              dataIndex: "failReason",
              render: (v) => v || "—",
            },
            { title: "最后回执时间", dataIndex: "lastReceiptAt", width: 140 },
          ]}
        />
      </>
    ) : (
      <Empty description={loading ? "加载中..." : "暂无任务信息"} />
    )}
  </Drawer>
);
