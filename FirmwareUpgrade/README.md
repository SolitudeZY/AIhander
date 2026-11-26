# FirmwareUpgrade Agent

设备侧 Go Agent 管理升级文件、Detector 通道、运行状态、告警及远程终端。正式链路为 **React → Device-Management Node API → Agent → Detector**；Agent 主动连接 Node API。V1 本地测试用的独立 Go Cloud 已删除，不再构建或部署。

迁移计划见 [Node-Agent迁移计划](../Device-Management/doc/Node-Agent迁移计划.md)，本仓库删除范围与协议兼容说明见 [Go Cloud 退役说明](doc/Go-Cloud退役说明.md)。新版接口集合为 [apifox-openapi.json](apifox-openapi.json)；其他旧 Cloud 接口文档仅用于历史参考。

## 设备配置

复制 `configs/agent.example.json`，将 `server_url` 设置为设备可访问的 **Node API 服务根地址**，例如：

```json
{
  "server_url": "http://10.8.30.64:4700",
  "device_name": "kickpi",
  "state_file": "/home/kickpi/testAgent/agent-state.json",
  "database_file": "/home/kickpi/testAgent/db/agent.db",
  "allowed_target_dir": "/home/kickpi/testAgent/received-firmware",
  "sku": "RK3576",
  "runtime_version": "2.0",
  "model_version": "2.0",
  "address": "10.8.30.54",
  "allow_remote_reboot": false
}
```

Node 端口按实际环境填写。`server_url` 不含 `/api/v1`；Agent 自动拼接 `/api/v1/agents/register`、`/api/v1/agents/connect`。新版模型文件上传七牛，Agent 使用 Node 下发的签名地址直接下载，支持 HTTP Range 和 SHA-256 校验。七牛下载不发送设备 token，也无需板子配置 AK/SK。旧本地文件仍支持 `/api/v1/agents/files/{id}`。跨机器访问不能填写 `127.0.0.1`。下载目标必须位于 `allowed_target_dir`，相对路径取决于服务的工作目录。Node 的七牛配置和本地启动步骤见 [七牛与本地调试](../Device-Management/doc/Node-Agent七牛与本地调试.md)。

测试配置为 `configs/agent.kickpi-test.json`：`server_url=https://dvcpltapitest.anxinyun.cn`（设备 Node API 域名），不加 `/_api`、`/api/v1` 或末尾斜杠，HTTPS 默认使用 443。2026-10-12 从开发电脑向两个域名发送空无效注册请求：网页域名 `dvcplttest.anxinyun.cn` 返回 405 Method Not Allowed（仅允许 GET/HEAD）；设备 API 域名 `dvcpltapitest.anxinyun.cn` 返回 400 JSON 参数校验错误（device_id 为空），证明 POST 进入了注册处理器。空请求不能注册设备；该检查不证明板端 DNS/TLS、真实注册或带设备凭据的 WebSocket 已成功。设备 API 仍须支持 `/api/v1/agents/*` 原路径及 WSS/Range；不要仅凭网页可打开判断 Agent 入口。网站 `/api/root` 返回的是另一套 POMS 配置，不用于选择设备 Agent 后台。

保持已有 `agent-state.json` 和设备本地 `agent.db`。Node 首次迁入注册保留设备原 token；V1 文件、告警和任务不会自动导入，测试文件需重新上传，保留历史数据需专项迁移。

### 开发与测试服务器往返切换（Agent 0.4.1）

Agent 在同一个 `state_file` 中按服务器 URL 分别保存认证状态。成功连接 A、B 后再切回 A，会自动复用 A 的令牌；普通断线直接复用当前服务器的令牌重连。仍然一次连接一个 Node API，修改 `server_url` 后重启 `agent_watchdog`，无需手动切换状态文件。

旧两字段状态文件在向当前服务器注册成功后自动迁移为 `version: 2`、`servers` 格式，原内容备份为 `<state_file>.legacy.bak`。未知服务器先生成随机令牌并保存，再提交注册，利用 Node 首次注册保留所提交令牌的协议，保证首次注册响应丢失后仍可重试；候选凭据落盘不代表已成功注册或在线。已登记但凭据不匹配的服务器仍会拒绝，不能自动覆盖平台认证信息。当前已丢失的旧令牌需先恢复备份或完成一次重新配对，新代码不能推算它。协议、非默认端口及路径不同视为不同服务器，域名和 IP 不自动合并；主机大小写、默认端口和末尾斜杠会规范化。

