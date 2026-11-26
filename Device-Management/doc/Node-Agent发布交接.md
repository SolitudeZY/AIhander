# Node-Agent 发布交接

## 远程会话入口增量（2026-10-13，当前配置）

测试环境网页 `https://dvcplttest.anxinyun.cn/terminal/connect` 当前返回 HTTP 200 React HTML，设备 API `https://dvcpltapitest.anxinyun.cn/terminal/connect` 无凭据探测可返回 WebSocket 101。因此本地正常、K8s 终端失败的已确认问题是网页域名的终端入口路由。Web 新增独立运行时 `EDGE_AGENT_API_URL`，通过 `/api/root` 返回，React 优先使用该地址连接终端；不改 POMS 配置或登录鉴权。

发布新版 Web 镜像，并在 **Web Pod** 注入 `EDGE_AGENT_API_URL=https://dvcpltapitest.anxinyun.cn`；滚动发布后刷新页面，检查 `/api/root` 的 `edgeAgentApiUrl`、Network WS 地址及 101、终端输出和会话关闭。无需本轮新 SQL、API 镜像或 Agent 二进制。板端 `server_url` 继续使用已经连通的设备 API 地址；本文后续历史段落中的网页域名只有正确转发 Agent/终端路径时才适用。

当前尚待 SVN 提交的本轮目标为 `web/config.js`、`web/routes/attachment/index.js`、`web/client/src/sections/edgeDevice/hooks/useTerminalSocket.js`、`web/readme.md`、本文档及新增 `doc/终端连接诊断-2026-10-13.md`。核对时 `web/test/edge-agent-contract.test.cjs`、`web/test/runtime-compat-smoke.cjs` 已在 r244，工作副本无差异；测试已提交不能代替上述功能源码提交。保留已有其他修改，不递归提交运行数据、本机配置或旧编译输出。

建议提交文字：`fix: 支持独立设备终端 API 地址，修复 K8s 网页入口返回 HTML 导致远程会话连接失败；保留本地和同源部署行为，补充 Node 12 配置回归与部署验收指引。`

Web 25/25 测试、Node 12.22.12 production 启动检查和生产编译通过（3 项既有包体积警告）；Chrome 生产 React 模拟连接验证通过，无页面脚本异常。无凭据实时入口探测仅验证路由/升级能力，没有使用真实用户或打开板端终端；本轮没有执行 SVN commit 或部署 K8s。具体证据及步骤见 [本轮诊断](终端连接诊断-2026-10-13.md)。

日期：2026-10-10。本次整理供人工 SVN 提交和测试环境发布；没有提交仓库、制作容器镜像或部署到集群/板端。文件勾选清单及两套提交文字见 [SVN提交说明](Node-Agent-SVN提交说明.md)。

## 发布内容

本版链路为 React → Device-Management Node API → Agent → Detector。独立 Go Cloud 和旧 `/edgeCloud` 代理退役；平台账号、项目权限继续使用现有 Node。模型文件由 Node 上传七牛，数据库保存文件元数据，Agent 从签名地址直接下载。

包含本轮上传卡在 100%、Node 路由/数据库驱动兼容、注册反馈、模型分页超限、旧固件服务缺配置提示、指标两位小数、设备温度心跳和重启操作 ID 的修复。普通旧固件页仍依赖其自己的上游和 ClickHouse，不能因删除 Go Cloud 就认为这些服务已迁移。参数模板等历史业务缺表问题不属于本版修复范围。

## SVN 提交

两套仓库分别提交：

| 工作副本 | 提交范围 |
| --- | --- |
| Device-Management | Node/React 源码、依赖锁文件、SQL、配置示例、测试、迁移/调试/发布文档 |
| FirmwareUpgrade | Go Cloud 删除、Agent 温度/七牛下载、协议/接口集合、示例配置、构建/退役说明及对应测试 |

必须包含 A 新增、D 删除及 `api` 的忽略属性。`web/build/peace-antd-compat.js` 是构建插件源码，应提交；编译输出 `web/client/build` 与 Agent 二进制不属于源码目标。

