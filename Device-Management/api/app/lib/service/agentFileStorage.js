"use strict";

const qiniu = require("qiniu");

const unavailable = message => Object.assign(new Error(message), { status: 503 });
class QiniuAgentStorage {
  constructor(options, sdk = qiniu) {
    for (const name of ["domain", "bucket", "accessKey", "secretKey"]) {
      if (!options[name]) throw unavailable(`缺少七牛配置 ${name}`);
    }
    const domain = new URL(options.domain);
    if (!["http:", "https:"].includes(domain.protocol) || domain.username || domain.password || domain.search || domain.hash || domain.pathname !== "/") throw unavailable("七牛下载域名必须为 http(s) 根地址");
    this.domain = domain.origin;
    this.bucket = options.bucket;
    this.ttl = Number(options.downloadTTL || 7200);
    if (!Number.isSafeInteger(this.ttl) || this.ttl < 1800 || this.ttl > 604800) throw unavailable("七牛下载有效期必须为1800至604800秒");
    this.sdk = sdk;
    this.mac = new sdk.auth.digest.Mac(options.accessKey, options.secretKey);
    this.config = new sdk.conf.Config({ useHttpsDomain: true });
    this.uploader = new sdk.form_up.FormUploader(this.config);
    this.manager = new sdk.rs.BucketManager(this.mac, this.config);
  }
  async upload(filename, id) {
    const key = `edge-agent/files/${id}`;
    const policy = new this.sdk.rs.PutPolicy({ scope: `${this.bucket}:${key}`, expires: 3600, insertOnly: 1 });
    await new Promise((resolve, reject) => {
      this.uploader.putFile(policy.uploadToken(this.mac), key, filename, new this.sdk.form_up.PutExtra(), (error, body, info) => {
        if (error || !info || info.statusCode !== 200 || !body || body.key !== key) return reject(unavailable("七牛模型文件上传失败，请检查服务端七牛配置与网络"));
        resolve();
      });
    });
    return { storage: "qiniu", object_key: key, bucket: this.bucket };
  }
  downloadURL(file) {
    if (file.bucket !== this.bucket || !file.object_key) throw unavailable("文件所属七牛空间与当前配置不一致");
    return this.manager.privateDownloadUrl(this.domain, file.object_key, Math.floor(Date.now() / 1000) + this.ttl);
  }
  async uploadImage(bytes, id, mimeType) {
    if (!["image/jpeg", "image/png"].includes(mimeType) || !Buffer.isBuffer(bytes) || !bytes.length) throw unavailable("无效告警证据图片");
    const key = `edge-agent/alarms/${id}.${mimeType === "image/png" ? "png" : "jpg"}`;
    const policy = new this.sdk.rs.PutPolicy({ scope: `${this.bucket}:${key}`, expires: 3600, insertOnly: 1 });
    const extra = new this.sdk.form_up.PutExtra();
    extra.mimeType = mimeType;
    await new Promise((resolve, reject) => {
      this.uploader.put(policy.uploadToken(this.mac), key, bytes, extra, (error, body, info) => {
        if (error || !info || info.statusCode !== 200 || !body || body.key !== key) return reject(unavailable("七牛告警图片上传失败，请检查服务端七牛配置与网络"));
        resolve();
      });
    });
    return { storage: "qiniu", object_key: key, bucket: this.bucket, object_url: `${this.domain}/${key}` };
  }
  async remove(file) {
    if (file.bucket !== this.bucket) throw unavailable("文件所属七牛空间与当前配置不一致");
    await new Promise((resolve, reject) => {
      this.manager.delete(this.bucket, file.object_key, (error, body, info) => {
        if (error || !info || ![200, 612].includes(info.statusCode)) return reject(unavailable("清理七牛临时模型文件失败"));
        resolve();
      });
    });
  }
}
module.exports = { QiniuAgentStorage };
