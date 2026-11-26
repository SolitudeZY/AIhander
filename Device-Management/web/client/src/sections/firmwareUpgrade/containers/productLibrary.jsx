import React, { useEffect, useState } from "react";
import { connect } from "react-redux";
import { Button, Table, Image, Input, Popconfirm } from "antd";
import ProductLibraryModal from "../components/productLibraryModal";
import {
  SearchOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import { isAuthorized } from "$utils";
import { createSystemLog } from "../../system/actions/log";

const ProductLibrary = ({
  actions,
  dispatch,
  productLibrary,
  loading,
  user,
}) => {
  const { firmwareUpgrade } = actions;

  const [keyword, setKeyword] = useState("");
  const [currentPage, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [modalVisible, setModalVisible] = useState(false);
  const [editData, setEditData] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = (currentPage = 1, currentPageSize = pageSize) => {
    setPage(currentPage);
    let query = {
      pageSize: currentPageSize,
      page: currentPage,
    };
    if (keyword) {
      query.keyword = keyword;
    }
    dispatch(firmwareUpgrade.getProductLibrary(query));
  };

  const handlePageChange = (page, size) => {
    if (size !== pageSize) {
      // 页面大小改变时，重置到第一页
      setPageSize(size);
      fetchData(1, size);
    } else {
      // 只是页码改变
      fetchData(page, size);
    }
  };

  const handleClose = () => {
    setModalVisible(false);
    setEditData(null);
  };

  const handleEdit = (record) => {
    setEditData(record);
    setModalVisible(true);
  };

  const handleDel = (data) => {
    setDeleting(true);
    dispatch(firmwareUpgrade.delProductLibrary(data.id)).then((res) => {
      setDeleting(false);
      if (res.success) {
        fetchData(currentPage);
        dispatch(
          createSystemLog({
            content: `删除产品：${data.name}`,
            module: "产品库--产品列表",
            url: window.location.href,
            userId: user?.id || null,
          })
        );
      }
    });
  };

  const columns = [
    {
      title: "产品名称",
      dataIndex: "name",
    },
    {
      title: "设备型号",
      dataIndex: "model",
    },
    {
      title: "型号图片",
      dataIndex: "picture",
      render: (text) => (
        <Image src={`/_file-server/${text}`} width={60} height={60} />
      ),
    },
    {
      title: "设备编码",
      dataIndex: "productCode",
    },
    {
      title: "设备类型",
      dataIndex: "productType",
    },
    {
      title: "操作",
      dataIndex: "action",
      width: 150,
      render: (text, record) => (
        <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
          {isAuthorized("EDITPRODUCT") && (
            <Button type="default" onClick={() => handleEdit(record)}>
              编辑
            </Button>
          )}
          {isAuthorized("DELETEPRODUCT") && (
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
        </div>
      ),
    },
  ];

  return (
    <div className="product-library-list">
      <div className="product-library-list__toolbar">
            <Input
              prefix={<SearchOutlined />}
              placeholder="请输入产品名称/设备型号进行搜索"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onPressEnter={() => fetchData(1)}
              allowClear
              className="product-library-list__search"
            />
            <Button type="primary" onClick={() => fetchData(1)}>
              查询
            </Button>
            {isAuthorized("ADDPRODUCT") && (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setModalVisible(true)}
              >
                新增
              </Button>
            )}
      </div>
      <div className="product-library-list__table">
          <Table
            columns={columns}
            dataSource={productLibrary?.rows || []}
            loading={loading}
            rowKey="id"
            pagination={{
              current: currentPage,
              pageSize,
              total: productLibrary?.count,
              onChange: handlePageChange,
              showTotal: (total, range) =>
                `第 ${range[0]}-${range[1]} 条/共 ${total} 条`,
            }}
            scroll={{ y: 520 }}
            size="middle"
            style={{
              backgroundColor: "#fff",
            }}
            className="horizontal-border-only"
          />
          <ProductLibraryModal
            open={modalVisible}
            editData={editData}
            onClose={handleClose}
            fetchData={fetchData}
          />
      </div>
    </div>
  );
};

function mapStateToProps(state) {
  const { auth, global, productLibrary } = state;
  return {
    user: auth?.user?.userInfo,
    actions: global.actions,
    productLibrary: productLibrary.data,
    loading: productLibrary.isRequesting,
  };
}
export default connect(mapStateToProps)(ProductLibrary);
