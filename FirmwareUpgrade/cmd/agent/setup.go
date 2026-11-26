package main

import (
	"context"
	"errors"
	"net"
	"net/http"
	"strings"
	"sync"
	"time"

	"firmwareupgrade/internal/protocol"

	"github.com/coder/websocket"
	"github.com/coder/websocket/wsjson"
)

// setupServer is only Agent's local protocol endpoint. The management page,
// HTTP API and local presentation data belong to the independent setUp process.
type setupServer struct {
	agent  *agent
	listen string
	token  string
	mu     sync.RWMutex
	conn   *websocket.Conn
	writeM sync.Mutex
}

func newSetupServer(agent *agent, listen, token string) *setupServer {
	return &setupServer{agent: agent, listen: listen, token: strings.TrimSpace(token)}
}

func (s *setupServer) Start(ctx context.Context) error {
	listener, err := net.Listen("tcp", s.listen)
	if err != nil {
		return err
	}
	mux := http.NewServeMux()
	mux.HandleFunc("/api/v1/setup/connect", s.handleWebSocket)
	server := &http.Server{Handler: mux, ReadHeaderTimeout: 5 * time.Second}
	go func() {
		<-ctx.Done()
		shutdown, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		_ = server.Shutdown(shutdown)
	}()
	go func() {
		if err := server.Serve(listener); err != nil && !errors.Is(err, http.ErrServerClosed) {
			logErrf("setUp WebSocket service: %v", err)
		}
	}()
	logInfof("setUp WebSocket endpoint listening on ws://%s/api/v1/setup/connect", s.listen)
	return nil
}

func (s *setupServer) authorized(r *http.Request) bool {
	if s.token == "" {
		return true
	}
	return r.URL.Query().Get("token") == s.token || r.Header.Get("Authorization") == "Bearer "+s.token
}

func (s *setupServer) handleWebSocket(w http.ResponseWriter, r *http.Request) {
	if !s.authorized(r) {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	conn, err := websocket.Accept(w, r, nil)
	if err != nil {
		return
	}
	conn.SetReadLimit(protocol.MaxControlMessageBytes)
	s.mu.Lock()
	previous := s.conn
	s.conn = conn
	s.mu.Unlock()
	if previous != nil {
		_ = previous.Close(websocket.StatusPolicyViolation, "replaced by a newer setUp connection")
	}
	defer func() {
		s.mu.Lock()
		if s.conn == conn {
			s.conn = nil
		}
		s.mu.Unlock()
		s.agent.closeManagementTerminals("setUp")
		_ = conn.Close(websocket.StatusNormalClosure, "setUp disconnected")
	}()
	logInfof("setUp connected: %s", r.RemoteAddr)
	write := func(message protocol.Message) error { return s.writeTo(conn, message) }
	_ = s.agent.sendHeartbeat(r.Context(), write)
	channels, loadErr := s.agent.loadVideoChannels()
	result := protocol.VideoChannelListResult{Operate: loadErr == nil, Channels: channels}
	if loadErr != nil {
		result.Error = loadErr.Error()
	}
	_ = write(protocol.New("channelListResult", result))
	s.agent.channelStatusMu.RLock()
	statuses := make([]protocol.VideoChannelResult, 0, len(s.agent.channelStatuses))
	for _, status := range s.agent.channelStatuses {
		statuses = append(statuses, status)
	}
	s.agent.channelStatusMu.RUnlock()
	for _, status := range statuses {
		_ = write(protocol.New("channelStatusChanged", status))
	}
	_ = s.agent.reportPendingAlarmsForTarget("setUp", write)
	periodicCtx, stopPeriodic := context.WithCancel(r.Context())
	defer stopPeriodic()
	go s.periodic(periodicCtx, write)

	for {
		var message protocol.Message
		if err := wsjson.Read(r.Context(), conn, &message); err != nil {
			return
		}
		if message.From != "setUp" {
			logWarnf("rejected setUp message with invalid _from=%q", message.From)
			continue
		}
		if message.Type == "alarmReportResult" {
			var ack protocol.AlarmReportResult
			if decodeData(message.Data, &ack) == nil && ack.Operate {
				_ = s.agent.markAlarmsReportedForTarget("setUp", ack.RowIDs, time.Now())
				_ = s.agent.reportPendingAlarmsForTarget("setUp", write)
			}
			continue
		}
		if !s.agent.handleManagementMessage(r.Context(), "setUp", message, write) {
			logWarnf("unsupported setUp command: %s", message.Type)
		}
	}
}

func (s *setupServer) periodic(ctx context.Context, write func(protocol.Message) error) {
	ticker := time.NewTicker(time.Duration(s.agent.cfg.HeartbeatIntervalSeconds) * time.Second)
	defer ticker.Stop()
	for {
		select {
		case <-ticker.C:
			_ = s.agent.sendHeartbeat(context.Background(), write)
			_ = s.agent.reportPendingAlarmsForTarget("setUp", write)
		case <-ctx.Done():
			return
		}
	}
}

func (s *setupServer) writeTo(conn *websocket.Conn, message protocol.Message) error {
	s.writeM.Lock()
	defer s.writeM.Unlock()
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	return wsjson.Write(ctx, conn, message.WithSource("agent"))
}

func (s *setupServer) Broadcast(message protocol.Message) {
	s.mu.RLock()
	conn := s.conn
	s.mu.RUnlock()
	if conn != nil {
		if err := s.writeTo(conn, message); err != nil {
			logErrf("send to setUp: cmd=%s error=%v", message.Type, err)
		}
	}
}

func (s *setupServer) ReportAlarm() {
	s.mu.RLock()
	conn := s.conn
	s.mu.RUnlock()
	if conn != nil {
		_ = s.agent.reportPendingAlarmsForTarget("setUp", func(message protocol.Message) error {
			return s.writeTo(conn, message)
		})
	}
}
