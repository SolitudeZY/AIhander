import { MaintenanceRecords, Grafana, Monitor,Other, Kubesphere, Ambari, Es, Kowl, Pghero } from './containers';

export default [{
   type: 'inner',
   route: {
      path: '/facility',
      key: 'facility',
      breadcrumb: '设备',
      // 不设置 component 则面包屑禁止跳转
      childRoutes: [{
         path: '/deviceQuery',
         key: 'deviceQuery',
         breadcrumb: '设备查询',
         childRoutes: [{
            path: '/maintenanceRecords1',
            key: 'maintenanceRecords1',
            component: MaintenanceRecords,
            breadcrumb: '维护记录',
         }]
      }, {
         path: '/serverInformation',
         key: 'serverInformation',
         breadcrumb: '服务器信息',
         childRoutes: [{
            path: '/monitor',
            key: 'monitor',
            component: Monitor,
            breadcrumb: 'Monitor',
         },{
            path: '/grafana',
            key: 'grafana',
            component: Grafana,
            breadcrumb: 'Grafana',
         }, {
            path: '/kubesphere',
            key: 'kubesphere',
            component: Kubesphere,
            breadcrumb: 'Kubesphere',
         }, {
            path: '/ambari',
            key: 'ambari',
            component: Ambari,
            breadcrumb: 'Ambari',
         }, {
            path: '/maintenanceRecords',
            key: 'maintenanceRecords',
            component: MaintenanceRecords,
            breadcrumb: '维护记录',
         },]
      }, {
         path: '/other',
         key: 'other',
         breadcrumb: '其他',
         childRoutes: [{
            path: '/other1',
            key: 'other1',
            component: Other,
            breadcrumb: '其他',
         }, {
            path: '/kowl',
            key: 'kowl',
            component: Kowl,
            breadcrumb: 'Kowl',
         }, {
            path: '/pghero',
            key: 'pghero',
            component: Pghero,
            breadcrumb: 'Pghero',
         }, {
            path: '/es',
            key: 'es',
            component: Es,
            breadcrumb: 'Es',
         }]
      }]
   }
}];