私有 `api/agent-local.env`、本机 `.vscode/launch.json`、运行目录、根目录未版本化锁文件、Word 原有修改和无关旧测试均不勾选。不要在父目录一次性提交两个仓库，也不要递归添加所有未版本化文件。

整理时远端为 Device-Management r229、FirmwareUpgrade r20907；这不是本次提交版本号。远端更新的两个权限管理文件 `recource.js`、`role.js` 原本无本地改动，已单独同步到 r229；工作副本无冲突。提交后记录各自新 revision，再从对应 revision 构建镜像/正式交付物。

## 数据库与环境

1. 对目标平台数据库和 Node 运行数据目录备份，核对基础账号、项目等表存在。已有库不要重跑 `0.0.1` 全量脚本。
2. 按 `script/2.0.0/README.md` 补齐缺失增量：测试库之前已完整执行 1、2 时，本次仅执行新增 `3.node_agent_platform.sql`；缺 recording 列时先补 2 再执行 3；只有从未安装这组边缘业务表的已有平台库才执行 1 → 2 → 3。三者均完成且结构/索引正常时无需再运行 SQL。旧 1、2 本轮只是注释/前置检查变化，不要求重跑；遇错回滚并处理第一条错误。
3. Node 配置目标 PostgreSQL、Redis 和七牛参数，禁止把本机数据库地址/密码直接带到测试部署。模型存储使用 `EDGE_AGENT_FILE_STORAGE=qiniu`、对应 Bucket/Domain/AK/SK；密钥由部署环境注入，不写入交付文档、前端或 Agent。
4. `EDGE_AGENT_PUBLIC_URL=https://dvcplttest.anxinyun.cn`；生产配置 `EDGE_AGENT_FILE_STORAGE=qiniu`，新告警图片随模型文件一起复用七牛配置，上传结果存入数据库。旧图片迁移参见 `告警图片七牛存储.md`。`EDGE_AGENT_DATA_DIR` 仍需可写，旧本地图片/文件迁移前保留持久目录。先使用单 Node 实例；多实例控制会话路由不在当前验证范围。
5. `npm run start:agent` 是本机精简开发入口，会强制 development。测试/正式集群沿用既有生产启动入口 `node server` 和平台配置，按目标环境补齐必要服务参数。

配置模板见 `api/agent-local.env.example`（开发用途），环境变量语义见 [七牛与本地调试](Node-Agent七牛与本地调试.md)。生产镜像需安装锁定依赖，并包含新增 `busboy`、七牛客户端和兼容源码，不能仅替换一个控制器文件。

## 发布顺序

### 异常人工确认（2026-10-12）

确认人展示补充：异常查询和确认响应按持久化用户 ID 批量关联平台用户，返回账号与姓名；Web 显示如 `SuperAdmin（超级管理员）`，已有记录无需重新确认，用户删除后回退为用户 ID。此修正无需 SQL 迁移，API/Web 需同步发布。

用户截图中的 `camera-023` 遗留异常仍为 active，异常列表缺少人工确认入口。设备详情异常记录页现新增“确认”按钮与确认弹窗；服务器保存成功后整行变灰，状态显示“已确认”，按钮消失，刷新后保持。支持已确认筛选，详情显示确认时间和用户 ID，并刷新设备汇总及操作审计。

新增登录保护接口 `POST /edgeAgent/devices/:id/exceptions/:exceptionID/acknowledge`，记录必须属于 URL 中指定设备且为异常记录。重复确认返回原确认信息，不更改首次确认时间。确认状态存入既有 EdgeAgentRecord JSONB，无需 SQL 迁移。异常恢复和确认更新使用事务行锁，防止覆盖彼此的记录更新。

确认字段为 `acknowledged=true`、`acknowledged_at`、`acknowledged_by`，独立于实际 `status=active/recovered/closed`：确认不会声称故障恢复，不填写 ended_at 或 passed，不发送停用/重启命令。设备“异常状态”汇总排除已确认的持续异常，实际在线状态和通道健康显示保留。相同故障连续上报仍使用原记录；真实恢复后新一次故障创建新未确认记录，其他未确认故障也会提示。新生成恢复记录不继承原异常的确认信息。API `status=acknowledged` 是确认筛选；`status=active/recovered/closed` 仍按实际故障生命周期查询，已确认的持续故障可同时属于 active 查询。

