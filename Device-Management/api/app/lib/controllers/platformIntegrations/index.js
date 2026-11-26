'use strict';

const request = require('request');
const mqtt = require('mqtt');
const alarmPush = require('../../service/alarmPush');

const models = ctx => ctx.fs.dc.models;

const text = v => (v === undefined || v === null ? '' : String(v).trim());

function fail(ctx, status, message) {
   ctx.status = status;
   ctx.body = { message };
}

const KINDS = ['mqtt', 'http'];

function alarmLevel(confidence) {
   const value = Number(confidence);
   if (!Number.isFinite(value)) return '';
   if (value >= 0.9) return '一级';
   if (value >= 0.75) return '二级';
   return '三级';
}

/* ---------------- 接收平台 ---------------- */

// 连接状态由该平台最近一次投递结果推断，不做额外探活
async function attachConnectState(ctx, rows) {
   const ids = rows.map(r => r.id).filter(Boolean);
   if (!ids.length) return rows;
   const records = await models(ctx).AlarmPushRecord.findAll({
      where: { configId: ids },
      order: [['id', 'DESC']],
      attributes: ['configId', 'status', 'errorMsg', 'created_at'],
      logging: false,
   });
   const latest = new Map();
   records.forEach(r => {
      if (!latest.has(r.configId)) latest.set(r.configId, r);
   });
   return rows.map(r => {
      const last = latest.get(r.id);
      return {
         ...r,
         lastPushStatus: last ? last.status : null,
         lastPushError: last ? last.errorMsg : null,
         lastPushAt: last ? last.created_at : null,
      };
   });
}

exports.listConfigs = async ctx => {
   try {
      const rows = await models(ctx).PlatformIntegrationConfig.findAll({
         order: [['id', 'DESC']],
         logging: false,
      });
      ctx.body = await attachConnectState(ctx, rows.map(r => r.toJSON()));
   } catch (error) {
      ctx.fs.logger.error(`接收平台查询失败: ${error.message}`);
      fail(ctx, 500, '查询接收平台失败');
   }
};

function validateConfig(body) {
   if (!text(body.name)) return '平台名称必填';
   if (!KINDS.includes(body.kind)) return '对接方式只能是 MQTT 推送或接口直连';
   // 模板填错等到告警触发才暴露就晚了，保存时先试解析一遍
   const templateError = alarmPush.checkTemplate(body.pushPayloadTemplate);
   if (templateError) return templateError;
   return null;
}

function toConfigRecord(body) {
   const kind = body.kind;
   const isMqtt = kind === 'mqtt';
   return {
      platform: kind,
      kind,
      name: text(body.name),
      pushUrl: isMqtt ? null : text(body.pushUrl) || null,
      credential: isMqtt ? null : text(body.credential) || null,
      // 结构物查询接口与推送通道无关，两种方式都可配
      structureApiUrl: text(body.structureApiUrl) || null,
      // 账号鉴权：仅接口直连需要（MQTT 用自己的账号密码）。留空则直接调用，不换 token
      authUrl: isMqtt ? null : text(body.authUrl) || null,
      authUsername: isMqtt ? null : text(body.authUsername) || null,
      authPassword: isMqtt ? null : text(body.authPassword) || null,
      tokenPath: isMqtt ? null : text(body.tokenPath) || null,
      tokenTtl: isMqtt ? null : (Number(body.tokenTtl) > 0 ? Number(body.tokenTtl) : null),
      mqttBroker: isMqtt ? text(body.mqttBroker) || null : null,
      mqttTopic: isMqtt ? text(body.mqttTopic) || 'anxin/alarm/{deviceId}' : null,
      mqttClientId: isMqtt ? text(body.mqttClientId) || null : null,
      mqttUsername: isMqtt ? text(body.mqttUsername) || null : null,
      mqttPassword: isMqtt ? text(body.mqttPassword) || null : null,
      // 推送报文模板两种方式通用：整段 body 原样发，为空则用内置告警字段
      pushPayloadTemplate: text(body.pushPayloadTemplate) || null,
      confirmCallback: body.confirmCallback === true,
      enabled: body.enabled !== false,
      scopeType: 'platform',
      projectId: null,
      deviceCode: null,
      structId: null,
      channel: kind,
   };
}

