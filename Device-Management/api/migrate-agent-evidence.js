"use strict";
// Defaults to inspection. Use the same POMS_DB/Qiniu settings as the target Node.
const fs = require("fs");
const path = require("path");
const Sequelize = require("sequelize");
const { AgentPlatform } = require("./app/lib/service/agentPlatform");
const { QiniuAgentStorage } = require("./app/lib/service/agentFileStorage");
const { migrateEvidence } = require("./app/lib/service/agentEvidenceMigration");
const diagnostic = require("./app/lib/service/startupDiagnostics");

async function main() {
  const args = process.argv.slice(2);
  const allowed = new Set(["--apply", "--device", "--row", "--source-dir", "--image-file", "--env-file"]);
  const opts = {};
  for (let i = 0; i < args.length; i++) {
    const name = args[i];
    if (!allowed.has(name)) throw new Error("InvalidArgument");
    if (name === "--apply") opts.apply = true;
    else { if (!args[i + 1] || args[i + 1].startsWith("--")) throw new Error("MissingArgument"); opts[name.slice(2)] = args[++i]; }
  }
  if (opts.row && (!opts.device || !/^[1-9]\d*$/.test(opts.row))) throw new Error("RowRequiresDevice");
  if (opts["image-file"] && !opts.row) throw new Error("ImageFileRequiresDeviceAndRow");
  const envFile = opts["env-file"] ? path.resolve(opts["env-file"]) : path.join(__dirname, "agent-local.env");
  if (fs.existsSync(envFile)) for (const line of fs.readFileSync(envFile, "utf8").split(/\r?\n/)) {
    const match = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(line);
    if (match && process.env[match[1]] === undefined) process.env[match[1]] = match[2];
  }
  if (!process.env.POMS_DB) throw new Error("MissingDatabaseConfig");
  const orm = new Sequelize(process.env.POMS_DB, { logging: false, dialectModulePath: path.join(__dirname, "app/lib/service/postgresCompat.js"), pool: { max: 2, min: 0 } });
  try {
    const dc = { orm, ORM: Sequelize, models: {} };
    require("./app/lib/models/edge_agent_record")(dc);
    const app = { fs: { dc, logger: { error: message => console.error(message) } } };
    const fileStorage = opts.apply ? new QiniuAgentStorage({
      domain: process.env.ANXINCLOUD_QINIU_DOMAIN_QNDMN_RESOURCE,
      bucket: process.env.ANXINCLOUD_QINIU_BUCKET_RESOURCE,
      accessKey: process.env.ANXINCLOUD_QINIU_ACCESSKEY,
      secretKey: process.env.ANXINCLOUD_QINIU_SECRETKEY,
      downloadTTL: process.env.EDGE_AGENT_QINIU_DOWNLOAD_TTL_SECONDS || 7200,
    }) : null;
    const platform = new AgentPlatform(app, { fileStorage }); await platform.ready;
    const where = { kind: "alarm" };
    if (opts.device) where.deviceId = opts.device;
    if (opts.row) where.id = `${opts.device}:${opts.row}`;
    let offset = 0, failures = 0;
    const counts = {};
    while (true) {
      const rows = await dc.models.EdgeAgentRecord.findAll({ where, order: [["id", "ASC"]], limit: 100, offset, logging: false });
      if (!rows.length) break;
      for (const row of rows) {
        try {
          const result = await migrateEvidence(platform, row.id, { apply: opts.apply, sourceDir: opts["source-dir"], imageFile: opts["image-file"] });
          counts[result.status] = (counts[result.status] || 0) + 1;
          console.log(JSON.stringify(result));
        } catch (error) {
          failures++; console.error(`证据迁移失败 key=${JSON.stringify(row.id)} ${diagnostic(error, "evidence-migrate", "EdgeAgentRecord")}`);
        }
      }
      offset += rows.length;
    }
    if (opts.row && offset === 0) throw new Error("EventNotFound");
    console.log(JSON.stringify({ mode: opts.apply ? "apply" : "inspect", counts, failures }));
    if (failures || counts.missing_file) process.exitCode = 1;
  } finally { await orm.close(); }
}
main().catch(error => {
  const hints = { InvalidArgument: "参数不合法", MissingArgument: "参数缺少值", RowRequiresDevice: "--row 需要 --device 且必须为正整数",
    ImageFileRequiresDeviceAndRow: "--image-file 需要 --device 和 --row", MissingDatabaseConfig: "缺少 POMS_DB", EventNotFound: "目标数据库中没有这条事件，请核对环境和事件编号" };
  console.error(hints[error.message] || `证据迁移未完成 ${diagnostic(error, "evidence-migrate", "EdgeAgentRecord")}`);
  process.exitCode = 1;
});