本轮手工 SVN 目标：API `app/lib/controllers/firmwareUpgrade/edge-agent.js`、`app/lib/routes/firmwareUpgrade/edge-agent.js`、`app/lib/service/agentPlatform.js`、`test/edge-agent.test.js`、`test/runtime-compat-smoke.cjs`；Web `client/src/utils/webapi.js`、`client/src/sections/edgeDevice/actions/index.js`、`actions/edgeDevice.js`、`components/common.jsx`、`components/device-modals.jsx`、`containers/deviceDetail.jsx`、`style.less`、`test/edge-agent-contract.test.cjs`、`readme.md`及本文档。部署更新 API/Web，无需 Agent 二进制或数据库脚本。

提交文字：`feat: 增加设备异常人工确认与灰色历史展示，保存确认人和时间，支持筛选与审计；已确认异常退出待处理汇总，保留实际故障与恢复生命周期及新异常提醒。`

验证：API 完整串行回归 95/95、Web 23/23 通过，新增接口与语法在 Node 12.18.3 兼容子进程通过；生产 Web 构建成功，仅保留 3 项既有体积/性能警告。Chrome 1600×1000 对 `/device/edgeDevice/deviceDetail?id=qa-channel` 执行“异常记录 → 确认 → 确认异常 → 刷新 → 已确认筛选 → 详情”，确认两条记录持久化、灰色行、按钮消失、汇总正常及确认人/时间，无页面脚本错误、空白或框架错误覆盖层。Browser 插件不可用，使用已有 Playwright/Chrome。真实控制器/AgentPlatform 搭配内存数据库和模拟 Agent，未连接真实数据库或板端；本轮未构建部署镜像、提交 SVN或修改测试环境。

### Node 12 兼容调整（2026-10-12，当前发布配置）

同事电脑报 `Cannot find module 'node:util'`，该堆栈对应旧 Node 的模块加载行为，不能证明升级后的 Node 22 出错。本机先在 Node 12.22.12 复现，再按以下方案修改并验证。此节替代后续历史记录中的“运行镜像必须 Node 22”要求。

1. 运行源码保持原业务：API/Web 兼容层、pg 兼容模块和本地入口使用 `util`/`net`/`fs`/`path`；API 上传改用 `util.promisify(stream.pipeline)`，UUID 使用已有 uuid v4；七牛回调和注册错误处理去掉 Node 12 不支持的可选链。此前通道停用与启动诊断改动保留。
2. API 和 Web 运行镜像默认恢复公司原地址 `repository.anxinyun.cn/base-images/nodejs12:20.10.12.2`。实际拉取成功，digest `sha256:2c8807b4a02a9b6821a9a75e5b6540a55bfb65a8590ff33156f709a466640962`，版本为 Node 12.18.3/npm 6.14.6。Web 构建阶段单独使用 `NODE_BUILD_IMAGE=docker.m.daocloud.io/library/node:22-bookworm-slim`；React 在构建阶段编译，最终静态输出和 Koa 服务进入 Node 12 运行镜像。
3. 运行依赖安装使用 npm 6 兼容的 `npm ci --production`。API lock 从 v3 转成 v2；对比确认仅 tmp 从 0.2.3 固定为支持旧 Node 的 0.2.1，并加入其 rimraf 3.0.2 子依赖，其他锁定版本不变。Web 不整体降级 React、antd 或构建依赖。锁文件增加的 dependencies 元数据导致 diff 较大，不代表整体升级依赖。
4. 新增可在目标 Node 直接运行的 API/Web `test/runtime-compat-smoke.cjs`，及现代测试运行器的回归入口。API 验证全量本地源码语法、模块加载、UUID、上传与失败清理、七牛签名/回调错误、通道停用/异常关闭和真实本机 WebSocket 鉴权/中文终端记录；Web 验证源码语法、真实 production scaffold 注册路由及 HTTP `/api/root`。