exports.saveConfig = async ctx => {
   try {
      const body = ctx.request.body || {};
      const message = validateConfig(body);
      if (message) return fail(ctx, 400, message);

      const record = toConfigRecord(body);
      const id = Number(ctx.params.configId || body.id || 0);

      if (id) {
         const existing = await models(ctx).PlatformIntegrationConfig.findByPk(id, { logging: false });
         if (!existing) return fail(ctx, 404, '接收平台不存在');
         await existing.update(record, { logging: false });
         ctx.body = existing.toJSON();
         return;
      }

      const duplicate = await models(ctx).PlatformIntegrationConfig.findOne({
         where: { name: record.name },
         logging: false,
      });
      if (duplicate) return fail(ctx, 409, '该平台名称已存在，请直接编辑');

      const created = await models(ctx).PlatformIntegrationConfig.create(
         { ...record, createdBy: (ctx.fs.api || {}).userId || null },
         { logging: false },
      );
      ctx.body = created.toJSON();
   } catch (error) {
      ctx.fs.logger.error(`接收平台保存失败: ${error.message}`);
      fail(ctx, 500, '保存接收平台失败');
   }
};

exports.removeConfig = async ctx => {
   try {
      const id = Number(ctx.params.configId);
      const row = await models(ctx).PlatformIntegrationConfig.findByPk(id, { logging: false });
      if (!row) return fail(ctx, 404, '接收平台不存在');
      await models(ctx).PlatformIntegrationMapping.destroy({ where: { platformConfigId: id }, logging: false });
      await models(ctx).PlatformIntegrationSubscription.destroy({ where: { platformConfigId: id }, logging: false });
      await row.destroy({ logging: false });
      ctx.body = { success: true };
   } catch (error) {
      ctx.fs.logger.error(`接收平台删除失败: ${error.message}`);
      fail(ctx, 500, '删除接收平台失败');
   }
};

// 只探测连通性，不下发告警，避免测试动作产生副作用
exports.testConfig = async ctx => {
   try {
      const id = Number(ctx.params.configId);
      const row = await models(ctx).PlatformIntegrationConfig.findByPk(id, { logging: false });
      if (!row) return fail(ctx, 404, '接收平台不存在');
      const started = Date.now();

      if (row.kind === 'mqtt') {
         if (!text(row.mqttBroker)) return fail(ctx, 400, 'MQTT Broker 未配置');
         let client = null;
         const result = await new Promise(resolve => {
            let settled = false;
            const done = r => {
               if (settled) return;
               settled = true;
               try { if (client) client.end(true); } catch (_) {}
               resolve(r);
            };
            client = mqtt.connect(row.mqttBroker, {
               clientId: row.mqttClientId || `fs_alarm_test_${Date.now()}`,
               username: row.mqttUsername || undefined,
               password: row.mqttPassword || undefined,
               connectTimeout: 5000,
               reconnectPeriod: 0,
            });
            client.once('connect', () => done({ reachable: true }));
            client.once('error', e => done({ reachable: false, error: e.message }));
            setTimeout(() => done({ reachable: false, error: '连接超时' }), 6000);
         });
         ctx.body = { ...result, kind: 'mqtt', durationMs: Date.now() - started };
         return;
      }

      if (!text(row.pushUrl)) return fail(ctx, 400, '推送地址为空');
      const result = await new Promise(resolve => {
         request.get({ url: row.pushUrl, timeout: 5000, followRedirect: false }, (err, resp) => {
            if (err) return resolve({ reachable: false, error: err.message });
            resolve({ reachable: true, statusCode: resp && resp.statusCode });
         });
      });
      ctx.body = { ...result, durationMs: Date.now() - started };
   } catch (error) {
      ctx.fs.logger.error(`接收平台连通性测试失败: ${error.message}`);
      fail(ctx, 500, '测试连接失败');
   }
};

/* ---------------- 对象关联 ---------------- */async function configMap(ctx) {
   const rows = await models(ctx).PlatformIntegrationConfig.findAll({
      attributes: ['id', 'name', 'kind'],
      logging: false,
   });
   return new Map(rows.map(r => [r.id, r.toJSON()]));
}

async function projectNameMap(ctx, ids) {
   const list = [...new Set(ids.filter(Boolean))];
   if (!list.length) return new Map();
   const rows = await models(ctx).Project.findAll({ where: { id: list }, attributes: ['id', 'name'], logging: false });
   return new Map(rows.map(r => [r.id, r.name]));
}

exports.listMappings = async ctx => {
   try {
      const rows = await models(ctx).PlatformIntegrationMapping.findAll({ order: [['id', 'DESC']], logging: false });
      const configs = await configMap(ctx);
      const projects = await projectNameMap(ctx, rows.map(r => r.projectId));
      ctx.body = rows.map(r => {
         const item = r.toJSON();
         const config = configs.get(item.platformConfigId);
         return {
            ...item,
            platformName: config ? config.name : '',
            platformKind: config ? config.kind : '',
            projectName: projects.get(item.projectId) || '',
         };
      });
   } catch (error) {
      ctx.fs.logger.error(`对象关联查询失败: ${error.message}`);
      fail(ctx, 500, '查询对象关联失败');
   }
};

