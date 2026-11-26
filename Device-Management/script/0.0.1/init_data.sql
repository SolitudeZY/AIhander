-- public.app definition

-- Drop table

-- DROP TABLE public.app;

CREATE TABLE public.app (
	id serial4 NOT NULL,
	"name" varchar(256) NOT NULL,
	url varchar(1024) NOT NULL,
	CONSTRAINT app_pk PRIMARY KEY (id)
);


-- public.command_histories definition

-- Drop table

-- DROP TABLE public.command_histories;

CREATE TABLE public.command_histories (
	id bigserial NOT NULL,
	device_code varchar(100) NOT NULL,
	command_name varchar(100) NULL,
	command_content text NULL,
	response_status int8 NOT NULL,
	response_content text NULL,
	command_time timestamptz NOT NULL,
	response_time timestamptz NULL,
	command_detail text NULL,
	CONSTRAINT command_histories_pkey PRIMARY KEY (id)
);
CREATE INDEX idx_command_histories_command_time ON public.command_histories USING btree (command_time);
CREATE INDEX idx_command_histories_device_code ON public.command_histories USING btree (device_code);
CREATE INDEX idx_command_histories_response_status ON public.command_histories USING btree (response_status);


-- public.device_model definition

-- Drop table

-- DROP TABLE public.device_model;

CREATE TABLE public.device_model (
	id serial4 NOT NULL,
	model_name text NULL, -- 类型名字
	CONSTRAINT device_model_pk PRIMARY KEY (id)
);
COMMENT ON TABLE public.device_model IS '设备类型表';

-- Column comments

COMMENT ON COLUMN public.device_model.model_name IS '类型名字';


-- public.devices definition

-- Drop table

-- DROP TABLE public.devices;

CREATE TABLE public.devices (
	device_code varchar(100) NOT NULL,
	product_code varchar(100) NOT NULL,
	protocol varchar(100) NOT NULL,
	comm_mode varchar(100) NOT NULL,
	tags text NULL,
	created_at timestamptz NULL,
	updated_at timestamptz NULL,
	config_params jsonb NULL,
	picture text NULL,
	sub_devices jsonb NULL,
	CONSTRAINT devices_pkey PRIMARY KEY (device_code)
);


-- public.diagnostic_histories definition

-- Drop table

-- DROP TABLE public.diagnostic_histories;

CREATE TABLE public.diagnostic_histories (
	id bigserial NOT NULL,
	device_code varchar(100) NOT NULL,
	"content" jsonb NULL,
	at_time timestamptz NULL,
	created_at timestamptz NOT NULL,
	CONSTRAINT diagnostic_histories_pkey PRIMARY KEY (id)
);
CREATE INDEX idx_diagnostic_histories_at_time ON public.diagnostic_histories USING btree (at_time);
CREATE INDEX idx_diagnostic_histories_device_code ON public.diagnostic_histories USING btree (device_code);


-- public.formula definition

-- Drop table

-- DROP TABLE public.formula;

CREATE TABLE public.formula (
	id int4 NOT NULL, -- 公式ID
	"expression" varchar(500) NOT NULL, -- 公式表达式
	CONSTRAINT formula_pkey PRIMARY KEY (id)
);
COMMENT ON TABLE public.formula IS '公式表';

-- Column comments

COMMENT ON COLUMN public.formula.id IS '公式ID';
COMMENT ON COLUMN public.formula."expression" IS '公式表达式';


-- public.product_library definition

-- Drop table

-- DROP TABLE public.product_library;

CREATE TABLE public.product_library (
	id bigserial NOT NULL,
	"name" varchar(255) NOT NULL,
	model varchar(255) NOT NULL,
	picture varchar(512) NOT NULL,
	product_code varchar(100) NOT NULL,
	product_type varchar(100) NULL,
	config_params jsonb NULL,
	CONSTRAINT product_library_pkey PRIMARY KEY (id),
	CONSTRAINT product_library_product_code_key UNIQUE (product_code)
);


-- public.project_correlation definition

-- Drop table

-- DROP TABLE public.project_correlation;

CREATE TABLE public.project_correlation (
	id serial4 NOT NULL,
	anxin_project_id _int4 NOT NULL,
	create_time timestamptz NOT NULL,
	create_user int4 NOT NULL,
	"name" varchar(64) NULL,
	pep_project_id int4 NULL,
	del bool DEFAULT false NULL,
	update_time timestamptz NULL,
	mapping_class varchar(32) NULL, -- 映射分类参数 例如：智慧类：wisdom，监测类：monitor，其他：other
	maintenance_end timestamptz NULL, -- 维保结束时间
	maintenance_start timestamptz NULL, -- 维保开始时间
	isanchor bool NULL, -- 是否续签
	sendorders _varchar NULL, -- 自动派单
	percentage int4 NULL, -- 项目中断百分比
	struc_id _int4 NULL, -- 选中作为选择重点测点的结构物
	struc_sensor jsonb NULL, -- 选中对应结构的重点测点
	"Data_interrupt" bool NULL, -- 数据中断
	"Data_exception" bool NULL, -- 数据异常
	leakage_anomaly bool NULL, -- 漏液异常 
	"Influence_reporting" jsonb NULL, -- 影响出具报告
	option_edit_pep_user int4 NULL, -- 最后修改的人的id
	"Over_exception" bool NULL, -- 数据超阈值
	is_push_process_ticket bool DEFAULT false NULL, -- 是否自动派单
	auto_assigned_user_id int4 NULL, -- 自动派单用户id
	CONSTRAINT project_correlation_pk PRIMARY KEY (id)
);
COMMENT ON TABLE public.project_correlation IS '安心云项目和项目管理项目关系映射绑定';

