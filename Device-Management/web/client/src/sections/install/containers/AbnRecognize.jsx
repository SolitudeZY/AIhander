'use strict';

import React, {  } from 'react';
import { connect } from 'react-redux';
// import { Row, Col, Card, Icon } from 'antd';
// import { SearchOutlined, LineChartOutlined, StarOutlined, UserOutlined } from '@ant-design/icons';
import Trend from './trend';
import Burr from './burr';
import Interrupt from './interrupt'

const AbnRecognize = (props) => {
    // const {abnCompareData}=props
    const {calcMethod,abnCompareData,factorId,structId,strunctChange,itName,sensorId,project,limits,query,changeQuery,limitChange,sensorList}=props
    // let originalData = ['还没查询'], calcArray = [], key, itemName, start, end;
    // let stationsData = [];
    // if (abnCompareData &&calcMethod == abnCompareData.method) {
    //     originalData = abnCompareData.stationData;
    //     calcArray = abnCompareData.resultArray;
    //     key = abnCompareData.itemKey;
    //     itemName = abnCompareData.itemName;
    //     start = originalData && originalData.length > 0 ? originalData[0].time : '';
    //     end = originalData && originalData.length > 0 ? originalData[originalData.length - 1].time : '';
    //     for (let i = 0; i < originalData.length; i++) {
    //         let one = { name: itemName + "（单位：" + abnCompareData.unit + "）", value: originalData[i][key], time: originalData[i].time };
    //         stationsData.push(one);
    //     }
    //     if (calcMethod == 'interrupt') {
    //         for (let j = 0; j < calcArray.length; j++) {
    //             let one = { name: "中断点：" + calcArray[j].time + "（中断时长：" + calcArray[j].hour.toFixed(2) + "h）", value: calcArray[j].value, time: calcArray[j].time };
    //             stationsData.push(one);
    //         }
    //     } else if (calcMethod == 'burr') {
    //         for (let j = 0; j < calcArray.length; j++) {
    //             let one = {
    //                 name: "毛刺点：" + calcArray[j].time + "（突变大小：" + calcArray[j].burr.toFixed(2) + abnCompareData.unit + "）",
    //                 value: calcArray[j].value, time: calcArray[j].time
    //             };
    //             stationsData.push(one);
    //         }
    //     } else {
    //         if (calcArray) {
    //             let preLineData = calcArray.calcPreprocess;
    //             let abnTrends = calcArray.calcFinal;
    //             for (let j = 0; j < preLineData.length; j++) {
    //                 let one = { name: "预处理+滑动均值后数据", value: preLineData[j].value, time: preLineData[j].time };
    //                 stationsData.push(one);
    //             }
    //             for (let t = 0; t < abnTrends.length; t++) {
    //                 let name = abnTrends[t].startTime + "至" + abnTrends[t].endTime + abnTrends[t].des + "，渐变差值：" + abnTrends[t].value.toFixed(2) + abnCompareData.unit;
    //                 let start = { name: name, value: abnTrends[t].startValue, time: abnTrends[t].startTime };
    //                 let end = { name: name, value: abnTrends[t].endValue, time: abnTrends[t].endTime };
    //                 stationsData.push(start);
    //                 stationsData.push(end);
    //             }
    //         }
    //     }
    // }

const renderContent=()=> {
    const SubContent = {
        'interrupt':  <Interrupt sensorList={sensorList} limitChange={limitChange} query={query} changeQuery={changeQuery} limits={limits} project={project}  sensorId={sensorId} structId={structId} factorId={factorId} />,
        'burr': <Burr sensorList={sensorList} limitChange={limitChange} query={query} changeQuery={changeQuery} limits={limits}  project={project} sensorId={sensorId} structId={structId} factorId={factorId} itName={itName} />,
        'trend': <Trend sensorList={sensorList} limitChange={limitChange} query={query} changeQuery={changeQuery} limits={limits} project={project}  sensorId={sensorId} structId={structId} factorId={factorId}  itName={itName}/>,
    };
    return SubContent[calcMethod];
}



return (<>
    <hr style={{ borderTopWidth: 0, marginBottom: 18 }} />
    {/* <Row>
                    <Col>
                        <Card title={<div><LineChartOutlined/><span style={{ marginLeft: 6 }}>数据对比</span></div>}>
                            <div style={{ padding: 0 }}>
                                <div className="data-chart-container">
                                    {originalData && originalData[0] == '还没查询' ?
                                        <div style={{ margin: '20px 0' }}><LineChartOutlined/> 输入参数，点击数据对比展示数据对比图（默认显示选择的第一个传感器）</div>
                                        :
                                        originalData && originalData[0] != '还没查询' && originalData.length > 0 ?
                                            <timeChart contentType={calcMethod} data={stationsData} width={300} height={300}
                                                itemName={itemName} configs={{ slider: { start: start, end: end } }} />
                                            :
                                            <div style={{ margin: '20px 0' }}><LineChartOutlined/> 没有查询到任何有效数据！</div>}
                                </div>
                            </div>
                        </Card>
                    </Col>
                </Row> */}
                {renderContent()}

</>)
}
  


function mapStateToProps(state) {
    const { auth, global, OrganizationDeps } = state;
    return {
        // loading: OrganizationDeps.isRequesting,
        // user: auth.user,
        // actions: global.actions,
    };
}
export default connect(mapStateToProps)(AbnRecognize)