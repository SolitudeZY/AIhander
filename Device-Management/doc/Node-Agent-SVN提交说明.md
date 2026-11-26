# Node-Agent SVN 提交清单与提交文字

整理日期：2026-10-10。供人工提交，未执行 SVN commit 或环境部署。两套工作副本属于不同仓库，应分别提交，不能在 AIhander 父目录把两者当成一笔提交。以下清单来自当前 SVN 状态；没有修复或执行参数模板等旧业务迁移，也没有将管理员恢复操作写成源代码迁移。

## 提交范围

- Node 承接独立 Go Cloud 的设备协议、模型文件/任务/告警/异常管理及终端通道；React 改用 /edgeAgent；删除 Go Cloud 和旧 /edgeCloud 代理。
- 模型文件上传七牛并保存元数据，下发签名地址由 Agent 直接下载；修复上传进度满后请求不结束、上传失败清理和重试。
- 完善本地 Node-Agent 启动及 PostgreSQL/Redis/七牛示例配置，修复现代 Node 与旧路由/数据库驱动兼容、注册等待/错误提示、Web 编译警告和文件监听。
- 修复模型筛选分页超出 100 限制；旧固件服务缺依赖时明确返回 503，固件库统一提示并禁用依赖操作。
- 设备详情使用率、容量、温度显示两位小数；补齐 Agent 温度采集、Node 心跳存储及 React 映射。
- 修复重启操作 `invalid_request`：Node 新建重启 ID 改为兼容现有 Agent 的 32 位格式，保留历史失败记录、幂等重放和原有回执检查。
- 提交相关 SQL、测试、接口集合、部署示例及维护文档。保留历史协议来源角色和旧数据库字段以兼容设备及存量数据。

## Device-Management 提交文字

```text
迁移边缘设备管理至 Node-Agent，移除独立 Cloud 代理并接入七牛模型存储

1. Node 直接承接 Agent 注册鉴权、WebSocket、设备/任务/告警/异常持久化及远程终端；React 改用 /edgeAgent，移除旧 /edgeCloud 代理。
2. 模型文件经 Node 上传七牛，下发签名下载地址；修复上传 100% 后不返回、失败清理及前端重试状态。
3. 完善本地启动和配置示例，修复现代 Node 下路由及 PostgreSQL 驱动兼容、注册等待和前端依赖警告。
4. 修复升级任务模型选项分页上限、旧固件服务缺配置时的异常与连续弹错。
5. 设备详情使用率/容量/温度统一显示两位小数，保存 Agent 温度心跳，缺失读数不保留旧温度。
6. 修复 Node 36 位重启操作 ID 被 Agent 拒绝的问题，改为协议约定的 32 位格式，保留旧失败记录和幂等保护。
7. 补充数据库迁移、回归测试、接口迁移和部署文档。

验证：API 串行 85 项、Web 19 项测试通过；Chrome 验证模型上传状态、分页/固件能力及指标显示。真实 Go Agent 验证新重启 ID 通过校验，测试禁用实际重启。真机重启、温度和测试环境部署待验证。
```

### 明确勾选清单（90 项，含目录与属性）

工作副本：`E:/Python_Prj/landSlide/ZY/rk3576_deploy/AIhander/Device-Management`。新增目录与其新增文件一起勾选；api 目录包含私有配置的忽略属性。web/build/peace-antd-compat.js 是构建插件源码，必须提交。

