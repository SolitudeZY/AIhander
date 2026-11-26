import React from "react";
import { connect } from "react-redux";
import { push } from "react-router-redux";
import { Tabs, Button } from "antd";
import DeviceOverview from "../components/deviceDetail/overview";
import IssuedHistory from "../components/deviceDetail/history";
import DiagnosisData from "../components/deviceDetail/diagnosis";
import { LeftOutlined } from "@ant-design/icons";
import { isAuthorized } from "$utils";

function DeviceDetail({ dispatch }) {
  const tabItems = [];
  const contentStyle = {
    overflowY: "auto",
    maxHeight: "calc(100vh - 180px)",
  };
  if (isAuthorized("DEVICELISTVIEWDETAILS")) {
    tabItems.push({
      key: "1",
      label: "设备概述",
      children: <div style={contentStyle}><DeviceOverview /></div>,
    });
  }
  if (isAuthorized("HISTORYOFISSUANCE")) {
    tabItems.push({
      key: "2",
      label: "下发历史",
      children: <div style={contentStyle}><IssuedHistory /></div>,
    });
  }
  if (isAuthorized("DIAGNOSTICDATA")) {
    tabItems.push({
      key: "3",
      label: "诊断数据",
      children: <div style={contentStyle}><DiagnosisData /></div>,
    });
  }
  return (
    <div style={{ background: "white", padding: "10px 20px 0" }}>
      <Tabs
        tabBarExtraContent={
          <Button
            icon={<LeftOutlined />}
            onClick={() => dispatch(push("/device/firmwareUpgrade/deviceList"))}
          >
            返回
          </Button>
        }
        items={tabItems}
      />
    </div>
  );
}

function mapStateToProps(state) {
  const { auth, global } = state;
  return {
    user: auth.user,
    actions: global.actions,
  };
}
export default connect(mapStateToProps)(DeviceDetail);
