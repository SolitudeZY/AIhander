'use strict';

const proxy = require('koa-proxy');
const convert = require('koa-convert');

function isMultipartRequest(ctx) {
    const contentType = ctx.request.header['content-type'] || '';
    return contentType.toLowerCase().indexOf('multipart/form-data') === 0;
}

module.exports = {
    entry: function (app, router, opts) {
        const proxyMiddleware = convert(proxy({
            host: opts.host,
            match: opts.match,
            map: function (path) {
                return path.replace(opts.match, '');
            }
        }));

        app.use(async function (ctx, next) {
            const isMatchedMultipart = Boolean(opts.match && ctx.path.match(opts.match) && isMultipartRequest(ctx));
            if (!isMatchedMultipart) return proxyMiddleware(ctx, next);

            // koa-bodyparser 会为 multipart 请求写入空对象，导致 koa-proxy 不再转发原始文件流。
            const parsedBody = ctx.request.body;
            ctx.request.body = undefined;
            try {
                return await proxyMiddleware(ctx, next);
            } finally {
                ctx.request.body = parsedBody;
            }
        });
    }
};
