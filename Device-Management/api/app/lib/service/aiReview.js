"use strict";

/**
 * 边缘告警 AI 复核。
 *
 * 走 FastGPT 应用（提示词与三分类口径都在应用里维护，后端只负责传参）：
 * - 全局变量 event_info：本次告警的结构化信息，JSON 字符串
 * - 图片：base64 data URL 随 messages 下发，避免 FastGPT 侧回源拉七牛私有地址
 *
 * 结论只认 real / invalid / unknown 三种；模型跑挂一律记 failed，
 * 不能把「复核失败」显示成「无效告警」，这是需求里的硬约束。
 */

const fs = require("fs");
const path = require("path");
const request = require("request");

const DETECTION_TEXT = {
  landslide: "边坡位移",
  slope_deform: "边坡位移",
  person: "人员闯入",
  person_intrusion: "人员闯入",
  personIntrusion: "人员闯入",
  picture: "画面异常",
  screen_abnormal: "画面异常",
  screenAbnormal: "画面异常",
};

const RESULTS = ["real", "invalid", "unknown"];

// 单条指令即可：具体要求写在工作流提示词里，这里只保证模型知道要输出 JSON
const INSTRUCTION = "请按系统提示对本次告警的截图做复核，只输出 JSON。";

const STALE_RUNNING_MS = 5 * 60 * 1000;

const text = v => (v === undefined || v === null ? "" : String(v).trim());

function level(confidence) {
  const value = Number(confidence);
  if (!Number.isFinite(value)) return "";
  if (value >= 0.9) return "一级";
  if (value >= 0.75) return "二级";
  return "三级";
}

function eventInfo(data = {}) {
  return JSON.stringify({
    device_id: text(data.device_id),
    device_name: text(data.device_name),
    channel_id: text(data.channel_id),
    detection_type: text(data.detection_type),
    detection_type_label: DETECTION_TEXT[data.detection_type] || text(data.detection_type),
    confidence: Number.isFinite(Number(data.confidence)) ? Number(data.confidence) : null,
    alarm_level: level(data.confidence),
    alarm_time: text(data.alarm_time),
  });
}

function readRemote(url, timeout) {
  return new Promise((resolve, reject) => {
    request.get({ url, encoding: null, timeout }, (err, resp, body) => {
      if (err) return reject(err);
      if (!resp || resp.statusCode < 200 || resp.statusCode >= 300) return reject(new Error(`证据图片下载失败 HTTP ${resp && resp.statusCode}`));
      resolve(body);
    });
  });
}

// 证据图片字节：本地目录直读，七牛走私有下载地址回源一次
async function loadImage(platform, data) {
  if (data.image_storage && data.image_storage.storage === "qiniu") {
    if (!platform.fileStorage) throw new Error("未配置七牛告警图片存储");
    const bytes = await readRemote(platform.fileStorage.downloadURL(data.image_storage), 15000);
    return { bytes, mimeType: data.imageMimeType || "image/jpeg" };
  }
  if (!data.image) throw new Error("事件没有证据图片");
  const file = path.join(platform.root, "alarms", data.image);
  const bytes = await fs.promises.readFile(file);
  return { bytes, mimeType: data.imageMimeType || (data.image.endsWith(".png") ? "image/png" : "image/jpeg") };
}

function postJSON(url, headers, body, timeout) {
  return new Promise((resolve, reject) => {
    request.post({ url, headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(body), timeout }, (err, resp, raw) => {
      if (err) return reject(err);
      const status = resp && resp.statusCode;
      if (status < 200 || status >= 300) return reject(new Error(`AI 复核服务返回 HTTP ${status}：${String(raw || "").slice(0, 200)}`));
      try {
        resolve(typeof raw === "string" ? JSON.parse(raw) : raw);
      } catch (_) {
        reject(new Error("AI 复核服务返回内容不是合法 JSON"));
      }
    });
  });
}

// 逐个提取文本里的顶层 JSON 对象，忽略字符串内的花括号
function jsonObjects(raw) {
  const out = [];
  let depth = 0;
  let start = -1;
  let inString = false;
  let escaped = false;
  for (let i = 0; i < raw.length; i += 1) {
    const ch = raw[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') { inString = true; continue; }
    if (ch === "{") { if (depth === 0) start = i; depth += 1; continue; }
    if (ch === "}") {
      if (depth > 0) {
        depth -= 1;
        if (depth === 0 && start >= 0) { out.push(raw.slice(start, i + 1)); start = -1; }
      }
    }
  }
  return out;
}

/**
 * 模型可能在结论前后带解释、代码块，甚至吐两段 JSON（原文 + 归一化副本），
 * 因此逐个解析并取最后一个含合法 result 的对象。
 */
function parseAnswer(content) {
  const raw = text(content).replace(/```json/gi, "").replace(/```/g, "").trim();
  if (!raw) throw new Error("AI 未返回复核结论");
  const parsed = [];
  for (const piece of jsonObjects(raw)) {
    try { parsed.push(JSON.parse(piece)); } catch (_) { /* 忽略非法片段 */ }
  }
  for (let i = parsed.length - 1; i >= 0; i -= 1) {
    const item = parsed[i] || {};
    const result = text(item.result || item.conclusion).toLowerCase();
    if (!RESULTS.includes(result)) continue;
    return { result, reason: text(item.reason || item.explain).slice(0, 500) };
  }
  throw new Error(`AI 结论不在 real/invalid/unknown 内：${raw.slice(0, 160)}`);
}

function answerOf(response) {
  const choice = (response && response.choices && response.choices[0]) || {};
  const content = choice.message ? choice.message.content : choice.text;
  if (Array.isArray(content)) return content.map(part => (typeof part === "string" ? part : part && part.text) || "").join("");
  return content;
}

async function callModel(config, info, image) {
  const response = await postJSON(
    config.url,
    { Authorization: `Bearer ${config.apiKey}` },
    {
      // 每次独立复核，chatId 留空避免多轮上下文串味
      stream: false,
      detail: false,
      variables: { event_info: info },
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: INSTRUCTION },
            { type: "image_url", image_url: { url: `data:${image.mimeType};base64,${image.bytes.toString("base64")}` } },
          ],
        },
      ],
    },
    config.timeout || 60000,
  );
  if (response && response.code && !response.choices) throw new Error(`AI 复核服务返回错误：${text(response.message || response.statusText)}`);
  return parseAnswer(answerOf(response));
}

