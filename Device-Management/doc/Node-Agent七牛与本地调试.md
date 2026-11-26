# Node-Agent 七牛存储与本地调试

## 修改计划（2026-10-10）

1. 复用平台已有七牛域名、Bucket、AK/SK 参数，新增模型文件存储适配器。默认服务启动使用七牛，显式 local 模式仅供离线调试。
2. 上传先在 Node 临时文件中限流计量、计算 SHA-256，再上传七牛；七牛成功后才保存文件元数据并响应成功。成功后删除临时文件，失败返回真实错误并清理残留。
3. 下发与设备重连补发时读取持久化对象 key，生成新的七牛私有下载签名。数据库不保存易过期的签名 URL；保留旧本地文件的授权 Range 下载。
4. Agent 下载外部对象地址时不携带平台设备 token；外部 401 不触发重新注册，保留断点续传与 SHA-256 校验。
5. 增加显式 development 本地调试入口，保留 PostgreSQL、Redis、现有登录与设备接口，跳过 Camunda、ClickHouse 等无关服务。完整平台启动参数照旧。
6. 覆盖七牛成功、失败、清理、重连签名刷新和设备下载鉴权边界；提供不含密钥的启动示例。真实七牛和测试数据库联调由测试环境验证。

## 链路

React → Node 上传接口 → 七牛 Bucket；Node → Agent 下发签名下载地址；Agent → 七牛下载 → SHA-256 校验 → 安装模型 → 回执 Node。

板子只配置 Node 的 `server_url`，不配置七牛 AK/SK。前端继续使用 `/edgeAgent/files` 和 `fileId`，无需操作七牛凭据。

## 本地启动

推荐只联调 Agent 的开发入口。API 文件夹是 `Device-Management/api`：

当前工作区的本机 `api/agent-local.env` 已按用户要求改用私人 PostgreSQL `127.0.0.1:5432/postgres`；`npm start` 的本地数据库参数及原 VS Code 启动项也已同步。该文件已设为 SVN 忽略，不打印或提交凭据。保留测试七牛与本机 `localhost:6379` Redis 配置。2026-10-10 已只读验证连接成功，用户手动执行的 `edge_agent_record` 表在 `postgres` 库；原 `equipmentManagement` 库本机不存在。

后续状态更新（同日）：用户已新建并初始化本机 `equipmentManagement`，当前私有 env 指向 `127.0.0.1:5432/equipmentManagement`，平台账号和 Agent 基础表已存在；此前 `postgres` 缺表状态是初次诊断记录。按用户授权恢复管理员及所有者关联后，真实登录接口和 Chrome 边缘设备页面已验证通过，密码不记录在文档。启动时以私有文件/终端的实际 `POMS_DB` 为准。

注意：该本地库还缺少本平台 `user`、`organization`、`department` 等账号基础表，已有的 `t_user` 等表属于其他项目，不能直接替代。本次仅修改连接配置，不创建、删除或迁移数据库对象。只有 Agent 增量表不能完成平台注册/登录；历史结构可参考 `script/0.0.1/2.create_table.sql`，但它含删除表语句且依赖已有 `command_histories` 等结构，不能直接当作空库初始化运行。优先导入完整的平台基础结构及初始化数据，前置检查和执行顺序见 `script/2.0.0/README.md`。私有配置变化后需停止 API 并重新运行 `npm run start:agent`；已设置的终端 `POMS_DB` 环境变量会优先于文件，应同时核对。

1. 将 `api/agent-local.env.example` 复制为本机 `api/agent-local.env`，填写测试数据库和你贴的测试七牛 AK/SK。示例中的 `REPLACE_...` 是占位符，不能直接使用。URI 密码含 `@`、`#` 等字符时先 URL 编码。
2. VS Code **打开 api 文件夹**，选择新增的 **Node-Agent 本地七牛调试** 后按 F5。新条目用 envFile 加载本机配置。仓库不保存真实密钥；原有完整平台启动条目保留。
3. PowerShell 使用专用入口启动，会读取 `agent-local.env`。命令行中已有的环境变量优先：

```powershell
cd E:\Python_Prj\landSlide\ZY\rk3576_deploy\AIhander\Device-Management\api
npm run start:agent
```

变量取值说明：

