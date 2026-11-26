"use strict";

import reducers from "./reducers";
import routes from "./routes";
import * as actions from "./actions";
import { getNavItem } from "./nav-item";

export default {
  key: "edgeDevice",
  name: "边缘设备",
  reducers,
  routes,
  actions,
  getNavItem,
};
