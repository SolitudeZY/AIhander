import { Statistic, Bigscreen } from './containers';

export default [
   {
      type: 'outer',
      route: {
         path: '/projectGroup/statistic',
         key: 'projectGroup',
         breadcrumb: '项目集',
         component: Statistic,
         exact: false
      }
   }, {
      type: 'outer',
      route: {
         path: '/projectGroup/bigscreen',
         key: 'bigscreen',
         breadcrumb: '数据大屏 ',
         component: Bigscreen,
         // exact: false
      }
   }
];