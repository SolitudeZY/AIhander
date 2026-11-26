import React, { useEffect, useState, useRef } from "react";
import { connect } from "react-redux";
import { Timeline, Card, Button, Modal, Form, Tooltip } from 'antd';
import { push } from "react-router-redux";
import "./control.less";
import PerfectScrollbar from "perfect-scrollbar";
import repairFQA from "../../means/containers/repairFQA";
import { Setup } from "$components";
import ReactECharts from "echarts-for-react";
import moment from "moment";
import SimpleBar from "simplebar-react";
import AlarmChart from "../components/alarm-chart";

let newScrollbar;
let overviewScrollbar;
let memberScrollbar;
let equipmentScrollbar;
let webScrollbar;
let problemsScrollbar;
let alarmScrollbar;
let pomsListScrollbar;
let problems;
let member;
let web;

const Control = ({
  dispatch,
  actions,
  user,
  history,
  loading,
  socket,
  pepProjectId,
  projectPoms,
}) => {
  const { control, install } = actions;
  const [memberList, setMemberList] = useState([]); //相关成员列表
  const [equipmentList, setEquipmentList] = useState([
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
  ]); //平台设备接入列表
  const [webList, setWebList] = useState([]); //关联web应用列表
  const [problemsList, setProblemsList] = useState([]); //异常&问题列表
  const [setup, setSetup] = useState(false); //设置是否显现
  const [tableType, setTableType] = useState(""); //localStorage存储名
  const [tool, setTool] = useState(false); //工具添加修改弹窗
  const [alter, setAlter] = useState(false); //工具添加或编辑
  const [compile, setCompile] = useState({}); //工具编辑的内容
  const [toolShow, setToolShow] = useState([]); //工具展示
  const [toolData, setToolData] = useState(0); //工具数
  const [tableSetup, setTableSetup] = useState([]); //单一表格设置信息
  const [workData, setWorkData] = useState({}); //我的工作台数据
  const [dataBI, setDataBI] = useState({}); //查询BI分析数据-数据
  const [videoBI, setVideoBI] = useState([]); //查询BI分析数据-视频
  const [appBI, setAppBI] = useState([]); //查询BI分析数据-应用
  const [efficiencyBI, setEfficiencyBI] = useState({}); //查询BI分析数据-问题处置
  const [query, setQuery] = useState({
    limit: 23,
    page: 0,
    projectCorrelationId: "",
    types: "1",
  }); //最新动态
  const [querydata1, setQueryData1] = useState([]); //最新动态数据
  const [long, setLong] = useState(""); //最新动态设置
  const [pomsList, setPomsList] = useState([]); //项目
  const [projectId, setProjectId] = useState(""); //项目id
  const [ask, setASk] = useState(true); //是否继续请求
  const [setData, setSetData] = useState(); //设置总数
  const [projectData, setProjectData] = useState([]); //项目总信息
  const [socketData, setSocketData] = useState(); //推送数据
  const [socketDat] = useState(); //推送数据

  const exhibition = useRef({ workbench: [], statistical: [] }); //页面结构
  const FormApi = useRef();
  const querydata = useRef([]); //最新动态数据
  // const socketData = useRef(1)  //推送数据

  // websocket 使用测试
  useEffect(() => {
    if (socket) {
      socket.on("alarmSendSocket", (msg) => {
        if (msg?.msgDataMap) {
          setSocketData(msg?.msgDataMap);
        }
      });
      return () => {
        socket.off("alarmSendSocket");
      };
    }
  }, [socket]);

  useEffect(() => {
    if (socketData) {
      let workbench = workData;
      let newest = [];
      let ProblemAlarm = [];

      if (socketData?.appear?.length > 0) {
        socketData?.appear?.map((v) => {
          if (v.type == "应用异常") {
            workbench.appNewAdd++;
          } else if (v.type == "设备异常") {
            workbench.toolNewAdd++;
          } else {
            workbench.dataNewAdd++;
          }
          ProblemAlarm.push({
            ...v,
            url: v.alarmGroup,
            groupName: v.type,
            SourceName: v.source,
            StartTime: v.time,
            typeName: v.alarmGroup,
          });
          if (exhibition?.current?.dynamic?.find((v) => v.key == "discovery")) {
            newest.push({
              seed: "discovery",
              project: v.project,
              sources: v.source,
              type: v.type,
              time: v.time,
              id: v.id,
            });
          }
        });
      }
      if (socketData?.confirm?.length > 0) {
        socketData?.confirm?.map((v) => {
          if (v.type == "应用异常") {
            workbench.appConfirme++;
          } else if (v.type == "设备异常") {
            workbench.toolConfirme++;
          } else {
            workbench.dataConfirme++;
          }
          if (exhibition?.current?.dynamic?.find((v) => v.key == "confirm")) {
            newest.push({
              seed: "confirm",
              project: v.project,
              sources: v.source,
              type: v.type,
              time: v.time,
              userName: v.user ? "" : v.user,
              id: v.id,
            });
          }
        });
        dispatch(
          control.getConsoleAbnormal({
            pepProjectId: pepProjectId || projectId,
          })
        ).then((res) => {
          if (res.success) {
            if (res.payload.data?.length > 4) {
              setProblemsList([...res.payload.data, ...res.payload.data]);
              let problemstop = 0;
              let problemsId = document.getElementById("problems");
              if (problems) clearInterval(problems);
              if (problemsId) {
                function problemstart() {
                  problems = setInterval(() => {
                    problemstop += 5;
                    problemsId.scrollTop = problemstop;
                    if (problemsId.scrollTop >= problemsId.scrollHeight / 2)
                      (problemstop = 0), (problemsId.scrollTop = problemstop);
                  }, 500);
                  problemsId.onmouseover = () => clearInterval(problems);
                }
                problemsId.onmouseout = () => problemstart();
                setTimeout(problemstart(), 1000);
              }
            } else {
              setProblemsList(res.payload.data);
            }
          }
        });
      } else {
        if (ProblemAlarm?.length > 0) {
          ProblemAlarm.sort((a, b) =>
            moment(a.StartTime).isBefore(b.StartTime) ? 1 : -1
          );
          setProblemsList([...ProblemAlarm, ...problemsList]);
        }
      }
      workbench.appSurplus += workbench.appNewAdd - workbench.appConfirme;
      workbench.videoSurplus += workbench.videoNewAdd - workbench.videoConfirme;
      workbench.dataSurplus += workbench.dataNewAdd - workbench.dataConfirme;

      setWorkData({ ...workbench });
      if (socketData?.notice?.length > 0) {
        socketData?.notice?.map((v) => {
          if (
            exhibition?.current?.dynamic?.find((v) => v.key == "notice") &&
            pomsList
              ?.map((u) => u.pepProjectId)
              ?.includes(v.projectCorrelationId)
          ) {
            newest.push({
              seed: "notice",
              time: v.time,
              project: v.project,
              userName: v.pepUsers?.map((u) => u.name),
              alarmPushConfig: v.pushConfig?.cfgName,
              tactics: v.pushConfig?.tactics,
              interval: v.pushConfig?.tacticsParams?.interval,
              deviceProportion: v.pushConfig?.tacticsParams?.deviceProportion,
              id: v.projectCorrelationId,
            });
          }
        });
      }
      newest.sort((a, b) => (moment(a.time).isBefore(b.time) ? 1 : -1));
      querydata.current = [...newest, ...querydata.current];
      setQueryData1([...querydata.current]);
    }
  }, [socketData]);

  useEffect(() => {
    if (projectPoms) {
      setProjectData(projectPoms?.filter((v) => v.pepProjectIsDelete != 1));
      let data = projectPoms
        ?.filter((v) => v.pepProjectIsDelete != 1)
        ?.map((v) => ({
          pepProjectId: v.id,
          pepProjectName: v.pepProjectName || v.name,
        }));
      setPomsList(data);
      setProjectId(projectPoms[0]?.pepProjectId);
    }
  }, [projectPoms]);

  useEffect(() => {
    //初始化表格显示设置
    let data = [
      "overall_new",
      "workbench",
      "statistical",
      "analyse",
      "dynamic",
    ];
    localStorage.getItem("overall") ? localStorage.removeItem("overall") : "";
    data.map((v) => {
      localStorage.getItem(v) == null
        ? localStorage.setItem(v, JSON.stringify(show[v]))
        : "";
      attribute(v);
    });

    return () => {};
  }, []);

  useEffect(() => {
    if (pepProjectId) setProjectId(pepProjectId);
    // 工作台数据请求
    dispatch(control.getConsoleCount({ pepProjectId: pepProjectId })).then(
      (res) => {
        if (res.success) setWorkData(res.payload.data);
      }
    );
  }, [pepProjectId]);

  useEffect(() => {
    if (exhibition.current?.overall_new?.find((v) => v.key == "tool")) {
      consoleToollink();
    }
  }, [exhibition.current]);
  useEffect(() => {
    async function concentration2() {
      if (exhibition.current?.overall_new?.find((v) => v.key == "analyse")) {
        // 查询BI分析数据-数据
        await dispatch(
          control.getDataAlarmsAggDay({ pepProjectId: pepProjectId })
        ).then((res) => {
          if (res.success) setDataBI(res.payload.data);
        });
        // 查询BI分析数据-视频异常
        await dispatch(
          control.getVideoAlarmsAggDay({ pepProjectId: pepProjectId })
        ).then((res) => {
          if (res.success) setVideoBI(res.payload.data);
        });
        // 查询BI分析数据-应用
        await dispatch(
          control.getAppAlarmsAggDay({ pepProjectId: pepProjectId })
        ).then((res) => {
          if (res.success) setAppBI(res.payload.data);
        });
        await dispatch(
          control.getAlarmsHandleStatistics({
            projectCorrelationId: pepProjectId,
          })
        ).then((res) => {
          if (res.success) setEfficiencyBI(res.payload.data[0]);
        });
      }
    }
    concentration2();
  }, [pepProjectId, exhibition.current]);

  useEffect(() => {
    async function concentration4() {
      // 统计概览--异常&问题
      await dispatch(
        control.getConsoleAbnormal({ pepProjectId: pepProjectId || projectId })
      ).then((res) => {
        if (res.success) {
          if (res.payload.data?.length > 4) {
            setProblemsList([...res.payload.data, ...res.payload.data]);
            let problemstop = 0;
            let problemsId = document.getElementById("problems");
            if (problems) clearInterval(problems);
            if (problemsId) {
              function problemstart() {
                problems = setInterval(() => {
                  problemstop += 5;
                  problemsId.scrollTop = problemstop;
                  if (problemsId.scrollTop >= problemsId.scrollHeight / 2)
                    (problemstop = 0), (problemsId.scrollTop = problemstop);
                }, 500);
                problemsId.onmouseover = () => clearInterval(problems);
              }
              problemsId.onmouseout = () => problemstart();
              setTimeout(problemstart(), 1000);
            }
          } else {
            setProblemsList(res.payload.data);
          }
        }
      });
      // 统计概览--相关成员与web应用
      await dispatch(
        control.getConsoleUser({ pepId: pepProjectId || projectId })
      ).then((res) => {
        if (res.success) {
          // if (res.payload.data?.personnel?.length > 5) {
          //    setMemberList([...res.payload.data?.personnel, ...res.payload.data?.personnel])

          //    let membertop = 0
          //    let memberId = document.getElementById('member');
          //    if (member) clearInterval(member)
          //    if (memberId) {
          //       function startmember () {
          //          member = setInterval(() => {
          //             membertop += 5
          //             memberId.scrollTop = membertop
          //             if (memberId.scrollTop >= memberId.scrollHeight / 2) membertop = 0, memberId.scrollTop = membertop
          //          }, 500);
          //          memberId.onmouseover = () => clearInterval(member)
          //       }
          //       memberId.onmouseout = () => startmember()
          //       setTimeout(startmember(), 1000);
          //    }
          // } else {
          setMemberList(res.payload.data?.personnel);
          // }
          // if (res.payload.data?.webApp?.length > 3) {
          //    setWebList([...res.payload.data?.webApp, ...res.payload.data?.webApp])
          //    let webtop = 0
          //    let webId = document.getElementById('web');
          //    if (web) clearInterval(web)
          //    if (webId) {
          //       function webstart () {
          //          member = setInterval(() => {
          //             webtop += 5
          //             webId.scrollTop = webtop
          //             if (webId.scrollTop >= webId.scrollHeight / 2) webtop = 0, webId.scrollTop = webtop
          //          }, 500);
          //          webId.onmouseover = () => clearInterval(web)
          //       }
          //       webId.onmouseout = () => webstart()
          //       setTimeout(webstart(), 1000);
          //    }
          // } else {
          setWebList(res.payload.data?.webApp);
          // }
        }
      });
    }
    if (exhibition.current?.overall_new?.find((v) => v.key == "statistical")) {
      concentration4();
    }
  }, [projectId, exhibition.current]);

  useEffect(() => {
    //查询最新动态
    async function concentration3() {
      if (exhibition?.current?.dynamic?.length > 0) {
        let type = [];
        if (exhibition?.current?.dynamic?.find((v) => v.key == "discovery"))
          type.push(1);
        if (exhibition?.current?.dynamic?.find((v) => v.key == "confirm"))
          type.push(4);
        if (exhibition?.current?.dynamic?.find((v) => v.key == "notice"))
          type.push(2);
        setQuery({ ...query, page: 0 });
        await dispatch(
          control.getLatestDynamic({
            ...query,
            projectCorrelationId: pepProjectId,
            page: 0,
            types: type.join(","),
          })
        ).then((res) => {
          if (
            res.payload.data?.appear?.length ||
            0 +
              res.payload.data?.confirm?.length +
              res.payload.data?.notice?.length <
              10
          )
            setASk(false);
          let data = [];
          if (res.success) {
            if (
              exhibition?.current?.dynamic?.find((v) => v.key == "discovery")
            ) {
              res.payload.data?.appear?.map((v) =>
                data.push({
                  seed: "discovery",
                  project: v.projectName,
                  sources: v.alarmInfo?.sourceName,
                  type: v.type,
                  time: v.time,
                  id: v.id,
                })
              );
            }
            if (exhibition?.current?.dynamic?.find((v) => v.key == "confirm")) {
              res.payload.data?.confirm?.map((v) =>
                data.push({
                  seed: "confirm",
                  project: v.projectName,
                  sources: v.alarmInfo?.source,
                  type: v.alarmInfo?.type,
                  time: v.confirmTime,
                  userName: v.userName == "自动恢复" ? "" : v.userName,
                  id: v.id,
                })
              );
            }
            if (exhibition?.current?.dynamic?.find((v) => v.key == "notice")) {
              // EM 推送
              res.payload.data?.notice?.map((v) =>
                data.push({
                  seed: "notice",
                  time: v.time,
                  project: v.projectName,
                  userName: v.userName?.map((u) => u.name),
                  alarmPushConfig: v.alarmPushConfig?.name,
                  tactics: v.tactics,
                  interval: v.tacticsParams?.interval,
                  deviceProportion: v.tacticsParams?.deviceProportion,
                  id: v.id,
                })
              );
            }
            data.sort((a, b) => (moment(a.time).isBefore(b.time) ? 1 : -1));
            querydata.current = data;
            setQueryData1(data);
          }
        });
      }
    }

    if (exhibition.current?.overall_new?.find((v) => v.key == "dynamic")) {
      concentration3();
    }

    const domProject1 = document.getElementById("overviewCalc");
    if (domProject1) {
      overviewScrollbar = new PerfectScrollbar("#overviewCalc", {
        suppressScrollY: true,
      });
    }
    const pomsList = document.getElementById("pomsList");
    if (pomsList) {
      pomsListScrollbar = new PerfectScrollbar("#pomsList", {
        suppressScrollX: true,
      });
    }
    const domProject5 = document.getElementById("problems");
    if (domProject5) {
      problemsScrollbar = new PerfectScrollbar("#problems", {
        suppressScrollX: true,
      });
    }
    const domProject = document.getElementById("news");
    if (domProject) {
      newScrollbar = new PerfectScrollbar("#news", {
        suppressScrollX: true,
      });
    }
    const domProject3 = document.getElementById("equipment");
    if (domProject3) {
      equipmentScrollbar = new PerfectScrollbar("#equipment", {
        suppressScrollX: true,
      });
    }

    const domProject4 = document.getElementById("web");
    if (domProject4) {
      webScrollbar = new PerfectScrollbar("#web", {
        suppressScrollX: true,
      });
    }

    const domProject6 = document.getElementById("alarm");
    if (domProject6) {
      alarmScrollbar = new PerfectScrollbar("#alarm", {
        suppressScrollY: true,
      });
    }
  }, [pepProjectId, exhibition.current]);

  useEffect(() => {
    const line = document.getElementById("line");
    const news = document.getElementById("news");
    if (line && news) {
      news.onscroll = (e) => {
        e.stopPropagation();
        if (line.clientHeight - 565 < news.scrollTop + 10) {
          setQuery({ ...query, page: query.page + 1 });
          if (exhibition?.current?.dynamic?.length > 0) {
            dispatch(
              control.getLatestDynamic({
                ...query,
                projectCorrelationId: pepProjectId,
                page: query.page + 1,
              })
            ).then((res) => {
              // news.scrollTop = news.scrollTop - 640
              let data = querydata.current;
              if (res.success) {
                let returnJudge = true;
                for (let k in res.payload.data) {
                  if (res.payload.data[k].length) {
                    returnJudge = false;
                    break;
                  }
                }
                if (returnJudge) {
                  return;
                }

                if (
                  exhibition?.current?.dynamic?.find(
                    (v) => v.key == "discovery"
                  )
                ) {
                  res.payload.data?.appear?.map((v) =>
                    data.push({
                      seed: "discovery",
                      project: v.projectName,
                      sources: v.alarmInfo?.sourceName,
                      type: v.type,
                      time: v.time,
                      id: v.id,
                    })
                  );
                }
                if (
                  exhibition?.current?.dynamic?.find((v) => v.key == "confirm")
                ) {
                  res.payload.data?.confirm?.map((v) =>
                    data.push({
                      seed: "confirm",
                      project: v.projectName,
                      sources: v.alarmInfo?.source,
                      type: v.alarmInfo?.type,
                      time: v.confirmTime,
                      userName: v.userName,
                      id: v.id,
                    })
                  );
                }
                if (
                  exhibition?.current?.dynamic?.find((v) => v.key == "notice")
                ) {
                  res.payload.data?.notice?.map((v) =>
                    data.push({
                      seed: "notice",
                      time: v.time,
                      project: v.projectName,
                      userName: v.userName?.map((u) => u.name),
                      alarmPushConfig: v.alarmPushConfig?.name,
                      tactics: v.tactics,
                      interval: v.tacticsParams?.interval,
                      deviceProportion: v.tacticsParams?.deviceProportion,
                      id: v.id,
                    })
                  );
                }
                data.sort((a, b) => (moment(a.time).isBefore(b.time) ? 1 : -1));
                querydata.current = data;
                setQueryData1(data);
              }
            });
          }
        }
      };
    }
  }, [query]);

  useEffect(() => {
    const domProject = document.getElementById("news");
    if (domProject) {
      if (domProject && newScrollbar) {
        newScrollbar.update();
      }
    }

    const pomsList = document.getElementById("pomsList");
    if (pomsList) {
      if (pomsList && pomsListScrollbar) {
        pomsListScrollbar.update();
      }
    }

    const domProject2 = document.getElementById("member");
    if (domProject2) {
      if (domProject2 && memberScrollbar) {
        memberScrollbar.update();
      }
    }

    const domProject3 = document.getElementById("equipment");
    if (domProject3) {
      if (domProject3 && equipmentScrollbar) {
        equipmentScrollbar.update();
      }
    }

    const domProject4 = document.getElementById("web");
    if (domProject4) {
      if (domProject4 && webScrollbar) {
        webScrollbar.update();
      }
    }

    const domProject5 = document.getElementById("problems");
    if (domProject5) {
      if (domProject5 && problemsScrollbar) {
        problemsScrollbar.update();
      }
    }

    const domProject6 = document.getElementById("alarm");
    if (domProject6) {
      if (domProject6 && alarmScrollbar) {
        alarmScrollbar.update();
      }
    }
  });

  const consoleToollink = () => {
    dispatch(control.getConsoleToollink()).then((res) => {
      if (res.success) {
        setToolShow(res.payload.data);
        setToolData(res.payload.data?.length);
      }
    });
  };

  let Select = {
    overall_new: [
      "workbench",
      "statistical",
      "dataAnalyse",
      "analyse",
      "dynamic",
      "tool",
    ],
    workbench: ["project", "data", "app", "device"],
    statistical: ["milestone", "personnel", "DeviceAccess", "web", "problem"],
    analyse: [
      "dataInterrupt",
      "dataAbnormal",
      "policyHit",
      "videoException",
      "appAbnormal",
      "deviceAbnormal",
      "problemAnalysis",
    ],
    dynamic: ["discovery", "notice", "handle", "confirm"],
  };
  let show = {
    overall_new: ["workbench", "dataAnalyse"],
    workbench: ["project", "data", "app", "device"],
    statistical: ["milestone", "personnel", "web", "problem"],
    analyse: [
      "dataInterrupt",
      "dataAbnormal",
      "policyHit",
      "videoException",
      "appAbnormal",
      "deviceAbnormal",
      "problemAnalysis",
    ],
    dynamic: ["discovery", "notice", "confirm"],
  };

  let listAll = [
    {
      name: "关注的项目",
      sort: 1,
      key: "project",
      data: workData?.projects || 0,
      img: "url(/assets/images/console/lan_1.png)",
    },
    {
      name: "数据告警",
      sort: 2,
      key: "data",
      data: workData?.dataSurplus || 0,
      img: "url(/assets/images/console/lv_1.png)",
      url: "/problem/dataAlarm/dataLnterrupt",
    },
    {
      name: "应用告警",
      sort: 2,
      key: "app",
      data: workData?.appSurplus || 0,
      img: "url(/assets/images/console/hong_1.png)",
      url: "/problem/useAlarm/useAbnormal",
    },
    {
      name: "视频告警",
      sort: 2,
      key: "device",
      data: workData?.videoSurplus || 0,
      img: "url(/assets/images/console/hong_1.png)",
      url: "/problem/useAlarm/videoAbnormal",
    },

    { name: "项目里程碑", sort: 1, key: "milestone" },
    { name: "相关成员", sort: 2, key: "personnel" },
    { name: "平台设备接入", sort: 3, key: "DeviceAccess" },
    { name: "关联web应用", sort: 4, key: "web" },
    { name: "异常&问题", sort: 5, key: "problem" },

    { name: "数据中断", sort: 1, key: "dataInterrupt" },
    { name: "数据异常", sort: 2, key: "dataAbnormal" },
    { name: "策略命中", sort: 3, key: "policyHit" },
    { name: "视频异常", sort: 4, key: "videoException" },
    { name: "应用异常", sort: 5, key: "appAbnormal" },
    { name: "设备异常", sort: 6, key: "deviceAbnormal" },
    { name: "问题处置效率分析", sort: 7, key: "problemAnalysis" },

    { name: "发现：系统主动感知到的异常问题动态", sort: 1, key: "discovery" },
    {
      name: "通知：系统通过邮件、短信、企业微信等方式通知到运维人员的动态",
      sort: 2,
      key: "notice",
    },
    { name: "处置：工单信息处理流程的动态", sort: 3, key: "handle" },
    { name: "确认：完结状态的信息动态", sort: 4, key: "confirm" },

    { name: "我的工作台", sort: 1, key: "workbench" },
    { name: "统计概览", sort: 2, key: "statistical" },
    { name: "数据分析", sort: 3, key: "dataAnalyse" },
    { name: "BI分析模块", sort: 4, key: "analyse" },
    { name: "最新动态", sort: 5, key: "dynamic" },
    { name: "我常用的工具", sort: 6, key: "tool" },
  ];

  useEffect(() => {
    attribute("workbench");
  }, [workData]);

  const attribute = (title) => {
    let take = localStorage.getItem(title)
      ? JSON.parse(localStorage.getItem(title))
      : [];
    let data = Select[title].map((v) => {
      let dataTitle = listAll.find((vv) => v == vv.key) || {};
      return { name: dataTitle.name, value: dataTitle.key };
    });
    let TableDisplay = take?.map((v) => listAll?.find((vv) => v == vv.key));
    TableDisplay.sort((a, b) => a.sort - b.sort);
    exhibition.current = { ...exhibition.current, [title]: TableDisplay };
    setTableSetup([{ list: data }]);
  };

  return (
    <>
      <div style={{ padding: "0px 40px", width: "100%" }} className="console">
        {/* 头部 */}
        <div
          style={{
            margin: "4px 0px 14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center" }}>
            <div style={{ color: "#4A4A4A", fontSize: 14 }}>HI，欢迎回来，</div>
            <div
              style={{
                fontFamily: "YouSheBiaoTiHei",
                fontSize: 20,
                color: "#005ABD",
                marginLeft: 4,
              }}
            >
              {user?.name}
            </div>
          </div>
          <div style={{ width: 25, height: 25, cursor: "pointer",display:"none" }}>
            <img
              src="/assets/images/console/icon_all.png"
              alt=""
              style={{ width: "100%", height: "100%" }}
              onClick={() => {
                // setSetup(true)
                // setTableType('overall_new')
                // attribute('overall_new')
                // setSetData(6)
              }}
            />
          </div>
        </div>
        {/* 主体 */}
        <div style={{ display: "flex", width: "100%" }}>
          {/* 左边 */}
          <div
            style={{
              width: exhibition.current?.overall_new?.find(
                (v) => v.key == "dynamic" || v.key == "tool"
              )
                ? "calc(100% - 434px)"
                : "calc(100%)",
            }}
          >
            {/* 工作台和统计概览 */}
            <div
              style={{
                background: "#FFFFFF",
                boxShadow: "0px 0px 12px 2px rgba(220,222,224,0.2)",
                borderRadius: 2,
                padding: "20px 24px",
              }}
            >
              {/* 我的工作台 */}
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
                    我的工作台
                  </div>
                  <div
                    style={{
                      marginLeft: 6,
                      fontSize: 12,
                      color: "#969799",
                      fontFamily: "DINExp",
                    }}
                  >
                    MY WORK STATION
                  </div>
                </div>
                <div style={{ marginRight: 25 }}>
                  <img
                    title="设置"
                    src="/assets/images/problem/setup.png"
                    style={{ width: 18, height: 18, cursor: "pointer" }}
                    onClick={() => {
                      setSetup(true);
                      setTableType("workbench");
                      attribute("workbench");
                      setSetData(4);
                    }}
                  />
                </div>
              </div>
              <div style={{ marginTop: 30, display: "flex" }}>
                <div style={{ marginTop: 20, marginLeft: 36 }}>
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <div style={{ width: 120, fontSize: 14, color: "#969799" }}>
                      剩余问题:
                    </div>
                    <div style={{ fontSize: 16, color: "#4A4A4A", width: 91 }}>
                      {workData?.appSurplus +
                        workData?.dataSurplus +
                        workData.videoSurplus || 0}
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      marginTop: 26,
                    }}
                  >
                    <div style={{ width: 120, fontSize: 14, color: "#969799" }}>
                      今日新增问题:
                    </div>
                    <div
                      style={{
                        fontSize: 16,
                        color: "#4A4A4A",
                        width: 91,
                        display: "flex",
                      }}
                    >
                      <div>
                        {workData?.appNewAdd +
                          workData?.dataNewAdd +
                          workData.dataNewAdd || 0}
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          marginLeft: 4,
                        }}
                      >
                        <img
                          title="设置"
                          src="/assets/images/console/icon_up.png"
                          style={{ width: 18, height: 18 }}
                        />
                      </div>
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      marginTop: 26,
                    }}
                  >
                    <div style={{ width: 120, fontSize: 14, color: "#969799" }}>
                      今日处理:
                    </div>
                    <div style={{ fontSize: 16, color: "#4A4A4A", width: 91 }}>
                      {workData?.appConfirme +
                        workData?.dataConfirme +
                        workData.dataConfirme || 0}
                    </div>
                  </div>
                </div>
                {/* 循环类型 */}
                <SimpleBar
                  style={{ width: "calc(100% - 240px)", whiteSpace: "nowrap" }}
                  forceVisible="x"
                >
                  {exhibition.current["workbench"]?.map((item, index) => {
                    return (
                      item &&
                      (pepProjectId && item.name == "关注的项目" ? (
                        ""
                      ) : (
                        <div
                          key={item.name}
                          style={{
                            background: item.img,
                            backgroundSize: "100% 100%",
                            display: "inline-block",
                            width: 270,
                            height: 135,
                            marginRight: 26,
                          }}
                        >
                          <div style={{ margin: "35px 0px 0px 134px" }}>
                            <div>
                              <span
                                style={{
                                  fontSize: 14,
                                  color: "#4A4A4A",
                                  fontWeight: 500,
                                  fontFamily: "PingFangSC-Medium, PingFang SC",
                                }}
                              >
                                {item.name}
                              </span>
                              <span style={{ fontSize: 12, color: "#4A4A4A" }}>
                                {item.name == "关注的项目"
                                  ? " ( 个 )"
                                  : " ( 条 )"}
                              </span>
                              {item.name == "关注的项目" ? (
                                ""
                              ) : (
                                <span
                                  style={{
                                    fontSize: 12,
                                    color: "#969799",
                                    marginLeft: 4,
                                  }}
                                >
                                  待处理
                                </span>
                              )}
                            </div>
                            <div
                              style={{
                                marginTop: 15,
                                display: "flex",
                                alignItems: "center",
                              }}
                            >
                              <div
                                onClick={() => dispatch(push(item.url))}
                                style={{
                                  fontSize: 32,
                                  color:
                                    index == 0
                                      ? "#0F7EFB"
                                      : index == 1
                                      ? "#0091A1"
                                      : index == 2
                                      ? "#FE9812"
                                      : "#FF7575",
                                  fontFamily: "YouSheBiaoTiHei",
                                  cursor: "pointer",
                                }}
                              >
                                {item.data}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    );
                  }) || null}
                </SimpleBar>
              </div>

              {/* 统计概览 */}
              {exhibition.current?.overall_new?.find(
                (v) => v.key == "statistical"
              ) ? (
                <>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginTop: 25,
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
                        统计概览
                      </div>
                      <div
                        style={{
                          marginLeft: 6,
                          fontSize: 12,
                          color: "#969799",
                          fontFamily: "DINExp",
                        }}
                      >
                        STATISTICAL OVERVIEW
                      </div>
                    </div>
                    <div style={{ marginRight: 25 }}>
                      <img
                        title="设置"
                        src="/assets/images/problem/setup.png"
                        style={{ width: 18, height: 18, cursor: "pointer" }}
                        onClick={() => {
                          setSetup(true);
                          setTableType("statistical");
                          attribute("statistical");
                          setSetData(5);
                        }}
                      />
                    </div>
                  </div>
                  {/* 统计概览 */}
                  <div
                    id="overviewCalc"
                    style={{ width: "calc(100%)", position: "relative" }}
                  >
                    <div style={{ display: "inline-flex", marginTop: 16 }}>
                      {/* 项目 */}
                      {pepProjectId ? (
                        ""
                      ) : (
                        <div
                          id="pomsList"
                          style={{
                            marginRight: 20,
                            paddingRight: 24,
                            position: "relative",
                            marginBottom: 30,
                            width: 410,
                            height: 221,
                            border: "1px solid rgba(220,222,224,0.2)",
                            boxShadow: "0px 2px 12px 1px #F2F3F5",
                            borderRadius: 2,
                          }}
                        >
                          {pomsList?.map((v, index) => {
                            return (
                              <div
                                key={"pomsList" + index}
                                title={v.pepProjectName}
                                style={{
                                  width: 400,
                                  cursor: "pointer",
                                  lineHeight: "30px",
                                  whiteSpace: "nowrap",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  fontSize: 14,
                                  color: "#969799",
                                  background:
                                    projectId == v.pepProjectId
                                      ? "linear-gradient(252deg, #F9FBFF 0%, rgb(185 202 236) 100%)"
                                      : "",
                                }}
                                onClick={() => setProjectId(v.pepProjectId)}
                              >
                                {v.pepProjectName}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* 项目里程碑 */}
                      {exhibition.current?.statistical?.find(
                        (v) => v.key == "milestone"
                      ) &&
                      projectId &&
                      projectData?.find((u) => u.id == projectId)
                        ?.pepProjectName ? (
                        <div
                          style={{
                            marginBottom: 30,
                            width: 466,
                            height: 221,
                            border: "1px solid rgba(220,222,224,0.2)",
                            boxShadow: "0px 2px 12px 1px #F2F3F5",
                            borderRadius: 2,
                          }}
                        >
                          <div
                            style={{
                              margin: "20px 0px 20px 24px",
                              color: "#4A4A4A",
                              fontSize: 16,
                              fontWeight: "bold",
                            }}
                          >
                            项目里程碑
                          </div>
                          <div
                            style={{
                              display: "flex",
                              marginBottom: 20,
                              marginLeft: 24,
                            }}
                          >
                            <div style={{ display: "flex" }}>
                              <div
                                style={{
                                  fontSize: 14,
                                  color: "#969799",
                                  marginRight: 4,
                                }}
                              >
                                立项时间：
                              </div>
                              <div
                                style={{
                                  fontSize: 14,
                                  color: "#4A4A4A",
                                  width: 104,
                                }}
                                title="项企项目数据为空或未开发"
                              >
                                暂无
                              </div>
                            </div>
                            <div style={{ display: "flex" }}>
                              <div
                                style={{
                                  fontSize: 14,
                                  color: "#969799",
                                  marginRight: 4,
                                }}
                              >
                                施工时间：
                              </div>
                              <div
                                style={{ fontSize: 14, color: "#4A4A4A" }}
                                title="项企项目数据为空或未开发"
                              >
                                暂无
                              </div>
                            </div>
                          </div>
                          <div
                            style={{
                              display: "flex",
                              marginBottom: 24,
                              marginLeft: 24,
                            }}
                          >
                            <div style={{ display: "flex" }}>
                              <div
                                style={{
                                  fontSize: 14,
                                  color: "#969799",
                                  marginRight: 4,
                                }}
                              >
                                内验时间：
                              </div>
                              <div
                                style={{
                                  fontSize: 14,
                                  color: "#4A4A4A",
                                  width: 104,
                                }}
                                title="项企项目数据为空或未开发"
                              >
                                暂无
                              </div>
                            </div>
                            <div style={{ display: "flex" }}>
                              <div
                                style={{
                                  fontSize: 14,
                                  color: "#969799",
                                  marginRight: 4,
                                }}
                              >
                                外验时间：
                              </div>
                              <div
                                style={{ fontSize: 14, color: "#4A4A4A" }}
                                title="项企项目数据为空或未开发"
                              >
                                暂无
                              </div>
                            </div>
                          </div>
                          <div
                            style={{
                              display: "flex",
                              marginBottom: 17,
                              marginLeft: 24,
                            }}
                          >
                            <div
                              style={{
                                fontSize: 14,
                                color: "#969799",
                                marginRight: 4,
                              }}
                            >
                              工程维保时间：
                            </div>
                            <div
                              style={{ fontSize: 14, color: "#4A4A4A" }}
                              title="项企项目数据为空或未开发"
                            >
                              暂无
                            </div>
                          </div>
                          <div
                            style={{
                              display: "flex",
                              background:
                                "linear-gradient(252deg, #F9FBFF 0%, #DBE7FF 100%)",
                              height: 38,
                              justifyContent: "space-between",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                marginLeft: 24,
                                alignItems: "center",
                              }}
                            >
                              <div
                                style={{
                                  fontSize: 14,
                                  color: "#646566",
                                  marginRight: 4,
                                }}
                              >
                                售后维修时间：
                              </div>
                              <div
                                style={{ fontSize: 14, color: "#4A4A4A" }}
                                title="项企项目数据为空或未开发"
                              >
                                暂无
                              </div>
                            </div>
                            {/* <img src="/assets/images/console/onGoing.png" alt="进行中" /> */}
                          </div>
                        </div>
                      ) : (
                        ""
                      )}
                      {/* 相关成员 */}
                      {exhibition.current?.statistical?.find(
                        (v) => v.key == "personnel"
                      ) ? (
                        <div
                          style={{
                            width: 360,
                            height: 221,
                            marginLeft: 20,
                            paddingLeft: 24,
                            border: "1px solid rgba(220,222,224,0.2)",
                            boxShadow: "0px 2px 12px 1px #F2F3F5",
                            borderRadius: 2,
                          }}
                        >
                          <div
                            style={{
                              margin: "20px 0px 17px 0px",
                              color: "#4A4A4A",
                              fontSize: 16,
                              fontWeight: "bold",
                            }}
                          >
                            相关成员
                          </div>
                          <SimpleBar
                            id="member"
                            style={{ height: 160 }}
                            forceVisible="y"
                          >
                            {/* <div id='member' style={{ position: 'relative', height: 161 }}> */}
                            {memberList?.map((item, index) => {
                              return (
                                <div
                                  key={index + "member"}
                                  style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    marginBottom: 15,
                                  }}
                                >
                                  <div
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                    }}
                                  >
                                    <div style={{ width: 18, height: 18 }}>
                                      <img
                                        src="/assets/images/console/member.png"
                                        alt="成员"
                                        style={{
                                          width: "100%",
                                          height: "100%",
                                        }}
                                      />
                                    </div>
                                    <div
                                      style={{
                                        marginLeft: 8,
                                        fontSize: 14,
                                        color: "#4A4A4A",
                                      }}
                                    >
                                      {item.name}
                                    </div>
                                    <div
                                      style={{ fontSize: 12, color: "#969799" }}
                                    >
                                      （负责人）
                                    </div>
                                  </div>
                                  <div
                                    style={{
                                      color: "#969799",
                                      fontSize: 14,
                                      marginRight: 22,
                                    }}
                                  >
                                    <Tooltip
                                      content={item.department?.map(
                                        (v, index) => (index > 0 ? "，" + v : v)
                                      )}
                                    >
                                      <div className="Tooltip" style={{}}>
                                        {item.department[0]}
                                      </div>
                                    </Tooltip>
                                  </div>
                                </div>
                              );
                            })}
                            {/* </div> */}
                          </SimpleBar>
                        </div>
                      ) : (
                        ""
                      )}
                      {/* 平台设备接入 */}
                      {exhibition.current?.statistical?.find(
                        (v) => v.key == "DeviceAccess"
                      ) ? (
                        <div
                          style={{
                            width: 360,
                            height: 221,
                            marginLeft: 20,
                            paddingLeft: 24,
                            border: "1px solid rgba(220,222,224,0.2)",
                            boxShadow: "0px 2px 12px 1px #F2F3F5",
                            borderRadius: 2,
                          }}
                        >
                          <div
                            style={{
                              margin: "20px 0px 17px 0px",
                              color: "#4A4A4A",
                              fontSize: 16,
                              fontWeight: "bold",
                              marginBottom: 16,
                            }}
                          >
                            平台设备接入
                          </div>
                          <div
                            id="equipment"
                            style={{ position: "relative", height: 161 }}
                          >
                            {equipmentList.map((item, index) => {
                              return (
                                <div
                                  key={index + "equipment"}
                                  style={{ marginBottom: 15, display: "flex" }}
                                >
                                  <div
                                    style={{
                                      color: "#969799",
                                      fontSize: 14,
                                      width: 167,
                                    }}
                                  >
                                    5阶ZK1高清摄球机
                                  </div>
                                  <div
                                    style={{
                                      color: "#4A4A4A",
                                      fontSize: 14,
                                      width: 81,
                                    }}
                                  >
                                    视频
                                  </div>
                                  <div
                                    style={{
                                      width: 18,
                                      height: 18,
                                      marginRight: 8,
                                    }}
                                  >
                                    <img
                                      src="/assets/images/console/icon_online.png"
                                      alt="网络"
                                      style={{ width: "100%", height: "100%" }}
                                    />
                                    {/* <img src="/assets/images/console/icon_offline.png" alt="网络"  style={{ width: '100%', height: '100%' }} /> */}
                                  </div>
                                  <div
                                    style={{ color: "#0F7EFB", fontSize: 14 }}
                                  >
                                    在线
                                  </div>
                                  {/* <div style={{color:'#969799',fontSize:14}}>
                                                        掉线
                                                    </div> */}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        ""
                      )}
                      {/* 关联web应用 */}
                      {exhibition.current?.statistical?.find(
                        (v) => v.key == "web"
                      ) ? (
                        <div
                          style={{
                            width: 360,
                            height: 221,
                            marginLeft: 20,
                            paddingLeft: 24,
                            border: "1px solid rgba(220,222,224,0.2)",
                            boxShadow: "0px 2px 12px 1px #F2F3F5",
                            borderRadius: 2,
                          }}
                        >
                          <div
                            style={{
                              margin: "20px 0px 17px 0px",
                              color: "#4A4A4A",
                              fontSize: 16,
                              fontWeight: "bold",
                              marginBottom: 15,
                            }}
                          >
                            关联web应用
                          </div>
                          <SimpleBar
                            id="member"
                            style={{ height: 160, paddindRight: 20 }}
                            forceVisible="y"
                          >
                            {webList.map((item, index) => {
                              return (
                                <div
                                  key={index + "webb"}
                                  style={{ marginBottom: 15 }}
                                >
                                  <div style={{ display: "flex" }}>
                                    <img
                                      style={{
                                        width: 18,
                                        height: 18,
                                        marginRight: 8,
                                      }}
                                      src="/assets/images/console/icon_webpage.png"
                                      alt="web应用"
                                    />
                                    <div
                                      style={{
                                        color: "#646566",
                                        fontSize: 14,
                                        borderBottom: "1px dotted #0F7EFB",
                                      }}
                                    >
                                      <a href={item.url} target="_blank">
                                        {item.url}
                                      </a>
                                    </div>
                                  </div>
                                  <div
                                    style={{
                                      color: "#4A4A4A",
                                      fontSize: 14,
                                      marginLeft: 26,
                                    }}
                                  >
                                    {item.name}
                                  </div>
                                </div>
                              );
                            })}
                          </SimpleBar>
                        </div>
                      ) : (
                        ""
                      )}
                      {/* 异常&问题 */}
                      {exhibition.current?.statistical?.find(
                        (v) => v.key == "problem"
                      ) ? (
                        <div
                          style={{
                            width: 399,
                            height: 221,
                            marginLeft: 20,
                            marginRight: 20,
                            paddingLeft: 24,
                            border: "1px solid rgba(220,222,224,0.2)",
                            boxShadow: "0px 2px 12px 1px #F2F3F5",
                            borderRadius: 2,
                          }}
                        >
                          <div
                            style={{
                              margin: "20px 0px 17px 0px",
                              color: "#4A4A4A",
                              fontSize: 16,
                              fontWeight: "bold",
                            }}
                          >
                            异常&问题
                          </div>
                          <div
                            id="problems"
                            style={{ position: "relative", height: 161 }}
                          >
                            {problemsList?.map((v, index) => {
                              return (
                                <div
                                  style={{ marginBottom: 15, paddingRight: 30 }}
                                  key={"problems" + index}
                                  onClick={() => {
                                    history.push({
                                      pathname: v.url,
                                      query: {
                                        keywordTarget:
                                          v.groupName == "应用异常"
                                            ? ""
                                            : "source",
                                        keyword: v.SourceName,
                                      },
                                    });
                                  }}
                                >
                                  <div
                                    style={{ fontSize: 14, color: "#646566" }}
                                  >
                                    【{v.SourceName}】{v.groupName}
                                    {v.groupName == "视频异常"
                                      ? ""
                                      : "，诊断为 "}{" "}
                                    <span
                                      style={{
                                        color: "#0F7EFB",
                                        borderBottom: "1px dotted #0F7EFB",
                                        cursor: "pointer",
                                      }}
                                    >
                                      {v.typeName}，请前往确认
                                    </span>
                                  </div>
                                  <div
                                    style={{
                                      color: "#969799",
                                      fontSize: 12,
                                      marginRight: 40,
                                      marginTop: 4,
                                    }}
                                  >
                                    {moment(v.StartTime).format(
                                      "YYYY-MM-DD HH:mm:ss"
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        ""
                      )}
                    </div>
                  </div>
                </>
              ) : (
                ""
              )}
            </div>

            {/* 图表 */}
            {exhibition.current?.overall_new?.find(
              (v) => v.key == "dataAnalyse"
            ) && <AlarmChart />}

            {/* BI分析模块 */}
            {exhibition.current?.overall_new?.find(
              (v) => v.key == "analyse"
            ) ? (
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
                      BI分析模块
                    </div>
                    <div
                      style={{
                        marginLeft: 6,
                        fontSize: 12,
                        color: "#969799",
                        fontFamily: "DINExp",
                      }}
                    >
                      BI ANAL YSIS MODEL
                    </div>
                  </div>
                  <div style={{ marginRight: 25 }}>
                    <img
                      title="设置"
                      src="/assets/images/problem/setup.png"
                      style={{ width: 18, height: 18, cursor: "pointer" }}
                      onClick={() => {
                        setSetup(true);
                        setTableType("analyse");
                        attribute("analyse");
                        setSetData(10);
                      }}
                    />
                  </div>
                </div>
                <div style={{ width: "100%", height: "100%" }}>
                  {exhibition.current?.analyse?.map((v, index) => {
                    let startValue = "";
                    if (v.key !== "problemAnalysis") {
                      switch (v.key) {
                        case "videoException":
                          let videos =
                            videoBI?.filter((u) =>
                              moment(
                                moment()
                                  .day(moment().day() - 30)
                                  .format("YYYY-MM-DD")
                              ).isBefore(u.day)
                            ) || [];
                          if (videos.length) {
                            startValue = videos[0]?.day;
                          } else {
                            startValue = videoBI?.slice(-1)[0]?.day;
                          }
                          break;
                        case "appAbnormal":
                          let apps =
                            appBI?.filter((u) =>
                              moment(
                                moment()
                                  .day(moment().day() - 30)
                                  .format("YYYY-MM-DD")
                              ).isBefore(u.day)
                            ) || [];
                          if (apps.length) {
                            startValue = apps[0]?.day;
                          } else {
                            startValue = appBI?.slice(-1)[0]?.day;
                          }
                          break;
                        default:
                          let datas =
                            dataBI[v.key]?.filter((u) =>
                              moment(
                                moment()
                                  .day(moment().day() - 30)
                                  .format("YYYY-MM-DD")
                              ).isBefore(u.day)
                            ) || [];
                          if (datas.length) {
                            startValue = datas[0]?.day;
                          } else {
                            startValue = dataBI[v.key]?.slice(-1)[0]?.day;
                          }
                          break;
                      }
                    }
                    return v.key == "problemAnalysis" ? (
                      <div
                        id={"ReactECharts" + index}
                        style={{
                          marginTop: 20,
                          padding: 10,
                          width: "50%",
                          display: "inline-block",
                        }}
                      >
                        <ReactECharts
                          option={{
                            title: {
                              text: v.name + " (每周更新) ",
                              subtext:
                                "上次更新: " +
                                moment(efficiencyBI?.time).format(
                                  "YYYY-MM-DD HH:mm:ss"
                                ),
                              textStyle: {
                                fontSize: 18,
                              },
                              subtextStyle: {
                                fontSize: 12,
                                color: "#FE9812",
                              },
                            },
                            grid: {
                              show: false,
                              left: "10%",
                              // right: '4%',
                              // bottom: '3%',
                              // containLabel: true
                            },
                            xAxis: {
                              type: "category",
                              name: "时间",
                              boundaryGap: true,
                              deduplication: null,
                              data: [
                                "当日处理",
                                "3日内",
                                "7日内",
                                "15日内",
                                "30日内",
                                "超过30日",
                              ],
                            },
                            yAxis: {
                              min: 0,
                              max: 100,
                              type: "value",
                              axisLabel: {
                                show: true,
                                interval: 0,
                                formatter: "{value}%",
                              },
                            },
                            series: [
                              {
                                data: [
                                  efficiencyBI?.day1,
                                  efficiencyBI?.day3,
                                  efficiencyBI?.day7,
                                  efficiencyBI?.day15,
                                  efficiencyBI?.day30,
                                  efficiencyBI?.day30m,
                                ],
                                type: "bar",
                                name: v.name,
                                smooth: true,
                                barWidth: "30%",
                                label: {
                                  normal: {
                                    show: true,
                                    position: "top",
                                  },
                                },
                                areaStyle: {
                                  color: "#0F7EFB",
                                },
                                emphasis: {
                                  color: "#E8F3FF",
                                },
                                // data: []
                              },
                            ],
                          }}
                          notMerge={true}
                          lazyUpdate={true}
                          theme={"ReactEChart" + index}
                          // onChartReady={this.onChartReadyCallback}
                          // onEvents={EventsDict}
                          // opts={}
                        />
                      </div>
                    ) : (
                      <div
                        id={"ReactECharts" + index}
                        style={{
                          marginTop: 20,
                          padding: 10,
                          width: "50%",
                          display: "inline-block",
                        }}
                      >
                        <ReactECharts
                          option={{
                            title: {
                              text: v.name,
                            },
                            grid: {
                              left: "10%",
                              // right: '4%',
                              // bottom: '3%',
                              // containLabel: true
                            },
                            dataZoom: [
                              {
                                type: "slider",
                                startValue: startValue,
                              },
                              {
                                type: "inside",
                              },
                            ],
                            tooltip: {
                              trigger: "axis",
                            },
                            legend: {
                              data: [v.name, "已处理（含自动恢复）"],
                              right: "10%",
                            },
                            xAxis: {
                              type: "category",
                              name: "时间",
                              boundaryGap: false,
                              data:
                                v.key == "videoException"
                                  ? videoBI?.map((u) => u.day)
                                  : v.key == "appAbnormal"
                                  ? appBI?.map((u) => u.day)
                                  : dataBI[v.key]?.map((u) => u.day) || [],
                            },
                            yAxis: {
                              type: "value",
                              name: "条数",
                            },
                            series: [
                              {
                                type: "line",
                                name: v.name,
                                smooth: true,
                                areaStyle: {
                                  color: "#0e9cff26",
                                },
                                data:
                                  v.key == "videoException"
                                    ? videoBI?.map((u) => u.total)
                                    : v.key == "appAbnormal"
                                    ? appBI?.map((u) => u.total)
                                    : dataBI[v.key]?.map((u) => u.total) || [],
                              },
                              {
                                type: "line",
                                name: "已处理（含自动恢复）",
                                smooth: true,
                                areaStyle: {
                                  color: "#0e9cff26",
                                },
                                data:
                                  v.key == "videoException"
                                    ? videoBI?.map((u) => u.done)
                                    : v.key == "appAbnormal"
                                    ? appBI?.map((u) => u.done)
                                    : dataBI[v.key]?.map((u) => u.done) || [],
                              },
                            ],
                          }}
                          notMerge={true}
                          lazyUpdate={true}
                          theme={"ReactEChart" + index}
                          // onChartReady={this.onChartReadyCallback}
                          // onEvents={EventsDict}
                          // opts={}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              ""
            )}
          </div>
          {/* 右边 */}
          {exhibition.current?.overall_new?.find(
            (v) => v.key == "dynamic" || v.key == "tool"
          ) && (
            <div style={{ width: 415, marginLeft: 20 }}>
              {/* 最新动态 */}
              {exhibition.current?.overall_new?.find(
                (v) => v.key == "dynamic"
              ) && (
                <div
                  style={{
                    width: 415,
                    background: "#FFFFFF",
                    marginBottom: 20,
                    boxShadow: "0px 0px 12px 2px rgba(220,222,224,0.2)",
                    borderRadius: 2,
                    paddingTop: 20,
                    paddingLeft: 21,
                    height: 639,
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
                        最新动态
                      </div>
                      <div
                        style={{
                          marginLeft: 6,
                          fontSize: 12,
                          color: "#969799",
                          fontFamily: "DINExp",
                        }}
                      >
                        RECENT NEWS
                      </div>
                    </div>
                    <div style={{ marginRight: 25 }}>
                      <img
                        title="设置"
                        src="/assets/images/problem/setup.png"
                        style={{ width: 18, height: 18, cursor: "pointer" }}
                        onClick={() => {
                          setSetup(true);
                          setTableType("dynamic");
                          attribute("dynamic");
                          setLong("long");
                          setSetData(4);
                        }}
                      />
                    </div>
                  </div>
                  <div
                    id="news"
                    style={{
                      height: 565,
                      position: "relative",
                      marginTop: 10,
                      overscrollBehavior: "contain",
                    }}
                  >
                    <div id="line" style={{ width: "100%" }}>
                      <Timeline
                        mode="center"
                        style={{ marginLeft: "-56px", width: 400 }}
                      >
                        {querydata.current?.map((v, index) => {
                          let title = "";
                          if (v.seed == "discovery") {
                            title =
                              v.project +
                              "【" +
                              v.sources +
                              "】" +
                              "，诊断为" +
                              v.type;
                          } else if (v.seed == "confirm") {
                            title = v.userName
                              ? v.userName +
                                "确认并关闭" +
                                v.project +
                                "【" +
                                v.sources +
                                "】" +
                                v.type +
                                "的问题"
                              : v.project +
                                "【" +
                                v.sources +
                                "】" +
                                v.type +
                                "已恢复";
                          } else {
                            title =
                              "【信鸽-" +
                              v.alarmPushConfig +
                              "】已邮件通知" +
                              v.userName?.map((u, i) =>
                                i > 0 ? "，" + u : u
                              ) +
                              "【" +
                              v.project +
                              "】【" +
                              (v.tactics == "immediately"
                                ? "发现在" + v.interval + "分钟内，有告警源新增"
                                : v.tactics == "continue"
                                ? "告警源持续产生时间超过" + v.interval + "分钟"
                                : "异常设备数量达到项目或结构物内设备总数量的" +
                                  v.deviceProportion +
                                  "%，且持续时长超过" +
                                  v.interval +
                                  "小时" +
                                  "】-【" +
                                  v.time +
                                  "】");
                          }
                          return (
                            <Timeline.Item
                              key={index + "time"}
                              position="left"
                              time={moment(v.time).format(
                                "YYYY-MM-DD HH:mm:ss"
                              )}
                              className={index % 2 == 0 ? "even" : "odd"}
                            >
                              <Tooltip content={title}>
                                <div
                                  className="Tooltip"
                                  style={{
                                    width: 170,
                                    height: "",
                                    display: "-webkit-box",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    color: "",
                                    background: "",
                                  }}
                                >
                                  {title}
                                </div>
                              </Tooltip>
                            </Timeline.Item>
                          );
                        })}
                      </Timeline>
                    </div>
                  </div>
                </div>
              )}
              {/* 我常用的工具 */}
              {exhibition.current?.overall_new?.find((v) => v.key == "tool") ? (
                <div
                  style={{
                    background: "#FFFFFF",
                    boxShadow: "0px 0px 12px 2px rgba(220,222,224,0.2)",
                    borderRadius: 2,
                    padding: 20,
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
                        我常用的工具
                      </div>
                      <div
                        style={{
                          marginLeft: 6,
                          fontSize: 12,
                          color: "#969799",
                          fontFamily: "DINExp",
                        }}
                      >
                        MY USUAL TOOLS
                      </div>
                    </div>
                  </div>
                  {toolShow.length > 0
                    ? toolShow?.map((v) => (
                        <div
                          onMouseLeave={() => {
                            document.getElementById(
                              v.id + "name"
                            ).style.display = "none";
                          }}
                          id={v.id + v.name}
                          style={{
                            marginTop: 24,
                            position: "relative",
                            display: "inline-block",
                            cursor: "pointer",
                          }}
                        >
                          <a href={v.link} target="_blank">
                            <Button
                              theme="solid"
                              type="primary"
                              style={{
                                height: 29,
                                borderRadius: 2,
                                marginRight: 10,
                                marginBottom: 15,
                                background: "#0F7EFB",
                                color: "#FFFFFF",
                                border: "1px solid #0F7EFB",
                              }}
                              onContextMenu={(e) => {
                                e.preventDefault();
                                document.getElementById(
                                  v.id + "name"
                                ).style.display = "block";
                              }}
                            >
                              {v.name}
                            </Button>
                          </a>
                          <div
                            id={v.id + "name"}
                            style={{
                              position: "absolute",
                              top: 12,
                              right: -10,
                              background: "rgb(208 208 223 / 100%)",
                              fontSize: 13,
                              width: 50,
                              textAlign: "center",
                              borderRadius: 4,
                              padding: "0 10px",
                              display: "none",
                            }}
                          >
                            <div
                              style={{ lineHeight: "30px" }}
                              onClick={() => {
                                setTool(true);
                                setAlter(true);
                                setCompile({
                                  linkId: v.id,
                                  name: v.name,
                                  link: v.link,
                                });
                              }}
                            >
                              编辑
                            </div>
                            <div
                              style={{ lineHeight: "30px" }}
                              onClick={() => {
                                dispatch(
                                  control.deleteConsoleToollink(v.id)
                                ).then((res) => {
                                  if (res.success) consoleToollink();
                                });
                              }}
                            >
                              删除
                            </div>
                          </div>
                        </div>
                      ))
                    : ""}

                  <Button
                    theme="solid"
                    type="primary"
                    style={{
                      width: "100%",
                      height: 40,
                      borderRadius: 2,
                      marginTop: 20,
                      background: "#F2F3F5",
                      color: "#0F7EFB",
                      border: "1px solid #F2F3F5",
                    }}
                    onClick={() => {
                      if (toolData == 0 || toolData < 10) {
                        setTool(true);
                      }
                    }}
                  >
                    添加
                  </Button>
                  {toolData && toolData >= 10 ? (
                    <div style={{ color: "red", marginTop: 8 }}>
                      最多可添加10个应用
                    </div>
                  ) : (
                    ""
                  )}
                </div>
              ) : (
                ""
              )}
            </div>
          )}
        </div>
      </div>
      {/* 页面各个设置弹窗 */}
      {setup ? (
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
      ) : (
        ""
      )}
      {/* 工具添加修改弹窗 */}
      {tool ? (
        <Modal
          title={alter ? "编辑" : "添加"}
          open={true}
          width={600}
          onCancel={() => {
            setTool(false);
            setAlter(false);
            setCompile({});
          }}
          onOk={() => {
            FormApi.current.validate().then((v) => {
              dispatch(
                control.putConsoleToollink({
                  linkId: compile?.linkId,
                  name: v.name,
                  link: v.link,
                })
              ).then((res) => {
                if (res.success) {
                  setTool(false);
                  setAlter(false);
                  setCompile({});
                  consoleToollink();
                }
              });
            });
          }}
        >
          <div style={{ paddingLeft: 20 }}>
            <Form
              onSubmit={(values) => console.log(values)}
              getFormApi={(formApi) => (FormApi.current = formApi)}
            >
              <Form.Input
                label="工具名称"
                labelPosition="left"
                rules={[
                  {
                    required: true,
                    message:
                      "请输入工具名称，1～10个字符，支持中英文，数字及常见符号-_ /.",
                  },
                ]}
                field="name"
                maxLength="10"
                initValue={compile?.name || ""}
                placeholder="请输入工具名称"
              />
              <Form.Input
                maxCount={50}
                allowClear
                label="地址链接"
                labelPosition="left"
                placeholder="请输入URL"
                initValue={compile?.link || ""}
                rules={[
                  {
                    required: true,
                    message: "请输入正确地址链接",
                    validator: (rule, value) => {
                      const strRegex =
                        "^((https|http|ftp)://)?" + //(https或http或ftp):// 可有可无
                        "(([\\w_!~*'()\\.&=+$%-]+: )?[\\w_!~*'()\\.&=+$%-]+@)?" + //ftp的user@ 可有可无
                        "(([0-9]{1,3}\\.){3}[0-9]{1,3}" + // IP形式的URL- 3位数字.3位数字.3位数字.3位数字
                        "|" + // 允许IP和DOMAIN（域名）
                        "(localhost)|" + //匹配localhost
                        "([\\w_!~*'()-]+\\.)*" + // 域名- 至少一个[英文或数字_!~*\'()-]加上.
                        "\\w+\\." + // 一级域名 -英文或数字 加上.
                        "[a-zA-Z]{1,6})" + // 顶级域名- 1-6位英文
                        "(:[0-9]{1,5})?" + // 端口- :80 ,1-5位数字
                        "((/?)|" + // url无参数结尾 - 斜杆或这没有
                        "(/[\\w_!~*'()\\.;?:@&=+$,%#-]+)+/?)$"; //请求参数结尾- 英文或数字和[]内的各种字符
                      const re = new RegExp(strRegex, "i"); // 大小写不敏感
                      if (re.test(encodeURI(value))) {
                        return true;
                      }
                      return false;
                    },
                  },
                ]}
                field="link"
              />
            </Form>
          </div>
        </Modal>
      ) : (
        ""
      )}
    </>
  );
};

function mapStateToProps(state) {
  const { auth, global, members, webSocket, ProjectPoms } = state;
  return {
    //   loading: members.isRequesting,
    user: auth.user,
    actions: global.actions,
    pepProjectId: global.pepProjectId,
    //   members: members.data,
    socket: webSocket.socket,
    projectPoms: ProjectPoms?.data?.rows,
 };
}

export default connect(mapStateToProps)(Control);
