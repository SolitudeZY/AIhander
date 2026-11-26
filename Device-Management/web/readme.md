创建时间：2021/08/19

## K8s 远程会话入口（2026-10-13）

测试环境网页与设备 API 使用不同域名。当前网页域名的 `/terminal/connect` 返回 React HTML，不能建立终端 WebSocket；HTTP 会话列表成功不代表 WebSocket 路由正确。Web 新增运行时变量 `EDGE_AGENT_API_URL`，专门指定浏览器可访问的设备终端 API 根地址，通过 `/api/root` 的 `edgeAgentApiUrl` 传给前端。不修改 `API_POMS_URL`，也不在终端 URL 中传用户 token；仍在连接后的首条消息使用当前平台登录凭据。

测试同事从提交后的源码构建并部署新版 Web 镜像，在 **Web Deployment**（不是 API Deployment）注入：

```yaml
env:
  - name: EDGE_AGENT_API_URL
    value: "https://dvcpltapitest.anxinyun.cn"
```

更新并等待 Web Pod 滚动发布完成，刷新浏览器。检查网页的 `/api/root` 响应中 `edgeAgentApiUrl` 为上述地址；在 Network 的 WS 分类中，新建远程会话应连接 `wss://dvcpltapitest.anxinyun.cn/terminal/connect?...` 并返回 101。随后需观察设备确认、终端输出及结束会话记录。该配置无需增加 Docker 构建参数，无新增 SQL 或 Agent 升级；HTTPS 页面必须配置 HTTPS 地址，不能填写 Web 网页地址、`/_api` 或 `/api/v1`。本地命令行也支持 `--edgeAgentApiUrl`。

未设置时保留原行为：HTTPS 页面使用同源 `/terminal/connect`（须由 Ingress 直接转发设备 Node）；HTTP 本地开发使用已有 API root。保留同源方案的部署也可只修改 Ingress，参考 `../doc/node-agent-ingress.example.yaml`，替换实际 Service/端口后合并。若握手成功后收到 `DEVICE_OFFLINE`，再核对设备连接与终端请求是否到同一 Node 实例；当前内存连接池不能跨 Pod 共享。

验证：Web 回归 25/25、真实 Node 12.22.12 production 启动及 `/api/root` 检查通过；生产编译成功，保留 3 项既有包体积警告。Chrome 使用生产 React 和模拟 HTTP/WebSocket 验证配置前后地址、首帧鉴权、终端输出和会话按钮通过。测试 API 的无凭据跨域握手返回 101，仅证明入口可升级；集群真实登录、板端终端仍需测试同事验收。详见 `../doc/终端连接诊断-2026-10-13.md`。

## 异常人工确认（2026-10-12）

设备详情“异常记录”页的异常行新增“确认”。点击并确认成功后，该行变为灰色、状态显示“已确认”，刷新页面后仍保留。详情显示确认人和确认时间，筛选支持“已确认”。恢复记录不提供确认按钮，已确认异常不再重复提供按钮。

确认人显示账号和姓名，例如 `SuperAdmin（超级管理员）`。API 根据记录中的 `acknowledged_by` 批量查询用户，返回 `acknowledged_by_username` 和 `acknowledged_by_name`，已有确认记录同样生效；用户被删除时回退为 `用户 ID`，不以当前查看者替换原确认人。无需数据库迁移，需同步更新 API 和 Web；Node 12 生产模式自测前需重新编译前端并重启 API/Web。

确认通过 `POST /edgeAgent/devices/:id/exceptions/:exceptionID/acknowledge` 保存 Node 数据库中的 `acknowledged`、`acknowledged_at`、`acknowledged_by`，并记录操作审计。确认的异常退出设备列表/详情的待处理汇总；物理在线、断流和推理状态继续按真实遥测显示。人工确认不修改恢复结果或结束时间，同一持续故障重复上报保持已确认；恢复后再次发生故障产生新的未确认异常。未确认的其他异常仍使设备提示异常。

使用现有 JSONB 字段，无新增 SQL 或 Agent/Detector 改动。需要同时更新 API/Web 并重启 API、刷新浏览器。保持 Node 12 运行兼容；提交范围和页面验收见 `../doc/Node-Agent发布交接.md`。

## Node 12 运行兼容（2026-10-12，当前配置）

