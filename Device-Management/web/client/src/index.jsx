'use strict';

import './public-path'
import React from 'react';
import { render } from 'react-dom';
import { App as AntdApp } from 'antd';
import App from './app';
import './index.less';

render((
  <AntdApp>
    <App projectName="设备管理平台" />
  </AntdApp>
), document.getElementById('DmsApp'));