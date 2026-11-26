/*
 * 文件作用：
 *   为边缘设备与云端管理 V2.0 增加当前管理平台需要维护的业务数据结构。
 *
 * 设计边界：
 *   1. 新版 Node Agent 平台负责设备主数据、设备指标、视频通道、文件和发布任务实时状态。
 *   2. 本系统只保存项目权限关系、视觉模型元数据、下发任务的业务快照和远程会话记录。
 *   3. 操作审计沿用现有 system_log 表，不新建 edge_operation_audit 表。
 *   4. 本期不建设设备日志、心跳规则、事件、告警、证据、检测信息和终端连续输出表。
 *
 * 评审后调整：
 *   1. 增加从边缘设备页面创建下发升级任务的能力。
 *   2. 升级任务按目标设备拆分，一台设备对应一条记录。
 *   3. 模型名称由业务固定，模型格式由系统根据上传文件自动识别。
 *   4. 模型库不落库校验状态、模型状态和操作状态字段。
 *   5. 操作审计页面并入现有系统日志，展示内容以 system_log 当前格式为准。
 *
 * 执行说明：
 *   1. 本脚本是已有管理平台库的增量迁移，不是空库初始化；需要已有 public.project_devices。
 *   2. 执行前应检查 project_devices 中是否存在重复的项目-设备关系；唯一索引创建失败时需要先清理重复数据。
 *   3. 脚本不删除已有数据；cloud_* 列名和 edge_cloud 来源值保留以兼容历史数据，不需要独立 Cloud 服务。
 */

BEGIN;

/* Fail before any DDL when the platform base schema has not been imported. */
DO $migration$
BEGIN
    IF to_regclass('public.project_devices') IS NULL THEN
        RAISE EXCEPTION USING
            ERRCODE = '42P01',
            MESSAGE = 'Missing prerequisite table: public.project_devices',
            HINT = 'This is an incremental platform migration. Initialize or import the management platform base schema first; see script/2.0.0/README.md.';
    END IF;
END
$migration$;

/* ========================================================================== */
/* 1. 扩展现有项目-设备关系                                                   */
/* ========================================================================== */

/*
 * 设备来源：
 *   legacy    现有平台历史设备关系。
 *   edge_cloud 本期边缘设备与 Cloud 服务建立的设备关系。
 *
 * 不在本地创建边缘设备主表，device_code 仍然保存 Cloud 返回的设备 ID。
 */
ALTER TABLE public.project_devices
    ADD COLUMN IF NOT EXISTS source_system varchar(32);

UPDATE public.project_devices
SET source_system = 'legacy'
WHERE source_system IS NULL;

ALTER TABLE public.project_devices
    ALTER COLUMN source_system SET DEFAULT 'legacy',
    ALTER COLUMN source_system SET NOT NULL;

COMMENT ON COLUMN public.project_devices.source_system IS
    '设备关系来源：legacy 现有平台设备，edge_cloud 边缘 Cloud 设备';

/* 防止同一来源下同一设备在同一项目中重复绑定。 */
CREATE UNIQUE INDEX IF NOT EXISTS uq_project_devices_source_project_device
    ON public.project_devices (source_system, project_id, device_code);

/*
 * 评审规则：一台 edge_cloud 设备只能属于一个项目。
 * legacy 设备不受该索引影响，保持历史平台行为不变。
 */
CREATE UNIQUE INDEX IF NOT EXISTS uq_project_devices_edge_cloud_device
    ON public.project_devices (device_code)
    WHERE source_system = 'edge_cloud';

/* ========================================================================== */
/* 2. 视觉模型元数据                                                           */
/* ========================================================================== */

/*
 * 视觉模型库只保存模型文件及其业务元数据。
 *
 * 不保存以下字段：
 *   - validation_status：评审后不展示模型校验状态列。
 *   - status：评审后不展示模型状态列。
 *   - operation：模型库不保存操作列状态。
 *
 * model_format 仍然保存系统识别出的最终格式，但该字段不是用户手工选择项。
 * model_name 由业务固定，接口层不允许前端自定义名称。
 */
CREATE TABLE IF NOT EXISTS public.edge_visual_model (
    id serial NOT NULL,
    model_name varchar(100) NOT NULL,
    model_type varchar(100) NOT NULL,
    version varchar(64) NOT NULL,
    model_format varchar(32) NOT NULL,
    cloud_file_id varchar(128) NOT NULL,
    file_name varchar(255) NOT NULL,
    file_size bigint NOT NULL,
    sha256 char(64),
    created_by int4,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT edge_visual_model_pkey PRIMARY KEY (id),
    CONSTRAINT edge_visual_model_cloud_file_uq UNIQUE (cloud_file_id),
    CONSTRAINT edge_visual_model_type_version_uq
        UNIQUE (model_name, model_type, version),
    CONSTRAINT edge_visual_model_file_size_ck CHECK (file_size >= 0)
);

