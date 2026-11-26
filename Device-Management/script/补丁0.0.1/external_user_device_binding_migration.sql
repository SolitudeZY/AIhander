-- 外部用户设备绑定由“用户 + 后八位”升级为“用户 + 产品编码 + 后八位”。
-- 适用数据库：PostgreSQL。执行前请先在目标环境备份 external_user_devices 表。

BEGIN;

-- 迁移保护：若已存在新联合键重复的数据则终止，避免静默丢失数据。
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM external_user_devices
    GROUP BY user_id, product_code, device_code
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION
      'external_user_devices contains duplicate (user_id, product_code, device_code) rows';
  END IF;
END $$;

-- 旧唯一约束会阻止同一用户绑定 DCM2/26062345 与 DCM3/26062345。
-- PostgreSQL 会随约束自动删除其底层唯一索引，因此不能直接 DROP INDEX。
-- 兼容历史环境：旧规则可能是唯一约束，也可能是独立唯一索引。
ALTER TABLE public.external_user_devices
  DROP CONSTRAINT IF EXISTS uniq_user_device;

DROP INDEX IF EXISTS public.uniq_user_device;

-- 保留旧接口按用户和后八位查询时的索引能力。
CREATE INDEX IF NOT EXISTS idx_user_device
  ON external_user_devices (user_id, device_code);

-- 新接口的精确绑定约束。
CREATE UNIQUE INDEX IF NOT EXISTS uniq_user_product_device
  ON external_user_devices (user_id, product_code, device_code);

COMMIT;

-- 执行后核验：
-- SELECT indexname, indexdef
-- FROM pg_indexes
-- WHERE tablename = 'external_user_devices';