业务运行源码共 7 个文件的小范围修改；构建配置 4 个文件，另含依赖清单、锁文件、测试与文档，不涉及数据库脚本、Agent/Detector 或页面业务重写。本次新增/修改目标：

- API：`app/lib/service/legacyNodeCompat.js`、`postgresCompat.js`、`agentPlatform.js`、`agentFileStorage.js`、`app/lib/controllers/auth/index.js`、`start-agent.js`、`Dockerfile`、`jenkinsfile`、`package.json`、`package-lock.json`。
- Web：`middlewares/legacy-node-compat.js`、`Dockerfile`、`jenkinsfile`、`package.json`、`readme.md`。
- 新增：两端的 `test/runtime-compat-smoke.cjs`、API `test/runtime-compat.test.js`、Web `test/runtime-compat.test.cjs`；加上本文档。

`agentPlatform.js` 同时含此前启动诊断和通道停用改动；人工提交时保留其 `startupDiagnostics.js` 依赖及对应已有改动，不只复制一个文件。未提交 SVN，排除 api/data、私有配置和根目录未版本化锁文件。

测试：Windows Node 12.18.3 和 12.22.12 的两端兼容脚本通过；实际构建两套 Linux 镜像后，在 Node 12.18.3 运行兼容脚本也通过，网络隔离，仅允许容器自身 loopback。API 的 scaffold、Sequelize、Kafka、Redis 客户端、Busboy、七牛模块加载通过；既有 ioredis 可创建 lazy 客户端并关闭，未连接服务。现代 Node 完整回归 API 93/93、Web 22/22 通过，兼容测试子进程指定 Node 12.18.3。Web 生产编译保留 3 项既有包体积/性能警告。API 安装时既有可选 snappy 原生扩展因缺少构建工具未编译，Kafka JS 模块加载成功；未验收 Kafka Snappy 压缩消息处理。

本机镜像 tag 仅为 `node-agent-api:node12-compat-check-20261012` 和 `node-agent-web:node12-compat-check-20261012`，未推送、部署或访问真实数据库/七牛/板子；上述检查不能代替全部旧业务和集群验收。Web 本地开发/编译仍使用 Node 22；若要求连编译也必须 Node 12，还需要另外降级和验证构建依赖，这不属于本次小范围运行兼容修改。既有 ioredis 声明最低 Node 12.22.0，开发电脑建议 12.22.12；公司旧镜像 12.18.3 已通过本次新增功能检查，并不等于所有依赖的官方版本承诺。

发布时检查 Jenkins 同名参数：`NODE_BASE_IMAGE` 指向上述公司运行镜像，Web `NODE_BUILD_IMAGE` 指向 DaoCloud Node 22 编译镜像，`NPM_REGISTRY` 沿用可访问 Nexus；分别构建新 IMAGE_VERSION，再更新 API/Web Deployment 并核对实际 Pod 的 `node -v`。本地 API 用 Node 12 安装依赖后运行现有 `npm run start:agent`，数据库/Redis/七牛仍按私有 env 配置；Web 开发使用 Node 22 `npm start`，production 容器使用 `node server.js`。

提交文字：`fix: 兼容 Node 12 运行环境，替换新增 Node API 和可选链写法，保留七牛上传及 Agent/终端功能；恢复 Node 12 服务镜像并分离 Web 编译镜像，适配 npm 6 锁文件安装，补充运行兼容回归。`

### 容器运行时与 Jenkins 补充（2026-10-10 历史记录）

测试 API 的日志为 `Cannot find module 'node:util'`，堆栈从 `legacyNodeCompat.js` 进入 `server.js`。这表明容器 Node 太旧，不支持当前源码使用的内置模块导入。原 API/Web Dockerfile 均引用 `repository.anxinyun.cn/base-images/nodejs12:20.10.12.2`；精确运行版本以实际 Pod 的 `node -v` 为准。新版 API 同时使用 `stream/promises` 和 `crypto.randomUUID()`，仅把 `node:util` 改成 `util` 无法让整个平台兼容旧运行时。

本次修正：

