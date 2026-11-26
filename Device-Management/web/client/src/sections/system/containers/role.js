import React, { useState, useEffect } from "react";
import { connect } from "react-redux";
import { Spin, Row, Col, Button, Select, message } from "antd";
import ProTable from "@ant-design/pro-table";
import ProCard from "@ant-design/pro-card";
import PerfectScrollbar from "perfect-scrollbar";
import { LayoutContent } from "@peace/components";
import { Func } from "@peace/utils";
import { isAuthorized, Func as localFunc } from "$utils";
import RoleTree from "../components/roleTree";
import RoleSelectUser from "../components/selectUser";
import Resource from "../components/recource";

import { createSystemLog } from "../actions/log";
import {
  deleteGroupRole,
  addGroupRole,
  modifyGroupRole,
  addRole,
  modifyRole,
  deleteRole,
  modifyAuthor,
  modifyRoleUsers,
  deleteRoleUsers,
  modifyRoleProject,
  getRoleGroupRoles,
} from "../actions/role";
import {
  getOrganizations,
  getOrganization,
  getAuthorByRole,
  getAuthors,
  getRoles,
  getPosts,
} from "../actions/author";

import {
  getProjects,
  bindRolesProject,
  getProjectRoles,
} from "../actions/project";
import "../style.less";

