"use strict";
import React, { useEffect, useState } from "react";
import { connect, createStore } from "react-redux";
import Immutable from "immutable";
import { pepProject } from "../../actions/global";
import {
  Button,
  Dropdown,
  Menu,
  Avatar,
  Input,
  Tooltip,
  Tabs,
  Space,
  Popconfirm,
  Modal,
  Popover,
  Form,
  message,
} from "antd";
import {
  DownOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  KeyOutlined,
} from "@ant-design/icons";
import CustomProjGroupModal from "./components/customProjGroupModal";
import PerfectScrollbar from "perfect-scrollbar";
import "./index.less";
import layout from "../../containers/layout";
import { resetPassword } from "../../../sections/system/actions/member";
import { createSystemLog } from "../../../sections/system/actions/log";

let newScrollbar;
const Header = (props) => {
  const {
    dispatch,
    history,
    user,
    actions,
    socket,
    headerItems,
    tochange,
    projectGroup,
  } = props;
  const { install, projectGroup: projectGroupAC, layout, problem } = actions;
  const [pomsList, setPomsList] = useState([]);
  const [pomsName, setPomsName] = useState("全局");
  const [pepProjectId, setPepProjectId] = useState();
  const [keyword, setKeyword] = useState("");
  const [Scrollbar, setScrollbar] = useState(false);
  const [prjDropdownVis, setPrjDropdownVis] = useState(false);
  const [prjDropDownTabKey, setPrjDropDownTabKey] = useState("项目");
  const [customProjGroupModalVis, setCustomProjGroupModalVis] = useState(false);
  const [customProjGroupDelPopVis, setCustomProjGroupDelPopVis] =
    useState(false);
  const [customProjGroupEditData, setCustomProjGroupEditData] = useState(null);
  const [count, setCount] = useState(0); //待办工单数量
  const [changePasswordModalVis, setChangePasswordModalVis] = useState(false);
  const [changePasswordForm] = Form.useForm();
  const userInfo = JSON.parse(sessionStorage.getItem("user"));
  // 生成Menu的items数组
  const generateMenuItems = () => {
    const items = [];

    // 添加动态角色菜单项
    if (modalRole.length > 0) {
      modalRole.forEach((item, index) => {
        if (item.hasOwnProperty("items")) {
          items.push({
            key: `menu-${index}-${item.itemKey || item.text}`,
            label:
              item.text === "工单" ? `${item.text}（${count}）` : item.text,
            children: item.items.map((ite, idx) => ({
              key: `submenu-${index}-${idx}-${ite.itemKey || ite.text}`,
              label: ite.text,
              onClick: () => tochange(ite),
            })),
          });
        } else {
          items.push({
            key: `menu-${index}-${item.itemKey || item.text}`,
            label: (
              <div style={{ display: "inline-flex" }}>
                <img
                  src="/assets/images/background/console.png"
                  style={{ width: 24, marginRight: -10 }}
                />
                <span>{item.text}</span>
              </div>
            ),
            onClick: () => tochange(item),
          });
        }
      });
    }

    // 用户菜单内容组件
    const UserMenuContent = () => (
      <div style={{ width: 320, padding: 0, margin: 0 }}>
        {/* 用户信息区域 */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            background:
              "linear-gradient(135deg, rgb(100, 180, 229) 0%, rgb(80, 160, 220) 100%)",
            padding: "24px 20px",
            margin: 0,
            minHeight: "90px",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: -20,
              right: -20,
              width: 80,
              height: 80,
              background: "rgba(255, 255, 255, 0.1)",
              borderRadius: "50%",
            }}
          />
          <Avatar
            size={64}
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.2)",
              color: "white",
              marginRight: 16,
              border: "3px solid rgba(255, 255, 255, 0.3)",
              fontSize: "28px",
              fontWeight: "600",
              flexShrink: 0,
              zIndex: 1,
            }}
          >
            {user?.username?.substr(0, 1)}
          </Avatar>
          <div style={{ flex: 1, minWidth: 0, zIndex: 1 }}>
            <div
              style={{
                fontSize: 20,
                color: "white",
                fontWeight: 600,
                marginBottom: 6,
                lineHeight: 1.2,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {user?.username}
            </div>
            <div
              title={user?.department?.map((v) => v.name).join("、")}
              style={{
                fontSize: 14,
                color: "rgba(255, 255, 255, 0.9)",
                overflow: "hidden",
                whiteSpace: "nowrap",
                textOverflow: "ellipsis",
                lineHeight: 1.2,
              }}
            >
              {user?.department?.map((v) => v.name).join("、") ||
                "暂无部门信息"}
            </div>
          </div>
        </div>

        {/* 分割线 */}
        <div style={{ height: 1, background: "#f0f0f0", margin: "0 20px" }} />

        {/* 修改密码按钮 */}
        <div style={{ padding: "16px 20px 8px 20px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "12px 20px",
              cursor: "pointer",
              color: "#1890ff",
              fontSize: 15,
              fontWeight: 600,
              transition: "all 0.2s ease",
              borderRadius: "8px",
              backgroundColor: "#f0f8ff",
              border: "1px solid #d1e9ff",
              width: "100%",
              boxSizing: "border-box",
            }}
            className="change-password-button"
            onClick={() => {
              setChangePasswordModalVis(true);
            }}
          >
            <KeyOutlined style={{ marginRight: 8 }} />
            修改密码
          </div>
        </div>

        {/* 退出按钮 */}
        <div style={{ padding: "8px 20px 16px 20px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "12px 20px",
              cursor: "pointer",
              color: "#dc2626",
              fontSize: 15,
              fontWeight: 600,
              transition: "all 0.2s ease",
              borderRadius: "8px",
              backgroundColor: "#fef2f2",
              border: "1px solid #fecaca",
              width: "100%",
              boxSizing: "border-box",
            }}
            className="logout-button"
            onClick={() => {
              dispatch(actions.auth.logout(user));
              if (socket) {
                socket.disconnect();
              }
              history.push(`/signin`);
            }}
          >
            退出登录
          </div>
        </div>
      </div>
    );

    // 添加用户菜单
    items.push({
      key: "user",
      label: (
        <Popover
          content={<UserMenuContent />}
          trigger="hover"
          placement="bottomRight"
          overlayClassName="user-menu-popover"
          arrow={false}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              padding: "0 12px",
              borderRadius: "6px",
              transition: "background-color 0.2s ease",
              height: "40px",
              cursor: "pointer",
            }}
            className="user-menu-trigger"
          >
            <Avatar
              size="small"
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.15)",
                color: "white",
                marginRight: 8,
                border: "2px solid rgba(255, 255, 255, 0.2)",
              }}
            >
              {user?.username?.substr(0, 1)}
            </Avatar>
            <span style={{ fontSize: 14, fontWeight: 500, marginRight: 6 }}>
              {user?.username}
            </span>
            <DownOutlined style={{ fontSize: 12, opacity: 0.8 }} />
          </div>
        </Popover>
      ),
    });

    return items;
  };
  let pomsAuths = userInfo?.resources;
  let userRole = userInfo?.roleNames;
  let modalRole = [];
  if (userRole && pomsAuths) {
    const roleMap = {
      SYSTEMMANAGEMENT: "system",
      DEVICE: "device",
    };
    let modal = pomsAuths.reduce((acc, v) => {
      if (roleMap[v]) {
        acc.push(roleMap[v]);
      }
      return acc;
    }, []);
    //控制台每个人都权限
    modal.push("control");
    modal = [...new Set(modal)];
    modalRole = headerItems?.filter((v) => modal.includes(v.itemKey));
    if (userRole?.includes("所有者") || userRole?.includes("管理员"))
      modalRole = headerItems;
  }

  // const getProjGroup = () => {
  //   dispatch(projectGroupAC.getProjectGroup());
  // };

  // useEffect(() => {
  // if (JSON.parse(sessionStorage.getItem("user"))?.token) {
  // dispatch(install.getProjectPoms({ global: 1 })).then((res) => {
  //   //获取已绑定项目
  //   if (res.success) {
  //     let data = res.payload.data?.rows
  //       ?.filter((v) => v.pepProjectIsDelete !== 1)
  //       ?.map((v) => ({
  //         pepProjectId: v.id,
  //         pepProjectName: v.pepProjectName || v.name,
  //       }));
  //     setPomsList(data);
  //   }
  // });
  // getProjGroup();
  // dispatch(layout.getWorkOrders()).then((res) => {
  //   if (res.success) {
  //     setCount(res.payload.data?.count);
  //   }
  // });
  // dispatch(problem.getAlarmDataGroup({ showAll: true }));
  // }
  // }, []);

  useEffect(() => {
    const domProject = document.getElementById("overall");
    if (domProject) {
      newScrollbar = new PerfectScrollbar("#overall", {
        suppressScrollX: true,
      });
      if (domProject && newScrollbar) {
        newScrollbar.update();
      }
    }
  }, [Scrollbar]);

  // useEffect(() => {
  //   dispatch(pepProject(pepProjectId));
  // }, [pepProjectId]);

  // 处理修改密码
  const handleChangePassword = async () => {
    const values = await changePasswordForm.validateFields();
    const { newPassword } = values;

    try {
      // 调用重置密码接口
      await dispatch(resetPassword(user?.id, { password: newPassword }));

      // 记录系统日志：修改密码成功
      try {
        dispatch(
          createSystemLog({
            content: `用户修改密码：${user?.username}（ID：${user?.id}）`,
            module: "登录管理",
            url: window.location.pathname,
            userId: user?.id,
          })
        );
      } catch (e) {
        // 忽略日志写入错误，避免影响正常流程
        console.warn("写入系统日志失败：", e);
      }

      // 密码修改成功后，自动退出登录
      message.success("密码修改成功，即将自动退出，请使用新密码重新登陆");

      // 延迟1秒后执行退出登录操作
      setTimeout(() => {
        dispatch(actions.auth.logout(user));
        if (socket) {
          socket.disconnect();
        }
        history.push("/signin");
      }, 1000);
    } catch (error) {
      // 密码修改失败的处理已经在basicAction中处理了
      console.error("密码修改失败:", error);
    }
  };

  return (
    <>
      <div
        id="top-slider"
        style={{
          height: 50,
          minWidth: 520,
          background: "#1D2343",
          backgroundSize: "100% 100%",
          color: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 16px",
        }}
      >
        {/* 左侧Logo */}
        <div
          style={{
            display: "inline-block",
            fontSize: 20,
            fontWeight: "bold",
            color: "white",
            lineHeight: "40px",
            height: 40,
          }}
        >
          设备管理系统
        </div>

        {/* 右侧导航菜单 */}
        <Menu
          mode={"horizontal"}
          onClick={({ key }) => {
            if (key == "logout") {
              dispatch(actions.auth.logout(user));
              if (socket) {
                socket.disconnect();
              }
              history.push(`/signin`);
            }
          }}
          style={{
            background: "transparent",
            border: "none",
            color: "white",
            flex: 1,
            justifyContent: "flex-end",
          }}
          items={generateMenuItems()}
        />
        {/* {
          <CustomProjGroupModal
            open={customProjGroupModalVis}
            pomsList={pomsList}
            editData={customProjGroupEditData}
            cancel={({ refresh } = {}) => {
              setCustomProjGroupModalVis(false);
              setCustomProjGroupEditData(null);
              if (refresh) {
                getProjGroup();
              }
            }}
          />
        } */}
      </div>

      {/* 修改密码Modal */}
      <Modal
        title="修改密码"
        open={changePasswordModalVis}
        onCancel={() => {
          setChangePasswordModalVis(false);
          changePasswordForm.resetFields();
        }}
        footer={null}
        width={480}
        destroyOnHidden
        zIndex={10000}
      >
        <Form
          form={changePasswordForm}
          layout="vertical"
          onFinish={handleChangePassword}
          style={{ marginTop: 20 }}
        >
          <Form.Item
            label="当前密码"
            name="oldPassword"
            rules={[
              { required: true, message: "请输入当前密码" },
              { min: 6, message: "密码长度不能少于6位" },
            ]}
          >
            <Input.Password
              placeholder="请输入当前密码"
              size="large"
              style={{ borderRadius: 8 }}
            />
          </Form.Item>

          <Form.Item
            label="新密码"
            name="newPassword"
            rules={[
              { required: true, message: "请输入新密码" },
              { min: 6, message: "密码长度不能少于6位" },
              {
                pattern: /^(?=.*[a-zA-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{6,}$/,
                message: "密码必须包含字母和数字，长度至少6位",
              },
            ]}
          >
            <Input.Password
              placeholder="请输入新密码"
              size="large"
              style={{ borderRadius: 8 }}
            />
          </Form.Item>

          <Form.Item
            label="确认新密码"
            name="confirmPassword"
            dependencies={["newPassword"]}
            rules={[
              { required: true, message: "请确认新密码" },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue("newPassword") === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error("两次输入的密码不一致"));
                },
              }),
            ]}
          >
            <Input.Password
              placeholder="请再次输入新密码"
              size="large"
              style={{ borderRadius: 8 }}
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, marginTop: 32 }}>
            <Space style={{ width: "100%", justifyContent: "flex-end" }}>
              <Button
                onClick={() => {
                  setChangePasswordModalVis(false);
                  changePasswordForm.resetFields();
                }}
                size="large"
                style={{ borderRadius: 8, minWidth: 80 }}
              >
                取消
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                size="large"
                style={{ borderRadius: 8, minWidth: 80 }}
              >
                确认修改
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

function mapStateToProps(state) {
  const { global, auth, webSocket, projectGroup } = state;
  return {
    actions: global.actions,
    user: auth?.user?.userInfo,
    socket: webSocket.socket,
    projectGroup: projectGroup?.data || [],
  };
}

export default connect(mapStateToProps)(Header);
