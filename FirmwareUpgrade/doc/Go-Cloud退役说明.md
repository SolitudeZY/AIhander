# Go Cloud 退役与 Agent 部署

2026-10-10。原 `cmd/cloud` 是 V1 本地测试服务，正式设备管理改由既有 Device-Management Node API 直接对接 Agent。实施计划、接口归属和验收步骤以 [Node-Agent 迁移计划](../../Device-Management/doc/Node-Agent迁移计划.md) 为准。

## 本仓库修改范围

1. 删除已纳入版本管理的 `cmd/cloud` 服务、内嵌管理页面、终端资产及对应测试；移除只能启动 Go Cloud 的冒烟脚本。
2. Cloud 目录中尚未纳入 SVN 的 4 个测试保留到 `doc/legacy-cloud-tests`，以 `.go.txt` 保存原始字节，避免删除用户工作或被 Go 当作可执行包。
3. 构建脚本仅构建 Agent。Go `cmd/setup`、`cmd/detector-demo` 和 Python Detector 保留；已生成的本地 Cloud 二进制不删除，但不得再部署。
4. Agent 默认及示例 `server_url` 改为 Node API 地址 `http://127.0.0.1:4700`。实际设备需填写 Node 可达地址；不要包含 `/api/v1`，Agent 自动拼接设备接口路径。
5. 保留设备协议中的 `_from=cloud`、管理来源 `cloud` 及告警确认状态名称，它们是远程平台的兼容角色，不代表还需运行 Go Cloud。Node 必须沿用该角色，才能复用 Agent 的权限、仲裁、重启和告警补报逻辑。

## 部署与数据边界

先迁移 Node 数据库及文件存储并启动新版 Node API，再修改设备配置并重启 Agent，确认设备注册、心跳、通道查询、下载与告警正常后停止旧 Go Cloud。

Agent 的 `agent-state.json`、设备本地 `agent.db`、下载目录及 Detector 数据保持不变。旧 Cloud 的设备身份、任务和文件不能靠更换 URL 自动迁移；已有设备 token 的迁移由 Node 计划处理，不要直接删除设备状态文件。

Agent 连接 Node：`POST /api/v1/agents/register`、WebSocket `GET /api/v1/agents/connect`、带设备 Token 的 `GET /api/v1/agents/files/{id}`。浏览器使用既有平台账号和权限，不增加独立 Cloud 登录。

## 验证

在本仓库执行 `go test ./...`、`go vet ./...`，并交叉构建 Linux ARM64 Agent。Node 侧完成设备协议、断线处理、终端、下发和告警持久化测试。构建成功与模拟测试不代表已完成真实板端部署。
