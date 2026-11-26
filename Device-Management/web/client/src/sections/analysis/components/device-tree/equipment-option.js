'use strict'

import React, { useState, useEffect } from 'react';
import { connect } from 'react-redux';
import { Tabs, message } from 'antd';
import moment from 'moment';
import Option from './option';
import DimensionOption from './dimensionOption';
import State from './state';
import { ApiTable } from '$utils';
import { Request } from '@peace/utils'

const { TabPane } = Tabs;

const Index = ({ actions, dispatch, isEdit, devices, info, parentNode, dimensions, height, deviceMetas }) => {
    const { analysis } = actions


    const [linkState, setLinkState] = useState(null);
    const [alarmMsg, setAlarmMsg] = useState({ new: [], history: [] });
    const [currentDeviceId, setCurrentDeviceId] = useState(null);
    const [activeKey, setActiveKey] = useState('1');
    const callback = (key) => {
        setActiveKey(key)
    }
    useEffect(() => {
        if (info) {
            if (info?.linkState) {
                setLinkState(info.linkState)
            }
            if (info?.device?.id && info?.device.id != currentDeviceId) {
                setCurrentDeviceId(info.device.id);
                setActiveKey('1');
                dispatch(analysis.getDevicesLlinkStatus(info?.device?.id)).then(res => {
                    setLinkState(res.payload?.data?.status)
                }, error => {
                    message.warning('设备在线状态获取失败');
                });

                // url = ApiTable.getDeviceAlarms.replace('{deviceId}', info.device.id);

                // Request.get(url, { limit: 5 })
                //    .then(res => {
                //       setAlarmMsg({ new: res.new || [], history: res.history || [] })
                //    }
                //       , error => {
                //          message.warning('设备告警信息获取失败');
                //       });
            }

        }

    }, [info])


    let tab = "属性";
    if (info && info?.type == "equipment") {
        tab = "属性"
    } else if (info && info?.type == "dimension") {
        tab = "采集策略"
    }
    return (
        <Tabs defaultActiveKey="1" activeKey={activeKey} onChange={callback} style={{ paddingRight: 16 }}>
            <Tabs tab={tab} key="1">
                {info && parentNode ?
                    info.type == "equipment" ?
                        <Option
                            isEdit={isEdit}
                            devices={devices}
                            info={info}
                            parentNode={parentNode}
                            deviceMetas={deviceMetas}
                            dimensions={dimensions}
                            height={height}
                            dispatch={dispatch}
                        />
                        : < DimensionOption
                            isEdit={isEdit}
                            info={info}
                            height={height}
                        />
                    : null
                }
            </Tabs>
            {
                parentNode && info && info.meta && info.meta.filteredResource && (JSON.parse(info.meta.filteredResource.properties).deviceType != 'dau.node') ?
                    <Tabs tab="状态" key="2">
                        <State
                            linkState={linkState}
                            alarmMsg={alarmMsg}
                        />
                    </Tabs> : null
            }
        </Tabs>
    )

}


function mapStateToProps (state) {
    const { auth, global, organizationsStruc, deviceList, deviceMeta } = state;
    return {
        user: auth.user,
        actions: global.actions,
        clientHeight: global.clientHeight,
        organizationsStruc: organizationsStruc?.data || [],  //结构物
        deviceMetasWithFollow: deviceMeta?.data || {},
        devices: deviceList?.data || {},

    };
}

export default connect(mapStateToProps)(Index);