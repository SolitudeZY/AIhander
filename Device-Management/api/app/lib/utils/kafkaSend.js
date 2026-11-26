'use strict';

module.exports = function (app, opts) {

   async function kfkSendAsync (payloads) {
      const ks = app.fs.kafka;
      if (!ks || !ks.producer) return Promise.resolve();
      const { producer } = ks;
      return new Promise((resolve, reject) => {
         producer.send(payloads, function (err) {
            if (err) {
               reject(err);
            } else {
               resolve();
            }
         });
      })
   }

   return {
      kfkSendAsync
   }
}