状态损坏、已保存令牌被服务器拒绝、无效注册响应或保存失败时保留已有凭据并报错。正式状态及旧备份含凭据，不应加入 SVN；回退旧二进制需同步恢复该服务器的旧格式状态备份。具体方案、测试和部署步骤见 [Agent 多服务器认证状态](doc/Agent多服务器认证状态.md)。

### 修改 server_url 后仍连接旧地址

Agent 只在进程启动时读取配置，不会随文件编辑自动更新。仓库的 `script/agent_watchdog.service` 使用绝对路径启动二进制，显式读取 `/home/kickpi/testAgent/configs/agent.example.json`；板端实际服务可能有覆盖配置，先查看：

```sh
systemctl show agent_watchdog -p ExecStart -p MainPID -p FragmentPath -p WorkingDirectory
pgrep -af 'agent-linux-arm64'
grep -n '"server_url"' /home/kickpi/testAgent/configs/agent.example.json
```

应修改实际 `ExecStart` 的 `-config` 指向文件。本机 Node 联调地址为 `http://10.8.30.29:4700`。修改配置后执行：

```sh
sudo systemctl restart agent_watchdog
journalctl -u agent_watchdog --since '2 minutes ago' -n 80 --no-pager
curl --connect-timeout 5 http://10.8.30.29:4700/healthz
```

`pkill -TERM -u kickpi -f '^\./agent-linux-arm64$'` 只匹配无参数的相对路径命令，不匹配服务的绝对路径和 `-config` 参数。服务配置 `Restart=always`，被杀死也会重新启动；它不会刷新尚在运行的进程配置。仅修改 JSON 不需要 `daemon-reload`，修改 systemd 服务内容才需要。保留设备状态文件和数据库，它们不负责选择服务器地址。

## 设备温度与运行指标

Agent 在每次心跳读取 `/sys/class/thermal/thermal_zone*/temp`（Linux 的毫摄氏度），换算为摄氏度，取有效传感器中的最高值，通过可选 `temperature_celsius` 字段上报 Node。读不到、无权限或读数无效时省略温度，CPU/内存/磁盘心跳继续正常发送；Windows Agent 不采集此值。Node 将不可用温度置空，避免保留旧读数。React 的使用率、已用/总容量及温度统一保留两位小数。

RK3576 可先在板端确认温度接口及权限：

```sh
for zone in /sys/class/thermal/thermal_zone*; do
  [ -r "$zone/temp" ] || continue
  echo "$zone"
  cat "$zone/type" "$zone/temp"
done
```

例如 `53234` 表示 `53.234℃`，页面显示 `53.23℃`。该指标是设备暴露的最热传感器，不保证一定对应 CPU；不默认新增温度告警阈值。配置文件无需增加参数；更新 Node 并重启 API，再替换新版 Linux ARM64 Agent 并重启 `agent_watchdog`，收到下一次心跳后刷新设备详情。保留原配置、状态和设备数据库。默认心跳间隔为 60 秒。

本次含温度采集的 ARM64 构建为 `bin/node-agent-migration/agent-linux-arm64`，SHA-256：`87C9D79C11AB6F3187A832B7B9A50190CB11357E7B094B60D07E472BC46E5325`。该二进制作为测试交付文件，不纳入 SVN 源码提交。

## 构建与启动

Go 版本以 `go.mod` 为准。完整构建说明见 [构建.md](doc/构建.md)。

```powershell
go test ./...
go vet ./...
& '.\doc\构建.bat' agent
go run -buildvcs=false ./cmd/agent -config ./configs/agent.example.json
```

默认批处理输出 `bin/test/agent.exe`（Windows AMD64）和 `bin/test/agent-linux-arm64`（RK3576 等 Linux ARM64）。Node 后端使用已有 API 的启动与部署方式，无 Go Cloud 二进制。

## 本地调试

独立 setUp 保留，默认连接 Agent 本机 `127.0.0.1:8085`。它用于现场调试，不承担平台后端职责。

```powershell
go run -buildvcs=false ./cmd/setup -listen 127.0.0.1:8086 -agent-url ws://127.0.0.1:8085/api/v1/setup/connect -data-dir ./setup-data
```

Detector Demo 和 Python Detector 保留。Python 合同测试：

```powershell
python -m unittest discover -s test -p 'test_*.py' -v
```

设备协议的管理来源仍为 `_from=cloud`，用于兼容现有 Agent 的权限、控制仲裁、告警确认和断线补报；该字段代表 Node 远程管理端。管理平台继续使用原有账号、项目权限与操作审计，不增加独立 Cloud 登录。

`bin/` 中已有构建产物及修复工具仅作本地历史归档，不属于新版部署；`doc/legacy-cloud-tests` 保存删除 Cloud 时未提交的测试原文，不参与 Go 测试。
