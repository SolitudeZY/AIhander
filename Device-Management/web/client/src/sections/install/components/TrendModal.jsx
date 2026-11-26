
import React, {  useState, useEffect,useRef } from "react";
import { connect } from "react-redux";
import moment from 'moment';
import { Form, Select, Modal, Button, Row, Input, Switch, DatePicker } from 'antd';
// import { LineChartOutlined } from '@ant-design/icons'
// import { TimeAbnValueLineChart } from '../components/TimeAbnValueLineChart';
import PropTypes from 'prop-types';





const TrendModal = (props) => {
    const { modalData,dispatch,actions,sensorId, closeModal, visible,project,factorId } = props
    const{install}=actions
    const isMountedRef = useRef(true); // 组件挂载状态
    const [currStartTime, setCurrStartTime] = useState(moment().add('days', -1).format('YYYY-MM-DD HH:mm:ss'))
    const [currEndTime, setcurrEndTime] = useState(moment().format('YYYY-MM-DD HH:mm:ss'))
    const [form] = Form.useForm()
    //初始化
    useEffect(() => {
    }, [])

    // 组件卸载时设置挂载状态为false
    useEffect(() => {
        return () => {
            isMountedRef.current = false;
        };
    }, [])
    const checkPoint = (rule, value) => {
        const pattern = /^[1-9]*[1-9][0-9]*$/;
        if (pattern.test(value) && value != 1) {
            return true
        }
        return false
    }
    const checkNumber = (rule, val) => {
        const strRegex = /^-?\d+(\.\d+)?$/
        if (strRegex.test(val)) {
            return true
        }
        return false



    }
    const btnFormSubmit = () => {
        let data = modalData
        form.validateFields().then(value=>{
            let paramJson = {
                "thr_burr": Number(value.burr),//毛刺阈值
                "win_med": Number(value.ws),//滑动中值
                "win_avg": Number(value.rc),//滑动均值
                "thr_der": Number(value.dv), //导数阈值
                "win_grad": Number(value.pn),//渐变点个数
                "thr_grad": Number(value.gv),//渐变阈值
                "days_Last": Number(value.timeRange),//分析时长
            }
            let pushData = {
                station: data.sensorId,//测点
                factorId: data.factorId,
                itemId: data.itemIndex,
                abnType: 3,//异常趋势
                enabled: value.checked,
                params: paramJson
            };
            dispatch(install.editAbnParams(data.id,pushData)).then(res => {
                if (res.success) {
                    const id = [factorId, -1].join(',')
                dispatch(install.getAbnParamList({ factorId: id,limit: 10, page: 0, type: 3 }))
                    closeModal()
                }
            })
        })
    }
    const checkInterger = (rule, val) => {
        // if(val){
        const strRegex = /^[1-9]*[1-9][0-9]*$/
        if (strRegex.test(val)) {
            return true
        }
        return false
        // }

    };
    const timeOnChange = (dates, dateStrings) => {
        if (dates.length == 0) {
            setCurrStartTime(null)
            setCurrEndTime(null)
            return notification.warning({
                message: `请选择时间`,
                duration: 3,
            })
        }
        setCurrStartTime(dates[0].format('YYYY-MM-DD HH:mm:ss'))
        setCurrEndTime(dates[1].format('YYYY-MM-DD HH:mm:ss'))
    }
    //数据对比
    // const dataCompare = () => {
    //     this.props.form.validateFields((err, values) => {
    //         if (!err) {
    //             let paramJson = {
    //                 "thr_burr": values.burr,//毛刺阈值
    //                 "win_med": values.ws,//滑动中值
    //                 "win_avg": values.rc,//滑动均值
    //                 "thr_der": values.dv, //导数阈值
    //                 "win_grad": values.pn,//渐变点个数
    //                 "thr_grad": values.gv,//渐变阈值
    //                 "days_Last": values.timeRange,//分析时长
    //             }
    //             let data = {
    //                 station: this.props.modalData.stationId,
    //                 factorId: this.props.modalData.factorId,
    //                 itemId: this.props.modalData.itemId,
    //                 abnType: 'trend',//算法类型
    //                 enabled: true,
    //                 params: paramJson
    //             };
    //             let start = this.state.currStartTime;
    //             let end = this.state.currEndTime;
    //             this.props.dispatch(getItemAbnResult_tr(this.props.structId, start, end, data)).then(res => {
    //             })
    //         }
    //     });
    // }

    // let originalData = ['还没查询'], calcArray = [], key, itemName, start, end;
    // let stationsData = [];
    // if (abnItemCompData) {
    //     originalData = abnItemCompData.stationData;
    //     calcArray = abnItemCompData.resultArray;
    //     key = abnItemCompData.itemKey;
    //     itemName = abnItemCompData.itemName;
    //     start = originalData && originalData.length > 0 ? originalData[0].time : '';
    //     end = originalData && originalData.length > 0 ? originalData[originalData.length - 1].time : '';

    //     for (let i = 0; i < originalData.length; i++) {
    //         let one = { name: itemName + "（单位：" + abnItemCompData.unit + "）", value: originalData[i][key], time: originalData[i].time };
    //         stationsData.push(one);
    //     }
    //     if (calcArray) {
    //         let preLineData = calcArray.calcPreprocess;
    //         let abnTrends = calcArray.calcFinal;
    //         for (let j = 0; j < preLineData.length; j++) {
    //             let one = { name: "预处理+滑动均值后数据", value: preLineData[j].value, time: preLineData[j].time };
    //             stationsData.push(one);
    //         }
    //         for (let t = 0; t < abnTrends.length; t++) {
    //             let name = abnTrends[t].startTime + "至" + abnTrends[t].endTime + abnTrends[t].des + "，渐变差值：" + abnTrends[t].value.toFixed(2) + abnItemCompData.unit;
    //             let start = { name: name, value: abnTrends[t].startValue, time: abnTrends[t].startTime };
    //             let end = { name: name, value: abnTrends[t].endValue, time: abnTrends[t].endTime };
    //             stationsData.push(start);
    //             stationsData.push(end);
    //         }
    //     }
    // }
    TrendModal.propTypes = {
        visible: PropTypes.bool.isRequired,
        closeModal: PropTypes.func.isRequired
    };

    return <div>
        <Modal title="异常参数编辑" maskClosable={false} open={visible} onCancel={closeModal} width={1000}
            footer={[<div>
                <Button type="primary" theme='solid' htmlType="submit" onClick={btnFormSubmit}>保存</Button>
                <Button key="cancel" onClick={closeModal}>关闭</Button>
            </div>]}>
            <Form 
                form={form}
                labelCol={{ span: 8 }}
                wrapperCol={{ span: 16 }}
                initialValues={{
                    stationName: modalData.sensorName,
                    factorName: modalData.factorName,
                    checked: modalData.enabled,
                    timeRange: modalData.params.days_Last,
                    burr: modalData.params.thr_burr,
                    ws: modalData.params.win_med,
                    rc: modalData.params.win_avg,
                    dv: modalData.params.thr_der,
                    pn: modalData.params.win_grad,
                    gv: modalData.params.thr_grad,
                    timeSelected: [moment().subtract(24, 'hours'), moment()]
                }}
            >
                <Row>
                    <Form.Item label='测点位置' name='stationName'
                        rules={[{ required: true, message: '测点位置' }]}
                    >
                        <Input disabled={true} />
                    </Form.Item>
                    <Form.Item label='监测因素' name='factorName'
                        rules={[{ required: true, message: '监测因素' }]}
                    >
                        <Input disabled={true} />
                    </Form.Item>
                    <Form.Item label='是否启用' name='checked'
                        rules={[{ required: true, message: '是否启用' }]}
                        valuePropName="checked"
                    >
                        <Switch />
                    </Form.Item>

                    <Form.Item label="分析时长" name="timeRange" 
                        rules={[{
                            required: true, message: "请选择分析时长"
                        }]}
                        >
                        <Select 
                            showSearch 
                            placeholder="请选择分析时长" 
                            style={{ width: 127, marginBottom: 0 }}
                        >
                            <Select.Option value="1">1个月</Select.Option>
                            <Select.Option value="2">2个月</Select.Option>
                            <Select.Option value="3">3个月</Select.Option>
                        </Select>
                    </Form.Item>
                </Row>

                <Row style={{ marginTop: 18 }}>
                    <Form.Item
                        name='burr'
                        label="毛刺阈值"
                        rules={[{
                            required: true, message: "请输入正整数", validator: checkInterger
                        }]}
                        >
                        <Input placeholder="毛刺阈值：数字" />
                    </Form.Item>
                    <Form.Item
                        name='ws'
                        label="滑动中值"
                        rules={[{
                            required: true, message: "请输入正整数", validator: checkInterger
                        }]}
                        >
                        <Input placeholder="滑动中值：正值" />
                    </Form.Item>
                    <Form.Item
                        name='rc'
                        label="滑动均值"
                        rules={[{
                            required: true, message: "请输入正整数", validator: checkInterger
                        }]}
                        >
                        <Input placeholder="滑动均值：正值" />
                    </Form.Item>
                </Row>
                <Row style={{ marginTop: 18 }}>
                    <Form.Item
                        name='dv'
                        label="导数阈值"
                        rules={[{
                            required: true, message: "请输入数字", validator: checkNumber
                        }]}
                        >
                        <Input placeholder="导数阈值：数字" />
                    </Form.Item>
                    <Form.Item
                        name='pn'
                        label="渐变点数"
                        rules={[{
                            required: true, message: "请输入大于1的正整数", validator: checkPoint
                        }]}
                        >
                        <Input placeholder="渐变点个数：正值" />
                    </Form.Item>

                    <Form.Item
                        name='gv'
                        label="渐变阈值"
                        rules={[{
                            required: true, message: "请输入数字", validator: checkNumber
                        }]}
                        >
                        <Input placeholder="渐变阈值：数字" />
                    </Form.Item>

                </Row>
                <Row style={{ marginTop: 28 }}>
                    <Form.Item
                        name="timeSelected"
                        label="查询时间"
                    >
                        <DatePicker.RangePicker
                            placeholder={['开始时间', '结束时间']}
                            showTime
                            onChange={timeOnChange}
                        />
                    </Form.Item>

                    {/* <Button size='default' type="primary" onClick={dataCompare}>数据对比</Button> */}
                </Row>

                {/* <div className="data-chart-container">
                    {originalData && originalData[0] == '还没查询' ?
                        <div style={{ margin: '30px 0' }}><LineChartOutlined/> 输入参数，点击数据对比展示数据对比图</div>
                        :
                        originalData && originalData[0] != '还没查询' && originalData.length > 0 ?
                            <TimeAbnValueLineChart contentType={'trend'} data={stationsData} width={300} height={300}
                                itemName={itemName} configs={{ slider: { start: start, end: end } }} />
                            :
                            <div style={{ margin: '30px 0' }}><LineChartOutlined/> 没有查询到任何有效数据！</div>}
                </div> */}

            </Form>
        </Modal>
    </div>;
}

function mapStateToProps(state) {
    const { abnItemState_tr, global} = state;
    return {
        abnItemCompData: abnItemState_tr.items,
        actions:global.actions
    }
}

export default connect(mapStateToProps)(TrendModal)
