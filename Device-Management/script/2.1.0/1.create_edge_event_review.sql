-- 新增单事件复核表：AI 复核结果、人工确认结论、确认人与确认时间

BEGIN;

CREATE TABLE IF NOT EXISTS edge_event_review (
 id serial PRIMARY KEY,
 event_id varchar(128) NOT NULL,
 device_id varchar(128) NOT NULL,
 row_id integer,
 ai_status varchar(24),
 ai_result varchar(16),
 ai_reason text,
 ai_model_version varchar(64),
 ai_executed_at timestamptz,
 ai_error text,
 ai_attempt integer DEFAULT 0,
 ai_history jsonb DEFAULT '[]'::jsonb,
 manual_result varchar(16),
 manual_remark varchar(500),
 confirm_user_id integer,
 confirm_user_name varchar(64),
 confirm_time timestamptz,
 confirm_source varchar(16),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS edge_event_review_event_id_key ON edge_event_review (event_id);

-- AI 重试需要保留执行次数与历史记录，后补的两列
ALTER TABLE edge_event_review ADD COLUMN IF NOT EXISTS ai_attempt integer DEFAULT 0;
ALTER TABLE edge_event_review ADD COLUMN IF NOT EXISTS ai_history jsonb DEFAULT '[]'::jsonb;

COMMIT;
