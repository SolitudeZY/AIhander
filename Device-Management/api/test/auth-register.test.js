"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { Op } = require("sequelize");
const auth = require("../app/lib/controllers/auth");

function fixture(overrides = {}) {
  const calls = []; const logs = [];
  const transaction = {
    async commit() { calls.push("commit"); this.finished = "commit"; },
    async rollback() { calls.push("rollback"); this.finished = "rollback"; },
  };
  const sequelize = { fn() {}, col() {} };
  const models = {
    User: { sequelize,
      async findOne(options) { calls.push(options); return null; },
      async create(data) { calls.push(data); return { id: 99 }; } },
    Organization: { async findOne() { return { id: 1 }; } },
    Department: { async findOne() { return { id: 2 }; } },
    RoleGroup: { async findOne() { return { id: 3 }; } },
    Role: { async findOne() { return { id: 4 }; } },
    Resource: { async findAll() { return []; } },
    RoleResource: { async findAll() { return []; } },
    TypePost: { async findOne() { return { id: 5 }; } },
    UserRole: { async create() { calls.push("user-role"); } },
  };
  Object.assign(models, overrides);
  const ctx = { request: { body: { name: "张三", username: "register_test", password: "test-only" } },
    fs: { dc: { models, orm: { async transaction() { calls.push("transaction"); return transaction; } } },
      logger: { error(message) { logs.push(message); } } } };
  return { ctx, calls, logs, transaction, models };
}

test("invalid registration responds before touching unavailable database", async () => {
  for (const body of [{}, { name: "张三", username: "包含中文", password: "ok" }, { name: "张三", username: "ok", password: " " }]) {
    const f = fixture(); f.ctx.request.body = body;
    await auth.register(f.ctx);
    assert.equal(f.ctx.status, 400); assert.equal(f.calls.length, 0);
  }
});

test("transaction acquisition failure returns 503 instead of escaping error handling", async () => {
  const f = fixture();
  f.ctx.fs.dc.orm.transaction = async () => { throw Object.assign(new Error("test-only"), { name: "SequelizeConnectionError" }); };
  await auth.register(f.ctx);
  assert.equal(f.ctx.status, 503); assert.match(f.ctx.body.message, /数据库/);
  assert.equal(f.calls.length, 0);
});

test("registration stores display name and account in their model fields and commits role binding", async () => {
  const f = fixture(); await auth.register(f.ctx);
  assert.equal(f.ctx.status, 201);
  const user = f.calls.find(call => call?.password);
  assert.equal(user.name, "张三"); assert.equal(user.username, "register_test");
  assert.notEqual(user.password, "test-only");
  assert.equal(f.calls.at(-2), "user-role"); assert.equal(f.calls.at(-1), "commit");
  assert.deepEqual(f.calls[1].where[Op.or], [{ username: "register_test" }, { name: "register_test" }]);
});

test("duplicate account returns 409 and rolls back without creating user", async () => {
  const f = fixture(); f.models.User.findOne = async () => ({ id: 7 });
  await auth.register(f.ctx);
  assert.equal(f.ctx.status, 409); assert.equal(f.calls.at(-1), "rollback");
  assert.ok(!f.calls.includes("commit"));
});

test("missing organization or position rolls back and gives initialization guidance", async () => {
  for (const model of ["Organization", "TypePost"]) {
    const f = fixture(); f.models[model].findOne = async () => null;
    await auth.register(f.ctx); assert.equal(f.ctx.status, 400);
    assert.match(f.ctx.body.message, /初始化/); assert.equal(f.calls.at(-1), "rollback");
  }
});

test("write error still responds if rollback fails and does not expose submitted credentials", async () => {
  const f = fixture();
  f.models.User.create = async () => { throw new Error("test-only password SQL detail"); };
  f.transaction.rollback = async () => { throw new Error("rollback broke"); };
  await auth.register(f.ctx); assert.equal(f.ctx.status, 500);
  assert.equal(f.logs.length, 2); assert.ok(!f.logs.join().includes("password"));
});

test("constraint race and lock timeout return useful responses with rollback", async () => {
  for (const [error, status] of [
    [Object.assign(new Error(), { name: "SequelizeUniqueConstraintError" }), 409],
    [Object.assign(new Error(), { original: { code: "57014" } }), 503],
  ]) {
    const f = fixture(); f.models.User.create = async () => { throw error; };
    await auth.register(f.ctx); assert.equal(f.ctx.status, status);
    assert.equal(f.calls.at(-1), "rollback");
  }
});

test("login prefers canonical account and supports historical swapped account fallback", async () => {
  for (const existing of ["username", "name"]) {
    const f = fixture(); const lookups = [];
    f.ctx.request.body = { username: "register_test", password: "test-only" };
    f.models.User.findOne = async options => {
      lookups.push(options.where);
      return options.where[existing] ? { password: "not-the-submitted-hash" } : null;
    };
    await auth.login(f.ctx);
    assert.equal(f.ctx.status, 400);
    assert.deepEqual(lookups[0], { username: "register_test", enabled: true });
    assert.equal(lookups.length, existing === "username" ? 1 : 2);
  }
});
