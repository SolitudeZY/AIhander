import React, { useEffect, useState, useRef, useMemo } from "react";
import { Tabs, Spin } from "antd";
import AnxinCloud from "../components/anxinCloud";
import { isAuthorized } from "$utils";
import { connect } from "react-redux";

const DeviceManagement = (props) => {
  const { actions, dispatch, pepProjectId, loading } = props;
  const { firmwareUpgrade } = actions;
  const [itemKey, setItemKey] = useState(1);
  const [strucAndDeviceType, setStrucAndDeviceType] = useState([]); //
  const [struc, setStruc] = useState([]); //
  const [vData, setVData] = useState([]); //
  const [thingIds, setThingIds] = useState([]); //结构物id数组
  useEffect(() => {
    dispatch(
      firmwareUpgrade.getFirmware({
        tokenup: "REPLACE_WITH_FIRMWARE_OPERATION_TOKEN",
      })
    ).then((res) => {
      if (res.success) setVData(res.payload.data.data);
    });
  }, []);
  useEffect(() => {
    if (itemKey === "1") {
      getData("axy", pepProjectId);
    }
  }, [pepProjectId, itemKey]);

  useEffect(() => {
    if (itemKey === "2") {
      getData("zwy");
    }
  }, [itemKey]);

  const getData = (type = "axy", pepProjectId) => {
    if (type === "axy") {
      dispatch(firmwareUpgrade.getStruc({ pepProjectId })).then((res) => {
        if (res.success) {
          setStrucAndDeviceType(res.payload.data);
          setStruc(
            res.payload.data?.map((item) => {
              return { label: item.strucName, value: item.thingId };
            })
          );
          setThingIds(
            res.payload.data?.map((item) => item.thingId)?.join(",") || ""
          );
        }
      });
    } else {
      dispatch(firmwareUpgrade.getZwyStruc()).then((res) => {
        if (res.success) {
          setStrucAndDeviceType(res.payload.data);
          setStruc(
            res.payload.data?.map((item) => {
              return { label: item.strucName, value: item.thingId };
            })
          );
          setThingIds(
            res.payload.data?.map((item) => item.thingId)?.join(",") || ""
          );
        }
      });
    }
  };
  const tabItems = [];

  // if (isAuthorized("AXYFIRMWAREUPGRADE")) {
  tabItems.push(
    {
      key: "1",
      label: "安心云",
      children: (
        <Spin spinning={loading}>
          <AnxinCloud
            strucAndDeviceType={strucAndDeviceType}
            struc={struc}
            thingIds={thingIds}
            vData={vData}
            platform="安心云"
          />
        </Spin>
      ),
    },
    {
      key: "2",
      label: "知物云",
      children: (
        <Spin spinning={loading}>
          <AnxinCloud
            strucAndDeviceType={strucAndDeviceType}
            struc={struc}
            thingIds={thingIds}
            vData={vData}
            platform="知物云"
          />
        </Spin>
      ),
    }
  );
  // }

  return (
    <Tabs
      defaultActiveKey="1"
      activeKey={itemKey}
      onChange={(v) => setItemKey(v)}
      items={tabItems}
    />
  );
};
function mapStateToProps(state) {
  const {
    auth,
    global,
    getPush,
    structAndDeviceType,
    firmware,
    zwyStructAndDeviceType,
  } = state;
  return {
    loading:
      structAndDeviceType.isRequesting ||
      zwyStructAndDeviceType.isRequesting ||
      firmware.isRequesting,
    user: auth.user,
    actions: global.actions,
    pepProjectId: global.pepProjectId,
  };
}
export default connect(mapStateToProps)(DeviceManagement);