| 参数 | 本地配置 |
| --- | --- |
| `POMS_DB` | 可连接且已执行迁移 SQL 的**测试库**连接串；你贴的原始配置所有 `-g` 都被注释，必须补上 |
| `IOTA_REDIS_SERVER_HOST` / `PORT` | 当前使用本机默认 `localhost:6379`；如 Redis 实际使用其他端口，在本机 env 文件中修改 |
| `EDGE_AGENT_PUBLIC_URL` | 板子可访问的电脑地址，例如 `http://10.8.30.29:4700`；电脑 IP 变化则同步修改 |
| `EDGE_AGENT_FILE_STORAGE` | `qiniu`；离线调试才设 `local` |
| `ANXINCLOUD_QINIU_DOMAIN_QNDMN_RESOURCE` | 七牛绑定的**下载域名**，你给的测试值 `http://test.resources.anxinyun.cn`；不是控制台/API 地址 |
| `ANXINCLOUD_QINIU_BUCKET_RESOURCE` | 你给的测试空间 `anxinyun-test` |
| `ANXINCLOUD_QINIU_ACCESSKEY` / `SECRETKEY` | 对应测试空间的 AK/SK，只填 Node 本机私有配置 |
| `EDGE_AGENT_QINIU_DOWNLOAD_TTL_SECONDS` | 默认 7200 秒，签名新生成后可在两小时内发起下载/续传；最小 1800、最大 604800 |

板子保持 `address=10.8.30.54`，将 `server_url` 设为 `http://10.8.30.29:4700`，使用本次新编译的 ARM64 Agent，并保留状态文件和本地数据库。Node 管注册/任务，板子可访问七牛下载域名才能下载模型。该域名是否支持 HTTPS 需实际确认，示例沿用你给的 HTTP 地址。

React 仍在 `web` 中运行（5700）：

```powershell
$env:API_URL = 'http://localhost:4700'
$env:API_POMS_URL = 'http://localhost:4700'
npm start
```

## 完整平台参数如何修正

固件库启动查询已改为先请求 `/firmware/capabilities`，判断 `craw` 与 ClickHouse IoT 客户端是否初始化；该入口使用平台账号鉴权，不访问上游，不暴露连接地址或凭据。没有固件服务时不请求列表/字典，页面显示统一提示；仅固件服务可用时可浏览，型号相关操作等待 ClickHouse。上传弹窗打开时才查询 `/deviceType`，该接口缺配置时返回明确 503，避免 `undefined.iot`；字典不随列表翻页重复加载。Agent 精简入口不因此启用 ClickHouse，完整旧固件功能仍需完整平台配置。

升级任务模型筛选不再发送 `pageSize=200`，改为单页 100 按总数继续分页，保留完整下拉选项和接口上限。83 项 API、19 项 Web 回归与真实 Chrome 交互通过，覆盖第 205 个模型和三种服务配置/检查失败路径；浏览器上游数据使用替身，未验证真实旧固件/ClickHouse。需要重启 API 加载新状态路由，再刷新已重编译的 Web。

普通设备的 `/firmware` 查询仍依赖独立旧固件服务 `API_CRAW_URL`，与 RK3576 的 `/edgeAgent/models` 分开；不是 Go Cloud 迁移接口。精简 `start:agent` 现在可选保留显式配置的 `craw` 客户端，没有配置时固件列表/字典返回明确 503。需要旧固件联调时在本机私有 env 指定实际服务 API 根地址并重启，不能把它设为 Node Agent 的 4700 地址；只测试 RK3576 无需配置。Web 的 `--crawapi` 与 API 的 `API_CRAW_URL` 是两个进程的配置。旧结果映射和上游 token 使用保持。

板端 `server_url` 修改需要重启实际 Agent 服务：`script/agent_watchdog.service` 的 `ExecStart` 显式读取 `/home/kickpi/testAgent/configs/agent.example.json`。只匹配 `^\./agent-linux-arm64$` 的 pkill 不匹配服务绝对路径和配置参数；服务还会自动重启。先查看 `systemctl show agent_watchdog -p ExecStart -p MainPID`，确认文件后 `sudo systemctl restart agent_watchdog`，从本次启动的新日志核对目标。设备配置与状态文件分开，状态文件不选择服务器地址。详见 FirmwareUpgrade README；未远程登录或重启板端。

