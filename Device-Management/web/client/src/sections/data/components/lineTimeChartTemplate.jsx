
'use strict';
import React, { Component } from 'react';
// 引入 echarts 主模块。
import * as echarts from 'echarts/lib/echarts';
// 引入折线图
import 'echarts/lib/chart/line';
//引入标签组件
import ReactEcharts from 'echarts-for-react';

let chartDownload = "";
class LineTimeChart extends Component {
    constructor(props) {
        super(props);
        this.sliderId = 'sliderId' + Math.floor(Math.random() * 1000000000);
        this.chartId = 'chartId' + Math.floor(Math.random() * 1000000000);
        this.legendId = 'legendId' + Math.floor(Math.random() * 1000000000);
        this.legendListId = 'legendListId' + Math.floor(Math.random() * 1000000000);
        this.tooltipId = 'tooltipId' + Math.floor(Math.random() * 1000000000);
        this.state = {
            option: {},
        }
    }

    componentDidMount () {
        let that = this;
        this.renderChart();
        this.reSetLegendStyle(that)
        // debugger
        window.addEventListener('resize', function () {
            let a = setInterval(function () { that.reSetLegendStyle(that) }, 100);
            setTimeout(function () { clearInterval(a) }, 3500)
        });
    }

    reSetLegendStyle = (that) => {
        // Ps.initialize(document.getElementById(that.legendId));
        // Ps.initialize(document.getElementById(that.tooltipId));
        // let legendListDom = document.getElementById(that.legendListId)
        // legendListDom.style.textAlign = 'left';
        // legendListDom.style.maxWidth = '115px'
        // document.getElementById(that.legendId).style.left = '10px'
    }

    download = () => {
        this.chartDownload.downloadImage();
    }

