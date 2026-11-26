import reducers from './reducers';
import routes from './routes';
import actions from './actions';
import { getNavItem } from './nav-item';

export default {
  key: 'systemManagement',
  name: '系统管理',
  reducers,
  routes,
  actions,
  getNavItem,
};
