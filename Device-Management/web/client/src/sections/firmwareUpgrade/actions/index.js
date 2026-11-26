'use strict';

import * as firmwareUpgrade from './firmwareUpgrade'
import * as productLibrary from './product-library'
import * as deviceManagePlatform from './device-manage-platform'
import * as appPackageManagement from './app-package-management'
import * as platformIntegration from './platform-integration'

export default {
    ...firmwareUpgrade,
    ...productLibrary,
    ...deviceManagePlatform,
    ...appPackageManagement,
    ...platformIntegration
}
