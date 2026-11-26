package main

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"embed"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"io/fs"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"time"

	"firmwareupgrade/internal/protocol"

	"github.com/coder/websocket"
	"github.com/coder/websocket/wsjson"
	_ "modernc.org/sqlite"
)

//go:embed web/*
var assets embed.FS

type browserClient struct {
	conn *websocket.Conn
	mu   sync.Mutex
}

type service struct {
	agentURL   string
	agentToken string
	dataDir    string
	db         *sql.DB

	agentMu    sync.RWMutex
	agentConn  *websocket.Conn
	agentWrite sync.Mutex
	browsersMu sync.RWMutex
	browsers   map[*browserClient]struct{}

	stateMu   sync.RWMutex
	heartbeat *protocol.Heartbeat
	channels  protocol.VideoChannelListResult
	statuses  map[string]protocol.VideoChannelResult
}

func main() {
	listen := flag.String("listen", "127.0.0.1:8086", "setUp HTTP management listen address")
	agentURL := flag.String("agent-url", "ws://127.0.0.1:8085/api/v1/setup/connect", "Agent setUp WebSocket URL")
	agentToken := flag.String("agent-token", "", "optional Agent setUp token")
	dataDir := flag.String("data-dir", "./setup-data", "setUp database and image directory")
	flag.Parse()
	if err := os.MkdirAll(*dataDir, 0o750); err != nil {
		log.Fatal(err)
	}
	db, err := openDatabase(filepath.Join(*dataDir, "setup.db"))
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()
	s := &service{agentURL: *agentURL, agentToken: *agentToken, dataDir: *dataDir, db: db, browsers: map[*browserClient]struct{}{}, statuses: map[string]protocol.VideoChannelResult{}}
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	go s.maintainAgent(ctx)
	log.Printf("setUp management service listening on http://%s; Agent=%s", *listen, *agentURL)
	server := &http.Server{Addr: *listen, Handler: s.routes(), ReadHeaderTimeout: 5 * time.Second}
	if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		log.Fatal(err)
	}
}

func openDatabase(path string) (*sql.DB, error) {
	db, err := sql.Open("sqlite", path)
	if err != nil {
		return nil, err
	}
	db.SetMaxOpenConns(1)
	db.SetMaxIdleConns(1)
	_, err = db.Exec(`PRAGMA busy_timeout=5000; PRAGMA journal_mode=WAL;
CREATE TABLE IF NOT EXISTS alarm_records (
  agent_rowid INTEGER PRIMARY KEY,
  channel_id TEXT NOT NULL,
  detection_type TEXT NOT NULL,
  confidence REAL NOT NULL,
  alarm_time TEXT NOT NULL,
  image_path TEXT NOT NULL DEFAULT '',
  received_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_setup_alarms_time ON alarm_records(alarm_time DESC);`)
	if err != nil {
		db.Close()
		return nil, err
	}
	return db, nil
}

func (s *service) routes() http.Handler {
	mux := http.NewServeMux()
	web, _ := fs.Sub(assets, "web")
	mux.Handle("/static/", http.StripPrefix("/static/", http.FileServer(http.FS(web))))
	mux.HandleFunc("/api/v1/setup/connect", s.handleBrowserWS)
	mux.HandleFunc("/api/v1/setup/device", s.handleDevice)
	mux.HandleFunc("/api/v1/setup/alarms/", s.handleAlarmImage)
	mux.HandleFunc("/api/v1/setup/alarms", s.handleAlarms)
	mux.HandleFunc("/healthz", func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ok"))
	})
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/" {
			http.NotFound(w, r)
			return
		}
		data, _ := assets.ReadFile("web/setup.html")
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		_, _ = w.Write(data)
	})
	return mux
}

func (s *service) maintainAgent(ctx context.Context) {
	delay := time.Second
	for ctx.Err() == nil {
		headers := http.Header{}
		if s.agentToken != "" {
			headers.Set("Authorization", "Bearer "+s.agentToken)
		}
		conn, _, err := websocket.Dial(ctx, s.agentURL, &websocket.DialOptions{HTTPHeader: headers})
		if err != nil {
			log.Printf("connect Agent: %v; retrying in %s", err, delay)
		} else {
			delay = time.Second
			conn.SetReadLimit(protocol.MaxControlMessageBytes)
			s.agentMu.Lock()
			s.agentConn = conn
			s.agentMu.Unlock()
			log.Printf("Agent connection established: %s", s.agentURL)
			_ = s.sendAgent(protocol.New("channelList", protocol.VideoChannelListRequest{}))
			err = s.readAgent(ctx, conn)
			s.agentMu.Lock()
			if s.agentConn == conn {
				s.agentConn = nil
			}
			s.agentMu.Unlock()
			_ = conn.CloseNow()
			log.Printf("Agent connection closed: %v", err)
		}
		timer := time.NewTimer(delay)
		select {
		case <-ctx.Done():
			timer.Stop()
			return
		case <-timer.C:
		}
		if delay < 30*time.Second {
			delay *= 2
		}
	}
}