API 和生产 Web 服务已兼容 Node 12。`Cannot find module 'node:util'` 表示实际进程仍在旧 Node 上，不是 Node 22 的缺模块错误；新增源码已改用无 `node:` 前缀的内置模块、Node 12 的流式 pipeline 和已有 uuid 库，并移除 API 的可选链语法。保留已有现代 Node 兼容层及通道、七牛、终端功能。

Jenkins/Docker 的 `NODE_BASE_IMAGE` 当前默认恢复为 `repository.anxinyun.cn/base-images/nodejs12:20.10.12.2`（本机实际拉取为 Node 12.18.3 / npm 6.14.6）。Web 单独使用 `NODE_BUILD_IMAGE=docker.m.daocloud.io/library/node:22-bookworm-slim` 编译 React，最终服务运行在 Node 12；不要把两个参数混用。现有构建依赖中 sass-loader/ahooks/marked 等声明需要较新 Node，未整体降级，因此本地 Web 开发/编译继续使用 Node 22，而本地 API 可使用 Node 12。现有 Jenkins 的同名参数会覆盖默认值，发布时必须核对。

API 锁文件从 v3 改为 v2，保留既有依赖版本，仅将不支持 Node 12 的 tmp 固定为 0.2.1（新增其 rimraf 子依赖）；npm 6 使用 `npm ci --production` 安装运行依赖。ioredis 的既有依赖声明要求 Node >=12.22.0，建议开发电脑使用 Node 12.22.12；原公司 12.18.3 镜像已完成本次兼容验证，但并未覆盖所有老业务或外部服务。

在 API/Web 源码目录用目标 Node 分别运行 `npm run check:runtime`，脚本不访问真实数据库、七牛或板子；API 仅建立本机模拟 Agent/浏览器 WebSocket，Web 使用 production scaffold 请求自身 `/api/root`。原有 `node --test` 全量测试仍需较新 Node，测试运行器可以通过 `NODE_RUNTIME_BINARY` 指定 Node 12 来执行兼容子进程。生产镜像继续排除 test，不在运行 Pod 执行该命令。

本机 Node 12.18.3、12.22.12 及实际 Linux Node 12.18.3 镜像均通过运行兼容检查；API/Web Docker 完整构建成功，Web 保留 3 项既有体积警告；现代 Node 回归 API 93/93、Web 22/22 通过。发布步骤、SVN 范围和验证限制见 `../doc/Node-Agent发布交接.md`。

## 视频通道停用与异常记录（2026-10-12）

设备详情的视频通道接口统一使用小写 `tcp`/`udp`。前端对历史配置中的 `TCP`/`UDP` 做归一化，Node 也兼容大小写和首尾空格；其他值仍拒绝，修改时保留版本校验及未填写的已有密码。

临时 RTSP 源关闭后，平台中仍启用的通道会继续尝试拉流，应在“视频通道”中停用该通道。Agent 确认停用后，Node 将对应进行中的视频流/识别异常标为 `closed`（“已关闭”），保留历史和结束时间，不生成成功恢复记录。查询已停用通道也会清理遗留进行中状态；停用通道的旧错误不再计入设备异常汇总，旧版本遥测不会重新打开它。异常页新增“已关闭”筛选，停用成功后自动刷新记录。

本次只需更新 Node API 和 Web，重启 API、刷新页面；无新增 SQL，也不需要升级 Agent/Detector 二进制。发布范围与验证记录见 `../doc/Node-Agent发布交接.md`。

## Jenkins 与生产容器（2026-10-10 历史记录，当前配置以上文为准）

API/Web 的 `Dockerfile` 和 `jenkinsfile` 已更新，默认基础镜像为国内 DaoCloud 镜像源 `docker.m.daocloud.io/library/node:22-bookworm-slim`。测试容器出现 `Cannot find module 'node:util'` 表示实际 Node 运行时过旧，不是缺少 npm 包；不能通过安装 util 或只替换这一处 require 解决，新版 Agent 平台还使用 `stream/promises`、`crypto.randomUUID()`。

