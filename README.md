<div align="center">

# AIhander

### 云-端协同的 AI 设备管理平台

**云端统一管理 · 设备 Agent 常驻 · RK3576 端侧滑坡检测**

[![Go](https://img.shields.io/badge/Go-1.26-00ADD8?logo=go&logoColor=white)](FirmwareUpgrade/go.mod)
![Python](https://img.shields.io/badge/Python-3.11%2B-3776AB?logo=python&logoColor=white)
![React](https://img.shields.io/badge/React-17-61DAFB?logo=react&logoColor=black)
![WebSocket](https://img.shields.io/badge/Transport-WebSocket-4B32C3)
![MQTT](https://img.shields.io/badge/Integration-MQTT-660066)
![RK3576](https://img.shields.io/badge/NPU-RK3576-EA4AAA)
![License](https://img.shields.io/badge/License-Unlicensed-lightgrey)

**Cloud 下发 · Agent 执行 · Detector 感知**

</div>

---

## 这是什么

AIhander 是一套面向 **RK3576 边缘设备**的云-端协同 AI 设备管理平台。它把「设备台账、模型下发、视频通道、告警事件、远程终端、AI 复核」放在云端，把「注册心跳、任务下载、断线重试、告警上报」放在设备侧，把「RTSP 拉流 + NPU 推理」放在端侧检测器里，三条链路各司其职。

- **Cloud** 是你的管理台：浏览器里看设备在线、配通道、发模型、查告警、开远程终端；
- **Agent** 是设备上的常驻 Go 进程：主动外连云端的 WebSocket，下载并安装文件，把端侧状态和告警回传；
- **Detector** 是贴着摄像头的 Python 推理进程：直接拉 RTSP，用 RKNN 在 NPU 上跑滑坡检测，检测到就把带框截图交给 Agent。

平台采用**设备主动外连**的拓扑：Agent 只作为 WebSocket/HTTP 客户端连接云端，因此设备侧不需要开放任何入站端口；Detector 通过本机 WebSocket 与 Agent 通信，摄像头、模型、推理数据都不出内网。任务、通道、重启操作均带 revision / operation ID，支持断线重连后的幂等重放。

> 本仓库是 `cloud / agent / detector` 三部分的**源码快照**。构建产物、依赖目录、模型权重与现场凭据都已剥离或替换为占位符，请在本地按 [快速开始](#快速开始) 补齐环境；具体清单见 [已知限制与未入库内容](#已知限制与未入库内容) 和 [安全说明](#安全说明)。

---

## 平台全景

```mermaid
flowchart LR
    subgraph EDGE["RK3576 边端设备"]
        CAM["RTSP 摄像头"]
        DET["Detector (Python)<br/>detector.py<br/>WebSocket :8090"]
        AG["Agent (Go)<br/>cmd/agent<br/>agent 0.4.1"]
        SQL[("SQLite<br/>agent.db + 告警队列")]
        CAM -->|"RTSP / TCP"| DET
        DET <-->|"channelSet / channelStatusChanged<br/>alarmDetected"| AG
        AG --> SQL
    end

    subgraph CLOUD["云端"]
        WEB["React 管理台<br/>web · :5700"]
        API["Node API (Koa)<br/>api · :4700"]
        PG[("PostgreSQL")]
        RD[("Redis")]
        OSS[("七牛对象存储")]
        WEB -->|"HTTP /_api 代理"| API
        API --> PG
        API --> RD
        API --> OSS
    end

    AG -->|"HTTP POST /api/v1/agents/register"| API
    AG <-->|"WebSocket /api/v1/agents/connect<br/>heartbeat · task.assign · alarmReport · terminal"| API
    API -->|"MQTT / HTTP 告警推送"| EXT["第三方告警平台"]
```

**三段链路，三类消息：**

| 链路 | 传输 | 方向 | 典型消息 |
| --- | --- | --- | --- |
| Cloud ↔ Agent | WebSocket（主）+ HTTP（注册/文件） | Agent 主动外连 | `heartbeat`、`task.assign` → `task.status`、`alarmReport` → `alarmReportResult`、`channelList/Set/Delete`、`deviceReboot`、终端帧 |
| Agent ↔ Detector | 本机 WebSocket（`ws://127.0.0.1:8090`） | Agent 主动连接 | `channelList/Set/Delete`、`logList` → 结果消息、`channelStatusChanged`、`alarmDetected` |
| Cloud → 第三方 | MQTT / HTTP | 云端主动推送 | 告警订阅与投递（`alarmPush`、平台集成配置） |

---

## 三部分对照表

| 部分 | 目录 | 职责 | 技术栈 | 入口文件 |
| --- | --- | --- | --- | --- |
| **Cloud** | `Device-Management/` | 设备/项目/用户台账，视觉模型与文件投递，升级任务与回执，视频通道与画面质量，告警事件与 AI 复核，远程终端与录制，平台集成推送 | Node.js（Koa，`fs-web-server-scaffold`）、Sequelize + PostgreSQL、Redis、WebSocket（`ws`）、七牛存储；前端 React 17 + Redux + Ant Design 5 + Webpack 5 | `Device-Management/api/server.js`、`Device-Management/web/server.js`、`Device-Management/web/client/index.js` |
| **Agent** | `FirmwareUpgrade/` | 设备注册与心跳、文件下载/校验/安装、通道镜像与下发、告警本地排队与上报、远程终端（PTY）、远程重启、运行指标与温度采集 | Go 1.26（`go.mod`）、`coder/websocket`、`modernc.org/sqlite`、`gopsutil`、`creack/pty` | `FirmwareUpgrade/cmd/agent/main.go`（辅助入口 `cmd/setup`、`cmd/detector-demo`） |
| **Detector** | `detector-local/` | 按频道拉 RTSP，模型热更新，RKNN NPU 滑坡推理，画面质量指标，告警截图与状态广播，端侧日志服务 | Python 3.11+、`websockets`、OpenCV（headless）、NumPy、Pillow、`rknn-toolkit-lite2` | `detector-local/detector.py` |

> 目录名保留团队原有习惯：`Device-Management`（云）、`FirmwareUpgrade`（Agent）、`detector-local`（Detector）。Hander = Handler，即“处理云-端协同的那只手”。

**仓库规模（本快照）：** 约 **1,021 个文件 / 92 MB**，其中 Cloud 898 个、Agent 99 个、Detector 24 个；最大单文件为 10.5 MB 的前端背景图。

---

## 仓库结构

```text
AIhander/
├── Device-Management/                 # Cloud：管理台 + Node API
│   ├── api/                           # Koa API
│   │   ├── app/lib/controllers/       # 设备/模型/任务/告警/终端/AI 复核等业务
│   │   ├── app/lib/routes/            # 按目录自动注册路由
│   │   ├── app/lib/service/           # agentGateway、terminalGateway、七牛、MQTT 推送…
│   │   ├── app/lib/models/            # Sequelize 模型
│   │   ├── config.js                  # 启动参数 + 环境变量
│   │   ├── server.js                  # API 入口
│   │   └── agent-local.env.example    # 本地精简模式配置样例（无真实凭据）
│   ├── web/                           # React 17 管理台 + Node 静态/代理服务
│   │   ├── client/src/sections/       # edgeDevice / firmwareUpgrade / system / alarm…
│   │   ├── middlewares/               # /_api 代理、附件转发
│   │   ├── routes/                    # /api/root 等运行时配置
│   │   └── server.js
│   ├── doc/                           # Node-Agent 迁移、发版交接、终端诊断等
│   └── script/                        # PostgreSQL 增量脚本（含 2.0.0 / 2.1.0）
├── FirmwareUpgrade/                   # Agent：设备侧 Go 常驻服务
│   ├── cmd/agent/                     # 主 Agent（注册/心跳/任务/告警/终端/重启）
│   ├── cmd/setup/                     # 局域网 setUp 调试页
│   ├── cmd/detector-demo/             # 本地 Detector 仿真端点（测试用）
│   ├── internal/protocol/             # WebSocket 消息结构体与编解码
│   ├── configs/                       # agent.example.json / agent.kickpi-test.json
│   ├── detector/                      # 板端 Detector 副本（与 detector-local 同源）
│   ├── doc/                           # 方案、交互、构建、接口、终端文档
│   ├── script/                        # systemd、sudoers、PTY shell 模板
│   └── test/                          # Python 合同测试
└── detector-local/                    # Detector：端侧滑坡检测器（Python）
    ├── detector.py                    # WebSocket 服务 + 通道线程 + 告警上报
    ├── model_runtime.py               # 模型热更新运行时
    ├── model_paths.py                 # 模型目录解析与路径校验
    ├── channels.json                  # 通道配置样例（凭据已脱敏）
    ├── build.py / deploy.py           # PyInstaller 打包 / paramiko 板端同步
    ├── detector.service               # systemd 单元
    ├── tests/                         # 协议、模型替换、打包校验单测
    ├── img/                           # 通道图与事件图
    ├── 管理web原型/                   # HTML 交互原型
    ├── README.md                      # Detector 部署与验证说明
    └── 具体方案.md                    # 整体方案（含 Agent/Detector 协议）
```

---

## 快速开始

> 三个部分可独立启动：只调 Cloud 时不需要真机；只调 Agent/Detector 时不需要完整平台。先跑通“进程能起来、协议能收发”，再接入真实设备与 NPU。

### 1) Cloud：Node API + React 管理台

依赖：Node.js（API 生产环境兼容 Node 12，Web 构建建议 Node 22）、PostgreSQL、Redis；完整平台还需要 Camunda / ClickHouse / ES 等外部服务（精简模式会跳过）。

```bash
cd Device-Management/api
cp agent-local.env.example agent-local.env    # 填 POMS_DB、Redis、七牛等私有配置；不要提交
npm install
npm run check:runtime                         # 不连真实数据库/七牛，做运行时冒烟
npm run start:agent                           # Edge-Agent 精简模式，默认监听 4700
```

`start:agent` 会加载 `agent-local.env` 并以 `EDGE_AGENT_LOCAL=true` 启动，只保留设备/Agent/告警/终端等边缘能力，跳过 Camunda、ClickHouse 等旧业务依赖；`npm start` 则是完整平台入口，参数较多，按 [发布交接文档](Device-Management/doc/Node-Agent发布交接.md) 配置。

数据库结构：在已有管理平台基础库上按顺序执行 `Device-Management/script/2.0.0/`、`2.1.0/` 下的增量脚本，执行前检查与顺序见 [script/README.md](Device-Management/script/README.md) 与 [2.0.0/README.md](Device-Management/script/2.0.0/README.md)。

前端：

```bash
cd Device-Management/web
npm install
npm start          # 开发服务 :5700，/_api 代理到 Node API
npm run build      # Webpack 生产构建，输出到 build/
```

`web/package.json` 的 `start-params` 附带一份本地联调默认参数（API/七牛/地图等），请按实际环境替换地址与密钥；Web 缺少必填参数时会打印提示并退出，这是设计行为。

### 2) Agent：设备侧 Go 服务

依赖：Go 1.26（`go.mod` 声明 `go 1.26.0`，推荐工具链 1.26.5）。`vendor/` 与 `bin/` 未入库，首次构建需联网拉依赖。

```bash
cd FirmwareUpgrade
go mod download
go test ./...
go vet ./...
go run -buildvcs=false ./cmd/agent -config ./configs/agent.example.json
```

交叉构建 RK3576 可执行文件：

```bash
GOOS=linux GOARCH=arm64 go build -buildvcs=false -trimpath -o bin/test/agent-linux-arm64 ./cmd/agent
go build -buildvcs=false -trimpath -o bin/test/agent.exe ./cmd/agent     # Windows 联调
```

设备配置 `configs/agent.example.json` 的关键字段：

```jsonc
{
  "server_url": "http://YOUR_CLOUD_HOST:4700",     // Node API 根地址，不要带 /api/v1
  "device_name": "kickpi",
  "state_file": "/home/kickpi/testAgent/agent-state.json",
  "database_file": "/home/kickpi/testAgent/db/agent.db",
  "allowed_target_dir": "/home/kickpi/testAgent/received-firmware",
  "detector_ws_url": "ws://127.0.0.1:8090",
  "heartbeat_interval_seconds": 60,
  "sku": "RK3576",
  "runtime_version": "2.0",
  "model_version": "2.0",
  "terminal": { "enabled": true, "shells": ["/bin/bash"], "max_sessions": 2 },
  "allow_remote_reboot": false
}
```

Agent 启动后自动拼接 `/api/v1/agents/register` 与 `/api/v1/agents/connect`；状态文件按服务器 URL 分别保存 token，切换开发/测试环境只需改 `server_url` 并重启（详见 [Agent 多服务器认证状态](FirmwareUpgrade/doc/Agent多服务器认证状态.md)）。构建细节与 systemd 部署见 [构建.md](FirmwareUpgrade/doc/构建.md)、[README](FirmwareUpgrade/README.md)。

辅助入口（可选）：

```bash
go run -buildvcs=false ./cmd/setup -listen 127.0.0.1:8086 -agent-url ws://127.0.0.1:8085/api/v1/setup/connect -data-dir ./setup-data
go run -buildvcs=false ./cmd/detector-demo    # 模拟 Detector，在没有板子时联调通道/画质
```

### 3) Detector：端侧滑坡推理

依赖：Python 3.11+、`requirements.txt`（`websockets` / OpenCV / NumPy / Pillow）；真实推理还需要与板端 Python ABI、RK3576 驱动匹配的 `rknn-toolkit-lite2`。

```bash
cd detector-local
python -m pip install -r requirements.txt

export AGENT_WORK_DIR=/home/kickpi/testAgent
export AGENT_CONFIG_PATH=$AGENT_WORK_DIR/configs/agent.example.json
export DETECTOR_DATA_DIR=$AGENT_WORK_DIR/detector-data
export DETECTOR_REQUIRE_RKNN=1            # 生产必开：缺 RKNN 时直接失败，避免静默退化为只拉流

python detector.py --check                # 打印通道文件、模型搜索目录、RKNN 可用性
python detector.py                        # 启动 WebSocket 服务（默认 8090）
```

没有 NPU 的开发机可以只验证协议、拉流与画质：

```bash
DETECTOR_DISABLE_INFERENCE=1 python detector.py --check
DETECTOR_DISABLE_INFERENCE=1 python detector.py
```

> **共享推理工具未入库。** `detector.py` 会从仓库根目录（`detector-local` 的上一层）与更上层查找 `runtime_utils.py`、`infer_rknn.py`（`create_runtime` / `infer_frame` / `draw_detections`）。这两个文件在原工作区位于 `AIhander` 的父目录，本仓库未携带；需要 NPU 推理时，请把它们放到仓库根目录或 `detector-local/` 下的可见路径，或按 `DETECTOR_*` 说明改造导入。缺少它们时 Detector 仍可启动，但仅做拉流与画质，不产生推理告警。

systemd 安装：

```bash
# 按实际用户、路径、DEVICE_ID 修改 detector.service 后
sudo cp detector.service /etc/systemd/system/detector.service
sudo systemctl daemon-reload
sudo systemctl enable --now detector.service
journalctl -u detector.service -f
```

日志写入 `<DETECTOR_DATA_DIR>/logs/logInfo.log`，同时可通过 WebSocket 的 `logList` 拉取。

---

## Detector 深入

Detector 是这套平台里最“贴地”的一层：它没有数据库，不依赖云端 SDK，只做一个长期运行的 asyncio WebSocket 服务，为每个启用的通道维护一个拉流线程和一个模型运行时。

### 运行形态

- **服务**：`websockets.serve` 监听 `DETECTOR_HOST:DETECTOR_PORT`（默认 `0.0.0.0:8090`），只接受 `_from == "agent"` 的消息；
- **通道**：每个 `enabled` 通道一个 `ChannelWorker` 线程；`StreamReader` 线程持续解码最新帧，主循环以 `time.sleep(0.03)` 控制推理节奏，避免打满 CPU/NPU；
- **拉流**：强制 `OPENCV_FFMPEG_CAPTURE_OPTIONS=rtsp_transport;tcp`，减少 H.265/UDP 丢包；失败按 5s → 60s 指数退避重连，断线期间仍继续检查模型更新；
- **推理**：`infer_frame(runtime, frame, 640, 0.75, 0.6)` —— 640 输入、0.75 置信度阈值、0.6 IoU；检测到目标后画框，并做 **60 秒告警冷却**，取本帧最大置信度作为告警置信度；
- **告警**：结果进入线程安全 `queue.Queue`，由 asyncio 任务编码为 JPEG（质量 60）、base64 后广播 `alarmDetected`；
- **状态**：`channelStatusChanged` 周期广播 `status`、`inputFps`、`observedAt`、可选 base64 快照，以及画面质量四项指标；
- **画质指标**：`black_screen`、`occlusion`、`blur`、`brightness_abnormal`，均为 0–100 分（灰度均值、标准差、拉普拉斯方差推导），阈值解释由云端/Agent 侧决定；
- **日志**：JSONL 落盘 `<DETECTOR_DATA_DIR>/logs/logInfo.log`，默认 20 MB 上限；写日志前对 URL 中的账号口令与 `password/token/secret` 参数做脱敏；
- **CLI**：`--check` 只打印配置路径与 RKNN 可用性；`--check-model <model.rknn>` 加载模型跑一帧合成图并输出检测数与推理耗时。

### 模型运行时：`model_runtime.py`

`ModelRuntime` 是“模型热更新”的核心，构造参数：

```python
ModelRuntime(module_name, search_dirs, factory, on_event,
             poll_seconds=2.0, retry_seconds=30.0)
```

- `refresh()` 每约 2 秒检查一次模型文件签名：`(解析后路径, st_ino, st_size, st_mtime_ns, st_ctime_ns)`；
- 签名不变 → 直接复用当前 runtime；签名变化 → 调 `factory(path)` 初始化新 runtime；
- **初始化失败保留旧 runtime**，记录错误事件，`retry_seconds=30s` 后再试；
- 初始化成功后先切换引用，再 `release()` 旧 runtime，保证推理不中断；
- 初始化期间文件被替换 → 抛错并下轮重试，避免加载到写了一半的模型；
- `close()` 在通道线程退出时释放 runtime。

### 模型目录解析：`model_paths.py`

`model_search_dirs(detector_dir)` 按优先级返回模型目录：

1. `DETECTOR_MODEL_DIR`（显式指定，绝对路径或相对 `AGENT_WORK_DIR`）；
2. `AGENT_WORK_DIR / allowed_target_dir / <DETECTOR_MODEL_SUBDIR>`，默认即 `<Agent工作目录>/received-firmware/opt/edge/models`；`allowed_target_dir` 从 `AGENT_CONFIG_PATH` 指向的 Agent JSON 读取；
3. 旧布局 `<AGENT_WORK_DIR>/model`（兼容历史现场）。

约束与细节：

- `AGENT_WORK_DIR` 未设置时默认取 `detector-local` 的父目录；
- `DETECTOR_MODEL_SUBDIR` 必须是相对路径，禁止 `..` 逃逸；
- `resolve_model_path` 只接受纯文件名（拒绝路径分隔符与 `.`/`..`），找不到时返回首个搜索目录下的候选路径，交由后续加载报错；
- 云端下发的模型任务目标目录应为 `opt/edge/models`，最终文件名必须与通道的 `moduleName` 完全一致；
- Agent 下载时先写 `.part`，校验后重命名，因此 Detector 只会看到完整文件；同名覆盖不改变通道 `revision`，但会触发文件签名变化并自动重载。

### 通道配置：`channels.json`

Detector 启动时读取 `<DETECTOR_DATA_DIR>/channels.json`，运行中由 `channelSet` / `channelDelete` 修改并原子写回（临时文件 + `os.replace`）。**云端才是通道配置的源头**：Agent 把云端配置镜像给 Detector；手工改 JSON 需要重启 Detector 才生效。

```jsonc
{
  "CH-BE5F54F4": {
    "channelId": "CH-BE5F54F4",
    "name": "隧道口-左幅",
    "enabled": true,
    "rtspUrl": "rtsp://user:password@192.168.1.10:554/Streaming/Channels/101",
    "transport": "tcp",
    "moduleName": "landslide_yolov8n_int8_rk3576.rknn",
    "revision": 1,
    "isTest": false
  }
}
```

| 字段 | 含义 |
| --- | --- |
| `channelId` | 通道唯一 ID，与云端一致 |
| `name` | 展示名 |
| `enabled` | 是否启动拉流与推理 |
| `rtspUrl` | RTSP 地址；`transport` 仅作记录，实际强制 TCP |
| `moduleName` | 模型文件名，必须与磁盘上的 `.rknn` 完全一致 |
| `revision` | 配置版本，`channelSet` 时自增，用于云端侧幂等/冲突判断 |
| `isTest` | 测试通道：拉流前先做 2 秒 TCP 预检，失败静默重试，避免刷屏 |

仓库中的 `detector-local/channels.json` 与 `FirmwareUpgrade/detector/channels.json` 是**已脱敏的样例**（RTSP 账号口令替换为占位符），运行时会写入 `DETECTOR_DATA_DIR`，不要用样例覆盖生产配置。

### 打包：`build.py`

```bash
python build.py --source-only   # 只产出 dist/detector-source.zip（源码 + 共享工具）
python build.py                 # PyInstaller onedir 打包，产出 dist/detector/ 与平台压缩包
```

- 源码包固定收集：`detector.py`、`model_paths.py`、`model_runtime.py`、`requirements.txt`、`build.py`、`README.md`、`detector.service`、`tests/*.py`、`channels.example.json`；
- 共享推理工具 `runtime_utils.py`、`infer_rknn.py` 先找 `detector-local/`，再找 `ROOT.parents[1]`（原工作区中 Detector 的父目录）；
- Linux 构建要求当前 Python 已装 `rknnlite`，默认把 `/usr/lib/librknnrt.so` 打入包中（可用 `RKNN_RUNTIME_LIBRARY` 覆盖），并 `--collect-all rknnlite ruamel.yaml`；
- 产物：`detector-linux-aarch64.tar.gz`（板端）或 `detector-windows-amd64.zip`（Windows 协议联调）；包内附带 `build-info.json`（系统、架构、Python、glibc、依赖版本）；
- Linux 包的 `detector.service` 会把 `ExecStart` 自动改写为打包后的二进制路径；
- 跨架构不可用：Windows 构建产物不能直接在 ARM64 Linux 板端运行，Linux 包也不适用于 x86-64。

### 部署：`deploy.py` + `detector.service`

`deploy.py` 用 paramiko 把当前目录同步到板端（跳过 `__pycache__`、`deploy.py`、`requirements.txt`、`channels.json` 等），连接信息已改为环境变量：

```bash
export DETECTOR_HOST=192.168.1.50
export DETECTOR_USER=kickpi
export DETECTOR_PASSWORD='your-password'
export DETECTOR_REMOTE_DIR=/home/kickpi/testAgent/detector   # 可选，见脚本
python deploy.py
```

`detector.service` 是生产单元模板，关键环境变量与行为：

| 配置 | 作用 |
| --- | --- |
| `User` / `Group` / `WorkingDirectory` | 运行账号与工作目录，需与 Agent 一致 |
| `DEVICE_ID` | 设备 ID，需与 Agent 注册的 `device_id` 一致 |
| `DETECTOR_HOST` / `DETECTOR_PORT` | WebSocket 监听地址/端口，默认 `127.0.0.1:8090` |
| `DETECTOR_REQUIRE_RKNN=1` | 生产强制 RKNN，缺少依赖时启动失败 |
| `DETECTOR_DATA_DIR` | `channels.json`、`logs/`、告警图片的持久目录 |
| `AGENT_WORK_DIR` / `AGENT_CONFIG_PATH` | 模型目录解析依赖的 Agent 工作目录与配置 |
| `ExecStart` | 指向 `python detector.py` 或打包后的二进制 |
| `Restart=on-failure` / `RestartSec=5` / `TimeoutStopSec=15` / `KillSignal=SIGINT` | 崩溃自愈与优雅退出 |

---

## 关键模块表

### Cloud（`Device-Management`）

| 模块 | 路径 | 作用 |
| --- | --- | --- |
| API 入口 | `api/server.js` | 装配 Koa scaffold、Agent/终端 Gateway、七牛存储与 AI 复核 |
| Agent 网关 | `api/app/lib/service/agentGateway.js` | `/api/v1/agents/connect` WebSocket 中枢：连接鉴权、心跳超时、消息顺序化、请求/响应配对 |
| Agent 平台 | `api/app/lib/service/agentPlatform.js` | 设备注册、告警落库、通道镜像、异常观测、任务下发、AI 复核、远程文件 |
| 边缘设备路由 | `api/app/lib/routes/firmwareUpgrade/edge-agent.js` | 设备/通道/会话/重启/文件/模型/任务/事件/复核等 REST 端点 |
| 终端网关 | `api/app/lib/service/terminalGateway.js` + `terminalRecording.js` | 浏览器 ↔ Agent 终端 WS 桥接，命令脱敏与录制持久化 |
| 文件存储 | `api/app/lib/service/agentFileStorage.js`、`agentMultipartUpload.js` | 七牛私有空间签名上传/下载、busboy 流式上传、SHA-256 |
| AI 复核 | `api/app/lib/service/aiReview.js` | FastGPT 多模态复核，异步回写 `ai_status` |
| 告警推送 | `api/app/lib/service/alarmPush.js` | 按平台集成配置经 MQTT/HTTP 推送告警 |
| 管理台页面 | `web/client/src/sections/*` | 边缘设备、固件升级、系统/组织、告警、项目管理等 React 页面 |

### Agent（`FirmwareUpgrade`）

| 模块 | 路径 | 作用 |
| --- | --- | --- |
| 主循环 | `cmd/agent/main.go` | 配置解析、注册、WS 连接、心跳（gopsutil）、任务收发、状态维护 |
| 协议定义 | `internal/protocol/protocol.go` | 统一 `{_from, cmd, time, values}` 信封与全部业务结构体 |
| Detector 客户端 | `cmd/agent/detector.go` | 连接本机 Detector，镜像通道配置、转发状态与告警 |
| 视频通道 | `cmd/agent/video_channels.go`、`video_probe.go` | 云端通道增删改、revision 校验、RTSP 探测 |
| 告警 | `cmd/agent/alarms.go`、`database.go` | 本地 SQLite 告警排队、上报、去重与补报 |
| 终端 | `cmd/agent/terminal*.go` | Linux PTY / Windows 管道、命令元数据、用户隔离 |
| 重启与温度 | `cmd/agent/device_reboot.go`、`device_temperature.go` | 远程重启幂等操作、热区温度采集 |
| 认证状态 | `cmd/agent/server_state.go`、`identity.go` | 多服务器 token 状态、设备 ID 生成 |
| 配置样例 | `configs/agent.example.json` | 可直接复制修改的启动配置 |

### Detector（`detector-local`）

| 模块 | 路径 | 作用 |
| --- | --- | --- |
| 服务与通道 | `detector.py` | WebSocket 服务、ChannelWorker/StreamReader、状态广播、告警队列 |
| 模型运行时 | `model_runtime.py` | 文件签名轮询、热替换、失败保留旧模型、30s 重试 |
| 模型路径 | `model_paths.py` | 目录优先级、`allowed_target_dir` 解析、路径穿越防护 |
| 打包 | `build.py` | 源码包与 PyInstaller 打包、RKNN 库收集 |
| 部署 | `deploy.py` | paramiko 同步到板端（凭据走环境变量） |
| 服务模板 | `detector.service` | systemd 单元与生产环境变量 |
| 测试 | `tests/test_service.py`、`tests/test_model_runtime.py`、`tests/verify_linux_package.py` | 协议、模型替换、Linux 包结构校验 |

---

## 通信协议速查

统一信封（Cloud ↔ Agent、Agent ↔ Detector 同构）：

```json
{ "_from": "agent", "cmd": "heartbeat", "time": "2026-11-26T10:00:00+08:00", "values": { "requestId": "…" } }
```

`values.requestId` 用于请求/响应配对；需要回执的指令会在响应中原样带回。

**Cloud → Agent：** `heartbeat`（Agent 上行）、`task.assign`、`channelList` / `channelSet` / `channelDelete`、`channelTest`、`deviceReboot`、`terminalOpen` / `terminalInput` / `terminalResize` / `terminalClose`、`setUp`、`logSet`。

**Agent → Cloud：** `heartbeat`（含 CPU/内存/磁盘/温度）、`alarmReport` / `alarmReportResult`、`channelStatusChanged`、`task.status`（downloading → verifying → installing → succeeded/failed）、`deviceRebootResult`、`terminalOutput` / `terminalExited`。

**Agent → Detector：** `channelList`、`channelSet`、`channelDelete`、`logList`。
**Detector → Agent：** `channelListResult`、`channelSetResult`、`channelDeleteResult`、`channelStatusChanged`、`alarmDetected`、`logListResult`。

更完整的字段定义见 [Agent 协议结构](FirmwareUpgrade/internal/protocol/protocol.go)、[具体方案](FirmwareUpgrade/doc/具体方案.md)、[OpenAPI 契约](FirmwareUpgrade/apifox-openapi.json)。

---

## 文档索引

### Cloud

- [Node-Agent 迁移计划](Device-Management/doc/Node-Agent迁移计划.md) — 从独立 Go Cloud 迁移到 Node API 的接口归属与验收
- [Node-Agent 发布交接](Device-Management/doc/Node-Agent发布交接.md) — 发布范围、接口/页面变化与验证记录
- [Node-Agent 七牛与本地调试](Device-Management/doc/Node-Agent七牛与本地调试.md) — 模型/文件七牛存储与本地精简启动
- [Node-Agent SVN 提交说明](Device-Management/doc/Node-Agent-SVN提交说明.md) — 历史提交范围与文档
- [告警图片七牛存储](Device-Management/doc/告警图片七牛存储.md)
- [终端连接诊断（2026-10-13）](Device-Management/doc/终端连接诊断-2026-10-13.md) — 网页域与设备 API 域分离时的终端入口
- [远程文件传输](Device-Management/doc/remote-file-transfer.md)
- [Node-Agent Ingress 示例](Device-Management/doc/node-agent-ingress.example.yaml)
- [数据库脚本说明](Device-Management/script/README.md)、[2.0.0 迁移说明](Device-Management/script/2.0.0/README.md)

### Agent

- [FirmwareUpgrade README](FirmwareUpgrade/README.md) — 配置、构建、部署、温度与状态迁移
- [具体方案](FirmwareUpgrade/doc/具体方案.md) — 平台与模块化 Agent 的完整设计
- [交互文档](FirmwareUpgrade/doc/交互文档.md) — WebSocket/HTTP 交互细节
- [构建.md](FirmwareUpgrade/doc/构建.md) — Windows/Linux 构建命令
- [事件告警与设备操作接口](FirmwareUpgrade/doc/事件告警与设备操作接口.md)
- [远程会话持久化与脱敏接口设计](FirmwareUpgrade/doc/远程会话持久化与脱敏接口设计.md)
- [Agent 多服务器认证状态](FirmwareUpgrade/doc/Agent多服务器认证状态.md)
- [Cloud 接口更新与测试](FirmwareUpgrade/doc/Cloud接口更新与测试.md)
- [Go Cloud 退役说明](FirmwareUpgrade/doc/Go-Cloud退役说明.md)
- [TERMINAL.md](FirmwareUpgrade/doc/TERMINAL.md) — 终端协议与板端授权
- [WebShell 命令结果最小升级说明](FirmwareUpgrade/doc/WebShell命令结果最小升级说明.md)
- [画面质量阈值与远程会话结果联调说明](FirmwareUpgrade/doc/画面质量阈值与远程会话结果联调说明.md)
- [原理架构图](FirmwareUpgrade/doc/原理架构.png)、[需求说明书 V2.0](<FirmwareUpgrade/doc/边缘设备与云端管理%20V2.0%20需求说明书.docx>)
- [OpenAPI 契约](FirmwareUpgrade/apifox-openapi.json)

### Detector

- [Detector README](detector-local/README.md) — 本地测试、打包、板端部署、验证步骤
- [具体方案](detector-local/具体方案.md) — 整体方案与 Detector 协议细节
- [Detector 代码修改与优化总结](detector-local/Detector_Modification_Summary.md)
- [TERMINAL.md](detector-local/TERMINAL.md) / [构建.md](detector-local/构建.md) — 历史版本中的终端与构建说明（Go Cloud 时代保留）
- [原理架构图](detector-local/原理架构.png)
- [管理 Web 原型](detector-local/管理web原型/视觉边缘设备V1_原型.html)

---

## 安全说明

本仓库已做过凭据扫描与脱敏，**没有任何真实密钥、口令或账号进入提交**：

- 七牛 AK/SK、PostgreSQL 连接串、Camunda 默认口令、FastGPT API Key、固件操作 token、阿里云 AccessKey、SMTP 口令、东江视频 token、企业微信 Secret、摄像头 RTSP 账号口令、板端 SSH 口令等，均已替换为 `REPLACE_WITH_*` / `YOUR_*` / `CHANGE_ME` 占位符或改读环境变量；
- `Device-Management/api/agent-local.env`（本机私有配置）、`.vscode/launch.json`（含真实连接串与 Key）未入库；
- 生产 SQL 数据转储（含设备指令历史、SIM/GPS 记录）未入库，仓库只保留结构/增量脚本；
- 默认管理员种子口令哈希改为占位符 `REPLACE_WITH_MD5_OF_YOUR_ADMIN_PASSWORD`，首次部署请自行生成；新建成员默认口令改为 `DEFAULT_MEMBER_PASSWORD` 环境变量；
- 前端固件操作 token 改为 `REPLACE_WITH_FIRMWARE_OPERATION_TOKEN`，请通过后端/环境配置注入，勿写死；
- 运行时配置请使用 `.env`、`agent-local.env`（本地私有副本）或部署平台注入，不要提交本机配置。

仓库内仍保留少量**内网地址（10.8.x.x / 192.168.x.x）与测试用假凭据**（单测 fixture、文档示例），它们不是可用凭据；如需彻底匿名化可自行替换。仓库未附带 `LICENSE` 文件，商用/二次分发前请联系代码作者确认授权。

---

## 已知限制与未入库内容

| 未入库内容 | 原因 / 恢复方式 |
| --- | --- |
| `FirmwareUpgrade/vendor/`（约 2,126 文件 / 224 MB） | Go 依赖目录，执行 `go mod download` 或 `go mod vendor` 还原 |
| `FirmwareUpgrade/bin/`（约 408 MB 发布二进制） | 构建产物，按 `doc/构建.md` 重新交叉编译 |
| `detector-local/dist/`、`Device-Management/web/**/build/` | PyInstaller / Webpack 构建产物，按脚本重建 |
| `node_modules/`、`.venv-build/`、`.svn/` | 依赖与版本库元数据，本地安装即可 |
| `*.rknn` / `*.onnx` / `*.pt` 模型权重 | 体积大且属交付物，需从发布渠道获取并放入 `<Agent工作目录>/received-firmware/opt/edge/models` |
| `runtime_utils.py`、`infer_rknn.py` | 原工作区共享推理工具，不在本仓库目录内；需要 NPU 推理时手动放入仓库根目录或改造导入 |
| `agent-state.json`、`agent.db`、`channels.json` 运行时副本、告警图片 | 设备本地状态/业务数据，已在 `.gitignore` 中排除 |
| `*_test.go`/`*.test.js` 中的假 token | 测试 fixture，不是真实凭据 |
| `FirmwareUpgrade/cmd/cloud` | 目录保留为空：V1 独立 Go Cloud 已退役，正式链路改由 Node API 直连 Agent（见 [Go-Cloud退役说明](FirmwareUpgrade/doc/Go-Cloud退役说明.md)） |
| `Device-Management/script/0.0.1/1.结构+数据.sql` | 生产数据转储，含设备指令历史与 SIM/GPS 记录，出于合规未入库；空库初始化请先导入已有平台基础结构，再跑增量脚本 |
| `.mp4` 前端背景视频 | 按 `.gitignore` 规则未入库，页面可正常渲染但对应背景视频缺失 |

其他注意点：

- **版本约束**：Agent 要求 Go 1.26；API 生产环境兼容 Node 12（Web 构建建议 Node 22）；Detector 建议 Python 3.11，与 `rknn-toolkit-lite2` 的 ABI 必须匹配；
- **平台依赖**：完整 Cloud 依赖 PostgreSQL、Redis、Camunda、ClickHouse、ES 等外部服务，精简模式（`start:agent`）只覆盖边缘设备链路；
- **真实设备验证**：仓库自带的测试使用替身/模拟，RTSP、NPU 推理、systemd、远程终端等仍需在真实 RK3576 板端验证；文档中的测试数量与耗时是原作者历史记录，本快照未重新执行，不作为当前版本的性能承诺；
- **MQTT**：核心 Cloud ↔ Agent 链路是 WebSocket；MQTT 用于云端向第三方平台推送告警（`alarmPush`），旧 `mqttVideoServer` 代码为历史保留；
- **原型文件**：`管理web原型/` 下的 HTML 为交互原型，不是生产前端。

---

## License

本仓库未附带 LICENSE 文件。代码、文档、图片与第三方依赖（Koa、React、Ant Design、OpenCV、RKNN Lite2 等）的授权归各自作者/组织所有；如需商用、二次分发或用于产品交付，请先与代码作者确认。仓库中出现的公司名、域名与产品名仅用于说明部署环境，不代表任何授权或背书。

<div align="center">

**Cloud 下发 · Agent 执行 · Detector 感知**

如果你正在把这套平台接到新的现场，建议从 [Detector README](detector-local/README.md) 与 [Node-Agent 迁移计划](Device-Management/doc/Node-Agent迁移计划.md) 读起。

</div>
