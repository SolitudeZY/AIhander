'use strict';

const request = require('superagent');

function factory(app, router, opts) {
    return async function (ctx, next) {
        const apiRoot = `${opts.host}/${opts.root}`;

        const username = ctx.fs.api.camundaUserId ? ctx.fs.api.camundaUserId : "admin";
        const password = ctx.fs.api.password ? ctx.fs.api.password : (process.env.CAMUNDA_PASSWORD || "CHANGE_ME");

        // console.log('[camunda-rest] ctx.fs.api：', JSON.stringify(ctx.fs.api))
        // console.log('[camunda-rest] ctx.fs.api.camundaUserId：', ctx.fs.api.camundaUserId)
        const req = {
            get: (url, query) => {
                return request
                    .get(`${apiRoot}${url}`)
                    .query(query)
                    .auth(username, password);
            },
            post: (url, data, query, userId) => {
                if(url.indexOf('engine-rest/task') != -1 && url.indexOf('variables') != -1) {
                    console.log(`
                        \n批量转办\n
                        url ${apiRoot}${url}\n 
                        query ${query}\n
                        auth 
                        username ${userId && `fsUser${userId}` || username}\n
                        pwd ${userId && `workflow-${userId}` || password}\n
                        data ${JSON.stringify(data)}
                    `)
                }
              

                return request
                    .post(`${apiRoot}${url}`)
                    .query(query)
                    .auth(userId && `fsUser${userId}` || username,
                        userId && `workflow-${userId}` || password)
                    .set('Content-Type', 'application/json')
                    .send(data);
            },

            put: (url, data, userId) => {
                return request
                    .put(`${apiRoot}${url}`)
                    .auth(userId && `fsUser${userId}` || username,
                        userId && `workflow-${userId}` || password)
                    .set('Content-Type', 'application/json')
                    .send(data);
            },

            delete: (url, userId) => {
                return request
                    .del(`${apiRoot}${url}`)
                    .auth(userId && `fsUser${userId}` || username,
                        userId && `workflow-${userId}` || password);
            },
            deploy: (url, file) => {
                return request.post(`${apiRoot}${url}`).auth(username, password).attach('file', file);
            }
        };

        app.camunda = app.camunda || {};
        app.camunda.request = req;

        await next();
    };
}

module.exports = factory;
