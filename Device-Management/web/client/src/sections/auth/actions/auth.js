"use strict";

import { ApiTable } from "$utils";
import { Request } from "@peace/utils";
import { message } from "antd";

export const INIT_AUTH = "INIT_AUTH";
export function initAuth() {
  const user = JSON.parse(sessionStorage.getItem("user")) || {};
  return {
    type: INIT_AUTH,
    payload: {
      user: user,
    },
  };
}

export const REQUEST_LOGIN = "REQUEST_LOGIN";
export const LOGIN_SUCCESS = "LOGIN_SUCCESS";
export const LOGIN_ERROR = "LOGIN_ERROR";
export function login(username, password) {
  return (dispatch) => {
    dispatch({ type: REQUEST_LOGIN });

    return Request.post(ApiTable.login, {
      username,
      password,
    }).then(
      (user) => {
        sessionStorage.setItem("user", JSON.stringify(user));
        dispatch({
          type: LOGIN_SUCCESS,
          payload: { user: user },
        });

        // 记录登录系统日志（成功）
        try {
          Request.post(ApiTable.createSystemLog, {
            content: `用户登录：${user?.userInfo?.username || username || '-'}`,
            module: "登录管理",
            url: window.location?.pathname || "/login",
            userId: user?.userInfo?.id,
          });
        } catch (e) {
          // 忽略日志上报错误
        }
        return user;
      },
      (error) => {
        const body = error?.response?.body;
        sessionStorage.removeItem("user");
        dispatch({
          type: LOGIN_ERROR,
          payload: {
            error: body?.message || error?.message || "登录失败",
          },
        });
        return Promise.reject(error);
      }
    );
  };
}

export const LOGOUT = "LOGOUT";
export function logout(user) {
  user && user.token
    ? Request.post(ApiTable.logout, {
        token: user.token,
      })
    : null;

  // 记录退出系统日志
  try {
    Request.post(ApiTable.createSystemLog, {
      content: `用户退出`,
      module: "登录管理",
      url: window.location?.pathname || "/logout",
      userId: user?.userInfo?.id,
    });
  } catch (e) {
    // 忽略日志上报错误
  }
  sessionStorage.removeItem("user");
  return {
    type: LOGOUT,
  };
}

export function register(params) {
  return (dispatch) => {
    // Layout probes actions with action()() before the Redux store exists.
    // Return metadata synchronously and never send a registration at startup.
    if (typeof dispatch !== "function") return { actionType: "REGISTER_USER" };
    return (async () => {
      dispatch({ type: "REGISTER_USER_REQUESTING" });
      try {
        const data = await Request.post(ApiTable.register, params, undefined, null, null, "user", 30000);
        return dispatch({ type: "REGISTER_USER_REQUEST_SUCCESS", success: true, payload: { data } });
      } catch (error) {
        const message = error?.response?.body?.message ||
          (error?.timeout
            ? "注册请求超时，请先尝试登录确认是否已注册成功"
            : "注册失败，请检查网络或稍后重试");
        return dispatch({ type: "REGISTER_USER_REQUEST_ERROR", success: false, payload: { message } });
      }
    })();
  };
}

export default {
  initAuth,
  login,
  logout,
  register,
};
