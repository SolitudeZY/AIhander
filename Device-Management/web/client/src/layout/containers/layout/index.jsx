"use strict";

import React, { useState, useEffect, useRef } from "react";
import { connect } from "react-redux";
import { Layout, App } from "antd";
import Sider from "../../components/sider";
import Header from "../../components/header";
import Footer from "../../components/footer";
import { resize } from "../../actions/global";
import NoMatch from "../no-match";
import PerfectScrollbar from "perfect-scrollbar";
import { useLocation } from "react-router";
import { isAuthorized } from "$utils";
import "./index.less";
const { useApp } = App;

let scrollbar;
// const location111 = useLocation();
const LayoutContainer = (props) => {
  const {
    dispatch,
    msg,
    user,
    copyright,
    children,
    sections,
    clientWidth,
    clientHeight,
    location,
    match,
    routes,
    history,
    socket,
  } = props;
  const { notification } = useApp();
  const [collapsed, setCollapsed] = useState(false);
  const [isNoMath, setIsNoMath] = useState(false);
  const [innerRoutes, setInnerRoutes] = useState(children);
  const userInfo = JSON.parse(sessionStorage.getItem("user"));
  let isAdmin =
    userInfo?.roleNames?.includes("所有者") ||
    userInfo?.roleNames?.includes("管理员");

  const resize_ = () => {
    // 获取侧边栏的实际宽度
    const siderElement = document.querySelector(".ant-layout-sider");
    const siderWidth = siderElement
      ? siderElement.offsetWidth
      : leftShow
        ? 240
        : 0;

    dispatch(
      resize(
        document.getElementById("DmsApp").clientHeight,
        document.getElementById("DmsApp").clientWidth - siderWidth,
      ),
    );
  };
  useEffect(() => {
    const innerRoutes = children.filter((c) => {
      let path = c.props.path.split("/");
      if (c.key === "authentication".toUpperCase() && isAdmin) {
        return true;
      }
      if (c.key === "control") {
        return true;
      }
      if (path.length === 4) {
        if (path[1].toUpperCase() === "DEVICE") {
          if (path[2].toUpperCase() === "edgeDevice".toUpperCase()) {
            if (path[3] === "visionModels") {
              return isAuthorized("VISIONMODEL") && isAuthorized("VIEWVISIONMODEL");
            }
            if (path[3] === "events") {
              return isAuthorized("EVENTALARM") && isAuthorized("VIEWEVENT");
            }
            if (path[3] === "upgradeTasks") {
              return isAuthorized("UPGRADETASK") && isAuthorized("VIEWUPGRADETASK");
            }
            return isAuthorized("EDGEDEVICE") && isAuthorized("VIEWEDGEDEVICE");
          }
          if (
            path[2].toUpperCase() === "firmwareUpgrade".toUpperCase()
            // || path[2].toUpperCase() === "DeviceManagement".toUpperCase()    //此为固件升级路由path，不展示模块因此注释此条件
          ) {
            if (path[3] === "paramTemplates") {
              return (
                isAuthorized("PARAMETERTEMPLATE") &&
                isAuthorized("VIEWPARAMETERTEMPLATE")
              );
            }
            if (path[3] === "paramTemplateHistory") {
              return isAuthorized("PARAMETERTEMPLATEHISTORY");
            }
            if (path[3] === "appPackageManagement") {
              return (
                isAuthorized("APPINSTALLPACKAGE") &&
                isAuthorized("VIEWAPPINSTALLPACKAGE")
              );
            }
            return (
              (isAuthorized("FIRMWARELIB") &&
                isAuthorized("VIEWFIRMWARELIST")) ||
              (isAuthorized("DEVICELIST") && isAuthorized("VIEWDEVICELIST")) ||
              (isAuthorized("PRODUCTLIB") &&
                (isAuthorized("VIEWPRODUCTLIST") ||
                  isAuthorized("VIEWSENSORLIST"))) ||
              (isAuthorized("PARAMETERTEMPLATE") &&
                isAuthorized("VIEWPARAMETERTEMPLATE")) ||
              (isAuthorized("APPINSTALLPACKAGE") &&
                isAuthorized("VIEWAPPINSTALLPACKAGE"))
            );
          }
        }
        if (path[1].toUpperCase() === "SYSTEM") {
          if (path[2].toUpperCase() === "systemManagement".toUpperCase()) {
            return (
              (isAuthorized("ORGANIZATIONALMANAGEMENT") &&
                isAuthorized("VIEWORGANIZATIONDATA")) ||
              (isAuthorized("ROLEMANAGEMENT") &&
                isAuthorized("VIEWROLEDATA")) ||
              (isAuthorized("USERMANAGEMENT") &&
                isAuthorized("VIEWUSERDATA")) ||
              (isAuthorized("PROJECTMANAGEMENT") &&
                isAuthorized("VIEWPROJECTDATA")) ||
              (isAuthorized("SYSTEMLOG") && isAuthorized("VIEWSYSTEMLOG"))
            );
          }
        }
        return (
          isAuthorized(path[1].toUpperCase()) &&
          isAuthorized(path[2].toUpperCase())
        );
      } else {
        return isAuthorized(c.key.toUpperCase());
      }
    });

    setInnerRoutes(innerRoutes);
  }, [location, user, children]);
  function deepCopy(data) {
    //深拷贝
    //string,number,bool,null,undefined,symbol
    //object,array,date
    if (data && typeof data === "object") {
      //针对函数的拷贝
      if (typeof data === "function") {
        let tempFunc = data.bind(null);
        tempFunc.prototype = deepCopy(data.prototype);
        return tempFunc;
      }

      switch (Object.prototype.toString.call(data)) {
        case "[object String]":
          return data.toString();
        case "[object Number]":
          return Number(data.toString());
        case "[object Boolean]":
          return new Boolean(data.toString());
        case "[object Date]":
          return new Date(data.getTime());
        case "[object Array]":
          var arr = [];
          for (let i = 0; i < data.length; i++) {
            arr[i] = deepCopy(data[i]);
          }
          return arr;

        //js自带对象或用户自定义类实例
        case "[object Object]":
          var obj = {};
          for (let key in data) {
            //会遍历原型链上的属性方法，可以用hasOwnProperty来控制 （obj.hasOwnProperty(prop)
            obj[key] = deepCopy(data[key]);
          }
          return obj;
      }
    } else {
      //string,number,bool,null,undefined,symbol
      return data;
    }
  }
  const [allItems, setAllItems] = useState([]);
  const [headerItems, setHeaderItems] = useState([]);
  const [leftItems, setLeftItems] = useState([]);
  const [leftChange, setLeftChange] = useState(true);
  const [leftShow, setLeftShow] = useState(false);
  useEffect(() => {
    let topItems = []; //头部导航
    const lastSelectedKeys = localStorage.getItem("poms_selected_sider");
    let nextItems = []; //所有导航

    for (let c of sections) {
      if (typeof c.getNavItem == "function") {
        let item = c.getNavItem(user, dispatch);
        if (item) {
          nextItems.push.apply(nextItems, item);
          if (item.length > 0) {
            for (let j = 0; j < item.length; j++) {
              let itm = deepCopy(item[j]);
              if (itm.hasOwnProperty("items")) {
                for (let i = 0; i < itm.items.length; i++) {
                  itm.items[i].fatherKey = itm.itemKey;
                  delete itm.items[i].items;
                }
                topItems.push(itm);
              } else {
                topItems.push.apply(topItems, item);
              }
            }
          }
        }
      }
    }
    setAllItems(nextItems);
    setHeaderItems(topItems);

    if (lastSelectedKeys) {
      //如果有缓存
      for (let i = 0; i < nextItems.length; i++) {
        if (JSON.parse(lastSelectedKeys)[0] == nextItems[i].itemKey) {
          let openArr = [];
          for (let j = 0; j < nextItems[i].items.length; j++) {
            openArr.push(nextItems[i].items[j].itemKey);
          }
          localStorage.setItem("poms_open_sider", JSON.stringify(openArr));
          setLeftItems(nextItems[i].items);
        }
      }
      setLeftShow(true);
    } else {
      // 如果没有缓存，但有设备管理模块，自动显示设备管理
      const deviceModule = nextItems.find((item) => item.itemKey === "device");
      if (deviceModule && deviceModule.items && deviceModule.items.length > 0) {
        localStorage.setItem("poms_selected_sider", JSON.stringify(["device"]));
        let openArr = [];
        for (let j = 0; j < deviceModule.items.length; j++) {
          openArr.push(deviceModule.items[j].itemKey);
        }
        localStorage.setItem("poms_open_sider", JSON.stringify(openArr));
        setLeftItems(deviceModule.items);
        setLeftShow(true);
      } else {
        setLeftShow(false);
      }
    }

    window.addEventListener("resize", resize_);

    // 监听侧边栏折叠状态变化
    const handleSiderResize = () => {
      setTimeout(resize_, 200); // 延迟执行，等待动画完成
    };

    // 添加 MutationObserver 监听侧边栏宽度变化
    const siderElement = document.querySelector(".ant-layout-sider");
    if (siderElement) {
      const observer = new MutationObserver(handleSiderResize);
      observer.observe(siderElement, {
        attributes: true,
        attributeFilter: ["class", "style"],
      });

      return () => {
        window.removeEventListener("resize", resize_);
        observer.disconnect();
      };
    }

    return () => {
      window.removeEventListener("resize", resize_);
    };
  }, []);

  useEffect(() => {
    let pathnameArr = location.pathname.split("/");
    if (location.pathname == "/userCenter") {
      localStorage.setItem("poms_open_sider", JSON.stringify([]));
      localStorage.removeItem("poms_selected_sider");
      setLeftShow(false);
    }
    let openArr = [];
    for (let i = 0; i < allItems.length; i++) {
      if (allItems[i].items) {
        for (let j = 0; j < allItems[i].items.length; j++) {
          if (allItems[i].items[j].items) {
            for (let k = 0; k < allItems[i].items[j].items.length; k++) {
              if (allItems[i].items[j].items[k].to == location.pathname) {
                for (let o = 0; o < allItems[i].items.length; o++) {
                  openArr.push(allItems[i].items[o].itemKey);
                }
                localStorage.setItem(
                  "poms_selected_sider",
                  JSON.stringify([pathnameArr[1]]),
                );
                localStorage.setItem(
                  "poms_open_sider",
                  JSON.stringify(openArr),
                );
                setLeftItems(allItems[i].items);
                setLeftShow(true);
              }
            }
          }
        }
      }
    }
  }, [location]);

  useEffect(() => {
    if (!user || !user.authorized) {
      if (!location.pathname.includes("projectGroup")) {
        history.push("/signin");
      }
    }
    if (msg) {
      if (msg.done) {
        notification.success({
          // title: msg.done,
          message: msg.done,
          duration: 2,
        });
      }
      if (msg.error) {
        notification.error({
          // title: msg.error,
          message: msg.error,
          duration: 2,
        });
      }
    }

    setTimeout(() => {
      const dom = document.getElementById("page-content");
      if (dom) {
        if (!scrollbar) {
          scrollbar = new PerfectScrollbar("#page-content", {
            suppressScrollX: true,
          });
          // scrollbar.update();
        } else {
          scrollbar.update();
          dom.scrollTop = 0;
        }
      }
    }, 300);
  });

  // websocket 使用测试
  useEffect(() => {
    //   console.log(socket)
    if (socket) {
      socket.on("CAMERA_ONLINE", function (msg) {
        console.info(msg);
        if (msg.online == "ON") {
          notification.success({
            message: "Hi",
            description: (
              <div>
                <div>{msg.name}</div>
                <div style={{ marginTop: 5 }}>已上线。</div>
              </div>
            ),
            duration: 2,
          });
        }
        if (msg.online == "OFF") {
          notification.error({
            message: "Hi",
            description: (
              <div>
                <div>{msg.name}</div>
                <div style={{ marginTop: 5 }}>发生离线。</div>
              </div>
            ),
            duration: 2,
          });
        }
      });
      return () => {
        socket.off("CAMERA_ONLINE");
      };
    }
  }, [socket]);

  // 处理路由匹配和404状态
  useEffect(() => {
    let isNoMath = !innerRoutes?.some(
      (cr) => cr.props?.path == location?.pathname,
    );
    setIsNoMath(isNoMath);
  }, [innerRoutes, location]);

  return (
    <Layout id="layout" className="layout-container" style={{ height: "100%" }}>
      {
        <>
          <Layout.Header
            style={{
              background: "#FFFFFF",
              height: 50,
              padding: 0,
              zIndex: 99,
            }}
          >
            <Header
              headerItems={headerItems}
              user={user}
              pathname={location.pathname}
              toggleCollapsed={() => {
                setCollapsed(!collapsed);
              }}
              collapsed={collapsed}
              history={history}
              tochange={(val) => {
                setLeftChange(!leftChange);
                if (val.fatherKey) {
                  for (let i = 0; i < allItems.length; i++) {
                    if (val.fatherKey == allItems[i].itemKey) {
                      let openArr = [];
                      for (let j = 0; j < allItems[i].items.length; j++) {
                        openArr.push(allItems[i].items[j].itemKey);
                      }
                      localStorage.setItem(
                        "poms_selected_sider",
                        JSON.stringify([val.fatherKey]),
                      );
                      localStorage.setItem(
                        "poms_open_sider",
                        JSON.stringify(openArr),
                      );
                      setLeftItems(allItems[i].items);
                    }
                  }
                  setLeftShow(true);
                } else {
                  localStorage.setItem("poms_open_sider", JSON.stringify([]));
                  localStorage.removeItem("poms_selected_sider");
                  setLeftShow(false);
                }
                history.push(val.to);
              }}
            />
          </Layout.Header>
          <Layout style={{ height: "calc(100% - 50px)" }}>
            {leftShow ? (
              <Sider
                sections={sections}
                leftItems={leftItems}
                dispatch={dispatch}
                user={user}
                leftChange={leftChange}
                pathname={location.pathname}
                collapsed={collapsed}
              />
            ) : (
              ""
            )}
            <Layout.Content
              style={{
                marginLeft: leftShow ? 0 : 0,
                transition: "margin-left 0.2s",
              }}
            >
              <div
                className="page-content-wrapper"
                style={{
                  background: "#f0f2f5",
                  minHeight: "100vh",
                  overflow: "auto",
                }}
              >
                <div
                  id="page-content"
                  style={{
                    height: "100%",
                    minWidth: 520,
                    position: "relative",
                  }}
                >
                  <div
                    className="content-main"
                    style={{
                      minHeight: "calc(100vh - 114px)",
                      position: "relative",
                      padding: "8px",
                      background: "transparent",
                    }}
                  >
                    {/* 判断是否为管理员或者超管，不是就去掉这个权限 */}
                    {/* {isAdmin?children:children.filter(i=>i.key!=='authentication')} */}
                    {innerRoutes}
                    {isNoMath ? <NoMatch /> : ""}
                  </div>
                  <Layout.Footer>
                    <Footer />
                  </Layout.Footer>
                </div>
              </div>
            </Layout.Content>
          </Layout>
        </>
      }
    </Layout>
  );
};

function mapStateToProps(state) {
  const { global, auth, ajaxResponse, webSocket } = state;
  return {
    title: global.title,
    copyright: global.copyright,
    sections: global.sections,
    actions: global.actions,
    clientWidth: global.clientWidth,
    clientHeight: global.clientHeight,
    msg: ajaxResponse.msg,
    user: auth.user,
    socket: webSocket.socket,
  };
}

export default connect(mapStateToProps)(LayoutContainer);
