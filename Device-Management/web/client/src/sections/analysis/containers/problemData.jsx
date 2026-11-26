import React, { useEffect, useState } from 'react';
import { connect } from 'react-redux';
import { Spin, Card, DatePicker, Space, Radio, Divider } from 'antd';
import '../style.less'
import ReactECharts from 'echarts-for-react';
import moment from 'moment'


const { Meta } = Card;

const Console = (props) => {
    const { dispatch, actions, user, loading, socket, clientHeight } = props
    const [startTime, setStartTime] = useState('1970-1-1')//开始时间
    const [endTime, setEndTime] = useState('2099-12-31')//结束时间
    const [mode, setMode] = useState('')//今日、本周、本月、全年是否选中
    const [dateValue, setDateValue] = useState([])//时间选择框的值
    const [left1List, setLeft1List] = useState([])//维修记录排名的数据
    const [right1List, setRight1List] = useState([])//维修次数统计的数据
    const [left2List, setLeft2List] = useState([])//设备类型分析的数据
    const [right2List, setRight2List] = useState([])//维修状态的数据
    const { analysis } = actions
    const getData = (query = { startTime, endTime }) => {
        //请求维修记录排名的数据
        dispatch(analysis.getMaintenceRecordRank(query)).then((res) => {
            if (res.success) setLeft1List(res.payload.data)
        })
        //请求维修次数统计的数据
        dispatch(analysis.getMaintenceTotal(query)).then((res) => {
            if (res.success) setRight1List(res.payload.data)
        })
        //请求设备类型分析的数据
        dispatch(analysis.getEquipmentCategory(query)).then((res) => {
            if (res.success) setLeft2List(res.payload.data)
        })
        //请求维修状态的数据
        dispatch(analysis.getStatus(query)).then((res) => {
            if (res.success) setRight2List(res.payload.data)
        })
    }
    useEffect(() => {
        getData()
    }, [startTime, endTime])
    //datepicker选择日期之后赋值
    const onChangeDate = (e) => {
        // alert(111)
        setStartTime(moment(e[0]).format('YYYY-MM-DD HH:mm:ss'))
        setEndTime(moment(e[1]).format('YYYY-MM-DD') + ' ' + '23:59:59')
        setDateValue(e)
        // const query={ startTime:e[0]+'', endTime:e[1]+'' }
        // getData(query)
        setMode('')

    }
    const clearHandler = () => {
        setStartTime(moment('1970-1-1').startOf('day').format('YYYY-MM-DD'))
        setEndTime(moment('2099-12-31').startOf('day').format('YYYY-MM-DD'))
        // const query={ startTime:'1970-1-1', endTime:'2099-12-31' }
        // getData(query)
    }
    //选择今日、本周、本月、全年之后的逻辑
    const onSelect = (e) => {
        setMode(e.target.value)
        if (e.target.value === 'day') {
            setStartTime(moment().startOf('day').format('YYYY-MM-DD HH:mm:ss'))
            setEndTime(moment().endOf('day').format('YYYY-MM-DD HH:mm:ss'))
        } else if (e.target.value === 'week') {
            setStartTime(moment().startOf('week').format('YYYY-MM-DD HH:mm:ss'))
            setEndTime(moment().endOf('week').format('YYYY-MM-DD HH:mm:ss'))
        } else if (e.target.value === 'month') {
            setStartTime(moment().startOf('month').format('YYYY-MM-DD HH:mm:ss'))
            setEndTime(moment().endOf('month').format('YYYY-MM-DD HH:mm:ss'))
        } else if (e.target.value === 'year') {
            setStartTime(moment().startOf('year').format('YYYY-MM-DD HH:mm:ss'))
            setEndTime(moment().endOf('year').format('YYYY-MM-DD HH:mm:ss'))
        }
        setDateValue([])
    }
    const data = [3, 2, 1, 0, 1, 2, 3];
    // websocket 使用测试
    //    useEffect(() => {
    //       if (socket) {
    //          socket.on('TEST', function (msg) {
    //             console.info(msg);
    //          });
    //          return () => {
    //             socket.off("TEST");
    //          }
    //       }

    //    }, [socket])

    return (
        <>
            {/* <img src="/assets/images/install/watting.png" alt="" style={{   width: 'calc(100% + 16px)', position: "relative",top: -12, left: -8, }} /> */}
            <div style={{ background: '#FFFFFF', margin: '8px 12px', padding: '20px 20px 0px 20px', minHeight: clientHeight - 32, display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <div style={{ width: 0, height: 20, borderLeft: '3px solid #005ABD', borderTop: '3px solid transparent', borderBottom: '3px solid transparent' }}></div>
                        <div style={{ fontFamily: "YouSheBiaoTiHei", fontSize: 24, color: '#101531', marginLeft: 8 }}>维修记录统计</div>
                        <div style={{ marginLeft: 6, fontSize: 12, color: '#969799', fontFamily: "DINExp", }}>MAINTAIN RECORDS STATISTICAL</div>
                    </div>
                </div>

                <Divider></Divider>
                <div style={{ display: 'flex', alignItems: 'center', marginTop: 10 }}>
                    <span style={{ margin: '0px 30px 0px 20px' }}>时间选择</span>
                    <DatePicker type="dateRange"
                        onChange={e => onChangeDate(e)}
                        density="compact"
                        style={{ width: 400 }}
                        value={dateValue}
                        onClear={clearHandler}
                    />
                    <Radio onChange={e => onSelect(e)}
                        value={mode}
                        type="button">
                        <Radio value={'day'} >今日</Radio>
                        <Radio value={'week'}>本周</Radio>
                        <Radio value={'month'} >本月</Radio>
                        <Radio value={'year'}>全年</Radio>
                    </Radio>
                </div>
                <div style={{ margin: '20px 0', flex: 1, display: 'flex', }}>
                    <Card.Grid type='grid' style={{ width: '100%' }}>
                        {
                            [{
                                t: '维修记录排名',
                                echartOption: {
                                    xAxis: {
                                        type: 'value',
                                        // axisLabel: {
                                        //     interval: 0,//x轴强制显示每个
                                        //     rotate: 40
                                        // },
                                    },
                                    yAxis: {
                                        name: '单位:次数',
                                        type: 'category',
                                        data: left1List.map((item) => {
                                            return item.projectName
                                        }),
                                        axisLabel: {
                                            formatter: function (arg) {
                                                return arg.length > 8 ? arg.substring(0, 8) + '...' : arg
                                            }
                                        },

                                        //   nameLocation: "end",
                                        //   nameGap: 20
                                    },
                                    legend: {
                                        orient: 'vertical',
                                        right: '5%',
                                        top: '0%',
                                        icon: 'circle'
                                    },
                                    tooltip: {},
                                    grid: {
                                        top: '10%',
                                        right: '5%',
                                        left: '5%',
                                        bottom: '10%',
                                        containLabel: true
                                    },

                                    series: [
                                        {
                                            data: left1List.map((item) => {
                                                return item.count
                                            }),
                                            type: 'bar',
                                            name: '异常数',
                                            itemStyle: {
                                                color: 'green',

                                            }

                                        }
                                    ]
                                },
                            }, {
                                t: '维修次数统计',
                                echartOption: {
                                    xAxis: {
                                        type: 'category',
                                        data: right1List.map((item => {
                                            return item.projectName
                                        })),
                                        axisLabel: {
                                            interval: 0,//x轴强制显示每个
                                            rotate: 40,
                                            formatter: function (arg) {
                                                return arg.length > 8 ? arg.substring(0, 8) + '...' : arg
                                            }
                                        },

                                    },
                                    yAxis: [{
                                        type: 'value',
                                        name: '单位：次数',
                                        axisLabel: {
                                            formatter: (value) => {
                                                // 负数取反 显示的就是正数了
                                                if (value < 0) return -value
                                                else return value
                                            }
                                        },
                                        // min: function (value) {
                                        //     //最小值设置，其中-value.max * 1.05 乘以1.05 ，主要是使图的边界小于最小的值，给边界留空间
                                        //     return (Math.abs(value.min) < value.max ? -value.max * 1.05 : value.min * 1.05).toFixed(2);
                                        // },
                                        // max: function (value) {
                                        //     //最大值设置，其中-value.min * 1.05 乘以1.05 ，主要是使图的边界大于最大于值，给边界留空间
                                        //     return (Math.abs(value.min) < value.max ? value.max * 1.05 : -value.min * 1.05).toFixed(2);
                                        // }
                                    },
                                    ],
                                    legend: {
                                        //orient: 'vertical',//竖着显示
                                        right: '0%',
                                        // top: '-5%',
                                        icon: 'circle'
                                    },
                                    grid: {
                                        top: '10%',
                                        right: '5%',
                                        left: '5%',
                                        bottom: '10%',
                                        containLabel: true
                                    },
                                    tooltip: {
                                        show: true,
                                        formatter: function (params) {
                                            //console.log('params',params)
                                            return '<div style="white-space: pre-wrap;">' + params.name + '\n' + params.seriesName + ':' + Math.abs(params.value) + '</div>'
                                        }
                                    },

                                    itemStyle: {
                                        borderRadius: 5 // 设置单个数值
                                    },
                                    series: [
                                        {
                                            // barWidth: 20, // 设置柱状图的宽度
                                            name: '异常数',
                                            type: 'bar',
                                            stack: '总量',  //注意这里也要添加，要不然对不齐
                                            data: right1List.map((item => {
                                                return item.incomplete
                                            })),
                                            label: {
                                                normal: {
                                                    show: false,
                                                    formatter: (params) => {
                                                        const value = params.value;
                                                        return '异常数' + Math.abs(value)
                                                    }//返回绝对值
                                                }
                                            }
                                        },
                                        {
                                            // barWidth: 20, // 设置柱状图的宽度
                                            name: '维修数',
                                            type: 'bar',
                                            stack: '总量',  //注意这里也要添加，要不然对不齐
                                            label: {
                                                normal: {
                                                    show: false,
                                                    //data: [1, 2, 3],
                                                    formatter: (params) => {
                                                        const value = params.value;
                                                        return '维修数' + Math.abs(value)
                                                    }//返回绝对值
                                                }
                                            },
                                            data: right1List.map((item => {
                                                return ~item.completed + 1
                                            }))
                                        }
                                    ],

                                },
                            }, {
                                t: '设备类型分析',
                                echartOption: {
                                    xAxis: {
                                        type: 'category',
                                        data: left2List.map((item) => {
                                            return item.equipment_category
                                        }),
                                        axisLabel: {
                                            interval: 0,//x轴强制显示每个
                                            rotate: 40
                                        },
                                    },
                                    yAxis: {
                                        name: '单位:次数',
                                        type: 'value',
                                        // name: "单位：个",
                                        // nameLocation: "end",
                                        nameGap: 20
                                    },
                                    legend: {},
                                    tooltip: {},
                                    grid: {
                                        left: '3%',
                                        right: '4%',
                                        bottom: '1%',
                                        // top: '24%',
                                        containLabel: true
                                    },
                                    series: [
                                        {
                                            data: left2List.map((item) => {
                                                return Number(item.count)
                                            }),
                                            type: 'bar',
                                            //name: '发起数'
                                        }

                                    ]
                                },
                            }, {
                                t: '维修状态分析',
                                echartOption: {
                                    tooltip: {
                                        formatter: (params) => {
                                            return params?.data.name + ':' + params?.data.value + '个'
                                        }
                                    },
                                    series: [
                                        {
                                            name: '维修状态分析',
                                            type: 'pie',
                                            radius: '80%',//饼图大小
                                            data: right2List.map((item => {
                                                return { value: Number(item.count), name: item.status }
                                            })),
                                            label: {
                                                show: true,
                                                //formatter: '单位:次数',
                                                // name: right2List.map((item=>{
                                                //     return{}
                                                // }))
                                            }
                                        }
                                    ],
                                    media: [
                                        {
                                            query: { minAspectRatio: 1 },
                                            option: {
                                                series: [
                                                    { center: ['50%', '50%'] },
                                                    { center: ['50%', '50%'] }
                                                ]
                                            }
                                        },
                                    ]
                                },
                            },].map((c, idx) => (
                                <Card
                                    key={idx}
                                    shadows='hover'
                                    title={c.t}
                                    bordered={false}
                                    headerLine={false}
                                    headerStyle={{
                                        padding: '12px',
                                    }}
                                    styles={{ body: {
                                        padding: '12px',
                                    } }}
                                    style={{ width: '50%', height: '50%' }}
                                >

                                    <ReactECharts
                                        notMerge={true}
                                        lazyUpdate={true}
                                        option={c.echartOption}
                                    />
                                </Card>
                            ))
                        }
                    </Card.Grid>
                </div>
            </div>
        </>
    )
}

function mapStateToProps (state) {
    const { auth, global, members, webSocket } = state;
    return {
        //   loading: members.isRequesting,
        //   user: auth.user,
        actions: global.actions,
        //   members: members.data,
        //   socket: webSocket.socket,
        clientHeight: global.clientHeight

    };
}

export default connect(mapStateToProps)(Console);
