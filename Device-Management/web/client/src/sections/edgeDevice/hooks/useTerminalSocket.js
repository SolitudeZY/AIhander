"use strict";
import { useCallback, useEffect, useRef } from "react";

// POMS metadata can point to a different backend. A separate public device API
// is preferred; deployments without it retain their existing same-site route.
export function terminalServerRoot(apiRoot, pageLocation, edgeAgentApiUrl) {
  const configured = String(edgeAgentApiUrl || "").trim();
  if (configured) {
    try {
      const url = new URL(configured);
      if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.search || url.hash ||
          (pageLocation?.protocol === "https:" && url.protocol !== "https:")) return "";
      return url.href.replace(/\/+$/, "");
    } catch (_) { return ""; }
  }
  return pageLocation?.protocol === "https:" ? pageLocation.origin : String(apiRoot || "").replace(/\/+$/, "");
}

/**
 * 边缘设备远程终端 WebSocket Hook

 */
export function useTerminalSocket({ deviceId, onOpened, onOutput, onExited, onError, onClosed }) {
  const wsRef = useRef(null);

  const close = useCallback(() => {
    const ws = wsRef.current;
    wsRef.current = null;
    if (ws && ws.readyState !== WebSocket.CLOSED) {
      try {
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "close" }));
        ws.close();
      } catch (_) {
        /* ignore */
      }
    }
  }, []);

  const connect = useCallback(
    (shell, cols = 120, rows = 35, sessionOptions = {}) => {
      close();
      let apiRoot = "";
      let edgeAgentApiUrl = "";
      try {
        const runtime = JSON.parse(localStorage.getItem("apiRoot") || "{}");
        apiRoot = runtime.root || "";
        edgeAgentApiUrl = runtime.edgeAgentApiUrl || "";
      } catch (_) {
        apiRoot = "";
      }
      apiRoot = terminalServerRoot(apiRoot, window.location, edgeAgentApiUrl);
      if (!apiRoot) {
        onError?.({ message: edgeAgentApiUrl ? "设备终端 API 地址无效；HTTPS 页面需要配置 HTTPS 的 EDGE_AGENT_API_URL 根地址" : "未获取到 API 地址，无法创建终端连接" });
        return;
      }
      const query = new URLSearchParams({
        device_id: deviceId,
        cols: String(cols),
        rows: String(rows),
      });
      const shellName = String(shell || "").trim();
      if (shellName) query.set("shell", shellName);
      const durationMinutes = Number(sessionOptions.durationMinutes);
      const purpose = String(sessionOptions.purpose || "").trim();
      if (Number.isInteger(durationMinutes) && durationMinutes > 0) {
        query.set("duration_minutes", String(durationMinutes));
      }
      if (purpose) query.set("purpose", purpose);

      const wsUrl = `${apiRoot.replace(/^http/, "ws")}/terminal/connect?${query.toString()}`;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (wsRef.current !== ws) return;
        let token = "";
        try {
          token = JSON.parse(sessionStorage.getItem("user") || "{}").token || "";
        } catch (_) {
          token = "";
        }
        if (token) {
          ws.send(JSON.stringify({ type: "auth", token }));
        }
      };

      ws.onmessage = (e) => {
        if (wsRef.current !== ws) return;
        let msg;
        try {
          msg = JSON.parse(e.data);
        } catch (_) {
          return;
        }
        if (msg.type === "opened") onOpened?.(msg);
        else if (msg.type === "output") onOutput?.(msg.data);
        else if (msg.type === "exited") onExited?.(msg);
        else if (msg.type === "error") onError?.(msg);
      };

      ws.onerror = () => {
        if (wsRef.current !== ws) return;
        onError?.({ message: `终端 WebSocket 连接失败，请检查入口是否转发到设备 Node 服务：${apiRoot}/terminal/connect` });
      };
      ws.onclose = () => {
        if (wsRef.current !== ws) return;
        wsRef.current = null;
        onClosed?.();
      };
    },
    [deviceId, onOpened, onOutput, onExited, onError, onClosed, close],
  );

  const send = useCallback((data) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "input", data }));
    }
  }, []);

  const resize = useCallback((cols, rows) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "resize", cols, rows }));
    }
  }, []);

  useEffect(
    () => () => {
      close();
    },
    [close],
  );

  return { connect, send, resize, close };
}
