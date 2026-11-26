# Node-Agent 数据库迁移

这些文件是已有设备管理平台 PostgreSQL 库的增量脚本，不是独立 Agent 或空库的完整初始化。

## 执行前检查

在准备给 Node API 使用的目标库运行只读检查：

```sql
SELECT current_database(), current_schema();
SELECT to_regclass('public.project_devices') AS project_devices,
       to_regclass('public.user') AS platform_user,
       to_regclass('public.organization') AS organization,
       to_regclass('public.edge_remote_session') AS edge_remote_session;
```

`project_devices` 是第一个脚本必需的已有表；`user`、`organization`、部门、角色、资源、职位等基础表及初始数据是平台注册/登录的前提。其他项目的 `t_user`、`t_department` 不能代替这些表。仅有 `edge_agent_record` 不代表管理平台已初始化。

缺基础结构时，优先导入已有设备管理平台的完整基础结构及初始化数据到本地测试库。历史结构可参考 `script/0.0.1/2.create_table.sql`，其中包含 `project_devices`，但该文件含 `DROP TABLE`，还依赖 `command_histories` 等已有结构，不能当成安全的空库初始化直接整文件执行。不要为了通过迁移只创建占位表，后续 API 仍需要完整结构。

当前本地首次初始化的已验证六步清单见 `script/README.md`：先 `0.0.1/init_data.sql`，再 `0.0.1/2.create_table.sql` 和 `1.0.6/alter_table_projects.sql`，最后本目录三个文件。该基础链路包含替换旧用户结构的操作，只适用于未初始化本平台的本地库。

## 执行顺序

### 已有测试库，本次发版需要执行哪些

不需要全部重跑。`1.create_edge_cloud_management.sql` 和 `2.add_remote_session_recording.sql` 本轮仅调整注释及增加缺表前置检查，没有新增业务表结构变更；此前已完整执行并成功提交的旧版 1、2 无需因为这些改动再执行。

| 测试库情况 | 本次执行范围 |
| --- | --- |
| 1、2 已执行，3 尚未执行 | 仅执行 `3.node_agent_platform.sql` |
| 1 已执行，远程会话尚无 recording 列 | 顺序执行 2 → 3 |
| 尚未安装这组边缘业务表，平台基础结构已存在 | 顺序执行 1 → 2 → 3 |
| 1、2、3 均已完整执行，结构及索引正常 | 无需执行数据库脚本，更新代码即可 |

第 3 个脚本是本次 Node 承接 Agent 新增的存储，建立 `edge_agent_record` 表及设备/数据、设备令牌、重启幂等键与活动操作索引。七牛元数据、温度和重启 ID 修复使用该表既有 JSONB，不需要额外迁移。已经存在此表时，仍应确认 3 的整个事务执行成功及索引齐全；本版 3 可再次执行补齐缺失索引，但不会修复同名异构的表。

可在 **测试 Node 实际连接的目标库** 执行以下只读查询，不需要连接本机开发库：

```sql
SELECT current_database(), current_schema();
SELECT to_regclass('public.edge_visual_model') AS visual_model,
       to_regclass('public.edge_upgrade_task_device') AS upgrade_task,
       to_regclass('public.edge_remote_session') AS remote_session,
       to_regclass('public.edge_agent_record') AS agent_record;
SELECT table_name, column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND ((table_name = 'project_devices' AND column_name = 'source_system')
    OR (table_name = 'edge_remote_session' AND column_name = 'recording'));
SELECT indexname
FROM pg_indexes
WHERE schemaname = 'public' AND tablename = 'edge_agent_record'
ORDER BY indexname;
```

3 完整执行后应有主键索引 `edge_agent_record_pkey`，以及 `edge_agent_device_time`、`edge_agent_data`、`edge_agent_token`、`edge_agent_reboot_key`、`edge_agent_active_reboot`。只凭“运行过脚本”或“表已存在”无法确认事务成功，以上结构/索引或迁移记录才是依据。查询没有返回 recording 行时，需要补执行 2（前提是远程会话表存在）。

### 新增边缘业务表的完整顺序

1. 确认平台基础表存在。
2. 执行 `1.create_edge_cloud_management.sql` 并确认成功提交。
3. 执行 `2.add_remote_session_recording.sql`。
4. 执行 `3.node_agent_platform.sql`。
5. 将 `api/agent-local.env` 的 `POMS_DB` 指向同一个库，重启 Node API。

第一个文件沿用历史名称；新版不需要独立 Cloud。`cloud_*` 业务列名和 `edge_cloud` 来源值保留以兼容已有数据。

三个脚本都有事务边界。报错后先执行 `ROLLBACK;` 退出失败事务，再修复前置问题并重新执行完整文件；不要忽略第一条错误，只继续执行后续语句。`25P02` 表示当前事务已失败，应查看它前面的第一条错误。

`IF NOT EXISTS` 允许重复执行相同结构，不会自动修复同名但不同结构的旧表。第一个脚本建立唯一索引时，已有重复的项目设备关系也会失败，须先核对数据再制定清理方案。

## 当前本地库诊断（2026-10-10）

只读检查 `127.0.0.1:5432/postgres`：`edge_agent_record` 存在；`project_devices`、`edge_remote_session` 及本平台 `user`、`organization` 缺失。原两个脚本在回滚验证中分别复现 `42P01` 缺表错误。第一个事务失败后未留下视觉模型、升级任务或远程会话表，所以第二个脚本也无法执行。

两个增量脚本已增加前置检查，缺表时提供明确的表名和执行提示，不会自动创建平台基础表。本次诊断和验证均回滚，没有向真实业务表写入数据。
