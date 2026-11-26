'use strict';

import * as console from './console'
import * as operation from './operationData'
import * as maintenceRecord from './maintenceRecordTotal'
import * as network from './network'
import * as intercard from './intercard'
import * as workorderStatistics from './workorderStatistics'

export default {
   ...console, ...operation, ...maintenceRecord, ...network, ...intercard, ...workorderStatistics
}