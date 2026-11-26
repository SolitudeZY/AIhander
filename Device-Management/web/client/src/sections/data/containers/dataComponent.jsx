'use strict'


import React, { useState } from 'react'
import { connect } from 'react-redux'
import moment from 'moment'
import { Form, Button, Row, Col, Card, DatePicker, Cascader, Select, Spin, Alert, Image } from 'antd'
import LineTimeChart from '../components/lineTimeChartTemplate'
import LineChart from '../components/line-chart'

const FormItem = Form.Item;
const { RangePicker } = DatePicker;
const Option = Select.Option;
const createForm = Form.create;

const DataComponent = (props) => {
    const { isRequesting, dataList, vibrationRawsData, vibrationFftsData, clientWidth, picBase64Url } = props
    // const [loading,setLoading]=useState(true)
    // debugger
    // const { items, sensors } = dataList
    // const renderChart = () => {

    //     // debugger
    //     // const { dataAcquisitionPointList, dataAcquisitionList, isRequesting, dataType, aggregationData } =props;

    //     if (isRequesting) {
    //         return <Alert
    //             type="info"
    //             description="查询数据中，请稍候..." />
    //     }
    //     if (!sensors?.length) {
    //         return <Alert description="无数据" type="info" />
    //     }
    //     let chartContent = [];
    //     let deviceItems = items
    //     for (let deviceItem in items) {
    //         let chartDataD = [];
    //         let startD = "";
    //         let endD = "";
    //         for (let d = 0; d < sensors.length; d++) {
    //             let isHas = false;
    //             for (let s = 0; s < sensors[d].data.length; s++) {
    //                 let cdataR = {};
    //                 let dataDS = sensors[d].data[s];
    //                 cdataR.time = moment(dataDS.time).format('YYYY-MM-DD HH:mm:ss');
    //                 if (startD == "") {
    //                     startD = dataDS.time;
    //                     endD = dataDS.time;
    //                 } else {
    //                     if (moment(startD) >= moment(dataDS.time))
    //                         startD = dataDS.time;
    //                     if (moment(endD) <= moment(dataDS.time))
    //                         endD = dataDS.time;
    //                 }
    //                 cdataR.name = sensors[d].name;
    //                 let deviceItemValue = Number(dataDS.values[deviceItem]);
    //                 if (!isNaN(deviceItemValue)) {
    //                     cdataR.value = deviceItemValue;
    //                     chartDataD.push(cdataR);
    //                 }
    //                 // if (deviceItemValue !== undefined) {
    //                 //     cdataR.value = typeof deviceItemValue == 'number' ? Number(deviceItemValue) : null;
    //                 //     chartDataD.push(cdataR);
    //                 // }
    //             }
    //         }
    //         chartDataD.reverse();
    //         if (chartDataD.length > 0) {
    //             const optionsD = {
    //                 "xArray": [],
    //                 "yAlias": deviceItems[deviceItem].name + '(' + deviceItems[deviceItem].unit + ')',
    //                 // "sliderStart": moment(startD).format('YYYY-MM-DD HH:mm:ss'),//默认数据源第一个，时间毫秒数
    //                 // "sliderEnd": moment(endD).format('YYYY-MM-DD HH:mm:ss'),//默认数据源最后一个，时间毫秒数
    //                 "mask": "yyyy-mm-dd HH:MM:ss",//时间格式
    //             }
    //             chartContent.push(
    //                 <LineTimeChart
    //                     key={"slider-device-" + deviceItem}
    //                     data={chartDataD}
    //                     width={1000}
    //                     height={300}
    //                     slider={"slider-device-" + deviceItem}
    //                     options={optionsD}
    //                 />)
    //         }
    //     }
    //     if (chartContent.length == 0) {
    //         return <Alert message="无数据"
    //             type="info"
    //         />
    //     } else {
    //         return chartContent.map(p => {
    //             return p;
    //         })
    //     }
    // }
    const renderViberationChart = () => {
        const rawsData = []
        let rawsCfg = {}
        let hasRaws = false
        if (vibrationRawsData.length) {
            vibrationRawsData.map(e => {
                const { data = [], config = {} } = e.data
                rawsCfg = { ...config }
                let temp = []
                if (data && data.length) {
                    hasRaws = true
                    temp = data.map(d => [d?.time, d?.value])
                }
                rawsData.push({
                    name: `触发时间：${moment(rawsCfg?.collectTime).format('YYYY-MM-DD HH:mm:ss')}`,
                    data: temp,
                })
            })
        }
        const fftsData = []
        let fftsCfg = {}
        let hasFfts = false
        if (vibrationFftsData.length) {
            vibrationFftsData.map(e => {
                const { data = [], config = {} } = e.data
                fftsCfg = { ...config }
                let temp = []
                if (data && data.length) {
                    hasFfts = true
                    temp = data.map(d => [d?.frequency, d?.value])
                }
                fftsData.push({
                    name: `触发时间：${moment(rawsCfg?.collectTime).format('YYYY-MM-DD HH:mm:ss')}`,
                    data: temp,
                })
            })
        }
        return <div style={{ marginBottom: 10 }}>
            {
                <Row gutter={[16, 16]}>
                    {hasRaws && (
                        <Col span={12}>
                            <Card title='时域图' style={{ width: '100%', height: '100%' }} bordered={false} headerLine={false}>
                                <LineChart
                                    seriesData={rawsData}
                                    height={300}
                                    yAxisName={rawsCfg?.unit || ''}
                                    xAxisName='s'
                                    DOMID='vibration-chart-Raws'
                                    grids={['10%', '3%', '3%', '7%']}
                                    type='value'
                                    overflow='visible'
                                />
                            </Card>
                        </Col>

                    )}
                    {hasFfts && (
                        <Col span={12}>
                            <Card title='频谱图' style={{ width: '100%', height: '100%' }} bordered={false} headerLine={false}>
                                <LineChart
                                    seriesData={fftsData}
                                    height={300}
                                    yAxisName={fftsCfg?.unit || ''}
                                    xAxisName='s'
                                    DOMID='vibration-chart-ffts'
                                    grids={['10%', '3%', '3%', '7%']}
                                    type='value'
                                    overflow='visible'
                                />
                            </Card>
                        </Col>
                    )

                    }
                </Row>

            }

        </div>

    }

    //渲染图表
    return (<div>

        {
            picBase64Url && picBase64Url.length ? picBase64Url?.map(item => (<img style={{ margin: 10, height: 500 }} src={item} />)) : <div style={{ height: 30 }}>暂无数据</div>
            // renderChart()
            // <Image src={'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAoA…GEAAgBgDCAAQYwABAGIuJnkHvKensmIAAAAASUVORK5CYII='}/>
        }
        {
            1 == 1 ?
                renderViberationChart() : ''
        }
        {/* 振动渲染时域图和频谱图 */}
    </div>)




}

const mapStateToProps = (state) => {
    const { auth, global, dataContinuityType, dataContinuity, pepProjectId, SensorsData } = state;
    return {
        user: auth.user,
        actions: global.actions,
        dataContinuityType: dataContinuityType.data || [],
        dataContinuity: dataContinuity.data || [],
        pepProjectId: global.pepProjectId,
        isRequesting: SensorsData.isRequesting,
        dataList: SensorsData.data || {}
    };
}
export default connect(mapStateToProps)(DataComponent);