/* ---------------- 并发控制 ---------------- */

const inFlight = new Set();
const waiting = [];
let active = 0;
let limit = 2;

function pump() {
  while (active < limit && waiting.length) {
    const task = waiting.shift();
    active += 1;
    Promise.resolve()
      .then(task)
      .catch(() => {})
      .then(() => {
        active -= 1;
        pump();
      });
  }
}

/* ---------------- 复核主流程 ---------------- */

function reviewModel(models) {
  return models.EdgeEventReview;
}

async function ensureReview(models, eventId, data) {
  const [review] = await reviewModel(models).findOrCreate({
    where: { eventId },
    defaults: { eventId, deviceId: data.device_id, rowId: data.agent_row_id, aiStatus: "pending" },
    logging: false,
  });
  return review;
}

/**
 * 复核一个事件并落库。返回最新的 review 实例。
 * 无证据图片时记 waiting_evidence，等图片补齐后再次触发即可。
 */
async function review({ models, platform, config, eventId, data }) {
  const Model = reviewModel(models);
  if (!Model) throw new Error("AI 复核依赖 edge_event_review 表");
  const review = await ensureReview(models, eventId, data);

  // 进程内重复触发直接复用进行中的结果
  const runningAt = review.aiStatus === "running" && review.updated_at ? Date.now() - new Date(review.updated_at).getTime() : Infinity;
  if (review.aiStatus === "running" && runningAt < STALE_RUNNING_MS) return review;

  const hasImage = Boolean(data.image || (data.image_storage && data.image_storage.object_key));
  if (!hasImage) {
    review.aiStatus = "waiting_evidence";
    review.aiError = "暂无证据图片，无法复核";
    await review.save({ logging: false });
    return review;
  }

  review.aiStatus = "running";
  review.aiError = null;
  review.aiAttempt = (Number(review.aiAttempt) || 0) + 1;
  await review.save({ logging: false });

  const attempt = review.aiAttempt;
  const startedAt = Date.now();
  let entry;
  try {
    const image = await loadImage(platform, data);
    const conclusion = await callModel(config, eventInfo(data), image);
    review.aiStatus = "done";
    review.aiResult = conclusion.result;
    review.aiReason = conclusion.reason || null;
    review.aiModelVersion = text(config.model) || null;
    review.aiExecutedAt = new Date();
    review.aiError = null;
    entry = { attempt, status: "done", result: conclusion.result, reason: conclusion.reason || "", modelVersion: text(config.model) || "", error: null };
  } catch (error) {
    review.aiStatus = "failed";
    review.aiError = text(error && error.message).slice(0, 500);
    review.aiResult = null;
    review.aiExecutedAt = new Date();
    entry = { attempt, status: "failed", result: null, reason: "", modelVersion: text(config.model) || "", error: review.aiError };
  }
  entry.executedAt = new Date(review.aiExecutedAt || Date.now()).toISOString();
  entry.durationMs = Date.now() - startedAt;
  // 每次执行都留档，最多保留 10 次
  const history = Array.isArray(review.aiHistory) ? review.aiHistory.slice(-9) : [];
  review.aiHistory = [...history, entry];
  await review.save({ logging: false });
  return review;
}

/** 异步触发：不阻塞设备上报链路，失败只记日志 */
function enqueue({ models, platform, config, eventId, data }) {
  if (!config || !config.enabled || !config.url || !config.apiKey) return null;
  if (!models || !models.EdgeEventReview) return null;
  if (inFlight.has(eventId)) return null;
  limit = Math.max(1, Number(config.concurrency) || 2);
  inFlight.add(eventId);
  const run = () =>
    review({ models, platform, config, eventId, data })
      .catch(error => platform.app.fs.logger.error(`AI 复核失败 ${eventId}：${(error && error.message) || error}`))
      .then(() => inFlight.delete(eventId));
  waiting.push(run);
  pump();
  return run;
}

module.exports = { enqueue, review, eventInfo, level, parseAnswer, DETECTION_TEXT };
