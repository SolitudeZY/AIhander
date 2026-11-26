package main

import (
	"context"
	"errors"
	"fmt"
	"io"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"firmwareupgrade/internal/protocol"
)

type terminalConfig struct {
	Enabled     bool     `json:"enabled"`
	Shells      []string `json:"shells"`
	MaxSessions int      `json:"max_sessions"`
	RunAsUser   string   `json:"run_as_user,omitempty"`
}

type terminalProcess interface {
	io.Reader
	io.Writer
	PID() int
	Resize(cols, rows int) error
	Wait(context.Context) (int, error)
	Close() error
}

type terminalSession struct {
	id          string
	process     terminalProcess
	send        func(protocol.Message) error
	writeMu     sync.Mutex
	seqMu       sync.Mutex
	seq         uint64
	outputBytes atomic.Uint64
	commands    *terminalCommands
	readDone    chan struct{}
}

type terminalManager struct {
	cfg          terminalConfig
	mu           sync.Mutex
	sessions     map[string]*terminalSession
	startProcess func(string, string, int, int) (terminalProcess, error)
}

func newTerminalManager(cfg terminalConfig) *terminalManager {
	if cfg.MaxSessions <= 0 {
		cfg.MaxSessions = 1
	}
	return &terminalManager{cfg: cfg, sessions: make(map[string]*terminalSession), startProcess: startTerminalProcess}
}

func (m *terminalManager) Open(ctx context.Context, request protocol.TerminalOpen, send func(protocol.Message) error) error {
	if !m.cfg.Enabled {
		return errors.New("terminal is disabled")
	}
	if request.SessionID == "" {
		return errors.New("terminal session_id is required")
	}
	if request.Cols <= 0 {
		request.Cols = 120
	}
	if request.Rows <= 0 {
		request.Rows = 35
	}
	shells, err := m.allowedShells(request.Shell)
	if err != nil {
		return err
	}

	m.mu.Lock()
	if _, exists := m.sessions[request.SessionID]; exists {
		m.mu.Unlock()
		return fmt.Errorf("terminal session %s already exists", request.SessionID)
	}
	if len(m.sessions) >= m.cfg.MaxSessions {
		m.mu.Unlock()
		return fmt.Errorf("terminal session limit reached: %d", m.cfg.MaxSessions)
	}
	m.mu.Unlock()

	var process terminalProcess
	var shell string
	var startErrors []error
	for _, candidate := range shells {
		process, err = m.startProcess(candidate, m.cfg.RunAsUser, request.Cols, request.Rows)
		if err == nil {
			shell = candidate
			break
		}
		if m.cfg.RunAsUser != "" {
			return fmt.Errorf("isolated terminal start failed: %w", err)
		}
		startErrors = append(startErrors, fmt.Errorf("%s: %w", candidate, err))
		logWarnf("terminal shell unavailable, trying next candidate: session=%s shell=%s error=%v", request.SessionID, candidate, err)
	}
	if process == nil {
		return fmt.Errorf("no configured terminal shell could be started: %w", errors.Join(startErrors...))
	}
	session := &terminalSession{id: request.SessionID, process: process, send: send, readDone: make(chan struct{})}
	if tracked, ok := process.(interface{ commandTracker() *terminalCommands }); ok {
		session.commands = tracked.commandTracker()
	}
	m.mu.Lock()
	if _, exists := m.sessions[request.SessionID]; exists || len(m.sessions) >= m.cfg.MaxSessions {
		m.mu.Unlock()
		_ = process.Close()
		return errors.New("terminal session capacity changed while opening")
	}
	m.sessions[request.SessionID] = session
	m.mu.Unlock()
	logInfof("terminal started: session=%s shell=%s pid=%d size=%dx%d", request.SessionID, shell, process.PID(), request.Cols, request.Rows)

	if err := send(protocol.New("terminal.opened", protocol.TerminalOpened{SessionID: request.SessionID, PID: process.PID()})); err != nil {
		m.Close(request.SessionID)
		return err
	}
	go m.readOutput(session)
	go m.waitProcess(ctx, session)
	return nil
}

func (m *terminalManager) allowedShell(requested string) (string, error) {
	shells, err := m.allowedShells(requested)
	if err != nil {
		return "", err
	}
	return shells[0], nil
}

func (m *terminalManager) allowedShells(requested string) ([]string, error) {
	if requested == "" {
		if len(m.cfg.Shells) == 0 {
			return nil, errors.New("no terminal shells are configured")
		}
		return append([]string(nil), m.cfg.Shells...), nil
	}
	var candidates []string
	for _, allowed := range m.cfg.Shells {
		if strings.EqualFold(strings.TrimSpace(allowed), strings.TrimSpace(requested)) {
			candidates = append(candidates, allowed)
			for _, fallback := range m.cfg.Shells {
				if !strings.EqualFold(strings.TrimSpace(fallback), strings.TrimSpace(allowed)) {
					candidates = append(candidates, fallback)
				}
			}
			return candidates, nil
		}
	}
	return nil, fmt.Errorf("shell %q is not allowed", requested)
}

