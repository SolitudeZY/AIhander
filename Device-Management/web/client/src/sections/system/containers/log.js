import React, { useState, useEffect, useRef } from "react";
import { connect } from "react-redux";
import { Spin, Button, App } from "antd";
import ProTable from "@ant-design/pro-table";
import { LayoutContent } from "@peace/components";
import ExportData from "../../../components/export-data";
import moment from "moment";
import { Func, ApiTable, isAuthorized } from "$utils";
import { getSystemLog } from "../actions/log";

import "../style.less";

const Log = (props) => {
  const { dispatch, sysLogs } = props;
  const { count } = sysLogs;
  const { message } = App.useApp();
  const [queryData, setQueryData] = useState({});
  const [currentData, setCurrentData] = useState([]);
  const [shouldExport, setShouldExport] = useState(false);
  const exportTriggeredRef = useRef(false);
  const columns = [
    {
      title: "序号",
      dataIndex: "idx",
      ellipsis: true,
      search: false,
      render: (text, record, idx) => {
        return idx + 1;
      },
    },
    {
      title: "操作模块",
      dataIndex: "module",
    },
    {
      title: "操作人",
      dataIndex: "operator",
      ellipsis: true,
      search: false,
      render: (text, record) => {
        return record?.user?.username || "-";
      },
    },
    {
      title: "操作内容",
      dataIndex: "content",
    },
    {
      title: "操作时间",
      dataIndex: "logTime",
      valueType: "dateRange",
      initialValue: [moment().subtract(29, "days"), moment()],
      ellipsis: true,
      fieldProps: {
        presets: [
          {
            label: "近一个月内",
            value: [moment().subtract(29, "days"), moment()],
          },
        ],
      },
      formItemProps: {
        rules: [
          {
            required: true,
            message: "此项为必填项",
          },
        ],
      },
      render: (text, record) => {
        return moment(record.logTime).format("YYYY-MM-DD HH:mm:ss");
      },
    },
  ];

  // 自定义导出函数，包含数据验证
  const handleCustomExport = async () => {
    if (!currentData || currentData.length === 0) {
      message.warning("当前没有数据可以导出，请先查询数据！");
      return;
    }

    // 如果有数据，则触发导出
    exportTriggeredRef.current = false; // 重置触发状态
    setShouldExport(true);
  };

  // 导出完成后重置状态
  useEffect(() => {
    if (shouldExport) {
      // 延迟重置状态，确保ExportData组件有足够时间执行导出
      const timer = setTimeout(() => {
        setShouldExport(false);
        exportTriggeredRef.current = false;
      }, 2000); // 增加到2秒确保导出完成

      return () => clearTimeout(timer);
    }
  }, [shouldExport]);

  return (
    <App>
      <LayoutContent style={{ zIndex: 0 }}>
        <ProTable
          columns={columns}
          rowKey="id"
          pagination={{
            defaultPageSize: 10,
          }}
          options={{
            search: false,
            reload: false,
          }}
          search={{
            optionRender: (searchConfig, formProps, dom) => {
              dom = dom.filter((v) => v?.key == "submit"); //过滤重置
              isAuthorized("EXPORTSYSTEMLOGS") &&
                dom.push(
                  <Button key="exportlog" onClick={handleCustomExport}>
                    导出
                  </Button>
                );
              return dom;
            },
          }}
          form={{
            ignoreRules: false,
          }}
          dateFormatter="string"
          request={async (params) => {
            const {
              pageSize = 10,
              current = 1,
              logTime,
              module,
              content,
            } = params;
            const query = {
              startTime: logTime ? logTime[0] + " 00:00:00" : null,
              endTime: logTime ? logTime[1] + " 23:59:59" : null,
              module: module,
              content: content,
            };
            setQueryData(query);
            const { payload, success } = await dispatch(
              getSystemLog({
                ...query,
                limit: pageSize,
                offset: current,
              })
            );
            const { rows = [], count = 0 } = payload?.data || {};
            // 更新当前数据状态
            setCurrentData(rows);
            return {
              data: rows,
              success: success,
              total: count,
            };
          }}
        />

        {/* 隐藏的导出组件，用于实际执行导出操作 */}
        {shouldExport && (
          <div style={{ display: "none" }}>
            <ExportData
              showIcon={false}
              data={currentData}
              fileName={"系统日志"}
              exportType="fileSaver"
              exportUrl={ApiTable.getSystemLog}
              exportQuery={queryData}
              requestType={"get"}
              columns={columns.filter((v) => v.dataIndex !== "idx")}
              customRender={
                <span
                  ref={(ref) => {
                    if (ref && shouldExport && !exportTriggeredRef.current) {
                      exportTriggeredRef.current = true;
                      // 自动触发点击事件
                      setTimeout(() => {
                        ref.click();
                      }, 100);
                    }
                  }}
                >
                  导出
                </span>
              }
            />
          </div>
        )}
      </LayoutContent>
    </App>
  );
};

function mapStateToProps(state) {
  const { global, sysLogs, auth } = state;
  return {
    loading: sysLogs.isRequesting,
    sysLogs: sysLogs.data || [],
    actions: global.actions,
    user: auth?.user?.userInfo,
  };
}

export default connect(mapStateToProps)(Log);