function validateMapping(body) {
   if (!Number.isInteger(Number(body.platformConfigId))) return '接收平台必填';
   if (!Number.isInteger(Number(body.projectId)) || Number(body.projectId) < 1) return '本平台项目必填';
   if (!text(body.deviceCode)) return '设备必填';
   if (!text(body.structureName) || !text(body.structureId)) return '外部结构物名称与 ID 必填';
   if (!text(body.sourceName) || !text(body.sourceId)) return '外部告警源名称与 ID 必填';
   return null;
}

function toMappingRecord(body) {
   return {
      platformConfigId: Number(body.platformConfigId),
      projectId: Number(body.projectId),
      deviceCode: text(body.deviceCode),
      channelName: text(body.channelName) || null,
      structureName: text(body.structureName),
      structureId: text(body.structureId),
      sourceName: text(body.sourceName),
      sourceId: text(body.sourceId),
   };
}

exports.saveMapping = async ctx => {
   try {
      const body = ctx.request.body || {};
      const message = validateMapping(body);
      if (message) return fail(ctx, 400, message);

      const record = toMappingRecord(body);
      const id = Number(ctx.params.mappingId || body.id || 0);

      if (id) {
         const existing = await models(ctx).PlatformIntegrationMapping.findByPk(id, { logging: false });
         if (!existing) return fail(ctx, 404, '对象关联不存在');
         await existing.update(record, { logging: false });
         ctx.body = existing.toJSON();
         return;
      }

      const duplicate = await models(ctx).PlatformIntegrationMapping.findOne({
         where: {
            platformConfigId: record.platformConfigId,
            projectId: record.projectId,
            deviceCode: record.deviceCode,
            channelName: record.channelName,
         },
         logging: false,
      });
      if (duplicate) return fail(ctx, 409, '该设备与通道已关联，请直接编辑');

      const created = await models(ctx).PlatformIntegrationMapping.create(record, { logging: false });
      ctx.body = created.toJSON();
   } catch (error) {
      ctx.fs.logger.error(`对象关联保存失败: ${error.message}`);
      fail(ctx, 500, '保存对象关联失败');
   }
};

exports.removeMapping = async ctx => {
   try {
      const id = Number(ctx.params.mappingId);
      const row = await models(ctx).PlatformIntegrationMapping.findByPk(id, { logging: false });
      if (!row) return fail(ctx, 404, '对象关联不存在');
      await row.destroy({ logging: false });
      ctx.body = { success: true };
   } catch (error) {
      ctx.fs.logger.error(`对象关联删除失败: ${error.message}`);
      fail(ctx, 500, '删除对象关联失败');
   }
};

/* ---------------- 推送订阅 ---------------- */

exports.listSubscriptions = async ctx => {
   try {
      const rows = await models(ctx).PlatformIntegrationSubscription.findAll({ order: [['id', 'DESC']], logging: false });
      const configs = await configMap(ctx);
      const projects = await projectNameMap(ctx, rows.map(r => r.projectId));
      ctx.body = rows.map(r => {
         const item = r.toJSON();
         const config = configs.get(item.platformConfigId);
         return {
            ...item,
            platformName: config ? config.name : '',
            platformKind: config ? config.kind : '',
            projectName: projects.get(item.projectId) || '',
         };
      });
   } catch (error) {
      ctx.fs.logger.error(`推送订阅查询失败: ${error.message}`);
      fail(ctx, 500, '查询推送订阅失败');
   }
};

const TIMINGS = ['created', 'confirmed', 'recovered'];

function validateSubscription(body) {
   if (!Number.isInteger(Number(body.projectId)) || Number(body.projectId) < 1) return '所属项目必填';
   if (!Number.isInteger(Number(body.platformConfigId))) return '接收平台必填';
   if (!Array.isArray(body.types) || !body.types.length) return '告警类型必填';
   if (!Array.isArray(body.levels) || !body.levels.length) return '告警级别必填';
   if (!Array.isArray(body.timings) || !body.timings.length) return '推送时机必填';
   if (body.timings.some(t => !TIMINGS.includes(t))) return '推送时机不合法';
   return null;
}

function toSubscriptionRecord(body) {
   return {
      projectId: Number(body.projectId),
      platformConfigId: Number(body.platformConfigId),
      types: body.types.map(t => text(t)).filter(Boolean),
      levels: body.levels.map(t => text(t)).filter(Boolean),
      timings: body.timings,
      enabled: body.enabled !== false,
   };
}

