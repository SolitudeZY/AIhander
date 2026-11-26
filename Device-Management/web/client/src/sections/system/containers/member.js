import React, { useState, useEffect } from "react";
import { connect } from "react-redux";
import { Spin, Popconfirm, Input } from "antd";
import ProTable, { TableDropdown } from "@ant-design/pro-table";
import ProCard from "@ant-design/pro-card";
import { LayoutContent, ExportData } from "@peace/components";
import { Func, isAuthorized } from "$utils";
import { PinyinHelper } from "@peace/utils";
import MemberModal from "../components/memberModal";
import DepartmentTree from "../components/departmentTree";
import {
  deleteMember,
  addMembers,
  modifyMembers,
  enableMember,
  disableMember,
} from "../actions/member";
import {
  getOrganizations,
  getOrganization,
  getRoles,
  getPosts,
} from "../actions/author";
import { getRoleGroupRoles } from "../actions/role";
import { createSystemLog } from "../actions/log";

function Members(props) {
  const {
    dispatch,
    actions,
    user,
    loading,
    enterprises,
    organizations,
    authorData,
    roles,
    posts,
    clientHeight,
    clientWidth,
    roleGroupRoles,
  } = props;
  const [selectDepartment, setSelectDepartment] = useState(null);
  const [params, setParams] = useState({});
  const pageStyle = Func.getPaginationStyle();

  // 获取当前组织信息
  const currentOrganization =
    organizations && organizations.length > 0 ? organizations[0] : null;

  // 从authorData中提取departments数据
  const departmentsData = authorData?.departments || [];
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
  const roleNames =
    sessionUser && sessionUser.roleNames ? sessionUser.roleNames : [];
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
          if (
            d.parentId &&
            allowedIds.has(d.parentId) &&
            !allowedIds.has(d.departmentId)
          ) {
            allowedIds.add(d.departmentId);
            changed = true;
          }
        });
      }
      visibleDepartments = processedDepartments.filter((d) =>
        allowedIds.has(d.departmentId)
      );
    } else {
      visibleDepartments = [];
    }
  }

  useEffect(() => {
    dispatch(getOrganizations());
    // 获取组织详情数据
    if (user?.orgId) {
      dispatch(getOrganization(user.orgId));
    }
    dispatch(getRoles({ orgId: user?.orgId }));
    dispatch(getRoleGroupRoles(user?.orgId));
    dispatch(getPosts());
  }, []);

  // ==== 日志辅助函数：将ID解析为名称，并构造新增/编辑日志内容 ====
  const getDepartmentNameById = (depId) => {
    const dept = authorData?.departments?.find((d) => d.id === depId);
    return dept?.name || "-";
  };

  const getPostNameById = (postId) => {
    const post = posts?.find((p) => p.id === postId);
    return post?.name || "-";
  };

  const getRoleNamesByIds = (roleIds = []) => {
    const names = (roleIds || [])
      .map((rid) => roles?.find((r) => r.id === rid)?.name || `角色ID:${rid}`)
      .filter(Boolean);
    return names.length ? names.join("、") : "-";
  };

  const buildAddUserLogContent = (values) => {
    const depName = getDepartmentNameById(values.depId);
    const postName = getPostNameById(values.postId);
    const roleNames = getRoleNamesByIds(values.orgRole);
    return `新增用户：${values.name}（账号：${
      values.username
    }），所属部门：${depName}，职位：${postName}，角色：${roleNames}，启用：${
      values.enabled ? "是" : "否"
    }`;
  };

  const buildEditUserLogContent = (oldData, newValues) => {
    const changes = [];
    if (oldData?.username !== newValues.name) {
      changes.push(`用户名 ${oldData?.username} → ${newValues.name}`);
    }
    if (oldData?.name !== newValues.username) {
      changes.push(`账号 ${oldData?.name} → ${newValues.username}`);
    }
    if (oldData?.departmentId !== newValues.depId) {
      const oldDept = getDepartmentNameById(oldData?.departmentId);
      const newDept = getDepartmentNameById(newValues.depId);
      changes.push(`所属部门 ${oldDept} → ${newDept}`);
    }
    if (oldData?.postId !== newValues.postId) {
      const oldPost = getPostNameById(oldData?.postId);
      const newPost = getPostNameById(newValues.postId);
      changes.push(`职位 ${oldPost} → ${newPost}`);
    }
    const oldRoleIds = (oldData?.roles || [])
      .map((r) => r.id)
      .sort()
      .join(",");
    const newRoleIds = (newValues?.orgRole || []).slice().sort().join(",");
    if (oldRoleIds !== newRoleIds) {
      const oldRoleNames =
        (oldData?.roles || []).map((r) => r.name).join("、") || "-";
      const newRoleNames = getRoleNamesByIds(newValues?.orgRole);
      changes.push(`角色 ${oldRoleNames} → ${newRoleNames}`);
    }
    if (oldData?.enabled !== newValues.enabled) {
      changes.push(
        `启用 ${oldData?.enabled ? "是" : "否"} → ${
          newValues.enabled ? "是" : "否"
        }`
      );
    }
    const idStr = `（ID：${oldData?.id || "-"}）`;
    return (
      `编辑用户：${oldData?.username || "-"}${idStr}` +
      (changes.length ? `，变更：${changes.join("；")}` : "（无字段变更）")
    );
  };

  const actionMember = (e, record) => {
    if (e === "enabled") {
      dispatch(enableMember(record.id)).then((_) => {
        dispatch(getOrganization(user.orgId));
        dispatch(
          createSystemLog({
            content: `启用用户：${record.username || record.name || "-"}（ID：${
              record.id
            }）`,
            module: "用户管理",
            url: window.location.pathname,
            userId: user?.id,
          })
        );
      });
    } else {
      dispatch(disableMember(record.id)).then((_) => {
        dispatch(getOrganization(user.orgId));
        dispatch(
          createSystemLog({
            content: `禁用用户：${record.username || record.name || "-"}（ID：${
              record.id
            }）`,
            module: "用户管理",
            url: window.location.pathname,
            userId: user?.id,
          })
        );
      });
    }
  };

  const columns = [
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
      title: "所属部门",
      ellipsis: true,
      dataIndex: "departmentName",
    },
    {
      title: "职位",
      ellipsis: true,
      dataIndex: ["typePost", "name"],
      render: (text, record) => {
        return record.typePost?.name || record.post?.name || "-";
      },
    },
    {
      title: "状态",
      dataIndex: "enabled",
      initialValue: true,
      filters: true,
      onFilter: true,
      valueEnum: {
        true: { text: "正常", status: "Success" },
        false: { text: "禁用", status: "Error" },
      },
    },
    {
      title: "操作",
      width: 160,
      key: "option",
      valueType: "option",
      render: (text, record, action) => {
        if (record.departmentName == "默认") {
          return "";
        }
        const actions = [];
        isAuthorized("EDITUSER") &&
          actions.push(
            <MemberModal
              key="edit"
              title="编辑用户"
              triggerRender={<a>编辑</a>}
              editData={record}
              authorData={visibleDepartments}
              roles={roles}
              roleGroupRoles={roleGroupRoles}
              posts={posts}
              onFinish={onFinish}
            />
          );

        isAuthorized("DELETEUSER") &&
          actions.push(
            <Popconfirm
              key="del"
              placement="top"
              title="确定要删除该用户吗？这将同时删除该用户创建的所有项目并释放项目中的设备"
              onConfirm={() => handleDeleteMember(record)}
              okText="是"
              cancelText="否"
            >
              <a>删除</a>
            </Popconfirm>
          );

        const menus = [];
        isAuthorized("ENABLEUSER") &&
          record.enabled === false &&
          menus.push({ key: "enabled", name: "启用" });
        isAuthorized("DISABLEUSER") &&
          record.enabled === true &&
          menus.push({ key: "disabled", name: "禁用" });

        menus.length > 0 &&
          actions.push(
            <TableDropdown
              key="actionGroup"
              onSelect={(e) => actionMember(e, record)}
              menus={menus}
            />
          );

        return actions;
      },
    },
  ];
  const handleDeleteMember = (record) => {
    dispatch(deleteMember(record.id)).then((_) => {
      dispatch(getOrganization(user.orgId));
      // dispatch(
      //   createSystemLog({
      //     content: `删除用户：${record.username || record.name || "-"}（ID：${
      //       record.id
      //     }）`,
      //     module: "用户管理",
      //     url: window.location.pathname,
      //     userId: user?.id,
      //   })
      // );
    });
  };
  const onFinish = async (values, editData) => {
    const params = {
      ...values,
      orgId: user.orgId,
      username: values.name,
      name: values.username,
    };
    if (editData) {
      return dispatch(modifyMembers(editData?.id, params)).then(() => {
        dispatch(getOrganization(user.orgId));
        dispatch(
          createSystemLog({
            content: buildEditUserLogContent(editData, values),
            module: "用户管理",
            url: window.location.pathname,
            userId: user?.id,
          })
        );
      });
    }
    return dispatch(addMembers(params)).then(() => {
      dispatch(getOrganization(user.orgId));
      dispatch(
        createSystemLog({
          content: buildAddUserLogContent(values),
          module: "用户管理",
          url: window.location.pathname,
          userId: user?.id,
        })
      );
    });
  };

  const refresh = () => {
    dispatch(actions.system.getAuthorList(enterprises?.id));
  };

  const handleSelectedNode = (node) => {
    setSelectDepartment(node);
  };

  const initUserSource = () => {
    let members = [];
    if (selectDepartment) {
      if (selectDepartment.isOrg) {
        // 如果选择的是组织，返回所有部门的成员
        members = visibleDepartments.reduce(
          (p, c) => p.concat(c.members || []),
          []
        );
      } else {
        const departmentIds = Func.getDepartmentsByTree(selectDepartment);
        // 根据部门ID筛选对应部门的成员
        members = visibleDepartments
          .filter((dept) => departmentIds.includes(dept.id))
          .reduce((p, c) => p.concat(c.members || []), []);
      }
    }
    return members;
  };

  const renderTitle = () => {
    if (selectDepartment) {
      const members = initUserSource();
      const curDepartment = selectDepartment.departmentId
        ? visibleDepartments.find(
            (dept) => dept.id === selectDepartment.departmentId
          )
        : null;
      // 从members数组中查找code为leader的用户
      const leader =
        curDepartment && curDepartment.members
          ? curDepartment.members.find(
              (member) => member.typePost && member.typePost.code === "leader"
            )
          : null;
      return selectDepartment.isOrg ? (
        <span>
          {selectDepartment.title}:{" "}
          <span className="text-primary">{members.length}</span> 人
        </span>
      ) : (
        <span>
          {selectDepartment.title}:{" "}
          <span className="text-primary">{members.length}</span> 人, 部门主管:{" "}
          <span className="text-primary"> {leader?.username || "-"} </span>{" "}
        </span>
      );
    }
    return "";
  };

  const getDataSource = () => {
    const members = initUserSource();
    const { keyword } = params;

    // 为每个用户添加部门信息
    const membersWithDepartment = members.map((member) => {
      // 查找用户所属的部门
      const department = visibleDepartments.find((dept) =>
        dept.members?.some((m) => m.id === member.id)
      );

      return {
        ...member,
        departmentId: department?.id,
        departmentName: department?.name,
      };
    });

    const rslt = keyword
      ? membersWithDepartment.filter(
          (s) =>
            s.username.indexOf(keyword) != -1 ||
            PinyinHelper.isPinyinMatched(s.username, keyword)
        )
      : membersWithDepartment;
    return rslt;
  };

  const filterData = getDataSource();

  return (
    <LayoutContent perfectScroll={false}>
      <Spin spinning={loading}>
        <ProCard split="vertical" style={{ position: 'relative', zIndex: 0, isolation: 'isolate' }}>
          <ProCard>
            <DepartmentTree
              height={clientHeight - 200}
              dataList={visibleDepartments}
              organizations={currentOrganization}
              onSelectedDepartment={handleSelectedNode}
            />
          </ProCard>
          <ProCard colSpan="80%" className="member-table-container">
            <ProTable
              columns={columns}
              rowKey="id"
              request={async (params) => {
                setParams(params);
                return {
                  data: [],
                  success: true,
                };
              }}
              search={false}
              dateFormatter="string"
              headerTitle={renderTitle()}
              options={{
                reload: false,
              }}
              pagination={{ ...pageStyle, pageSizeOptions: [10, 20, 30] }}
              scroll={{ y: Func.getContentHeight(clientHeight) - 199 }}
              dataSource={filterData}
              toolBarRender={() => {
                const node = [];

                // 添加搜索框
                node.push(
                  <Input.Search
                    placeholder="输入用户名称"
                    allowClear
                    style={{ width: 200, marginRight: 8 }}
                    onSearch={(value) => {
                      setParams({ ...params, keyword: value });
                    }}
                    onChange={(e) => {
                      if (!e.target.value) {
                        setParams({ ...params, keyword: "" });
                      }
                    }}
                    key="search"
                  />
                );

                isAuthorized("ADDUSER") &&
                  node.push(
                    <MemberModal
                      title="新增用户"
                      posts={posts}
                      authorData={visibleDepartments}
                      roles={roles}
                      roleGroupRoles={roleGroupRoles}
                      onFinish={onFinish}
                      key="addMember"
                    />
                  );
                isAuthorized("EXPORTUSERDATA") &&
                  node.push(
                    <ExportData
                      fileName="用户列表"
                      exportType="fileSaver"
                      data={filterData}
                      columns={columns}
                      key="exportMember"
                      customRender={
                        <a
                          onClick={() =>
                            dispatch(
                              createSystemLog({
                                content: `导出用户列表（数量：${
                                  filterData?.length || 0
                                }，筛选：${params?.keyword || "无"}）`,
                                module: "用户管理",
                                url: window.location.pathname,
                                userId: user?.id,
                              })
                            )
                          }
                        >
                          导出
                        </a>
                      }
                    />
                  );
                return node;
              }}
            />
          </ProCard>
        </ProCard>
      </Spin>
    </LayoutContent>
  );
}

function mapStateToProps(state) {
  const {
    auth,
    global,
    authorData,
    roles,
    posts,
    organizations,
    roleGroupRoles,
  } = state;
  return {
    loading: authorData.isRequesting,
    user: auth.user?.userInfo,
    actions: global.actions,
    clientWidth: global.clientWidth,
    clientHeight: global.clientHeight,
    organizations: organizations.data?.data,
    authorData: authorData.data || {},
    roles: roles?.data?.data || [],
    posts: posts?.data?.data || [],
    roleGroupRoles: roleGroupRoles?.data?.data || [],
  };
}

export default connect(mapStateToProps)(Members);
