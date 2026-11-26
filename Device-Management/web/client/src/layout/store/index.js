'use strict';

import storeProd from './store.prod'
import storeDev from './store.dev'

let store = null;
if (process.env.NODE_ENV == 'production') {
    store = storeProd;
} else {
    store = storeDev;
}

export default store;