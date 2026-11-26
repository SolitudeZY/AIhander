'use strict';

import auth from './auth';
import { ApiTable, basicAction } from '$utils'

export function getWeatherRealtime () {
   return dispatch => basicAction({
      type: 'get',
      dispatch: dispatch,
      actionType: 'GET_WEATHER_REALTIME',
      url: `${ApiTable.weatherRealtime}`,
      msg: { error: '获取实时天气失败' },
      reducer: { name: 'weatherRealtime' }
   });
}

export default {
   ...auth,
   getWeatherRealtime,
};