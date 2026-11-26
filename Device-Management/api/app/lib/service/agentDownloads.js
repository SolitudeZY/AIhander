"use strict";

// The scaffold's koa-range slices streams after the controller returns. Agent
// downloads already implement authenticated Range handling and must bypass it.
const range = require("koa-range");
module.exports = function configureAgentDownloads(app) {
  app.middleware = app.middleware.map(middleware => middleware === range
    ? (ctx, next) => /^(?:\/api\/v1\/agents\/files\/[^/]+|\/edgeAgent\/devices\/[^/]+\/remote-files\/download)\/?$/.test(ctx.path) ? next() : range(ctx, next)
    : middleware);
};
