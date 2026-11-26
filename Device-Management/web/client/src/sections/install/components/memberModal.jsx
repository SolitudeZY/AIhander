import React, { useState, useRef, useEffect } from "react";
import { connect } from "react-redux";
import { Modal, Form, Checkbox, Button, Select } from "antd";
import { ExclamationCircleOutlined } from "@ant-design/icons";

function memberModal(props) {
  const {
    close,
    cancel,
    open,
    dispatch,
    pepList,
    actions,
    editObj,
    memberEdit,
    pomsList,
    anxinDelete,
    anxincloudArr,
  } = props;
  const { install } = actions;
  const [form] = Form.useForm(); //表单
  const [disablePeople, setDisablePeople] = useState(true); //页码信息
  const [peopleList, setPeopleList] = useState([]); //人员List
  const [departmentId, setDepartmentId] = useState(); //部门id
  const [showFollowedProjects, setShowFollowedProjects] = useState(false);
  const [correlationList, setCorrelationList] = useState([]);
  const [pomsList_, setPomsList_] = useState([]);

  // 添加组件卸载标记
  const isMountedRef = useRef(true);
  // 组件卸载时的清理函数
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      // 清理表单状态
      form.resetFields();
    };
  }, [form]);

  //初始化
  useEffect(() => {
    if (editObj.id) {
      let departmentList = [];
      for (let i = 0; i < pepList.length; i++) {
        if (pepList[i].id == editObj.departments[0].id) {
          let allusers = [];
          pepList[i]?.departmentUsers?.forEach((depUser) => {
            if (!allusers.some((item) => item.userId === depUser.userId)) {
              allusers.push({
                ...depUser,
                id: depUser.userId,
                name: depUser?.user?.name,
              });
            }
          });
          departmentList = allusers;
        }
      }
      if (isMountedRef.current) {
        setDepartmentId(editObj.departments[0].id);
        setPeopleList(departmentList);
      }
    }
    if (isMountedRef.current) {
      setPomsList_(pomsList.filter((p) => p.pepProjectIsDelete != -1));
      setCorrelationList(editObj?.correlationProject?.map((item) => item.id));
    }
  }, []);

  function handleOk() {
    //点击弹框确定  右边按钮
    form
      .validateFields()
      .then((values) => {
        if (memberEdit) {
          dispatch(
            install.postOrganizationUser({
              role: editObj?.role || [],
              correlationProject: values.correlationProject,
              pomsUserId: editObj.id,
              pepUserId: values.pepUserId,
              projectFollow: values.followedProjects,
              msg: "修改成员",
            })
          )
            .then((res) => {
              //获取项企(PEP)全部部门及其下用户
              if (res.success && isMountedRef.current) {
                close();
              }
            })
            .catch((error) => {
              // 处理错误，但只在组件仍然挂载时处理
              if (isMountedRef.current) {
                console.error("修改成员失败:", error);
              }
            });
        } else {
          dispatch(
            install.postOrganizationUser({
              role: [],
              correlationProject: values.correlationProject,
              pepUserId: values.pepUserId,
              projectFollow: values.followedProjects,
              msg: "新增成员",
            })
          )
            .then((res) => {
              //获取项企(PEP)全部部门及其下用户
              if (res.success && isMountedRef.current) {
                close();
              }
            })
            .catch((error) => {
              // 处理错误，但只在组件仍然挂载时处理
              if (isMountedRef.current) {
                console.error("新增成员失败:", error);
              }
            });
        }
      })
      .catch((error) => {
        // 表单验证失败，但只在组件仍然挂载时处理
        if (isMountedRef.current) {
          console.error("表单验证失败:", error);
        }
      });
  }
  function handleCancel() {
    // 标记组件即将卸载，防止后续状态更新
    isMountedRef.current = false;
    // 清理表单状态
    form.resetFields();
    // 调用父组件的取消回调
    cancel();
    //点击弹框取消  左边按钮
  }
  return (
    <>
      <Modal
        title="成员设置"
        okText="确定"
        cancelText="取消"
        open={open}
        onOk={handleOk}
        width={600}
        onCancel={handleCancel}
      >
        <div style={{ margin: "0px 25px" }}>
          <div
            style={{
              width: "100%",
              height: 32,
              background: "#F4F8FF",
              borderRadius: 2,
              border: "1px solid #C7E1FF",
              display: "flex",
              alignItems: "center",
              marginBottom: 20,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                marginLeft: 12,
              }}
            >
              <ExclamationCircleOutlined style={{ color: "#0F7EFB" }} />
            </div>
            <div style={{ color: "#0F7EFB", fontSize: 12, marginLeft: 8 }}>
              成员成为管理员后，拥有平台所有权限和项目，成员的普通角色会被禁用。
            </div>
          </div>
          <Form
            layout="horizontal"
            labelCol={{ span: 4 }}
            wrapperCol={{ span: 20 }}
            onValuesChange={(changedValues, allValues) => {
              // 检查组件是否仍然挂载
              if (!isMountedRef.current) {
                return;
              }

              for (var key in changedValues) {
                if (key == "department") {
                  if (allValues.department >= 0) {
                    let departmentList = [];
                    for (let i = 0; i < pepList.length; i++) {
                      if (pepList[i].id == allValues.department) {
                        let allusers = [];
                        pepList[i]?.departmentUsers?.forEach((depUser) => {
                          if (
                            !allusers.some(
                              (item) => item.userId === depUser.userId
                            )
                          ) {
                            allusers.push({
                              ...depUser,
                              id: depUser.userId,
                              name: depUser?.user?.name,
                            });
                          }
                        });
                        departmentList = allusers;
                      }
                    }
                    // 再次检查组件是否仍然挂载
                    if (isMountedRef.current) {
                      setPeopleList(departmentList);
                      setDisablePeople(false);
                      form.setFieldsValue({ pepUserId: undefined });
                    }
                  } else {
                    if (isMountedRef.current) {
                      setPeopleList([]);
                      setDisablePeople(true);
                      form.setFieldsValue({ pepUserId: undefined });
                    }
                  }
                }
              }

              // 处理关联项目变化
              if (
                "correlationProject" in changedValues &&
                isMountedRef.current
              ) {
                setCorrelationList(allValues.correlationProject || []);
                // 如果关注项目已显示，则清空其选择
                if (showFollowedProjects) {
                  form.setFieldsValue({ followedProjects: [] });
                }
              }
            }}
            form={form}
            initialValues={{
              department: departmentId || "",
              pepUserId: editObj.pepUserId || "",
              correlationProject: anxincloudArr,
            }}
          >
            <div>
              <Form.Item
                label="选择部门:"
                name="department"
                rules={[{ required: true, message: "请选择部门" }]}
              >
                <Select
                  placeholder="请选择部门"
                  style={{ width: 417 }}
                  allowClear
                  showSearch
                  disabled={memberEdit}
                  filterOption={(input, option) =>
                    option.children
                      .toLowerCase()
                      .indexOf(input.toLowerCase()) >= 0
                  }
                >
                  {pepList.map((item, index) => {
                    return (
                      <Select.Option key={item.id} value={item.id}>
                        {item.name}
                      </Select.Option>
                    );
                  })}
                </Select>
              </Form.Item>
            </div>
            <div>
              <Form.Item
                label="选择人员:"
                name="pepUserId"
                rules={[{ required: true, message: "请选择人员" }]}
              >
                <Select
                  showSearch
                  placeholder="请选择人员"
                  style={{ width: 417 }}
                  allowClear
                  disabled={disablePeople}
                  filterOption={(input, option) =>
                    option.children
                      .toLowerCase()
                      .indexOf(input.toLowerCase()) >= 0
                  }
                >
                  {peopleList.map((item, index) => {
                    return (
                      <Select.Option key={item.id} value={item.id}>
                        {item.name}
                      </Select.Option>
                    );
                  })}
                </Select>
              </Form.Item>
            </div>
            {/* <div>
                     <Form.Checkbox
                        field="role"
                        label='权限配置:'
                        allowClear
                        initValue={editObj.role || []}
                     >
                        {
                           jurisdiction.map((item, index) => {
                              return (
                                 <Checkbox.Group value={item.value} key={index} >
                                    <div style={{ display: 'flex' }}>
                                       <div style={{ fontSize: 13, color: '#4A4A4A' }}>
                                          {item.label}
                                       </div>
                                       <div style={{ fontSize: 12, color: '#969799', marginLeft: 12 }}>
                                          {item.text}
                                       </div>
                                    </div>
                                 </Checkbox>
                              )
                           })
                        }
                     </Form.Checkbox>
                  </div> */}
            <div>
              <Form.Item label="关联项目:" name="correlationProject">
                <Select
                  mode="multiple"
                  placeholder="请选择关联项目"
                  style={{ width: 417 }}
                  showSearch
                  allowClear
                  filterOption={(input, option) =>
                    option.children
                      .toLowerCase()
                      .indexOf(input.toLowerCase()) >= 0
                  }
                  popupRender={(menu) => (
                    <>
                      {menu}
                      <div
                        style={{
                          padding: "6px 26px",
                          borderTop: "1px solid #f0f0f0",
                        }}
                      >
                        <Button
                          type="link"
                          onClick={() => {
                            form.setFieldsValue({
                              correlationProject: pomsList_.map((p) => p.id),
                            });
                          }}
                        >
                          全选
                        </Button>
                        <Button
                          type="link"
                          onClick={() => {
                            form.setFieldsValue({ correlationProject: [] });
                          }}
                        >
                          取消选择
                        </Button>
                      </div>
                    </>
                  )}
                >
                  {pomsList_.map((item, index) => {
                    return (
                      <Select.Option key={index} value={item.id}>
                        {item.pepProjectName || item.name}
                      </Select.Option>
                    );
                  })}
                </Select>
              </Form.Item>
            </div>

            {/* 关注项目 - 条件渲染 */}
            {showFollowedProjects && pomsList_.length > 0 && (
              <div>
                <Form.Item
                  label="关注项目:"
                  name="followedProjects"
                  rules={[
                    {
                      required: true,
                      type: "array",
                      min: 1,
                      message: "请至少选择一个关注项目",
                    },
                  ]}
                >
                  <Select
                    mode="multiple"
                    placeholder="请选择关注项目"
                    style={{ width: 417 }}
                    showSearch
                    allowClear
                    filterOption={(input, option) =>
                      option.children
                        .toLowerCase()
                        .indexOf(input.toLowerCase()) >= 0
                    }
                    popupRender={(menu) => (
                      <>
                        {menu}
                        <div
                          style={{
                            padding: "6px 26px",
                            borderTop: "1px solid #f0f0f0",
                          }}
                        >
                          <Button
                            type="link"
                            onClick={() => {
                              form.setFieldsValue({
                                followedProjects: correlationList,
                              });
                            }}
                          >
                            全选
                          </Button>
                          <Button
                            type="link"
                            onClick={() => {
                              form.setFieldsValue({ followedProjects: [] });
                            }}
                          >
                            取消选择
                          </Button>
                        </div>
                      </>
                    )}
                  >
                    {(pomsList_ || [])
                      .filter((item) => correlationList.includes(item.id))
                      .map((item) => {
                        return (
                          <Select.Option key={item.id} value={item.id}>
                            {item.pepProjectName || item.name}
                          </Select.Option>
                        );
                      })}
                  </Select>
                </Form.Item>
              </div>
            )}
            {anxinDelete?.length > 0 ? (
              <div style={{ display: "flex" }}>
                <div style={{ marginTop: 3 }}>
                  <img
                    src="/assets/images/install/risk.png"
                    alt=""
                    style={{ height: 24, width: 24 }}
                  />
                </div>
                <div
                  style={{
                    background: "rgba(255, 51, 0, 0.28)",
                    color: "#FF3300",
                    fontSize: 12,
                    marginLeft: 8,
                    lineHeight: 2,
                    padding: "0px 5px",
                    border: "1px solid rgba(255,51,0,0.3)",
                    width: 515,
                  }}
                >
                  确定后“{anxinDelete.join("、")}
                  ”将被系统移除，原因是项目已在【项企】或【映射关系】中被删除！
                </div>
              </div>
            ) : (
              ""
            )}
          </Form>
        </div>
      </Modal>
    </>
  );
}
function mapStateToProps(state) {
  const { auth, global, members } = state;
  return {
    //   loading: members.isRequesting,
    user: auth.user,
    actions: global.actions,
    //   members: members.data,
  };
}

export default connect(mapStateToProps)(memberModal);
