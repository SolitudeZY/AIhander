import React, { useEffect, useState, useRef } from 'react';
import { connect } from 'react-redux';
import ReactECharts from 'echarts-for-react';
import echarts from 'echarts';
import { Spin, Card, Form, Button, Empty } from 'antd';


import DeviceTree from '../components/device-tree';



const Network = ({ dispatch, actions, user, clientHeight, thingId,
   organizationsStruc, deviceMetasWithFollow, devices,
}) => {

   const { analysis } = actions

   const form = useRef();   //表单


   useEffect(async () => {
      if (thingId) {
         dispatch(analysis.getThingsDeploy(thingId))
         dispatch(analysis.getDeviceMetaDeployed(thingId))
      }

   }, [thingId])

   return (
      <div style={{ width: "100%", height: "100%" }}>
         {thingId && deviceMetasWithFollow?.devices?.length > 0 && devices.instances
            ? (
               <DeviceTree
                  deviceMetasWithFollow={deviceMetasWithFollow}
                  deviceList={devices}
                  // dimensionlist={dimensions||{}}
                  dimensionlist={{}}
                  dispatch={dispatch}
                  struct={organizationsStruc?.find((v) => v.thingId == thingId) || {}}
                  clientHeight={clientHeight}
                  clientWidth={500}
               />
            ) :
            <Empty
               image={<img src='/assets/images/background/zw-nodata.png' />}
               darkModeImage={<img src='/assets/images/background/zw-nodata.png' />}
               description={'暂无内容'}
               style={{ padding: 30 }}
            />
         }
      </div>

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

export default connect(mapStateToProps)(Network);
