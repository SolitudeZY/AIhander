-- Run after 1.create_edge_cloud_management.sql and 2.add_remote_session_recording.sql.
-- No existing business tables or legacy Cloud databases are deleted.
BEGIN;
CREATE TABLE IF NOT EXISTS edge_agent_record (
 kind varchar(24) NOT NULL, id varchar(160) NOT NULL,
 device_id varchar(128), data jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(kind,id)
);
CREATE INDEX IF NOT EXISTS edge_agent_device_time ON edge_agent_record(kind,device_id,created_at DESC);
CREATE INDEX IF NOT EXISTS edge_agent_data ON edge_agent_record USING gin(data);
CREATE UNIQUE INDEX IF NOT EXISTS edge_agent_token ON edge_agent_record((data->>'token_hash')) WHERE kind='device';
CREATE UNIQUE INDEX IF NOT EXISTS edge_agent_reboot_key ON edge_agent_record(device_id,(data->>'idempotency_key')) WHERE kind='operation';
CREATE UNIQUE INDEX IF NOT EXISTS edge_agent_active_reboot ON edge_agent_record(device_id)
 WHERE kind='operation' AND data->>'status' IN ('requested','accepted','unknown');
COMMIT;