Jenkins 可添加字符串参数 `NODE_BASE_IMAGE` 指定可访问的内网 Node 22 或更新版本镜像（应包含 npm，支持 Linux AMD64）；镜像真实版本在构建中检查，不能再指定旧 `nodejs12`。已有 Jenkins 同名参数会覆盖文件中的默认值；原先设为 `node:22-bookworm-slim` 时需清空或改为 `docker.m.daocloud.io/library/node:22-bookworm-slim`。`NPM_REGISTRY` 默认沿用现有 Nexus，锁文件中的下载地址也必须可达。Web 参数 `WEB_BUILD_MEMORY_MB` 默认 8192，仅是 Node 堆上限，构建 Pod 的内存限制仍需单独配置并留足余量（建议至少 10 GiB）。不要把未经验证的内网镜像 tag 当作可用地址。

Jenkins 从干净工作目录检出，Kaniko 使用实际工作目录作为上下文；API 按锁文件安装生产依赖，Web 先安装包含 React/Babel 的完整依赖并生产编译，再生成仅保留生产依赖的运行镜像。`build/peace-antd-compat.js` 必须包含在构建上下文中；`.dockerignore` 排除本机依赖、私有环境文件、日志、运行数据和旧静态编译输出。`npm run build` 已改为跨平台正确传递 `NODE_ENV=production`。Web 的版本信息由 Jenkins 通过构建参数传入。

提交后用新的、不重复的 `IMAGE_VERSION` 分别重建 API/Web，更新 Deployment 的镜像引用并等待滚动发布。只改 SVN 源码、重新启动旧镜像或只部署 Web，均不能修复旧 API 容器。发布后在实际 API Pod 执行 `node -v`，确认版本，并核对 Deployment/Pod 使用的新镜像。数据库、Redis、七牛和 Agent 公网入口仍由目标部署环境注入。

完整发布步骤、提交文件及本机验证限制见 `../doc/Node-Agent发布交接.md`。此前 Docker Hub 拉取发生网络超时；本次改用 DaoCloud 后实际拉取成功，容器内为 Node v22.23.3，所需内置模块可用。API/Web 镜像均已完整构建，API 容器内兼容模块及 Agent 模块加载通过；Web 容器内生产模式启动回归通过，路由注册和 `/api/root` 返回正常，没有访问上游服务。Web 生产编译仅有 3 项既有包体积/性能警告。测试 Jenkins 的网络、Kaniko 和集群部署仍需在目标环境验证；本机验证不等于测试环境已经部署新版。

## Node-Agent 本地联调（2026-10-10）

先在 `../api` 运行 `npm run start:agent`（端口 4700），再在本目录运行：

```powershell
$env:API_URL = 'http://localhost:4700'
$env:API_POMS_URL = 'http://localhost:4700'
npm start
```

浏览器打开 `http://localhost:5700`；开发编译服务使用 5601，等待编译完成。API 的 Redis、数据库及模型七牛配置见 `../doc/Node-Agent七牛与本地调试.md`。模型上传走 `/_api/edgeAgent/files`，由 Node 上传七牛并下发签名地址，不使用 Web 的旧附件上传接口。

登录入口为 `http://localhost:5700/signin`。使用现有平台账号；登录后通过“设备 → 设备管理 → 边缘设备”和“设备 → 模型管理 → 视觉模型库”进入管理功能，菜单是否可见取决于账号权限。

### 设备详情指标精度与温度（2026-10-10）

`/device/edgeDevice/deviceDetail?id=设备ID` 的 CPU、内存和磁盘使用率统一显示两位小数，已用/总容量也显示两位小数。计算和存储仍保留原始精度。温度映射 Node 的 `temperature_celsius`，有效零值显示 `0.00℃`，不可用显示“—”。

新版 Agent 从 Linux `/sys/class/thermal/thermal_zone*/temp` 读取毫摄氏度，取最热有效传感器并通过心跳上报；需要重启更新后的 Node API，替换新版 ARM64 Agent 并重启看门狗。收到心跳后刷新详情页，无需增加 SQL 或配置项。板端检查及构建文件位置见 `../../FirmwareUpgrade/README.md`。

Chrome 1600×1000 在 `http://127.0.0.1:5700` 验证使用率、容量、温度、零温及缺温状态，无页面脚本异常或编译遮罩。浏览器使用真实 Node 心跳处理器与内存持久化替身，没有读取真机传感器。最新 Web 19 项测试通过，API 串行 84 项测试通过；高并发首轮终端测试曾出现关闭后发送的时序失败，串行复核通过。当前 Browser 插件不可用，采用已有 Playwright 与 Chrome。