func (m *terminalManager) Input(input protocol.TerminalInput) error {
	session := m.get(input.SessionID)
	if session == nil {
		return errors.New("terminal session not found")
	}
	session.writeMu.Lock()
	defer session.writeMu.Unlock()
	_, err := session.process.Write(input.Data)
	return err
}

func (m *terminalManager) Resize(request protocol.TerminalResize) error {
	session := m.get(request.SessionID)
	if session == nil {
		return errors.New("terminal session not found")
	}
	if request.Cols <= 0 || request.Rows <= 0 {
		return errors.New("terminal dimensions must be positive")
	}
	return session.process.Resize(request.Cols, request.Rows)
}

func (m *terminalManager) Close(sessionID string) {
	m.mu.Lock()
	session := m.sessions[sessionID]
	delete(m.sessions, sessionID)
	m.mu.Unlock()
	if session != nil {
		_ = session.process.Close()
	}
}

func (m *terminalManager) CloseAll() {
	m.mu.Lock()
	sessions := make([]*terminalSession, 0, len(m.sessions))
	for _, session := range m.sessions {
		sessions = append(sessions, session)
	}
	m.sessions = make(map[string]*terminalSession)
	m.mu.Unlock()
	for _, session := range sessions {
		_ = session.process.Close()
	}
}

func (m *terminalManager) get(sessionID string) *terminalSession {
	m.mu.Lock()
	defer m.mu.Unlock()
	return m.sessions[sessionID]
}

func (m *terminalManager) readOutput(session *terminalSession) {
	if session.readDone != nil {
		defer close(session.readDone)
	}
	buffer := make([]byte, 8192)
	var output terminalUTF8Output
	var sendErr error
	sendOutput := func(raw []byte, final bool) {
		data := output.chunk(raw, final)
		if len(data) == 0 || sendErr != nil {
			return
		}
		session.seqMu.Lock()
		session.seq++
		sequence := session.seq
		session.seqMu.Unlock()
		sendErr = session.send(protocol.New("terminal.output", protocol.TerminalOutput{SessionID: session.id, Sequence: sequence, Data: data}))
	}
	for {
		n, err := session.process.Read(buffer)
		if n > 0 {
			session.outputBytes.Add(uint64(n))
		}
		// Cloud converts each chunk to a JSON string. Never split a UTF-8 rune
		// across messages, including when a PTY read ends partway through it.
		if session.commands != nil {
			session.commands.feed(buffer[:n], err != nil, func(data []byte) { sendOutput(data, false) }, session.sendCommand)
			if err != nil {
				sendOutput(nil, true)
			}
		} else {
			sendOutput(buffer[:n], err != nil)
		}
		if err != nil || sendErr != nil {
			return
		}
	}
}

func (session *terminalSession) sendCommand(event protocol.TerminalCommand) {
	event.SessionID = session.id
	_ = session.send(protocol.New("terminal.command", event))
}

func (m *terminalManager) waitProcess(ctx context.Context, session *terminalSession) {
	exitCode, err := session.process.Wait(ctx)
	endedAt := time.Now()
	// Drain PTY markers before emitting exited; descendants may keep the PTY open.
	if session.readDone != nil {
		select {
		case <-session.readDone:
		case <-time.After(500 * time.Millisecond):
		}
	}
	if session.commands != nil && exitCode >= 0 {
		session.commands.finish(endedAt, exitCode, session.sendCommand)
	}
	if err != nil && !errors.Is(err, context.Canceled) {
		logErrf("terminal exited: session=%s pid=%d exit_code=%d output_bytes=%d error=%v", session.id, session.process.PID(), exitCode, session.outputBytes.Load(), err)
	} else {
		logInfof("terminal exited: session=%s pid=%d exit_code=%d output_bytes=%d", session.id, session.process.PID(), exitCode, session.outputBytes.Load())
	}
	m.mu.Lock()
	if m.sessions[session.id] == session {
		delete(m.sessions, session.id)
	}
	m.mu.Unlock()
	if err != nil && !errors.Is(err, context.Canceled) {
		_ = session.send(protocol.New("terminal.error", protocol.TerminalError{SessionID: session.id, Message: err.Error()}))
	}
	_ = session.send(protocol.New("terminal.exited", protocol.TerminalExited{SessionID: session.id, ExitCode: exitCode}))
}
