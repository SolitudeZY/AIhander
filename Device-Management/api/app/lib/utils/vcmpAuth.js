'use strict';
const moment = require('moment')

module.exports = function (app, opts) {

   async function vcmpAuth () {
      const { vcmp: { app: vcApp } } = opts
      const vcmpAuth = await app.redis.hgetall('vcmpAuth');
      if (vcmpAuth.token && moment().isBefore(moment(vcmpAuth.expires))) {
         return vcmpAuth.token
      } else {
         let res = await app.fs.iotAuthRequest.post('oauth2/token', {
            data: {
               grant_type: 'client_credentials'
            },
            header: {
               Authorization: `Basic ${Buffer.from(`${encodeURIComponent(vcApp.id)}:${encodeURIComponent(vcApp.secret)}`).toString('base64')}`
            }
         })
         await app.redis.hmset('vcmpAuth', {
            ...res
         });
         return res.token
      }
   }

   return {
      vcmpAuth
   }
}