function Roles(props) {
  const {
    clientHeight,
    dispatch,
    actions,
    user,
    loading,
    authorData,
    authors,
    roleAuthor,
    projects,
    organizations,
    roleGroupRoles,
    roles,
    posts,
  } = props;
  const [selectRole, setSelectRole] = useState(null);
  const [selectProject, setSelectProject] = useState([]);
  const [selectUsers, setSelectUsers] = useState([]);
  const pageStyle = localFunc.getPaginationStyle();
  let rightTableSrcollBar = null;
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
  const userResourceCodes = Array.isArray(sessionUser?.resources)
    ? sessionUser.resources
    : [];
  const visibleAuthors = isSuperAdmin
    ? authors
    : (authors || []).filter((r) => userResourceCodes.includes(r.code));

  useEffect(() => {
    dispatch(getOrganizations());
    // 获取组织详情数据
    if (user?.orgId) {
      dispatch(getOrganization(user.orgId));
    }
    dispatch(getRoleGroupRoles(user?.orgId));
    dispatch(getAuthors(user?.orgId));
    dispatch(getRoles({ orgId: user?.orgId }));
    dispatch(getPosts());
    // dispatch(actions.system.getRoleStructList(user?.orgId));

    // 延迟初始化PerfectScrollbar，确保DOM元素已渲染
    setTimeout(() => {
      const domElement = document.getElementById("role-right-card");
      if (domElement && !rightTableSrcollBar) {
        rightTableSrcollBar = new PerfectScrollbar("#role-right-card", {
          suppressScrollX: true,
        });
      }
    }, 100);

    // 组件卸载时清理滚动条
    return () => {
      if (rightTableSrcollBar) {
        rightTableSrcollBar.destroy();
        rightTableSrcollBar = null;
      }
    };
  }, []);

  useEffect(() => {
    if (selectRole?.id) {
      let role = null;
      // 在角色组中查找匹配的角色
      for (const roleGroup of roleGroupRoles) {
        if (roleGroup.roles && Array.isArray(roleGroup.roles)) {
          role = roleGroup.roles.find((r) => r.id === selectRole.id);
          if (role) break;
        }
      }
      const structures =
        role && Array.isArray(role.structures)
          ? role.structures.map((v) => v.id)
          : [];
      setSelectProject(structures);
    }
  }, [selectRole]);

  useEffect(() => {
    const domTable = document.getElementById("role-right-card");
    if (domTable && rightTableSrcollBar) {
      rightTableSrcollBar.update();
      domTable.scrollTop = 0;
    }
  }, [clientHeight]);

  useEffect(() => {
    dispatch(getProjects());
  }, []);


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
      title: "部门",
      ellipsis: true,
      dataIndex: ["department", "name"],
    },
    {
      title: "职位",
      ellipsis: true,
      dataIndex: ["typePost", "name"],
    },
  ];

  const getSelectRoleUsers = () => {
    if (!selectRole?.id) return [];
    for (const group of roleGroupRoles || []) {
      const role = (group.roles || []).find((r) => r.id === selectRole.id);
      if (role) return role.users || [];
    }
    return [];
  };

  const rowSelection = {
    type: "checkbox",
    selectedRowKeys: selectUsers,
    onChange: (selectedRowKeys) => setSelectUsers(selectedRowKeys),
  };

  const renderTitle = () => {
    const disabled = selectRole?.portal === "A" || !isAuthorized("EDITROLE");
    return (
      <div>
        <span style={{ marginRight: 15 }}>
          成员({selectRole?.users?.length || 0} 人)
        </span>
        <RoleSelectUser
          authorData={processedDepartments.filter(
            (f) => f.departmentName != "默认"
          )}
          organizations={currentOrganization}
          disabled={disabled}
          selectUsers={selectRole?.users || []}
          onFinish={handleSaveRoleUsers}
        />
        <Button
          type="primary"
          ghost
          disabled={disabled}
          onClick={handleRemoveRoleUsers}
        >
          移除用户
        </Button>
      </div>
    );
  };

  const handleSaveRoleUsers = (userIds) => {
    const params = {
      userIds,
    };
    // 获取当前角色已有用户
    const currentRoleUsers = getSelectRoleUsers();
    const currentUserIds = currentRoleUsers.map((u) => u.id);
    const addedUserIds = (userIds || []).filter(
      (id) => !currentUserIds.includes(id)
    );
    const getAllUsers = () => {
      const all = [];
      processedDepartments.forEach((dept) => {
        if (dept.members) all.push(...dept.members);
      });
      const unique = [];
      all.forEach((u) => {
        if (!unique.find((x) => x.id === u.id)) unique.push(u);
      });
      return unique;
    };
    const getUserNamesByIds = (ids) => {
      const all = getAllUsers();
      return (ids || []).map((id) => {
        const u = all.find((x) => x.id === id);
        return u ? u.username || u.name || `用户ID:${id}` : `用户ID:${id}`;
      });
    };
    const addedNames = getUserNamesByIds(addedUserIds);
    const logContent = `角色“${
      selectRole?.name || "-"
    }”选择用户：${addedNames.join("、")}`;

    return dispatch(modifyRoleUsers(selectRole?.id, params)).then(() => {
      dispatch(getAuthors(user?.orgId));
      dispatch(getRoleGroupRoles(user?.orgId));
      dispatch(
        createSystemLog({
          content: logContent,
          module: "角色管理",
          url: window.location.pathname,
          userId: user?.id,
        })
      );
    });
  };

  const handleRemoveRoleUsers = (e) => {
    if (selectUsers.length == 0) {
      message.info("未选择需要删除的用户");
      return;
    }
    const params = {
      userIds: selectUsers,
    };

    const getAllUsers = () => {
      const all = [];
      processedDepartments.forEach((dept) => {
        if (dept.members) all.push(...dept.members);
      });
      const unique = [];
      all.forEach((u) => {
        if (!unique.find((x) => x.id === u.id)) unique.push(u);
      });
      return unique;
    };
    const getUserNamesByIds = (ids) => {
      const all = getAllUsers();
      return (ids || []).map((id) => {
        const u = all.find((x) => x.id === id);
        return u ? u.username || u.name || `用户ID:${id}` : `用户ID:${id}`;
      });
    };
    const removedNames = getUserNamesByIds(selectUsers);

    return dispatch(deleteRoleUsers(selectRole?.id, params)).then(() => {
      setSelectUsers([]);
      dispatch(getOrganization(user.orgId));
      dispatch(getRoleGroupRoles(user?.orgId));
      dispatch(
        createSystemLog({
          content: `角色“${
            selectRole?.name || "-"
          }”移除用户：${removedNames.join("、")}`,
          module: "角色管理",
          url: window.location.pathname,
          userId: user?.id,
        })
      );
    });
  };

  const handleDeleteGroupRole = (id) => {
    const groupToDelete = roleGroupRoles?.find((g) => g.id === id);
    const groupName = groupToDelete?.name || `ID:${id}`;
    dispatch(deleteGroupRole(id)).then((_) => {
      dispatch(getRoleGroupRoles(user?.orgId));
      dispatch(
        createSystemLog({
          content: `删除角色组：${groupName}`,
          module: "角色管理",
          url: window.location.pathname,
          userId: user?.id,
        })
      );
    });
  };

  const handleDeleteRole = (id) => {
    let roleName = `ID:${id}`;
    for (const group of roleGroupRoles || []) {
      const r = group?.roles?.find((rr) => rr.id === id);
      if (r) {
        roleName = r.name || roleName;
        break;
      }
    }
    dispatch(deleteRole(id)).then((_) => {
      dispatch(getRoleGroupRoles(user?.orgId));
      dispatch(
        createSystemLog({
          content: `删除角色：${roleName}`,
          module: "角色管理",
          url: window.location.pathname,
          userId: user?.id,
        })
      );
    });
  };

  const handleSaveRole = async (values, editData = null, isGroup = false) => {
    const params = { ...values, orgId: user?.orgId };
    if (isGroup) {
      // 角色组
      if (editData) {
        return dispatch(modifyGroupRole(editData?.id, params)).then(() => {
          dispatch(getRoleGroupRoles(user?.orgId));
          dispatch(
            createSystemLog({
              content: `编辑角色组：${editData?.name || "-"} -> ${values.name}`,
              module: "角色管理",
              url: window.location.pathname,
              userId: user?.id,
            })
          );
        });
      }
      return dispatch(addGroupRole(params)).then(() => {
        dispatch(getRoleGroupRoles(user?.orgId));
        dispatch(
          createSystemLog({
            content: `新增角色组：${values.name}`,
            module: "角色管理",
            url: window.location.pathname,
            userId: user?.id,
          })
        );
      });
    }
    // 角色
    if (editData) {
      return dispatch(modifyRole(editData?.id, params)).then(() => {
        dispatch(getRoleGroupRoles(user?.orgId));
        dispatch(
          createSystemLog({
            content: `编辑角色：${editData?.name || "-"} -> ${values.name}`,
            module: "角色管理",
            url: window.location.pathname,
            userId: user?.id,
          })
        );
      });
    }
    const groupName =
      (roleGroupRoles || []).find((g) => g.id == values.groupId)?.name || "-";
    return dispatch(addRole(params)).then(() => {
      dispatch(getRoleGroupRoles(user?.orgId));
      dispatch(
        createSystemLog({
          content: `新增角色：${values.name}（角色组：${groupName}）`,
          module: "角色管理",
          url: window.location.pathname,
          userId: user?.id,
        })
      );
    });
  };


  const handelSaveResourceRole = (data) => {
    const existingRoleCodes = (Array.isArray(roleAuthor) ? roleAuthor : []).map(
      (r) => r.code
    );
    const disallowedExisting = existingRoleCodes.filter(
      (code) => !isSuperAdmin && !userResourceCodes.includes(code)
    );
    const allowedNew = (Array.isArray(data) ? data : []).filter(
      (code) => isSuperAdmin || userResourceCodes.includes(code)
    );
    const finalResources = Array.from(
      new Set([...(allowedNew || []), ...(disallowedExisting || [])])
    );
    const params = {
      resources: finalResources,
    };
    return dispatch(modifyAuthor(selectRole?.id, params)).then(() => {
      dispatch(getAuthorByRole(selectRole?.id));
      const selectedNames = (
        Array.isArray(visibleAuthors) ? visibleAuthors : []
      )
        .filter((r) => Array.isArray(allowedNew) && allowedNew.includes(r.code))
        .map((r) => r.name);
      dispatch(
        createSystemLog({
          content: `角色“${selectRole?.name || "-"}”权限选择${
            selectedNames.length || 0
          }项：${selectedNames.join("、") || "无"}`,
          module: "角色管理",
          url: window.location.pathname,
          userId: user?.id,
        })
      );
    });
  };

  const handleSelectedNode = (node) => {
    setSelectRole(node);
    dispatch(getAuthorByRole(node.id));
    dispatch(getProjectRoles(node?.id)).then((res) => {
      if (res.success) {
        setSelectProject((res.payload.data || []).map((p) => p.id));
      }
    });
  };


  const deviceModelChange = (value) => {
    setSelectProject(value);
  };

  // 关注项目
  // const handleRoleProject = () => {
  //   const params = {
  //     roleIds: selectRole?.id,
  //     projectId: selectProject,
  //   };
  //   return dispatch(bindRolesProject(params)).then(() => {
  //     dispatch(getProjectRoles(selectRole?.id)).then((res) => {
  //       if (res.success) {
  //         setSelectProject((res.payload.data || []).map((p) => p.id));
  //         dispatch(
  //           createSystemLog({
  //             content: `角色“${selectRole?.name || "-"}”关注项目：${
  //               (res.payload.data || [])
  //                 .map((p) => `${p.name || p.id}（ID：${p.id}）`)
  //                 .join("、") || "无"
  //             }`,
  //             module: "角色管理",
  //             url: window.location.pathname,
  //             userId: user?.id,
  //           })
  //         );
  //       }
  //     });
  //   });
  // };


  return (
    <LayoutContent perfectScroll={false}>
      <Spin spinning={loading}>
        <ProCard split="vertical" style={{ position: "relative", zIndex: 0, isolation: "isolate" }}>
          <ProCard colSpan="260px">
            <RoleTree
              height={clientHeight - 260}
              dataList={roleGroupRoles}
              // enterprises={enterprises}
              onSelectedRole={handleSelectedNode}
              onSaveRole={handleSaveRole}
              onDeleteGroupRole={handleDeleteGroupRole}
              onDeleteRole={handleDeleteRole}
            />
          </ProCard>
          <div
            id="role-right-card"
            style={{
              position: "relative",
              height: localFunc.getContentHeight(clientHeight),
            }}
          >
            <ProCard title={selectRole?.name || ""}>
              {/* <Row gutter={16}>
                {selectRole?.portal === "A" ? (
                  <Col span={24}>
                    <span>关注项目: </span>
                    全部
                  </Col>
                ) : (
                  <>
                    <Col span={18}>
                      <span>关注项目: </span>
                      <Select
                        mode="multiple"
                        allowClear
                        showSearch
                        placeholder="选择项目"
                        style={{ width: "80%" }}
                        disabled={!isAuthorized("EDITDEVICEMODEL")}
                        getPopupContainer={() => document.body}
                        optionFilterProp="children"
                        filterOption={(input, option) =>
                          String(option?.children || "")
                            .toLowerCase()
                            .includes(String(input || "").toLowerCase())
                        }
                        popupRender={(menu) => (
                          <div
                            onWheel={(e) => e.stopPropagation()}
                            onTouchMove={(e) => e.stopPropagation()}
                          >
                            {menu}
                          </div>
                        )}
                        value={selectProject}
                        onChange={deviceModelChange}
                        maxTagCount={5}
                        maxTagTextLength={10}
                      >
                        {projects.map((v) => (
                          <Select.Option key={v.id} value={v.id}>
                            {v.name}
                          </Select.Option>
                        ))}
                      </Select>
                    </Col>
                    <Col span={4}>
                      <Button
                        type="primary"
                        ghost
                        disabled={!isAuthorized("EDITDEVICEMODEL")}
                        onClick={handleRoleProject}
                      >
                        保存
                      </Button>
                    </Col>
                  </>
                )}
              </Row> */}
              <div className="role-user-table">
                <ProTable
                  columns={columns}
                  rowKey="id"
                  rowSelection={rowSelection}
                  options={{ reload: false }}
                  search={false}
                  dateFormatter="string"
                  pagination={{
                    ...pageStyle,
                    pageSize: 5,
                    pageSizeOptions: [5, 10, 20],
                  }}
                  headerTitle={renderTitle()}
                  dataSource={getSelectRoleUsers()}
                />
              </div>
              <Resource
                resourceData={visibleAuthors}
                checkedlist={roleAuthor}
                disabled={
                  selectRole?.portal === "A" ||
                  !isAuthorized("EDITROLEPERMISSIONS")
                }
                onPostResourcesSave={handelSaveResourceRole}
              />
            </ProCard>
          </div>
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
    authors,
    roleAuthor,
    projects,
    organizations,
    roleGroupRoles,
    roles,
    posts,
  } = state;
  return {
    loading:
      authorData.isRequesting ||
      authors.isRequesting ||
      roleGroupRoles.isRequesting ||
      roleAuthor.isRequesting ||
      projects.isRequesting,
    user: auth.user?.userInfo,
    actions: global.actions,
    clientHeight: global.clientHeight,
    authorData: authorData.data || {},
    authors: authors?.data?.data || [],
    roleAuthor: roleAuthor?.data?.data || [],
    projects: projects?.data?.rows || [],
    organizations: organizations.data?.data || [],
    roleGroupRoles: roleGroupRoles?.data?.data || [],
    roles: roles?.data?.data || [],
    posts: posts?.data?.data || [],
  };
}

export default connect(mapStateToProps)(Roles);
