# 远程文件传输

远程会话“上传/下载”使用 Node 与 Agent 已建立的控制 WebSocket 分块传输，不调用七牛，不创建固件/模型下发任务。模型文件和告警图片仍使用现有七牛流程。

板子只使用一个传输目录，默认是 Agent `state_file` 所在目录下的 `files`。例如状态文件 `/home/kickpi/testAgent/agent-state.json` 对应 `/home/kickpi/testAgent/files`，Agent 自动创建目录。需要指定其他目录时，在板子配置 JSON 设置：

```json
"remote_file_dir": "/home/kickpi/testAgent/files"
```

页面打开弹窗后读取 Agent 返回的实际目录，不再提供三个白名单目录。上传选择文件，下载输入该目录内的文件名。单文件最大 200 MiB，暂不支持子目录和覆盖同名文件。同名时改名再上传，或通过终端处理已有文件。

Node 上传接口先接收 multipart，按 64 KiB 分块直传板子临时文件，全部成功后确认发布最终文件。错误、多文件请求和连接中断清理临时文件；Agent 控制连接结束时也清理该连接未完成的传输。下载从同一目录分块读取，由 Node 返回浏览器下载。每台设备同一时间传一个文件，传输完成写入操作审计。

接口均沿用平台登录鉴权：

| 方法 | 路径 | 用途 |
|---|---|---|
| GET | `/edgeAgent/devices/:id/remote-files` | 查询目录及文件大小上限 |
| POST | `/edgeAgent/devices/:id/remote-files` | multipart 单个 `file` 上传 |
| GET | `/edgeAgent/devices/:id/remote-files/download?name=runtime.log` | 下载该目录中的文件 |

浏览器使用 Web `/_api` 代理这些 HTTP 接口，Node–Agent 使用 `file.transfer.*` 命令及关联 `requestId`。不需要新增板子监听端口或服务器环境变量。部署入口现有上传大小、HTTP 超时需允许目标文件大小和传输时间。

## 发布

需同时构建部署 API、Web，并更新板子 Agent。旧 Agent 未实现 `file.transfer.*`，弹窗将提示读取目录失败，不能只发布 Web/API。新增源码与测试文件需要 SVN Add；保留工作副本中其他人的改动。固件 Agent 使用 FirmwareUpgrade 项目的构建流程，不属于 Device-Management API Jenkins 镜像。

部署后验证：打开远程会话 -> 上传/下载 -> 显示唯一设备目录 -> 上传含二进制/中文内容的文件 -> 从同一目录下载 -> 比较文件哈希。检查设备的文件传输日志及平台操作审计。未完成上传不得以正式文件名出现在目录中，已有同名文件不得覆盖。