COMMENT ON TABLE public.edge_visual_model IS
    '边缘视觉模型元数据；模型文件实体由 Cloud 文件服务负责';
COMMENT ON COLUMN public.edge_visual_model.id IS
    '本地视觉模型元数据主键';
COMMENT ON COLUMN public.edge_visual_model.model_name IS
    '固定模型名称；由业务规则确定，前端不允许自定义';
COMMENT ON COLUMN public.edge_visual_model.model_type IS
    '识别类型；与模型版本由模型业务规则同步';
COMMENT ON COLUMN public.edge_visual_model.version IS
    '模型版本号；同一模型名称和识别类型下唯一';
COMMENT ON COLUMN public.edge_visual_model.model_format IS
    '模型文件格式；由系统根据上传文件自动识别，不由用户手工选择';
COMMENT ON COLUMN public.edge_visual_model.cloud_file_id IS
    'Cloud 文件服务返回的文件 ID，本系统不保存文件实体';
COMMENT ON COLUMN public.edge_visual_model.file_name IS
    '上传文件名快照';
COMMENT ON COLUMN public.edge_visual_model.file_size IS
    '文件大小，单位字节';
COMMENT ON COLUMN public.edge_visual_model.sha256 IS
    'Cloud 返回的文件 SHA-256 信息快照，可为空；本系统不计算、不校验';
COMMENT ON COLUMN public.edge_visual_model.created_by IS
    '上传人用户 ID；不设置外键，兼容系统用户和服务账号';
COMMENT ON COLUMN public.edge_visual_model.created_at IS
    '模型元数据创建时间';
COMMENT ON COLUMN public.edge_visual_model.updated_at IS
    '模型元数据更新时间';

CREATE INDEX IF NOT EXISTS idx_edge_visual_model_type_version
    ON public.edge_visual_model (model_type, version);
CREATE INDEX IF NOT EXISTS idx_edge_visual_model_created_at
    ON public.edge_visual_model (created_at DESC);

/* ========================================================================== */
/* 3. 升级任务设备记录                                                         */
/* ========================================================================== */

/*
 * 一条记录对应一个目标设备。
 *
 * Cloud 的 deployments/deployment_tasks 仍然是实时任务权威数据；
 * 本表只保存管理平台创建任务时的业务快照，满足：
 *   - 按项目筛选；
 *   - 按设备名称展示；
 *   - 追溯某个 Cloud 发布任务当时下发了哪台设备和哪个模型版本；
 *   - 以 cloud_deployment_id + device_code 实现重复请求幂等。
 *
 * 本表不保存：
 *   - 执行状态；
 *   - 执行进度；
 *   - 操作列状态；
 *   - Cloud 逐设备任务明细。
 *
 * 如页面未来需要实时查看执行结果，应根据 cloud_deployment_id 调用 Cloud API。
 */
CREATE TABLE IF NOT EXISTS public.edge_upgrade_task_device (
    id bigserial NOT NULL,
    cloud_deployment_id varchar(128) NOT NULL,
    project_id int4 NOT NULL,
    device_code varchar(255) NOT NULL,
    device_name varchar(255) NOT NULL,
    visual_model_id int4 NOT NULL,
    model_name varchar(100) NOT NULL,
    model_type varchar(100) NOT NULL,
    model_version varchar(64) NOT NULL,
    cloud_file_id varchar(128) NOT NULL,
    created_by int4,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT edge_upgrade_task_device_pkey PRIMARY KEY (id),
    CONSTRAINT edge_upgrade_task_device_uq
        UNIQUE (cloud_deployment_id, device_code),
    CONSTRAINT edge_upgrade_task_device_model_fk
        FOREIGN KEY (visual_model_id)
        REFERENCES public.edge_visual_model (id)
        ON DELETE RESTRICT
);

COMMENT ON TABLE public.edge_upgrade_task_device IS
    '边缘视觉模型升级任务的设备级业务快照，一台目标设备一条记录';
COMMENT ON COLUMN public.edge_upgrade_task_device.id IS
    '本地升级任务设备记录主键';
COMMENT ON COLUMN public.edge_upgrade_task_device.cloud_deployment_id IS
    'Cloud 批量发布任务 ID；同一任务可对应多条设备记录';
COMMENT ON COLUMN public.edge_upgrade_task_device.project_id IS
    '任务创建时的项目 ID，用于项目权限过滤和历史追溯';
COMMENT ON COLUMN public.edge_upgrade_task_device.device_code IS
    'Cloud 设备 ID';
COMMENT ON COLUMN public.edge_upgrade_task_device.device_name IS
    '创建任务时的设备名称快照；列表按评审要求展示设备名称';
