-- 参数模板历史修改记录表

BEGIN;

CREATE TABLE IF NOT EXISTS param_template_history (
    id                SERIAL PRIMARY KEY,
    param_template_id INTEGER     NOT NULL,
    change_type       VARCHAR(32) NOT NULL,
    name              VARCHAR(255) NOT NULL,
    product_code      VARCHAR(255) NOT NULL,
    mode              VARCHAR(64)  NOT NULL,
    schema            JSONB,
    remark            VARCHAR(255),
    created_at        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE param_template_history IS '参数模板历史修改记录';
COMMENT ON COLUMN param_template_history.param_template_id IS '参数模板主表 ID';
COMMENT ON COLUMN param_template_history.change_type IS '变更类型：create 新增，update 编辑';
COMMENT ON COLUMN param_template_history.name IS '模板名称快照';
COMMENT ON COLUMN param_template_history.product_code IS '产品编码快照';
COMMENT ON COLUMN param_template_history.mode IS '模板模式快照';
COMMENT ON COLUMN param_template_history.schema IS '模板结构 JSON 快照';
COMMENT ON COLUMN param_template_history.remark IS '备注快照';

CREATE INDEX IF NOT EXISTS idx_param_template_history_template_id
    ON param_template_history (param_template_id);

CREATE INDEX IF NOT EXISTS idx_param_template_history_product_code
    ON param_template_history (product_code);

CREATE INDEX IF NOT EXISTS idx_param_template_history_mode
    ON param_template_history (mode);

CREATE INDEX IF NOT EXISTS idx_param_template_history_created_at
    ON param_template_history (created_at DESC);

COMMIT;
