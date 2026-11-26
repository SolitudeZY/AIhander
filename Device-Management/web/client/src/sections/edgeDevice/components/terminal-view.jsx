import React, { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "./terminal-view.less";

// PTY output is a continuous terminal stream, not a list of text messages.
const TerminalView = forwardRef(function TerminalView({ connected, onData, onResize }, ref) {
  const hostRef = useRef(null);
  const terminalRef = useRef(null);
  const fitRef = useRef(null);
  const handlersRef = useRef({ connected, onData, onResize });
  handlersRef.current = { connected, onData, onResize };

  useImperativeHandle(ref, () => ({
    write(data) {
      if (typeof data === "string") terminalRef.current?.write(data);
    },
    reset() {
      terminalRef.current?.reset();
    },
    focus() {
      terminalRef.current?.focus();
    },
    dimensions() {
      fitRef.current?.();
      return { cols: terminalRef.current?.cols || 120, rows: terminalRef.current?.rows || 35 };
    },
  }), []);

  useEffect(() => {
    const host = hostRef.current;
    const term = new Terminal({
      cursorBlink: true,
      disableStdin: !handlersRef.current.connected,
      fontFamily: 'Consolas, Monaco, "Courier New", monospace',
      fontSize: 13,
      scrollback: 5000,
      convertEol: false,
      theme: { background: "#0e141d", foreground: "#c3d1e6", cursor: "#ffffff" },
    });
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(host);
    terminalRef.current = term;
    const fit = () => {
      // Tabs can hide the terminal without ending the remote session.
      if (host.clientWidth > 0 && host.clientHeight > 0) fitAddon.fit();
    };
    fitRef.current = fit;
    const input = term.onData((data) => {
      if (handlersRef.current.connected) handlersRef.current.onData(data);
    });
    const resize = term.onResize(({ cols, rows }) => {
      if (handlersRef.current.connected) handlersRef.current.onResize(cols, rows);
    });
    const observer = new ResizeObserver(fit);
    observer.observe(host);
    fit();
    return () => {
      observer.disconnect();
      input.dispose();
      resize.dispose();
      terminalRef.current = null;
      fitRef.current = null;
      term.dispose();
    };
  }, []);

  useEffect(() => {
    const term = terminalRef.current;
    if (!term) return;
    term.options.disableStdin = !connected;
    if (connected) {
      fitRef.current?.();
      handlersRef.current.onResize(term.cols, term.rows);
      term.focus();
    }
  }, [connected]);

  return <div ref={hostRef} className="edge-terminal-screen" aria-label="远程 Shell 终端" />;
});

export default TerminalView;
