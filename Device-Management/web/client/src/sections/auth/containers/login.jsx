"use strict";
import React, { useEffect, useRef, useState } from "react";
import { connect } from "react-redux";
import { push } from "react-router-redux";
import { Form, Button, message, Input, Checkbox } from "antd";
import { login, LOGIN_SUCCESS } from "../actions/auth";
import { LockOutlined, UserOutlined } from "@ant-design/icons";
import "../style.less";
import { register } from "../actions/auth";

const ASCII_NO_SPACE_MAX50 = /^[!-~]{1,50}$/;

// 生成固定的密钥（在实际应用中，这应该从安全的地方获取）
const getEncryptionKey = async () => {
  const keyMaterial = await window.crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode("DMS_LOGIN_KEY_2024_SECURE"), // 32字节密钥
    { name: "PBKDF2" },
    false,
    ["deriveBits", "deriveKey"],
  );

  return window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: new TextEncoder().encode("DMS_SALT_2024"),
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"],
  );
};

// AES-GCM 加密函数
const encryptPassword = async (password) => {
  try {
    const key = await getEncryptionKey();
    const iv = window.crypto.getRandomValues(new Uint8Array(12)); // 96位随机IV
    const encodedPassword = new TextEncoder().encode(password);

    const encrypted = await window.crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv: iv,
      },
      key,
      encodedPassword,
    );

    // 将IV和加密数据组合并转换为base64
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);

    return btoa(String.fromCharCode.apply(null, combined));
  } catch (error) {
    console.error("加密失败:", error);
    return btoa(password); // 降级到base64
  }
};

// AES-GCM 解密函数
const decryptPassword = async (encryptedPassword) => {
  try {
    const key = await getEncryptionKey();
    const combined = new Uint8Array(
      atob(encryptedPassword)
        .split("")
        .map((char) => char.charCodeAt(0)),
    );

    const iv = combined.slice(0, 12);
    const encrypted = combined.slice(12);

    const decrypted = await window.crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: iv,
      },
      key,
      encrypted,
    );

    return new TextDecoder().decode(decrypted);
  } catch (error) {
    console.error("解密失败:", error);
    // 尝试使用旧的base64解密方式（向后兼容）
    try {
      return atob(encryptedPassword);
    } catch (e) {
      return "";
    }
  }
};