- API/Web 的 Dockerfile 和 Jenkinsfile 默认基础镜像统一为国内 DaoCloud 镜像源 `docker.m.daocloud.io/library/node:22-bookworm-slim`，构建时检查实际 Node 至少为 22；Jenkins 可用字符串参数 `NODE_BASE_IMAGE` 指定可访问的内网 Node 22 或更新版本镜像，须包含 npm 并支持 Linux AMD64。已有 Jenkins 同名参数会覆盖新默认值，重新构建前需清空或改为上述国内地址。当前没有已核实可用的公司 Node 22 镜像地址，不编造私有 tag。
- `NPM_REGISTRY` 沿用 Nexus，可按环境覆盖。使用 `npm ci --legacy-peer-deps` 和现有锁文件，API 安装生产依赖，Web 多阶段构建先装完整依赖再安装运行依赖；必须保留构建插件 `web/build/peace-antd-compat.js`。锁文件内已有 Nexus/npmmirror 的固定下载地址，这些地址也必须可达，仅更改 registry 参数不能替换所有锁定地址。
- Jenkins 清理自己的工作目录后全量检出，用实际工作目录构建，避免依赖未设置/不同步的 `BUILD_WORKSPACE`。Web 传入构建号、SVN 信息和编译堆上限；默认 `WEB_BUILD_MEMORY_MB=8192`，构建 Pod 建议至少 10 GiB 内存，堆上限不会修改 Kubernetes 资源限制。
- 新增两个 `.dockerignore`，排除本机依赖、私有环境文件、运行数据、日志和旧 Web 编译输出。Web 构建命令正确传递 production，运行镜像保留 server/config/routes/middlewares、编译后的 client 和版本信息。

这组改动需手工提交 Device-Management：`api/jenkinsfile`、`api/Dockerfile`、`api/.dockerignore`、`web/jenkinsfile`、`web/Dockerfile`、`web/.dockerignore`、`web/package.json`、`web/readme.md` 和本文档。两个新增 `.dockerignore` 必须添加。`script/2.0.0/README.md` 是前一轮补充的增量 SQL 说明，可一并提交；没有新的 SQL。排除 `api/data`、私有 env 和根目录未版本化锁文件。没有执行 SVN commit。

提交文字：`fix: 更新 Node-Agent 容器运行时与 Jenkins 构建配置，修复旧 Node 无法加载 node:util；按锁文件安装依赖，修正 Web 生产构建并排除本地配置和运行数据；补充发布与增量 SQL 说明。`

提交后分别使用新的 `IMAGE_VERSION` 重建 API/Web，再更新测试 Deployment 的镜像引用并等待滚动发布。核对实际 API Pod 的 `node -v` 和镜像引用；只重启旧容器、只部署 Web 或只提交源码，不会更新运行时。目标数据库、Redis、七牛及 Agent 配置沿用本次发布环境配置。

此前本机验证（本机 Node 24）：API/Web 的锁文件安装 dry-run 通过；修正后的实际 `npm run build` 生产编译通过，3 项既有警告为包体积/性能建议；Web 19 项回归通过。Jenkins 内嵌 shell 语法检查通过，但尚未在 Jenkins 校验 Groovy/插件执行。使用 Docker scratch 镜像实际导出两套构建上下文，确认私有 env、运行数据、本机依赖和旧 Web 输出已排除，新增构建插件和源码保留。初次完整 API Docker 构建曾被 Docker Hub token 服务网络超时阻断。

国内镜像验证（2026-10-10）：DaoCloud 的 `docker.m.daocloud.io/library/node:22-bookworm-slim` 已实际拉取，digest 为 `sha256:c3de60bf2f9dd0ac6370e6117950ff62d6e339527e7472301c9c78a017978392`，容器内为 Node v22.23.3。`node:util`、`node:net`、`stream/promises` 和 `crypto.randomUUID` 可用。API/Web 均已使用更新后的 Dockerfile 完整构建；API 容器内加载兼容层、PostgreSQL 兼容模块、Agent 平台/网关、Busboy 和七牛客户端通过，未连接业务数据库或真实设备。Web 生产编译通过，仅有 3 项既有包体积/性能警告；在最终 Web 运行镜像内执行现有 `server-startup.test.cjs`，生产模式路由注册及 `/api/root` 返回通过（1/1），网络隔离且未访问上游服务。镜像仅生成本机验证 tag，没有推送镜像、在测试 Jenkins 执行或部署到集群，不能据此认定测试镜像已恢复。本次 SVN 增量仅为 API/Web 的 Dockerfile、jenkinsfile、Web README 和本文档；改动未提交。

