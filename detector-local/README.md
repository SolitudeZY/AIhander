# Detector 本地测试与板端部署

## 已有能力与本次补齐

Cloud/Node → Agent → WebSocket `channelSet` → Detector 保存 `channels.json`，
停止旧通道并按 `moduleName` 启动新通道。这条配置链路原本已存在。
Agent 不直接编辑 Detector 的 JSON；Detector 启动时读配置，运行期间由消息修改并持久化。
手工编辑 JSON 不会自动生效，需要重启服务。

原 detector-local 只读 `../model/<moduleName>`，没有文件更新监测。
现在复用 FirmwareUpgrade/detector/model_paths.py 的目录解析逻辑，优先读 Agent 下载目录，
其次兼容旧 `model` 目录；通道每约 2 秒检查选定文件的路径、inode、大小及纳秒时间戳。
Agent 的 `.part` 下载文件不会被加载，校验后重命名的正式文件才会生效。
新运行时初始化成功再释放旧运行时；失败保留旧运行时，记录日志，30 秒后重试。
无文件时也会等待下载；摄像头断线重试期间仍检查模型。
只跟随当前通道 `moduleName`，不会按目录时间挑选其他名称的模型。
换文件名仍需在云端配置通道。同名覆盖不增加通道配置 revision。

## 模型目录必须对齐

默认模型位置为 `<Agent工作目录>/<allowed_target_dir>/opt/edge/models/<moduleName>`。
`allowed_target_dir` 来自 `AGENT_CONFIG_PATH` 指向的 Agent JSON。
必须设置 `AGENT_WORK_DIR` 为 Agent 的实际 WorkingDirectory；否则相对路径可能指错。
云端模型任务的目标目录应为 `opt/edge/models`，最终文件名必须与 `moduleName` 完全一致。
若现有任务使用其他目录，可显式设置 `DETECTOR_MODEL_DIR` 为那个绝对目录。
兼容旧路径 `<Agent工作目录>/model/<moduleName>`。

## Windows 测试包

建议用 Python 3.11 的独立构建环境；不支持把 Windows exe 直接用于 ARM64 Linux。

```powershell
uv venv --python 3.11 .venv-build
uv pip install --python .venv-build/Scripts/python.exe -r requirements.txt 'pyinstaller>=6.11,<7'
.venv-build/Scripts/python.exe build.py
$env:DETECTOR_DATA_DIR = "$PWD/test-data"
$env:AGENT_WORK_DIR = (Resolve-Path ../FirmwareUpgrade).Path
$env:AGENT_CONFIG_PATH = "$env:AGENT_WORK_DIR/configs/agent.example.json"
$env:DETECTOR_DISABLE_INFERENCE = '1'
./dist/detector/detector.exe
```

交付 `dist/detector-windows-amd64.zip`，解压后保留整个 `detector/` 目录，不能只拷贝 exe。
配置和模型不嵌入二进制。运行 `detector.exe --check` 可查看实际配置路径、模型目录及 RKNN 是否可用。
首次无 channels.json 时以空通道启动，等待 Agent 配置；也可先把实际配置复制到
`DETECTOR_DATA_DIR/channels.json`。不要用测试配置覆盖生产通道。
Agent 的 `detector_ws_url` 指向 `ws://127.0.0.1:8090`。
Windows 无 RKNN NPU 时只测试协议、配置持久化、拉流、截图与画质；不会产生模型推理告警。

## 板端 Linux ARM64 生产服务

`dist/detector-source.zip` 包含 Detector、共享推理工具及服务模板，不含模型、凭据和现场通道配置。
在板端 `/home/kickpi/testAgent` 解压，得到 `detector/`。
使用现有 rknn Python 环境，安装公共依赖和与 Python ABI、RK3576 驱动配套的
`rknn-toolkit-lite2`（当前共享工具提示 v2.3.2），并确认板端 `librknnrt.so` 可用。
不要在 Windows 构建环境安装 ARM64 Lite2 wheel。

```bash
cd /home/kickpi/testAgent/detector
/home/kickpi/miniconda3/envs/rknn/bin/python -m pip install -r requirements.txt
mkdir -p /home/kickpi/testAgent/detector-data
# 如需迁移已有通道，手工复制实际 channels.json 到 detector-data，保留备份。
# 修改 detector.service 中的用户名、路径、DEVICE_ID，与 Agent 保持一致。
sudo cp detector.service /etc/systemd/system/detector.service
sudo systemctl daemon-reload
sudo systemctl enable --now detector.service
sudo systemctl status detector.service
journalctl -u detector.service -f
```

服务显式要求 RKNN，缺少依赖时启动失败，避免生产环境静默退化为仅拉流。
日志写到 `<DETECTOR_DATA_DIR>/logs/logInfo.log`，日志接口读取同一位置。
同名新模型初始化时短暂同时占用新旧两份模型的 NPU/内存，需要板端确认容量。
云端任务“下载成功”表示文件落盘，模型初始化结果需看 Detector 的 `model.load` 日志。

Linux 独立运行包为 `detector-linux-aarch64.tar.gz`，必须在目标板或兼容的 Linux ARM64 环境构建：

```bash
python -m pip install 'pyinstaller>=6.11,<7'
python build.py
```

构建时当前 Python 中需已安装 rknnlite；默认将 `/usr/lib/librknnrt.so` 打入包中，
可用 `RKNN_RUNTIME_LIBRARY` 指定其他路径。产物带 Python、依赖和 RKNN 用户态库，运行无需安装 Python/Conda。
包内 `detector.service` 已使用二进制 ExecStart。
系统 RKNPU 内核驱动、设备访问权限及兼容的 Linux 系统库仍需保留。
ARM64 包不适用于 x86-64 Linux；glibc 最低版本与构建环境有关，详见包内 `build-info.json`。

```bash
cd /home/kickpi/testAgent
tar -xzf /path/to/detector-linux-aarch64.tar.gz
export AGENT_WORK_DIR=/home/kickpi/testAgent
export AGENT_CONFIG_PATH=/home/kickpi/testAgent/configs/agent.example.json
export DETECTOR_DATA_DIR=/home/kickpi/testAgent/detector-data
export DETECTOR_REQUIRE_RKNN=1
./detector/detector --check
# 可选：加载实际模型并执行一次合成画面推理，不启动 WebSocket 或拉流
./detector/detector --check-model /absolute/path/to/model.rknn
./detector/detector
```

解压目录内 `_internal/` 必须完整保留。与现有 Detector 不能同时监听 8090；
只检查依赖时使用 `--check`，隔离测试可另设 `DETECTOR_PORT`。
启用服务前修改包内 `detector.service` 的设备 ID/路径，并按前面的 systemd 步骤安装。
部署仍需在真实板端验证 RTSP、NPU 推理、同名模型替换与服务重启；Windows 测试不能代替这些验证。

## 验证

```powershell
python -m unittest discover -s tests -v
```

测试以假运行时验证模型替换、初始化失败保留旧模型、延迟下载及 `.part` 隔离，
并通过真实 WebSocket 子进程验证通道保存和重启恢复，不替代真实 RKNN 模型兼容性验证。