### 重启操作返回 invalid_request（2026-10-10）

迁移后的 Node 使用了带连字符的 36 位 UUID，原 Agent 的重启操作只接受 32 位 ID，因此尚未执行系统命令就返回 `invalid_request`。Node 已将新建重启操作 ID 改为无连字符的 32 位十六进制值，数据库和下发使用同一 ID；其他类型 UUID 不变，浏览器幂等键无需更改，旧失败记录仍可查询且不会自动重试。

本次只需重启更新后的 Node API，再关闭重启弹窗、重新打开并确认，生成新幂等键及操作。旧失败操作不转为成功，不删除记录，不需要 SQL 或升级 Agent。真实 Go Agent 与 Node WebSocket 联调已复现原错误并验证修复后的 ID 通过校验；测试固定 `allow_remote_reboot=false`，仅返回 `disabled`，不会重启电脑或板子。允许重启的回执/幂等分支使用替身验证，实际 RK3576 重启及权限仍待用户环境验证。

### 模型上传进度已满但一直转圈（2026-10-10）

视觉模型页面为 `/device/edgeDevice/visionModels`。绿色进度条表示浏览器向 Node 传输文件的进度，接口还需完成七牛存储和数据库文件记录保存，才能返回成功。旧 `async-busboy` 在现代 Node 收到正常请求 `close` 时提前移除解析完成监听，导致文件已上传七牛，但 HTTP 响应一直等待。该问题已由 `api/app/lib/service/agentMultipartUpload.js` 修复：以解析器 `finish` 判定完成，区分正常收尾与连接中断，并处理文件消费者提前失败及失败清理。

页面现在在传输 100% 后显示“正在存储到七牛云”，收到成功响应后显示“模型文件上传成功”。上传中或失败时禁用“确定”，重新选择文件会清除上次文件 ID，防止误保存旧文件。上传成功后还需填写版本号并点击“确定”保存模型版本，模型才会进入列表。

停止旧 API，在 `../api` 重新执行 `npm run start:agent`；Web 等自动重新编译后刷新页面，如果没有更新则重启 `npm start`。部署时更新 API 依赖（新增显式 `busboy@0.3.1`，复用当前锁定版本）；无需降低 Node 版本或修改数据库结构。

验证：78 项 API、14 项 Web 回归通过；Chrome 在 `http://127.0.0.1:5700/device/edgeDevice/visionModels` 验证 100% 等待提示、成功、失败重试和保存按钮状态，无页面脚本异常。浏览器上传采用真实修复后控制器与七牛网络替身；另用修复后控制器连接真实本机 PostgreSQL 和七牛上传 8000 字节验证对象，确认 HTTP 201、七牛对象、文件元数据和本地临时文件清理，随后清理验证对象及记录。用户原模型对象经七牛只读查询确认存在；未改动用户文件或模型版本记录。当前没有 Browser 插件，使用已有 Playwright 和 Chrome。

### 普通设备页面提示查询固件包列表失败（2026-10-10）

`/device/firmwareUpgrade/deviceList` 属于原有普通设备功能，通过 `/firmware` 调用独立旧固件服务 `craw`（`API_CRAW_URL`），不使用 Agent 模型库或已退役的 Go Cloud。`start:agent` 的精简本地模式此前移除了该客户端，导致 `Cannot read properties of undefined (reading 'get')`；固件列表和字典接口现在在服务未配置时返回明确的 503 与配置指引，不伪造空列表。

RK3576/Agent 使用 `/device/edgeDevice/edgeDevices` 和 `/device/edgeDevice/visionModels`。旧固件管理确有联调需要时，在私有 `api/agent-local.env` 添加 `API_CRAW_URL=实际旧固件API根地址` 并重启 API；本地入口现在保留显式配置的 `craw`，其他外部服务仍按精简模式处理。Web 启动参数的 `--crawapi` 不会自动配置 Node API 的该变量。旧服务的上游 token 与平台登录 token 分开，不能用 Agent Node 地址代替旧固件地址。

