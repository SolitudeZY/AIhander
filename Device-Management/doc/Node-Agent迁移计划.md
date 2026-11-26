# Node 直接对接 Agent：迁移计划与接口约定

日期：2026-10-10。范围：Device-Management、FirmwareUpgrade；不修改 DeepAgent。

后续文件存储要求已调整为七牛：Node 接收 React 上传、保存七牛对象及 PostgreSQL 元数据；Agent 从七牛签名地址直接下载。实现计划、本地启动及配置见 [Node-Agent七牛与本地调试.md](Node-Agent七牛与本地调试.md)。原 Node 本地文件下载保留兼容。

## 已确认的目标

删除 V1 本地测试用 Go Cloud。生产链路为 React → 现有 Node API → Agent → Detector。Agent 主动连接 Node，浏览器不需要访问设备内网地址。账号、项目、模型元数据以及文件、下发任务、告警、异常、远程会话均由现有 Node 平台管理。沿用平台用户权限；设备 token 与用户登录分开。

## 修改前的代码情况

- Node `agentGateway.js` 和 `terminalGateway.js` 目前连接 Go Cloud；`edge-cloud.js` 控制器大量转发 Cloud HTTP 请求。
- Agent 将 `server_url` 与 `/api/v1/agents/register`、`/api/v1/agents/connect` 拼接；文件下载使用设备 Bearer token，支持 Range。
- Agent 协议为 `{_from,cmd,time,values}`；请求相关编号为 `values.requestId`。`cloud` 是既有远程管理协议角色，保留该角色字符串并不代表保留 Go 服务。
- 项目/模型/远程会话已在 PostgreSQL；设备、文件、任务、告警与异常数据目前在 Go Cloud SQLite。
- React 部分上传直接走 `/_edge-cloud`；设备详情存在合并标记。现有用户改动必须保留并合并。

## 执行顺序

1. 增加 Node PostgreSQL 持久化模型及幂等 SQL 脚本，存储设备注册及 token hash、文件元数据、任务状态、告警、异常生命周期、设备操作。文件与证据在配置的数据目录保存。
2. Agent Gateway 改为终止 Agent WebSocket，由 Node 自身维护会话、请求超时和通知；断线重连发送持久化未完成任务，旧连接退出不得移除新连接。
3. 用直接业务控制器替换 HTTP 转发，公开管理路由统一为 `/edgeAgent`；旧 `/edgeCloud` 不保留代理或别名。Agent 原生入口 `/api/v1/agents/*` 由 Node 实现，避免强制升级设备协议。
4. Terminal Gateway 经同一 Agent 会话发送 `terminal.*`，保留平台用户身份、时长、录制和命令结果。终端字节采用既有 Base64 协议。
5. React 同步更换管理 URL、文件上传入口；保留平台登录与项目关联。既有模型/任务数据库列名可通过映射保留，API 新字段使用 fileId/deploymentId。
6. 删除 `FirmwareUpgrade/cmd/cloud` 及独立 Cloud 构建/测试入口；未纳入 SVN 的旧测试保留在非运行归档目录。同步配置、构建说明、接口文档与测试。
7. 验证真实 HTTP/WebSocket 注册、设备查询、文件上传/Range 下载、任务补发/回执、通道管理、告警去重/确认、异常恢复、终端及重启幂等。检查 Go 测试和前端语法。

## 关键约束

- `server_url` 是 Node 的 origin，例如 `http://10.8.30.64:4700`，不得再指向已退役 Go Cloud 的 8080，也不得包含重复 `/api/v1`。
- 用户接口：`/edgeAgent/{devices,models,files,deployments,events,...}`；代码核对发现框架不添加前缀。设备原生入口保留 POST `/api/v1/agents/register`、WS `/api/v1/agents/connect`、GET `/api/v1/agents/files/:id`。浏览器上传走现有 `/_api/edgeAgent/files` 代理。
- 上传字段为 `file`；文件先保存到 Node，再产生可下发的文件 ID。只有数据库和证据落盘成功才确认告警，设备断网保留补报能力。
- 远程命令根据 Agent 确认结果更新业务状态；断线、超时返回真实错误，禁止返回假成功。重启只有新 boot_id 才判为完成。
- 新建重启操作 `operation_id` 使用 32 位无连字符十六进制值，匹配既有 Agent 的长度校验；存储与下发 ID 一致，其他业务 UUID 与前端幂等键不变，旧失败记录可查询且不会自动重试。此契约已用真实 Go Agent 的禁止重启分支验证，不执行真实重启。
- 单 Node 实例维护 Agent 会话；多副本部署必须为设备与管理 API 保持同实例路由，不能把不同实例的本地 Map 当共享在线状态。
- 旧 Cloud SQLite/文件不会自动出现于新库；生产切换前另行导入或明确不保留 V1 测试数据。不得自动删除原有设备状态文件或线上数据库。
- 不自动部署、修改线上数据或提交 SVN。最终交付代码、SQL、接口文档、验证结果及人工切换步骤。

