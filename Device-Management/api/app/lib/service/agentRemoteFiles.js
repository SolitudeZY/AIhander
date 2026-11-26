"use strict";
const crypto = require("crypto");
const { Readable } = require("stream");
const uploadMultipartFile = require("./agentMultipartUpload");
const { fault } = require("./agentPlatform");
const CHUNK = 64 * 1024;
const LIMIT = 200 * 1024 * 1024;
const active = new WeakMap();
function filename(value) {
  const name = String(value || "");
  if (!name || name[0] === "." || Buffer.byteLength(name) > 255 || /[/\\:\x00\r\n]/.test(name)) throw fault(400, "请输入传输目录内的文件名，不要填写路径");
  return name;
}
function lock(platform, id) {
  let devices = active.get(platform);
  if (!devices) { devices = new Set(); active.set(platform, devices); }
  if (devices.has(id)) throw fault(409, "设备正在传输文件，请稍后再试");
  devices.add(id); return () => devices.delete(id);
}
async function request(platform, id, cmd, values) {
  const wire = `file.transfer.${cmd}`;
  const result = await platform.hub.request(id, wire, values, `${wire}.result`);
  if (!result || result.operate !== true) throw fault(502, result && result.err || "设备文件传输失败，请更新 Agent 并检查设备连接");
  return result;
}
async function info(platform, id) {
  await platform.device(id);
  return request(platform, id, "info", {});
}
async function upload(platform, id, req) {
  await platform.device(id);
  const release = lock(platform, id);
  const transferId = crypto.randomBytes(16).toString("hex");
  let started = false;
  const abort = async () => {
    if (started) await request(platform, id, "abort", { transfer_id: transferId }).catch(() => {});
  };
  const adapter = {
    app: platform.app,
    async storeFile(stream, originalName) {
      const name = filename(originalName);
      // Mark before send: a lost begin response can still leave a staged file.
      started = true;
      await request(platform, id, "upload.begin", { transfer_id: transferId, name });
      let offset = 0;
      for await (const bytes of stream) {
        for (let start = 0; start < bytes.length; start += CHUNK) {
          const chunk = bytes.subarray(start, start + CHUNK);
          if (offset + chunk.length > LIMIT) throw fault(413, "文件不能超过200 MB");
          const result = await request(platform, id, "upload.chunk", { transfer_id: transferId, offset, data: chunk.toString("base64") });
          offset += chunk.length;
          if (result.offset !== offset) throw fault(502, "设备上传进度不一致");
        }
      }
      return { name, size: offset };
    },
    discardFile: abort,
  };
  try {
    const staged = await uploadMultipartFile(req, adapter);
    const result = await request(platform, id, "upload.finish", { transfer_id: transferId, offset: staged.size });
    started = false;
    return result;
  } catch (error) { await abort(); throw error; }
  finally { release(); }
}
async function download(platform, id, name) {
  await platform.device(id); name = filename(name);
  const release = lock(platform, id);
  const transferId = crypto.randomBytes(16).toString("hex");
  const abort = async () => request(platform, id, "abort", { transfer_id: transferId }).catch(() => {});
  let result;
  try {
    result = await request(platform, id, "download.begin", { transfer_id: transferId, name });
    if (!Number.isSafeInteger(result.size) || result.size < 0 || result.size > LIMIT) throw fault(502, "设备文件大小不合法或超过200 MB");
  } catch (error) { await abort(); release(); throw error; }
  let cleaned = false;
  const cleanup = async () => {
    if (cleaned) return;
    cleaned = true; await abort(); release();
  };
  const body = Readable.from((async function* () {
    let offset = 0;
    try {
      while (true) {
        const chunk = await request(platform, id, "download.chunk", { transfer_id: transferId, offset });
        if (typeof chunk.data !== "string") throw fault(502, "设备下载数据不合法");
        const bytes = Buffer.from(chunk.data, "base64");
        offset += bytes.length;
        if (bytes.length > CHUNK || offset > result.size || chunk.offset !== offset || (!bytes.length && !chunk.eof)) throw fault(502, "设备下载进度不一致");
        if (chunk.eof && offset !== result.size) throw fault(502, "设备文件下载不完整");
        if (bytes.length) yield bytes;
        if (chunk.eof) break;
      }
    } finally { await cleanup(); }
  })());
  body.once("close", cleanup);
  return { name, size: result.size, directory: result.directory, body, cleanup };
}
module.exports = { info, upload, download, filename, LIMIT };
