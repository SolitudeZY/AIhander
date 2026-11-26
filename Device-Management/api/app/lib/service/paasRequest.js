'use strict';
const request = require('superagent')

class paasRequest {
   constructor(root, { query = {} } = {}, option) {
      this.root = root;
      this.query = query
      this.option = option
   }

   #buildUrl = (url) => {
      return `${this.root}/${url}`;
   }

   #resultHandler = (resolve, reject) => {
      return (err, res) => {
         if (err) {
            reject(err);
         } else {
            resolve(res[this.option.dataWord]);
         }
      };
   }

   get = (url, { query = {}, header = {} } = {}) => {
      return new Promise((resolve, reject) => {
         request.get(
            this.#buildUrl(url))
            .set(header)
            .query(Object.assign(query, this.query))
            .end(this.#resultHandler(resolve, reject));
      })
   }

   post = (url, { data = {}, query = {}, header = {} } = {}) => {
      return new Promise((resolve, reject) => {
         request.post(this.#buildUrl(url)).set(header).query(Object.assign(query, this.query)).send(data).end(this.#resultHandler(resolve, reject));
      })
   }

   put = (url, { data = {}, header = {}, query = {}, } = {}) => {
      return new Promise((resolve, reject) => {
         request.put(this.#buildUrl(url)).set(header).query(Object.assign(query, this.query)).send(data).end(this.#resultHandler(resolve, reject));
      })
   }

   delete = (url, { data, header = {}, query = {} } = {}) => {
      return new Promise((resolve, reject) => {
         const deleteRequest = request.delete(this.#buildUrl(url))
            .set(header)
            .query(Object.assign(query, this.query));
         if (data !== undefined) deleteRequest.send(data);
         deleteRequest.end(this.#resultHandler(resolve, reject));
      })
   }
}

function factory (app, opts) {
   if (opts.pssaRequest) {
      try {
         for (let r of opts.pssaRequest) {
            if (r.name && r.root) {
               console.log(`跨平台请求工具 ${r.name}`);
               app.fs[r.name] = new paasRequest(r.root, { ...(r.params || {}) }, { dataWord: r.dataWord || 'body' })
            } else {
               throw 'opts.pssaRequest 参数错误！'
            }
         }
      } catch (error) {
         console.error(error)
         process.exit(-1);
      }
   }
}

module.exports = factory;
