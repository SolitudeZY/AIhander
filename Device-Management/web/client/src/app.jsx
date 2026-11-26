"use strict";

import React, { useEffect } from "react";
import Layout from "./layout";
import Auth from "./sections/auth";
import Example from "./sections/example";
import Analysis from "./sections/analysis";
import Install from "./sections/install";
import Problem from "./sections/problem";
import NoMatch from "./sections/noMatch";
import Control from "./sections/control";
import Facility from "./sections/facility";
import Service from "./sections/service";
import WorkOrder from "./sections/workOrder";
import Means from "./sections/means";
import Data from "./sections/data";
import ProjectGroup from "./sections/projectGroup";
import FirmwareUpgrade from "./sections/firmwareUpgrade";
import EdgeDevice from "./sections/edgeDevice";
import System from "./sections/system";
const App = (props) => {
  const { projectName } = props;

  useEffect(() => {
    document.title = projectName;

    console.log(`
                     _ _
      　　　 　　 ／＞　　フ
      　　　 　　| 　_　 _ l
      　 　　 　／\` ミ＿xノ
      　　 　 /　　　 　 |
      　　　 /　 ヽ　　 ﾉ
      　 　 │　　|　|　|
      　／￣|　　 |　|　|
      　| (￣ヽ＿_ヽ_)__)
      　＼二つ ​
      `);
  }, []);

  return (
    <Layout
      title={projectName}
      sections={[
        //Example,
        // Analysis,
        // Install,
        // Data,
        FirmwareUpgrade,
        EdgeDevice,
        // Facility,
        Service,
        // Problem,
        // WorkOrder,
        // Means,
        Auth,
        NoMatch,
        // Control,
        // ProjectGroup,
        System,
      ]}
    />
  );
};

export default App;