### Agent 域名入口检查（2026-10-10）

后续测试提供设备 API 域名 `https://dvcpltapitest.anxinyun.cn`。本机对该域名的无凭据 WebSocket 握手返回 401，空无效注册请求返回 500；另使用交付 Windows Agent 和隔离配置尝试两次注册，均收到服务端初始化错误，未生成设备状态文件，随后停止测试进程。测试关闭远程终端/重启，不使用板端状态文件或凭据。这个结果确认请求进入了 API，不代表鉴权 WebSocket、心跳或真实板端连接已成功；初始化恢复后可让 Agent 的 `server_url` 指向此设备 API 根地址（HTTPS 默认 443）。告警/兼容文件外部地址配置 `EDGE_AGENT_PUBLIC_URL` 也应指向实际可访问的设备 API 根地址。

`server_url` 可使用 `https://dvcplttest.anxinyun.cn`，HTTPS 默认端口为 443，通常不需额外端口，也不需填写服务器内外网 IP。它是根地址，不加 `/_api` 或 `/api/v1`。板端须能解析该域名、访问入口并信任证书。

本次从开发电脑向 `/api/v1/agents/connect` 发送不带设备凭据的 WebSocket 握手探测，返回 HTTP 200、`text/html` 和 React 网页。当前此响应不符合 Agent 网关握手协议，不能因网页可打开就认为 Agent 可连接。需在部署新版 Node 后，将 `/api/v1/agents/*` 原路径及 `/terminal/connect` 直接转发到设备 Node Service，并支持 WebSocket；不可转到 React，也不可加 `/_api` 或重写掉路径。使用正确配置的新 Node 网关时，无凭据握手应拒绝认证（401）；这只是路由初检，仍需真实 Agent 注册、鉴权连接和心跳验证。

Ingress 合并模板为 `doc/node-agent-ingress.example.yaml`，实际命名空间、Service 和 Service port 由测试环境提供；IP 不能推导出内部 Service port。此模板需合并到现有入口，不可原样替换整份配置。本次只做无凭据只读检查，没有修改测试服务器或注册设备。

### 初始化失败但迁移表已存在

测试截图显示 `10.8.40.210:5432/deviceplatform` 的当前 schema 为 public，`edge_agent_record`、`edge_remote_session` 存在，且查询返回 recording 字段。这只证明所查数据库具备这些对象，不证明 Node 连接同一库、使用同一账号或已加载最新结构；Adminer 的 PHP Warning 与 Node 初始化错误无关。

首先核对实际 API Pod 的 POMS_DB/启动数据库参数指向同一主机和库（不要把密码贴到日志），在迁移或配置调整后重启 API。初始化失败的 ready Promise 保留失败状态，不会因为数据库后来补表就自动恢复；需要从新进程重新初始化。表存在也不等于完整结构及运行账号权限正确，不要据此盲目重跑全量脚本或执行宽泛授权。

本次追加可提交的诊断源码：`api/app/lib/service/startupDiagnostics.js`、`agentPlatform.js`、`terminalGateway.js`，以及 `api/test/agent-startup-diagnostics.test.js`。服务端日志显示 stage/model/code 和原因指引，不打印错误原文、SQL、连接串或凭据；HTTP 响应继续使用既有通用错误，不自动迁移或跳过失败初始化。典型错误码：`42P01` 缺表/库或 schema 不符、`42703` 缺字段、`42501` 数据库权限、`MODEL_NOT_LOADED` 模型未加载、`EACCES/EPERM` 目录权限、`EROFS` 只读挂载。Agent 的阶段区分 uploads-directory、alarms-directory 和 database，Terminal 为 session-reconcile。

