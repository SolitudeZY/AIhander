import React, { useEffect, useState } from "react";
import { Button, Table, Input, Popconfirm, Image } from "antd";
import { SearchOutlined, PlusOutlined } from "@ant-design/icons";
import { connect } from "react-redux";
import SensorModal from "../components/sensorModal.jsx";
import { isAuthorized } from "$utils";
import { createSystemLog } from "../../system/actions/log";

const pageSize = 10;

function Sensors(props) {
  const { actions, dispatch, sensorList, loading, user } = props;
  const { firmwareUpgrade } = actions;
  const [keyword, setKeyword] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [currentPage, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [editData, setEditData] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [options, setOptions] = useState([]);
  const [STMMLoading, setSTMMLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [controllerData, setControllerData] = useState([]); // 采集仪数据
  const [formulaData, setFormulaData] = useState([]); // 公式数据
  const [sensorTypes, setSensorTypes] = useState([]); // 传感器类型数据
  const handlePageChange = (page) => {
    fetchData(page);
  };

  const handleClose = () => {
    setModalVisible(false);
    setEditData(null);
  };

  const handleEdit = (record) => {
    setEditData(record);
    setModalVisible(true);
    setTitle("编辑传感器");
  };

  const fetchData = (currentPage = 1) => {
    setPage(currentPage);
    let query = {
      pageSize: pageSize,
      page: currentPage,
    };
    if (keyword) {
      query.keyword = keyword;
    }
    dispatch(firmwareUpgrade.getSensors(query));
    getFormulaData();
    getSensorTypes();
  };
  const getFormulaData = () => {
    dispatch(firmwareUpgrade.getFormulaData()).then((res) => {
      if (res.success) {
        setFormulaData(res.payload.data || []);
      }
    });
  };

  useEffect(() => {
    setSTMMLoading(false);
    fetchData();
    dispatch(firmwareUpgrade.getSensorTypeModelMapping()).then((res) => {
      setSTMMLoading(false);
      if (res.success) {
        let data = res.payload?.data || [];
        data = data.map((item) => ({
          value: item.opsModel,
          label: item.opsModel,
        }));
        //去重
        const uniqueData = Array.from(
          new Map(data.map((item) => [item.value, item])).values()
        );
        setOptions(uniqueData || []);
      }
    });
    // 获取采集仪数据
    dispatch(
      firmwareUpgrade.getProductLibrary({
        pageSize: 1000,
        page: 1,
      })
    ).then((res) => {
      if (res.success) {
        let data = res.payload.data.rows || [];
        data = data.map((item) => ({ id: item.id, model: item.model }));
        setControllerData(data || []);
      }
    });
    // 获取公式数据
    getFormulaData();
    // 获取传感器类型数据
    getSensorTypes();
  }, []);
  const getSensorTypes = () => {
    dispatch(firmwareUpgrade.getSensorTypes()).then((res) => {
      if (res.success) {
        setSensorTypes(
          res.payload.data.map((type) => ({
            id: type.id,
            value: type.sensorKey,
            label: type.sensorName,
          }))
        );
      }
    });
  };

  const handleDel = (data) => {
    setDeleting(true);
    dispatch(firmwareUpgrade.delSensor({ id: data.id })).then((res) => {
      setDeleting(false);
      if (res.success) {
        fetchData();
        dispatch(
          createSystemLog({
            content: `删除传感器：${data.sensorName}`,
            module: "产品库--传感器列表",
            url: window.location.href,
            userId: user?.id || null,
          })
        );
      }
    });
  };
  const handleDetail = (record) => {
    setTitle("详情");
    setEditData(record);
    setModalVisible(true);
  };
  const columns = [
    {
      title: "采集仪型号",
      dataIndex: "controllerName",
      width: 100,
      render: (_, record) => record?.productLibrary?.model || "--",
    },
    {
      title: "传感器名称",
      dataIndex: "sensorName",
      width: 150,
    },
    {
      title: "传感器类型",
      dataIndex: "sensorType",
      width: 100,
    },
    {
      title: "运维中台型号",
      dataIndex: "opsModel",
      width: 150,
    },
    {
      title: "传感器协议号",
      dataIndex: "protocolNo",
      width: 150,
    },
    {
      title: "配置公式",
      dataIndex: "formulaIds",
      width: 180,
      render: (text, record) => {
        const expressions = formulaData.filter((item) =>
          record.formulaIds?.includes(item.id)
        );
        return expressions.length > 0
          ? expressions.map((item) => item.expression).join(", ")
          : "--";
      },
    },
    {
      title: "厂家",
      dataIndex: "manufacturer",
      width: 150,
      //没有数据时显示无
      render: (text) => text || "无",
    },
    {
      title: "图片",
      dataIndex: "picture",
      width: 70,
      render: (record) => {
        return record ? (
          <Image src={`/_file-server/${record}`} width={60} height={60} />
        ) : (
          "--"
        );
      },
    },
    {
      title: "操作",
      dataIndex: "action",
      width: 200,
      render: (text, record) => (
        <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
          {isAuthorized("EDITSENSORS") && (
            <Button type="default" onClick={() => handleEdit(record)}>
              编辑
            </Button>
          )}
          {isAuthorized("DELETESENSOR") && (
            <Popconfirm
              title="确定删除吗？"
              description="此操作将不可逆"
              onConfirm={() => handleDel(record)}
              okText="确定"
              cancelText="取消"
              placement="topRight"
              zIndex={1000}
            >
              <Button type="primary" danger loading={deleting}>
                删除
              </Button>
            </Popconfirm>
          )}
          <Button type="primary" onClick={() => handleDetail(record)}>
            查看详情
          </Button>
        </div>
      ),
    },
  ];
  return (
    <div className="product-library-list">
      <div className="product-library-list__toolbar">
          <Input
            prefix={<SearchOutlined />}
            placeholder="请输入传感器名称或运维中台型号进行搜索"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onPressEnter={() => fetchData(1)}
            allowClear
            className="product-library-list__search product-library-list__search--sensor"
          />
          <Button type="primary" onClick={() => fetchData(1)}>
            查询
          </Button>
          {isAuthorized("ADDNEWSENSORS") && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                setEditData(null);
                setModalVisible(true);
                setTitle("新增传感器");
              }}
            >
              新增
            </Button>
          )}
      </div>
      <div className="product-library-list__table">
        <Table
          columns={columns}
          dataSource={sensorList?.rows || []}
          loading={loading}
          rowKey="id"
          pagination={{
            current: currentPage,
            pageSize,
            total: sensorList?.count,
            onChange: handlePageChange,
            showSizeChanger: false,
            showTotal: (total, range) =>
              `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
          }}
          scroll={{ y: 520 }}
          size="middle"
          className="horizontal-border-only"
        />
      </div>
      <SensorModal
        open={modalVisible}
        editData={editData}
        onClose={handleClose}
        fetchData={fetchData}
        options={options}
        STMMLoading={STMMLoading}
        existmodel={sensorList?.rows}
        title={title}
        controllerData={controllerData}
        formulaData={formulaData}
        sensorTypes={sensorTypes}
      />
    </div>
  );
}
function mapStateToProps(state) {
  const { auth, global, sensorList } = state;
  return {
    user: auth?.user?.userInfo,
    actions: global.actions,
    sensorList: sensorList.data || [],
    loading: sensorList.isRequesting,
  };
}
export default connect(mapStateToProps)(Sensors);
