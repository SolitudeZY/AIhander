"use strict";

// Durable Agent protocol records, owned by this platform rather than a second
// server/database. kind+id identify device/file/task/alarm/exception/operation.
module.exports = dc => {
  const T = dc.ORM;
  dc.models.EdgeAgentRecord = dc.orm.define("edgeAgentRecord", {
    kind: { type: T.STRING(24), primaryKey: true, allowNull: false },
    id: { type: T.STRING(160), primaryKey: true, allowNull: false },
    deviceId: { type: T.STRING(128), field: "device_id", allowNull: true },
    data: { type: T.JSONB, allowNull: false },
    createdAt: { type: T.DATE, field: "created_at", allowNull: false },
    updatedAt: { type: T.DATE, field: "updated_at", allowNull: false },
  }, { tableName: "edge_agent_record", timestamps: true });
  return dc.models.EdgeAgentRecord;
};
