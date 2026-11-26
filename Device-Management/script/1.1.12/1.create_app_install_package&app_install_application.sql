CREATE TABLE IF NOT EXISTS app_install_application (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE app_install_application IS 'APP安装包管理-应用信息表';
COMMENT ON COLUMN app_install_application.id IS '应用主键ID';
COMMENT ON COLUMN app_install_application.name IS '应用名称，全局唯一';
COMMENT ON COLUMN app_install_application.created_at IS '创建时间';
COMMENT ON COLUMN app_install_application.updated_at IS '更新时间';

CREATE TABLE IF NOT EXISTS app_install_package (
  id SERIAL PRIMARY KEY,
  app_id INTEGER NOT NULL REFERENCES app_install_application(id),
  version VARCHAR(100) NOT NULL,
  description TEXT,
  package_name VARCHAR(255) NOT NULL,
  package_url VARCHAR(1000) NOT NULL,
  online_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT app_install_package_app_version_uindex UNIQUE (app_id, version)
);

COMMENT ON TABLE app_install_package IS 'APP安装包管理-安装包版本表';
COMMENT ON COLUMN app_install_package.id IS '安装包版本主键ID';
COMMENT ON COLUMN app_install_package.app_id IS '所属应用ID，关联app_install_application.id';
COMMENT ON COLUMN app_install_package.version IS '应用版本号，同一应用内唯一';
COMMENT ON COLUMN app_install_package.description IS '版本说明';
COMMENT ON COLUMN app_install_package.package_name IS 'APK安装包文件名';
COMMENT ON COLUMN app_install_package.package_url IS 'APK安装包存储地址';
COMMENT ON COLUMN app_install_package.online_time IS '上线时间';
COMMENT ON COLUMN app_install_package.created_at IS '创建时间';
COMMENT ON COLUMN app_install_package.updated_at IS '更新时间';

CREATE INDEX IF NOT EXISTS app_install_package_app_id_idx ON app_install_package(app_id);
CREATE INDEX IF NOT EXISTS app_install_package_online_time_idx ON app_install_package(online_time);