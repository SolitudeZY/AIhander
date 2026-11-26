"use strict";

const Busboy = require("busboy");
const { fault } = require("./agentPlatform");

// Request.close also fires after a normal body read on modern Node. Only the
// parser's finish means that all file streams have been consumed successfully.
module.exports = async function uploadMultipartFile(request, platform) {
  let upload;
  let unexpected = false;
  try {
    await new Promise((resolve, reject) => {
      let parser;
      try { parser = new Busboy({ headers: request.headers }); }
      catch (_) { reject(fault(400, "无效multipart上传请求")); return; }
      let settled = false;
      const streams = new Set();
      const cleanup = () => {
        request.removeListener("aborted", aborted);
        request.removeListener("error", fail);
        request.removeListener("close", closed);
      };
      const fail = error => {
        if (settled) return;
        settled = true;
        cleanup();
        request.unpipe(parser);
        parser.destroy();
        for (const stream of streams) stream.destroy(error);
        if (!request.destroyed) request.resume();
        reject(error);
      };
      const aborted = () => fail(fault(400, "文件上传连接已中断"));
      const closed = () => { if (!request.complete) aborted(); };
      request.once("aborted", aborted);
      request.once("error", fail);
      request.once("close", closed);
      parser.on("error", () => fail(fault(400, "multipart文件内容不完整或格式错误")));
      parser.on("file", (field, stream, filename) => {
        streams.add(stream);
        stream.on("error", fail);
        stream.once("end", () => streams.delete(stream));
        if (field !== "file" || upload) {
          unexpected = true;
          stream.resume();
          return;
        }
        upload = platform.storeFile(stream, filename);
        // A failed consumer cannot drain the parser; reject it instead of hanging.
        upload.catch(fail);
      });
      parser.once("finish", () => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve();
      });
      if (request.aborted) aborted();
      else request.pipe(parser);
    });
  } catch (error) {
    // A malformed/aborted multipart body may follow a completed first file.
    // Wait for storage and compensate so failed requests leave no saved file.
    if (upload) {
      const file = await upload.catch(() => null);
      if (file) await platform.discardFile(file).catch(() => platform.app.fs.logger.error("清理失败上传文件失败"));
    }
    throw error;
  }
  if (!upload) throw fault(400, "multipart字段file不能为空");
  const file = await upload;
  if (unexpected) {
    await platform.discardFile(file);
    throw fault(400, "每次只能上传一个file字段");
  }
  return file;
};
