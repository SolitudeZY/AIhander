--创建组织表
CREATE TABLE "organization" (
  "id" SERIAL NOT NULL,
  "name" VARCHAR(255),
  CONSTRAINT "organization_pkey" PRIMARY KEY ("id")
);
COMMENT ON TABLE public.organization IS '组织';


--创建部门表
CREATE TABLE "department" (
  "id" SERIAL PRIMARY KEY,
  "org" INTEGER NOT NULL,
  "name" VARCHAR(255) NOT NULL,
  "parent_id" INTEGER,
  "sort_index" INTEGER
);

-- 添加外键约束 (如果需要的话)
ALTER TABLE "department" 
ADD CONSTRAINT "fk_department_organization" 
FOREIGN KEY ("org") REFERENCES "organization"("id");

-- 添加索引 (可选，用于提高查询性能)
CREATE INDEX "idx_department_org" ON "department"("org");
CREATE INDEX "idx_department_parent_id" ON "department"("parent_id");
CREATE INDEX "idx_department_sort_index" ON "department"("sort_index");

COMMENT ON TABLE public.department IS '部门';


--创建角色组表
CREATE TABLE "role_group" (
  "id" SERIAL PRIMARY KEY,
  "name" VARCHAR(255) NOT NULL,
  "org" INTEGER NOT NULL
);

-- 添加外键约束
ALTER TABLE "role_group" 
ADD CONSTRAINT "fk_role_group_organization" 
FOREIGN KEY ("org") REFERENCES "organization"("id");

-- 添加索引以提高查询性能
CREATE INDEX "idx_role_group_org" ON "role_group"("org");
CREATE INDEX "idx_role_group_name" ON "role_group"("name");

-- 添加唯一约束，确保同一组织下角色组名称唯一 (可选)
CREATE UNIQUE INDEX "uk_role_group_name_org" 
ON "role_group"("name", "org");

COMMENT ON TABLE public.role_group IS '角色组';


-- 创建角色表
CREATE TABLE "role" (
  "id" SERIAL PRIMARY KEY,
  "name" VARCHAR(255) NOT NULL,
  "portal" VARCHAR(255) NOT NULL,
  "group_id" INTEGER NOT NULL
);

-- 添加外键约束
ALTER TABLE "role" 
ADD CONSTRAINT "fk_role_role_group" 
FOREIGN KEY ("group_id") REFERENCES "role_group"("id");

-- 添加索引以提高查询性能
CREATE INDEX "idx_role_group_id" ON "role"("group_id");
CREATE INDEX "idx_role_name" ON "role"("name");
CREATE INDEX "idx_role_portal" ON "role"("portal");

-- 添加唯一约束，确保同一角色组下角色名称唯一 (可选)
CREATE UNIQUE INDEX "uk_role_name_group" 
ON "role"("name", "group_id");

-- 添加唯一约束，确保同一门户下角色名称唯一 (可选)
CREATE UNIQUE INDEX "uk_role_name_portal" 
ON "role"("name", "portal");

COMMENT ON TABLE public.role IS '角色';


DROP TABLE IF EXISTS resource;

-- 创建权限字典
CREATE TABLE "resource" (
  "code" VARCHAR(255) PRIMARY KEY,
  "name" VARCHAR(255) NOT NULL,
  "parent_resource" VARCHAR(255)
);

-- 添加外键约束（自引用）
ALTER TABLE "resource" 
ADD CONSTRAINT "fk_resource_parent" 
FOREIGN KEY ("parent_resource") REFERENCES "resource"("code");

-- 添加索引以提高查询性能
CREATE INDEX "idx_resource_parent" ON "resource"("parent_resource");
CREATE INDEX "idx_resource_name" ON "resource"("name");

-- 添加表注释
COMMENT ON TABLE "resource" IS '权限字典';
COMMENT ON COLUMN "resource"."code" IS '资源代码，主键';
COMMENT ON COLUMN "resource"."name" IS '资源名称';
COMMENT ON COLUMN "resource"."parent_resource" IS '父级资源代码';


