'use strict';
import { NoMatch, } from './containers';

export default [{
   type: 'outer',
   route: {
      path: '/noMatch',
      key: 'noMatch',
      component: NoMatch,
   }
}];