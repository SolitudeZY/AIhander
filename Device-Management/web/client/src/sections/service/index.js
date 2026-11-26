'use strict';

import reducers from './reducers';
import routes from './routes';
import actions from './actions';
import { getNavItem } from './nav-item';

export default {
    key: 'service',
    name: '服务',
    reducers: reducers,
    routes: routes,
    actions: actions,
    getNavItem: getNavItem
};