-- 创建角色权限表
CREATE TABLE "role_resource" (
  "id" SERIAL PRIMARY KEY,
  "role" INTEGER,
  "resource" VARCHAR(255)
);

-- 添加外键约束
ALTER TABLE "role_resource" 
ADD CONSTRAINT "fk_role_resource_role" 
FOREIGN KEY ("role") REFERENCES "role"("id");

ALTER TABLE "role_resource" 
ADD CONSTRAINT "fk_role_resource_resource" 
FOREIGN KEY ("resource") REFERENCES "resource"("code");

-- 添加索引以提高查询性能
CREATE INDEX "idx_role_resource_role" ON "role_resource"("role");
CREATE INDEX "idx_role_resource_resource" ON "role_resource"("resource");

-- 添加唯一约束，防止重复关联 (可选)
CREATE UNIQUE INDEX "uk_role_resource" 
ON "role_resource"("role", "resource");

-- 添加表注释
COMMENT ON TABLE "role_resource" IS '角色权限';


-- 创建职位表
CREATE TABLE "type_post" (
  "id" INTEGER PRIMARY KEY,
  "name" VARCHAR(255) NOT NULL,
  "allow_set_num" INTEGER NOT NULL,
  "code" VARCHAR(255) NOT NULL
);

-- 添加唯一约束
ALTER TABLE "type_post" 
ADD CONSTRAINT "uk_type_post_code" 
UNIQUE ("code");

-- 添加索引以提高查询性能
CREATE INDEX "idx_type_post_name" ON "type_post"("name");
CREATE INDEX "idx_type_post_code" ON "type_post"("code");

-- 添加表和字段注释
COMMENT ON TABLE "type_post" IS '职位类型表';
COMMENT ON COLUMN "type_post"."id" IS '主键ID';
COMMENT ON COLUMN "type_post"."name" IS '职位名称';
COMMENT ON COLUMN "type_post"."allow_set_num" IS '允许设置数量，0不限制';
COMMENT ON COLUMN "type_post"."code" IS '职位代码';


-- 删除有外键依赖的表
DROP TABLE IF EXISTS "project_group";
DROP TABLE IF EXISTS "user_resource";
DROP TABLE IF EXISTS "user_role";
DROP TABLE IF EXISTS "user_token";
DROP TABLE IF EXISTS "user";

-- 创建user表
CREATE TABLE "user" (
  "id" SERIAL PRIMARY KEY,
  "name_present" VARCHAR(255),
  "name" VARCHAR(255) NOT NULL,
  "password" VARCHAR(255),
  "org" INTEGER,
  "register_time" TIMESTAMP,
  "enabled" BOOLEAN NOT NULL,
  "institution_role" VARCHAR(255),
  "dep" INTEGER NOT NULL,
  "post" INTEGER NOT NULL,
  "sort_index" INTEGER
);

-- 添加外键约束
ALTER TABLE "user" 
ADD CONSTRAINT "fk_user_organization" 
FOREIGN KEY ("org") REFERENCES "organization"("id");

ALTER TABLE "user" 
ADD CONSTRAINT "fk_user_department" 
FOREIGN KEY ("dep") REFERENCES "department"("id");

ALTER TABLE "user" 
ADD CONSTRAINT "fk_user_type_post" 
FOREIGN KEY ("post") REFERENCES "type_post"("id");

-- 添加索引以提高查询性能
CREATE INDEX "idx_user_org" ON "user"("org");
CREATE INDEX "idx_user_dep" ON "user"("dep");
CREATE INDEX "idx_user_post" ON "user"("post");
CREATE INDEX "idx_user_name" ON "user"("name");
CREATE INDEX "idx_user_enabled" ON "user"("enabled");
CREATE INDEX "idx_user_sort_index" ON "user"("sort_index");

-- 添加唯一约束（如果账号需要唯一）
ALTER TABLE "user" 
ADD CONSTRAINT "uk_user_name" 
UNIQUE ("name");

