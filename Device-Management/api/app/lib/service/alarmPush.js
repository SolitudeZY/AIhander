'use strict';

const request = require('request');
const mqtt = require('mqtt');

const text = v => (v === undefined || v === null ? '' : String(v).trim());

/**
 * 解析生效的关联：设备级优先，其次项目级；同一设备可关联多个接收平台，逐个投递。
 * 结构物与告警源来自「对象关联」，推送地址与凭证来自「接收平台」。
 */
async function resolveBindings(models, { deviceCode, projectId }) {
   let mappings = [];
   if (deviceCode) {
      mappings = await models.PlatformIntegrationMapping.findAll({
         where: { deviceCode },
         order: [['id', 'DESC']],
         logging: false,
      });
   }
   if (!mappings.length && projectId) {
      mappings = await models.PlatformIntegrationMapping.findAll({
         where: { projectId, deviceCode: null },
         order: [['id', 'DESC']],
         logging: false,
      });
   }
   if (!mappings.length) return [];

   const configs = await models.PlatformIntegrationConfig.findAll({
      where: { id: [...new Set(mappings.map(m => m.platformConfigId))], enabled: true },
      logging: false,
   });
   const configMap = new Map(configs.map(c => [c.id, c]));

   return mappings
      .map(mapping => ({ mapping, config: configMap.get(mapping.platformConfigId) }))
      .filter(binding => Boolean(binding.config));
}

// 订阅里的类型用业务编码存，历史事件的 detection_type 有多个别名，统一归一后再比对
const TYPE_CANONICAL = {
   landslide: 'slope_deform', slope_deform: 'slope_deform', slope: 'slope_deform',
   person: 'person', person_intrusion: 'person', personIntrusion: 'person', intrusion: 'person',
   picture: 'screen_abnormal', screen_abnormal: 'screen_abnormal', screenAbnormal: 'screen_abnormal',
};
// 订阅级别只分高/中：一级、二级归高，三级归中
const LEVEL_GROUP = { 一级: '高', 二级: '高', 三级: '中', 高: '高', 中: '中' };

const canonicalType = value => TYPE_CANONICAL[text(value)] || text(value);

/**
 * 订阅按项目 + 平台生效，三个维度都要满足：时机、告警类型、告警级别。
 * 任一维度配置为空数组时视为不限制，避免历史订阅漏推。
 */
async function checkSubscription(models, { projectId, platformConfigId, timing, detectionType, confidence }) {
   if (!projectId) return { allowed: true };
   const subscription = await models.PlatformIntegrationSubscription.findOne({
      where: { projectId, platformConfigId, enabled: true },
      logging: false,
   });
   if (!subscription) return { allowed: true };

   const timings = Array.isArray(subscription.timings) ? subscription.timings : [];
   if (timings.length && !timings.includes(timing)) {
      return { allowed: false, reason: `推送订阅未包含「${({ created: '告警产生', confirmed: '人工确认', recovered: '异常恢复' })[timing] || timing}」时机` };
   }

   const types = (Array.isArray(subscription.types) ? subscription.types : []).map(canonicalType).filter(Boolean);
   const eventType = canonicalType(detectionType);
   if (types.length && !types.includes(eventType)) {
      return { allowed: false, reason: `推送订阅未包含告警类型 ${detectionType || '未知'}` };
   }

   const levels = (Array.isArray(subscription.levels) ? subscription.levels : []).map(v => LEVEL_GROUP[text(v)] || text(v)).filter(Boolean);
   const eventLevel = LEVEL_GROUP[alarmLevel(confidence)] || '';
   if (levels.length && !levels.includes(eventLevel)) {
      return { allowed: false, reason: `推送订阅未包含「${eventLevel || '未知'}」级别告警` };
   }

   return { allowed: true };
}

/**
 * 推送报文按对接方给的字段清单收敛：
 * MQTT   → 告警时间、告警id、告警内容、设备id、设备名称、项目名称（取自设备管理平台）
 * 直连   → 同上，另加外部结构物ID
 * 确认信息（结论/备注/确认人）对方未要求，不下发。
 */
