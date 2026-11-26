# Terminal Shell 使用说明

Terminal Shell 已集成在现有 Agent 进程中，不拆分 Agent。Cloud 与 Agent 复用已有的设备 WSS 控制连接，设备侧无需开放 SSH、Telnet 或额外入站端口。

## ARM Linux Agent 配置

```json
"terminal": {
  "enabled": true,
  "shells": ["powershell.exe", "/bin/bash"],
  "max_sessions": 2
}
```

`shells` 是允许启动的 Shell 候选列表和白名单。终端页面不指定 Shell 时，Agent 会按数组顺序尝试：Windows 通常首先启动 `powershell.exe`；Linux 找不到它后会继续启动 `/bin/bash`。全部候选都失败时才返回错误。正式设备应以权限受限的专用系统用户运行 Agent；Terminal 获得的权限与 Agent 进程相同。

ARM Linux 使用真实 PTY，支持交互式命令、控制字符和终端尺寸调整。Windows 构建仅提供管道模式，供本机联调使用，不作为生产终端方案。

Agent 使用操作系统返回的第一个非回环且具有有效 MAC 地址的网卡生成固定 `device_id`。选择不依赖网卡当前是否联网，避免拔掉网线后身份切换。修改 `device_name` 后，Agent 会在启动注册时更新同一设备记录。特殊设备可以配置 `device_interface` 指定网卡名称；留空则自动选择第一个有效网卡。

## 启动 Cloud

```text
cloud -listen :8080 -data-dir ./data -public-url http://cloud:8080 -terminal-token "请替换为随机长令牌"
```

浏览器访问 `http://cloud:8080/terminal`，选择在线设备并输入同一个 Terminal 访问令牌即可连接。页面使用随 Cloud 内嵌的 xterm.js 显示 ANSI 颜色、光标、选区并处理键盘输入，不依赖公网 CDN。该入口面向可信局域网；生产部署仍应通过防火墙限制来源网段，并优先使用 HTTPS/WSS。

外部 Web 也可以直接连接：

```text
ws://server:8080/api/v1/terminal/connect?device_id={device-id}&cols=120&rows=35&shell=/bin/sh
```

若 Server 配置了访问令牌，WebSocket 建立后的第一条消息必须是：

```json
{"type":"auth","token":"共享访问令牌"}
```

随后客户端发送 `input`、`resize`、`close`，Server 返回 `opened`、`output`、`exited`、`error`。浏览器断开、Agent 掉线或 Shell 退出时，对应 PTY 会话会被清理。