| SVN 状态 | 相对工作副本路径 |
| --- | --- |
| P 目录属性 | `api` |
| A 新增 | `api/agent-local.env.example` |
| M 修改 | `api/app/lib/controllers/auth/index.js` |
| A 新增 | `api/app/lib/controllers/firmwareUpgrade/edge-agent.js` |
| D 删除 | `api/app/lib/controllers/firmwareUpgrade/edge-cloud.js` |
| M 修改 | `api/app/lib/controllers/firmwareUpgrade/index.js` |
| M 修改 | `api/app/lib/index.js` |
| M 修改 | `api/app/lib/middlewares/authenticator.js` |
| A 新增 | `api/app/lib/models/edge_agent_record.js` |
| M 修改 | `api/app/lib/models/edge_remote_session.js` |
| M 修改 | `api/app/lib/models/edge_upgrade_task_device.js` |
| M 修改 | `api/app/lib/models/edge_visual_model.js` |
| M 修改 | `api/app/lib/models/project_device.js` |
| A 新增 | `api/app/lib/routes/firmwareUpgrade/edge-agent.js` |
| D 删除 | `api/app/lib/routes/firmwareUpgrade/edge-cloud.js` |
| M 修改 | `api/app/lib/routes/firmwareUpgrade/index.js` |
| A 新增 | `api/app/lib/service/agentDownloads.js` |
| A 新增 | `api/app/lib/service/agentFileStorage.js` |
| M 修改 | `api/app/lib/service/agentGateway.js` |
| A 新增 | `api/app/lib/service/agentMultipartUpload.js` |
| A 新增 | `api/app/lib/service/agentPlatform.js` |
| A 新增 | `api/app/lib/service/legacyNodeCompat.js` |
| A 新增 | `api/app/lib/service/postgresCompat.js` |
| M 修改 | `api/app/lib/service/terminalGateway.js` |
| M 修改 | `api/app/lib/utils/index.js` |
| M 修改 | `api/config.js` |
| M 修改 | `api/package-lock.json` |
| M 修改 | `api/package.json` |
| M 修改 | `api/server.js` |
| A 新增 | `api/start-agent.js` |
| A 新增 | `api/test/agent-gateway.test.js` |
| A 新增 | `api/test/agent-local-config.test.js` |
| A 新增 | `api/test/agent-platform-fixture.cjs` |
| A 新增 | `api/test/agent-platform.test.js` |
| A 新增 | `api/test/agent-qiniu.test.js` |
| A 新增 | `api/test/auth-register.test.js` |
| A 新增 | `api/test/edge-agent.test.js` |
| A 新增 | `api/test/firmware-service.test.js` |
| A 新增 | `api/test/node-agent-smoke.test.js` |
| A 新增 | `api/test/postgres-compat.test.js` |
| M 修改 | `api/test/terminal-gateway.test.js` |
| A 新增 | `doc` |
| A 新增 | `doc/Node-Agent-SVN提交说明.md` |
| A 新增 | `doc/Node-Agent七牛与本地调试.md` |
| A 新增 | `doc/Node-Agent发布交接.md` |
| A 新增 | `doc/Node-Agent迁移计划.md` |
| A 新增 | `doc/legacy-cloud-tests` |
| A 新增 | `doc/legacy-cloud-tests/edge-cloud-exceptions.test.js.txt` |
| A 新增 | `doc/legacy-cloud-tests/edge-cloud-video-channels.test.js.txt` |
| A 新增 | `doc/node-agent-ingress.example.yaml` |
| A 新增 | `doc/node-agent-launch.example.json` |
| M 修改 | `script/2.0.0/1.create_edge_cloud_management.sql` |
| M 修改 | `script/2.0.0/2.add_remote_session_recording.sql` |
| A 新增 | `script/2.0.0/3.node_agent_platform.sql` |
| A 新增 | `script/2.0.0/README.md` |
| A 新增 | `script/README.md` |
| A 新增 | `web/build` |
| A 新增 | `web/build/peace-antd-compat.js` |
| M 修改 | `web/client/src/components/export-data.jsx` |
| M 修改 | `web/client/src/sections/analysis/components/export-data.jsx` |
| M 修改 | `web/client/src/sections/auth/actions/auth.js` |
| M 修改 | `web/client/src/sections/auth/containers/login.jsx` |
| M 修改 | `web/client/src/sections/edgeDevice/actions/edgeDevice.js` |
| M 修改 | `web/client/src/sections/edgeDevice/actions/index.js` |
| M 修改 | `web/client/src/sections/edgeDevice/components/channel-modals.jsx` |
| M 修改 | `web/client/src/sections/edgeDevice/components/common.jsx` |
| M 修改 | `web/client/src/sections/edgeDevice/components/device-modals.jsx` |
| M 修改 | `web/client/src/sections/edgeDevice/components/event-components.jsx` |
| M 修改 | `web/client/src/sections/edgeDevice/components/model-components.jsx` |
| M 修改 | `web/client/src/sections/edgeDevice/components/remote-modals.jsx` |
| M 修改 | `web/client/src/sections/edgeDevice/containers/deviceDetail.jsx` |
| M 修改 | `web/client/src/sections/edgeDevice/containers/edgeDeviceList.jsx` |
| M 修改 | `web/client/src/sections/edgeDevice/containers/upgradeTask.jsx` |
| M 修改 | `web/client/src/sections/edgeDevice/hooks/useTerminalSocket.js` |
| M 修改 | `web/client/src/sections/firmwareUpgrade/actions/firmwareUpgrade.js` |
| M 修改 | `web/client/src/sections/firmwareUpgrade/containers/firmwareLibrary.jsx` |
| M 修改 | `web/client/src/sections/system/containers/index.js` |
| M 修改 | `web/client/src/utils/webapi.js` |
| M 修改 | `web/config.js` |
| A 新增 | `web/middlewares/legacy-node-compat.js` |
| M 修改 | `web/readme.md` |
| M 修改 | `web/server.js` |
| A 新增 | `web/test/auth-register.test.cjs` |
| A 新增 | `web/test/edge-agent-contract.test.cjs` |
| A 新增 | `web/test/firmware-capabilities.test.cjs` |
| A 新增 | `web/test/peace-antd-compat.test.cjs` |
| M 修改 | `web/test/remote-session-history.test.cjs` |
| A 新增 | `web/test/server-startup.test.cjs` |
| M 修改 | `web/webpack.config.js` |
| M 修改 | `web/webpack.config.prod.js` |

