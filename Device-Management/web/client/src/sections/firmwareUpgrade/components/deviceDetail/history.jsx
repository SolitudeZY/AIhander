import React, { useEffect, useState } from "react";
import { connect } from "react-redux";
import {
  Button,
  Table,
  Popconfirm,
  Pagination,
  Input,
  Space,
  Dropdown,
  DatePicker,
  message,
  Card,
  Row,
  Col,
  ConfigProvider,
} from "antd";
import zhCN from "antd/locale/zh_CN";
import dayjs from "dayjs";
import "dayjs/locale/zh-cn";

const statusMap = {
  0: "待处理",
  1: "同步中",
  2: "成功",
  3: "失败",
  4: "已覆盖",
};
const pageSize = 10;
const IssuedHistory = (props) => {
  const { actions, dispatch, commandHistories, loading } = props;
  const { firmwareUpgrade } = actions;
  const urlParams = new URLSearchParams(window.location.search);
  const deviceCode = urlParams.get("deviceCode");

  // 设置 dayjs 中文语言环境
  dayjs.locale("zh-cn");

  const [currentPage, setPage] = useState(1);
  const [dateRange, setDateRange] = useState([]);
  const [commandName, setCommandName] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = (currentPage = 1) => {
    if (!deviceCode) {
      message.warning("缺少页面参数，请返回重试");
    }
    setPage(currentPage);
    let query = {
      pageSize: pageSize,
      page: currentPage,
      deviceCode,
    };
    if (dateRange && dateRange.length === 2 && dateRange[0] && dateRange[1]) {
      query.startTime = dateRange[0].format("YYYY-MM-DD") + " 00:00:00";
      query.endTime = dateRange[1].format("YYYY-MM-DD") + " 23:59:59";
    }
    if (commandName) {
      query.commandName = commandName;
    }
    dispatch(firmwareUpgrade.getCommandHistories(query));
  };

  const handlePageChange = (page) => {
    fetchData(page);
  };

  const columns = [
    {
      title: "指令名称",
      dataIndex: "commandName",
      width: 150,
      ellipsis: true,
    },
    {
      title: "下发时间",
      dataIndex: "commandTime",
      width: 180,
      render: (text) => dayjs(text).format("YYYY-MM-DD HH:mm:ss"),
    },
    {
      title: "指令内容",
      dataIndex: "commandContent",
      width: 300,
      ellipsis: {
        showTitle: false,
      },
      render: (text) => (
        <div
          style={{
            wordBreak: "break-all",
            whiteSpace: "pre-wrap",
            maxHeight: "100px",
            overflowY: "auto",
          }}
        >
          {text}
        </div>
      ),
    },
    {
      title: "响应状态",
      dataIndex: "responseStatus",
      width: 100,
      render: (text) => statusMap[text],
    },
    {
      title: "响应时间",
      dataIndex: "responseTime",
      width: 180,
      render: (text) =>
        text ? dayjs(text).format("YYYY-MM-DD HH:mm:ss") : "",
    },
  ];
  return (
    <ConfigProvider locale={zhCN}>
      <Card style={{ margin: "16px" }}>
        <Row gutter={[8, 8]} style={{ marginBottom: 16 }}>
          <Col>
            <Space size="small">
              <span>时间筛选：</span>
              <DatePicker.RangePicker
                style={{ width: 260 }}
                value={dateRange}
                onChange={(dates, dateStrings) => {
                  setDateRange(dates);
                }}
                allowClear={true}
                placeholder={["开始日期", "结束日期"]}
                locale={zhCN.DatePicker}
              />
              <span>指令名称：</span>
              <Input
                style={{ width: 160 }}
                value={commandName}
                onChange={(e) => setCommandName(e.target.value)}
                allowClear={true}
                placeholder="请输入指令名称"
              />
              <Button type="primary" onClick={() => fetchData(1)}>
                查询
              </Button>
            </Space>
          </Col>
        </Row>
        <Table
          columns={columns}
          dataSource={commandHistories?.rows || []}
          loading={loading}
          pagination={{
            current: currentPage,
            pageSize,
            total: commandHistories?.count,
            onChange: handlePageChange,
            showTotal: (total, range) =>
              `第 ${range[0]}-${range[1]} 条/共 ${total} 条`,
          }}
          rowKey="id"
          scroll={{ y: 510 }}
        />
      </Card>
    </ConfigProvider>
  );
};

function mapStateToProps(state) {
  const { auth, global, commandHistories } = state;
  return {
    user: auth.user,
    actions: global.actions,
    commandHistories: commandHistories.data,
    loading: commandHistories.isRequesting,
  };
}
export default connect(mapStateToProps)(IssuedHistory);