81 项 API 回归通过，覆盖固件未配置提示、配置保留、旧结果及上游 token 兼容；没有连接真实旧固件服务。板端修改配置后仍连接旧地址时，按 `../../FirmwareUpgrade/README.md` 核查 systemd `ExecStart -config` 实际路径并重启 `agent_watchdog`；仅精确匹配 `./agent-linux-arm64` 的 pkill 不会停止带绝对路径和参数的服务进程。

### 升级任务分页与固件库连续弹错（2026-10-10）

`/device/edgeDevice/upgradeTasks` 的模型筛选此前发送 `pageSize=200`，超过 Node 单页上限 100，导致 `page_size必须为正整数且不超过100`。现通过 `queryVisionModelOptions` 每页取 100 条并根据总数继续分页，保留第 101 条之后的模型选项；任一页失败立即返回失败，动作元数据探测仍同步且不发送请求。普通列表仍使用原来的服务端分页，上限保持 100。

`/device/firmwareUpgrade/firmwareLibrary` 此前一进入就并行查询旧固件列表/两个字典，隐藏的上传弹窗还会查询 ClickHouse 型号。现在先请求平台鉴权的 `/firmware/capabilities`（返回 `firmware`、`deviceTypes` 是否已初始化，不连接上游），服务未启用时显示一条页面提示并禁用对应操作，停止依赖查询。仅旧固件服务可用时仍可浏览列表和筛选，上传/编辑需要型号服务；隐藏弹窗不再预加载，只有打开时才挂载并查询型号。字典仅初始化加载，翻页不重复请求。状态查询使用 30 秒超时，失败由页面统一提示，不触发全局错误通知。

直接请求未配置 ClickHouse 的 `/deviceType` 现在返回明确的 503，先检查服务再访问数据库，不再出现 `undefined.iot`。修复提示不等于启用旧固件功能：完整固件管理仍需真实旧固件 API 与 ClickHouse IoT 配置；当前 Agent 精简模式不启用 ClickHouse，RK3576 使用边缘设备/视觉模型页面。

停止旧 API 并重新 `npm run start:agent`，Web 自动重编译后刷新；没有更新则重启 Web 的 `npm start`。无需新 SQL、降低 Node 版本或修改七牛配置。83 项 API、19 项 Web 回归通过；Chrome 在用户指定的两个页面验证三次 100 条请求并可选择第 205 个模型、未启用/部分启用/完整启用状态、按需查询型号和状态查询失败，无页面脚本异常。浏览器使用修复后真实状态控制器及上游/模型数据替身，没有真实旧固件写入；未验证外部旧固件/ClickHouse 连通。没有 Browser 插件，使用已有 Playwright/Chrome。

### 注册请求只打印 POST、页面无反馈

注册依赖 API 的 PostgreSQL，Redis 端口或浏览器切换不能修复数据库连接问题。旧 `pg@7` 在现代 Node 下错误地把新建 Socket 当作已连接，导致数据库连接与注册事务一直等待。API 已通过 `dc.opts.dialectModulePath` 加载 `api/app/lib/service/postgresCompat.js`，仅兼容旧驱动的新建 Socket，默认数据库连接超时 10 秒；不修改 node_modules 或依赖版本。本地 Agent 配置的连接池等待和单条 SQL 执行限时均为 15 秒。Sequelize 4 会过滤 `dialectOptions.connectionTimeoutMillis`，所以连接超时由驱动适配器设置。

注册先校验输入，再申请事务；数据库不可用返回 503，已有账号返回 409，组织/职位未初始化返回 400，写入失败回滚并返回错误。新注册记录按模型定义保存姓名和账号，登录优先匹配账号，兼容历史注册写反的记录。角色权限仍由原平台管理，不自动赋予管理员权限。

页面提交时显示“正在注册”，禁用表单并防止重复提交；失败后显示原因并恢复按钮。注册独立使用 30 秒请求超时，避免复用普通请求的 12 分钟超时。若客户端超时，应先尝试登录确认结果，避免将迟到的成功误认为没有注册。保留布局初始化时 `action()()` 的元数据探测约定，探测阶段不发送注册请求。

更新后停止原 API 进程，在 `../api` 重新执行 `npm run start:agent`；Web 若没有自动重编译，重新执行 `npm start`，等编译完成后刷新。当前私有 `api/agent-local.env` 的 `POMS_DB` 已由用户改为 `127.0.0.1:5432/equipmentManagement`，用户已初始化平台注册/登录及边缘管理基础表。配置切换无需重启 Web；终端若存在旧 `POMS_DB`，它会覆盖私有文件。