function alarmLevel(confidence) {
   const value = Number(confidence);
   if (!Number.isFinite(value)) return '';
   if (value >= 0.9) return '一级';
   if (value >= 0.75) return '二级';
   return '三级';
}

const DETECTION_TEXT = {
   landslide: '边坡位移', slope_deform: '边坡位移',
   person_intrusion: '人员闯入', person: '人员闯入', personIntrusion: '人员闯入',
   picture: '画面异常', screen_abnormal: '画面异常', screenAbnormal: '画面异常',
};

// 告警内容：接收方直接可读的一句话
function alarmContent(event) {
   const label = DETECTION_TEXT[text(event.detection_type)] || text(event.detection_type) || '未知告警';
   const confidence = Number(event.confidence);
   return Number.isFinite(confidence) ? `${label}，置信度 ${Math.round(confidence * 100)}%` : label;
}

function buildPayload({ event, eventId, project, deviceName, structId }) {
   return {
      alarm_id: eventId,
      alarm_time: event.alarm_time,
      alarm_content: alarmContent(event),
      device_id: event.device_id,
      device_name: deviceName || event.device_name || event.device_id,
      project_name: project ? project.name : '',
      // 标明项目名来自设备管理平台，避免与安心云同名项目混淆
      project_source: 'device_platform',
      // 安心云靠结构物ID定位点位与声光报警器，两个通道都下发
      structure_id: structId || '',
   };
}

/* ---------------- 推送报文模板 ---------------- */

/**
 * 模板可替换变量：camelCase 为主写法，另生成一份 snake_case 别名，
 * 这样对方报文里写 alarm_id 或 alarmId 都能对上。
 */
function templateVars({ event, eventId, project, deviceName, structId, token }) {
   const vars = {
      alarmId: eventId,
      alarmTime: event.alarm_time,
      alarmContent: alarmContent(event),
      deviceId: event.device_id,
      deviceName: deviceName || event.device_name || event.device_id,
      projectId: project ? project.id : '',
      projectName: project ? project.name : '',
      projectSource: 'device_platform',
      structureId: structId || '',
      token: token || '',
   };
   Object.keys(vars).forEach(key => {
      vars[key.replace(/[A-Z]/g, c => `_${c.toLowerCase()}`)] = vars[key];
   });
   return vars;
}

// 值塞进 JSON 模板前要转义，否则告警内容里的引号会破坏报文结构
const escapeJsonValue = value =>
   JSON.stringify(String(value === undefined || value === null ? '' : value)).slice(1, -1);

/**
 * 只替换认识的占位符，报文自带的花括号结构（{}、{"a":1}）原样保留。
 */
function renderTemplate(template, vars) {
   return text(template).replace(/\{(\w+)\}/g, (match, key) =>
      Object.prototype.hasOwnProperty.call(vars, key) ? escapeJsonValue(vars[key]) : match,
   );
}

/**
 * 组装本次要发的报文。
 * 配了模板就按模板渲染，整段 body 原样发（JSON 解析成对象）；没配则退回内置告警字段。
 */
function buildOutgoing({ event, eventId, project, deviceName, structId, template, token }) {
   if (!text(template)) {
      return { payload: buildPayload({ event, eventId, project, deviceName, structId }) };
   }
   const rendered = renderTemplate(template, templateVars({ event, eventId, project, deviceName, structId, token }));
   const trimmed = rendered.trim();
   // JSON 模板先解析：既保证报文合法，也让推送记录存结构化内容
   if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
         return { payload: JSON.parse(rendered) };
      } catch (error) {
         return { error: `推送报文模板不是合法 JSON：${error.message}` };
      }
   }
   return { payload: rendered };
}

/**
 * 保存时校验模板：把占位符换成纯字母试解析一遍。
 * 占位值不加引号，所以「裸值」写法（{alarmId} 不在引号内）也会在这里暴露出来。
 */