-- Column comments

COMMENT ON COLUMN public.project_correlation.mapping_class IS '映射分类参数 例如：智慧类：wisdom，监测类：monitor，其他：other';
COMMENT ON COLUMN public.project_correlation.maintenance_end IS '维保结束时间';
COMMENT ON COLUMN public.project_correlation.maintenance_start IS '维保开始时间';
COMMENT ON COLUMN public.project_correlation.isanchor IS '是否续签';
COMMENT ON COLUMN public.project_correlation.sendorders IS '自动派单';
COMMENT ON COLUMN public.project_correlation.percentage IS '项目中断百分比';
COMMENT ON COLUMN public.project_correlation.struc_id IS '选中作为选择重点测点的结构物';
COMMENT ON COLUMN public.project_correlation.struc_sensor IS '选中对应结构的重点测点';
COMMENT ON COLUMN public.project_correlation."Data_interrupt" IS '数据中断';
COMMENT ON COLUMN public.project_correlation."Data_exception" IS '数据异常';
COMMENT ON COLUMN public.project_correlation.leakage_anomaly IS '漏液异常 ';
COMMENT ON COLUMN public.project_correlation."Influence_reporting" IS '影响出具报告';
COMMENT ON COLUMN public.project_correlation.option_edit_pep_user IS '最后修改的人的id';
COMMENT ON COLUMN public.project_correlation."Over_exception" IS '数据超阈值';
COMMENT ON COLUMN public.project_correlation.is_push_process_ticket IS '是否自动派单';
COMMENT ON COLUMN public.project_correlation.auto_assigned_user_id IS '自动派单用户id';


-- public.resource definition

-- Drop table

-- DROP TABLE public.resource;

CREATE TABLE public.resource (
	code varchar(128) NOT NULL,
	"name" varchar(128) NOT NULL,
	parent_resource varchar(128) NULL
);
COMMENT ON TABLE public.resource IS '权限字典';


-- public.sensor_type_model_mapping definition

-- Drop table

-- DROP TABLE public.sensor_type_model_mapping;

CREATE TABLE public.sensor_type_model_mapping (
	id serial4 NOT NULL,
	sensor_type varchar(100) NOT NULL, -- 传感器类型
	axy_model varchar(255) NOT NULL, -- 安心云型号
	protocol_no varchar(100) NOT NULL, -- 传感器协议号
	formula_ids _int4 NULL, -- 公式id数组
	collector_id int8 NULL, -- 采集仪id
	ops_model varchar(255) DEFAULT ''::character varying NOT NULL, -- 运维中台型号
	sensor_name varchar(255) DEFAULT ''::character varying NOT NULL, -- 传感器名称
	manufacturer varchar(255) DEFAULT ''::character varying NOT NULL, -- 厂家
	picture varchar(255) DEFAULT ''::character varying NOT NULL, -- 图片
	CONSTRAINT sensor_type_model_mapping_pkey PRIMARY KEY (id)
);
COMMENT ON TABLE public.sensor_type_model_mapping IS '传感器型号对应表';

-- Column comments

COMMENT ON COLUMN public.sensor_type_model_mapping.sensor_type IS '传感器类型';
COMMENT ON COLUMN public.sensor_type_model_mapping.axy_model IS '安心云型号';
COMMENT ON COLUMN public.sensor_type_model_mapping.protocol_no IS '传感器协议号';
COMMENT ON COLUMN public.sensor_type_model_mapping.formula_ids IS '公式id数组';
COMMENT ON COLUMN public.sensor_type_model_mapping.collector_id IS '采集仪id';
COMMENT ON COLUMN public.sensor_type_model_mapping.ops_model IS '运维中台型号';
COMMENT ON COLUMN public.sensor_type_model_mapping.sensor_name IS '传感器名称';
COMMENT ON COLUMN public.sensor_type_model_mapping.manufacturer IS '厂家';
COMMENT ON COLUMN public.sensor_type_model_mapping.picture IS '图片';


-- public.sensor_types definition

-- Drop table

-- DROP TABLE public.sensor_types;

CREATE TABLE public.sensor_types (
	id serial4 NOT NULL,
	sensor_key varchar NULL, -- 传感器类型key
	sensor_name varchar NULL -- 类型名称
);
COMMENT ON TABLE public.sensor_types IS '传感器类型表';

-- Column comments

COMMENT ON COLUMN public.sensor_types.sensor_key IS '传感器类型key';
COMMENT ON COLUMN public.sensor_types.sensor_name IS '类型名称';


-- public."user" definition