验证：75 项 API 回归测试通过，包含真实 PostgreSQL 启动/查询协议的本地模拟服务、连接超时、注册参数校验/事务失败/回滚/字段映射及真实框架 HTTP 400/503；14 项 Web 回归测试通过（13 项完整测试加新增的元数据探测回归）。Chrome、1440×900、`http://localhost:5700/signin` 的页面交互通过：等待状态、防重复提交、503 错误后重试、201 成功后返回登录并填入账号。浏览器注册响应使用拦截替身，未写入真实数据库、未验证真实账号注册和登录；无页面脚本异常和编译错误遮罩，保留既有 viewport/React 卸载警告，模拟 503 的资源错误属于预期。当前没有 Browser 插件，使用已有 Playwright 和 Chrome 验证。

注册回归命令：API 目录运行 `node --test test/auth-register.test.js test/postgres-compat.test.js test/agent-local-config.test.js`，Web 目录运行 `node --test test/auth-register.test.cjs`。

本地库若缺平台基础表，按 `../script/README.md` 的首次初始化六步清单补齐；当前已在临时 schema 顺序执行并回滚验证通过。`0.0.1` 的建库/数据转储不能全部重复执行，完整旧业务增量还发现 `1.1.10` 所需 `sensor_types.sensor_type` 缺少迁移，具体区别和执行范围见清单。

### 管理员误删与开发文件监听（2026-10-10）

已按用户授权在本机 `equipmentManagement` 恢复 `SuperAdmin`（显示名“超级管理员”）及“所有者”角色关联，密码按用户指定重设，不在文档记录密码。沿用已有组织、默认部门、主管职位和 63 项所有者角色权限；没有重跑建库脚本或删除其他用户。实际 API 登录返回 200，Chrome 从登录页进入 `/device/edgeDevice/edgeDevices` 成功，无页面脚本异常。注册代码使用真实模型/数据库事务诊断返回 201，诊断用户回滚；浏览器对已存在的管理员账号发起注册返回 409 并显示账号已存在。

`Watchpack Error (initial scan): EINVAL ... System Volume Information` 属于 Webpack 开发文件监听，编译成功与注册接口是否成功要分别看。`webpack.config.js` 已固定 `context` 为 Web 项目目录，并排除 `System Volume Information`、`$RECYCLE.BIN` 和 `.svn`；源码及依赖原有监听保持。实际 Watchpack 验证排除目录不执行 lstat，源码编辑仍触发变化事件；七项注册/兼容/真实 Web 框架回归测试通过。停止旧 Web 进程再 `npm start`，配置修改才能生效；尚未验证用户原 Web 进程重启后的完整监听日志。

Node 23/24 移除了 `util.isRegExp` 与 `util.isArray`，旧路由库 `koa-66` 仍引用这两个函数。若看到 `util.isRegExp is not a function`，即使随后显示 `webpack-dev listen 5601`，也不代表 Web 路由加载成功。`server.js` 已在加载框架前启用 `middlewares/legacy-node-compat.js`，仅补充缺失函数，无需修改 node_modules 或降低 Node 版本。更新源码后停止原 Web 进程并重新 `npm start`。

路由启动回归测试：`node --test test/server-startup.test.cjs`。测试使用真实 Web 框架、路由和 HTTP 请求，日志使用替身，七牛及外部 API 使用占位配置，不发起上游请求；不覆盖 Webpack 编译和浏览器页面。

若编译出现 `export 'Message' was not found in 'antd'`，来源是 `@peace/components@0.0.81` 的 modal 组件错误导入；Ant Design 导出的是小写 `message`。开发及生产 Webpack 的 Babel 配置已接入 `build/peace-antd-compat.js`，仅修正该依赖文件为 `message as Message`，保留既有调用和弹窗行为，重新安装依赖后仍生效。重新启动 Web 编译即可，无需调整七牛或 Node API 配置。回归测试使用实际依赖源码执行弹窗错误提示分支：`node --test test/peace-antd-compat.test.cjs`。该兼容项针对 Webpack 构建；未覆盖可选 Vite 入口或旧组件包的其他 Ant Design 行为差异。

