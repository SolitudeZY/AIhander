'use strict';
import React, { useEffect, useState } from 'react';
import moment from 'moment';
import configStore from './store';
import { Provider } from 'react-redux';
import { createBrowserHistory } from 'history';
import { ConnectedRouter } from 'connected-react-router'
import { Layout, NoMatch } from './containers';
import { BrowserRouter, Switch, Route } from "react-router-dom";
import { ConfigProvider } from 'antd';
import layoutActions from './actions';
import zhCN from 'antd/locale/zh_CN';
import { basicReducer } from '@peace/utils';
import { push } from 'react-router-redux';
import 'moment/locale/zh-cn';

moment.locale('zh-cn');

const { initLayout, initApiRoot, resize, initWebSocket } = layoutActions;

const Root = props => {
   const { sections, title, copyright } = props;
   const [history, setHistory] = useState(null)
   const [store, setStore] = useState(null)
   const [outerRoutes, setOuterRoutes] = useState([])
   const [combineRoutes, setCombineRoutes] = useState([])
   const [innnerRoutes, setInnerRoutes] = useState([])

   const flatRoutes = (routes) => {
      const combineRoutes = [];

      function flat (routes, parentRoute) {
         routes.forEach((route, i) => {
            let obj = {
               path: route.path,
               breadcrumb: route.breadcrumb,
               component: route.component || null,
               authCode: route.authCode || '',
               key: route.key
            }
            if (!route.path.startsWith("/")) {
               console.error('路由配置需以 "/" 开始：' + route.path);
            }
            if (route.path.length > 1 && route.path[route.path.length] == '/') {
               console.error('除根路由路由配置不可以以 "/" 结束：' + route.path);
            }
            if (parentRoute && parentRoute != '/') {
               obj.path = parentRoute + route.path;
            }
            if (route.exact) {
               obj.exact = true
            }
            if (route.hasOwnProperty('childRoutes')) {
               combineRoutes.push(obj);
               flat(route.childRoutes, obj.path)
            } else {
               combineRoutes.push(obj)
            }
         })
      }

      flat(routes);
      return combineRoutes;
   }

   const initReducer = (reducers, reducerName, action) => {
      let reducerParams = {}
      const { actionType, initReducer, reducer } = action()()
      if (initReducer || reducer) {
         if (reducer) {
            if (reducer.name) {
               reducerName = reducer.name
            }
            if (reducer.params) {
               reducerParams = reducer.params
            }
         } else {
            reducerName = `${reducerName}Rslt`
         }
         reducers[reducerName] = function (state, action) {
            return basicReducer(state, action, Object.assign({ actionType: actionType }, reducerParams));
         }
      }
   }

   useEffect(async () => {
      let innerRoutes = []
      let outerRoutes = []
      let reducers = {}
      let actions = {
         layout: layoutActions
      }

      for (let s of sections) {
         if (!s.key) console.warn('请给你的section添加一个key值，section name:' + s.name);
         for (let r of s.routes) {
            if (r.type == 'inner' || r.type == 'home') {
               innerRoutes.push(r.route)
            } else if (r.type == 'outer') {
               outerRoutes.push(r.route)
            }
         }
         if (s.reducers) {
            reducers = { ...reducers, ...s.reducers }
         }
         if (s.actions) {
            actions = { ...actions, [s.key]: s.actions }
            // if (s.key != 'auth') {
            for (let ak in s.actions) {
               if (['initAuth', 'login', 'logout'].includes(ak)) {
                  continue
               }
               let actions = s.actions[ak]
               if (actions && typeof actions == 'object') {
                  for (let actionName in actions) {
                     initReducer(reducers, actionName, actions[actionName])
                  }
               } else if (typeof actions == 'function') {
                  initReducer(reducers, ak, actions)
               }
            }
            // }
         }
      }

      let history = createBrowserHistory();
      let store = configStore(reducers, history);
      store.dispatch(initLayout(title, copyright, sections, actions));
      // store.dispatch(resize(document.body.clientHeight, document.body.clientWidth));
      store.dispatch(
         resize(
            document.getElementById('DmsApp').clientHeight,
            document.getElementById('DmsApp').clientWidth
         )
      );
      store.dispatch(actions.auth.initAuth());
      const resourceRoot = await store.dispatch(initApiRoot())
      store.dispatch(initWebSocket({}))
      const combineRoutes = flatRoutes(innerRoutes);

      setInnerRoutes(combineRoutes)
      setHistory(history)
      setStore(store)
      setOuterRoutes(outerRoutes.map(route => (
         <Route
            key={route.key}
            exact={route.hasOwnProperty('exact') ? route.exact : true}
            path={route.path}
            component={route.component}
         />
      )))
      setCombineRoutes(combineRoutes.map(route => (
         <Route
            key={route.key}
            exact={route.hasOwnProperty('exact') ? route.exact : true}
            path={route.path}
            component={route.component}
         />
      )))
   }, [])

   return (
      <>
         {
            store ?
               <ConfigProvider locale={zhCN}>
                  <Provider store={store}>
                     <BrowserRouter basename={window.__MICRO_APP_BASE_ROUTE__ || '/'}>
                        <ConnectedRouter history={history}>

                           <Switch>
                              {outerRoutes}
                              <Layout
                                 history={history}
                                 routes={innnerRoutes}
                              >
                                 {combineRoutes}
                              </Layout>
                              <Route
                                 path={'*'}
                                 component={NoMatch}
                              />
                           </Switch>

                        </ConnectedRouter>
                     </BrowserRouter>
                  </Provider>
               </ConfigProvider>
               : ''
         }
      </>

   )
}

export default Root;