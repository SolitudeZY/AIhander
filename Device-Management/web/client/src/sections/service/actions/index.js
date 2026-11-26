'use strict';

import * as emPush from './emPush'
import * as redcord from './record'
import * as maintenancePlan from './maintenancePlan'
import * as equipment from './equipment'
import * as firmwareUpgrade from './firmwareUpgrade'
import * as report from './report'
import * as cert from './cert'
export default {
    ...emPush, ...redcord, ...maintenancePlan, ...equipment, ...firmwareUpgrade, ...report, ...cert
}