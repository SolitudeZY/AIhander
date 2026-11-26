import React, { useEffect, useRef, useState } from 'react';
import { Skeleton, Button, Pagination, Select, Popconfirm, Table, Tooltip, Tabs } from 'antd';
import { SwapOutlined, UpOutlined, DownOutlined } from '@ant-design/icons'
import { connect } from 'react-redux';
import { push } from 'react-router-redux';
import Header from '../components/header';
import Body from '../components/body'
import Card from '../components/card'
import '../style.less'
import ReactECharts from 'echarts-for-react';
import moment from 'moment'
import PerfectScrollbar from "perfect-scrollbar";
import AutoRollComponent from '../components/AutoRollComponent'

let interrupt
let repair
let overviewScrollbar;
const Bigscreen = (props) => {
    const { dispatch, actions, user, match, history, clientHeight, groupStatisticOnline, pomsProjectBasicAll, ...restProps } = props

    const [InterruptRank, setInterruptRank] = useState([])
    const [online, setOnline] = useState([])
    const [value, setValue] = useState([])
    const [time, setTime] = useState([])
    const [groupProject, setGroupProject] = useState([])
    const [proportion, setProportion] = useState([])
    const [formatter, setFormatter] = useState({})
    const [groupDetail, setGroupDetail] = useState({})
    const [allProjects, setAllProjects] = useState([])
    const [alarmData, setAlarmData] = useState()//第三项之后的数据
    const [biggest, setBiggest] = useState()//最大的刻度值
    const [mockData, setMockData] = useState()//所有的告警数据
    const [xData, setXData] = useState([])//横坐标
    const self = useRef({ myChart: null });
    const [state, setState] = useState(0)
    const [interruptData, setInterruptData] = useState([])
    const [avgTmes, setAvgTimes] = useState([])//平均修复时长数组
    // const [queryUserId, setQueryUserId] = useState('')
    useEffect(() => {


        let groupIdLocal = JSON.parse(localStorage.getItem('project_group'))?.find(v => user?.id == v.userId)?.projectGroupId

        let search = restProps?.location?.search || '';
        let params = new URLSearchParams(search);
        // let userId = params.get('pomsU')
        let groupId = params.get('pomsPG')

        // setQueryUserId(userId)

        let groupId_ = groupId || groupIdLocal

        statisticOnline(groupId_)
        //计算当前时间，定时更新
        timeRequest(groupId_)
        dispatch(actions.projectGroup.groupStatisticAlarm({ groupId: groupId_ })).then(res => {
            if (res.success) {
                setMockData(res.payload.data)
            }
        })

        // dispatch(actions.projectGroup.groupProject({ groupId: groupId_ })).then(res => {
        //    if (res.success) {
        //       // setProportion([...res.payload.data?.slice(0, 3)?.map(v => ({ name: v.name || v.pepProjectName, value: (Math.random() * 20).toFixed(0) })), { value: 20, name: '其它' }])
        //    }
        // })

        dispatch(actions.projectGroup.getProjectGroupDetail(groupId_)).then(res => {
            if (res.success) {
                setGroupDetail(res.payload.data)
            }
        })
        dispatch(actions.workOrder.getPomsProjectBasicAll()).then(res => {
            if (res.success) {
                setAllProjects(res.payload.data)
            }
        })




        const interruptDom = document.getElementById("interrupt");
        if (interruptDom) {
            interrupt = new PerfectScrollbar("#interrupt", {
                suppressScrollX: true,
            });
        }
        const repairDom = document.getElementById("repair");
        if (repairDom) {
            repair = new PerfectScrollbar("#repair", {
                suppressScrollX: true,
            });
        }

    }, [])

    useEffect(() => {
        const overview = document.getElementById("alarmRank");
        if (overview) {
            overviewScrollbar = new PerfectScrollbar("#alarmRank", {
                suppressScrollX: true,
            });
        }
        if (overviewScrollbar && overview) {
            overviewScrollbar.update();

        }

        const interruptDom = document.getElementById("interrupt");
        if (interrupt && interruptDom) {
            interrupt.update();

        }
        const repairDom = document.getElementById("repair");
        if (repair && repairDom) {
            interrupt.update();
        }
    })

    useEffect(() => {
        const maxCombinedValue = mockData?.reduce((max, item) => {
            const combinedMax = Math.max(item.alarmCount, item.dealAlarmCount);
            if (combinedMax > max) {
                return combinedMax;
            }
            return max;
        }, -Infinity)
        const bigD = Math.ceil(maxCombinedValue / 50) * 50
        if (bigD == 0) {
            setXData([5, 4, 3, 2, 1, 0, 1, 2, 3, 4, 5])//最大值为0，默认横坐标
        } else {
            setXData([bigD, (bigD - bigD / 5), (bigD - bigD * 2 / 5), (bigD - bigD * 3 / 5), (bigD - bigD * 4 / 5), 0, (bigD - bigD * 4 / 5), (bigD - bigD * 3 / 5), (bigD - bigD * 2 / 5), (bigD - bigD / 5), bigD])
        }
        setBiggest(bigD)
        if (mockData && mockData.length > 21) {
            //数据大于20的话，取前20
            const newArray = mockData.slice(0, 20)
            setAlarmData(newArray)

        } else {
            setAlarmData(mockData)
        }
    }, [mockData])



    useEffect(() => {
        if (groupDetail?.pomsProjectIds && groupDetail?.pomsProjectIds.length && allProjects && allProjects.length) {
            const query = groupDetail?.pomsProjectIds + ''
            dispatch(actions.projectGroup.getProjectWorkOrders({ projectIds: query })).then(res => {
                if (res.success) {
                    setProportion([...res.payload.data?.slice(0, 3)?.map(v => ({ name: allProjects?.find(item => item.value === v.projectId)?.label, value: Number(v.count) })),
                    {
                        name: '其它', value: res.payload.data && res.payload.data.length > 3 ? res.payload.data?.slice(3)?.reduce((p, c) => {
                            return p + Number(c.count)
                        }, 0) : 0
                    }])
                }
            })
            dispatch(actions.projectGroup.getWorkOrdersRepairRank({ projectIds: query })).then(res => {
                if (res.success) {
                    setGroupProject(res.payload.data?.slice(0, 10).map(v => ({ name: v.formname, startTime: moment(v?.startTime).format('YYYY-MM-DD'), duration: Math.round(moment(v?.endTime).add(8, 'hours').diff(v?.startTime, 'hours', true)) })) || [])
                }
            })
            //修复平均时长
            dispatch(actions.projectGroup.getWorkOrdersAvgTimes({ projectIds: query })).then(res => {
                if (res.success) {
                    const data = res.payload.data?.map(v => {
                        return {
                            projectName: allProjects?.find(item => item.value == v.project_id)?.label,
                            avgTime: Math.round(v.avgTime / 60 / 60),
                            project_id: v.project_id
                        }
                    })
                    setAvgTimes(data)
                }
            })
        }
    }, [groupDetail, allProjects])
    let statisticOnline = (groupId) => {
        dispatch(actions.projectGroup.groupStatisticOnline({ groupId })).then(res => {
            if (res.success) {
                let Interrupt = []
                res.payload.data?.forEach(v => {
                    if (v.offline?.id) {
                        Interrupt.push({ name: v.name, ...v.offline })
                    }
                })
                Interrupt = Interrupt?.sort((a, b) => a.offnum / a.totnum - b.offnum / b.totnum)
                setInterruptRank(Interrupt)
                setInterruptData(Interrupt)
                setOnline(res.payload.data?.slice(0, 10) || [])
                setValue(res.payload.data?.map(v => v.id)?.slice(0, 10) || [])
            }
        })
    }

    const timeRequest = (groupId) => {
        // 获取当前时间
        const currentTime = moment();
        // 获取下一个小时的时间
        const nextHour = moment().add(1, 'hour').startOf('hour');
        // 计算分钟差
        const minuteDifference = nextHour.diff(currentTime, 'minutes');
        setTimeout(function () {
            statisticOnline(groupId)
            timeRequest(groupId)
        }, 1000 * 60 * (minuteDifference + 1 || 61));
    }
    //中断排名排序相关
    const topClick = (e) => {
        let data = []
        interruptData.map(v => { data.push(v) })
        switch (e) {
            case 'perBottom':
                setInterruptRank(data.sort((a, b) => b.offnum / b.totnum - a.offnum / a.totnum))
                setState(1)
                break;
            case 'perTop':
                setInterruptRank(data.sort((a, b) => a.offnum / a.totnum - b.offnum / b.totnum))
                setState(0)
                break;
            case 'timeBottom':
                setInterruptRank(data.sort((a, b) => b.offline - a.offline))
                setState(3)
                break;
            case 'timeTop':
                setInterruptRank(data.sort((a, b) => a.offline - b.offline))
                setState(2)
                break;
            case 'countBottom':
                setInterruptRank(data.sort((a, b) => b.totnum - a.totnum))
                setState(5)
                break;
            case 'countTop':
                setInterruptRank(data.sort((a, b) => a.totnum - b.totnum))
                setState(4)
                break;
            default:
                return
        }
    }

    useEffect(() => {
        let count = 0;
        let currentIndex = -1;
        if (!self.current.cityChart) return;
        const timer = setInterval(() => {
            count++;
            if (count == 8) {
                count = 1;
            }
            // 取消之前高亮的图形
            self.current.cityChart.dispatchAction({
                type: "downplay",
                seriesIndex: 0,
                dataIndex: currentIndex,
            });
            currentIndex =
                (currentIndex + 1) % proportion?.length
            // 高亮当前图形
            self.current.cityChart.dispatchAction({
                type: "highlight",
                seriesIndex: 0,
                dataIndex: currentIndex,
            });
            // 显示 label
            self.current.cityChart.dispatchAction({
                type: "showTip",
                seriesIndex: 0,
                dataIndex: currentIndex,
            });
        }, 3000);

        return () => {
            clearInterval(timer);
        };
    }, [proportion]);
    return (
        <div className='project-group'>

            <Header match={match} history={history} {...props} groupDetail={groupDetail} />
            <Body>
                <div style={{ width: "100%", height: '100%' }}>
                    <div style={{ width: '100%', height: "45%", display: 'flex' }}>
                        <Card title='数据在线率' tooltipContent='在线率计算：设备存活/总设备（存活判断：普通设备2h以内有实时数据，GNSS设备8h以内有实时数据）' style={{ width: "calc(50% - 8px)", height: "100%", }}>
                            <div style={{ height: '100%', position: 'relative' }}>
                                {/* <div > */}
                                <Select
                                    allowClear
                                    filter
                                    value={value}
                                    multiple={true}
                                    maxTagCount={1}
                                    style={{ width: 300, position: 'absolute', top: 0, right: 0, zIndex: 99 }}
                                    options={groupStatisticOnline?.map(v => ({ value: v.id, label: v.name })) || []}
                                    onChange={v => {
                                        setValue(v)
                                        setOnline(groupStatisticOnline?.filter(s => v.includes(s.id)))
                                    }}
                                />
                                {/* </div> */}
                                <ReactECharts
                                    option={{
                                        title: {
                                            // text: v.name, 
                                        },
                                        grid: {
                                            left: 27,
                                            right: 10,
                                            bottom: 20,
                                        },
                                        tooltip: {
                                            trigger: 'axis',
                                            confine: true,//固定在图表中
                                            formatter: function (params) {
                                                // 自定义提示框内容
                                                let title = params[0].data[0] + '<br/>' + '<br/>'
                                                params.forEach(v => {
                                                    let find = online?.find(s => s.name == v.seriesName)?.online?.find(d => moment(d.collect_time).format('YYYY-MM-DD HH:mm:ss') == v.data[0]) || {}
                                                    title = title + v.seriesName + "：" + "&nbsp" + "&nbsp" + v.data[1] + "%" + "（" + find?.online + "/" + find?.total + "）" + '<br/>'
                                                })
                                                return title
                                            }
                                        },
                                        xAxis: {
                                            type: 'time',
                                            // name: "时间",
                                            boundaryGap: false,
                                            minInterval: 1000 * 60 * 60,
                                        },
                                        dataZoom: [
                                            {
                                                show: true,
                                                realtime: true,
                                                start: 0,
                                                end: 100
                                            },
                                            {
                                                type: 'inside',
                                                realtime: true,
                                                start: 0,
                                                end: 100
                                            }
                                        ],
                                        yAxis: {
                                            type: 'value',
                                            name: "单位%",
                                            areaStyle: {
                                                color: '#FFF',
                                            },
                                        },
                                        series: online?.map(v => ({
                                            type: 'line',
                                            name: v.name,
                                            smooth: true,
                                            areaStyle: {
                                                color: '#0e9cff26',
                                            },
                                            data: v.online.sort((a, b) => new Date(b.collect_time) - new Date(a.collect_time))?.map(f => [moment(f.collect_time).format('YYYY-MM-DD HH:mm:ss'), f.rate.toFixed(1)]) || []
                                        })) || []
                                    }}
                                    notMerge={true}
                                    lazyUpdate={true}
                                    style={{ width: "100%", height: "100%" }}
                                    theme={'ReactEChart'}
                                />

                            </div>
                        </Card>
                        <div style={{ width: "calc(50% - 8px)", height: "100%", marginLeft: 16, display: 'flex' }}>
                            <Card title='项目工单占比' tooltipContent='项目工单占比：一个月内项目发起工单修复的次数占比。' style={{ width: "calc(50% - 8px)", height: "100%", marginRight: 16 }}>
                                <div style={{ height: '100%', position: 'relative' }}>
                                    <div style={{ height: clientHeight * 0.55 - 300, display: 'flex', justifyContent: "center", position: 'relative' }}>
                                        <ReactECharts
                                            option={{
                                                tooltip: {
                                                    show: true,
                                                    trigger: "item",
                                                    position: "right",
                                                    backgroundColor: "rgba(0,0,0,0.7)",
                                                    textStyle: {
                                                        color: "#fff",
                                                    },
                                                    formatter: (values) => {
                                                        setFormatter(values?.data)
                                                    }
                                                    //   `${values.seriesName}<br /> ${values.marker} ${values.name}    <b>${values.value}</b>个(${values.percent}%)`,
                                                },
                                                series: [
                                                    {
                                                        // name: 'Access From',
                                                        type: 'pie',
                                                        radius: ['60%', '70%'],
                                                        avoidLabelOverlap: false,
                                                        itemStyle: {
                                                            borderRadius: 10,
                                                            borderColor: '#fff',
                                                            borderWidth: 2
                                                        },
                                                        label: {
                                                            show: false,
                                                            position: 'center'
                                                        },
                                                        // emphasis: {
                                                        //   label: {
                                                        //     show: true,
                                                        //     fontSize: 44,
                                                        //     fontWeight: 'bold'
                                                        //   }
                                                        // },
                                                        labelLine: {
                                                            show: false
                                                        },
                                                        data: proportion || [],
                                                    }
                                                ]
                                            }}
                                            notMerge
                                            onChartReady={(instance) => {
                                                self.current.cityChart = instance;
                                            }}
                                            lazyUpdate
                                            style={{ width: clientHeight * 0.55 - 300, height: clientHeight * 0.55 - 300 }}
                                        />
                                        <img src='/assets/images/projectGroup/chart.png' style={{ height: clientHeight * 0.55 - 330, position: 'absolute', top: 16 }} />
                                        <div style={{ position: 'absolute', top: 58, left: "auto", width: 100, textAlign: "center" }}>
                                            <div style={{ fontFamily: 'DIN-Regular', fontWeight: 400, fontSize: 28, color: '#2F2F2F' }}>{formatter?.value}</div>
                                            <div style={{
                                                width: 100, fontFamily: 'SourceHanSansCN-Regular', fontWeight: 400,
                                                fontSize: 14, color: '#2C66F3', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                                            }}>{formatter?.name}</div>
                                        </div>
                                    </div>
                                    <div style={{ width: "100%", fontFamily: 'SourceHanSansCN-Regular', fontWeight: 400, fontSize: 14, position: 'absolute', bottom: 10 }}>
                                        {proportion?.map((v, index) => {
                                            let color = ['rgb(53 100 209)', 'rgb(138 201 15)', 'rgb(239 204 77)', 'rgb(233 107 107)']
                                            return <div style={{ width: "50%", display: 'inline-block' }}>
                                                <div style={{ display: "flex", justifyContent: "space-between", padding: '0 6px' }}>
                                                    <div title={v.name} style={{ width: 'calc(100% - 40px)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                        <span style={{ background: color[index], display: 'inline-block', marginRight: 6, width: 6, height: 6 }}></span>{v.name}</div>
                                                    <div style={{ width: 34 }}>{v.value}次</div>
                                                </div>

                                            </div>
                                        })}
                                    </div>

                                </div>
                            </Card>
                            <Card title='修复排名' style={{ width: "calc(50% - 8px)", height: "100%" }} tooltipContent='修复时间排名：一个月内，计算每个工单的修复时间'>
                                <Tabs 
                                    type="line"
                                    items={[
                                        {
                                            key: "1",
                                            label: "修复排名",
                                            children: (
                                                <div style={{ height: '100%', fontFamily: 'SourceHanSansCN-Regular', fontWeight: 400, fontSize: 14, }}>
                                            <div style={{ display: "flex", background: '#F6F9FF', height: 40, alignItems: 'center' }}>
                                                <div style={{ textAlign: 'center', width: '25%' }}>序号</div>
                                                <div style={{ textAlign: 'center', width: '49%' }}>工单名称</div>
                                                <div style={{ textAlign: 'center', width: '25%' }}>修复时长</div>
                                            </div>
                                            <div id="repair" style={{ position: 'relative', height: clientHeight * 0.55 - 220 - 52 }}>
                                                <AutoRollComponent content={<> {groupProject?.map((c, index) => {
                                                    return index < 10 ? <div style={{ display: "flex", background: index % 2 == 1 ? "#F6F9FF" : '', padding: 6, height: 50, alignItems: 'center' }}>
                                                        <div style={{ textAlign: 'center', width: '25%', fontFamily: 'SourceHanSansCN-Regular', color: '#2C66F3', fontWeight: 400 }}>
                                                            NO.{index + 1}</div>
                                                        <div title={`${c.name}(${c.startTime})`} style={{ textAlign: 'center', padding: '0 6px', width: '49%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                            {c.name}({c.startTime})</div>
                                                        <div style={{ textAlign: 'center', width: '25%', fontFamily: 'SourceHanSansCN-Regular', fontWeight: 400 }}>
                                                            {c.duration}h</div>
                                                    </div> : <></>
                                                })}</>} containerStyle={{ position: "relative", height: "95%", }}
                                                    divHeight={"100%"} divId={"rank"} />

                                            </div>
                                        </div>
                                            )
                                        },
                                        {
                                            key: "2",
                                            label: "项目统计",
                                            children: (
                                                <div style={{ height: clientHeight * 0.55 - 220 - 52, fontFamily: 'SourceHanSansCN-Regular', fontSize: 14, width: '100%' }}>
                                                    <ReactECharts
                                                        option={{
                                                            title: {
                                                                // text: v.name, 
                                                            },
                                                            grid: {
                                                                left: 27,
                                                                right: 10,
                                                                bottom: 20,
                                                            },
                                                            tooltip: {
                                                                // trigger: 'axis',
                                                                position: ['5%', '50%'],

                                                            },
                                                            xAxis: {
                                                                show: true,
                                                                type: 'category',
                                                                data: avgTmes?.map(s => s.projectName),
                                                                axisLabel: {
                                                                    formatter: function (value) {
                                                                        // 控制显示前五个字符，其余用省略号代替
                                                                        return value.substring(0, 5) + (value.length > 5 ? '...' : '');
                                                                    },
                                                                },
                                                            },
                                                            yAxis: {
                                                                type: 'value',
                                                                name: "单位(小时)",
                                                                // areaStyle: {
                                                                //    color: '#FFF',
                                                                // },
                                                            },
                                                            series: [
                                                                {
                                                                    type: 'bar',
                                                                    data: avgTmes?.map(s => s.avgTime),
                                                                }
                                                            ]
                                                        }}
                                                        // notMerge={true}
                                                        lazyUpdate={true}
                                                        style={{ width: "100%", height: "100%" }}
                                                        theme={'ReactEChart'}
                                                    />
                                                </div>
                                            )
                                        }
                                    ]}
                                />
                            </Card>

                        </div>


                    </div>
                    <div style={{ width: '100%', height: "calc(55% - 24px)", display: 'flex', marginTop: 24 }}>

                        <Card title='中断排名' tooltipContent='中断时长：当前时间-最后一条数据时间。中断个数：结构物下中断测点个数/结构物总测点个数。' style={{ width: "calc(50% - 8px)", height: "100%", }}>
                            <div style={{ height: '100%', fontFamily: 'SourceHanSansCN-Regular', fontWeight: 400, fontSize: 14, }}>
                                <div style={{ display: "flex", background: '#F6F9FF', height: 40, alignItems: 'center' }}>
                                    <div style={{ textAlign: 'center', width: '33%' }}>结构物</div>
                                    <div style={{ textAlign: 'center', width: '33%', position: 'relative' }}>中断百分比<i class="angle_top" id={state == 0 ? 'angleSelected' : null} onClick={() => topClick('perTop')}></i><i id={state == 1 ? 'angleSelected' : null} class="angle_bottom" onClick={() => topClick('perBottom')}></i> </div>
                                    <div style={{ textAlign: 'center', width: '33%', position: 'relative' }}>中断时长<i class="angle_top" id={state == 2 ? 'angleSelected' : null} onClick={() => topClick('timeTop')}></i><i id={state == 3 ? 'angleSelected' : null} class="angle_bottom" onClick={() => topClick('timeBottom')}></i></div>
                                    <div style={{ textAlign: 'center', width: '33%', position: 'relative' }}>中断个数<i class="angle_top" id={state == 4 ? 'angleSelected' : null} onClick={() => topClick('countTop')}></i><i id={state == 5 ? 'angleSelected' : null} class="angle_bottom" onClick={() => topClick('countBottom')}></i></div>
                                </div>
                                <div id="interrupt" style={{ position: 'relative', height: clientHeight * 0.55 - 170 }}>
                                    <AutoRollComponent content={<>
                                        {InterruptRank?.map((c, index) => {
                                            let title
                                            if (c.offline) {
                                                if (c.offline >= 1440 && Math.floor(c.offline / 1440)) title = Math.floor(c.offline / 1440) + "天"
                                                if ((c.offline % 1440) >= 60 && Math.floor(c.offline % 1440 / 60)) {
                                                    if (title) {
                                                        title = title + Math.floor(c.offline % 1440 / 60) + "时"
                                                    } else {
                                                        title = Math.floor(c.offline % 1440 / 60) + "时"
                                                    }
                                                }
                                                if (c.offline % 1440 % 60) {
                                                    if (title) {
                                                        title = title + c.offline % 1440 % 60 + "分"
                                                    } else {
                                                        title = c.offline % 1440 % 60 + "分"
                                                    }
                                                }
                                            }
                                            //判断中断时长是否超过两百天
                                            const cc = title.split('天')
                                            if (cc.length > 1) {
                                                if (Number(cc[0]) > 200) {
                                                    return
                                                }
                                            }
                                            return <div style={{ display: "flex", background: index % 2 == 1 ? "#F6F9FF" : '', height: 40, alignItems: 'center' }}>
                                                <div style={{ textAlign: 'center', width: '33%', fontFamily: 'SourceHanSansCN-Regular', color: '#2C66F3', fontWeight: 400 }}>{c.name}</div>
                                                <div style={{ textAlign: 'center', width: '33%', fontFamily: 'SourceHanSansCN-Regular', color: '#F33B3B', fontWeight: 400 }}>{((c.offnum / c.totnum) * 100).toFixed(2)}%</div>
                                                <div style={{ textAlign: 'center', width: '33%' }}>{title}</div>
                                                <div style={{ textAlign: 'center', width: '33%', fontFamily: 'SourceHanSansCN-Regular', color: '#F33B3B', fontWeight: 400 }}>{c.offnum + '/' + c.totnum}</div>
                                            </div>
                                        })}</>} containerStyle={{ position: "relative", height: "85%", }}
                                        divHeight={"100%"} divId={"interruptchart"} />
                                </div>
                            </div>
                        </Card>
                        <Card title='告警排名TOP20' tooltipContent='(1)超阈值个数：一周内结构物超阈值告警的个数。(2）手动恢复个数：一个月内超阈值告警手动恢复的个数' style={{
                            width: "calc(50% - 8px)", height: "100%", marginLeft: 16
                        }} >
                            {alarmData && alarmData.length > 0 ? (<div style={{ height: '100%' }}>
                                <div style={{ display: "flex", justifyContent: 'flex-end' }}>
                                    <div style={{ display: "flex", alignItems: 'center' }}>
                                        <div className='alarmDiv'></div><div className='alarm'>超阈值个数</div>
                                    </div>
                                    <div style={{ display: "flex", alignItems: 'center' }}>
                                        <div className='dealAlarmCountDiv'></div><div className='alarmCount'>手动恢复个数</div>
                                    </div>
                                </div>
                                <div id='alarmRank' style={{ height: clientHeight * 0.55 - 150, position: 'relative' }}>
                                    <AutoRollComponent content={<>{alarmData?.map((item, index) => {
                                        return (<div style={{ display: 'flex', marginTop: 15, alignItems: 'center' }}>
                                            <div className='rankDiv'>
                                                {index === 0 ? <img src='/assets/images/projectGroup/first.png'></img> :
                                                    index === 1 ? <img src='/assets/images/projectGroup/second.png'></img> :
                                                        index === 2 ? <img src='/assets/images/projectGroup/third.png'></img> :
                                                            index > 2 ? <span>{index + 1}</span> : ''
                                                }
                                            </div>
                                            <div className='structDiv'>{item.name?.length > 5 ? <Tooltip content={item.name}>{item.name.substring(0, 5) + '...'}</Tooltip> : item.name}</div>
                                            <div className='barChartDiv'>
                                                <div style={{ width: '50%', display: 'flex', justifyContent: 'flex-end', position: 'relative' }}>
                                                    <span style={{ position: 'absolute', left: 0, zIndex: 2 }}> {item.dealAlarmCount}</span>
                                                    <div className='alarms' style={{ width: (biggest > 0 ? ((item.dealAlarmCount / biggest) * 100 + '%') : 0), height: '100%', zIndex: 2 }}>  </div>
                                                </div>
                                                <div style={{ width: '50%', display: 'flex', position: 'relative' }}>
                                                    <span style={{ position: 'absolute', right: 0, zIndex: 2 }}> {item.alarmCount}</span>
                                                    <div className='dealAlarms' style={{ width: (biggest > 0 ? ((item.alarmCount / biggest) * 100 + '%') : 0), height: '100%', zIndex: 2 }}> </div>
                                                </div>
                                            </div>
                                        </div>)
                                    })}</>} containerStyle={{ position: "relative", height: "95%", }}
                                        divHeight={"100%"} divId={"chart"} />
                                </div>

                                <div className="scale">
                                    {xData?.map(item => {
                                        return <div >{item}</div>
                                    })}
                                </div>
                            </div>) : ''}
                        </Card>
                    </div>

                </div >

            </Body >
        </div >
    )
}
function mapStateToProps (state) {

    const { auth, global, groupStatisticOnline, pomsProjectBasicAll } = state;
    return {
        user: auth.user,
        actions: global.actions,
        clientHeight: global.clientHeight,
        groupStatisticOnline: groupStatisticOnline?.data,
        pomsProjectBasicAll: pomsProjectBasicAll.data || [],

    };
}

export default connect(mapStateToProps)(Bigscreen);