function checkTemplate(template) {
   const probe = text(template);
   if (!probe) return null;
   if (!probe.startsWith('{') && !probe.startsWith('[')) return null;
   try {
      JSON.parse(probe.replace(/\{(\w+)\}/g, 'placeholder'));
      return null;
   } catch (error) {
      return `推送报文模板不是合法 JSON：${error.message}`;
   }
}

// 推送地址占位符：{structureId} {deviceId} {projectId} {token}
// 安心云的下发接口是 /structure/{structureId}/flashDevices/invoke?token=xxx，结构物ID在路径里
function renderUrl(template, vars) {
   return text(template).replace(/\{(\w+)\}/g, (match, key) => {
      const value = vars[key];
      if (value === undefined || value === null) return '';
      // token 可能含 / + = 等字符，拼进 query 前要编码
      return key === 'token' ? encodeURIComponent(String(value)) : String(value);
   });
}

// token 进程内缓存：key 为接收平台 id，提前 5 分钟过期避免临界失效
const tokenCache = new Map();

function pickToken(payload, path) {
   const read = key => key.split('.').reduce((acc, k) => (acc === null || acc === undefined ? acc : acc[k]), payload);
   if (text(path)) {
      const value = read(text(path));
      if (text(value)) return text(value);
   }
   // 没配路径或配的路径取不到时按常见字段兜底
   for (const key of ['access_token', 'accessToken', 'token', 'data.access_token', 'data.accessToken', 'data.token']) {
      const value = read(key);
      if (text(value)) return text(value);
   }
   return '';
}

/**
 * 用配置的账号换 token。未配置鉴权地址时直接返回空 token（保持「配了地址就直发」的旧行为）。
 */
function requestToken(config, timeout = 5000) {
   return new Promise(resolve => {
      if (!text(config.authUrl)) return resolve({ token: '' });
      const cached = tokenCache.get(config.id);
      if (cached && cached.expireAt > Date.now()) return resolve({ token: cached.token });

      const body = { username: text(config.authUsername), password: text(config.authPassword) };
      request.post({ url: text(config.authUrl), json: body, timeout }, (err, resp, payload) => {
         if (err) return resolve({ error: `鉴权请求失败：${err.message}` });
         const code = resp && resp.statusCode;
         if (!(code >= 200 && code < 300)) return resolve({ error: `鉴权接口返回 HTTP ${code || '无响应'}` });
         const token = pickToken(payload, config.tokenPath);
         if (!token) return resolve({ error: '鉴权接口未返回 token，请检查 token 字段路径' });
         const ttl = Number(config.tokenTtl) > 0 ? Number(config.tokenTtl) : 7200;
         tokenCache.set(config.id, { token, expireAt: Date.now() + Math.max(ttl - 300, 30) * 1000 });
         resolve({ token });
      });
   });
}

function pushHttp(config, payload, vars = {}, timeout = 5000) {
   return new Promise(resolve => {
      const started = Date.now();
      const tpl = text(config.pushUrl);
      const url = renderUrl(tpl, vars);
      const headers = {};
      // 模板是纯文本时按原样发；对象交给 request 序列化成 JSON
      const options = { url, timeout, headers };
      if (typeof payload === 'string') {
         headers['Content-Type'] = 'application/json';
         options.body = payload;
      } else {
         options.json = payload;
      }
      if (config.credential) headers.Authorization = config.credential;
      // 地址里没写 {token} 时，把换到的 token 放到请求头，兼容两种传法
      if (vars.token && !/\{token\}/.test(tpl)) headers.token = vars.token;
      request.post(options, (err, resp, body) => {
         const code = resp && resp.statusCode;
         const ok = !err && code >= 200 && code < 300;
         let text;
         try {
            text = typeof body === 'string' ? body : JSON.stringify(body || {});
         } catch (_) {
            text = '';
         }
         resolve({
            status: ok ? 'success' : 'failed',
            responseCode: code,
            responseBody: (text || '').slice(0, 2000),
            errorMsg: err ? err.message : ok ? null : `HTTP ${code || '无响应'}`,
            durationMs: Date.now() - started,
         });
      });
   });
}

