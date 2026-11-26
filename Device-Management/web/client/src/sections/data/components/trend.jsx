import React, { useEffect, useState, useRef } from 'react';
import { connect } from 'react-redux';
import CardTitle from './cardTitle';
import { Button, Drawer, Tooltip } from 'antd';
import { QuestionCircleOutlined } from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import DataQuery from '../containers/dataQuery';
import './trendStyle.less'
const Trend = (props) => {
    const { actions, dispatch } = props
    const { data } = actions
    const [ordinal, setOrdinal] = useState(0)//用于标记7天还是30天，默认值为0，标记为7天，1为30天
    const [chartData, setChartData] = useState([])
    const [exportFlag, setExportFlag] = useState(false)

    useEffect(() => {
        getData()
    }, [ordinal])
    const getData = () => {
        dispatch(data.getEchartsData({ isSevenDay: ordinal === 0 ? true : false })).then(res => {
            const data = res.payload.data
            setChartData(data)
        })

    }
    let option = {
        tooltip: {
            trigger: 'axis'
        },
        legend: {
            right: 0,
            itemHeight: 5,//修改图例高度
            itemStyle: {
                lineHeight: 5
            },
            data: [
                {
                    name: '电量充足数',
                    icon: 'rect'//修改图例性状（矩形）
                },
                {
                    name: '需充电',
                    icon: 'rect'
                },
                {
                    name: '弱预警',
                    icon: 'rect'
                },
                {
                    name: '强预警',
                    icon: 'rect'
                },
                {
                    name: '离线数',
                    icon: 'rect'
                }
            ],
        },
        grid: {
            left: '3%',
            right: '4%',
            bottom: '3%',
            containLabel: true
        },
        // toolbox: {
        //    feature: {
        //       saveAsImage: {}
        //    },
        //    top:-20,
        // },
        xAxis: {
            type: 'category',
            boundaryGap: false,
            data: chartData && chartData.length ? chartData?.map(item => item.date) : []
        },
        yAxis: {
            type: 'value',
            name: '单位：个',
            nameTextStyle: {
                padding: [0, 0, 20, 0] // 上右下左与原位置距离
            },
        },
        series: [
            {
                name: '电量充足数',
                color: '#82EB7B',
                type: 'line',
                // stack: 'Total',
                symbol: 'circle',
                data: chartData && chartData.length ? chartData?.map(item => item.normal) : []
            },
            {
                name: '需充电',
                type: 'line',
                color: '#E5E465',
                // stack: 'Total',
                symbol: 'circle',
                data: chartData && chartData.length ? chartData?.map(item => item.charge) : []
            },
            {
                name: '弱预警',
                type: 'line',
                color: '#FDAD31',
                // stack: 'Total',
                symbol: 'circle',
                data: chartData && chartData.length ? chartData?.map(item => item.weakWarning) : []
            },
            {
                name: '强预警',
                type: 'line',
                color: '#FF9496',
                // stack: 'Total',
                symbol: 'circle',
                data: chartData && chartData.length ? chartData?.map(item => item.strongWarning) : []
            },
            {
                name: '离线数',
                type: 'line',
                color: '#C3C3C3',
                // stack: 'Total',
                symbol: 'circle',//连接点为实心点
                data: chartData && chartData.length ? chartData?.map(item => item.offline) : []
            },
        ]
    }
    return (
        <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <CardTitle englishName='TREND OF HEALTH' chineseName='健康趋势' isWithHelp={false}>
                </CardTitle>
                <div style={{ display: 'flex', margin: '10px 15px 0 20.5px', justifyContent: 'center', alignItems: 'center' }}>
                    <div style={{ marginRight: 10 }}> <Tooltip content={
                        <article>
                            <p>展示最近7天/30天不同电量设备数量变化趋势</p>
                            <p>电量导出可下载最近30天的地灾自动报表数据</p>
                        </article>
                    }>
                        <QuestionCircleOutlined />
                    </Tooltip>
                    </div>

                    <a onClick={() => { setOrdinal(0) }} className={ordinal === 0 ? 'seven-or-thirty-days-visited' : 'seven-or-thirty-days'}>7天</a>
                    <a onClick={() => { setOrdinal(1) }} className={ordinal === 1 ? 'seven-or-thirty-days-visited' : 'seven-or-thirty-days'}>30天</a>
                    <Button theme="solid" type="primary" className="export-button" onClick={() => { setExportFlag(true) }}>异常点位数据导出</Button>
                    {
                        <Drawer open={exportFlag} onCancel={() => { setExportFlag(false) }} width='80%'>
                            <DataQuery isEnergy={true} />
                        </Drawer>
                    }
                </div>

            </div>
            {
                chartData.length > 0 ?
                    <ReactECharts
                        style={{ height: '80%', margin: 20 }}
                        notMerge={true}
                        lazyUpdate={true}
                        option={option}
                    /> : '暂无数据'
            }
        </>
    )
}

function mapStateToProps (state) {
    const { auth, global } = state;
    return {
        user: auth.user,
        actions: global.actions,
        clientHeight: global.clientHeight,
        clientWidth: global.clientWidth,

    };
}

export default connect(mapStateToProps)(Trend);