-- Drop table

-- DROP TABLE public."user";

CREATE TABLE public."user" (
	id serial4 NOT NULL,
	pep_user_id int4 NOT NULL, -- 项企对应用户id
	"role" _varchar NULL, -- 角色 也对应权限 admin 管理员 / all 全部角色 / data_analyst 数据分析 / after_sale 售后运维 / resource_manage 资源管理 / customer_service 客户服务
	correlation_project _int4 NULL, -- 关联的项目管理的项目id
	last_in_time timestamptz NULL,
	in_times int4 DEFAULT 0 NOT NULL,
	online_duration int4 DEFAULT 0 NULL, -- 在线时长 单位 s
	last_in_address varchar(256) NULL, -- 上次登录地点
	disabled bool DEFAULT false NOT NULL,
	deleted bool DEFAULT false NOT NULL,
	update_time timestamptz DEFAULT now() NULL,
	option_add_pep_user int4 NULL, -- 添加的操作的人
	project_follow _int4 NULL, -- 所关注的项目
	is_push_process_ticket bool DEFAULT false NULL, -- 是否处理推送工单
	CONSTRAINT user_pk PRIMARY KEY (id)
);

-- Column comments

COMMENT ON COLUMN public."user".pep_user_id IS '项企对应用户id';
COMMENT ON COLUMN public."user"."role" IS '角色 也对应权限 admin 管理员 / all 全部角色 / data_analyst 数据分析 / after_sale 售后运维 / resource_manage 资源管理 / customer_service 客户服务';
COMMENT ON COLUMN public."user".correlation_project IS '关联的项目管理的项目id';
COMMENT ON COLUMN public."user".online_duration IS '在线时长 单位 s';
COMMENT ON COLUMN public."user".last_in_address IS '上次登录地点';
COMMENT ON COLUMN public."user".option_add_pep_user IS '添加的操作的人';
COMMENT ON COLUMN public."user".project_follow IS '所关注的项目';
COMMENT ON COLUMN public."user".is_push_process_ticket IS '是否处理推送工单';


-- public.user_resource definition

-- Drop table

-- DROP TABLE public.user_resource;

CREATE TABLE public.user_resource (
	id serial4 NOT NULL,
	user_id int4 NOT NULL,
	resource varchar(128) NOT NULL,
	CONSTRAINT table_name_pk PRIMARY KEY (id)
);


-- public.project_app definition

-- Drop table

-- DROP TABLE public.project_app;

CREATE TABLE public.project_app (
	id serial4 NOT NULL,
	project_id int4 NOT NULL,
	app_id int4 NULL,
	CONSTRAINT project_app_pk PRIMARY KEY (id),
	CONSTRAINT project_app_app_id_fk FOREIGN KEY (app_id) REFERENCES public.app(id),
	CONSTRAINT project_app_project_correlation_id_fk FOREIGN KEY (project_id) REFERENCES public.project_correlation(id)
);


-- public.project_group definition

-- Drop table

-- DROP TABLE public.project_group;

CREATE TABLE public.project_group (
	id serial4 NOT NULL,
	"name" varchar(256) NULL,
	poms_project_ids _int4 NOT NULL, -- 运维项目id
	poms_user_id int4 NOT NULL,
	percentage int4 NULL, -- 百分比
	CONSTRAINT project_group_pk PRIMARY KEY (id),
	CONSTRAINT project_group_user_id_fk FOREIGN KEY (poms_user_id) REFERENCES public."user"(id)
);

-- Column comments

COMMENT ON COLUMN public.project_group.poms_project_ids IS '运维项目id';
COMMENT ON COLUMN public.project_group.percentage IS '百分比';


-- public.sub_devices definition

-- Drop table

-- DROP TABLE public.sub_devices;

CREATE TABLE public.sub_devices (
	id bigserial NOT NULL,
	"name" varchar(255) NULL,
	device_code varchar(100) NOT NULL,
	device_type varchar(100) NOT NULL,
	axy_model varchar(100) NULL,
	module_no varchar(100) NULL,
	channel_no int8 NULL,
	sub_channel_no int8 NULL,
	protocol_no varchar(100) NULL,
	formula_id int8 NULL,
	calc_param1 numeric NULL,
	calc_param2 numeric NULL,
	calc_param3 numeric NULL,
	calc_param4 numeric NULL,
	extra_params jsonb NULL,
	created_at timestamptz NOT NULL,
	updated_at timestamptz NULL,
	command_id int8 NULL,
	sync bool DEFAULT false NOT NULL,
	is_deleted bool DEFAULT false NULL,
	dcm_params jsonb NULL, -- dmc3或者dcm2所需参数
	threshold jsonb NULL,
	CONSTRAINT sub_devices_pkey PRIMARY KEY (id),
	CONSTRAINT fk_sub_devices_command FOREIGN KEY (command_id) REFERENCES public.command_histories(id)
);
CREATE INDEX idx_sub_devices_device_code ON public.sub_devices USING btree (device_code);

-- Column comments

COMMENT ON COLUMN public.sub_devices.dcm_params IS 'dmc3或者dcm2所需参数';