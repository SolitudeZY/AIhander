import {
    ReportManagement, CyclePlan, TemporaryResponse, EmPush, AppPush,
    MaintenanceModel, ServiceRecord, MaintenanceRecords, FirmwareLibrary,
    DeviceManagement, AutomaticReport, ReportFile, CertMaint
} from './containers';

export default [{
    type: 'inner',
    route: {
        path: '/service',
        key: 'service',
        breadcrumb: '服务',
        // 不设置 component 则面包屑禁止跳转
        childRoutes: [
            {
                path: '/reportingServices',
                key: 'reportingServices',
                breadcrumb: '报表服务',
                childRoutes: [{
                    path: '/reportManagement',
                    key: 'reportManagement',
                    component: ReportManagement,
                    breadcrumb: '报表管理',
                }, {
                    path: '/automaticReport',
                    key: 'automaticReport',
                    component: AutomaticReport,
                    breadcrumb: '自动化报表',
                }, {
                    path: '/reportFile',
                    key: 'reportFile',
                    component: ReportFile,
                    breadcrumb: '报表文件',
                }]
            }, {
                path: '/maintenancePlan',
                key: 'maintenancePlan',
                breadcrumb: '维护计划',
                childRoutes: [{
                    path: '/cyclePlan',
                    key: 'cyclePlan',
                    component: CyclePlan,
                    breadcrumb: '周期计划',
                }, {
                    path: '/temporaryResponse',
                    key: 'temporaryResponse',
                    component: TemporaryResponse,
                    breadcrumb: '临时响应',
                },]
            }, {
                path: '/carrierPigeon',
                key: 'carrierPigeon',
                breadcrumb: '信鸽服务',
                childRoutes: [{
                    path: '/emPush',
                    key: 'emPush',
                    component: EmPush,
                    breadcrumb: 'EM推送',
                }, {
                    path: '/appPush',
                    key: 'appPush',
                    component: AppPush,
                    breadcrumb: '应用推送',
                },]
            }, {
                path: '/preventiveMaintenance',
                key: 'preventiveMaintenance',
                breadcrumb: '预防性维保',
                childRoutes: [{
                    path: '/maintenanceModel',
                    key: 'maintenanceModel',
                    component: MaintenanceModel,
                    breadcrumb: '维保模型',
                }]
            }, {
                path: '/serviceRecord',
                key: 'serviceRecord',
                breadcrumb: '服务记录',
                childRoutes: [{
                    path: '/serviceRecord1',
                    key: 'serviceRecord1',
                    component: ServiceRecord,
                    breadcrumb: '服务记录',
                },
                {
                    path: '/MaintenanceRecords',
                    key: 'MaintenanceRecords',
                    component: MaintenanceRecords,
                    breadcrumb: '维护记录',
                }]
            },
            {
                path: '/firmwareUpgrade',
                key: 'serviceFirmwareUpgrade',
                breadcrumb: '固件升级',
                childRoutes: [{
                    path: '/firmwareLibrary',
                    key: 'serviceFirmwareLibrary',
                    component: FirmwareLibrary,
                    breadcrumb: '固件库',
                }, {
                    path: '/DeviceManagement',
                    key: 'serviceDeviceManagement',
                    component: DeviceManagement,
                    breadcrumb: '设备管理',
                }]
            },
            {
                path: '/certMaint',
                key: 'certMaint',
                breadcrumb: '证书维护',
                component: CertMaint
            }
        ]
    }
}];