import { JobOrder, StayDoWorkOrder, Initiated, Receipt, AboutMe, Preserve, Reject } from './containers';

export default [{
   type: 'inner',
   route: {
      path: '/workOrder',
      key: 'workOrder',
      breadcrumb: '工单',
      // 不设置 component 则面包屑禁止跳转
      childRoutes: [{
         path: '/jobOrder',
         key: 'jobOrder',
         breadcrumb: '创建工单',
         component: JobOrder,
      }, {
         path: '/workOrderList',
         key: 'workOrderList',
         breadcrumb: '工单列表',
         childRoutes: [{
            path: '/stayDoWorkOrder',
            key: 'stayDoWorkOrder',
            component: StayDoWorkOrder,
            breadcrumb: '待办工单',
         }, {
            path: '/initiated',
            key: 'initiated',
            component: Initiated,
            breadcrumb: '由我发起',
         }, {
            path: '/already ',
            key: 'already ',
            component: Receipt,
            breadcrumb: '已办工单',
         }, {
            path: '/aboutMe',
            key: 'aboutMe',
            component: AboutMe,
            breadcrumb: '与我有关的',
         }, {
            path: '/preserve',
            key: 'preserve',
            component: Preserve,
            breadcrumb: '保存待发',
         }, {
            path: '/reject',
            key: 'reject',
            component: Reject,
            breadcrumb: '驳回重发',
         }]
      }]
   }
}];