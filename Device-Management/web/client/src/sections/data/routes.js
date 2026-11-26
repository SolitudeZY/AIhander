
import { DataQuery, DataComparison, DataAssociation, Notebook,DataDetail,EnergyManagement,TemperatureCompensation } from './containers';

export default [{
   type: 'inner',
   route: {
      path: '/data',
      key: 'data',
      breadcrumb: '数据',
      // 不设置 component 则面包屑禁止跳转
      childRoutes: [{
         path: '/dataMonitoring',
         key: 'dataMonitoring',
         breadcrumb: '数据监控',
         childRoutes: [{
            path: '/dataQuery',
            key: 'dataQuery',
            component: DataQuery,
            breadcrumb: '数据监测',
         },{
            path: '/dataDetail',
            key: 'dataDetail',
            component: DataDetail,
            breadcrumb: '数据详情',
          
         }]
      }, {
         path: '/dataAnalysis',
         key: 'dataAnalysis',
         breadcrumb: '数据分析',
         childRoutes: [{
            path: '/dataComparison',
            key: 'dataComparison',
            component: DataComparison,
            breadcrumb: '数据对比',
         }, {
            path: '/dataAssociation',
            key: 'dataAssociation',
            component: DataAssociation,
            breadcrumb: '数据关联',
         }, {
            path: '/notebook',
            key: 'notebook',
            component: Notebook,
            breadcrumb: 'notebook',
         },
         {
            path: '/energyManagement',
            key: 'energyManagement',
            component: EnergyManagement,
            breadcrumb: 'energyManagement',
         },
         // 温补下发
         {
            path :"/temperatureCompensation",
            key: 'temperatureCompensation',
            component: TemperatureCompensation,
            breadcrumb: 'temperatureCompensation',
         }
      ]     
      }]
   }
}];