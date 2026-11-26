-- public.param_template definition

-- Drop table

-- DROP TABLE public.param_template;

CREATE TABLE public.param_template (
	id serial4 NOT NULL,
	"name" varchar(255) NOT NULL, -- 模板名称
	product_code varchar(255) NOT NULL, -- 产品编码
	"schema" jsonb NOT NULL, -- 模板结构（JSON）
	remark varchar(1024) NULL, -- 备注
	"mode" varchar(32) NULL, -- 模板模式: without_cd（设备参数配置） | with_cd（下发指令） | original（原始组合既有 BF + CD + SER 的完整模板）
	created_at timestamptz NOT NULL, -- 创建时间
	updated_at timestamptz NULL, -- 更新时间
	deleted bool DEFAULT false NOT NULL, -- 是否删除（采用逻辑删除，方便后续可追溯）
	CONSTRAINT param_template_pkey PRIMARY KEY (id)
);
CREATE INDEX idx_param_template_mode ON public.param_template USING btree (mode);
CREATE INDEX idx_param_template_name ON public.param_template USING btree (name);
CREATE INDEX idx_param_template_product_code ON public.param_template USING btree (product_code);
CREATE INDEX idx_param_template_product_code_mode ON public.param_template USING btree (product_code, mode);
CREATE UNIQUE INDEX idx_param_template_unique ON public.param_template USING btree (product_code, name);
COMMENT ON TABLE public.param_template IS '参数模板';

-- Column comments

COMMENT ON COLUMN public.param_template."name" IS '模板名称';
COMMENT ON COLUMN public.param_template.product_code IS '产品编码';
COMMENT ON COLUMN public.param_template."schema" IS '模板结构（JSON）';
COMMENT ON COLUMN public.param_template.remark IS '备注';
COMMENT ON COLUMN public.param_template."mode" IS '模板模式: without_cd（设备参数配置） | with_cd（下发指令） | original（原始组合既有 BF + CD + SER 的完整模板）';
COMMENT ON COLUMN public.param_template.created_at IS '创建时间';
COMMENT ON COLUMN public.param_template.updated_at IS '更新时间';
COMMENT ON COLUMN public.param_template.deleted IS '是否删除（采用逻辑删除，方便后续可追溯）';