### 不勾选

- `api/.vscode/launch.json`：混有本机数据库地址/调试配置；共享调试入口已提供在 `doc/node-agent-launch.example.json`。
- `api/agent-local.env`：私有数据库/七牛凭据，已被 `api` 目录的 `svn:ignore` 忽略。应提交目录的该属性和 `agent-local.env.example`。
- `api/data/`：本机上传、告警及运行数据；根目录未版本化 `package-lock.json`；node_modules、日志、编译产物和临时截图/诊断脚本。
- 本次没有新增参数模板表、清理业务数据或将私有账号密码写入提交资料。

## FirmwareUpgrade 提交文字

```text
退役 V1 Go Cloud，Agent 改接 Node 并支持七牛下载和设备温度心跳

1. 删除 cmd/cloud 服务及旧 Cloud 冒烟脚本，构建入口和默认配置切换为 Node-Agent，保留 setUp 与 Detector。
2. 支持七牛签名下载、断点续传；外部请求和重定向不携带设备 Token，下载日志隐藏签名参数。
3. Linux Agent 读取 thermal zone 温度并上报可选 temperature_celsius，传感器不可用不影响正常心跳。
4. 更新接口集合、测试配置、构建/部署和 Cloud 退役说明，归档旧测试原文。

验证：go test ./...、go vet ./... 及 Windows AMD64/Linux ARM64 Agent 编译通过；真机温度和新版板端部署待验证。
```

### 明确勾选清单（29 项，含目录与属性）

工作副本：`E:/Python_Prj/landSlide/ZY/rk3576_deploy/AIhander/FirmwareUpgrade`。cmd/cloud 的删除代表整棵旧服务树删除；新温度源码及测试已登记新增。

| SVN 状态 | 相对工作副本路径 |
| --- | --- |
| M 修改 | `README.md` |
| M 修改 | `apifox-openapi.json` |
| A 新增 | `cmd/agent/device_temperature.go` |
| A 新增 | `cmd/agent/device_temperature_test.go` |
| M 修改 | `cmd/agent/main.go` |
| M 修改 | `cmd/agent/main_test.go` |
| A 新增 | `cmd/agent/qiniu_download_test.go` |
| D 删除 | `cmd/cloud` |
| M 修改 | `configs/agent.example.json` |
| A 新增 | `configs/agent.kickpi-test.json` |
| M 修改 | `doc/Cloud接口更新与测试.md` |
| A 新增 | `doc/Go-Cloud退役说明.md` |
| M 修改 | `doc/TERMINAL.md` |
| M 修改 | `doc/WebShell命令结果最小升级说明.md` |
| A 新增 | `doc/legacy-cloud-tests` |
| A 新增 | `doc/legacy-cloud-tests/device_operations_test.go.txt` |
| A 新增 | `doc/legacy-cloud-tests/event_queries_test.go.txt` |
| A 新增 | `doc/legacy-cloud-tests/exceptions_test.go.txt` |
| A 新增 | `doc/legacy-cloud-tests/requirements_test.go.txt` |
| M 修改 | `doc/事件告警与设备操作接口.md` |
| M 修改 | `doc/交互文档.md` |
| M 修改 | `doc/具体方案.md` |
| M 修改 | `doc/构建.bat` |
| M 修改 | `doc/构建.md` |
| M 修改 | `doc/画面质量阈值与远程会话结果联调说明.md` |
| M 修改 | `doc/远程会话持久化与脱敏接口设计.md` |
| M 修改 | `internal/protocol/protocol.go` |
| M 修改 | `main.go` |
| D 删除 | `test/smoke_cloud_agent.py` |