你贴的 Camunda `-c https://camundatest.anxinyun.cn`、`-r <CAMUNDA_PASSWORD>` 能满足启动校验，但 `npm start` 不读取 VS Code launch.json，因此之前仍报缺少参数。完整平台应将这些参数放入启动命令或用 `CAMUNDA_HOST`、`CAMUNDA_ROOT` 等环境变量配置。

原 VS Code `args` 推荐每个参数名和值分开：`["-p", "4700", "-g", "数据库连接串", "-c", "https://camundatest.anxinyun.cn", "-r", "<CAMUNDA_PASSWORD>"]`。完整平台仍需七牛、地图、ClickHouse、外部 API 等原有参数；仅测试模型/设备时使用上面的调试入口即可。你给的 ClickHouse 等包含商用服务配置，不应直接作为本地测试库目标。

模型上传由独立 `/edgeAgent/files` 处理，512 MiB 限制与平台附件 `--types` 独立，因此原 `--types .bin,.diff` 不会拦截 `.rknn/.onnx`。无需把平台附件类型参数改成模型格式。

## 存储与部署边界

- 默认 Node 启动使用七牛。成功响应意味着七牛上传成功且 PostgreSQL 文件元数据已保存，不会静默回退本地。
- 本地暂存仅在上传过程中存在；七牛保存对象，数据库保存 key/空间、大小和 SHA-256。告警图片仍沿用 Node 原有存储，本次调整针对模型/投递文件。
- 支持私有空间签名地址；签名可访问公共空间，但是否必须签名由 Bucket 访问控制决定。Node 重连补发/手动重新下发时会生成新签名。签名过期导致下载失败时，修复网络后重新下发；无需修改设备 token。
- 老的 Node 本地文件记录继续从 Node 授权下载；七牛记录的兼容下载入口先检查设备与任务归属，再 307 跳转七牛。新的任务直接给七牛地址。
- 需要 `npm install` 更新显式七牛依赖，执行原迁移 SQL，并部署 Node 和新版 Agent。无需新增 SQL 列，七牛元数据存于既有 JSONB 文件记录。
- 测试站点的设备原生路径与 WebSocket Ingress 仍需按迁移计划部署；七牛替代模型字节下载，不替代 Node 注册、任务回执或终端服务。

## 完成与验证

### 重启操作 ID 协议修复（2026-10-10）

`invalid_request` 的根因是 Node 新建操作使用 `crypto.randomUUID()` 的 36 位带连字符格式，Agent `respondDeviceReboot` 在执行任何系统调用前只接受 32 位操作 ID。最小修复只调整 Node 重启操作的生成：去掉 UUID 连字符，存储、下发、回执、查询使用相同的 32 位 ID；其他 UUID、前端幂等键及旧失败记录保持兼容，无新增 SQL 或 Agent 修改。

操作：停止旧 API 并重新运行 `npm run start:agent`；关闭重启弹窗再重新打开、确认，发起新的操作。原 `invalid_request` 记录保持失败且可查，原幂等键不会自动再次发送请求。实际设备需 `allow_remote_reboot=true` 且运行用户拥有系统重启权限，这些条件不属于本次 `invalid_request` 根因。

回归测试在修复前复现 Node → WebSocket → 真实 Go Agent 的 `invalid_request`，修复后返回预期 `disabled`，证明已通过参数校验。测试固定禁止远程重启，没有执行真实系统重启；另外验证新操作的 32 位格式、允许重启回执、幂等重放、旧 UUID 失败记录查询和新请求隔离。

最新 API 串行全量回归 85/85 通过，测试无跳过；真实设备重启及重启后的 boot_id 恢复确认尚待用户板端验证。SVN 提交文字与清单已同步，未提交。

### 最新运行指标修复与交付（2026-10-10）

设备详情的 CPU/内存/磁盘使用率、容量及温度统一显示两位小数。新增可选心跳字段 `temperature_celsius`：Linux Agent 读取各 thermal zone 的毫摄氏度，取最高有效值后上报；Node 将结果存入既有设备 JSONB，缺失/无效时清空旧读数，React 显示“—”。无需新增 SQL 或设备配置。更新 Node 并重启 API、替换新版 Agent 并重启看门狗，收到新心跳后刷新页面。板端权限/传感器核查说明见 FirmwareUpgrade README。