    renderChart = () => {
        const { options } = this.props;
        const props = this.props;
        let height = props.height || 300;
        let showSlider = options && options.sliderStart;
        let padding = [20, 135, 30, 140]
        let startTime, endTime, ds, dv, view;

        // let chart = new G2.Chart({
        //     container: this.chartId,
        //     forceFit: true,
        //     height: height,
        //     padding: padding,
        // });
        // chart.source(props.data);
        // if (showSlider) {
        //     startTime = options.sliderStart;
        //     endTime = options.sliderEnd;
        //     ds = new DataSet({
        //         state: {
        //             start: startTime,
        //             end: endTime,
        //         }
        //     });
        //     dv = ds.createView();
        //     dv.source(props.data)
        //         .transform({ // !!! 根据状态量设置数据过滤规则，
        //             type: 'filter',
        //             callback: obj => {
        //                 return obj.time <= ds.state.end && obj.time >= ds.state.start;
        //             }
        //         });
        // }
        // chart.scale({
        //     'time': {
        //         range: [0, 1],
        //         type: 'time',
        //         alias: '时间',
        //         mask: 'YYYY-MM-DD HH:mm:ss',
        //     },
        // });
        // chart.on('tooltip:change', function (ev) {
        //     let item = ev.items[0];
        //     item.title = item.title;
        // });
        // chart.axis('value', {
        //     position: 'right'
        // });
        // chart.tooltip(true, {
        //     enterable: true,
        //     offset: 3,
        //     crosshairs: {
        //         type: 'cross',
        //     },
        //     inPlot: false,
        //     containerTpl: `
        //         <div class="g2-tooltip">
        //             <div id="${this.tooltipId}" style="max-height:${height - 30}px;min-width:130px;overflow:auto;position:relative;padding-right:12px">
        //                 <div class="g2-tooltip-title" style="margin-bottom: 4px;"></div>
        //                 <ul class="g2-tooltip-list"></ul>
        //             </div>
        //         </div>`,
        // });
        // chart.legend(true, {
        //     marker: 'circle',
        //     useHtml: true,
        //     position: 'left',
        //     containerTpl: `<div class="g2-legend" id="${this.legendId}" style="word-wrap:break-word;position:absolute;top:20px;left:0">
        //         <h4 class="g2-legend-title"></h4>
        //         <ul class="g2-legend-list" id="${this.legendListId}" style="word-wrap:break-word;text-align: left;height:${height - 50}px;width:${130}px"></ul>
        //         </div>`,
        // })
        // let guideOption = {
        //     position: ['min', 'max'],
        //     content: options.yAlias,
        //     offsetY: -10
        // }
        // if (showSlider) {
        //     view = chart.view();
        //     view.source(dv);  // !!! 注意数据源是 ds 创建 DataView 对象
        //     view.guide().text(guideOption);
        //     view.line().position('time*value').color('name').shape('line').size(2);
        // } else {
        //     chart.guide().text(guideOption);
        //     chart.line().position('time*value').color('name').shape('line').size(2);
        // }
        // chart.render();
        // if (showSlider) {
        //     // 创建滑动条
        //     let slider = new Slider({
        //         container: this.sliderId,
        //         padding: [35, 135, 30, 140],
        //         xAxis: 'time',
        //         yAxis: 'value',
        //         start: startTime,
        //         end: endTime,
        //         data: props.data,
        //         scales: {
        //             'time': {
        //                 type: 'time',
        //                 mask: "YYYY-MM-DD HH:mm:ss"
        //             }
        //         },
        //         onChange: ({ startValue, endValue, startText, endText }) => {
        //             ds.setState('start', startText);
        //             ds.setState('end', endText);
        //         } // 更新数据状态量的回调函数
        //     });
        //     slider.render();
        // }
        // chart.changeData(props.data);

        //组织dataset数据
        // let data = this.props.data;
        // let dataset = [], name = [], x = ['product'];
        // data.map(d => {
        //     x.push(d.time);
        //     let value = [];
        //     if (!name.includes(d.name)) {
        //         name.push(d.name);
        //         value.push(d.name);
        //         value.push(d.value);
        //         dataset.push(value);
        //     } else {
        //         dataset.map(set => {
        //             if (set[0] == d.name) {
        //                 set.push(d.value);
        //             }
        //         })
        //     }

        // });
        // dataset.unshift(x);
        //组织后端数据组织data
        let data = this.props.data
        let dataArray = [], types = {}
        let xAxisValue = props.xAxis || 'time'
        let yAxisValue = props.yAxis || 'value'
        const data1 = []
        data.forEach(item => data1.push(item))
        data1.sort((a, b) => new Date(a.time) - new Date(b.time))
        data1.map(dd => {
            if (!types[dd.name]) {
                types[dd.name] = Object.assign({
                    name: dd.name, data: []
                }, {
                    type: 'line',
                    //smooth: true
                });
            }
            types[dd.name].data.push({
                name: dd.time,
                value: [dd[xAxisValue], dd[yAxisValue]]
            })

        });
        for (let t in types) {
            dataArray.push(types[t]);
        }
        // //根据dataset数据数量给出足够的线空间
        // let line, lines = [];
        // line = { type: 'line', smooth: true, seriesLayoutBy: 'row' }
        // dataset.map(data => {
        //     lines.push(line);
        // });

        let eOption = {}
        //解决只有一条数据时图例和线颜色不同
        // if (dataset.length == 2) {
        //     eOption.color = ['#000000']
        // }
        //鼠标移入提示
        eOption.tooltip = {
            // axisPointer:{
            //     axis:{}
            // }
            trigger: 'axis',
            //格式化 tooltip
            formatter: function (params, ticket, callback) {
                let htmlStr = "";
                for (let i = 0; i < params.length; i++) {
                    let param = params[i];
                    let xName = param.name;//x轴的名称
                    let seriesName = param.seriesName.split("series");//图例名称
                    let value = param.value;//y轴值
                    let color = param.color;//图例颜色
                    let data = param.value[1] ? param.value[1] : '无数据';
                    if (value[1] && seriesName.length == 1) {
                        htmlStr += '<div><span>' + xName + '</span>    ' + seriesName[0] + ' <span style="margin-right:5px;display:inline-block;width:10px;height:10px;border-radius:5px;'
                            + 'background-color:' + color + ';"></span>' + data + '</div>';
                    }
                }
                return htmlStr;
            }
        }
        //X轴
        eOption.xAxis = {
            //type: 'category',
            type: 'time',
            // min: new Date(xxxxx),
            // //结束时间
            // max: new Date(xxxxx),
            // axisLabel: {
            //     interale: 0,
            //     rotate: -40,
            //     formatter: function (value) {//在这里写你需要的时间格式
            //         var t_date = new Date(value);
            //         return [t_date.getFullYear(), t_date.getMonth() + 1, t_date.getDate()].join('-') + " "
            //             + [t_date.getHours(), t_date.getMinutes()].join(':');

            //     }
            // }


        }
        //Y轴
        eOption.yAxis = {
            type: 'value',
            min: 'dataMin',
            max: 'dataMax',
            name: options.yAlias,
            axisLabel: {
                formatter: function (value, index) {
                    if (value < 0.01) {
                        if (value < 0.001) {
                            return value ? value.toFixed(4) : 0;
                        }
                        return value.toFixed(3);
                    }
                    return value.toFixed(2);
                }
            }

        }
        //toolbox 设置导出图片
        eOption.toolbox = {
            feature: {
                saveAsImage: {}
            }
        }
        //缩放
        eOption.dataZoom = [
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
        ]
        //颜色标识
        eOption.legend = {
            left: '0',
            orient: 'vertical',
            type: 'scroll',
            icon: 'circle',
            //文字过长可以使用下面方法截取字符串
            formatter: function (name) {
                if (!name) return '';
                if (name.length > 8) {
                    if (name.length > 16) {
                        name = name.slice(0, 8) + `\n` + name.slice(0, 7) + "...";
                    } else {
                        name = name.slice(0, 8) + `\n` + name.slice(8);
                    }
                    return name;
                } else {
                    return name
                }
            },
            tooltip: {
                show: true
            }
        }
        // //数据源
        // eOption.dataset = {
        //     source: dataset
        // }
        //props.data;
        eOption.series = dataArray
        this.setState({ option: eOption });

        //this.chartDownload = chart;
    }

    render () {
        const { data, width, height, options, slider } = this.props;
        const showSlider = options && options.sliderStart;
        return (
            <div style={{ position: 'relative', paddingTop: 20, marginBottom: 24 }}>
                {/* <div style={{ position: 'absolute', right: '20px', top: '20px', zIndex: 2000 }} >
                    <Button onClick={this.download} size="default">导出</Button>
                </div> */}
                <div>
                    {/* <div id={this.chartId} style={{ textAlign: 'left' }}></div> */}

                    <ReactEcharts
                        option={this.state.option}
                    //   onChartReady={()=>{
                    //       this.setState({loading:false})}}
                    //   showLoading={this.state.loading}
                    />

                    {/* <div id="echarts" style={{ textAlign: 'left' }}></div> */}
                    {/* {
                        showSlider ? [
                            <div style={{ width: '100%' }} id={this.sliderId}></div>
                        ] : null
                    } */}
                </div>
            </div>
        );
    }
}
export default LineTimeChart;