### 不勾选

- `doc/边缘设备与云端管理 V2.0 需求说明书.docx`：原有用户文档修改，不纳入本次源码迁移。
- `bin/`、本地数据库、状态文件、接收文件、日志、vendor 及历史 Cloud 二进制。
- 原来尚未版本化的测试：`cmd/agent/device_reboot_test.go`、`terminal_isolation_test.go`、`terminal_isolation_unix_test.go`、`terminal_output_utf8_test.go`、`video_probe_test.go`，以及 `test/test_detector_model_paths.py`。保留本机文件，未自动登记或混入本次目标；如另行提交旧工作，需按该工作的实际范围复核。

## 验证与交付边界

- 当前 API 串行 85/85、Web 19/19；Go 全包测试及 vet 通过。首轮多任务并行 API 测试出现终端回复/关闭时序失败，串行全量复核通过；本次未改终端实现。
- 新增 Node 重启 ID 协议回归：真实 Go Agent 禁用重启分支在修复前返回 invalid_request、修复后返回预期 disabled；验证仅调整 Node、旧失败记录可查、原幂等键不再次发送及新操作独立生成。没有执行真实系统重启；Node API 重启后关闭/重开弹窗再提交即可，无需更新 Agent 或 SQL。
- Chrome（1600×1000，http://127.0.0.1:5700）验证设备指标两位小数、容量、正常/零温/缺温状态，无页面脚本异常；本次温度验证使用真实 Node 心跳实现和内存持久化替身，未读取 RK3576 真实传感器。Browser 插件不可用，使用现有 Playwright 与 Chrome。
- 先前模型上传用修复后控制器、真实本机 PostgreSQL 和七牛验证返回 201，验证对象/记录已清理；管理员恢复与真实本地登录也已验证。旧固件和 ClickHouse 上游没有真实联调，不能将替身测试当成外部服务已部署。
- 先前 Go 全包检查在当前工作副本运行；本轮另从 SVN 版本化 Agent/协议源码导出独立副本，排除未版本化旧测试后，测试/vet/双架构编译通过。尚未执行提交后全新检出或容器验证。
- 当前 ARM64 交付文件为交接包内 `agent/agent-linux-arm64`，SHA-256：`EDAFBEF7AA31EB7F5A5CD3A43446D9CA1A7E2BE9F372DD179DB6724D08324FC5`；`agent.exe` 仅供 Windows 调试。此次从版本化源码导出并使用 trimpath 构建，交付以本轮交接包为准，二进制不作为 SVN 源码目标。
- 部署顺序：按 SQL README 执行必要增量 → 更新 Node 依赖和 API 并重启 → 更新/编译 Web → 替换 ARM64 Agent 并重启看门狗 → 等下一次心跳刷新设备详情。Agent 原配置、状态和本地库保留。温度新增存于既有 JSONB，不需要额外 SQL。

## 手动提交检查

1. 分别在两个工作副本打开提交窗口，选择清单内的 A/M/D 和目录属性；不要直接将“所有未版本化文件”全部添加。
2. 使用对应的提交文字；删除项、锁文件、数据库增量和新增源码/测试同时提交。
3. 完成后查看 SVN 状态，清单内源码应已提交，私有配置/运行数据和排除的旧工作保留。

## 发布交接材料

完整发布顺序、数据库与集群配置、验收和回退步骤见 [Node-Agent发布交接](Node-Agent发布交接.md)。本轮生产 Web 编译成功（3 项体积/性能警告）；版本化 Agent 源码导出检查及双架构编译通过。交接包位于 Codex 附件目录，程序 SHA-256 以发布交接文档和包内清单为准。远端权限管理两个无本机改动的文件已同步到 r229；这不是本次提交 revision。未提交 SVN 或部署。
