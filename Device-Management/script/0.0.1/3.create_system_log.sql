-- 创建 system_log 表
CREATE TABLE public.system_log (
	id int4 DEFAULT nextval('api_log_id_seq'::regclass) NOT NULL, -- 主键ID，自增
	log_time timestamptz NULL, -- 日志创建时间
	"content" text NULL, -- 日志内容
	url varchar(255) NULL, -- 请求URL
	user_id int4 NULL, -- 用户ID
	"module" varchar(255) NULL, -- 模块名称
	CONSTRAINT api_log_pkey PRIMARY KEY (id)
);
CREATE INDEX idx_api_log_log_time ON public.system_log USING btree (log_time);
CREATE INDEX idx_api_log_module ON public.system_log USING btree (module);
CREATE INDEX idx_api_log_user_id ON public.system_log USING btree (user_id);
COMMENT ON TABLE public.system_log IS '系统日志记录表';

-- Column comments

COMMENT ON COLUMN public.system_log.id IS '主键ID，自增';
COMMENT ON COLUMN public.system_log.log_time IS '日志创建时间';
COMMENT ON COLUMN public.system_log."content" IS '日志内容';
COMMENT ON COLUMN public.system_log.url IS '请求URL';
COMMENT ON COLUMN public.system_log.user_id IS '用户ID';
COMMENT ON COLUMN public.system_log."module" IS '模块名称';