# Agent 按服务器保存认证状态（2026-10-12）

## 问题与范围

当前 `agent-state.json` 只有一份 `device_id` 和 `token`，不能记录令牌属于哪个服务器。普通断线重连已有令牌复用；开发、测试服务器往返切换时，同一文件可能带入错误环境的令牌。Node 已登记设备要求提交匹配令牌，不能用删除状态或自动覆盖服务端凭据处理。

本次只修改 Go Agent 的认证状态持久化和相关诊断，不增加多服务器同时连接，不修改 Node 注册鉴权、Detector、通道或数据库协议。用户仍修改 `server_url` 并重启 Agent。

## 修改计划

1. 在同一 `state_file` 内按规范化服务器 URL 保存独立的设备身份和令牌，使用版本 2 格式。协议、主机、端口、路径决定服务器键；规范化主机大小写、默认端口及末尾斜杠，不自动合并 IP 和域名或 HTTP/HTTPS。
2. 注册前只读取当前服务器条目。未知服务器先生成随机令牌并持久化，再提交首次注册；Node 现有协议会保留此令牌。如果首次响应丢失，重试或重启仍使用同一个令牌。A → B → A、进程重启及断线重连均复用对应条目，其他服务器状态保持不变。
3. 兼容无服务器信息的旧两字段文件：以旧令牌向当前服务器尝试注册，成功后将其关联到当前 URL，并备份原始文件为 `.legacy.bak`。失败时不迁移、不删除。旧文件无法证明令牌原属哪个环境，首次升级应选择能验证旧令牌的服务器。
4. 未知服务器的候选凭据在请求前落盘；只有取得有效注册响应、且返回状态成功落盘后才激活内存身份。服务器列表包含候选及已注册的凭据，不代表在线或注册已成功。状态采用同目录临时文件、Sync、关闭后替换，文件权限为 0600。状态损坏、读写失败要明确报错，不能当成首次注册。
5. 401 明确提示当前服务器认证不匹配，保留全部令牌；下载后重新注册也使用当前服务器保存的凭据，不清空令牌。已经丢失、被服务端撤销的令牌仍需通过原备份或受控重新配对恢复，不能绕过服务端校验。
6. 测试 HTTP 注册、A/B 往返、进程重启、旧文件迁移、注册拒绝、无效响应、损坏文件、URL 规范化和下载认证恢复，执行 Go 回归及 ARM64 构建。

## 升级与使用

升级前停止 `agent_watchdog`，备份 Agent 二进制、配置、原状态文件和 `agent.db`。替换 ARM64 二进制，保留原 `state_file` 配置。启动时确认使用正确的 `server_url`；如果当前令牌已与测试数据库不匹配，先恢复备份或完成一次定向重新配对。成功后无需维护两份状态文件；以后修改 `server_url` 并重启即可。

新状态结构示例（均为示例凭据，不能直接用于配对）：

```json
{
  "version": 2,
  "servers": {
    "https://test.example.com": { "device_id": "example-device", "token": "example-test-token" },
    "http://192.0.2.10:4700": { "device_id": "example-device", "token": "example-dev-token" }
  }
}
```

不要将状态文件加入 SVN 或粘贴到日志。`.legacy.bak` 含原凭据，应与正式状态文件一样保护。旧 Agent 不支持版本 2 文件；回退旧二进制时须同时恢复对应服务器的旧格式状态备份。启动多个 Agent 进程共用一个状态文件不在本次支持范围内。

### 板端部署顺序

1. 先确认测试服务器已与当前旧状态配对；若仍提示 `invalid existing device token`，使用原备份或对指定设备完成一次受控重新配对，不清空数据库。
2. `sudo systemctl stop agent_watchdog`，备份 `/home/kickpi/testAgent/agent-linux-arm64`、`agent-state.json`、配置和实际 `agent.db`。备份包含凭据，不交给源码管理。
3. 将本次构建的 `bin/server-state-20261012/agent-linux-arm64` 上传为 `/home/kickpi/testAgent/agent-linux-arm64.new`。核对 SHA-256、设置执行权限，再替换停止状态的旧二进制。
4. 检查实际 `ExecStart` 的 `-config` 文件，保持原 `state_file`，确认 `server_url=https://dvcpltapitest.anxinyun.cn`。
5. `sudo systemctl start agent_watchdog`，查看 `journalctl -u agent_watchdog -n 80 -f`。成功时记录 `device registration succeeded: server=... saved_servers=...` 和 `control connection established`，不打印令牌。
6. 开发服务器未登记此设备时，切换其 URL 并重启即可首次注册；如果已经登记但本地缺失该服务器令牌，先恢复凭据或完成一次配对。之后切回测试 URL、重启，验证设备自动在线；断线重连无需人工修改文件。

本次只需替换板端 Agent；不要求更新 Node、React 或执行数据库迁移脚本。

## 验证与交付

2026-10-12 使用本机 Go 1.27.0：`go test -json ./...` 通过 104 项测试，Unix 文件权限检查在 Windows 跳过 1 项；`go vet ./...` 通过。Linux AMD64 测试二进制在本地 Docker 中执行 12 项认证状态场景，包括 0600 权限、HTTP 首次响应丢失、两个平台往返切换以及实际 WebSocket 断线重连，全部通过。Node 现有首次注册保留提交令牌、重复注册复用令牌、错误令牌拒绝测试通过。测试使用本地模拟平台，不连接真实测试数据库或 RK3576。

Windows AMD64 与 Linux ARM64 二进制已构建至 `bin/server-state-20261012`（CGO_ENABLED=0，Agent 版本 0.4.1）：

| 文件 | SHA-256 |
| --- | --- |
| agent-linux-arm64 | `349F5D329074F23AC13E0E4799A2D0372BD36912A7FD92179CD89ED4A559FD50` |
| agent.exe | `417BD7DE00CDB99DD1498B294B64B2C5E4822F00BD76B57ACB2185D912E7625B` |

二进制与校验文件用于板端交付，不纳入源码提交。本轮未部署板端、修改测试数据库或提交 SVN。

SVN 本次内容：`cmd/agent/main.go`、新增 `cmd/agent/server_state.go`、新增 `cmd/agent/server_state_test.go`、README 本次新增章节、`doc/构建.md`、新增本文档。保留工作副本里其他已有改动，新增文件提交前需 Add。

提交文字：`fix: Agent 按服务器持久化设备认证状态，支持开发测试环境往返切换及断线重连；首次注册预存令牌防止响应丢失，兼容旧状态并备份，增加原子保存和恢复回归。`
