'use strict';

import { ApiTable, basicAction } from '$utils'


export function getOrganizationsStruc (id) {
   return dispatch => basicAction({
      type: 'get',
      dispatch: dispatch,
      actionType: 'GET_ORGANIZATIONS_STRUC',
      url: `${ApiTable.organizationsStruc.replace('{pepProjectId}', id)}`,
      msg: { error: '获取项目下的结构物信息失败' },
      reducer: { name: 'organizationsStruc' }
   })
}


export function getThingsDeploy (id) {
   return dispatch => basicAction({
      type: 'get',
      dispatch: dispatch,
      actionType: 'GET_THINGS_DEPLOY',
      url: `${ApiTable.thingsDeploy.replace('{iotaThingId}', id)}`,
      msg: { error: '获取设备部署信息失败' },
      reducer: { name: 'deviceList' }
   })
}


export function getDeviceMetaDeployed (id) {
   return dispatch => basicAction({
      type: 'get',
      dispatch: dispatch,
      actionType: 'GET_DEVIC_META_DEPLOYED',
      url: `${ApiTable.deviceMetaDeployed.replace('{iotaThingId}', id)}`,
      msg: { error: '获取部署设备原型失败' },
      reducer: { name: 'deviceMeta' }
   })
}


export function getIotaThingsLlinkStatus (id) {
   return dispatch => basicAction({
      type: 'get',
      dispatch: dispatch,
      actionType: 'GET_IOTA_ThINGS_LINK_STATUS',
      url: `${ApiTable.getIotaThingsLlinkStatus.replace('{iotaThingId}', id)}`,
      msg: { error: '获取设备在线状态/以结构物id集体获取失败' },
      reducer: { name: '' }
   })
}
export function findDeviceMetaDeployed (id) {
   return dispatch => basicAction({
      type: 'get',
      dispatch: dispatch,
      actionType: 'FIND_DEVICE_META_DEPLOYED',
      url: `${ApiTable.findDeviceMetaDeployed.replace('{iotaThingId}', id)}`,
      msg: { error: '获取单个结构物的设备信息失败' },
      reducer: { name: 'deviceMetaDeployed', params: { noClear: true } },

   })
}

export function findSensorLastData (data) {
   return dispatch => basicAction({
      type: 'post',
      data,
      dispatch: dispatch,
      actionType: 'FIND_SENSOR_LAST_DATA',
      url: `${ApiTable.findSensorLastData}`,
      msg: { error: '原始数据查询失败' },
      reducer: { name: 'sensorLastData' }
   })
}

export function getDevicesAlarms (deviceIds, query) {
   return dispatch => basicAction({
      type: 'post',
      dispatch: dispatch,
      data: deviceIds,
      query: query,
      actionType: 'REQUEST_POST_DEVICES_ALARMS',
      url: `${ApiTable.getDevicesAlarms}?state=new`,
      msg: {
         error: '获取设备告警信息失败'
      },
      reducer: {
         name: 'deviceListAlarms'
      }
   });
}


export function findDevicesCardStatus (deviceIds) {
   return dispatch => basicAction({
      type: 'post',
      dispatch: dispatch,
      data: deviceIds,
      actionType: 'FIND_DEVICES_CARD_STATUS',
      url: `${ApiTable.findDevicesCardStatus}`,
      msg: {
         error: '获取物联网卡信息失败'
      },
      reducer: {
         name: 'devicesCardStatus'
      }
   });
}

export function getDevicesLlinkStatus (id) {
   return dispatch => basicAction({
      type: 'get',
      dispatch: dispatch,
      actionType: 'GET_DEVICES_LINK_STATUS',
      url: `${ApiTable.getDevicesLlinkStatus.replace('{deviceId}', id)}`,
      msg: { error: '获取设备在线状态/以设备id单个获取' },
      reducer: { name: '' }
   })
}

export function findAlarmsDevice (id) {
   return dispatch => basicAction({
      type: 'get',
      dispatch: dispatch,
      actionType: 'GET_FIND_ALARMS_DEVICE',
      url: `${ApiTable.getDevicesLlinkStatus.replace('{deviceId}', id)}`,
      msg: { error: '获取设备告警信息失败' },
      reducer: { name: '' }
   })
}

