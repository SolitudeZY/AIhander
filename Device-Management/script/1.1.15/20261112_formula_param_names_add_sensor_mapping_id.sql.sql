BEGIN;

-- 1. 备份迁移前数据；若同名备份表已存在，停止执行并人工确认。
CREATE TABLE formula_param_names_backup_20261112_mapping_scope AS
SELECT *
FROM formula_param_names;

-- 2. 历史数据完整性校验：
-- 任一参数名未被任何传感器型号配置引用时，终止迁移，避免静默丢失数据。
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM formula_param_names fpn
    WHERE NOT EXISTS (
      SELECT 1
      FROM sensor_type_model_mapping stmm
      WHERE fpn.formula_id = ANY(
        COALESCE(stmm.formula_ids, ARRAY[]::INTEGER[])
      )
    )
  ) THEN
    RAISE EXCEPTION
      '存在未关联到传感器型号配置的公式参数名，请先处理后再迁移';
  END IF;
END $$;

-- 3. 增加参数名所属的传感器型号配置 ID。
ALTER TABLE formula_param_names
ADD COLUMN sensor_mapping_id INTEGER;

-- 4. 移除旧的 formula_id 全局唯一约束。
-- 不同环境中约束名称可能不同，两个名称均兼容处理。
ALTER TABLE formula_param_names
DROP CONSTRAINT IF EXISTS formula_param_names_formula_id_key;

ALTER TABLE formula_param_names
DROP CONSTRAINT IF EXISTS formula_param_names_formula_id_uindex;

DROP INDEX IF EXISTS formula_param_names_formula_id_key;
DROP INDEX IF EXISTS formula_param_names_formula_id_uindex;

-- 5. 修复主键序列，防止复制历史数据时 id 主键冲突。
-- SELECT setval(
--   pg_get_serial_sequence('formula_param_names', 'id'),
--   COALESCE((SELECT MAX(id) FROM formula_param_names), 1),
--   EXISTS (SELECT 1 FROM formula_param_names)
-- );

-- 6. 将原全局参数名复制到每一个引用该公式的传感器型号配置下。
INSERT INTO formula_param_names (
  sensor_mapping_id,
  formula_id,
  param1_name,
  param2_name,
  param3_name,
  param4_name
)
SELECT
  stmm.id,
  backup.formula_id,
  backup.param1_name,
  backup.param2_name,
  backup.param3_name,
  backup.param4_name
FROM formula_param_names_backup_20261112_mapping_scope backup
JOIN sensor_type_model_mapping stmm
  ON backup.formula_id = ANY(
    COALESCE(stmm.formula_ids, ARRAY[]::INTEGER[])
  );

-- 7. 删除迁移前没有归属的旧记录。
DELETE FROM formula_param_names
WHERE sensor_mapping_id IS NULL;

-- 8. 新约束：同一传感器配置内，公式只能有一组参数名。
ALTER TABLE formula_param_names
ALTER COLUMN sensor_mapping_id SET NOT NULL;

ALTER TABLE formula_param_names
ADD CONSTRAINT formula_param_names_mapping_formula_uindex
UNIQUE (sensor_mapping_id, formula_id);

ALTER TABLE formula_param_names
ADD CONSTRAINT formula_param_names_sensor_mapping_fkey
FOREIGN KEY (sensor_mapping_id)
REFERENCES sensor_type_model_mapping(id)
ON UPDATE CASCADE
ON DELETE CASCADE;

COMMIT;