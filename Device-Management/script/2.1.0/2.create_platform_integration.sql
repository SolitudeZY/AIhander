-- 新增平台对接相关的四张表：接收平台配置、对象关联、推送订阅、推送记录

BEGIN;

CREATE TABLE IF NOT EXISTS platform_integration_config (
 id serial PRIMARY KEY,
 platform varchar(32) NOT NULL DEFAULT 'anxin',
 name varchar(64),
 scope_type varchar(16) NOT NULL DEFAULT 'project',
 project_id integer,
 device_code varchar(128),
 struct_id varchar(128),
 channel varchar(16) NOT NULL DEFAULT 'http',
 kind varchar(32) DEFAULT 'anxin',
 push_url varchar(512),
 credential varchar(512),
 structure_api_url varchar(512),
 -- 账号鉴权：推送前先用账号换 token，供推送地址里的 {token} 占位符使用
 auth_url varchar(512),
 auth_username varchar(128),
 auth_password varchar(255),
 token_path varchar(64),
 token_ttl integer,
 mqtt_broker varchar(255),
 mqtt_topic varchar(255),
 mqtt_client_id varchar(128),
 mqtt_username varchar(128),
 mqtt_password varchar(255),
 -- 推送报文模板：对方给的报文可直接粘贴，{alarmId} 等占位符在推送时替换；留空则按内置告警字段下发
 push_payload_template text,
 confirm_callback boolean DEFAULT false,
 enabled boolean DEFAULT true,
 created_by integer,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS platform_config_scope_uindex
 ON platform_integration_config (platform, project_id, coalesce(device_code, ''::varchar));

-- 本表首次发布之后补充的列
ALTER TABLE platform_integration_config ADD COLUMN IF NOT EXISTS structure_api_url varchar(512);
ALTER TABLE platform_integration_config ADD COLUMN IF NOT EXISTS credential varchar(512);
ALTER TABLE platform_integration_config ADD COLUMN IF NOT EXISTS confirm_callback boolean DEFAULT false;
ALTER TABLE platform_integration_config ADD COLUMN IF NOT EXISTS kind varchar(32) DEFAULT 'anxin';
ALTER TABLE platform_integration_config ADD COLUMN IF NOT EXISTS auth_url varchar(512);
ALTER TABLE platform_integration_config ADD COLUMN IF NOT EXISTS auth_username varchar(128);
ALTER TABLE platform_integration_config ADD COLUMN IF NOT EXISTS auth_password varchar(255);
ALTER TABLE platform_integration_config ADD COLUMN IF NOT EXISTS token_path varchar(64);
ALTER TABLE platform_integration_config ADD COLUMN IF NOT EXISTS token_ttl integer;
ALTER TABLE platform_integration_config ADD COLUMN IF NOT EXISTS push_payload_template text;

CREATE TABLE IF NOT EXISTS platform_integration_mapping (
 id serial PRIMARY KEY,
 platform_config_id integer NOT NULL,
 project_id integer NOT NULL,
 device_code varchar(128),
 channel_name varchar(128),
 structure_name varchar(128),
 structure_id varchar(128),
 source_name varchar(128),
 source_id varchar(128),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS platform_mapping_uindex
 ON platform_integration_mapping (platform_config_id, project_id,
  coalesce(device_code, ''::varchar), coalesce(channel_name, ''::varchar));

CREATE TABLE IF NOT EXISTS platform_integration_subscription (
 id serial PRIMARY KEY,
 project_id integer NOT NULL,
 platform_config_id integer NOT NULL,
 types jsonb NOT NULL DEFAULT '[]'::jsonb,
 levels jsonb NOT NULL DEFAULT '[]'::jsonb,
 timings jsonb NOT NULL DEFAULT '["confirmed"]'::jsonb,
 enabled boolean DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS platform_subscription_uindex
 ON platform_integration_subscription (project_id, platform_config_id);

CREATE TABLE IF NOT EXISTS alarm_push_record (
 id serial PRIMARY KEY,
 event_id varchar(128) NOT NULL,
 alarm_id varchar(128),
 platform varchar(32) NOT NULL DEFAULT 'anxin',
 channel varchar(16),
 config_id integer,
 message_type varchar(24) DEFAULT 'alarm',
 request_body jsonb,
 status varchar(16) NOT NULL DEFAULT 'pending',
 response_code integer,
 response_body text,
 error_msg text,
 duration_ms integer,
 retry_count integer DEFAULT 0,
 batch varchar(32),
 operator_id integer,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS alarm_push_record_event_idx ON alarm_push_record (event_id);

-- 投递批次聚合（用于展示「部分失败」）后补的列
ALTER TABLE alarm_push_record ADD COLUMN IF NOT EXISTS batch varchar(32);

COMMIT;
