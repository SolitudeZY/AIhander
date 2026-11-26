import { ProblemData, OperationData, WorkorderData, WorkorderStatistics, Network, InterCard } from './containers';

export default [{
   type: 'inner',
   route: {
      path: '/analysis',
      key: 'analysis',
      breadcrumb: '分析',
      // 不设置 component 则面包屑禁止跳转
      childRoutes: [
         {
            path: '/problemAnalysis',
            key: 'problemAnalysis',
            breadcrumb: '问题分析',
            childRoutes: [{
               path: '/problemData',
               key: 'problemData',
               component: ProblemData,
               breadcrumb: '分析数据',
            }]
         },
         {
            path: '/operationAnalysis',
            key: 'operationAnalysis',
            breadcrumb: '运维分析',
            childRoutes: [{
               path: '/operationData',
               key: 'operationData',
               component: OperationData,
               breadcrumb: '运维数据',
            },
            {
               path: '/network',
               key: 'network',
               component: Network,
               breadcrumb: '一图统揽',
            },
            {
               path: '/interCard',
               key: 'interCard',
               component: InterCard,
               breadcrumb: '网卡管理',
            },
            {
               path: '/workorderStatistics',
               key: 'workorderStatistics',
               component: WorkorderStatistics,
               breadcrumb: '工单统计',
            }]
         },
         {
            path: '/workorderAnalysis',
            key: 'workorderAnalysis',
            breadcrumb: '工单分析',
            childRoutes: [{
               path: '/workorderData',
               key: 'workorderData',
               component: WorkorderData,
               breadcrumb: '工单数据',
            }]
         }
      ]
   }
}];