-- 添加表和字段注释
COMMENT ON TABLE "user" IS '用户表';
COMMENT ON COLUMN "user"."id" IS '主键ID';
COMMENT ON COLUMN "user"."name_present" IS '用户名';
COMMENT ON COLUMN "user"."name" IS '账号';
COMMENT ON COLUMN "user"."password" IS '密码';
COMMENT ON COLUMN "user"."org" IS '所属组织ID';
COMMENT ON COLUMN "user"."register_time" IS '注册时间';
COMMENT ON COLUMN "user"."enabled" IS '开启状态';
COMMENT ON COLUMN "user"."institution_role" IS '组织角色';
COMMENT ON COLUMN "user"."dep" IS '部门ID';
COMMENT ON COLUMN "user"."post" IS '职位ID';
COMMENT ON COLUMN "user"."sort_index" IS '排序索引';



-- 创建用户角色关联表
CREATE TABLE "user_role" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER NOT NULL,
  "role_id" INTEGER NOT NULL
);

-- 添加外键约束
ALTER TABLE "user_role" 
ADD CONSTRAINT "fk_user_role_user" 
FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;

ALTER TABLE "user_role" 
ADD CONSTRAINT "fk_user_role_role" 
FOREIGN KEY ("role_id") REFERENCES "role"("id") ON DELETE CASCADE;

-- 添加唯一约束，防止重复的用户-角色关联
ALTER TABLE "user_role" 
ADD CONSTRAINT "uk_user_role" 
UNIQUE ("user_id", "role_id");

-- 添加索引以提高查询性能
CREATE INDEX "idx_user_role_user_id" ON "user_role"("user_id");
CREATE INDEX "idx_user_role_role_id" ON "user_role"("role_id");

-- 添加表注释
COMMENT ON TABLE "user_role" IS '用户角色关联表';
COMMENT ON COLUMN "user_role"."id" IS '主键ID';
COMMENT ON COLUMN "user_role"."user_id" IS '用户ID，外键关联user表';
COMMENT ON COLUMN "user_role"."role_id" IS '角色ID，外键关联role表';


-- 创建user_token表
CREATE TABLE "user_token" (
  "token" UUID PRIMARY KEY,
  "user_info" JSONB NOT NULL,
  "expired" TIMESTAMP NOT NULL
);

-- 添加索引以提高查询性能
CREATE INDEX "idx_user_token_expired" ON "user_token"("expired");

-- 为 JSONB 字段添加 GIN 索引以提高 JSON 查询性能
CREATE INDEX "idx_user_token_user_info_gin" ON "user_token" USING GIN ("user_info");

-- 添加表和字段注释
COMMENT ON TABLE "user_token" IS '用户令牌表';
COMMENT ON COLUMN "user_token"."token" IS '令牌UUID，主键';
COMMENT ON COLUMN "user_token"."user_info" IS '用户信息JSON数据';
COMMENT ON COLUMN "user_token"."expired" IS '令牌过期时间';



CREATE TABLE public.project_group (
	id SERIAL NOT NULL,
	"name" varchar(256) NULL,
	poms_project_ids int4[] NOT NULL, -- 运维项目id
	poms_user_id int4 NOT NULL,
	percentage int4 NULL, -- 百分比
	CONSTRAINT project_group_pk PRIMARY KEY (id)
);

-- Column comments

COMMENT ON COLUMN public.project_group.poms_project_ids IS '运维项目id';
COMMENT ON COLUMN public.project_group.percentage IS '百分比';

CREATE TABLE public.system_log (
	id SERIAL NOT NULL,
	log_time timestamptz NULL,
	"content" text NULL,
	url varchar(255) NULL,
	user_id int4 NULL,
	"module" varchar(255) NULL,
	CONSTRAINT system_log_pkey PRIMARY KEY (id)
);
CREATE INDEX idx_system_log_log_time ON public.system_log USING btree (log_time);
CREATE INDEX idx_system_log_module ON public.system_log USING btree ("module");
CREATE INDEX idx_system_log_user_id ON public.system_log USING btree (user_id);
COMMENT ON TABLE public.system_log IS '系统日志记录表';

-- Column comments

