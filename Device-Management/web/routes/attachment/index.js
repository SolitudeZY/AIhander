'use strict';
const request = require('superagent');
const parse = require('async-busboy');
// const path = require('path')
// const fs = require('fs');

const ext = {
   project: [".txt", ".dwg", ".doc", ".docx", ".xls", ".xlsx", ".pdf", ".png", ".jpg", ".svg"],
   report: [".doc", ".docx", ".xls", ".xlsx", ".pdf"],
   data: [".txt", ".xls", ".xlsx"],
   image: [".png", ".jpg", ".svg"],
   three: [".js"],
   video: [".mp4"],
   bpmn: [".bpmn", ".bpmn20.xml", ".zip", ".bar"],
   app: [".apk"]
}

module.exports = {
   entry: function (app, router, opts) {

      const getApiRoot = async function (ctx) {
         const { apiUrl, edgeAgentApiUrl, iotVcmpWeb, pomsMonitor, pomsKubesphere, pomsAmbari, pomsKowl,
            pomsPghero, pomsEs, pomsNotebook, dcWeb, qiniu, webEmis, webOa, crawapi, networkWeb,traitLabel
         } = opts;

         ctx.status = 200;
         ctx.body = {
            root: apiUrl,
            edgeAgentApiUrl: edgeAgentApiUrl || '',
            iotVcmpWeb: iotVcmpWeb,
            pomsKubesphere: pomsKubesphere,
            pomsAmbari: pomsAmbari,
            pomsKowl: pomsKowl,
            pomsPghero: pomsPghero,
            pomsEs: pomsEs,
            pomsMonitor: pomsMonitor,
            pomsNotebook: pomsNotebook,
            dcWeb: dcWeb,
            networkWeb: networkWeb,
            qiniu: qiniu,
            webEmis,
            webOa,
            crawapi,
            traitLabel
         };
      };

      let download = async function (ctx, next) {
         const { fetchUrl } = opts.qiniu;
         if (ctx.path && ctx.path.includes(fetchUrl)) {
            try {
               const { filename } = ctx.request.query;
               const fkey = decodeURI(ctx.path.slice(fetchUrl.length + 1)).replace(/\.json$/, '.js');
               const publicDownloadUrl = await app.fs.attachment.download(fkey);
               ctx.status = 200;
               if (filename) ctx.attachment(filename);
               ctx.body = request.get(publicDownloadUrl);
            } catch (err) {
               ctx.fs.logger.error(err);
               ctx.status = 404;
               ctx.body = { error: 'file not found.' }
            }
         } else {
            await next();
         }
      }
      let upload_ = async function (ctx, next) {
         let fkey = null;
         try {
            const { files } = await parse(ctx.req);
            const file = files[0];
            const fileInfo = await ctx.app.fs.attachment.upload(file);
            fkey = fileInfo.key;
            ctx.body = { uploaded: fkey };

         } catch (err) {
            ctx.status = 500;
            ctx.fs.logger.error(err);
            ctx.body = { err: 'upload error.' };
         }
      }

      router.use(download);
      router.get('/api/root', getApiRoot);
      router.post('/_upload/attachments', upload_);

   }
};