原日志无法区分数据库失败与文件系统失败；新增回归在真实初始化入口复现权限/缺字段、模型缺失、路径被文件占用，并验证日志不泄漏凭据或 SQL。新增测试和已有 Agent 控制器/Terminal 网关相关测试合计 33 项通过；未连接测试数据库，尚未取得目标环境的具体失败码，不能宣布该 500 已解决。诊断代码需要提交、构建新版 API 镜像并部署后才能看到新日志；截图之后尚未修改测试库、集群或板端。

### 视频通道停用修复（2026-10-12）

用户实际请求 `enabled=false, transport="TCP"` 被 Node 的小写枚举校验拒绝。前端列表、编辑和开关请求统一为小写，Node 兼容大小写和空格；仍限制 TCP/UDP，保留账号密码和 optimistic revision 校验。

Node 根据 Agent 确认的通道配置处理停用：结束对应进行中的 `channel_abnormal`/`detection_abnormal`，状态为 `closed`、结果为 `none`，保留历史和结束时间，不生成 `auto_recover` 或声称恢复成功。设备离线异常不受影响。已停用通道的旧缓存不再影响设备列表；旧版本/停用版本的迟到遥测被忽略，重新启用的新版本允许产生新的真实异常。查询已停用通道时也会处理遗留记录。Web 停用成功后刷新异常页，并支持“已关闭”展示和筛选。

临时视频源已经关闭，但配置仍启用时，继续拉流并产生异常是正常行为；应在视频通道页停用不用的源。只关闭源不会自动删除通道配置。本次更新 Node/Web 即可，无新增数据库脚本或 Agent/Detector 二进制改动。

本次手工 SVN 提交目标：

- `api/app/lib/controllers/firmwareUpgrade/edge-agent.js`
- `api/app/lib/service/agentPlatform.js`（同时含此前未提交的启动诊断改动，须保留其依赖 `startupDiagnostics.js`）
- `api/test/edge-agent.test.js`、`api/test/agent-platform.test.js`
- `web/client/src/sections/edgeDevice/actions/edgeDevice.js`
- `web/client/src/sections/edgeDevice/components/common.jsx`
- `web/client/src/sections/edgeDevice/constants/index.js`
- `web/client/src/sections/edgeDevice/containers/deviceDetail.jsx`
- `web/test/edge-agent-contract.test.cjs`、`web/readme.md`、本文档

提交文字：`fix: 修复历史 TCP/UDP 配置导致视频通道停用失败；确认停用后关闭关联异常并保留历史，避免停用通道旧状态影响设备汇总，支持已关闭状态筛选与刷新。`

验证：API 串行完整回归 92/92、Web 完整回归 21/21 通过；生产 Web 构建成功，3 项既有包体积/性能警告。Chrome 页面实测停用确认、实际 `tcp`/`enabled=false` 请求、密码保留、两条异常自动刷新为“已关闭”及筛选通过，无页面脚本异常。使用生产 React 输出、真实 Node 控制器与 AgentPlatform、内存数据库和模拟 Agent，不连接真实板子或测试数据库；Browser 插件不可用，使用已有 Playwright/Chrome。未提交 SVN、构建发布镜像或部署测试环境。

### 常规发布步骤

1. 提交两个 SVN 仓库，记录 revision；从提交后的版本构建 Node 和 Web，更新镜像/服务。Web 的 `API_URL` 指向本次设备 Node 后台；`API_POMS_URL` 是另一项配置，不可拿它替代设备接口地址。
2. 合并现有 K8s Ingress：`/api/v1/agents/*` 与 `/terminal/connect` 原路径直接转发设备 Node Service，支持 WebSocket、长连接、上传大小和 Range；保留 React 和 `/_api` 路由。模板 `node-agent-ingress.example.yaml` 中的 namespace/Service/port/TLS 必须替换，不能直接原样应用。
3. 发布 Node/Web 后检查入口真实响应。`/healthz` 返回 React HTML 不能证明 Agent 入口正常；注册、WebSocket 和文件下载按实际设备协议验证。
4. 测试板交付 Linux ARM64 Agent；使用现有实际配置文件，把 `server_url` 指向已开通入口的 `https://dvcplttest.anxinyun.cn`。保留原设备状态、本地数据库、接收目录及 Detector 配置。`agent.kickpi-test.json` 只是示例，地址及远程重启选项按实际板子复核。
5. 停止板端 Agent 服务，替换程序并确保可执行权限，重启服务。仓库示例为 `agent_watchdog`，实际读取 `/home/kickpi/testAgent/configs/agent.example.json`；先核对实际 `ExecStart`。不要只杀死与服务命令不匹配的相对路径进程。
6. 收到下一次心跳后刷新页面，确认设备在线；验证通过后停用旧 Go Cloud。V1 Cloud 的文件、任务及告警未自动迁入，新测试模型需重新上传。

