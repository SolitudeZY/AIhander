'use strict';
const express = require('express')
const webpack = require('webpack');
const devConfig = require('../webpack.config');
const middleware = require('webpack-dev-middleware');
const proxy = require('koa-better-http-proxy');
const url = require('url');

const compiler = webpack(devConfig);

module.exports = {
   entry: function (app, router, opts) {
      app.use(proxy('http://localhost:5601', {
         filter: function (ctx) {
            return /\/build/.test(url.parse(ctx.url).path);
         },
         proxyReqPathResolver: function (ctx) {
            return 'client' + url.parse(ctx.url).path;
         }
      }));

      app.use(proxy('http://localhost:5601', {
         filter: function (ctx) {
            return /\/$/.test(url.parse(ctx.url).path);
         },
         proxyReqPathResolver: function (ctx) {
            return 'client/build/index.html';
         }
      }));

      const server = express();

      // server.use(require("webpack-hot-middleware")(compiler));

      server.all("*", function (req, res, next) {
         //设置允许跨域的域名，*代表允许任意域名跨域
         res.header("Access-Control-Allow-Origin", "*");
         //允许的header类型
         res.header("Access-Control-Allow-Headers", "content-type");
         //跨域允许的请求方式 
         res.header("Access-Control-Allow-Methods", "DELETE,PUT,POST,GET,OPTIONS");
         if (req.method == 'OPTIONS')
            res.sendStatus(200); //让options尝试请求快速结束
         else
            next();
      });

      server.use(middleware(compiler));
      server.listen('5601', function (err) {
         if (err) {
            console.error(err);
         } else {
            console.info(`webpack-dev listen 5601`);
         }
      })
   }
};
