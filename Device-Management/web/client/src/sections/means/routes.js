import { ProjectMeans, RepairFQA, FaultInformation, DevOpsStandard } from './containers';

export default [{
    type: 'inner',
    route: {
        path: '/means',
        key: 'means',
        breadcrumb: '资料',
        // 不设置 component 则面包屑禁止跳转
        childRoutes: [{
            path: '/project',
            key: 'project',
            breadcrumb: '项目资料',
            childRoutes: [{
                path: '/projectMeans',
                key: 'projectMeans',
                component: ProjectMeans,
                breadcrumb: '项目资料',
            }]
        }, {
            path: '/repair',
            key: 'repair',
            breadcrumb: '维修FAQ',
            childRoutes: [{
                path: '/repairFQA',
                key: 'repairFQA',
                component: RepairFQA,
                breadcrumb: '维修FAQ',
            }]
        }, {
            path: '/fault',
            key: 'fault',
            breadcrumb: '故障资料',
            childRoutes: [{
                path: '/faultInformation',
                key: 'faultInformation',
                component: FaultInformation,
                breadcrumb: '故障资料',
            }]
        }, {
            path: '/standard',
            key: 'standard',
            breadcrumb: '运维规范',
            childRoutes: [{
                path: '/devOpsStandard',
                key: 'devOpsStandard',
                component: DevOpsStandard,
                breadcrumb: '运维规范',
            }]
        }]
    }
}];