`export 'default' was not found in 'xlsx'` 是导入格式错误，应使用 `import * as XLSX from 'xlsx'`。本项目两个导出组件已修正；上述构建兼容插件也修正旧组件包 `export-data/export-and-import` 的同类导入。多处调用会产生多条警告，不代表存在同等数量的不同问题。

`editCompanyList/getEnterprisesDetails was not found` 来源是已停用的企业页面：当前没有企业页面路由，company action 已为空。统一容器入口不再导入/导出这个页面，企业页面与弹窗源码保留供历史参考。后续恢复该功能前必须补齐实际 action、后端接口与路由，不能仅重新导出页面。

以上导出警告由 Webpack 检查前端模块时产生，切换 Node 20 不会补出缺失的模块导出。当前 Node 24 的旧路由兼容问题已在启动入口处理；针对这些警告无需降级 Node。

验证结果：11 项 Web 测试通过，四个应用/旧组件 XLSX 导入均能写入并读回实际工作簿。Node 24 下完整开发入口编译为 0 errors / 0 warnings。该检查保留实际应用、解析与 loader 配置，关闭 source map、热更新及包分析插件，使用临时产物目录和 8 GiB 堆；不覆盖浏览器交互或生产压缩构建。

## 1. 文档维护：

- 文档相关内容若有更改，请及时更新文档，以备后来者查询；

## 2. 项目开发：

- 请遵循此文档约定的目录结构与约定

```js
    |-- .babelrc
    |-- config.js
    |-- Dockerfile
    |-- jsconfig.json
    |-- package.json
    |-- readme.md
    |-- server.js
    |-- webpack.config.js
    |-- webpack.config.prod.js
    |-- .vscode
    |   |-- launch.json
    |   |-- settings.json
    |-- client
    |   |-- index.ejs
    |   |-- index.html                      // 当前 html 文件
    |   |-- index.js
    |   |-- assets                          // 资源文件
    |   |   |-- images
    |   |       |-- avatar
    |   |-- src                             // 项目代码
    |       |-- app.js                      // 由此开始并加载模块
    |       |-- index.js                    
    |       |-- components                  // 公用组件
    |       |   |-- index.js                // 由此导出组件
    |       |   |-- Upload
    |       |       |-- index.js
    |       |-- layout                      // 项目布局以及初始化等操作
    |       |   |-- index.js
    |       |   |-- actions
    |       |   |   |-- global.js
    |       |   |-- components
    |       |   |   |-- footer
    |       |   |   |   |-- index.js
    |       |   |   |-- header
    |       |   |   |   |-- index.js
    |       |   |   |-- sider
    |       |   |       |-- index.js
    |       |   |-- containers
    |       |   |   |-- index.js
    |       |   |   |-- layout
    |       |   |   |   |-- index.js
    |       |   |   |   |-- index.less
    |       |   |   |-- no-match
    |       |   |       |-- index.js
    |       |   |-- reducers
    |       |   |   |-- ajaxResponse.js
    |       |   |   |-- global.js            // 全局数据，主要包含屏幕可视宽高、所有的 action 等
    |       |   |   |-- index.js
    |       |   |-- store
    |       |       |-- index.js
    |       |       |-- store.dev.js
    |       |       |-- store.prod.js
    |       |-- sections                     // 各功能模块
    |       |   |-- auth                     // 比较特别的 Auth 模块，目前 action、reducer 依然采用原始写法；包含登录、忘记密码等项目基本功能页面
    |       |   |   |-- index.js
    |       |   |   |-- routes.js
    |       |   |   |-- actions
    |       |   |   |   |-- auth.js
    |       |   |   |   |-- index.js
    |       |   |   |-- components
    |       |   |   |-- containers
    |       |   |   |   |-- index.js
    |       |   |   |   |-- login.js
    |       |   |   |-- reducers
    |       |   |   |   |-- auth.js
    |       |   |   |   |-- index.js
    |       |   |   |-- __tests__
    |       |   |-- example                   // 示例模块，一般的功能模块应遵循此结构
    |       |       |-- index.js              // 由此导出该模块信息，应包括一个 key 值，actions 等
    |       |       |-- nav-item.js           // 用于生成菜单项，此文件内可以进行权限判断
    |       |       |-- routes.js             // 路由文件
    |       |       |-- style.less            // 样式文件，若样式并不是非常多，每个模块一个样式文件即可
    |       |       |-- actions                 
    |       |       |   |-- example.js        // 具体的 action 操作
    |       |       |   |-- index.js          // 由此导出该项目的 action
    |       |       |-- components            // 组件
    |       |       |-- containers            // 容器，此文件夹内应只包括该模块第一层级的页面
    |       |       |   |-- example.js
    |       |       |   |-- index.js
    |       |       |-- reducers              // 若采用封装后的 action 写法，则 reducer 可不写
    |       |           |-- index.js
    |       |-- utils                         //
    |           |-- authCode.js
    |           |-- func.js                   // 常用函数
    |           |-- index.js
    |           |-- webapi.js                 // api 路由
    |-- log
    |-- middlewares
    |   |-- proxy.js
    |   |-- webpack-dev.js
    |-- routes
    |   |-- index.js
    |   |-- attachment
    |-- typings
        |-- node
        |   |-- node.d.ts
        |-- react
            |-- react.d.ts
```

