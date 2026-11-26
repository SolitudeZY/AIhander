import React, { useRef,useState,useEffect } from "react";
import { connect } from "react-redux";
import moment from 'moment';
import { Form, Modal, Button, Row, Input, Switch, DatePicker } from 'antd';
// import { LineChartOutlined } from '@ant-design/icons'
// import { TimeAbnValueLineChart } from '../components/TimeAbnValueLineChart'
// import PropTypes from 'prop-types';

const InterruptModal = (props) => {
    const [form] = Form.useForm()
    const {modalData,actions,dispatch, closeModal, visible, structId,item,sensorId,project,factorId}=props
    const {install}=actions
    const [currStartTime, setCurrStartTime] = useState(moment().add('days', -1).format('YYYY-MM-DD HH:mm:ss'))
    const [currEndTime, setcurrEndTime] = useState(moment().format('YYYY-MM-DD HH:mm:ss'))


  //表单类
 const btnFormSubmit = () => {
    let data = modalData
    form.validateFields().then(value=>{
            let paramJson = { "thr_int": Number(value.thr_int) }
            let pushData = {
              station: data.sensorId,//测点
              factorId: data.factorId,
              itemId: null,
              abnType: 1,//中断
              enabled: value.checked,
              params: paramJson
            }
            dispatch(install.editAbnParams(data.id,pushData)).then(res => {
              if (res.success) {
                const id = [factorId, -1].join(',')
                dispatch(install.getAbnParamList({ factorId: id,limit:10, page: 0,type:1 }))
                  closeModal()
              }
          })
            // this.props.dispatch(editAbnParams(data.id, pushData)).then(_ => {
            //   this.props.dispatch(getAbnParamList(this.props.structId)).then(() => {
            //     this.props.closeModal();
            //   });
            // });
          
    })
    // this.props.form.validateFieldsAndScroll((err, values) => {
      
    // });
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
        setcurrEndTime(null)
      return message.warning('请选择时间');
    }
    setCurrStartTime(dates[0].format('YYYY-MM-DD HH:mm:ss'))
    setcurrEndTime(dates[1].format('YYYY-MM-DD HH:mm:ss'))
  }
  //数据对比
  // const dataCompare = () => {
  //   form.current.validate().then(_=>{
  //       let paramJson = { "thr_int": values.interrupt }
  //       let data = {
  //         station: modalData.stationId,
  //         factorId: modalData.factorId,
  //         itemId: modalData.itemId,
  //         abnType: 'interrupt',//算法类型
  //         enabled: true,
  //         params: paramJson
  //       };
  //       let start = this.state.currStartTime;
  //       let end = this.state.currEndTime;
  //       this.props.dispatch(getItemAbnResult_int(this.props.structId, start, end, data)).then(res => {
  //       })
  //   })
  // }
  // let originalData = ['还没查询'], calcArray = [], key, itemName, start, end;
  // let stationsData = [];
  // if (abnItemCompData) {
  //   originalData = abnItemCompData.stationData;
  //   calcArray = abnItemCompData.resultArray;
  //   key = abnItemCompData.itemKey;
  //   itemName = abnItemCompData.itemName;
  //   start = originalData && originalData.length > 0 ? originalData[0].time : '';
  //   end = originalData && originalData.length > 0 ? originalData[originalData.length - 1].time : '';
  //   for (let i = 0; i < originalData.length; i++) {
  //     let one = { name: itemName + "（单位：" + abnItemCompData.unit + "）", value: originalData[i][key], time: originalData[i].time };
  //     stationsData.push(one);
  //   }
  //   for (let j = 0; j < calcArray.length; j++) {
  //     let one = { name: "中断点：" + calcArray[j].time + "（中断时长：" + calcArray[j].hour.toFixed(2) + "h）", value: calcArray[j].value, time: calcArray[j].time };
  //     stationsData.push(one);
  //   }
  // }

// InterruptModal.propTypes = {
//         visible: PropTypes.bool.isRequired,
//         closeModal: PropTypes.func.isRequired
//     }
    return <div>
    <Modal  maskClosable={false} title="异常参数编辑" open={visible} onCancel={closeModal} width={900}
      footer={[<div>
        <Button type="primary" theme='solid' htmlType="submit" onClick={btnFormSubmit}>保存</Button>
        <Button key="cancel" onClick={closeModal}>关闭</Button>
      </div>]}>
      <Form form={form} labelCol={{ span: 6 }} wrapperCol={{ span: 18 }} initialValues={{
                stationName: modalData.sensorName,
                factorName: modalData.factorName,
                checked: modalData.enabled,
                thr_int: modalData.params.thr_int,
                timeSelected: [moment().subtract(24, 'hours'), moment()]
            }}>
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
              <Form.Item
                        name='thr_int'
                        label="中断阈值"
                        rules={[{
                          required: true, message: "请输入正整数", validator: checkInterger
                      }]}
                      >
                        <Input placeholder="中断阈值：正整数" />
                      </Form.Item>
             <Row style={{ marginTop: 15 }}>
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
            {/* <Button size='default' type="primary" onClick={dataCompare}>数据对比</Button> */}

          {/* <div className="data-chart-container">
            {originalData && originalData[0] == '还没查询' ?
              <div style={{ margin: '30px 0' }}><LineChartOutlined /> 输入参数，点击数据对比展示数据对比图（中断仅展示第一个监测项）</div>
              :
              originalData && originalData[0] != '还没查询' && originalData.length > 0 ?
                <TimeAbnValueLineChart contentType={'interrupt'} data={stationsData} width={300} height={300}
                  itemName={itemName} configs={{ slider: { start: start, end: end } }} />
                :
                <div style={{ margin: '30px 0' }}><LineChartOutlined /> 没有查询到任何有效数据！</div>}
          </div> */}
        </Row>
      </Form>
    </Modal>
  </div>

}
  

function mapStateToProps(state) {
  const { global } = state;
  return {
    // abnItemCompData: abnItemState_int.items,
    // abnItemCompData:[],
    actions:global.actions
  }
}

export default connect(mapStateToProps)(InterruptModal)
