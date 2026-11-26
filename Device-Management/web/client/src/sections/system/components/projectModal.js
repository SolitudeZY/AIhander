import React, { useRef, useEffect, useState } from "react";
import { Button, App } from "antd";
import {
  ModalForm,
  ProFormDigit,
  ProFormText,
  ProFormTextArea,
  ProFormSelect,
  ProFormList,
} from "@ant-design/pro-form";
import { getAllProductLibrary } from "../actions/project";

export default (props) => {
  const {
    title,
    triggerRender,
    editData = null,
    onFinish,
    dispatch,
    productLibraryAll: productLibraryAllProp = [],
    simpleDevicesOnly = false,
    nameRequired = true,
    deviceIdsOnly = false,
  } = props;
  const formRef = useRef();
  const mapRef = useRef(null);
  const autoRef = useRef(null);
  const placeSearchRef = useRef(null);
  const geocoderRef = useRef(null);
  const markerRef = useRef(null);
  const nameTipShownRef = useRef(false);
  const latestDeviceSearchRef = useRef({});
  const deviceIdsDeselectRef = useRef({});
  const [showMap, setShowMap] = useState(false);
  const { message } = App.useApp();
  const [productLibraryAll, setProductLibraryAll] = useState(
    productLibraryAllProp
  );
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    if (
      modalVisible &&
      (!Array.isArray(productLibraryAll) || productLibraryAll.length === 0)
    ) {
      dispatch(getAllProductLibrary()).then((res) => {
        if (res?.success) setProductLibraryAll(res?.payload?.data || []);
      });
    }
  }, [modalVisible, dispatch]);

  useEffect(() => {
    if (modalVisible && editData) {
      const vals = buildInitialValues();
      try {
        formRef.current?.setFieldsValue(vals);
      } catch (_) {}
    }
  }, [productLibraryAll, modalVisible, editData]);

  // 兼容老数据结构并转为分组结构（型号取id，设备ID保持不变）
  const normalizeDevices = () => {
    let devices = [];
    const toModelId = (val) => {
      if (val == null) return undefined;
      // 直接匹配id或字符串id
      const byId = productLibraryAll.find(
        (p) => p.id === val || `${p.id}` === `${val}`
      );
      if (byId) return byId.id;
      // 兼容旧数据按型号名匹配
      const byName = productLibraryAll.find((p) => p.model === val);
      return byName ? byName.id : undefined;
    };

    if (Array.isArray(editData?.devices)) {
      devices = editData.devices.map((d) => ({
        model: toModelId(d?.model),
        deviceIds: Array.isArray(d?.deviceIds)
          ? d.deviceIds
          : (d?.deviceIds || "")
              .split(",")
              .map((s) => s.trim())
              .filter((s) => s),
      }));
    } else if (Array.isArray(editData?.focusDevices)) {
      devices = editData.focusDevices.map((d) => ({
        model: toModelId(d?.model),
        deviceIds: Array.isArray(d?.deviceIds)
          ? d.deviceIds
          : (d?.deviceIds || "")
              .split(",")
              .map((s) => s.trim())
              .filter((s) => s),
      }));
    } else if (editData?.focusDeviceCodes) {
      const raw = editData.focusDeviceCodes;
      try {
        const arr = typeof raw === "string" ? JSON.parse(raw) : raw;
        if (Array.isArray(arr) && arr.length > 0) {
          if (arr.every((it) => typeof it === "string")) {
            devices = [
              {
                model: undefined,
                deviceIds: arr
                  .filter((s) => s)
                  .map((s) => `${s}`.trim())
                  .filter((s) => s),
              },
            ];
          } else {
            devices = arr.map((d) => ({
              model: toModelId(d?.model),
              deviceIds: Array.isArray(d?.deviceIds)
                ? d.deviceIds.filter((s) => s)
                : (d?.deviceIds || "")
                    .split(",")
                    .map((s) => s.trim())
                    .filter((s) => s),
            }));
          }
        } else {
          devices = [{ model: undefined, deviceIds: [] }];
        }
      } catch (_) {
        devices = [
          {
            model: undefined,
            deviceIds: (typeof raw === "string"
              ? raw.split(",").map((s) => s.trim())
              : Array.isArray(raw)
              ? raw
              : []
            ).filter((s) => s),
          },
        ];
      }
    }
    if (!devices || devices.length === 0) {
      devices = [{ model: undefined, deviceIds: [] }];
    }
    return devices;
  };

  const buildInitialValues = () => {
    if (editData) {
      return simpleDevicesOnly
        ? {
            devices: normalizeDevices(),
          }
        : {
            name: editData?.name,
            description: editData?.description || "",
            longitude: editData?.longitude || "",
            latitude: editData?.latitude || "",
            locationName: editData?.locationName || "",
            devices: normalizeDevices(),
          };
    }
    return { devices: [{ model: undefined, deviceIds: [] }] };
  };
  const initialValues = buildInitialValues();

  const getDeviceFieldPath = (index) => ["devices", index, "deviceIds"];

  const getDeviceIdsValue = (index) => {
    const fieldValue = formRef.current?.getFieldValue(getDeviceFieldPath(index));
    return Array.isArray(fieldValue)
      ? fieldValue.map((s) => `${s}`.trim()).filter((s) => s)
      : [];
  };

  const updateMarker = (lng, lat, center = true) => {
    const AMap = window.AMap;
    const map = mapRef.current;
    if (!AMap || !map) return;
    if (lng == null || lat == null) return;
    const position = [lng, lat];
    if (markerRef.current) {
      try {
        markerRef.current.setPosition(position);
        markerRef.current.setMap(map);
      } catch (_) {}
    } else {
      try {
        markerRef.current = new AMap.Marker({ position });
        markerRef.current.setMap(map);
      } catch (_) {}
    }
    if (center) {
      try {
        map.setCenter(position);
        if (typeof map.getZoom === "function" && map.getZoom() < 15) {
          map.setZoom(15);
        }
      } catch (_) {}
    }
  };

  // 初始化/显示地图并绑定交互；关闭或隐藏时彻底销毁
  useEffect(() => {
    const AMap = window.AMap;

    // 当不显示地图时，销毁现有实例
    if (!showMap) {
      try {
        if (autoRef.current && autoRef.current.off) {
          autoRef.current.off("select");
        }
        if (mapRef.current && mapRef.current.off) {
          mapRef.current.off("click");
        }
      } catch (_) {}
      try {
        if (mapRef.current && typeof mapRef.current.destroy === "function") {
          mapRef.current.destroy();
        }
      } catch (_) {}
      try {
        if (markerRef.current && markerRef.current.setMap) {
          markerRef.current.setMap(null);
        }
      } catch (_) {}
      autoRef.current = null;
      placeSearchRef.current = null;
      geocoderRef.current = null;
      mapRef.current = null;
      markerRef.current = null;
      return;
    }

    if (!AMap) {
      message.error("地图服务未加载，请检查 AMap 脚本");
      return;
    }

    // 容器可能在首次打开时尚未渲染尺寸，延迟初始化确保可见区域已计算
    const init = () => {
      const container = document.getElementById("container");
      if (
        !container ||
        container.offsetWidth === 0 ||
        container.offsetHeight === 0
      ) {
        setTimeout(init, 50);
        return;
      }

      const map = new AMap.Map("container", {
        resizeEnable: true,
        zoom: 11,
        center: [116.397428, 39.90923],
      });
      mapRef.current = map;

      try {
        map.setStatus && map.setStatus({ showLogo: false });
      } catch (_) {}

      const autoOptions = { input: "tipinput" };

      AMap.plugin(
        ["AMap.PlaceSearch", "AMap.AutoComplete", "AMap.Geocoder"],
        () => {
          const auto = new AMap.AutoComplete(autoOptions);
          const placeSearch = new AMap.PlaceSearch({ map });
          const geocoder = new AMap.Geocoder();
          autoRef.current = auto;
          placeSearchRef.current = placeSearch;
          geocoderRef.current = geocoder;

          try {
            const lngInit = formRef.current?.getFieldValue("longitude");
            const latInit = formRef.current?.getFieldValue("latitude");
            const lngNum = Number(lngInit);
            const latNum = Number(latInit);
            if (
              `${lngInit}` !== "" &&
              `${latInit}` !== "" &&
              !Number.isNaN(lngNum) &&
              !Number.isNaN(latNum)
            ) {
              updateMarker(lngNum, latNum, true);
            }
          } catch (_) {}

          const select = (e) => {
            if (e) {
              placeSearch.setCity(e.poi.adcode);
              placeSearch.search(e.poi.name, function (status, result) {
                const lng = result?.poiList?.pois?.[0]?.location?.lng;
                const lat = result?.poiList?.pois?.[0]?.location?.lat;
                if (lng != null && lat != null) {
                  // 先回填经纬度与名称
                  formRef.current?.setFieldsValue({
                    longitude: lng,
                    latitude: lat,
                    locationName: e?.poi?.name || "",
                  });
                  updateMarker(lng, lat, true);
                  // 使用逆地理编码获取更完整的地址
                  if (geocoderRef.current) {
                    try {
                      geocoderRef.current.getAddress(
                        [lng, lat],
                        function (status2, result2) {
                          const addr = result2?.regeocode?.formattedAddress;
                          if (addr) {
                            formRef.current?.setFieldsValue({
                              locationName: addr,
                            });
                          }
                        }
                      );
                    } catch (_) {}
                  }
                }
              });
            }
          };
          auto.on("select", select);

          map.on("click", function (e) {
            // 回填经纬度
            formRef.current?.setFieldsValue({
              longitude: e.lnglat.lng,
              latitude: e.lnglat.lat,
            });
            updateMarker(e.lnglat.lng, e.lnglat.lat, false);
            // 逆地理编码回填详细地址
            if (geocoderRef.current) {
              try {
                geocoderRef.current.getAddress(
                  [e.lnglat.lng, e.lnglat.lat],
                  function (status, result) {
                    const addr = result?.regeocode?.formattedAddress;
                    if (addr) {
                      formRef.current?.setFieldsValue({ locationName: addr });
                    }
                  }
                );
              } catch (_) {}
            }
          });

          // 容器可见后触发一次 resize，避免出现空白
          try {
            map.resize && map.resize();
          } catch (_) {}
        }
      );
    };

    // 异步初始化以确保容器已渲染
    setTimeout(init, 0);

    // 清理函数：组件卸载或 showMap 变化时
    return () => {
      try {
        if (autoRef.current && autoRef.current.off)
          autoRef.current.off("select");
        if (mapRef.current && mapRef.current.off) mapRef.current.off("click");
      } catch (_) {}
      try {
        if (mapRef.current && typeof mapRef.current.destroy === "function") {
          mapRef.current.destroy();
        }
      } catch (_) {}
      autoRef.current = null;
      placeSearchRef.current = null;
      geocoderRef.current = null;
      mapRef.current = null;
    };
  }, [showMap]);

  return (
    <ModalForm
      title={title || ""}
      formRef={formRef}
      initialValues={!editData ? initialValues : undefined}
      request={editData ? async () => buildInitialValues() : undefined}
      trigger={
        triggerRender ? (
          triggerRender
        ) : (
          <Button type="primary" ghost>
            {title || ""}
          </Button>
        )
      }
      layout="horizontal"
      grid
      labelCol={{ flex: "100px" }}
      wrapperCol={{ span: 24 }}
      modalProps={{ destroyOnHidden: true, width: 720 }}
      onOpenChange={(visible) => {
        setModalVisible(visible);
        if (!visible) {
          setShowMap(false);
          latestDeviceSearchRef.current = {};
          deviceIdsDeselectRef.current = {};
        }
      }}
      onValuesChange={(changed, all) => {
        if (!showMap) return;
        const lng = all?.longitude;
        const lat = all?.latitude;
        const lngNum = Number(lng);
        const latNum = Number(lat);
        if (
          `${lng}` !== "" &&
          `${lat}` !== "" &&
          !Number.isNaN(lngNum) &&
          !Number.isNaN(latNum)
        ) {
          updateMarker(lngNum, latNum, true);
        }
      }}
      onFinish={async (values) => {
        const list = Array.isArray(values?.devices) ? values.devices : [];
        const seenIds = new Set();
        for (let i = 0; i < list.length; i++) {
          const m = list[i]?.model;
          const ids = Array.isArray(list[i]?.deviceIds)
            ? list[i].deviceIds.map((s) => `${s}`.trim()).filter((s) => s)
            : [];
          if (!deviceIdsOnly && !m && ids.length > 0) {
            message.warning("请选择设备型号再填写设备ID");
            return false;
          }
          if (!deviceIdsOnly && m && ids.length === 0) {
            message.warning("设备ID不能为空");
            return false;
          }
          const uniq = Array.from(new Set(ids));
          if (uniq.length !== ids.length) {
            message.warning("设备ID存在重复");
            return false;
          }
          for (let j = 0; j < uniq.length; j++) {
            const id = uniq[j];
            // 外部用户绑定以“设备型号 + 后八位”定位；普通项目仍保持原有的全局设备ID去重规则。
            const identity =
              simpleDevicesOnly && !deviceIdsOnly ? `${m}::${id}` : id;
            if (seenIds.has(identity)) {
              message.warning("不同组之间的设备ID不能重复");
              return false;
            }
            seenIds.add(identity);
          }
        }
        if (!deviceIdsOnly) {
          const models = list
            .map((d) => ({
              model: d?.model,
              deviceIds: Array.isArray(d?.deviceIds)
                ? d.deviceIds.map((s) => `${s}`.trim()).filter((s) => s)
                : [],
            }))
            .filter((d) => d.deviceIds.length > 0)
            .map((d) => d.model)
            .filter((v) => v !== undefined && v !== null && `${v}` !== "");
          const modelsSet = new Set(models);
          if (modelsSet.size !== models.length) {
            message.warning("设备型号重复");
            return false;
          }
        }

        const devices = list
          .map((d) => {
            const deviceIds = Array.isArray(d?.deviceIds)
              ? d.deviceIds.filter((s) => s)
              : [];
            if (deviceIdsOnly) {
              return { deviceIds };
            }
            const prod = productLibraryAll.find(
              (p) => p.id === d?.model || `${p.id}` === `${d?.model}`
            );
            const modelName = prod?.model;
            return {
              model: simpleDevicesOnly ? modelName : d?.model,
              productCode: prod?.productCode,
              deviceIds,
            };
          })
          .filter((d) => d.deviceIds.length > 0);

        const payload = simpleDevicesOnly
          ? { devices }
          : {
              ...values,
              devices,
            };
        if (onFinish) {
          try {
            const ret = await onFinish(payload, editData);
            return ret === undefined ? true : !!ret;
          } catch (_) {
            return false;
          }
        }
        return true;
      }}
    >
      {!simpleDevicesOnly && (
        <ProFormText
          name="name"
          label="项目名称"
          rules={[{ required: !!nameRequired, message: "项目名称不能为空" }]}
          placeholder="请输入项目名称"
          colProps={{ span: 24 }}
          fieldProps={{
            style: { width: "100%" },
            maxLength: 50,
            showCount: true,
            onChange: (e) => {
              const v = e?.target?.value ?? "";
              const len = `${v}`.length;
              if (len === 50 && !nameTipShownRef.current) {
                message.warning("已达50字符上限");
                nameTipShownRef.current = true;
              } else if (len < 50 && nameTipShownRef.current) {
                nameTipShownRef.current = false;
              }
            },
          }}
        />
      )}

      {!simpleDevicesOnly && (
        <ProFormTextArea
          name="description"
          label="项目描述"
          placeholder="请输入项目描述"
          colProps={{ span: 24 }}
          fieldProps={{
            style: { width: "100%" },
            autoSize: { minRows: 3, maxRows: 6 },
          }}
        />
      )}

      {!simpleDevicesOnly && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 7,
          }}
        >
          <div style={{ flex: "0 0 48%" }}>
            <ProFormDigit
              name="longitude"
              label="经度"
              placeholder="请输入经度"
              fieldProps={{ style: { width: "100%" } }}
              rules={[
                {
                  validator: (_, value) => {
                    if (
                      value === undefined ||
                      value === null ||
                      `${value}` === ""
                    ) {
                      return Promise.resolve();
                    }
                    if (typeof value !== "number" || Number.isNaN(value)) {
                      return Promise.reject(new Error("经度必须是数字"));
                    }
                    if (value < -180 || value > 180) {
                      return Promise.reject(
                        new Error("经度范围应在 -180 到 180")
                      );
                    }
                    return Promise.resolve();
                  },
                },
              ]}
            />
          </div>
          <div style={{ flex: "0 0 48%" }}>
            <ProFormDigit
              name="latitude"
              label="纬度"
              placeholder="请输入纬度"
              fieldProps={{ style: { width: "100%" } }}
              rules={[
                {
                  validator: (_, value) => {
                    if (
                      value === undefined ||
                      value === null ||
                      `${value}` === ""
                    ) {
                      return Promise.resolve();
                    }
                    if (typeof value !== "number" || Number.isNaN(value)) {
                      return Promise.reject(new Error("纬度必须是数字"));
                    }
                    if (value < -90 || value > 90) {
                      return Promise.reject(
                        new Error("纬度范围应在 -90 到 90")
                      );
                    }
                    return Promise.resolve();
                  },
                },
              ]}
            />
          </div>
          <img
            src="/assets/images/show_map.svg"
            style={{ width: 28, cursor: "pointer", marginBottom: 24 }}
            onClick={() => setShowMap(!showMap)}
          />
        </div>
      )}

      {!simpleDevicesOnly && (
        <ProFormText
          name="locationName"
          label="所在地址"
          colProps={{ span: 24 }}
          fieldProps={{ id: "tipinput", style: { width: "100%" } }}
        />
      )}

      {/* 地图容器 */}
      {!simpleDevicesOnly && showMap && (
        <div style={{ width: "81%", margin: "0 auto" }}>
          地图：
          <style>{`
            #container .amap-logo { display: none !important; }
            #container .amap-copyright { display: none !important; }
          `}</style>
          <div
            id="container"
            style={{
              width: "100%",
              height: 425,
              marginBottom: 15,
              marginTop: 20,
            }}
          />
        </div>
      )}

      <ProFormList
        name="devices"
        label="设备列表"
        creatorButtonProps={{ creatorButtonText: "新增设备" }}
        copyIconProps={false}
        alwaysShowItemLabel
        min={1}
      >
        {(f, index) => [
          !deviceIdsOnly && (
            <ProFormSelect
              key={`model-${index}`}
              name="model"
              label="设备型号"
              placeholder="请选择设备型号"
              options={productLibraryAll.map((d) => ({
                label: d.model,
                value: d.id,
              }))}
              fieldProps={{
                style: { width: "100%" },
                onChange: (val) => {
                  const cacheKey = `${index}`;
                  if (val == null || val === undefined || `${val}` === "") {
                    formRef.current?.setFieldValue(
                      ["devices", index, "deviceIds"],
                      []
                    );
                    deviceIdsDeselectRef.current[cacheKey] = false;
                  }
                },
              }}
            />
          ),
          <ProFormSelect
            key={`ids-${index}`}
            name="deviceIds"
            label="设备ID"
            placeholder="输入设备ID后回车添加"
            extra="提示：输入一个ID后，点击回车或点击空白处即可继续输入下一个，ID不要前四位的设备编码"
            mode="tags"
            fieldProps={{
              open: false,
              tokenSeparators: [",", " ", ";"],
              onSearch: (value) => {
                latestDeviceSearchRef.current[index] = `${value || ""}`.trim();
              },
              onDeselect: () => {
                deviceIdsDeselectRef.current[index] = true;
              },
              onClear: () => {
                deviceIdsDeselectRef.current[index] = true;
                latestDeviceSearchRef.current[index] = "";
              },
              onInputKeyDown: (e) => {
                const fieldPath = getDeviceFieldPath(index);
                const m = formRef.current?.getFieldValue([
                  "devices",
                  index,
                  "model",
                ]);
                const currentFieldIds = getDeviceIdsValue(index);
                const inputValue = `${e?.target?.value || ""}`.trim();

                if ((e?.key === "Backspace" || e?.key === "Delete") && !inputValue) {
                  deviceIdsDeselectRef.current[index] = true;
                  return;
                }

                if (e?.key !== "Enter") return;
                e.preventDefault();
                const nextId =
                  inputValue || `${latestDeviceSearchRef.current[index] || ""}`.trim();
                if (!nextId) return;
                if (!deviceIdsOnly && !m) {
                  message.warning("请选择设备型号再填写设备ID");
                  latestDeviceSearchRef.current[index] = "";
                  return;
                }
                if (currentFieldIds.includes(nextId)) {
                  message.warning("该设备ID已添加");
                  formRef.current?.setFieldValue(fieldPath, currentFieldIds);
                  latestDeviceSearchRef.current[index] = "";
                  return;
                }
                formRef.current?.setFieldValue(fieldPath, [...currentFieldIds, nextId]);
                latestDeviceSearchRef.current[index] = "";
              },
              onChange: (val) => {
                const fieldPath = getDeviceFieldPath(index);
                const raw = Array.isArray(val) ? val : [];
                const cleaned = raw.map((s) => `${s}`.trim()).filter((s) => s);
                const uniq = Array.from(new Set(cleaned));

                if (deviceIdsDeselectRef.current[index]) {
                  deviceIdsDeselectRef.current[index] = false;
                  latestDeviceSearchRef.current[index] = "";
                  formRef.current?.setFieldValue(fieldPath, uniq);
                  return;
                }

                if (uniq.length !== cleaned.length) {
                  message.warning("该设备ID已添加");
                }
              },
              style: { width: "100%" },
            }}
          />,
        ]}
      </ProFormList>
    </ModalForm>
  );
};