COMMENT ON COLUMN public.system_log.id IS '主键ID，自增';
COMMENT ON COLUMN public.system_log.log_time IS '日志创建时间';
COMMENT ON COLUMN public.system_log."content" IS '日志内容';
COMMENT ON COLUMN public.system_log.url IS '请求URL';
COMMENT ON COLUMN public.system_log.user_id IS '用户ID';
COMMENT ON COLUMN public.system_log."module" IS '模块名称';


--项目表（projects）
CREATE TABLE projects (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  longitude DOUBLE PRECISION,
  latitude DOUBLE PRECISION,
  location_name VARCHAR(255),
  focus_device_codes TEXT,
  description TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

COMMENT ON TABLE projects IS '项目管理';
COMMENT ON COLUMN projects.id IS '项目ID';
COMMENT ON COLUMN projects.name IS '项目名称';
COMMENT ON COLUMN projects.longitude IS '经度';
COMMENT ON COLUMN projects.latitude IS '纬度';
COMMENT ON COLUMN projects.location_name IS '定位位置名称';
COMMENT ON COLUMN projects.focus_device_codes IS '关注设备，deviceCode以英文逗号分隔的字符串';
COMMENT ON COLUMN projects.description IS '项目描述（文本，不限制字数）';
COMMENT ON COLUMN projects.created_at IS '创建时间';
COMMENT ON COLUMN projects.updated_at IS '更新时间';

-- 可选索引（如需）
CREATE INDEX idx_projects_name ON projects(name);
CREATE INDEX idx_projects_location_name ON projects(location_name);


--项目-设备关联表（project_devices）
CREATE TABLE project_devices (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL,
  device_code VARCHAR(255) NOT NULL,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

COMMENT ON TABLE project_devices IS '项目-设备关联关系';
COMMENT ON COLUMN project_devices.project_id IS '项目ID';
COMMENT ON COLUMN project_devices.device_code IS '设备ID';


--角色-项目关联表（role_project）
CREATE TABLE role_project (
  id SERIAL PRIMARY KEY,
  role_id INTEGER NOT NULL,
  project_id INTEGER NOT NULL
);

COMMENT ON TABLE role_project IS '角色-项目关联关系';



--下发历史增加操作人字段
alter table public.command_histories
    add operator integer;


-- 第一层：基础表（无外键依赖）
-- 插入组织数据
INSERT INTO public.organization 
("name") 
VALUES('设备管理平台'); 

-- 插入岗位类型数据
INSERT INTO public.type_post 
("id","name", allow_set_num, code) 
VALUES(1,'部门主管', 0, 'leader'); 

INSERT INTO public.type_post 
("id","name", allow_set_num, code) 
VALUES(2,'一般成员', 0, 'general'); 

-- 第二层：依赖第一层的表
-- 插入部门数据（依赖organization）
INSERT INTO public.department 
(org, "name", parent_id, sort_index) 
VALUES(1, '默认', NULL, 1); 

-- 插入角色组数据（依赖organization）
INSERT INTO public.role_group 
("name", org) 
VALUES('默认', 1); 

-- 第三层：依赖第二层的表
-- 插入角色数据（依赖role_group）
INSERT INTO public."role" 
("name", portal, group_id) 
VALUES('所有者', 'A', 1); 

-- 第四层：依赖多个前置表的表
-- 插入用户数据（依赖organization, department, type_post）
INSERT INTO public."user" 
(name_present, "name", "password", org, register_time, enabled, institution_role, dep, post, sort_index) 
VALUES('SuperAdmin', '超级管理员', 'REPLACE_WITH_MD5_OF_YOUR_ADMIN_PASSWORD', 1, '2025-10-17 15:55:34.661', true, NULL, 1, 1, 1); 

-- 第五层：依赖用户和角色的关联表
-- 插入用户角色关联数据（依赖user, role）
INSERT INTO public.user_role 
(user_id, role_id) 
VALUES(1, 1); 


-- 权限字典
INSERT INTO public.resource
(code, "name", parent_resource)
VALUES('DEVICE', '设备管理', NULL);
INSERT INTO public.resource
(code, "name", parent_resource)
VALUES('DEVICELIST', '设备列表', 'DEVICE');
INSERT INTO public.resource
(code, "name", parent_resource)
VALUES('FIRMWARELIB', '固件库', 'DEVICE');
INSERT INTO public.resource
(code, "name", parent_resource)
VALUES('PRODUCTLIB', '产品库', 'DEVICE');
INSERT INTO public.resource
(code, "name", parent_resource)
VALUES('SYSTEMMANAGEMENT', '系统管理', NULL);
INSERT INTO public.resource
(code, "name", parent_resource)
VALUES('SYSTEMLOG', '系统日志', 'SYSTEMMANAGEMENT');
INSERT INTO public.resource
(code, "name", parent_resource)
VALUES('ORGANIZATIONALMANAGEMENT', '组织管理', 'SYSTEMMANAGEMENT');
INSERT INTO public.resource
(code, "name", parent_resource)
VALUES('ROLEMANAGEMENT', '角色管理', 'SYSTEMMANAGEMENT');
INSERT INTO public.resource
(code, "name", parent_resource)
VALUES('USERMANAGEMENT', '用户管理', 'SYSTEMMANAGEMENT');
INSERT INTO public.resource
(code, "name", parent_resource)
VALUES('ADDDEPARTMENT', '新增部门', 'ORGANIZATIONALMANAGEMENT');
INSERT INTO public.resource
(code, "name", parent_resource)
VALUES('EDITDEPARTMENT', '修改部门', 'ORGANIZATIONALMANAGEMENT');
INSERT INTO public.resource
(code, "name", parent_resource)
VALUES('DELETEDEPARTMENT', '删除部门', 'ORGANIZATIONALMANAGEMENT');
INSERT INTO public.resource
(code, "name", parent_resource)
VALUES('ADDROLE', '新增角色', 'ROLEMANAGEMENT');
INSERT INTO public.resource
(code, "name", parent_resource)
VALUES('EDITROLE', '修改角色', 'ROLEMANAGEMENT');
INSERT INTO public.resource
(code, "name", parent_resource)
VALUES('DELETEROLE', '删除角色', 'ROLEMANAGEMENT');
INSERT INTO public.resource
(code, "name", parent_resource)
VALUES('ADDUSER', '新增用户', 'USERMANAGEMENT');
INSERT INTO public.resource
(code, "name", parent_resource)
VALUES('EDITUSER', '修改用户', 'USERMANAGEMENT');
INSERT INTO public.resource
(code, "name", parent_resource)
VALUES('DELETEUSER', '删除用户', 'USERMANAGEMENT');
INSERT INTO public.resource
(code, "name", parent_resource)
VALUES('ENABLEUSER', '启用用户', 'USERMANAGEMENT');
INSERT INTO public.resource
(code, "name", parent_resource)
VALUES('DISABLEUSER', '禁用用户', 'USERMANAGEMENT');
INSERT INTO public.resource
(code, "name", parent_resource)
VALUES('EDITROLEPERMISSIONS', '修改角色权限', 'ROLEMANAGEMENT');
INSERT INTO public.resource
(code, "name", parent_resource)
VALUES('EDITDEVICEMODEL', '关注设备型号', 'ROLEMANAGEMENT');
INSERT INTO public.resource
(code, "name", parent_resource)
VALUES('VIEWORGANIZATIONDATA', '查看组织数据', 'ORGANIZATIONALMANAGEMENT');
INSERT INTO public.resource
(code, "name", parent_resource)
VALUES('VIEWUSERDATA', '查看用户数据', 'USERMANAGEMENT');
INSERT INTO public.resource
(code, "name", parent_resource)
VALUES('VIEWROLEDATA', '查看角色数据', 'ROLEMANAGEMENT');
INSERT INTO public.resource
(code, "name", parent_resource)
VALUES('EXPORTUSERDATA', '导出用户数据', 'USERMANAGEMENT');
INSERT INTO public.resource
(code, "name", parent_resource)
VALUES('EXPORTSYSTEMLOGS', '导出系统日志', 'SYSTEMLOG');
INSERT INTO public.resource
(code, "name", parent_resource)
VALUES('VIEWSYSTEMLOG', '查看系统日志', 'SYSTEMLOG');
INSERT INTO public.resource
(code, "name", parent_resource)
VALUES('VIEWDEVICELIST', '查看设备列表', 'DEVICELIST');
INSERT INTO public.resource
(code, "name", parent_resource)
VALUES('VIEWFIRMWARELIST', '查看固件库列表', 'FIRMWARELIB');
INSERT INTO public.resource
(code, "name", parent_resource)
VALUES('VIEWPRODUCTLIST', '查看产品列表', 'PRODUCTLIB');
INSERT INTO public.resource
(code, "name", parent_resource)
VALUES('VIEWSENSORLIST', '查看传感器列表', 'PRODUCTLIB');
INSERT INTO public.resource
(code, "name", parent_resource)
VALUES('BATCHDISTRIBUTION', '批量下发', 'DEVICELIST');
INSERT INTO public.resource
(code, "name", parent_resource)
VALUES('BATCHUPGRADE', '批量升级', 'DEVICELIST');
INSERT INTO public.resource
(code, "name", parent_resource)
VALUES('DEVICELISTVIEWDETAILS', '设备列表查看详情', 'DEVICELIST');
INSERT INTO public.resource
(code, "name", parent_resource)
VALUES('ISSUETHECOMMAND', '下发指令', 'DEVICELIST');
INSERT INTO public.resource
(code, "name", parent_resource)
VALUES('REMOTEUPGRADE', '远程升级', 'DEVICELIST');
INSERT INTO public.resource
(code, "name", parent_resource)
VALUES('ADDTAGS', '新增标签', 'DEVICELIST');
INSERT INTO public.resource
(code, "name", parent_resource)
VALUES('DEVICEINSTALLATIONDIAGRAM', '设备安装图', 'DEVICELIST');
INSERT INTO public.resource
(code, "name", parent_resource)
VALUES('DEVICEPARAMETERCONFIGURATION', '设备参数配置', 'DEVICELIST');
INSERT INTO public.resource
(code, "name", parent_resource)
VALUES('UNIFIEDDISTRIBUTIONOFCONFIGURATION', '统一下发配置', 'DEVICELIST');
INSERT INTO public.resource
(code, "name", parent_resource)
VALUES('CLEARALLCHANNELS', '清除全部通道', 'DEVICELIST');
INSERT INTO public.resource
(code, "name", parent_resource)
VALUES('CHANNELCONFIGURATIONISSUANCE', '通道配置下发', 'DEVICELIST');
INSERT INTO public.resource
(code, "name", parent_resource)
VALUES('ADDSUBDEVICES', '新增子设备', 'DEVICELIST');
INSERT INTO public.resource
(code, "name", parent_resource)
VALUES('MODIFYSUBDEVICES', '修改子设备', 'DEVICELIST');
INSERT INTO public.resource
(code, "name", parent_resource)
VALUES('DELETESUBDEVICES', '删除子设备', 'DEVICELIST');
INSERT INTO public.resource
(code, "name", parent_resource)
VALUES('VIEWSUBDEVICES', '查看子设备', 'DEVICELIST');
INSERT INTO public.resource
(code, "name", parent_resource)
VALUES('HISTORYOFISSUANCE', '下发历史', 'DEVICELIST');
INSERT INTO public.resource
(code, "name", parent_resource)
VALUES('DIAGNOSTICDATA', '诊断数据', 'DEVICELIST');
INSERT INTO public.resource
(code, "name", parent_resource)
VALUES('UPLOADFIRMWARE', '上传固件', 'FIRMWARELIB');
INSERT INTO public.resource
(code, "name", parent_resource)
VALUES('EDITFIRMWARE', '编辑固件', 'FIRMWARELIB');
INSERT INTO public.resource
(code, "name", parent_resource)
VALUES('DELETEFIRMWARE', '删除固件', 'FIRMWARELIB');
INSERT INTO public.resource
(code, "name", parent_resource)
VALUES('ADDPRODUCT', '新增产品', 'PRODUCTLIB');
INSERT INTO public.resource
(code, "name", parent_resource)
VALUES('EDITPRODUCT', '编辑产品', 'PRODUCTLIB');
INSERT INTO public.resource
(code, "name", parent_resource)
VALUES('DELETEPRODUCT', '删除产品', 'PRODUCTLIB');
INSERT INTO public.resource
(code, "name", parent_resource)
VALUES('ADDNEWSENSORS', '新增传感器', 'PRODUCTLIB');
INSERT INTO public.resource
(code, "name", parent_resource)
VALUES('EDITSENSORS', '编辑传感器', 'PRODUCTLIB');
INSERT INTO public.resource
(code, "name", parent_resource)
VALUES('DELETESENSOR', '删除传感器', 'PRODUCTLIB');
INSERT INTO public.resource
(code, "name", parent_resource)
VALUES('PROJECTMANAGEMENT', '项目管理', 'SYSTEMMANAGEMENT');
INSERT INTO public.resource
(code, "name", parent_resource)
VALUES('VIEWPROJECTDATA', '查看项目列表', 'PROJECTMANAGEMENT');
INSERT INTO public.resource
(code, "name", parent_resource)
VALUES('ADDPROJECT', '新增项目', 'PROJECTMANAGEMENT');
INSERT INTO public.resource
(code, "name", parent_resource)
VALUES('EDITPROJECT', '编辑项目', 'PROJECTMANAGEMENT');
INSERT INTO public.resource
(code, "name", parent_resource)
VALUES('DELETEPROJECT', '删除项目', 'PROJECTMANAGEMENT');


-- 角色权限
INSERT INTO public.role_resource
("role", resource)
VALUES(1, 'DEVICE');
INSERT INTO public.role_resource
("role", resource)
VALUES(1, 'DEVICELIST');
INSERT INTO public.role_resource
("role", resource)
VALUES(1, 'FIRMWARELIB');
INSERT INTO public.role_resource
("role", resource)
VALUES(1, 'PRODUCTLIB');
INSERT INTO public.role_resource
("role", resource)
VALUES(1, 'SYSTEMMANAGEMENT');
INSERT INTO public.role_resource
("role", resource)
VALUES(1, 'ADDDEPARTMENT');
INSERT INTO public.role_resource
("role", resource)
VALUES(1, 'EDITDEPARTMENT');
INSERT INTO public.role_resource
("role", resource)
VALUES(1, 'DELETEDEPARTMENT');
INSERT INTO public.role_resource
("role", resource)
VALUES(1, 'ADDROLE');
INSERT INTO public.role_resource
("role", resource)
VALUES(1, 'EDITROLE');
INSERT INTO public.role_resource
("role", resource)
VALUES(1, 'DELETEROLE');
INSERT INTO public.role_resource
("role", resource)
VALUES(1, 'ADDUSER');
INSERT INTO public.role_resource
("role", resource)
VALUES(1, 'EDITUSER');
INSERT INTO public.role_resource
("role", resource)
VALUES(1, 'DELETEUSER');
INSERT INTO public.role_resource
("role", resource)
VALUES(1, 'ENABLEUSER');
INSERT INTO public.role_resource
("role", resource)
VALUES(1, 'DISABLEUSER');
INSERT INTO public.role_resource
("role", resource)
VALUES(1, 'EDITROLEPERMISSIONS');
INSERT INTO public.role_resource
("role", resource)
VALUES(1, 'SYSTEMLOG');
INSERT INTO public.role_resource
("role", resource)
VALUES(1, 'ORGANIZATIONALMANAGEMENT');
INSERT INTO public.role_resource
("role", resource)
VALUES(1, 'ROLEMANAGEMENT');
INSERT INTO public.role_resource
("role", resource)
VALUES(1, 'USERMANAGEMENT');
INSERT INTO public.role_resource
("role", resource)
VALUES(1, 'EDITDEVICEMODEL');
INSERT INTO public.role_resource
("role", resource)
VALUES(1, 'VIEWORGANIZATIONDATA');
INSERT INTO public.role_resource
("role", resource)
VALUES(1, 'VIEWUSERDATA');
INSERT INTO public.role_resource
("role", resource)
VALUES(1, 'VIEWROLEDATA');
INSERT INTO public.role_resource
("role", resource)
VALUES(1, 'EXPORTUSERDATA');
INSERT INTO public.role_resource
("role", resource)
VALUES(1, 'EXPORTSYSTEMLOGS');
INSERT INTO public.role_resource
("role", resource)
VALUES(1, 'VIEWSYSTEMLOG');
INSERT INTO public.role_resource
("role", resource)
VALUES(1, 'VIEWDEVICELIST');
INSERT INTO public.role_resource
("role", resource)
VALUES(1, 'VIEWFIRMWARELIST');
INSERT INTO public.role_resource
("role", resource)
VALUES(1, 'VIEWPRODUCTLIST');
INSERT INTO public.role_resource
("role", resource)
VALUES(1, 'VIEWSENSORLIST');
INSERT INTO public.role_resource
("role", resource)
VALUES(1, 'BATCHDISTRIBUTION');
INSERT INTO public.role_resource
("role", resource)
VALUES(1, 'BATCHUPGRADE');
INSERT INTO public.role_resource
("role", resource)
VALUES(1, 'DEVICELISTVIEWDETAILS');
INSERT INTO public.role_resource
("role", resource)
VALUES(1, 'ISSUETHECOMMAND');
INSERT INTO public.role_resource
("role", resource)
VALUES(1, 'REMOTEUPGRADE');
INSERT INTO public.role_resource
("role", resource)
VALUES(1, 'ADDTAGS');
INSERT INTO public.role_resource
("role", resource)
VALUES(1, 'DEVICEINSTALLATIONDIAGRAM');
INSERT INTO public.role_resource
("role", resource)
VALUES(1, 'DEVICEPARAMETERCONFIGURATION');
INSERT INTO public.role_resource
("role", resource)
VALUES(1, 'UNIFIEDDISTRIBUTIONOFCONFIGURATION');
INSERT INTO public.role_resource
("role", resource)
VALUES(1, 'CLEARALLCHANNELS');
INSERT INTO public.role_resource
("role", resource)
VALUES(1, 'CHANNELCONFIGURATIONISSUANCE');
INSERT INTO public.role_resource
("role", resource)
VALUES(1, 'ADDSUBDEVICES');
INSERT INTO public.role_resource
("role", resource)
VALUES(1, 'MODIFYSUBDEVICES');
INSERT INTO public.role_resource
("role", resource)
VALUES(1, 'DELETESUBDEVICES');
INSERT INTO public.role_resource
("role", resource)
VALUES(1, 'VIEWSUBDEVICES');
INSERT INTO public.role_resource
("role", resource)
VALUES(1, 'HISTORYOFISSUANCE');
INSERT INTO public.role_resource
("role", resource)
VALUES(1, 'DIAGNOSTICDATA');
INSERT INTO public.role_resource
("role", resource)
VALUES(1, 'UPLOADFIRMWARE');
INSERT INTO public.role_resource
("role", resource)
VALUES(1, 'EDITFIRMWARE');
INSERT INTO public.role_resource
("role", resource)
VALUES(1, 'DELETEFIRMWARE');
INSERT INTO public.role_resource
("role", resource)
VALUES(1, 'ADDPRODUCT');
INSERT INTO public.role_resource
("role", resource)
VALUES(1, 'EDITPRODUCT');
INSERT INTO public.role_resource
("role", resource)
VALUES(1, 'DELETEPRODUCT');
INSERT INTO public.role_resource
("role", resource)
VALUES(1, 'ADDNEWSENSORS');
INSERT INTO public.role_resource
("role", resource)
VALUES(1, 'EDITSENSORS');
INSERT INTO public.role_resource
("role", resource)
VALUES(1, 'DELETESENSOR');
INSERT INTO public.role_resource
("role", resource)
VALUES(1, 'PROJECTMANAGEMENT');
INSERT INTO public.role_resource
("role", resource)
VALUES(1, 'VIEWPROJECTDATA');
INSERT INTO public.role_resource
("role", resource)
VALUES(1, 'ADDPROJECT');
INSERT INTO public.role_resource
("role", resource)
VALUES(1, 'EDITPROJECT');
INSERT INTO public.role_resource
("role", resource)
VALUES(1, 'DELETEPROJECT');
