'use strict';

import * as roles from './roles'
import * as system from './system'
import * as dataCacl from './dataCacl'
export default {
    ...roles,
    ...system,
    ...dataCacl
}