-- public.external_user_devices definition

-- Drop table

-- DROP TABLE public.external_user_devices;

CREATE TABLE public.external_user_devices (
	id serial4 NOT NULL,
	user_id int4 NOT NULL, -- 绑定的外部用户ID
	model varchar(64) NOT NULL, -- 设备型号
	product_code varchar(64) NOT NULL, -- 产品编码
	device_code varchar(64) NOT NULL, -- 设备ID
	created_at timestamp DEFAULT now() NULL, -- 创建时间
	updated_at timestamp DEFAULT now() NULL, -- 更新时间
	CONSTRAINT external_user_devices_pkey PRIMARY KEY (id),
	CONSTRAINT external_user_devices_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE CASCADE
);
CREATE INDEX idx_external_user_devices_device ON public.external_user_devices USING btree (device_code);
CREATE INDEX idx_external_user_devices_user ON public.external_user_devices USING btree (user_id);
CREATE UNIQUE INDEX uniq_user_device ON public.external_user_devices USING btree (user_id, device_code);
COMMENT ON TABLE public.external_user_devices IS '外部注册用户设备绑定';

-- Column comments

COMMENT ON COLUMN public.external_user_devices.user_id IS '绑定的外部用户ID';
COMMENT ON COLUMN public.external_user_devices.model IS '设备型号';
COMMENT ON COLUMN public.external_user_devices.product_code IS '产品编码';
COMMENT ON COLUMN public.external_user_devices.device_code IS '设备ID';
COMMENT ON COLUMN public.external_user_devices.created_at IS '创建时间';
COMMENT ON COLUMN public.external_user_devices.updated_at IS '更新时间';