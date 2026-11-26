/**
 * Created by PengLing on 2018/1/2.
 */
'use strict';

const Attachment = require('fs-attachment');

module.exports = {
    entry: function (app, router, opts) {
        const attachment = new Attachment(opts);

        app.fs = app.fs || {};
        app.fs.attachment = attachment;

        app.fs.logger.log('debug', 'init fs.attachment and inject it into app(app.fs.attachment) and runtime ctx(ctx.fs.attachment)');

        return async (ctx, next) => {
            ctx.fs = ctx.fs || {};
            ctx.fs.attachment = attachment;
            await next();
        };
    }
};