## 验收与实施结果

上述 1–7 步已在工作副本实施，未部署、未提交 SVN。旧 Go Cloud 和 Node 转发控制器/路由均已登记为 SVN 删除；已有未提交测试原文保存在两仓库的 `doc/legacy-cloud-tests`，不参与新版测试。

### 最终代码归属

| 功能 | Node 实现 | 管理入口 |
| --- | --- | --- |
| 注册、设备 token、心跳、在线会话 | `agentPlatform.js`、`agentGateway.js` | `/edgeAgent/devices`，原生 `/api/v1/agents/*` |
| 文件保存、SHA-256、授权断点下载 | `agentPlatform.js`、`edge-agent.js`、`agentDownloads.js` | `/edgeAgent/files`；设备下载 `/api/v1/agents/files/:id` |
| 项目绑定、视觉模型、升级任务和补发 | `edge-agent.js`、现有业务表、`EdgeAgentRecord` | `/edgeAgent/models`、`/edgeAgent/deployments`、设备 `project/files` |
| 通道配置、版本冲突、摄像头只读探测 | 共享 AgentHub 请求关联，Agent/Detector 执行 | 设备 `video-channels` |
| 告警落盘确认、证据、统计、异常/恢复 | `agentPlatform.js` 持久化，`edge-agent.js` 查询 | `/edgeAgent/events`、`/edgeAgent/events/statistics` |
| 终端、录制、操作人和命令结果 | `terminalGateway.js` 复用 AgentHub | WS `/terminal/connect`；`remote-sessions` 查询 |
| 重启幂等、设备回执、新 boot_id 确认 | PostgreSQL 唯一约束及 Agent 回执 | 设备 `reboot/operations` |

`FirmwareUpgrade/apifox-openapi.json` 已替换为 Node 入口，27 个路径覆盖 32 个 HTTP 操作及两个 WebSocket。旧 Cloud HTTP 集合不能继续使用；设备协议 schema 继续保留 `_from=cloud`。保留 `cloud_file_id`、`cloud_deployment_id`、`cloud_session_id` 及 `sourceSystem=edge_cloud` 是已有数据列/来源兼容，不产生旧服务请求。

下载控制器自行处理 Range；`agentDownloads.js` 在框架创建 HTTP callback **之前**排除原生下载的全局 `koa-range`，防止二次截取流。摄像头测试读取 Go 的 `success` 字段，保存通道测试复用凭据和 transport；连接测试失败属于正常探测结果，探测程序缺失、协议失败和超时返回对应错误。

### 实际验证

- `node --test api/test/*.test.js`：57 项通过、0 跳过。覆盖真实 HTTP 上传/鉴权/Range、注册 token 兼容、告警持久化后确认、异常恢复、任务状态筛选、重启幂等、WS 关联/断线/存活探测、终端 token 到期、终端记录及数据库写入失败。
- 其中 `node-agent-smoke.test.js` 启动真实 Windows Go Agent：向 Node 注册、WS 心跳、已保存 `.part` 文件触发 `bytes=123-` 下载，SHA-256 和最终内容一致，任务到达 `succeeded/100`。使用真实 `koa-range` 及新版下载适配。
- `node --test web/test/*.test.cjs`：7 项通过；边缘设备模块 22 个 JS/JSX 文件语法通过。
- FirmwareUpgrade `go test ./...`、`go vet ./...` 通过；Windows AMD64 和 Linux ARM64 Agent 构建完成，产物在忽略目录 `bin/node-agent-migration`。
- OpenAPI JSON 可解析，全部引用可解析，32 个 HTTP 操作与新版路由对应。Sequelize 4.44.4 的 JSONB 路径、状态、置信度和异常/恢复时间筛选 SQL 生成检查通过，未实际连接数据库。

持久化回归和 Go 联调采用**内存数据库替身**。尚未验证真实 PostgreSQL 的 SQL 执行、完整平台启动、浏览器生产构建/交互、RK3576 真机和生产环境，不将这些模拟测试视为线上验收。

## 人工部署与切换步骤

