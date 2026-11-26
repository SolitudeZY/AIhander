> 2026-10-10：本文中的独立 Go Cloud 部署、旧 HTTP 代理和 Cloud 测试命令已退役。当前链路与新接口以 [Node-Agent迁移计划](../../Device-Management/doc/Node-Agent迁移计划.md) 和 [Go Cloud 退役说明](Go-Cloud退役说明.md) 为准。Agent/Detector 协议与板端系统授权说明仍可参考。

# WebShell 命令耗时与退出码（2026-09-22）

## 范围

会话表的 `startedAt`、`endedAt` 继续表示整场会话，用于会话总时长，包含空闲和输入时间。本次增加 Bash 单次提交的开始、结束事件，复用现有 WebSocket 和 Node API 的 `recording` JSONB；不增加表、列、HTTP 接口或独立执行服务。

一条执行记录是一轮 Bash 前台提交：管道、`a; b`、多行复合语句作为一个整体，退出码遵循 Bash 的最终状态（含 `pipefail` 设置）。后台任务显示提交后台任务这一轮的状态，不追踪后台任务之后的退出码。进入 vim、top、子 Shell 时，计量其整个前台运行周期，不把其中的每次按键当成命令。

## 协议及历史接口

Agent 解析 Bash PS0 / PROMPT_COMMAND 发出的有界标记，使用设备上的开始、结束时刻计算毫秒耗时。标记不会出现在实时终端中。正常 Shell 退出时，读取完 PTY 后补齐最后一条尚未结束的执行（如 `exit 7`）；被强制关闭或未取得退出码时不补成功结果。

Agent → Cloud 新增 `terminal.command`，Cloud → Node 转为：

```json
{
  "type": "command",
  "session_id": "existing-session-id",
  "command_event": {
    "session_id": "existing-session-id",
    "command_id": "1",
    "state": "finished",
    "started_at": "2026-09-22T08:00:00.000Z",
    "ended_at": "2026-09-22T08:00:00.250Z",
    "duration_ms": 250,
    "exit_code": 1
  }
}
```

`state=ready` 表示集成已启用；`started` 带 `command` 和 `started_at`；`finished` 带执行结果。`command_id` 在会话内递增。Node 接收后应用现有敏感信息脱敏策略，记录在同一份 `recording.events` 中，不向浏览器额外转发未脱敏命令事件，也不写原始命令日志。

`GET /edgeCloud/remote-sessions/:sessionId` 的 `commands[]` 保留原字段，新增 `commandId`、`startedAt`、`endedAt`：

| 字段 | 语义 |
| --- | --- |
| `submittedAt` | 网关收到关联输入的时间；无关联输入时为网关收到执行事件的时间 |
| `startedAt` / `endedAt` | 设备报告的执行开始、结束时间 |
| `durationMs` | 单轮执行耗时，毫秒；0 是有效数值 |
| `exitCode` | Bash 返回码；0 成功，非 0 失败 |
| `status` | `running` 执行中、`succeeded` 成功、`failed` 失败、`interrupted` 中断；旧输入仍为 `submitted` 已提交 |
| `kind` | 新执行记录为 `execution`；原输入仍为 `input` / `interactive` |
| `recording.shellExitCode` | 整个 Shell 的退出码，不能填到所有命令上 |

未完成的记录保持 `durationMs=null`、`exitCode=null`。中途断开或 API 重启后，未收到完成事件的记录显示中断。旧 Agent、旧记录、非 Bash 和未启用集成的会话继续显示已提交，耗时/退出码显示“未采集”，不追溯伪造。

前端使用 `startedAt`（旧记录回退到 `submittedAt`），直接映射 `durationMs`、`exitCode` 和 `status`。历史表保留耗时、退出码、结果三列。

## 更新步骤

1. 更新 Device-Management Node API 和前端。没有数据库迁移；旧 Agent 仍可使用交互终端。
2. 更新 FirmwareUpgrade Cloud 二进制，使其透传 `terminal.command`。
3. 更新设备 Agent 二进制，重启服务后新建 Bash 会话。已打开的旧 Shell 不会自动获得采集钩子。
4. 普通账号直接启动 Bash 时，Agent 内嵌并自动创建临时 rcfile，Shell 退出后删除；无需额外安装脚本。
5. 若启用了 `terminal.run_as_user`，同时更新固定启动脚本及 rcfile：

```sh
sudo install -o root -g root -m 0644 terminal_bashrc.sh /usr/local/libexec/firmware-terminal-bashrc
sudo install -o root -g root -m 0755 firmware-terminal-shell /usr/local/libexec/firmware-terminal-shell
```

固定启动脚本仍不接受参数，仍以既定 `edgeops` 账号运行，不修改 sudoers。隔离账号部署使用发行包中的这两个文件；普通账号无需上述步骤。

## 兼容和验证

要求 Linux Bash 4.4+ 和 GNU base64；旧 Bash / 其他 Shell 保留终端功能，但没有逐命令结果。PS0 和 PROMPT_COMMAND 原有内容会保留；覆盖这些钩子、关闭历史或在用户启动脚本中替换 Shell 可能使采集不完整。命令文本无法可靠取得时保守脱敏，结果以结构化事件为准。Shell 钩子是运维可观测性功能，不提供防篡改审计保证。

本地验证包含真实 Linux PTY 下成功/失败、管道、复合及多行命令、Ctrl+C、连续提交、exit；Go 标记分包和 Cloud 透传；Node WebSocket 网关、脱敏持久化、异常断开；前端 0 值、旧记录和状态映射。

实际 RK3576 设备部署和现场数据库验证需在安装后执行：`true`、`false`、`sleep 1`、`exit 7`，再打开历史详情确认结果。此步骤不能由本地测试代替。

## 本次交付状态

- 2026-09-22 18:51 已更新 `kickpi@10.8.30.54` 的 `/home/kickpi/testAgent/agent-linux-arm64`，watchdog 已重新启动 Agent，Cloud 查询确认设备在线。
- 运行中二进制 SHA-256：`9d31decafaa3c95e85bd6733b2d3f67abc35978ff83e9e191ec1d62e7b7e604d`。
- 原运行中版本备份：`/home/kickpi/testAgent/webshell-update-20260922/backup-running-2652`；磁盘旧文件另存为 `backup-disk-2652`。配置未修改。回退时将运行版本备份复制到临时文件，chmod 755 后替换 Agent，再按原服务方式重启。
- 已在该 ARM64 板子运行真实 PTY 回归，验证成功/失败、耗时、多行、连续输入、Ctrl+C、exit 及标记分包。
- Device-Management 本地 API 和前端源码已更新。Node/前端契约及网关测试 28 项通过，Chrome 历史表验证通过，生产构建通过（保留项目既有导出/包体积警告）。
- Cloud 尚未替换：`cloud-windows-amd64.exe` 用于 Windows 同事机器；Linux 根据架构选择 `cloud-linux-amd64` / `cloud-linux-arm64`。保留原启动参数与 `data-dir`，停止旧程序后替换并重启。
- 本机检查时前端 5700 正在运行，API 4700 未监听。请使用原有数据库、Cloud 地址等启动配置启动 API；本次未用示例数据库配置擅自启动服务。
- 完整线上历史结果需 Cloud 和 Node API 启用新版后，新建 Bash 会话验证；不能用旧历史判断采集是否生效。