- 封装后一般 action 写法：

    `@peace/utils 的 actionHelp 中有详细注释`

    ``` js
    'use strict';

    import { ApiTable ,basicAction} from '$utils'

    export function getMembers(orgId) {
        return dispatch => basicAction({
            type: 'get',
            dispatch: dispatch,
            actionType: 'GET_MEMBERS',
            url: `${ApiTable.getEnterprisesMembers.replace('{enterpriseId}', orgId)}`,
            msg: { error: '获取用户列表失败' },
            reducer: { name: 'members' }
        });
    }
    ```

1. 若 type=post，则可以使用 data 属性发送对象格式数据；

2. reducer.name 会作为该 action 对应的 reducer 的名字，从 state 里可以解构此变量，获得该 action 异步或其他操作获得的数据；

3. msg 可以发送 `{ option:'获取用户列表' }` ，则 actionHelp 会自动将其处理为失败和成功两种情况；

    若单独写 success 或 error 的 key，则只在成功或失败的时候进行提示；

4. 后续可以优化：type=get 时候，

    使用 query 属性将数据传递，在 @peace/utils 的 actionHelp 中将其添加到路由后面；eg. `{ enterpriseId: orgId }`

    使用 replace 属性传递对象数据，对象数据中将被替换的值为key，替换的值为 value，然后再 actionHelp 中更改路由；eg. `{ "{enterpriseId}": orgId}`

5. 最终取得的 reducer 中的数据格式一般为：
    ``` js
    {
        data: xxx,           // 接口返回的数据格式
        isRequesting: false, // 请求状态
        success: true,       // 以此判断请求是否成功，不用再以 payload.type 判断
    }
    ```

- actions 的引用

    从 reducer 的 state.global.actions 里引用具体 action

    ```js
    const Example = (props) => {
        const { dispatch, actions, user, loading } = props

        useEffect(() => {
            dispatch(actions.example.getMembers(user.orgId))
        }, [])

        return (
            <Spin tip="biubiubiu~" spinning={loading}>
                example
            </Spin>
        )
    }

    function mapStateToProps(state) {
        const { auth, global, members } = state;
        return {
            loading: members.isRequesting,
            user: auth.user,
            actions: global.actions,
            members: members.data
        };
    }

    export default connect(mapStateToProps)(Example);
    ```

- 一般路由配置
    ```js
    'use strict';
    import { Example, } from './containers';

    export default [{
        type: 'inner',                // 是否在layout 内，如果为outer，则看不到 header、footer、sider等布局，比如登陆页面
        route: {
            path: '/example',
            key: 'example',
            breadcrumb: '栗子',
                                      // 不设置 component 则面包屑禁止跳转
            childRoutes: [{          
                path: '/e1',          // 自路由不必复写父路由内容，会自动拼接； 则此处组件的实际路由为 /example/e1
                key: 'e1',          
                component: Example,
                breadcrumb: '棒子',
            }]
        }
    }];
    ```
- cross-env 的使用限制

    cross-env 可以统一不同操作系统下环境变量的导出方式，不用再在 windows 下写 set；linux 下写 export； 可以统一以 cross-env NODE_ENV=DEV 代替；

    但是这样的话就不能在同一条运行的命令中使用 && 切割，因为会把命令切割为两个环境，则最终拿不到我们设置的变量；
