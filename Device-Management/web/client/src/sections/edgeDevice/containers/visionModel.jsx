import React, { useCallback, useEffect, useMemo, useState } from "react";
import { connect } from "react-redux";
import { Button, Input, Select, Space, Table } from "antd";
import { isAuthorized } from "$utils";
import moment from "moment";
import "../style.less";
import { MODEL_PERMISSIONS, RECOGNITION_TYPES } from "../constants";
import {
  UploadModelModal,
} from "../components/model-components";
import { toRows } from "../components/common";

const VisionModel = ({ actions, dispatch }) => {
  const { edgeDevice } = actions || {};

  const [list, setList] = useState([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [keyword, setKeyword] = useState("");
  const [type, setType] = useState(undefined);
  const [submitted, setSubmitted] = useState({});

  const [uploadOpen, setUploadOpen] = useState(false);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await dispatch(
        edgeDevice.queryVisionModels({ page, pageSize, ...submitted }),
      );
      if (res?.success) {
        const rows = toRows(res.payload?.data);
        setList(rows);
        setCount(Number(res.payload?.data?.count ?? rows.length));
      }
    } finally {
      setLoading(false);
    }
  }, [actions, dispatch, edgeDevice, page, pageSize, submitted]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const columns = useMemo(
    () => [
      {
        title: "模型名称",
        dataIndex: "modelName",
        width: 220,
        render: (_, r) => <b>{r.modelName}</b>,
      },
      {
        title: "识别类型",
        dataIndex: "modelType",
        width: 130,
        render: (v) => RECOGNITION_TYPES[v] || v || "-",
      },
      { title: "版本", dataIndex: "version", width: 130 },
      { title: "模型格式", dataIndex: "modelFormat", width: 110 },
      {
        title: "文件大小",
        dataIndex: "fileSize",
        width: 110,
        render: (v) => (v != null ? `${(Number(v) / 1024 / 1024).toFixed(1)} MB` : "-"),
      },
      {
        title: "上传时间",
        dataIndex: "createdAt",
        width: 180,
        render: (v) => (v ? moment(v).format("YYYY-MM-DD HH:mm") : "-"),
      },
    ],
    [],
  );

  return (
    <div className="edge-device" style={{
      background: "#FFFFFF",
      margin: "8px 12px",
      padding: "10px 20px 0",
      height: "calc(100vh - 80px)",
      overflow: "auto",
      display: "flex",
      flexDirection: "column",
    }}>
      <div style={{ display: "flex" }}>
        <div style={{ display: "flex", alignItems: "center", marginRight: 30 }}>
          <div style={{
            width: 0,
            height: 20,
            borderLeft: "3px solid #005ABD",
            borderTop: "3px solid transparent",
            borderBottom: "3px solid transparent",
          }}></div>
          <div style={{
            fontFamily: "YouSheBiaoTiHei",
            fontSize: 24,
            color: "#101531",
            marginLeft: 8,
          }}>视觉模型库</div>
          <div style={{
            marginLeft: 6,
            fontSize: 12,
            color: "#969799",
            fontFamily: "DINExp",
          }}>Vision Model Library</div>
        </div>
        <Space>
          <span>模型名称：</span>
          <Input
            allowClear
            style={{ width: 200 }}
            placeholder="输入模型名称或版本"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onPressEnter={() => {
              setPage(1);
              setSubmitted({ keyword, type });
            }}
          />
          <span>识别类型：</span>
          <Select
            allowClear
            style={{ width: 150 }}
            placeholder="全部类型"
            value={type}
            onChange={setType}
            options={Object.keys(RECOGNITION_TYPES).map((v) => ({
              label: RECOGNITION_TYPES[v],
              value: v,
            }))}
          />
          <Button
            type="primary"
            onClick={() => {
              setPage(1);
              setSubmitted({ keyword, type });
            }}
          >
            查询
          </Button>
          <Button
            onClick={() => {
              setKeyword("");
              setType(undefined);
              setPage(1);
              setSubmitted({});
            }}
          >
            重置
          </Button>
          {isAuthorized(MODEL_PERMISSIONS.upload) && (
            <Button
              type="primary"
              onClick={() => setUploadOpen(true)}
            >
              上传模型
            </Button>
          )}
        </Space>
      </div>
      <Table
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={list}
        pagination={{
          current: page,
          pageSize,
          total: count,
          showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条/共 ${total} 条`,
          onChange: (p, s) => {
            setPage(p);
            setPageSize(s);
          },
        }}
      />

      <UploadModelModal
        open={uploadOpen}
        onCancel={(refresh) => {
          setUploadOpen(false);
          if (refresh) {
            setPage(1);
            fetchList();
          }
        }}
        onSubmit={(payload) => dispatch(edgeDevice.uploadVisionModel(payload))}
      />
    </div>
  );
};

const ConnectedVisionModel = connect((state) => ({
  actions: state.global.actions,
}))(VisionModel);

export default ConnectedVisionModel;
