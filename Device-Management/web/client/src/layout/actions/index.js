'use strict';

import * as global from './global'
import * as socket from './webSocket';
import * as workOrders from './workOrders'
export default {
    ...global,
    ...socket,
    ...workOrders
};