const Login = (props) => {
  const { dispatch, user, error, actions, apiRoot, isRequesting } = props;
  const [form] = Form.useForm();
  const isMountedRef = useRef(true);
  const [rememberPassword, setRememberPassword] = useState(false);
  const [currentUsername, setCurrentUsername] = useState(""); // 追踪当前用户名
  const [registerForm] = Form.useForm();
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const registerPendingRef = useRef(false);

  // 从localStorage读取保存的登录信息
  useEffect(() => {
    const loadSavedCredentials = async () => {
      const savedUsername = localStorage.getItem("login_username");
      const savedPassword = localStorage.getItem("login_password");
      const savedRemember = localStorage.getItem("login_remember") === "true";

      if (savedUsername && savedPassword && savedRemember) {
        const decryptedPassword = await decryptPassword(savedPassword);
        form.setFieldsValue({
          username: savedUsername,
          password: decryptedPassword,
          rememberPassword: savedRemember,
        });
        setRememberPassword(savedRemember);
        setCurrentUsername(savedUsername); // 设置当前用户名
      }
    };

    loadSavedCredentials();
  }, [form]);

  useEffect(() => {
    if (error) {
      message.error(error);
      form.setFieldsValue({ password: "" });
    }
  }, [error]);

  useEffect(() => {
    if (user && user.authorized && user.resources.length > 0) {
      // 根据用户权限动态选择默认路由
      const getDefaultRoute = () => {
        // 检查用户权限，使用与nav-item.jsx相同的逻辑
        const { roleNames, resources } = user;
        const isAuthorized = (authcode) => {
          return (
            roleNames?.includes("所有者") ||
            roleNames?.includes("管理员") ||
            resources?.includes(authcode)
          );
        };

        if (isAuthorized("DEVICE")) {
          // 创建设备管理子项数组，按优先级排序
          const deviceManagementItems = [];
          const canViewParamTemplates =
            isAuthorized("PARAMETERTEMPLATE") &&
            isAuthorized("VIEWPARAMETERTEMPLATE");
          const canViewParamTemplateHistory = isAuthorized(
            "PARAMETERTEMPLATEHISTORY",
          );

          // 按优先级添加设备管理子项
          if (isAuthorized("DEVICELIST") && isAuthorized("VIEWDEVICELIST")) {
            deviceManagementItems.push({
              itemKey: "deviceList",
              to: "/device/firmwareUpgrade/deviceList",
              text: "设备列表",
            });
          }
          if (isAuthorized("FIRMWARELIB") && isAuthorized("VIEWFIRMWARELIST")) {
            deviceManagementItems.push({
              itemKey: "firmwareLibrary",
              to: "/device/firmwareUpgrade/firmwareLibrary",
              text: "固件库",
            });
          }
          if (
            isAuthorized("PRODUCTLIB") &&
            (isAuthorized("VIEWPRODUCTLIST") || isAuthorized("VIEWSENSORLIST"))
          ) {
            deviceManagementItems.push({
              itemKey: "productLibrary",
              to: "/device/firmwareUpgrade/productLibrary",
              text: "产品库",
            });
          }

          if (canViewParamTemplates) {
            deviceManagementItems.push({
              itemKey: "paramTemplates",
              to: "/device/firmwareUpgrade/paramTemplates",
              text: "参数模板",
            });
          }

          if (canViewParamTemplateHistory) {
            deviceManagementItems.push({
              itemKey: "paramTemplateHistory",
              to: "/device/firmwareUpgrade/paramTemplateHistory",
              text: "参数模板历史记录",
            });
          }

          if (isAuthorized("EDGEDEVICE") && isAuthorized("VIEWEDGEDEVICE")) {
            deviceManagementItems.push({
              itemKey: "edgeDevices",
              to: "/device/edgeDevice/edgeDevices",
              text: "边缘设备",
            });
          }

          if (isAuthorized("VISIONMODEL") && isAuthorized("VIEWVISIONMODEL")) {
            deviceManagementItems.push({
              itemKey: "visionModels",
              to: "/device/edgeDevice/visionModels",
              text: "视觉模型库",
            });
          }

          if (isAuthorized("EVENTALARM") && isAuthorized("VIEWEVENT")) {
            deviceManagementItems.push({
              itemKey: "events",
              to: "/device/edgeDevice/events",
              text: "事件与告警",
            });
          }

          if (isAuthorized("UPGRADETASK") && isAuthorized("VIEWUPGRADETASK")) {
            deviceManagementItems.push({
              itemKey: "upgradeTasks",
              to: "/device/edgeDevice/upgradeTasks",
              text: "升级任务",
            });
          }

          // 如果用户有设备管理权限且有子权限，选择第一个有权限的页面
          if (deviceManagementItems.length > 0) {
            // 设置设备管理模块自动展开和选中
            localStorage.setItem(
              "poms_selected_sider",
              JSON.stringify(["device"]),
            );
            localStorage.setItem(
              "poms_open_sider",
              JSON.stringify(["firmwareUpgrade"]),
            );
            return deviceManagementItems[0].to;
          }
        }

        // 检查系统管理模块权限
        if (isAuthorized("SYSTEMMANAGEMENT")) {
          // 优先级：组织管理 > 用户管理 > 角色管理 > 项目管理 > 系统日志
          if (
            isAuthorized("ORGANIZATIONALMANAGEMENT") &&
            isAuthorized("VIEWORGANIZATIONDATA")
          ) {
            return "/system/systemManagement/organizationalManagement";
          }

          if (isAuthorized("USERMANAGEMENT") && isAuthorized("VIEWUSERDATA")) {
            return "/system/systemManagement/userManagement";
          }

          if (isAuthorized("ROLEMANAGEMENT") && isAuthorized("VIEWROLEDATA")) {
            return "/system/systemManagement/roleManagement";
          }

          if (
            isAuthorized("PROJECTMANAGEMENT") &&
            isAuthorized("VIEWPROJECTDATA")
          ) {
            return "/system/systemManagement/projectManagement";
          }

          if (isAuthorized("SYSTEMLOG") && isAuthorized("VIEWSYSTEMLOG")) {
            return "/system/systemManagement/systemLog";
          }
        }

        // 如果没有任何模块权限，返回根路径
        return "/";
      };

      const defaultRoute = getDefaultRoute();
      dispatch(push(defaultRoute));
    } else if (user?.resources?.length === 0) {
      sessionStorage.removeItem("user");
      message.error("该账号未授权，请联系管理员");
    }
  }, [user]);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // 处理用户名变化
  const handleUsernameChange = (e) => {
    const newUsername = e.target.value;

    // 如果用户名发生变化且不为空
    if (currentUsername && newUsername !== currentUsername) {
      // 重置记住密码状态
      setRememberPassword(false);
      // 清空密码输入框
      form.setFieldsValue({
        password: "",
        rememberPassword: false,
      });
      // 清除本地存储的登录信息
      localStorage.removeItem("login_username");
      localStorage.removeItem("login_password");
      localStorage.removeItem("login_remember");
    }

    setCurrentUsername(newUsername);
  };

  // 处理记住密码复选框变化
  const handleRememberChange = (e) => {
    const checked = e.target.checked;
    setRememberPassword(checked);

    // 如果取消记住密码，清除本地存储
    if (!checked) {
      localStorage.removeItem("login_username");
      localStorage.removeItem("login_password");
      localStorage.removeItem("login_remember");
    }
  };

  // 处理表单提交
  const handleSubmit = async (values) => {
    // 如果选择记住密码，保存到localStorage
    if (values.rememberPassword) {
      const encryptedPassword = await encryptPassword(values.password);
      localStorage.setItem("login_username", values.username);
      localStorage.setItem("login_password", encryptedPassword);
      localStorage.setItem("login_remember", "true");
    } else {
      // 清除保存的登录信息
      localStorage.removeItem("login_username");
      localStorage.removeItem("login_password");
      localStorage.removeItem("login_remember");
    }

    dispatch(login(values.username, values.password))
      .then((res) => {
        if (!isMountedRef.current || !res?.token) {
          return;
        }
        dispatch(
          actions.layout.initWebSocket({
            ioUrl: apiRoot,
            token: res.token,
          }),
        );
      })
      .catch((error) => {
        if (isMountedRef.current) {
          console.error("Login error:", error);
        }
      });
  };

  const handleRegister = async (values) => {
    if (registerPendingRef.current) return;
    registerPendingRef.current = true;
    setIsRegistering(true);
    const params = {
      name: values.name,
      username: values.username,
      password: values.password,
    };
    try {
      const res = await dispatch(register(params));
      if (!isMountedRef.current) return;
      if (res?.success) {
        message.success("注册成功，请使用新账号登录");
        setIsRegisterMode(false);
        form.setFieldsValue({ username: values.username, password: "" });
        registerForm.resetFields();
      } else {
        message.error(res?.payload?.message || res?.payload?.error || "注册失败");
      }
    } catch (error) {
      if (isMountedRef.current) message.error("注册失败，请检查网络或稍后重试");
    } finally {
      registerPendingRef.current = false;
      if (isMountedRef.current) setIsRegistering(false);
    }
  };

  return (
    <div style={{ width: "100%", height: "100%" }}>
      <img
        src="/assets/images/background/DMS_bg.png"
        style={{
          width: "100%",
          objectFit: "fill",
          objectPosition: "left top",
          height: "100%",
        }}
      />
      <div className={`auth-flip-container ${isRegisterMode ? "flip" : ""}`}>
        <div className="auth-flipper">
          <div className="auth-face front">
            <div className="auth-inner">
              <div className="auth-title">用户登录</div>
              <Form onFinish={handleSubmit} form={form}>
                <Form.Item
                  name="username"
                  style={{ marginBottom: 20 }}
                  rules={[{ required: true, message: "请输入账号" }]}
                >
                  <Input
                    className="auth-input"
                    placeholder="请输入账号"
                    onChange={handleUsernameChange}
                    prefix={
                      <img
                        src="/assets/images/background/DMS_username.png"
                        alt=""
                        style={{
                          width: 24,
                          height: 24,
                          marginRight: 14,
                          marginLeft: 8,
                        }}
                      />
                    }
                  />
                </Form.Item>
                <Form.Item
                  name="password"
                  rules={[{ required: true, message: "请输入密码" }]}
                >
                  <Input.Password
                    autoComplete=""
                    placeholder="请输入密码"
                    className="auth-input"
                    prefix={
                      <img
                        src="/assets/images/background/DMS_password.png"
                        alt=""
                        style={{
                          width: 24,
                          height: 24,
                          marginRight: 14,
                          marginLeft: 8,
                        }}
                      />
                    }
                  />
                </Form.Item>
                <Form.Item
                  name="rememberPassword"
                  valuePropName="checked"
                  style={{ marginBottom: 0, textAlign: "left" }}
                >
                  <Checkbox onChange={handleRememberChange}>记住密码</Checkbox>
                </Form.Item>
                <Button
                  htmlType="submit"
                  block
                  theme="solid"
                  loading={isRequesting}
                  className="auth-submit"
                  style={{ marginTop: 24 }}
                >
                  登录
                </Button>
                <div className="auth-link">
                  没有账号？{" "}
                  <a
                    onClick={() => {
                      setIsRegisterMode(true);
                      registerForm.resetFields();
                    }}
                  >
                    快捷注册
                  </a>
                </div>
              </Form>
            </div>
          </div>
          <div className="auth-face back">
            <div className="auth-inner">
              <div className="auth-title">账号注册</div>
              <Form onFinish={handleRegister} form={registerForm} disabled={isRegistering}>
                <Form.Item
                  name="name"
                  style={{ marginBottom: 20 }}
                  rules={[
                    { required: true, message: "请输入用户名" },
                    {
                      validator: (_, value) =>
                        !value || value.length <= 50
                          ? Promise.resolve()
                          : Promise.reject(new Error("用户名限五十个字符")),
                    },
                  ]}
                >
                  <Input
                    className="auth-input"
                    placeholder="请输入用户名"
                    prefix={
                      <img
                        src="/assets/images/background/username.png"
                        alt=""
                        style={{
                          width: 24,
                          height: 24,
                          marginRight: 14,
                          marginLeft: 8,
                        }}
                      />
                    }
                  />
                </Form.Item>
                <div className="auth-hint">示例：张三</div>
                <Form.Item
                  name="username"
                  style={{ marginBottom: 20 }}
                  rules={[
                    { required: true, message: "请输入账号" },
                    {
                      pattern: ASCII_NO_SPACE_MAX50,
                      message:
                        "账号限五十个英文、数字及特殊字符，不能包含空格和中文",
                    },
                  ]}
                >
                  <Input
                    className="auth-input"
                    placeholder="请输入账号"
                    prefix={
                      <img
                        src="/assets/images/background/DMS_username.png"
                        alt=""
                        style={{
                          width: 24,
                          height: 24,
                          marginRight: 14,
                          marginLeft: 8,
                        }}
                      />
                    }
                  />
                </Form.Item>
                <div className="auth-hint">示例：zhangsan</div>
                <Form.Item
                  name="password"
                  rules={[
                    { required: true, message: "请输入注册密码" },
                    {
                      pattern: ASCII_NO_SPACE_MAX50,
                      message:
                        "密码限五十个英文、数字及特殊字符，不能包含空格和中文",
                    },
                  ]}
                >
                  <Input.Password
                    autoComplete=""
                    placeholder="请输入注册密码"
                    className="auth-input"
                    prefix={
                      <img
                        src="/assets/images/background/DMS_password.png"
                        alt=""
                        style={{
                          width: 24,
                          height: 24,
                          marginRight: 14,
                          marginLeft: 8,
                        }}
                      />
                    }
                  />
                </Form.Item>
                <Button
                  htmlType="submit"
                  block
                  theme="solid"
                  className="auth-submit"
                  loading={isRegistering}
                >
                  {isRegistering ? "正在注册…" : "提交注册"}
                </Button>
                <div className="auth-link">
                  已有账号？{" "}
                  <a
                    onClick={() => {
                      if (!registerPendingRef.current) setIsRegisterMode(false);
                    }}
                  >
                    快捷登录
                  </a>
                </div>
              </Form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

function mapStateToProps(state) {
  const { auth, global } = state;
  return {
    user: auth.user,
    error: auth.error,
    actions: global.actions,
    apiRoot: global.apiRoot,
    isRequesting: auth.isRequesting,
  };
}

export default connect(mapStateToProps)(Login);