func (s *service) readAgent(ctx context.Context, conn *websocket.Conn) error {
	for {
		var message protocol.Message
		if err := wsjson.Read(ctx, conn, &message); err != nil {
			return err
		}
		s.remember(message)
		if message.Type == "alarmReport" {
			var report protocol.AlarmReport
			if decode(message.Data, &report) != nil {
				continue
			}
			ids, err := s.persistAlarms(report.Alarms)
			ack := protocol.AlarmReportResult{Operate: err == nil, RowIDs: ids}
			if err != nil {
				ack.Error = err.Error()
				log.Printf("persist Agent alarm: %v", err)
			}
			if err := s.sendAgent(protocol.New("alarmReportResult", ack)); err != nil {
				log.Printf("ack Agent alarm: %v", err)
			}
		}
		s.broadcast(message)
	}
}

func (s *service) remember(message protocol.Message) {
	s.stateMu.Lock()
	defer s.stateMu.Unlock()
	switch message.Type {
	case "heartbeat":
		var value protocol.Heartbeat
		if decode(message.Data, &value) == nil {
			s.heartbeat = &value
		}
	case "channelListResult":
		var value protocol.VideoChannelListResult
		if decode(message.Data, &value) == nil {
			s.channels = value
		}
	case "channelStatusChanged":
		var value protocol.VideoChannelResult
		if decode(message.Data, &value) == nil {
			s.statuses[value.ChannelID] = value
		}
	}
}

func (s *service) sendAgent(message protocol.Message) error {
	s.agentMu.RLock()
	conn := s.agentConn
	s.agentMu.RUnlock()
	if conn == nil {
		return errors.New("Agent is offline")
	}
	s.agentWrite.Lock()
	defer s.agentWrite.Unlock()
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	return wsjson.Write(ctx, conn, message.WithSource("setUp"))
}

func (s *service) handleBrowserWS(w http.ResponseWriter, r *http.Request) {
	conn, err := websocket.Accept(w, r, nil)
	if err != nil {
		return
	}
	conn.SetReadLimit(protocol.MaxControlMessageBytes)
	client := &browserClient{conn: conn}
	s.browsersMu.Lock()
	s.browsers[client] = struct{}{}
	s.browsersMu.Unlock()
	defer func() {
		s.browsersMu.Lock()
		delete(s.browsers, client)
		s.browsersMu.Unlock()
		_ = conn.Close(websocket.StatusNormalClosure, "page closed")
	}()
	s.sendSnapshot(client)
	for {
		var message protocol.Message
		if err := wsjson.Read(r.Context(), conn, &message); err != nil {
			return
		}
		if message.From != "setUp" {
			continue
		}
		if message.Type == "alarmReportResult" {
			continue
		}
		if err := s.sendAgent(message); err != nil {
			s.writeBrowser(client, protocol.New("terminal.error", protocol.TerminalError{Message: err.Error()}))
		}
	}
}

func (s *service) sendSnapshot(client *browserClient) {
	s.stateMu.RLock()
	heartbeat, channels := s.heartbeat, s.channels
	statuses := make([]protocol.VideoChannelResult, 0, len(s.statuses))
	for _, status := range s.statuses {
		statuses = append(statuses, status)
	}
	s.stateMu.RUnlock()
	if heartbeat != nil {
		s.writeBrowser(client, protocol.New("heartbeat", *heartbeat))
	}
	if channels.Channels != nil {
		s.writeBrowser(client, protocol.New("channelListResult", channels))
	}
	for _, status := range statuses {
		s.writeBrowser(client, protocol.New("channelStatusChanged", status))
	}
}

func (s *service) writeBrowser(client *browserClient, message protocol.Message) {
	client.mu.Lock()
	defer client.mu.Unlock()
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	_ = wsjson.Write(ctx, client.conn, message.WithSource("agent"))
}

