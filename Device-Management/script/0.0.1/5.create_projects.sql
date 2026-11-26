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