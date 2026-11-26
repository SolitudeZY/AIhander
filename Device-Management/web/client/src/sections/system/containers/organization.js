import React, { useState, useEffect } from "react";
import { connect } from "react-redux";
import { Spin, Button, Popconfirm, message } from "antd";
import { LayoutContent } from "@peace/components";
import ProTable, { DragSortTable } from "@ant-design/pro-table";
import ProCard from "@ant-design/pro-card";
import PerfectScrollbar from "perfect-scrollbar";
import { isAuthorized, Func as localFunc } from "$utils";
import DepartmentModal from "../components/departmentModal";
import DepartmentTree from "../components/departmentTree";
import DepartmentSelectUser from "../components/selectUser";
import {
  modifyDepartmentUsers,
  addDepartment,
  deleteDepartment,
  modifyDepartment,
  sortDepartment,
  sortDepartmentUsers,
} from "../actions/member";
import { getOrganizations, getOrganization } from "../actions/author";
import { createSystemLog } from "../actions/log";
import "../style.less";

function Organization({ ...props }) {
  const {
    dispatch,
    actions,
    user,
    loading,
    organizations,
    authorData,
    clientHeight,
  } = props;
  const [drag, setDrag] = useState(false);
  const [dragUser, setDragUser] = useState(false);
  const [departmentSource, setDepartmentSource] = useState([]);
  const [userSource, setUserSource] = useState([]);
  const [selectDepartment, setSelectDepartment] = useState(null);
  const [memberCurrentPageSize, setMemberCurrentPageSize] = useState(5);
  const [depCurrentPageSize, setDepCurrentPageSize] = useState(5);

  const pageStyle = localFunc.getPaginationStyle() || {};
  let rightTableSrcollBar = null;

  // 获取当前组织信息
  const currentOrganization =
    organizations && organizations.length > 0 ? organizations[0] : null;

  // 从authorData中提取departments数据
  const departmentsData = authorData?.departments || [];
  const usersData = authorData?.users || [];
  // 处理部门数据，添加必要的字段
  const processedDepartments = departmentsData
    .filter((dept) => dept && typeof dept === "object")
    .map((dept) => ({
      ...dept,
      departmentId: dept.id,
      departmentName: dept.name,
      parentId: dept.parentId,
      sortIndex: dept.sortIndex,
      sort: dept.sortIndex, // 添加sort字段用于DragSortTable
      members: dept.members || [],
      departmentCount: dept.members ? dept.members.length : 0,
      // 查找部门主管
      leader:
        dept.members?.find((member) => member.typePost?.code === "leader") ||
        null,
      // 添加父部门名称
      parentName: dept.parentId
        ? departmentsData.find((p) => p.id === dept.parentId)?.name
        : currentOrganization
        ? currentOrganization.name
        : "",
    }));

  const sessionUser = JSON.parse(sessionStorage.getItem("user") || "{}");
  const roleNames = sessionUser && sessionUser.roleNames ? sessionUser.roleNames : [];
  const isSuperAdmin = Array.isArray(roleNames) && roleNames.includes("所有者");
  const currentUserId = user?.id;
  let visibleDepartments = processedDepartments;
  if (!isSuperAdmin && currentUserId) {
    const userDept = processedDepartments.find((dept) =>
      (dept.members || []).some((m) => m.id === currentUserId)
    );
    if (userDept) {
      const allowedIds = new Set([userDept.departmentId]);
      let changed = true;
      while (changed) {
        changed = false;
        processedDepartments.forEach((d) => {
          if (d.parentId && allowedIds.has(d.parentId) && !allowedIds.has(d.departmentId)) {
            allowedIds.add(d.departmentId);
            changed = true;
          }
        });
      }
      visibleDepartments = processedDepartments.filter((d) => allowedIds.has(d.departmentId));
    } else {
      visibleDepartments = [];
    }
  }

  const initDepartmentSource = (node, data) => {
    const departmentChildren = node.isOrg
      ? data
          .filter((f) => f && f.parentId === null)
          .map((v) =>
            v && typeof v === "object"
              ? {
                  ...v,
                  parentName: node.title,
                }
              : v
          )
      : data
          .filter((f) => f && f.parentId === node.departmentId)
          .map((v) =>
            v && typeof v === "object"
              ? {
                  ...v,
                  parentName: node.title,
                }
              : v
          );
    setDepartmentSource(departmentChildren);
  };

  const initUserSource = (node, data) => {
    let members = [];
    if (node) {
      const curDepartment = data.find(
        (v) => v.departmentId === node.departmentId
      );
      members = (curDepartment?.members || []).map((member, index) => ({
        ...member,
        sort: member.sortIndex || index + 1, // 添加sort字段用于DragSortTable
      }));
    }
    setUserSource(members);
  };

  useEffect(() => {
    dispatch(getOrganizations());
    // 获取组织详情数据
    if (user?.orgId) {
      dispatch(getOrganization(user.orgId));
    }
    rightTableSrcollBar = new PerfectScrollbar("#organization-right-table", {
      suppressScrollX: true,
    });
  }, []);

  useEffect(() => {
    const domTable = document.getElementById("organization-right-table");
    if (domTable && rightTableSrcollBar) {
      rightTableSrcollBar.update();
      domTable.scrollTop = 0;
    }
  }, [clientHeight]);

  useEffect(() => {
    if (processedDepartments.length > 0 && selectDepartment) {
      initDepartmentSource(selectDepartment, visibleDepartments);
      initUserSource(selectDepartment, visibleDepartments);
    }
  }, [authorData]);

  const departmentColumns = [
    {
      title: "排序",
      dataIndex: "sort",
      width: 60,
      className: "drag-visible",
      render: (text, record, index) => {
        if (drag) {
          return "";
        }
        return record.sortIndex || index + 1;
      },
    },
    {
      title: "部门名称",
      onFilter: true,
      dataIndex: "departmentName",
      search: false,
      ellipsis: true,
    },
    {
      title: "上级部门",
      dataIndex: "parentName",
      ellipsis: true,
    },
    {
      title: "部门主管",
      dataIndex: ["leader", "username"],
      ellipsis: true,
    },
    {
      title: "部门人数",
      dataIndex: "departmentCount",
      ellipsis: true,
      render: (text, record) => record.members.length,
    },
    {
      title: "操作",
      width: 164,
      key: "option",
      valueType: "option",
      render: (text, record) => {
        if (record.departmentName == "默认" || drag) {
          return "";
        }
        const actions = [];
        isAuthorized("EDITDEPARTMENT") &&
          actions.push(
            <DepartmentModal
              key="edit"
              title="编辑部门"
              triggerRender={<a>编辑</a>}
              parent={{ departmentId: record.parentId }}
              editData={record}
              initialValues={{
                name: record.departmentName,
                parentName: record.parentName,
              }}
              departments={visibleDepartments}
              onFinish={onFinish}
            />
          );
        isAuthorized("DELETEDEPARTMENT") &&
          actions.push(
            <Popconfirm
              key="del"
              placement="top"
              title="部门以及相关用户都将删除，是否确认删除部门？"
              onConfirm={() => handleDeleteDepartment(record.departmentId)}
              okText="是"
              cancelText="否"
            >
              <a>删除</a>
            </Popconfirm>
          );
        return actions;
      },
    },
  ];

  const userColumns = [
    {
      title: "排序",
      dataIndex: "sort",
      width: 60,
      className: "drag-visible",
      render: (text, record, index) => {
        if (dragUser) {
          return "";
        }
        return record.sortIndex || index + 1;
      },
    },
    {
      title: "用户名",
      onFilter: true,
      dataIndex: "username",
      ellipsis: true,
    },
    {
      title: "账号",
      ellipsis: true,
      dataIndex: "name",
    },
    {
      title: "部门",
      ellipsis: true,
      dataIndex: "departmentName",
      render: (text, record) => {
        // 从部门数据中查找用户所属部门名称
        const userDept = visibleDepartments.find((dept) =>
          dept.members.some((member) => member.id === record.id)
        );
        return userDept ? userDept.departmentName : text;
      },
    },
    {
      title: "职位",
      ellipsis: true,
      dataIndex: ["typePost", "name"],
    },
  ];

  const handleDeleteDepartment = (id) => {
    // 找到要删除的部门信息，用于日志记录
    const departmentToDelete = processedDepartments.find(
      (dept) => dept.id === id || dept.departmentId === id
    );
    const departmentName =
      departmentToDelete?.departmentName ||
      departmentToDelete?.name ||
      "未知部门";

    dispatch(deleteDepartment(id)).then((_) => {
      if (currentOrganization?.id) {
        dispatch(getOrganization(currentOrganization.id));
      }
      // 记录删除部门的系统日志
      dispatch(
        createSystemLog({
          content: `删除部门：${departmentName}`,
          module: "组织管理",
          url: window.location.pathname,
          userId: user?.id,
        })
      );
    });
  };

  const onFinish = async (values, parent, editData) => {
    const params = {
      name: values.name,
    };
    // 新增部门时需要添加 orgId
    const addParams = {
      name: values.name,
      orgId: currentOrganization?.id || null,
      parentId: parent?.departmentId || null,
    };
    if (editData) {
      // 编辑部门时不需要 orgId
      return dispatch(modifyDepartment(editData?.departmentId, params)).then(
        () => {
          if (currentOrganization?.id) {
            dispatch(getOrganization(currentOrganization.id));
          }
          // 记录编辑部门的系统日志
          dispatch(
            createSystemLog({
              content: `编辑部门：${editData.departmentName} -> ${values.name}`,
              module: "组织管理",
              url: window.location.pathname,
              userId: user?.id,
            })
          );
        }
      );
    } else {
      return dispatch(addDepartment(addParams)).then(() => {
        if (currentOrganization?.id) {
          dispatch(getOrganization(currentOrganization.id));
        }
        // 记录新增部门的系统日志
        dispatch(
          createSystemLog({
            content: `新增子部门：${values.name}${
              parent ? ` (上级部门：${parent.title})` : ""
            }`,
            module: "组织管理",
            url: window.location.pathname,
            userId: user?.id,
          })
        );
      });
    }
  };

  const onSortEnd = (oldIndex, newIndex) => {
    // 手动处理数组重新排序
    const newData = [...departmentSource];

    // 移除原位置的元素
    const [movedItem] = newData.splice(oldIndex, 1);

    // 在新位置插入元素
    newData.splice(newIndex, 0, movedItem);

    // 重新计算sortIndex，确保拖拽后的顺序正确反映在序号上
    const updatedData = newData.map((item, index) => ({
      ...item,
      sortIndex: index + 1, // 更新sortIndex为新的位置
    }));

    setDepartmentSource(updatedData);
  };

  const onUserSortEnd = (oldIndex, newIndex) => {
    // 手动处理数组重新排序
    const newData = [...userSource];

    // 移除原位置的元素
    const [movedItem] = newData.splice(oldIndex, 1);

    // 在新位置插入元素
    newData.splice(newIndex, 0, movedItem);

    // 重新计算sort字段，确保拖拽后的顺序正确反映在序号上
    const updatedData = newData.map((item, index) => ({
      ...item,
      sort: index + 1, // 更新sort为新的位置
      sortIndex: index + 1, // 同时更新sortIndex字段
    }));

    setUserSource(updatedData);
  };

  const doneSort = () => {
    // 验证数据有效性
    if (!departmentSource || departmentSource.length === 0) {
      message.warning("部门数据为空，无法进行排序");
      setDrag(false);
      return;
    }

    // 排序索引从1开始，确保数据格式正确
    const dataList = departmentSource.map((v, index) => ({
      id: v.id || v.departmentId, // 兼容不同的id字段名
      sortIndex: index + 1, // 排序索引从1开始
    }));

    // 验证生成的数据列表
    const invalidItems = dataList.filter(
      (item) => !item.id || item.sortIndex === undefined
    );
    if (invalidItems.length > 0) {
      console.error("部门排序数据格式错误:", invalidItems);
      setDrag(false);
      return;
    }

    setDrag(false);
    dispatch(sortDepartment({ dataList }))
      .then((_) => {
        if (currentOrganization?.id) {
          dispatch(getOrganization(currentOrganization.id));
        }
      })
      .catch((error) => {
        console.error("部门排序失败:", error);
      });
  };

  const doneUserSort = () => {
    // 验证数据有效性
    if (!userSource || userSource.length === 0) {
      message.warning("用户数据为空，无法进行排序");
      setDragUser(false);
      return;
    }

    // 排序索引从1开始，确保数据格式正确
    const dataList = userSource.map((v, index) => ({
      id: v.id,
      sortIndex: index + 1, // 排序索引从1开始
    }));

    // 验证生成的数据列表
    const invalidItems = dataList.filter(
      (item) => !item.id || item.sortIndex === undefined
    );
    if (invalidItems.length > 0) {
      console.error("用户排序数据格式错误:", invalidItems);
      setDragUser(false);
      return;
    }

    setDragUser(false);
    dispatch(sortDepartmentUsers({ dataList }))
      .then((_) => {
        if (currentOrganization?.id) {
          dispatch(getOrganization(currentOrganization.id));
        }
      })
      .catch((error) => {
        console.error("用户排序失败:", error);
      });
  };

  const handleSelectedNode = (node) => {
    setSelectDepartment(node);
    initDepartmentSource(node, visibleDepartments);
    initUserSource(node, visibleDepartments);
  };

  const handleSaveDepartmentUsers = (userIds) => {
    // 获取当前部门的原有成员
    const currentUserIds = userSource.map((user) => user.id);

    // 计算新增的成员
    const addedUserIds = userIds.filter((id) => !currentUserIds.includes(id));

    // 从所有部门数据中获取用户名称
    const getAllUsers = () => {
      const allUsers = [];
      processedDepartments.forEach((dept) => {
        if (dept.members) {
          allUsers.push(...dept.members);
        }
      });
      // 去重，以防用户在多个部门中
      const uniqueUsers = allUsers.reduce((acc, user) => {
        if (!acc.find((u) => u.id === user.id)) {
          acc.push(user);
        }
        return acc;
      }, []);
      return uniqueUsers;
    };

    const getUserNames = (ids) => {
      const allUsers = getAllUsers();
      return ids.map((id) => {
        const user = allUsers.find((u) => u.id === id);
        return user ? user.username : `用户ID:${id}`;
      });
    };

    // 构建详细的日志内容
    let logContent = `修改部门"${
      selectDepartment?.title || selectDepartment?.departmentName
    }"的成员`;
    if (addedUserIds.length > 0) {
      const addedNames = getUserNames(addedUserIds);
      logContent += `，新增成员：${addedNames.join("、")}`;
    }

    const params = {
      userIds,
    };
    return dispatch(
      modifyDepartmentUsers(selectDepartment?.departmentId, params)
    ).then(() => {
      if (currentOrganization?.id) {
        dispatch(getOrganization(currentOrganization.id));
      }
      // 记录修改部门成员的系统日志
      dispatch(
        createSystemLog({
          content: logContent,
          module: "组织管理",
          url: window.location.pathname,
          userId: user?.id,
        })
      );
    });
  };

  const renderDepartmentTitle = () => {
    const myDeptId = processedDepartments.find((dept) =>
      (dept.members || []).some((m) => m.id === user?.id)
    )?.departmentId;
    const onlyOwnDeptForbidden =
      !isSuperAdmin && (
        selectDepartment?.isOrg === true ||
        selectDepartment?.departmentId !== myDeptId
      );
    const disabled =
      selectDepartment?.title === "默认" ||
      !isAuthorized("ADDDEPARTMENT") ||
      onlyOwnDeptForbidden;
    return (
      <div>
        <span style={{ marginRight: 15 }}>{selectDepartment?.title || ""}</span>
        {selectDepartment && (
          <DepartmentModal
            disabled={disabled}
            title="新增子部门"
            parent={selectDepartment}
            initialValues={{ parentName: selectDepartment?.title || "-" }}
            departments={visibleDepartments}
            onFinish={onFinish}
          />
        )}
        {drag ? (
          <Button
            style={{ marginLeft: 15 }}
            type="primary"
            disabled={disabled}
            ghost
            onClick={doneSort}
          >
            完成排序
          </Button>
        ) : (
          <Button
            style={{ marginLeft: 15 }}
            type="primary"
            disabled={disabled}
            ghost
            onClick={() => {
              setDrag(true);
            }}
          >
            调整排序
          </Button>
        )}
      </div>
    );
  };

  const renderUserTitle = () => {
    const disabled =
      selectDepartment?.title === "默认" ||
      selectDepartment?.isOrg === true ||
      !isAuthorized("EDITDEPARTMENT");
    return (
      <div>
        <span style={{ marginRight: 15 }}>部门成员</span>
        <DepartmentSelectUser
          authorData={visibleDepartments.filter(
            (f) => f.departmentName != "默认"
          )}
          organizations={currentOrganization}
          title="添加用户"
          disabled={disabled}
          selectUsers={userSource}
          noDel
          onFinish={handleSaveDepartmentUsers}
        />
        {/* <Button type="primary" style={{ marginRight: 15 }} ghost disabled={disabled} onClick={handleRemoveDepartmentUsers} >移除用户</Button> */}
        {dragUser ? (
          <Button
            type="primary"
            disabled={disabled}
            ghost
            onClick={doneUserSort}
          >
            完成排序
          </Button>
        ) : (
          <Button
            type="primary"
            disabled={disabled}
            ghost
            onClick={() => {
              setDragUser(true);
            }}
          >
            调整排序
          </Button>
        )}
      </div>
    );
  };

  return (
    <LayoutContent perfectScroll={false}>
      <Spin spinning={loading}>
        <ProCard split="vertical">
          <ProCard colSpan="20%">
            <DepartmentTree
              height={clientHeight - 200}
              dataList={visibleDepartments}
              organizations={currentOrganization}
              onSelectedDepartment={handleSelectedNode}
            />
          </ProCard>

          <div
            id="organization-right-table"
            style={{
              position: "relative",
              height: localFunc.getContentHeight(clientHeight),
            }}
          >
            <ProCard>
              {drag ? (
                <DragSortTable
                  headerTitle={renderDepartmentTitle()}
                  columns={departmentColumns}
                  rowKey="id"
                  pagination={false}
                  options={{
                    search: false,
                    reload: false,
                  }}
                  dateFormatter="string"
                  dataSource={departmentSource}
                  search={false}
                  onDragSortEnd={onSortEnd}
                  dragSortKey="sort"
                />
              ) : (
                <ProTable
                  headerTitle={renderDepartmentTitle()}
                  columns={departmentColumns}
                  search={false}
                  rowKey="id"
                  options={{
                    search: false,
                    reload: false,
                  }}
                  pagination={{
                    ...pageStyle,
                    pageSizeOptions: [5, 10, 20],
                    pageSize: depCurrentPageSize,
                    onChange: (page, pageSize) =>
                      setDepCurrentPageSize(pageSize),
                  }}
                  dateFormatter="string"
                  dataSource={departmentSource}
                />
              )}
              {dragUser ? (
                <DragSortTable
                  headerTitle={renderUserTitle()}
                  columns={userColumns}
                  rowKey="id"
                  pagination={false}
                  options={{
                    search: false,
                    reload: false,
                  }}
                  dateFormatter="string"
                  dataSource={userSource}
                  search={false}
                  onDragSortEnd={onUserSortEnd}
                  dragSortKey="sort"
                />
              ) : (
                <ProTable
                  columns={userColumns}
                  rowKey="id"
                  search={false}
                  options={{
                    search: false,
                    reload: false,
                  }}
                  pagination={{
                    ...pageStyle,
                    pageSizeOptions: [5, 10, 20],
                    pageSize: memberCurrentPageSize,
                    onChange: (page, pageSize) =>
                      setMemberCurrentPageSize(pageSize),
                  }}
                  dateFormatter="string"
                  headerTitle={renderUserTitle()}
                  dataSource={userSource}
                />
              )}
            </ProCard>
          </div>
        </ProCard>
      </Spin>
    </LayoutContent>
  );
}

function mapStateToProps(state) {
  const { auth, global, authorData, organizations } = state;
  return {
    loading: authorData.isRequesting,
    user: auth.user?.userInfo,
    actions: global.actions,
    clientWidth: global.clientWidth,
    clientHeight: global.clientHeight,
    organizations: organizations.data?.data,
    authorData: authorData.data || {},
  };
}

export default connect(mapStateToProps)(Organization);