1. 检查 Node 运行版本至少 18（本地验证为 24），沿用现有平台的数据库、Redis、账号和启动参数；Node 不是另起一个独立 Cloud 进程。
2. 确认目标 PostgreSQL 已有管理平台基础表（尤其 `public.project_devices`，注册还需用户、组织、角色等表及初始数据），再依次执行 `script/2.0.0/1.create_edge_cloud_management.sql`、`2.add_remote_session_recording.sql`、`3.node_agent_platform.sql`。这些是增量迁移，不能直接初始化空库。第 1 个脚本沿用历史名称，创建的是平台业务表；新版不连接 Cloud SQLite。前置检查与失败事务处理见该目录 `README.md`。确认后按环境流程执行生产迁移。
3. 为 Node 配置稳定且可写的 `EDGE_AGENT_DATA_DIR`，持久化挂载目录。配置 `EDGE_AGENT_PUBLIC_URL` 为**设备可访问的 Node 根地址**，例如 `http://10.8.30.64:4700`；实际端口以 Node 部署参数为准，不要使用 React 页面的端口。代理必须允许 multipart 上传、单区间 Range 和 WS Upgrade。
4. 发布新版 Node 和 React。React 保留 `/_api` 代理到 Node；Agent 使用 Node 原生端点。删除环境配置中的 `EDGE_CLOUD_URL`、`EDGE_CLOUD_WS_URL`、`EDGE_CLOUD_TERMINAL_URL` 和旧 `/_edge-cloud` 代理。没有独立 Cloud 下载或部署步骤。
5. RK3576 需要 Agent 二进制时使用 `FirmwareUpgrade/bin/node-agent-migration/agent-linux-arm64`；Windows 的 `agent.exe` 只用于本机。设备 `server_url` 改为与第 3 步一致的 Node 根地址，保留已有 `agent-state.json` 及本地数据库，再重启 Agent。Node 首次接受该设备注册时保存其原 token hash；之后必须携带匹配的设备 token。其他设备路径、终端 shell、机型与设备 IP 按本机情况保留。
6. V1 SQLite 的历史任务、告警与上传文件**没有自动导入**。如仅为废弃测试数据，重新上传模型并创建新任务；现有项目绑定和模型业务表保留，但旧 fileId 无对应内容时会明确要求重新上传。若需保留 V1 历史，先设计并验证专项导入，不要删除旧数据目录。连接新版 Node 期间，浏览器应显示真实在线状态。
7. 在测试环境依次验证设备查询、文件上传/下载、模型下发/状态、通道增改查删及凭据保持、摄像头探测、告警图片/异常恢复、终端录制和可选重启；确认后停止旧 Go Cloud。按实际设备风险选择是否开启 `allow_remote_reboot`。

回退应使用已保存的旧版本和数据库/文件备份恢复路由配置；保留 Agent 状态文件。切换阶段先使用单 Node 实例；多实例需完成会话与存储共享或同实例路由设计后再扩容。

## 测试服务器地址（2026-10-10 补充）

测试同事提供服务器内网 `10.8.40.120`、外网 `222.186.227.197`，React 测试站点为 `https://dvcplttest.anxinyun.cn/`。当日只读访问结果：

| 地址 | 实测 |
| --- | --- |
| 站点 `/`、`/healthz`、GET `/api/v1/agents/register` | 200 React HTML，不能视为设备协议成功 |
| 站点 `/_api/healthz` | 200 纯文本 `ok` |
| 站点 `/_api/firmware-upgrade/product-library`、`/_api/deviceType` | 200 JSON，设备后台现有接口 |
| 站点 `/_api/edgeCloud/devices` | 401，旧接口存在且要求平台登录 |
| 站点 `/_api/edgeAgent/healthz` | 404，新版尚未上线 |
| 网站 `/api/root` | 返回 `pomsapitest.anxinyun.cn`，由 Web 的 API_POMS_URL 配置产生 |
| POMS 域名 `/edgeCloud/devices` | 404；固件/设备类型接口与 `/_api` 响应不同 |

代码确认 `/_api` 使用 **API_URL**，`/api/root` 返回 **API_POMS_URL**，两者独立，不能把 POMS 的地址直接当作本次设备 Node 后台。

**推荐入口配置（尚未在集群实施）：**将现有 `dvcplttest` Ingress 的 `/api/v1/agents/*` 和 `/terminal/connect` 直接转发到 Web `/_api` 当前对应的设备 Node API Service，不重写路径，允许 WebSocket Upgrade、长连接和 Range。参考 `node-agent-ingress.example.yaml`，先替换实际 namespace、设备 API Service/port 和现有 TLS secret，再合并现有规则，不要原样应用。保留原有 React 页面和 `/_api/edgeAgent/*` 管理 HTTP 代理。设备直接命中新原生路径，避免 Web `koa-proxy` 不支持 WS 且缓冲下载/再次处理 Range 的问题。

**入口与新版部署完成后**，使用 `FirmwareUpgrade/configs/agent.kickpi-test.json`：`server_url=https://dvcplttest.anxinyun.cn`，Node 设置 `EDGE_AGENT_PUBLIC_URL=https://dvcplttest.anxinyun.cn`。HTTPS 自动转换为 WSS，无需填写 IP 或额外端口。浏览器终端应使用该域名 `/terminal/connect`，修正当前 `/api/root` 的 POMS 地址依赖（前端已改为同源终端地址；本地 HTTP 调试仍使用既有 apiRoot）。服务器两个 IP 只用于底层运维；绕过域名需另行确认真实设备 API 对外端口，不能以 Kubernetes 管理节点 IP 推断。

最后验证 POST `/api/v1/agents/register`、WS `/api/v1/agents/connect` 和 GET `/api/v1/agents/files/:id` 后再让测试设备使用该配置。`address=10.8.30.54` 是板子 IP，保留；本地路径、Detector 地址和 shell 按实际环境检查。