func (s *service) broadcast(message protocol.Message) {
	s.browsersMu.RLock()
	clients := make([]*browserClient, 0, len(s.browsers))
	for client := range s.browsers {
		clients = append(clients, client)
	}
	s.browsersMu.RUnlock()
	for _, client := range clients {
		s.writeBrowser(client, message)
	}
}

func (s *service) persistAlarms(alarms []protocol.AlarmRecord) ([]int64, error) {
	tx, err := s.db.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()
	ids := make([]int64, 0, len(alarms))
	for _, alarm := range alarms {
		relative := ""
		if len(alarm.Image) > 0 {
			sum := sha256.Sum256([]byte(fmt.Sprintf("%d", alarm.RowID)))
			relative = filepath.ToSlash(filepath.Join("alarm-images", fmt.Sprintf("%x.jpg", sum[:16])))
			absolute := filepath.Join(s.dataDir, filepath.FromSlash(relative))
			if err := os.MkdirAll(filepath.Dir(absolute), 0o750); err != nil {
				return nil, err
			}
			if err := os.WriteFile(absolute, alarm.Image, 0o640); err != nil {
				return nil, err
			}
		}
		_, err := tx.Exec(`INSERT INTO alarm_records(agent_rowid,channel_id,detection_type,confidence,alarm_time,image_path,received_at) VALUES(?,?,?,?,?,?,?) ON CONFLICT(agent_rowid) DO NOTHING`, alarm.RowID, alarm.ChannelID, alarm.DetectionType, alarm.Confidence, alarm.AlarmTime, relative, time.Now().UTC().Format(time.RFC3339Nano))
		if err != nil {
			return nil, err
		}
		ids = append(ids, alarm.RowID)
	}
	return ids, tx.Commit()
}

func (s *service) handleDevice(w http.ResponseWriter, _ *http.Request) {
	s.agentMu.RLock()
	online := s.agentConn != nil
	s.agentMu.RUnlock()
	s.stateMu.RLock()
	heartbeat := s.heartbeat
	s.stateMu.RUnlock()
	writeJSON(w, map[string]any{"name": "本地终端", "agentOnline": online, "heartbeat": heartbeat})
}

func (s *service) handleAlarms(w http.ResponseWriter, _ *http.Request) {
	rows, err := s.db.Query(`SELECT agent_rowid,channel_id,detection_type,confidence,alarm_time,image_path FROM alarm_records ORDER BY alarm_time DESC,agent_rowid DESC LIMIT 100`)
	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}
	defer rows.Close()
	items := []map[string]any{}
	for rows.Next() {
		var id int64
		var channel, kind, at, image string
		var confidence float64
		if rows.Scan(&id, &channel, &kind, &confidence, &at, &image) != nil {
			continue
		}
		item := map[string]any{"rowId": id, "channelId": channel, "detectionType": kind, "confidence": confidence, "alarmTime": at}
		if image != "" {
			item["imageUrl"] = fmt.Sprintf("/api/v1/setup/alarms/%d/image", id)
		}
		items = append(items, item)
	}
	writeJSON(w, items)
}

func (s *service) handleAlarmImage(w http.ResponseWriter, r *http.Request) {
	parts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
	if len(parts) != 6 || parts[5] != "image" {
		http.NotFound(w, r)
		return
	}
	id, err := strconv.ParseInt(parts[4], 10, 64)
	if err != nil {
		http.NotFound(w, r)
		return
	}
	var relative string
	if s.db.QueryRow(`SELECT image_path FROM alarm_records WHERE agent_rowid=?`, id).Scan(&relative) != nil || relative == "" {
		http.NotFound(w, r)
		return
	}
	root, _ := filepath.Abs(s.dataDir)
	path, _ := filepath.Abs(filepath.Join(root, filepath.FromSlash(relative)))
	if !strings.HasPrefix(path, root+string(filepath.Separator)) {
		http.Error(w, "invalid path", 400)
		return
	}
	w.Header().Set("Content-Type", "image/jpeg")
	http.ServeFile(w, r, path)
}

func decode(value any, target any) error {
	data, err := json.Marshal(value)
	if err != nil {
		return err
	}
	return json.Unmarshal(data, target)
}
func writeJSON(w http.ResponseWriter, value any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	_ = json.NewEncoder(w).Encode(value)
}