const DEFAULT_TOPIC = 'anxin/alarm/{deviceId}';

// Topic 模板占位符替换：{deviceId} {deviceName} {projectId} {projectName}
function renderTopic(template, vars) {
   const tpl = text(template) || DEFAULT_TOPIC;
   return tpl.replace(/\{(\w+)\}/g, (match, key) => {
      const value = vars[key];
      return value === undefined || value === null ? '' : String(value);
   });
}

// 单次投递用短连接：连上 → publish(qos 1) → 断开，不做重连保活
function pushMqtt(config, payload, topicVars) {
   return new Promise(resolve => {
      const started = Date.now();
      let finished = false;
      let client = null;
      const finish = result => {
         if (finished) return;
         finished = true;
         try { if (client) client.end(true); } catch (_) {}
         resolve({ ...result, durationMs: Date.now() - started });
      };
      client = mqtt.connect(config.mqttBroker, {
         clientId: config.mqttClientId || `fs_alarm_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
         username: config.mqttUsername || undefined,
         password: config.mqttPassword || undefined,
         connectTimeout: 5000,
         reconnectPeriod: 0,
      });
      client.once('error', e => finish({ status: 'failed', errorMsg: e.message }));
      client.once('connect', () => {
         const topic = renderTopic(config.mqttTopic, topicVars || {});
         // 模板配成纯文本时原样发，避免多包一层引号
         const body = typeof payload === 'string' ? payload : JSON.stringify(payload);
         client.publish(topic, body, { qos: 1 }, err =>
            finish(err ? { status: 'failed', errorMsg: err.message } : { status: 'success', topic }),
         );
      });
      setTimeout(() => finish({ status: 'failed', errorMsg: 'MQTT 推送超时' }), 8000);
   });
}

/**
 * 投递一条告警。无论成功失败都会落一条 push_record，列表的推送状态从这里取。
 * 目前只支持「人工确认为真实告警」这一个推送时机。
 */
async function deliver({ models, event, eventId, project, deviceName, operatorId }) {
   // 一次投递共用一个批次号，列表据此聚合出「部分失败」
   const batch = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
   const bindings = await resolveBindings(models, {
      deviceCode: event.device_id,
      projectId: project && project.id,
   });

   if (!bindings.length) {
      await models.AlarmPushRecord.create(
         { eventId, alarmId: eventId, platform: 'http', status: 'skipped', batch, errorMsg: '未配置接收平台或对象关联', operatorId },
         { logging: false },
      );
      return { status: 'skipped', message: '未配置接收平台或对象关联，仅保存复核结论' };
   }

   // 直连优先：本设备只要有一条可用的 HTTP 直连地址，就不再走 MQTT
   const httpReady = bindings.filter(b => (b.config.kind || 'http') === 'http' && text(b.config.pushUrl));
   const useDirect = httpReady.length > 0;

   const results = [];
   for (const { config, mapping } of bindings) {
      if (useDirect && (config.kind || 'http') !== 'http') {
         await models.AlarmPushRecord.create(
            {
               eventId,
               alarmId: eventId,
               platform: config.kind || 'mqtt',
               channel: config.kind || 'mqtt',
               configId: config.id,
               batch,
               status: 'skipped',
               errorMsg: '已配置直连地址，按直连优先未走 MQTT',
               operatorId,
            },
            { logging: false },
         );
         results.push({ platform: config.name, status: 'skipped', message: '已配置直连地址，按直连优先未走 MQTT' });
         continue;
      }

      const subscription = await checkSubscription(models, {
         projectId: project && project.id,
         platformConfigId: config.id,
         timing: 'confirmed',
         detectionType: event.detection_type,
         confidence: event.confidence,
      });

      if (!subscription.allowed) {
         await models.AlarmPushRecord.create(
            {
               eventId,
               alarmId: eventId,
               platform: config.kind || 'http',
               channel: config.kind || 'http',
               configId: config.id,
               batch,
               status: 'skipped',
               errorMsg: subscription.reason,
               operatorId,
            },
            { logging: false },
         );
         results.push({ platform: config.name, status: 'skipped', message: subscription.reason });
         continue;
      }

      // 报文在拿到 token 之后再组装：模板里可能有 {token}
      let payload = null;

      // 地址未配置时按跳过处理，避免照常发起请求再记成失败
      let result;
      if (config.kind === 'mqtt') {
         const built = buildOutgoing({
            event,
            eventId,
            project,
            deviceName,
            structId: mapping.structureId,
            template: config.pushPayloadTemplate,
         });
         payload = built.payload;
         if (built.error) {
            result = { status: 'failed', errorMsg: built.error };
         } else if (!text(config.mqttBroker)) {
            result = { status: 'skipped', errorMsg: 'MQTT Broker 未配置' };
         } else {
            result = await pushMqtt(config, payload, {
               deviceId: event.device_id,
               deviceName: deviceName || event.device_name || event.device_id,
               projectId: project && project.id,
               projectName: project && project.name,
            });
         }
      } else if (!text(config.pushUrl)) {
         result = { status: 'skipped', errorMsg: '推送地址未配置' };
      } else {
         // 配置了鉴权地址时先换 token；没配则 token 为空，按原方式直发
         const auth = await requestToken(config);
         if (auth.error) {
            result = { status: 'failed', errorMsg: auth.error };
         } else {
            const built = buildOutgoing({
               event,
               eventId,
               project,
               deviceName,
               structId: mapping.structureId,
               template: config.pushPayloadTemplate,
               token: auth.token,
            });
            payload = built.payload;
            result = built.error
               ? { status: 'failed', errorMsg: built.error }
               : await pushHttp(config, payload, {
                    structureId: mapping.structureId,
                    deviceId: event.device_id,
                    projectId: project && project.id,
                    token: auth.token,
                 });
         }
      }

      await models.AlarmPushRecord.create(
         {
            eventId,
            alarmId: eventId,
            platform: config.kind || 'http',
            channel: config.kind || 'http',
            configId: config.id,
            batch,
            messageType: 'alarm',
            // 纯文本报文包一层，jsonb 列存对象才能被列表读出来
            requestBody: typeof payload === 'string' ? { raw: payload } : payload,
            status: result.status,
            responseCode: result.responseCode,
            responseBody: result.responseBody,
            errorMsg: result.errorMsg,
            durationMs: result.durationMs,
            operatorId,
         },
         { logging: false },
      );

      const successText =
         config.kind === 'mqtt'
            ? `已通过 MQTT 推送至${config.name || '接收平台'}（${result.topic || config.mqttTopic || ''}，${result.durationMs} ms）`
            : `已推送至${config.name || '接收平台'}（HTTP ${result.responseCode || 200}，${result.durationMs} ms）`;

      results.push({
         platform: config.name,
         status: result.status,
         message:
            result.status === 'success'
               ? successText
               : result.status === 'skipped'
                  ? `${config.name || '接收平台'}未投递：${result.errorMsg}`
                  : `推送失败：${result.errorMsg || '未知错误'}`,
      });
   }

   const succeeded = results.filter(r => r.status === 'success');
   const failed = results.filter(r => r.status === 'failed');
   const status = failed.length ? 'failed' : succeeded.length ? 'success' : 'skipped';

   return {
      status,
      message:
         results.length === 1
            ? results[0].message
            : `共 ${results.length} 个平台：成功 ${succeeded.length}，失败 ${failed.length}`,
      results,
   };
}

module.exports = { deliver, resolveBindings, buildPayload, buildOutgoing, checkTemplate, renderTopic };
