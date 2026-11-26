'use strict';

const express = require('express')
const { createServer: createViteServer } = require('vite')

module.exports = {
    entry: async function (app, router, opts) {
        const server = express()

        // 以中间件模式创建 Vite 服务器
        // 竟然会自动读 /vite.config.js 的配置
        const vite = await createViteServer({})
        // 将 vite 的 connect 实例作中间件使用
        server.use(vite.middlewares)

        server.use('*', async (req, res) => {
            // 如果 `middlewareMode` 是 `'ssr'`，应在此为 `index.html` 提供服务.
            // 如果 `middlewareMode` 是 `'html'`，则此处无需手动服务 `index.html`
            // 因为 Vite 自会接管
        })

        server.listen(5602)
        console.info('vite server.listen 5602');
    }
};
