module.exports = function (app, router, opts) {
  const authController = require('../../controllers/auth');

  // 用户登录
  app.fs.api.logAttr['POST/auth/login'] = { content: '用户登录', visible: true };
  router.post('/auth/login', authController.login);

  // 用户登出
  app.fs.api.logAttr['POST/auth/logout'] = { content: '用户登出', visible: true };
  router.post('/auth/logout', authController.logout);

  // 验证token
  app.fs.api.logAttr['POST/auth/verify-token'] = { content: '验证token', visible: false };
  router.post('/auth/verify-token', authController.verifyToken);

  // 刷新token
  app.fs.api.logAttr['POST/auth/refresh-token'] = { content: '刷新token', visible: false };
  router.post('/auth/refresh-token', authController.refreshToken);

  // 修改密码
  app.fs.api.logAttr['PUT/auth/change-password'] = { content: '修改密码', visible: true };
  router.put('/auth/change-password', authController.changePassword);

  app.fs.api.logAttr['POST/auth/register'] = { content: '外部用户注册', visible: true };
  router.post('/auth/register', authController.register);

  // 获取用户信息
  app.fs.api.logAttr['GET/auth/user-info'] = { content: '获取用户信息', visible: false };
  router.get('/auth/user-info', authController.getUserInfo);
};
