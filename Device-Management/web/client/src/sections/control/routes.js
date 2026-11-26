'use strict';
import { Control,UserCenter } from './containers';

export default [{
    type: 'inner',
    route: {
        path: '/control',
        key: 'control',
        breadcrumb: '控制台',
        component: Control,
        // 不设置 component 则面包屑禁止跳转
    }
}, {
    type: 'inner',
    route: {
        path: "/userCenter",
        key: 'userCenter',
        breadcrumb: '用户中心',
        component: UserCenter
    }
}];