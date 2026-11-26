import React, { useEffect, useState, useRef } from "react";
import { connect } from "react-redux";
import { Timeline, Card, Button, Modal, Form, Tooltip, Select, Radio, Spin, Table } from 'antd';
import { push } from "react-router-redux";
import { Setup, OutHidden } from "$components";
import ReactECharts from "echarts-for-react";
import moment from "moment";
import ReactDOM from "react-dom";

const AlarmChart = ({
  dispatch,
  actions,
  user,
  history,
  projectPoms,
  loading,
  socket,
  pepProjectId,
  statisticOnline,
  strucSeries,
}) => {
  const { control, install, problem } = actions;
  const [setup, setSetup] = useState(false); //设置是否显现
  const [tableType, setTableType] = useState(""); //localStorage存储名
  const [tableSetup, setTableSetup] = useState([]); //单一表格设置信息
  const [long, setLong] = useState(""); //最新动态设置
  const [pomsList, setPomsList] = useState([]); //项目
  const [faultId, setFaultId] = useState(""); //项目id  故障数统计
  const [onlineId, setOnlineId] = useState(""); //项目id  数据在线率
  const [setData, setSetData] = useState(); //设置总数
  const [radioStatistics, setRadioStatistics] = useState("day"); //故障数统计（日，周，月）
  const [radioRank, setRadioRank] = useState("day"); //故障数排名（日，周，月）
  const [dataAlarm, setDataAlarm] = useState({}); //故障数统计--数据类
  const [videoAlarm, setVideoAlarm] = useState({}); //故障故障数统计--视频
  const [useAlarm, setUseAlarm] = useState({}); //故障故障数统计--应用
  const [behind, setBehind] = useState(true); //故障数统计下钻
  const [behindShow, setBehindShow] = useState([]); //故障数统计展示
  const [videoData, setVideoData] = useState([]); //视频故障统计
  const [datumData, setDatumData] = useState([]); //数据故障统计
  const [useData, setUseData] = useState([]); //应用故障统计
  const [rankData, setRankData] = useState([]); //故障排名

  const [onlineStruc, setOnlineStruc] = useState([]);
  const [online, setOnline] = useState([]);
  const [value, setValue] = useState([]);

  const [successionId, setSuccessionId] = useState(""); //项目id  数据连续率
  const [seriesStruc, setSeriesStruc] = useState([]); //连续率  结构物数据
  const [series, setSeries] = useState([]); //连续率  数据
  const [seriesValue, setSeriesValue] = useState([]); //连续率  结构物Id
  const [sensorValue, setSensorValue] = useState([]); //连续率  测点Id
  const [sensorList, setSensorList] = useState([]); //连续率  测点数数据

  const [statisticsSpin, setStatisticsSpin] = useState(false); //故障数统计  加载中
  const [rankSpin, setRankSpin] = useState(false); //故障数排名  加载中
  const [continuousIns, setContinuousIns] = useState(null);
  const [onlineIns, setOnlineIns] = useState(null);

  useEffect(() => {
    if (projectPoms?.length > 0) {
      let data = projectPoms
        ?.filter((v) => v.pepProjectIsDelete != 1)
        ?.map((v) => ({ value: v.id, label: v.pepProjectName || v.name }));
      setPomsList(data);
    }
  }, [projectPoms]);

  useEffect(async () => {
    if (projectPoms?.length > 0) {
      let data = await getData("day", pepProjectId, true, true);
      await getRank(data);
      setRadioStatistics("day");
      setRadioRank("day");
      setFaultId("");
      let ProjectId = pepProjectId
        ? pepProjectId?.length > 0
          ? pepProjectId.split(",")[0]
          : pepProjectId
        : projectPoms[0]?.id;
      await getStatisticOnline(ProjectId); //始终获取一个项目的数据
      await getStrucSeries(ProjectId); //始终获取一个项目的数据

      if (pepProjectId) {
        setPomsList(
          projectPoms
            ?.filter(
              (v) =>
                v.pepProjectIsDelete != 1 &&
                (pepProjectId?.length > 0
                  ? pepProjectId.split(",")?.map((p) => Number(p))
                  : [pepProjectId]
                ).includes(v.id)
            )
            ?.map((v) => ({ value: v.id, label: v.pepProjectName || v.name }))
        );
        if (!pepProjectId?.length > 0 || pepProjectId.split(",")?.length == 1) {
          setFaultId(Number(pepProjectId));
        }
      } else {
        setPomsList(
          projectPoms
            ?.filter((v) => v.pepProjectIsDelete != 1)
            ?.map((v) => ({ value: v.id, label: v.pepProjectName || v.name }))
        );
      }
    }
  }, [pepProjectId, projectPoms]);

  //数据在线率
  const getStatisticOnline = async (id) => {
    await dispatch(control.getStatisticOnline({ pepProjectId: id })).then(
      (res) => {
        if (res.success) {
          setOnlineId(Number(id));
          let data = res.payload.data;
          const struc = data?.map((v) => ({
            value: v.strucId,
            label: v.strucName,
          }));
          struc.unshift({ value: 0, label: "全部" });
          setOnlineStruc(struc);
          setOnline(data);
          setValue([0]);
        }
      }
    );
  };
  //数据连续率
  const getStrucSeries = async (id, strucId) => {
    await dispatch(
      control.getStrucSeries({ pepProjectId: id, strucId: strucId })
    ).then((res) => {
      if (res.success) {
        let data = res.payload.data?.sensor;
        let struc = res.payload.data?.anxinStruc?.map((s) => ({
          value: s.strucId,
          label: s?.strucName,
        }));
        if (!strucId) {
          setSuccessionId(Number(id));
          setSeriesStruc(struc);
          setSeriesValue(struc[0]?.value);
        }
        setSeries(data || []);
        let d = data?.map((v) => ({ value: v.id, label: v.name })) || [];
        d.unshift({ value: 0, label: "全部" });
        setSensorList(d);
        setSensorValue([0]); //默认选择全部
      }
    });
  };

  const getRank = async (data) => {
    let dataList = [];
    if (
      (pepProjectId &&
        (!pepProjectId?.length || pepProjectId.split(",")?.length == 1)) ||
      projectPoms?.legend == 1
    ) {
      data?.AlarmData?.filter((p) => p.State < 3)?.forEach((s) => {
        let find = dataList?.find((a) => a.StructureId == s.StructureId);
        if (find) {
          find.sum += 1;
        } else {
          dataList.push({
            StructureId: s.StructureId,
            name: s.StructureName,
            sum: 1,
          });
        }
      });

      data?.AlarmVideo?.filter((p) => !p.confirmTime)?.forEach((s) => {
        s?.struc?.forEach((f) => {
          let find = dataList?.find((a) => a.id == s.StructureId);
          if (find) {
            find.sum += 1;
          } else {
            dataList.push({
              StructureId: f.id,
              name: f.name,
              sum: 1,
            });
          }
        });
      });
    } else {
      projectPoms
        ?.filter((v) => v.pepProjectIsDelete != 1)
        ?.forEach((d) => {
          let data1 =
            data?.AlarmData?.filter(
              (v) =>
                v.pomsProject?.map((p) => p.id)?.includes(d.id) && v.State < 3
            )?.length || 0;
          let data2 =
            data?.AlarmVideo?.filter(
              (v) =>
                v.pomsProject?.map((p) => p.id)?.includes(d.id) &&
                !v.confirmTime
            )?.length || 0;
          dataList.push({
            name: d.name || d.pepProjectName,
            sum: data1 + data2,
          });
        });
    }
    setRankData(
      dataList
        .sort((a, b) => b.sum - a.sum)
        ?.slice(0, 5)
        ?.sort((a, b) => a.sum - b.sum) || []
    );
  };

  const getData = async (radio, pepProjectId, diff1, diff2) => {
    if (diff2) setStatisticsSpin(true);
    if (diff1) setRankSpin(true);
    let data = {};
    await dispatch(
      control.getAlarmData({
        pepProjectId: pepProjectId,
        startTime: moment().startOf(radio).format("YYYY-MM-DD HH:mm:ss"),
      })
    ).then((res) => {
      if (res.success) {
        if (diff1) {
          data.AlarmData = res.payload.data || [];
        }
        if (diff2) {
          setDatumData(res.payload.data || []);
          let group = {
            group1: { sum: 0, untreated: 0 },
            group2: { sum: 0, untreated: 0 },
            group3: { sum: 0, untreated: 0 },
            group4: { sum: 0, untreated: 0 },
            group5: { sum: 0, untreated: 0 },
          };
          res.payload.data?.forEach((v) => {
            if (group["group" + v.AlarmGroup])
              group["group" + v.AlarmGroup].sum += 1;
            if (v.State < 3) {
              if (group["group" + v.AlarmGroup])
                group["group" + v.AlarmGroup].untreated += 1;
            }
          });
          setDataAlarm(group);
        }
      }
    });

    await dispatch(
      problem.getAlarmVideoList({
        pepProjectId: pepProjectId,
        startTime: moment().startOf(radio).format("YYYY-MM-DD HH:mm:ss"),
      })
    ).then((res) => {
      if (res.success) {
        if (diff1) {
          data.AlarmVideo = res.payload.data || [];
        }
        if (diff2) {
          setVideoData(res.payload.data || []);
          let alarmData = { sum: 0, untreated: 0 };
          res.payload.data?.forEach((v) => {
            alarmData.sum += 1;
            if (!v.confirmTime) {
              alarmData.untreated += 1;
            }
          });
          setVideoAlarm(alarmData);
        }
      }
    });

    if (diff2) {
      await dispatch(
        control.getAlarmUse({
          pepProjectId: pepProjectId,
          startTime: moment().startOf(radio).format("YYYY-MM-DD HH:mm:ss"),
        })
      ).then((res) => {
        if (res.success) {
          setUseData(res.payload.data || []);
          let alarmData = { sum: 0, untreated: 0 };
          res.payload.data?.forEach((v) => {
            alarmData.sum += 1;
            if (!v.confirmTime) {
              alarmData.untreated += 1;
            }
          });
          setUseAlarm(alarmData);
        }
      });
    }
    setStatisticsSpin(false);
    setRankSpin(false);
    return data;
  };

  const behindHandle = (key) => {
    let show = [];
    switch (key) {
      // case '数据中断':
      //    dispatch(problem.getAlarmDataGroup()).then((res) => {
      //       if (res.success) {
      //          let data = res.payload.data?.find(v => v.desc == '数据中断')?.unit || []
      //          let sumData = datumData?.filter(s => s.AlarmGroup == 1) || []
      //          data?.forEach(v => {
      //             let dataList = sumData?.filter(s => s.AlarmGroupUnit == v.id) || []
      //             let untreated = dataList?.filter(s => s.State < 3)?.length || 0
      //             show.push({
      //                name: v.name,
      //                untreated: untreated,
      //                processed: dataList?.length - untreated,
      //                num: dataList?.length
      //             })
      //          })
      //          setBehindShow(show.sort((a, b) => b.num - a.num)?.slice(0, 5) || [])
      //       }
      //    })
      //    break;
      case "数据异常":
        dispatch(problem.getAlarmDataGroup()).then(async (res) => {
          if (res.success) {
            let data2 = res.payload.data?.find((v) => v.id == 2)?.unit || [];
            let data3 = res.payload.data?.find((v) => v.id == 3)?.unit || [];
            let sumData =
              datumData?.filter(
                (s) => s.AlarmGroup == 2 || s.AlarmGroup == 3
              ) || [];

            await dispatch(
              problem.getExceptionTypeCheck({ userId: user?.id })
            ).then((res) => {
              if (res.success) {
                [...data2, ...data3]
                  ?.filter((d) =>
                    (res.payload.data?.typeId || [8, 40, 41, 48, 49]).includes(
                      d.id
                    )
                  )
                  ?.forEach((v) => {
                    let dataList =
                      sumData?.filter((s) => s.AlarmGroupUnit == v.id) || [];
                    let untreated =
                      dataList?.filter((s) => s.State < 3)?.length || 0;
                    show.push({
                      name: v.name,
                      untreated: untreated,
                      processed: dataList?.length - untreated,
                      num: dataList?.length,
                    });
                  });
                setBehindShow(
                  show.sort((a, b) => b.num - a.num)?.slice(0, 5) || []
                );
              }
            });
          }
        });
        break;
      // case '策略命中':
      //    dispatch(problem.getAlarmDataGroup()).then((res) => {
      //       if (res.success) {
      //          let data = res.payload.data?.find(v => v.desc == '策略命中')?.unit || []
      //          let sumData = datumData?.filter(s => s.AlarmGroup == 3) || []
      //          data?.forEach(v => {
      //             let dataList = sumData?.filter(s => s.AlarmGroupUnit == v.id) || []
      //             let untreated = dataList?.filter(s => s.State < 3)?.length || 0
      //             show.push({
      //                name: v.name,
      //                untreated: untreated,
      //                processed: dataList?.length - untreated,
      //                num: dataList?.length
      //             })
      //          })
      //          setBehindShow(show.sort((a, b) => b.num - a.num)?.slice(0, 5) || [])
      //       }
      //    })
      //    break;
      case "视频异常":
        dispatch(problem.getAlarmVideoExceptionType()).then((res) => {
          if (res.success) {
            res.payload.data?.forEach((v) => {
              let dataList =
                videoData?.filter((s) => s.statusId == v.statusId) || [];
              let untreated =
                dataList?.filter((s) => !s.confirmTime)?.length || 0;
              show.push({
                name: v.describe,
                untreated: untreated,
                processed: dataList?.length - untreated,
                num: dataList?.length,
              });
            });
            setBehindShow(
              show.sort((a, b) => b.num - a.num)?.slice(0, 5) || []
            );
          }
        });

        setBehind(false);

        break;
      case "应用异常":
        [
          { name: "接口报错", value: "apiError " },
          { name: "加载超时", value: "timeout" },
          { name: "元素异常", value: "element" },
        ].forEach((v) => {
          let dataList = useData?.filter((s) => s.type == v.value) || [];
          let untreated = dataList?.filter((s) => !s.confirmTime)?.length || 0;
          show.push({
            name: v.name,
            untreated: untreated,
            processed: dataList?.length - untreated,
            num: dataList?.length,
          });
        });
        setBehindShow(show.sort((a, b) => b.num - a.num)?.slice(0, 5) || []);
        break;
      // case '设备异常':
      //    dispatch(problem.getAlarmDataGroup()).then((res) => {
      //       if (res.success) {
      //          let data = res.payload.data?.find(v => v.desc == '掉线' || v.desc == '不活跃')?.unit || []
      //          let sumData = datumData?.filter(s => s.AlarmGroup == 4 || s.AlarmGroup == 5) || []
      //          data?.forEach(v => {
      //             let dataList = sumData?.filter(s => s.AlarmGroupUnit == v.id) || []
      //             let untreated = dataList?.filter(s => s.State < 3)?.length || 0
      //             show.push({
      //                name: v.name,
      //                untreated: untreated,
      //                processed: dataList?.length - untreated,
      //                num: dataList?.length
      //             })
      //          })
      //          setBehindShow(show.sort((a, b) => b.num - a.num)?.slice(0, 5) || [])
      //       }
      //    })
      //    break;
    }
    setBehind(false);
  };
  // formatter: function (params) {
  //     // 自定义提示框内容
  //     let title = params[0].data[0] + '<br/>' + '<br/>'
  //     params.forEach(v => {
  //         let find = online?.find(s => s.strucName == v.seriesName)?.online?.find(d => moment(d.collect_time).format('YYYY-MM-DD HH') == v.data[0]) || {}
  //         title = title + v.seriesName + "：" + "&nbsp" + "&nbsp" + v.data[1] + "%" + "（" + find?.online + "/" + find?.total + "）" + '<br/>'
  //     })
  //     return title
  // }

  useEffect(() => {
    if (onlineIns && online && online.length) {
      let toolTipColumn = [
        {
          title: "结构物",
          dataIndex: "name",
          key: "name",
          width: 460,
          render: (text) => (
            <div style={{ 
              whiteSpace: 'nowrap',
              wordWrap: 'break-word',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              width:'56ch',
              lineHeight: 1.5 
            }}>
              {text}
            </div>
          )
        },
        {
          title: "在线率",
          ellipsis: true,
          dataIndex: "online_rate",
          key: "online_rate",
          sorter: (a, b) => {
            let a1 = a.online_rate.split("%")[0];
            let b1 = b.online_rate.split("%")[0];
            return a1 - b1;
          },
        },
        {
          title: "占比",
          ellipsis: true,
          sortable: true,
          dataIndex: "percent",
          key: "percent",
          sorter: (a, b) => {
            let a1 = a.percent.split("/")[1];
            let b1 = b.percent.split("/")[1];
            return a1 - b1;
          },
        },
      ];
      onlineIns.on("showTip", (params) => {
        let tooltipData = [];
        let time = params?.dataByCoordSys?.[0]?.dataByAxis?.[0]?.value;
        (online || []).forEach((v) => {
          v?.online?.forEach((s) => {
            if (moment(s?.collect_time).format("x") == time) {
              tooltipData.push({
                name: v.strucName,
                online_rate: (s?.rate || 0).toFixed(1) + "%",
                percent: s?.online + "/" + s?.total,
              });
            }
          });
        });

        // (online || []).forEach(v=>{
        //     tooltipData.push({
        //         name:v.strucName,
        //         online_rate:(v?.online?.[params?.dataIndex]?.rate || 0).toFixed(1) + '%',
        //         percent: (v?.online?.[params?.dataIndex]?.online) + "/" + (v?.online?.[params?.dataIndex]?.total)
        //     })
        // })

        let doc = document.getElementById("online-rate-custom-tooltip");
        doc?.addEventListener("wheel", (e) => {
          e.stopPropagation();
          // e.preventDefault();
        });
        ReactDOM.render(
          <>
            <div style={{ height: 20, marginBottom: 8 }}>
              收集时间:
              {online?.[0]?.online?.[params?.dataIndex]?.collect_time &&
                moment(
                  online?.[0]?.online?.[params?.dataIndex]?.collect_time
                ).format("YYYY-MM-DD HH:mm:ss")}
            </div>
            <Table
              style={{ width: '100%' }}
              scroll={{ y: 320 }}
              sticky
              dataSource={tooltipData}
              columns={toolTipColumn}
              pagination={false}
            />
          </>,
          document.getElementById("online-rate-custom-tooltip")
        );
      });
    }
  }, [onlineIns, online]);

  let toolTipColumn = [
    {
      title: "测点名称",
      dataIndex: "name",
      ellipsis: true,
      key: "name",
    },
    {
      title: "连续率",
      ellipsis: true,
      dataIndex: "continuous_rate",
      key: "continuous_rate",
      sorter: (a, b) => {
        let a1 = a.continuous_rate.split("%")[0];
        let b1 = b.continuous_rate.split("%")[0];
        return a1 - b1;
      },
    },
    {
      title: "测点占比",
      ellipsis: true,
      sortable: true,
      dataIndex: "online_rate",
      key: "online_rate",
      sorter: (a, b) => {
        let a1 = a.online_rate.split("/")[1];
        let b1 = b.online_rate.split("/")[1];
        return a1 - b1;
      },
    },
  ];
  useEffect(() => {
    if (continuousIns && series && series.length) {
      continuousIns.on("showTip", (params) => {
        let tooltipData = [];
        let time = params?.dataByCoordSys?.[0]?.dataByAxis?.[0]?.value;
        (series || []).forEach((v) => {
          v.series.forEach((s) => {
            if (moment(s?.collect_time).format("x") == time) {
              tooltipData.push({
                name: v.name,
                continuous_rate: s?.cont * 100 + "%",
                online_rate: (s?.num || 0) + "/" + (s?.max || s?.num || 0),
              });
            }
          });
        });
        // console.log(params,series,'data2')
        //禁用冒泡事件
        let doc = document.getElementById("continuous-rate-custom-tooltip");
        doc?.addEventListener("wheel", (e) => {
          e.stopPropagation();
          // e.preventDefault();
        });
        ReactDOM.render(
          <>
            <div style={{ height: 20 }}>
              收集时间:
              {series?.[0]?.series?.[params?.dataIndex]?.collect_time &&
                moment(
                  series?.[0]?.series?.[params?.dataIndex]?.collect_time
                ).format("YYYY-MM-DD HH:mm:ss")}
            </div>
            <Table
              scroll={{ y: 320 }}
              sticky
              dataSource={tooltipData}
              columns={toolTipColumn}
              pagination={false}
            />
          </>,
          document.getElementById("continuous-rate-custom-tooltip")
        );
      });
    }
  }, [continuousIns, series]);

  const handleChartReady = (instance) => {
    setContinuousIns(instance);
  };

  return (
    <>
      {/* 数据分析 */}
      {
        <div
          style={{
            background: "#FFFFFF",
            boxShadow: "0px 0px 12px 2px rgba(220,222,224,0.2)",
            borderRadius: 2,
            paddingTop: 20,
            paddingLeft: 24,
            marginTop: 22,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center" }}>
              <div
                style={{
                  width: 0,
                  height: 20,
                  borderLeft: "3px solid #005ABD",
                  borderTop: "3px solid transparent",
                  borderBottom: "3px solid transparent",
                }}
              ></div>
              <div
                style={{
                  fontFamily: "YouSheBiaoTiHei",
                  fontSize: 24,
                  color: "#101531",
                  marginLeft: 8,
                }}
              >
                数据分析
              </div>
              <div
                style={{
                  marginLeft: 6,
                  fontSize: 12,
                  color: "#969799",
                  fontFamily: "DINExp",
                }}
              >
                DATA ANALYSIS
              </div>
            </div>
            {/* <div style={{ marginRight: 25 }}>
                  <img title='设置' src="/assets/images/problem/setup.png" style={{ width: 18, height: 18, cursor: "pointer" }} onClick={() => {
                     setSetup(true)
                     setTableType('analyse')
                     attribute('analyse')
                     setSetData(10)
                  }} />
               </div> */}
          </div>
          <div style={{ width: "100%", height: "100%", marginTop: 20 }}>
            <div style={{ display: "flex" }}>
              {/* 故障数统计 */}
              <div style={{ padding: 16, width: "50%", height: 300 }}>
                <Spin spinning={statisticsSpin} tip="数据加载中...">
                  {behind ? (
                    <>
                      <div style={{ display: "flex", marginLeft: 10 }}>
                        <div
                          style={{
                            fontSize: 18,
                            fontWeight: "bold",
                            color: "#0b0b0bbd",
                          }}
                        >
                          故障数统计
                        </div>
                        <div style={{ marginLeft: 10 }}>
                          <Select
                            allowClear
                            filter
                            placeholder="项目"
                            value={faultId}
                            style={{ width: 160, marginRight: 10 }}
                            onChange={(v) => {
                              setFaultId(v);
                              getData(radioStatistics, v, false, true);
                            }}
                            options={pomsList}
                          />
                          <Radio
                            type="button"
                            buttonSize="middle"
                            value={radioStatistics}
                            style={{ marginRight: 10 }}
                            onChange={(e) => {
                              setRadioStatistics(e.target.value);
                              getData(
                                e.target.value,
                                pepProjectId,
                                false,
                                true
                              );
                            }}
                          >
                            <Radio value="day">今日</Radio>
                            <Radio value="week">本周</Radio>
                            <Radio value="month">本月</Radio>
                          </Radio>
                        </div>
                      </div>
                      <div style={{ display: "flex", padding: 16 }}>
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "space-evenly",
                            width: 234,
                            height: 226,
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              cursor: "pointer",
                            }}
                            //  onClick={() => behindHandle('数据中断')}
                          >
                            <div>数据中断：</div>
                            <div style={{ fontWeight: 500 }}>
                              <sapn style={{ color: "red" }}>
                                {(dataAlarm?.group1?.untreated || 0) +
                                  (dataAlarm?.group4?.untreated || 0) +
                                  (dataAlarm?.group5?.untreated || 0)}
                              </sapn>{" "}
                              /
                              <span style={{ color: "rgb(48 47 138)" }}>
                                {(dataAlarm?.group1?.sum || 0) +
                                  (dataAlarm?.group4?.sum || 0) +
                                  (dataAlarm?.group5?.sum || 0)}
                              </span>
                            </div>
                          </div>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              cursor: "pointer",
                            }}
                            onClick={() => behindHandle("数据异常")}
                          >
                            <div>数据异常：</div>
                            <div style={{ fontWeight: 500 }}>
                              <sapn style={{ color: "red" }}>
                                {(dataAlarm?.group2?.untreated || 0) +
                                  (dataAlarm?.group3?.untreated || 0)}
                              </sapn>{" "}
                              /
                              <span style={{ color: "rgb(48 47 138)" }}>
                                {(dataAlarm?.group2?.sum || 0) +
                                  (dataAlarm?.group3?.sum || 0)}
                              </span>
                            </div>
                          </div>
                          {/* <div style={{ display: 'flex', justifyContent: "space-between", cursor: 'pointer' }} onClick={() => behindHandle('策略命中')}>
                                       <div>策略命中：</div>
                                       <div style={{ fontWeight: 500 }}>
                                          <sapn style={{ color: "red" }}>{dataAlarm?.group3?.untreated || 0}</sapn> /
                                          <span style={{ color: "rgb(48 47 138)" }}>{dataAlarm?.group3?.sum || 0}</span>
                                       </div>
                                    </div> */}

                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              cursor: "pointer",
                            }}
                            onClick={() => behindHandle("视频异常")}
                          >
                            <div>视频异常：</div>
                            <div style={{ fontWeight: 500 }}>
                              <sapn style={{ color: "red" }}>
                                {videoAlarm?.untreated || 0}
                              </sapn>{" "}
                              /
                              <span style={{ color: "rgb(48 47 138)" }}>
                                {videoAlarm?.sum || 0}
                              </span>
                            </div>
                          </div>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              cursor: "pointer",
                            }}
                            onClick={() => behindHandle("应用异常")}
                          >
                            <div>应用异常：</div>
                            <div style={{ fontWeight: 500 }}>
                              <sapn style={{ color: "red" }}>
                                {useAlarm?.untreated || 0}
                              </sapn>{" "}
                              /
                              <span style={{ color: "rgb(48 47 138)" }}>
                                {useAlarm?.sum || 0}
                              </span>
                            </div>
                          </div>

                          {/* <div style={{ display: 'flex', justifyContent: "space-between", cursor: 'pointer' }} onClick={() => behindHandle('设备异常')}>
                                       <div>设备异常：</div>
                                       <div style={{ fontWeight: 500 }}>
                                          <sapn style={{ color: "red" }}>{(dataAlarm?.group4?.untreated || 0) + (dataAlarm?.group5?.untreated || 0)}</sapn> /
                                          <span style={{ color: "rgb(48 47 138)" }}>{(dataAlarm?.group4?.sum || 0) + (dataAlarm?.group5?.sum || 0)}</span>
                                       </div>
                                    </div> */}
                        </div>
                        <div
                          style={{
                            width: "calc(100% - 180px)",
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "center",
                            alignItems: "center",
                            fontSize: 46,
                            fontWeight: 600,
                          }}
                        >
                          <div style={{ fontWeight: 500 }}>
                            {(dataAlarm?.group1?.untreated || 0) +
                              (dataAlarm?.group2?.untreated || 0) +
                              (dataAlarm?.group3?.untreated || 0) +
                              (dataAlarm?.group4?.untreated || 0) +
                              (dataAlarm?.group5?.untreated || 0) +
                              (videoAlarm?.untreated || 0) +
                              (useAlarm?.untreated || 0)}
                            /
                            {(dataAlarm?.group1?.sum || 0) +
                              (dataAlarm?.group2?.sum || 0) +
                              (dataAlarm?.group3?.sum || 0) +
                              (dataAlarm?.group4?.sum || 0) +
                              (dataAlarm?.group5?.sum || 0) +
                              (videoAlarm?.sum || 0) +
                              (useAlarm?.sum || 0)}
                          </div>
                          <div style={{ fontSize: 12, color: "#817a7a" }}>
                            未处理告警 / 全部告警
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div
                      onClick={() => {
                        setBehindShow([]);
                        setBehind(true);
                      }}
                    >
                      <ReactECharts
                        option={{
                          title: {
                            text: "故障数统计",
                          },
                          grid: {
                            left: "10%",
                            // right: '4%',
                            // bottom: '3%',
                            // containLabel: true
                          },
                          // dataZoom: [
                          //    {
                          //       type: 'slider',
                          //       // startValue: behindShow?.map(v => v.name) || []
                          //    },
                          //    {
                          //       type: 'inside',
                          //    },
                          // ],
                          tooltip: {
                            trigger: "axis",
                          },
                          legend: {
                            data: ["未处理", "已处理"],
                            right: "10%",
                          },
                          xAxis: {
                            type: "category",
                            // boundaryGap: false,
                            data: behindShow?.map((v) => v.name) || [],
                          },
                          yAxis: {
                            type: "value",
                            name: "单位：条",
                          },
                          series: [
                            {
                              type: "bar",
                              name: "未处理",
                              smooth: true,
                              itemStyle: { color: "#df4141" },
                              barWidth: 20,
                              data: behindShow?.map((v) => v.untreated) || [],
                            },
                            {
                              type: "bar",
                              name: "已处理",
                              smooth: true,
                              itemStyle: { color: "#0ddf42" },
                              barWidth: 20,
                              data: behindShow?.map((v) => v.processed) || [],
                            },
                          ],
                        }}
                        notMerge={true}
                        lazyUpdate={true}
                        // onChartReady={this.onChartReadyCallback}
                        // onEvents={EventsDict}
                        // opts={}
                      />
                    </div>
                  )}
                </Spin>
              </div>
              {/* 故障数排名*/}
              <div
                style={{
                  padding: 10,
                  width: "50%",
                  height: 300,
                  position: "relative",
                }}
              >
                <Spin spinning={rankSpin} tip="数据加载中...">
                  <Radio
                    type="button"
                    buttonSize="middle"
                    value={radioRank}
                    style={{
                      marginRight: 10,
                      zIndex: 10,
                      position: "absolute",
                      top: 0,
                      left: 105,
                    }}
                    onChange={async (e) => {
                      setRadioRank(e.target.value);
                      let data = await getData(
                        e.target.value,
                        pepProjectId,
                        true,
                        false
                      );
                      await getRank(data);
                    }}
                  >
                    <Radio value="day">今日</Radio>
                    <Radio value="week">本周</Radio>
                    <Radio value="month">本月</Radio>
                  </Radio>
                  <ReactECharts
                    option={{
                      title: {
                        text: "故障数排名",
                      },
                      grid: {
                        left: 70,
                        // right: '4%',
                        // bottom: '3%',
                        // containLabel: true
                      },
                      tooltip: {
                        trigger: "axis",
                        formatter: function (params) {
                          // 自定义提示框内容
                          // console.log(params);
                          let title =
                            rankData[params[0].dataIndex]?.name +
                            "<br/>" +
                            "<br/>" +
                            params[0]?.seriesName +
                            "：" +
                            "&nbsp" +
                            "&nbsp" +
                            params[0]?.value;
                          return title;
                        },
                      },
                      legend: {
                        data: ["未处理故障数"],
                        right: "10%",
                      },
                      yAxis: {
                        type: "category",
                        data:
                          rankData?.map((v) => {
                            if (v.name?.length > 4) {
                              return v.name?.slice(0, 4) + "...";
                            } else {
                              return v.name;
                            }
                          }) || [],
                      },
                      xAxis: {
                        type: "value",
                      },
                      series: [
                        {
                          type: "bar",
                          name: "未处理故障数",
                          smooth: true,
                          itemStyle: { color: "#0ddf42" },
                          barWidth: 20,
                          data: rankData?.map((v) => v.sum) || [],
                        },
                      ],
                    }}
                    notMerge={true}
                    lazyUpdate={true}
                    // onChartReady={this.onChartReadyCallback}
                    // onEvents={EventsDict}
                    // opts={}
                  />
                </Spin>
              </div>
            </div>
            <div style={{ display: "flex" }}>
              {/* 数据在线率 */}
              <div
                style={{
                  marginTop: 30,
                  padding: 10,
                  width: "50%",
                  height: 350,
                  position: "relative",
                }}
              >
                <div
                  style={{
                    zIndex: 10,
                    position: "absolute",
                    top: 8,
                    left: 112,
                    display: "flex",
                  }}
                >
                  <Select
                    filter
                    placeholder="项目"
                    value={onlineId}
                    style={{ width: 160, marginRight: 10 }}
                    onChange={(v) => {
                      getStatisticOnline(v);
                    }}
                    options={pomsList}
                  />
                  <Select
                    allowClear
                    filter
                    placeholder="结构物"
                    value={value}
                    multiple={true}
                    maxTagCount={1}
                    style={{ width: 160, marginRight: 10 }}
                    options={onlineStruc}
                    onChange={(v) => {
                      // debugger
                      // console.log("当前选中值：", v);
                      // 判断是否包含全选（0）
                      const isSelectAll = v.includes(0);
                      // 获取普通选项的 ID（去除全选 0）
                      const allOptionIds = onlineStruc
                        .map((item) => item.value)
                        .filter((id) => id !== 0);
                      if (isSelectAll) {
                        if (v.length === 1) {
                          setValue([0]);
                          setOnline(statisticOnline);
                        } else {
                          const allOptionIds = onlineStruc
                            .map((item) => item.value)
                            .filter((id) => id !== 0);
                          const isAllSelected = allOptionIds.every((id) =>
                            v.includes(id)
                          );
                          if (isAllSelected) {
                            setValue([0]);
                            setOnline(statisticOnline);
                          } else {
                            if (v?.[v.length - 1] === 0) {
                              setValue([0]);
                              setOnline(statisticOnline);
                            } else {
                              setValue(v.filter((s) => s !== 0));
                              setOnline(
                                statisticOnline?.filter((s) =>
                                  v.filter((x) => x !== 0).includes(s.strucId)
                                )
                              );
                            }
                          }
                        }
                      } else {
                        // 普通选项逻辑
                        setValue(v);
                        // 检查是否所有普通选项都被选中
                        const isAllSelected = allOptionIds.every((id) =>
                          v.includes(id)
                        );
                        if (isAllSelected) {
                          // 全部普通选项已选中，自动勾选全选
                          setValue([0]);
                          setOnline(statisticOnline);
                        } else {
                          // 未全选，仅显示当前选中项
                          setOnline(
                            statisticOnline?.filter((s) =>
                              v.includes(s.strucId)
                            )
                          );
                        }
                      }
                      // 如果没有选中任何项，恢复默认状态
                      if (!v.length) {
                        setOnline(statisticOnline);
                      }
                    }}
                  />
                </div>
                <ReactECharts
                  onChartReady={(chart) => setOnlineIns(chart)}
                  option={{
                    title: {
                      text: "数据在线率",
                    },
                    grid: {
                      left: 30,
                      right: 30,
                      bottom: 20,
                    },
                    position: function (point, params, dom, rect, size) {
                      const [x, y] = point; // 鼠标位置
                      const { contentSize, viewSize } = size; // tooltip 和视图的尺寸
                      const tooltipWidth = contentSize[0];
                      const tooltipHeight = contentSize[1];

                      const viewWidth = viewSize[0];
                      const viewHeight = viewSize[1];
                      // 默认位置
                      let xPos = x;
                      let yPos = y;
                      // 如果 tooltip 超出下边界
                      if (y + tooltipHeight > viewHeight) {
                        yPos = y - 10 - tooltipHeight; // 向上偏移
                      }
                      // 如果 tooltip 超出右边界
                      if (x + tooltipWidth > viewWidth) {
                        xPos = x - tooltipWidth - 10; // 向左偏移
                      }
                      // 如果 tooltip 超出左边界
                      if (xPos < 0) {
                        xPos = x + 10; // 向右偏移
                      }
                      return [xPos, yPos];
                    },
                    tooltip: {
                      trigger: "axis",
                      tooltip: {
                        trigger: "axis",
                        enterable: true,
                        formatter: function (params) {
                          return `<div id="custom-tooltip" style="width: 600px; height: 400px; overflow: auto;"></div>`;
                        },
                      },
                      enterable: true,
                      formatter: function (params) {
                        return `<div id="online-rate-custom-tooltip" style="width: 680px; height: 400px"></div>`;
                      },
                      // formatter: function (params) {
                      //     // 自定义提示框内容
                      //     let title = params[0].data[0] + '<br/>' + '<br/>'
                      //     params.forEach(v => {
                      //         let find = online?.find(s => s.strucName == v.seriesName)?.online?.find(d => moment(d.collect_time).format('YYYY-MM-DD HH') == v.data[0]) || {}
                      //         title = title + v.seriesName + "：" + "&nbsp" + "&nbsp" + v.data[1] + "%" + "（" + find?.online + "/" + find?.total + "）" + '<br/>'
                      //     })
                      //     return title
                      // }
                    },
                    xAxis: {
                      type: "time",
                      // name: "时间",
                      boundaryGap: false,
                      minInterval: 1000 * 60 * 60,
                    },
                    yAxis: {
                      type: "value",
                      name: "单位%",
                      areaStyle: {
                        color: "#FFF",
                      },
                    },
                    series:
                      online?.map((v) => ({
                        type: "line",
                        name: v.strucName,
                        smooth: true,
                        areaStyle: {
                          color: "#0e9cff26",
                        },
                        data:
                          v.online?.map((f) => [
                            moment(f.collect_time).format("YYYY-MM-DD HH"),
                            f.rate.toFixed(1),
                          ]) || [],
                      })) || [],
                  }}
                  notMerge={true}
                  lazyUpdate={true}
                  style={{ width: "100%", height: "100%" }}
                />
              </div>
              {/* 数据连续率 */}
              <div
                style={{
                  marginTop: 30,
                  padding: 10,
                  width: "50%",
                  height: 350,
                  position: "relative",
                }}
              >
                <div
                  style={{
                    zIndex: 10,
                    position: "absolute",
                    top: 8,
                    left: 112,
                    display: "flex",
                  }}
                >
                  <Select
                    filter
                    placeholder="项目"
                    value={successionId}
                    style={{ width: 160, marginRight: 10 }}
                    onChange={(v) => {
                      getStrucSeries(v);
                    }}
                    options={pomsList}
                  />
                  <Select
                    filter
                    placeholder="结构物"
                    value={seriesValue}
                    maxTagCount={1}
                    style={{ width: 160, marginRight: 10 }}
                    options={seriesStruc}
                    onChange={async (v) => {
                      setSeriesValue(v);
                      await getStrucSeries(successionId, v);
                    }}
                  />
                  <Select
                    allowClear
                    filter
                    placeholder="测点"
                    value={sensorValue}
                    multiple={true}
                    maxTagCount={1}
                    style={{ width: 160, marginRight: 10 }}
                    options={sensorList}
                    onChange={(v) => {
                      // 判断是否包含全选（0）
                      // console.log(strucSeries?.sensor,v,'vvvvv')
                      const isSelectAll = v.includes(0);
                      let d = strucSeries?.sensor;
                      // 获取普通选项的 ID（去除全选 0）
                      const allOptionIds = sensorList
                        .map((item) => item.value)
                        .filter((id) => id !== 0);
                      if (isSelectAll) {
                        if (v.length === 1) {
                          setSensorValue([0]);
                          setSeries(d || []);
                        } else {
                          const isAllSelected = allOptionIds.every((id) =>
                            v.includes(id)
                          );
                          if (isAllSelected) {
                            setSensorValue([0]);
                            setSeries(d || []);
                          } else {
                            if (v?.[v.length - 1] === 0) {
                              setSensorValue([0]);
                              setSeries(d || []);
                            } else {
                              setSensorValue(v.filter((s) => s !== 0));
                              setSeries(
                                d?.filter(
                                  (s) =>
                                    v.filter((x) => x !== 0).includes(s.id) &&
                                    seriesValue == s.structure
                                ) || []
                              );
                            }
                          }
                        }
                      } else {
                        // 普通选项逻辑
                        setSensorValue(v);
                        // 检查是否所有普通选项都被选中
                        const isAllSelected = allOptionIds.every((id) =>
                          v.includes(id)
                        );
                        if (isAllSelected) {
                          // 全部普通选项已选中，自动勾选全选
                          setSensorValue([0]);
                          setSeries(d || []);
                        } else {
                          // 未全选，仅显示当前选中项
                          setSeries(
                            d?.filter(
                              (s) =>
                                v.includes(s.id) && seriesValue == s.structure
                            ) || []
                          );
                        }
                      }
                      // 如果没有选中任何项，恢复默认状态
                      if (!v.length) {
                        setSeries(d || []);
                      }
                      // setSensorValue(v)
                      // let data = strucSeries?.sensor?.filter(s => (!v.length > 0 || v.includes(s.id)) && seriesValue == s.structure)
                      // setSeries(data || [])
                    }}
                  />
                </div>
                <ReactECharts
                  onChartReady={handleChartReady}
                  option={{
                    title: {
                      text: "数据连续率",
                    },
                    grid: {
                      left: 30,
                      right: 30,
                      bottom: 20,
                    },
                    tooltip: {
                      trigger: "axis",
                      // triggerOn: 'mousemove',
                      enterable: true,
                      // extraCssText:'height:400px;overflow:auto;',
                      formatter: function (params) {
                        return `<div id="continuous-rate-custom-tooltip" style="width:600px;height: 400px;overflow:auto"></div>`;
                      },
                      // formatter: function (params) {
                      //     console.log('params',params)
                      //     // 自定义提示框内容
                      //     let title = params[0]?.data[0] + '<br/>' + '<br/>'
                      //     params.forEach(v => {
                      //         let find = series?.find(s => s.name == v.seriesName) || {}
                      //         let findOne = find?.series?.find(d => moment(d.collect_time).format('YYYY-MM-DD HH') == v.data[0]) || {}
                      //         title = title + find?.name + "：" + "&nbsp" + "&nbsp" + v.data[1] * 100 + "%" + "（" + (findOne?.num || 0) + "/" + (findOne?.max || findOne?.num || 0) + "）" + '<br/>'
                      //     })
                      //     return title
                      // }
                    },
                    xAxis: {
                      type: "time",
                      // name: "时间",
                      boundaryGap: false,
                      minInterval: 1000 * 60 * 60,
                    },
                    yAxis: {
                      type: "value",
                      name: "单位%",
                      areaStyle: {
                        color: "#FFF",
                      },
                    },
                    series:
                      series?.map((v) => ({
                        type: "line",
                        name: v.name,
                        smooth: true,
                        areaStyle: {
                          color: "#0e9cff26",
                        },
                        data:
                          v.series?.map((f) => [
                            moment(f.collect_time).format("YYYY-MM-DD HH"),
                            Number(f.cont),
                          ]) || [],
                      })) || [],
                  }}
                  notMerge={true}
                  lazyUpdate={true}
                  style={{ width: "100%", height: "100%" }}
                />
              </div>
            </div>
          </div>
        </div>
      }

      {/* 设置弹窗 */}
      {setup && (
        <Setup
          tableType={tableType}
          tableList={tableSetup}
          layout={long}
          data={setData}
          close={() => {
            setSetup(false);
            attribute(tableType);
            setTableType("");
            setLong("");
          }}
        />
      )}
    </>
  );
};

function mapStateToProps(state) {
  const {
    auth,
    global,
    members,
    webSocket,
    ProjectPoms,
    statisticOnline,
    strucSeries,
  } = state;

  return {
    user: auth.user,
    actions: global.actions,
    pepProjectId: global.pepProjectId,
    socket: webSocket.socket,
    projectPoms: ProjectPoms?.data?.rows,
    statisticOnline: statisticOnline?.data || [],
    strucSeries: strucSeries?.data || [],
  };
}

export default connect(mapStateToProps)(AlarmChart);