exports.saveSubscription = async ctx => {
   try {
      const body = ctx.request.body || {};
      const message = validateSubscription(body);
      if (message) return fail(ctx, 400, message);

      const record = toSubscriptionRecord(body);
      const id = Number(ctx.params.subscriptionId || body.id || 0);

      if (id) {
         const existing = await models(ctx).PlatformIntegrationSubscription.findByPk(id, { logging: false });
         if (!existing) return fail(ctx, 404, '推送订阅不存在');
         await existing.update(record, { logging: false });
         ctx.body = existing.toJSON();
         return;
      }

      const duplicate = await models(ctx).PlatformIntegrationSubscription.findOne({
         where: { projectId: record.projectId, platformConfigId: record.platformConfigId },
         logging: false,
      });
      if (duplicate) return fail(ctx, 409, '该项目已订阅该平台，请直接编辑');

      const created = await models(ctx).PlatformIntegrationSubscription.create(record, { logging: false });
      ctx.body = created.toJSON();
   } catch (error) {
      ctx.fs.logger.error(`推送订阅保存失败: ${error.message}`);
      fail(ctx, 500, '保存推送订阅失败');
   }
};

exports.removeSubscription = async ctx => {
   try {
      const id = Number(ctx.params.subscriptionId);
      const row = await models(ctx).PlatformIntegrationSubscription.findByPk(id, { logging: false });
      if (!row) return fail(ctx, 404, '推送订阅不存在');
      await row.destroy({ logging: false });
      ctx.body = { success: true };
   } catch (error) {
      ctx.fs.logger.error(`推送订阅删除失败: ${error.message}`);
      fail(ctx, 500, '删除推送订阅失败');
   }
};

/* ---------------- 推送记录 ---------------- */

function toPushItem(row) {
   const item = row.toJSON();
   const body = item.requestBody || {};
   return {
      ...item,
      projectName: body.project_name || '',
      alarmType: body.alarm_type || '',
      alarmLevel: body.alarm_level || alarmLevel(body.alarm_confidence),
      pushTime: item.created_at,
      pushTimeLabel: item.messageType === 'recovery' ? '异常恢复同步' : '人工确认后推送',
   };
}

exports.listPushRecords = async ctx => {
   try {
      const page = Math.max(1, Number(ctx.query.page) || 1);
      const size = Math.min(100, Math.max(1, Number(ctx.query.pageSize) || 10));
      const where = {};
      if (text(ctx.query.platform)) where.platform = text(ctx.query.platform);
      if (text(ctx.query.status)) where.status = text(ctx.query.status);
      if (text(ctx.query.eventId)) where.eventId = text(ctx.query.eventId);

      const result = await models(ctx).AlarmPushRecord.findAndCountAll({
         where,
         order: [['id', 'DESC']],
         limit: size,
         offset: (page - 1) * size,
         logging: false,
      });
      ctx.body = { items: result.rows.map(toPushItem), total: result.count };
   } catch (error) {
      ctx.fs.logger.error(`推送记录查询失败: ${error.message}`);
      fail(ctx, 500, '查询推送记录失败');
   }
};

// 按项目拉取安心云结构物列表：配置了 structureApiUrl 才有候选，否则前端退回手工填写
exports.listStructures = async ctx => {
   try {
      const id = Number(ctx.params.configId);
      const row = await models(ctx).PlatformIntegrationConfig.findByPk(id, { logging: false });
      if (!row) return fail(ctx, 404, '接收平台不存在');
      // 未配置结构物接口时不报错，返回空候选让前端退回手工填写
      if (!text(row.structureApiUrl)) {
         ctx.body = { items: [], configured: false };
         return;
      }

      const projectId = text(ctx.query.projectId);
      const url = row.structureApiUrl.replace(/\{projectId\}/g, encodeURIComponent(projectId));
      const headers = {};
      if (text(row.credential)) headers.Authorization = row.credential;

      const payload = await new Promise((resolve, reject) => {
         request.get({ url, headers, json: true, timeout: 8000 }, (err, resp, body) => {
            if (err) return reject(new Error(err.message));
            if (!resp || resp.statusCode < 200 || resp.statusCode >= 300) return reject(new Error(`结构物接口返回 HTTP ${resp && resp.statusCode}`));
            resolve(body);
         });
      });

      const list = Array.isArray(payload) ? payload : (payload && (payload.data || payload.items || payload.list)) || [];
      ctx.body = {
         configured: true,
         items: (Array.isArray(list) ? list : []).map(item => ({
            id: text(item.id || item.structureId || item.structure_id || item.code),
            name: text(item.name || item.structureName || item.structure_name || item.title),
         })).filter(item => item.id),
      };
   } catch (error) {
      ctx.fs.logger.error(`结构物列表查询失败: ${error.message}`);
      fail(ctx, 502, `查询结构物失败：${error.message}`);
   }
};
