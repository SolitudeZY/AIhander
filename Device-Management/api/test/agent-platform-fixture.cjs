const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { Op } = require("sequelize");
const { AgentPlatform } = require("../app/lib/service/agentPlatform");
function matches(row, where) {
  return Reflect.ownKeys(where || {}).every(key => {
    if (key === Op.or) return where[key].some(branch => matches(row, branch));
    if (key === Op.and) return where[key].every(branch => matches(row, branch));
    const actual = String(key).split(".").reduce((value, part) => value?.[part], row);
    const expected = where[key];
    if (expected && typeof expected === "object") {
      if (expected[Op.in]) return expected[Op.in].includes(actual);
      if (expected[Op.ne] !== undefined) return actual !== expected[Op.ne];
      if (expected[Op.gte] !== undefined && actual < expected[Op.gte]) return false;
      if (expected[Op.lte] !== undefined && actual > expected[Op.lte]) return false;
      return true;
    }
    return actual === expected;
  });
}
async function fixture(t) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "node-agent-platform-"));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  let rows = new Map();
  const state = { failKind: null, sent: [], online: new Set(), locks: [] };
  const model = {
    async findOne(options) { return (await this.findAll(options))[0] || null; },
    async findAll({ where, limit } = {}) {
      const found = [...rows.values()].filter(row => matches(row, where));
      return structuredClone(limit === undefined ? found : found.slice(0, limit));
    },
    async count({where}) { return [...rows.values()].filter(row => matches(row, where)).length; },
    async findAndCountAll(options) { const found = [...rows.values()].filter(row => matches(row, options.where)); return {count:found.length,rows:structuredClone(found.slice(options.offset || 0,(options.offset || 0)+(options.limit || found.length)))}; },
    async upsert(row) {
      if (state.failKind === row.kind) throw new Error("injected database failure");
      const key = `${row.kind}:${row.id}`;
      rows.set(key, structuredClone({ ...row, createdAt: rows.get(key)?.createdAt || new Date().toISOString() }));
    },
    async destroy({ where }) {
      let deleted = 0;
      for (const [key, row] of rows) if (matches(row, where)) { rows.delete(key); deleted++; }
      return deleted;
    },
  };
  const orm = {
    async transaction(callback) {
      const snapshot = structuredClone(rows);
      try { return await callback({}); } catch (error) { rows = snapshot; throw error; }
    },
    async query(sql, options) { state.locks.push({ sql, id: options.replacements.id }); },
  };
  const app = { fs: { logger: { error() {} }, dc: { models: { EdgeAgentRecord: model }, orm }, agentHub: {
    isConnected: id => state.online.has(id),
    send: (id, cmd, values) => { state.sent.push({ id, cmd, values }); return state.online.has(id); },
  } } };
  const service = new AgentPlatform(app, { dataDir: directory, publicURL: "http://platform.test:4700" });
  app.fs.agentPlatform = service;
  await service.ready;
  return { service, state, directory, app, model };
}
module.exports = { fixture, matches };