COMMENT ON COLUMN public.edge_upgrade_task_device.visual_model_id IS
    '本地视觉模型元数据 ID';
COMMENT ON COLUMN public.edge_upgrade_task_device.model_name IS
    '下发时的固定模型名称快照';
COMMENT ON COLUMN public.edge_upgrade_task_device.model_type IS
    '下发时的模型类型快照';
COMMENT ON COLUMN public.edge_upgrade_task_device.model_version IS
    '下发时的模型版本快照';
COMMENT ON COLUMN public.edge_upgrade_task_device.cloud_file_id IS
    '下发时使用的 Cloud 文件 ID 快照';
COMMENT ON COLUMN public.edge_upgrade_task_device.created_by IS
    '创建任务的用户 ID；不设置外键，兼容系统用户和服务账号';
COMMENT ON COLUMN public.edge_upgrade_task_device.created_at IS
    '本地任务记录创建时间';

CREATE INDEX IF NOT EXISTS idx_edge_upgrade_task_device_project_created
    ON public.edge_upgrade_task_device (project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_edge_upgrade_task_device_device_created
    ON public.edge_upgrade_task_device (device_code, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_edge_upgrade_task_device_deployment
    ON public.edge_upgrade_task_device (cloud_deployment_id);

/* ========================================================================== */
/* 4. 远程会话记录                                                             */
/* ========================================================================== */

/*
 * 远程会话页面仍需要展示会话用途、发起人、开始和结束时间。
 *
 * 本表不保存 Terminal 连续输出。
 * 每条远程命令的摘要、执行时间、耗时、退出码和结果摘要，写入现有 system_log.content；
 * 审计页面直接复用系统日志页面，不新增专用审计表。
 */
CREATE TABLE IF NOT EXISTS public.edge_remote_session (
    id bigserial NOT NULL,
    cloud_session_id varchar(128),
    project_id int4 NOT NULL,
    device_code varchar(255) NOT NULL,
    device_name varchar(255),
    operator_id int4,
    purpose varchar(500) NOT NULL,
    started_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ended_at timestamptz,
    end_reason varchar(64),
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT edge_remote_session_pkey PRIMARY KEY (id),
    CONSTRAINT edge_remote_session_cloud_id_uq UNIQUE (cloud_session_id),
    CONSTRAINT edge_remote_session_time_ck CHECK (
        ended_at IS NULL OR ended_at >= started_at
    )
);

COMMENT ON TABLE public.edge_remote_session IS
    '边缘设备远程会话记录；不保存终端连续输出';
COMMENT ON COLUMN public.edge_remote_session.id IS
    '本地远程会话主键';
COMMENT ON COLUMN public.edge_remote_session.cloud_session_id IS
    'Cloud Terminal Gateway 会话 ID，可为空；由 Cloud 连接结果提供';
COMMENT ON COLUMN public.edge_remote_session.project_id IS
    '会话所属项目 ID，用于项目权限控制';
COMMENT ON COLUMN public.edge_remote_session.device_code IS
    '会话目标设备 ID';
COMMENT ON COLUMN public.edge_remote_session.device_name IS
    '创建会话时的设备名称快照';
COMMENT ON COLUMN public.edge_remote_session.operator_id IS
    '会话操作人用户 ID；不设置外键，兼容系统用户和服务账号';
COMMENT ON COLUMN public.edge_remote_session.purpose IS
    '远程运维目的';
COMMENT ON COLUMN public.edge_remote_session.started_at IS
    '会话开始时间';
COMMENT ON COLUMN public.edge_remote_session.ended_at IS
    '会话结束时间；为空表示当前未记录结束';
COMMENT ON COLUMN public.edge_remote_session.end_reason IS
    '结束原因，例如主动结束、到期、连接异常';
COMMENT ON COLUMN public.edge_remote_session.created_at IS
    '本地会话记录创建时间';

CREATE INDEX IF NOT EXISTS idx_edge_remote_session_project_started
    ON public.edge_remote_session (project_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_edge_remote_session_device_started
    ON public.edge_remote_session (device_code, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_edge_remote_session_operator_started
    ON public.edge_remote_session (operator_id, started_at DESC);

/* ========================================================================== */
/* 5. 操作审计复用现有 system_log                                               */
/* ========================================================================== */

/*
 * 不创建 edge_operation_audit 表。
 *
 * Edge 相关操作写入现有 public.system_log：
 *   module  = 'edge_device'
 *   user_id = 当前操作用户 ID
 *   url     = 当前管理接口路径
 *   content = 按现有系统日志展示格式生成的操作内容和脱敏参数摘要
 *
 * 远程命令日志不得写入密码、Token、密钥或未脱敏的敏感路径。
 * system_log 当前已有 log_time、module、user_id 索引，本脚本不重复创建索引。
 */

COMMIT;
