> 2026-10-10：本文中的独立 Go Cloud 部署、旧 HTTP 代理和 Cloud 测试命令已退役。当前链路与新接口以 [Node-Agent迁移计划](../../Device-Management/doc/Node-Agent迁移计划.md) 和 [Go Cloud 退役说明](Go-Cloud退役说明.md) 为准。Agent/Detector 协议与板端系统授权说明仍可参考。

# Cloud 接口更新与测试（2026-09-21）

后续已按新增需求实现事件/告警页面查询和设备重启，并完成真实 RTSP 端点验证，详见 [事件告警与设备操作接口](事件告警与设备操作接口.md)。以下是第一阶段 Cloud 接口调整说明；新增功能以该补充文档和 OpenAPI 0.7.1 为准。

2026-09-22 补充：设备重启需要同时满足 Agent 配置 `allow_remote_reboot=true`、重启 Agent 使配置生效，以及运行用户具备 Linux 无交互重启权限。“管理接口无需额外凭证”仅指 Cloud HTTP 认证，不代表 `kickpi` 自动具有系统重启权限。普通用户的 systemd/Polkit 安装、只读检查与回退步骤见 [板端部署与重启授权](事件告警与设备操作接口.md#板端部署与重启授权)。

已实现重启协议的 Agent 只补充上述部署配置时，无需修改 Go 代码或重新构建 Cloud/Agent。仓库 `script/agent_watchdog.service` 已改为 `kickpi:kickpi`，配套提供 `script/49-agent-reboot.rules`；后者仅授权该账号普通重启和多会话重启，适用于该账号的所有进程。旧二进制若没有重启协议支持，仍需按版本升级，不能仅靠配置增加功能。

## 范围和部署顺序

本次修改对应《Cloud 接口实现与需求差异清单》中本仓库负责的 `/api/v1` Cloud 接口，并补齐这些接口所需的 Agent 和 Detector 支持。上游 `/edgeCloud` 的 JavaScript 代理、项目权限、模型元数据以及 `SystemLog` 不在这个目录，本次没有修改这些代码。第一阶段保留已有告警功能；后续事件/告警查询扩展见补充文档。未增加设备日志或独立审计查询接口。

建议同时更新 Cloud 和 Agent，并填写 Agent 新增的四个配置项。新注册请求要求 `sku`、`runtime_version`、`model_version`、`address`，返回凭证统一为 `device_token`。旧 `token` 仅作为注册请求的废弃别名接受，不再作为响应字段返回。旧 Agent 不能直接用于新版注册和连接测试。

Cloud 启动时自动增加 SQLite 字段和通道测试观测表，不要求清空现有数据。更新前停止服务并备份整个 Cloud data 目录（包含可能存在的 SQLite WAL/SHM 文件）。首次注册时间不随重复注册改变。新增版本字段来自设备注册上报，不从升级任务的目标版本推断“已安装版本”。

Detector 更新后会上报编码、分辨率和质量状态；仅更新 Cloud/Agent 时旧 Detector 未上报的质量状态为 `unknown`。Agent 所在机器必须可执行 `ffprobe`，测试过程运行于设备网络内，不在 Cloud 主机探测摄像头。探测最多并行 2 路，包含排队在内最多约 7 秒，Cloud 等待设备应答约 10 秒。

## 接口变化

| 接口或功能 | 新行为 |
|---|---|
| 注册、设备列表、设备详情 | 增加 SKU、软件/模型版本、安装地址和 `abnormal` 异常状态；详情提供首次注册时间、注册方式、最近 HTTP 对端 IP；不返回设备凭证 |
| `channel_count` | Cloud 向在线 Agent 查询后统计；列表查询整体预算约 2 秒、最多 8 并发；不可用为 `null`，不是 0 |
| 视频新增、修改 | 支持 `username`、`password`、`transport`、按通道选择 `model_name`；仅接受 RTSP/RTSPS；密码不进入 HTTP 响应 |
| 视频修改密码 | 省略 `password` 保留原密码；传空字符串清空密码；账号密码必须用独立字段，不能写在请求 URL 中 |
| `POST /api/v1/devices/{id}/video-channels/test` | 只读测试，返回连接结果、耗时、编码和分辨率；不发送 `channelSet`，不更改通道配置或 revision |
| 视频响应 | 新增 `username`、`password_configured`、`codec`、`resolution`、`quality_status`、`last_test_at`、`last_test_duration_ms` |
| 视频断流 | `sync_status=applied` 仍表示配置已接受；`status=offline`、`input_fps=0`、`quality_status=unknown` 表示没有有效画面 |
| 文件上传 | 请求总大小 512 MiB（含 multipart 头），超限 413；最多 8 MiB multipart 内存缓冲；清理临时文件；去掉客户端路径 |
| SHA-256 | 默认不计算，返回空字符串；可用 `-upload-sha256` 开启；Agent 对空值跳过校验，对非空值仍校验 |
| 文件下载 | 保留设备 Bearer 鉴权和 206/401/404/416 语义 |
| 升级详情 | 返回 Cloud 当前记录，含 `source=cloud`、任务信息和设备最新上报结果；不存在为 404 |
| 重新下发 | 复用任务 ID；5 秒内重复操作 409；在线执行中的任务拒绝重置；离线等待数量返回 `waiting_count` |
| 管理接口 | 不增加独立登录或密钥；账号权限沿用现有管理平台 |
| 操作日志 | 使用既有进程日志记录路由、对象、结果；上传附文件 ID/名称/大小，创建任务附任务 ID/文件 ID/设备数；不记录请求体、Authorization、摄像头密码 |

每个通道通过 `model_name` 指定实际部署的 `.rknn`/`.onnx` 文件名，Cloud 只校验文件名格式，不再读取全局模型环境变量。这里不新建模型库；模型名称显示规则、模型类型/版本/文件 ID 的绑定仍需由上游同一条模型记录保证。停用通道仍沿用已保存的通道模型并要求当前 `expected_revision`。

质量状态使用 Detector 原有 0～100 画面指标，阈值 80，按黑屏、遮挡、模糊、亮度异常的顺序选择状态。没有指标或计算失败返回 `unknown`。这是便于联调的启发式界面分类，需要用真实摄像头画面校准，不作为新增事件或告警规则。

四项单独展示均以 `>=80` 为异常，不能以非零值判异常；接口 `blur` 是模糊异常分数，不是原始拉普拉斯清晰度。计算公式、板端旧版 `quality_status=unknown` 的兼容边界，以及远程会话历史输出/逐命令结果的实现分工，见 [画面质量阈值与远程会话结果联调说明](画面质量阈值与远程会话结果联调说明.md)。

`last_test_at` 仅在请求携带 `channel_id` 且测试输入与当前保存的 URL（含凭证）和 transport 一致时记录。对未保存草稿的测试只返回结果，不污染旧通道观测。改变 URL/transport 会清除旧测试观测。

设备离线返回 503，格式错误 400，通道不存在 404，revision/名称冲突 409，设备执行失败 502，应答超时 504。摄像头本身连接失败为 HTTP 200、`success=false`；没有 ffprobe 为 502。错误信息采用不含凭证的固定描述。

注意：独立测试失败保证不写配置；**已下发的保存请求发生网络超时，不能证明设备没有执行**。现有设备协议没有事务回滚确认，收到保存请求的 504 后应重新查询通道和 revision 确认最终状态，不能直接声称旧配置一定未变。

## 自动化验证

在 Windows PowerShell 中执行：

```powershell
Set-Location 'E:\Python_Prj\landSlide\ZY\rk3576_deploy\AIhander\FirmwareUpgrade'
go test ./...
go test ./cmd/cloud -run Requirements -v
go test ./cmd/agent -run 'VideoProbe|OptionalChecksum|OptionalSHA256' -v
python -m unittest discover -s test -p test_status_contract.py -v
go vet ./...
```

Go 测试使用临时 SQLite、真实本地 HTTP/WebSocket 和模拟 Agent，不接触运行环境数据。覆盖注册字段和旧库迁移、首次时间、设备凭证校验、管理接口无额外鉴权、密码保留/脱敏、连接测试不发保存命令、失败草稿不覆盖观测、400/404/409/503/504、Range、413、可选摘要实际下载落盘、摘要不匹配拒绝落盘、任务详情和重复下发。若本机有 ffprobe，还执行一次本地关闭端口的真实探测失败测试。

Python 测试只验证语法与纯质量分类逻辑，不需要安装 OpenCV/RKNN，不代表板端真实解码、质量或 NPU 推理通过。

本目录存在嵌套 SVN 工作副本，`go build`/`go run` 使用 `-buildvcs=false`，避免 Go 的版本控制信息采集报错；这不影响程序逻辑。

## 启动隔离的测试 Cloud

命令绑定到回环地址，并使用独立 data 目录，无需配置管理密钥或模型环境变量。

```powershell
Set-Location 'E:\Python_Prj\landSlide\ZY\rk3576_deploy\AIhander\FirmwareUpgrade'
go run -buildvcs=false ./cmd/cloud -listen 127.0.0.1:18080 -data-dir ./data-cloud-acceptance
```

新终端设置：

```powershell
$base = 'http://127.0.0.1:18080'
Invoke-RestMethod "$base/healthz"
curl.exe -i "$base/api/v1/devices"
Invoke-RestMethod "$base/api/v1/devices"
```

预期健康检查与设备查询均返回 200，设备查询返回数组。内置 Cloud 管理页面不提供额外登录，管理 API 无需独立凭证。业务账号权限沿用现有管理平台。原有可选 `-terminal-token` 仅控制终端 WebSocket，默认不启用。

## 注册和文件测试（无真实设备也可执行）

```powershell
$registration = @{
    device_id = 'cloud-acceptance-001'; name = '接口验收设备'
    os = 'linux'; arch = 'arm64'; agent_version = 'acceptance'
    sku = 'RK3576'; runtime_version = '1.0.0'
    model_version = '1.0.0'; address = '本地接口验收'
}
$registered = Invoke-RestMethod "$base/api/v1/agents/register" -Method Post `
    -ContentType 'application/json; charset=utf-8' -Body ($registration | ConvertTo-Json)
$deviceId = $registered.device_id
$before = Invoke-RestMethod "$base/api/v1/devices/$deviceId"
$registration.device_token = $registered.device_token
$registration.name = '接口验收设备-改名'
Invoke-RestMethod "$base/api/v1/agents/register" -Method Post `
    -ContentType 'application/json; charset=utf-8' -Body ($registration | ConvertTo-Json)
$after = Invoke-RestMethod "$base/api/v1/devices/$deviceId"
$before.first_registered_at -eq $after.first_registered_at
```

预期设备只保留一条、名称改变、比较结果为 True；详情不含 token；离线设备 `channel_count=null`。改成错误 `device_token` 应返回 401。重复运行这段脚本时需保留第一次拿到的设备凭证，不能覆盖已有设备身份。

```powershell
'acceptance-file-content' | Set-Content -Encoding ascii ./cloud-acceptance.bin
$upload = curl.exe -sS `
    -F 'file=@cloud-acceptance.bin' "$base/api/v1/files" | ConvertFrom-Json
$upload
curl.exe -i -H "Authorization: Bearer $($registered.device_token)" `
    -H 'Range: bytes=0-3' "$base/api/v1/agents/files/$($upload.id)"
curl.exe -i -H "Authorization: Bearer $($registered.device_token)" `
    -H 'Range: bytes=999999-' "$base/api/v1/agents/files/$($upload.id)"
```

预期上传 201、`sha256` 为空；两个下载分别 206、416。上传不要求额外的管理凭证。超限 413 已在自动化测试中通过较小测试限额验证；无需手工生成大文件。

## 设备侧视频验收

真实设备配置中填入实际值，`server_url` 改为设备可访问的 Cloud 地址。不能让板端使用 `127.0.0.1:18080` 连接另一台主机。

```json
{
  "sku": "RK3576",
  "runtime_version": "实际基础软件版本",
  "model_version": "实际视觉模型版本",
  "address": "实际安装地址"
}
```

在设备上检查 `ffprobe -version`，然后按既有启动方式运行新版 Agent 和 Detector。Agent 注册后，设备列表应为 `online=true`。下列 `$deviceId` 必须换成该真实 Agent 的设备 ID（通常为 MAC），不能继续使用前面人工注册的离线 ID。

```powershell
$deviceId = '填写在线设备ID'
$camera = @{
    name = '测试摄像头'; rtsp_url = 'rtsp://填写摄像头地址/live'
    username = '填写摄像头账号'; password = '填写摄像头密码'; transport = 'tcp'
}
$test = Invoke-RestMethod "$base/api/v1/devices/$deviceId/video-channels/test" `
    -Method Post -ContentType 'application/json; charset=utf-8' `
    -Body ($camera | ConvertTo-Json)
$test
```

正确凭证应返回 `success=true`、耗时、编码和分辨率；错误密码应失败，且前后通道列表/revision 不变。响应和 Cloud 日志均不能出现密码。停止 Agent 后测试为 503；卸载/移走设备 ffprobe 后为 502；卡住设备响应或网络为 504。

保存和修改：

```powershell
$camera.enabled = $true
$channel = Invoke-RestMethod "$base/api/v1/devices/$deviceId/video-channels" `
    -Method Post -ContentType 'application/json; charset=utf-8' `
    -Body ($camera | ConvertTo-Json)
$camera.Remove('password')
$camera.expected_revision = $channel.revision
$updated = Invoke-RestMethod "$base/api/v1/devices/$deviceId/video-channels/$($channel.id)" `
    -Method Put -ContentType 'application/json; charset=utf-8' `
    -Body ($camera | ConvertTo-Json)
$updated
```

预期修改成功，省略密码仍保留原密码，响应 `password_configured=true`、`rtsp_url` 无 userinfo。再次使用旧 revision 修改应返回 409。断开摄像头网络但保持 Agent 在线，等待 Detector 下次状态上报，检查 `offline / input_fps=0 / sync_status=applied`；恢复后应回到 `running`。

要记录某个已保存通道的最近测试时间，重新提供正确账号密码和 `channel_id`，调用同一个测试接口，然后查询视频列表。不要将 `expected_revision` 或 `enabled` 传给测试接口。

## 升级任务及上游配合验收

```powershell
$taskBody = @{
    name = '接口验收文件下发'; file_id = $upload.id
    device_ids = @($registered.device_id)
    target_path = 'models'; target_is_directory = $true; version = 'acceptance'
}
$task = Invoke-RestMethod "$base/api/v1/deployments" `
    -Method Post -ContentType 'application/json' -Body ($taskBody | ConvertTo-Json)
Invoke-RestMethod "$base/api/v1/deployments/$($task.id)"
Invoke-RestMethod "$base/api/v1/deployments/$($task.id)/redispatch" -Method Post
Invoke-RestMethod "$base/api/v1/deployments/$($task.id)/redispatch" -Method Post
```

对前面人工注册的离线设备，预期详情 `source=cloud`、设备任务为 pending；首次重新下发 `waiting_count=1`，5 秒内第二次 409，任务 ID 和设备任务数量不变。这个示例不向真实设备写文件。真实下发需另选测试设备并确认 `allowed_target_dir`，验证无摘要下载成功、路径穿越请求仍被 Agent 拒绝。

导入更新后的 `apifox-openapi.json` 可进行相同测试。管理平台代理需要同步：

1. 管理请求（包括 multipart 上传、数据库清理）不需要额外 Cloud 凭证；继续使用现有平台账号与操作权限。
2. 保留 Cloud 的真实 HTTP 状态和 Range 响应头，不能统一转 502。
3. 用户/项目权限、模型格式及同一模型记录绑定由管理平台校验；Cloud 不另建用户或权限体系。
4. `/edgeCloud/deployments/:id` 若仍只读本地快照，必须注明语义；需要当前设备执行结果时调用 Cloud 详情。
5. 系统日志中的真实操作人、项目关系和模型元数据需写入现有 `SystemLog`；Cloud 进程日志仅记录接口及执行结果，不冒充实际用户审计。

## 验证边界

本地自动化和编译可以证明接口、迁移、状态码、协议和文件落盘行为；不能代替 RK3576 实机、真实摄像头、上游管理平台、正式网络环境的联合验收。尤其应单独确认 ffprobe 在板端可用、OpenCV 支持超时属性、画面质量阈值适合实际场景，以及保存请求超时后的最终 revision。

### 本次实际验证记录

- Windows Go 1.27.0：`go test ./...`、`go vet ./...` 通过。
- Detector Python 语法检查和质量分类测试通过；OpenAPI 所有本地 `$ref` 解析通过。
- Windows Cloud、Linux ARM64 Agent 和 Cloud 编译通过（`-buildvcs=false`；产物在临时目录，未覆盖原有发布二进制）。
- 独立进程冒烟脚本已改为无额外管理凭证启动和访问，验证 Cloud/Agent 连接、事件上报与查询、重启禁用；设备通信继续使用原有设备凭证。
- 未执行 RK3576 实机摄像头成功拉流、NPU 推理或上游 JavaScript 管理平台代理联合验收。

