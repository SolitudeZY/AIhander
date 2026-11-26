'use strict';
import { DataAlarm, LeakageAnomaly } from './containers';

export default [{
    type: 'inner',
    route: {
        path: '/problem',
        key: 'problem',
        breadcrumb: '问题',
        // 不设置 component 则面包屑禁止跳转
        childRoutes: [{
            path: '/dataAlarm',
            key: 'dataAlarm',
            breadcrumb: '数据告警',
            // 不设置 component 则面包屑禁止跳转
            childRoutes: [
                {
                    path: '/dataLnterrupt',
                    key: 'dataLnterrupt',
                    breadcrumb: '数据中断',
                    component: DataAlarm,
                },
                {
                    path: '/dataAbnormal',
                    key: 'dataAbnormal',
                    breadcrumb: '数据异常',
                    component: DataAlarm,
                },
                // {
                //    path: '/strategyHit',
                //    key: 'strategyHit',
                //    breadcrumb: '策略命中',
                //    component: DataAlarm,
                // },
                {
                    path: '/leakageAnomaly',
                    key: 'leakageAnomaly',
                    breadcrumb: '液位异常',
                    component: LeakageAnomaly,
                },
            ]
        }, {
            path: '/useAlarm',
            key: 'useAlarm',
            breadcrumb: '应用告警',
            // 不设置 component 则面包屑禁止跳转
            childRoutes: [{
                path: '/useAbnormal',
                key: 'useAbnormal',
                breadcrumb: '应用异常',
                component: DataAlarm,
            }, {
                path: '/videoAbnormal',
                key: 'videoAbnormal',
                breadcrumb: '视频异常',
                component: DataAlarm,
            }]
        },
            // {
            //    path: '/deviceAlarm',
            //    key: 'deviceAlarm',
            //    breadcrumb: '设备告警',
            //    // 不设置 component 则面包屑禁止跳转
            //    childRoutes: [{
            //       path: '/deviceAbnormal',
            //       key: 'deviceAbnormal',
            //       breadcrumb: '设备异常',
            //       component: DataAlarm,
            //    },]
            // }
        ]
    }
}];