最新验证：API 串行 84 项、Web 19 项测试通过，Go `test ./...`、`vet ./...` 通过，Windows AMD64/Linux ARM64 编译通过。首轮并行 API 检查有一个终端关闭/回复时序失败，串行复核通过，没有修改终端实现。Chrome 验证长浮点输入显示为两位小数、容量精度、正常温度/零温/缺温三种状态，无页面脚本异常；心跳处理器为真实实现，持久化为替身，没有部署到板端或读取真实温度。

当前含温度采集的 ARM64 文件为 `FirmwareUpgrade/bin/node-agent-migration/agent-linux-arm64`，SHA-256：`87C9D79C11AB6F3187A832B7B9A50190CB11357E7B094B60D07E472BC46E5325`。以下旧验证记录及校验值仅描述对应阶段，交付以本段为准。SVN 清单与可复制提交文字见 `Node-Agent-SVN提交说明.md`；参数模板等旧业务缺表问题按用户要求停止排查，本次未补建这些表。

### 模型上传卡在 100% 的修复（2026-10-10）

排查计划：先核对文件元数据与七牛对象，再复现 multipart 请求收尾，修复后端解析生命周期，补充页面上传/存储/成功状态，最后做请求、浏览器及真实存储验证。以上已完成。

根因是旧 `async-busboy@1.1.0` 将现代 Node 正常的请求 `close` 当作清理时机，提前移除 `finish` 监听。当请求体已接收而文件流尚未读完时，七牛上传与数据库保存仍可完成，但解析 Promise 不再结束，导致 HTTP 响应和页面一直等待。真实 HTTP 回归测试在修复前超时，修复后返回 201。

新增 `agentMultipartUpload.js` 直接管理当前锁定的 `busboy@0.3.1`，仅用解析 `finish` 完成请求，正常 `close` 不清理；中断、解析错误、存储提前失败会结束请求并清理文件。保留单文件限制、512 MiB 限制、SHA-256 和重复文件补偿删除；新依赖已显式声明，未修改 node_modules。React 在传输进度满后显示七牛存储等待，成功后允许保存模型版本；重传时清空旧文件 ID，失败可重试。

最新验证：78 项 API、14 项 Web 测试通过；真实 Chrome 页面验证等待提示、成功、503 失败重试及按钮状态，七牛网络使用替身。另用修复后控制器、真实本机 `equipmentManagement` 与七牛完成 8000 字节 HTTP 上传，确认 201、真实对象及元数据、临时文件清理，随后删除本次验证对象和记录。用户原模型对象只读核查成功，大小 9930766 字节。没有重启用户运行中的旧 API：需停止后重新 `npm run start:agent` 加载修复；Web 自动重编译后刷新即可。以下原迁移验证结果保留为历史记录。

以上计划已落实。Node 24 运行旧 `koa-66` 时缺失 `util.isRegExp/isArray`，已添加仅在缺失时启用的兼容处理；本地模式跳过依赖 ClickHouse 的工具初始化和旧告警广播定时器。启动缺少参数时现在返回非零退出码。

- 65 项 Node 测试通过，包括真实框架启动（数据库、Redis、日志使用替身）、平台登录路由/未登录拦截、七牛上传/失败清理/新签名/授权跳转，和真实 Go Agent 与 Node 的注册、心跳、Range/SHA-256 下载。
- Go `test ./...`、`vet ./...` 通过，新增外部地址无设备 token、重定向剥离 token、外部401不注册、签名日志脱敏的测试。
- OpenAPI 引用校验通过，更新七牛元数据、上传成功定义和307跳转说明。
- 已重新生成 Windows AMD64 与 Linux ARM64 Agent；ARM64 `bin/node-agent-migration/agent-linux-arm64` 的 SHA-256 为 `A37BB0531ADB7922A9D08CDB1B1AB4FEDEA949301874609D521A241C46390304`。

七牛 SDK 签名使用真实库，网络操作采用替身；未向真实七牛上传测试对象，未连接真实 PostgreSQL/Redis，未在 RK3576 部署。完整平台的其他服务、真实账号登录和浏览器页面需要环境联调。源代码和示例已登记 SVN 添加，未执行 SVN 提交。