新增温度无需单独 SQL：Linux 读取 thermal zone 并上报摄氏度，Node 保存到既有设备 JSONB，缺失显示“—”。重启 ID 修复只需新版 Node，新请求使用 32 位 ID；旧失败记录保留。实际重启需要板端允许远程重启及系统授权；仅收到 accepted 不等于成功，必须观察新 boot_id 和恢复心跳。

## 测试环境验收

| 项目 | 验收现象 |
| --- | --- |
| 登录与权限 | 现有账号可进入边缘设备及模型页，未登录调用被拒绝 |
| 在线与指标 | 板端注册/心跳，CPU/内存/磁盘及容量两位小数；传感器可用时温度显示 |
| 模型上传 | 请求返回成功且可保存版本；七牛对象与数据库元数据存在，失败可重试 |
| 文件下发 | Agent 下载七牛文件，校验完成后任务成功；断网恢复可补发 |
| 通道与告警 | 查询/修改/只读探测、告警补报和图片、异常恢复状态符合设备回执 |
| 远程终端 | 浏览器连接成功，命令/输出及会话详情正常，退出后会话结束 |
| 重启 | 明确允许时手工确认一次，观察新操作 ID、回执、离线和新 boot_id 上线；同幂等键不重复执行 |

本机通过不替代上述集群/真机验收。发布前后均保留日志和 revision；失败时使用备份的旧镜像/程序与路由回退，保留 Agent 状态和本地库。不要在回退时运行清空数据库的接口或全量建库 SQL。

## 验证与交付文件

API 最新串行 85 项回归通过，含真实 Go Agent 对接及重启 ID 校验（远程重启禁用，无真实重启）。本轮 Web 19 项回归通过。此前真实七牛与本机数据库上传验证成功且清理了验证对象；Chrome 完成相关页面交互验证。真机重启/温度、集群入口和容器构建尚未验证。

本轮生产 Web 构建成功，保留原生产编译规则与压缩，仅输出目录改到附件；3 项警告为 bundle/entrypoint 体积及性能建议（入口约 9.41 MiB），另有既有 Webpack 废弃 API 提示，未将其关闭。未构建容器镜像。

Agent 从当前 SVN 工作副本 export 版本化源码与已登记新增文件后单独执行 `go test ./cmd/agent ./internal/protocol`、`go vet`，全部通过；不包含本机未版本化旧测试。Linux ARM64 与 Windows AMD64 使用 `-buildvcs=false -trimpath` 编译成功。该校验值与此前直接在工作副本构建的文件不同，测试交付以本次交接包为准。

| 文件 | SHA-256 |
| --- | --- |
| agent-linux-arm64 | `EDAFBEF7AA31EB7F5A5CD3A43446D9CA1A7E2BE9F372DD179DB6724D08324FC5` |
| agent.exe | `C7000F54B0A4E74E1C0E46C90DC7ACFA486EC207B8A39726D5878B8F1C3813FF` |

交付包位于 `C:/Users/q2205/.codex/attachments/node-agent-release-20261010-handoff.zip`，包含 Agent、示例配置、三项 SQL、原生产 Web 静态输出、接口集合、发布说明、提交目标/文字与 SHA-256 清单。它不含 Node 服务镜像/完整依赖，不能代替两套 SVN 源码发布；私有配置和设备状态文件未打包。测试环境 AK/SK 及数据库凭据通过部署配置提供。

该包来自提交前工作副本，尚无本次 release revision。人工提交后记录两个新 revision，再用对应源码构建正式镜像；验证目标环境入口、真机温度/重启及集群配置后发版。

