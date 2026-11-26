'use strict';
import { Example, } from './containers';

export default [{
    type: 'inner',
    route: {
        path: '/example',
        key: 'example',
        breadcrumb: '栗子',
        // 不设置 component 则面包屑禁止跳转
        childRoutes: [{
            path: '/e1',
            key: 'e1',
            component: Example,
            breadcrumb: '棒子1',
            childRoutes:[{
                path: '/c1',
                key: 'c1',
                component: Example,
                breadcrumb: '锤子1',
            }]
        },{
            path: '/e2',
            key: 'e2',
            // component: Example,
            breadcrumb: '棒子2',
            childRoutes:[{
                path: '/c2',
                key: 'c2',
                component: Example,
                breadcrumb: '锤子2',
            }]
        }]
    }
}];