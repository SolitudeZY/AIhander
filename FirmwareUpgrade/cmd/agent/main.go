package main

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"runtime"
	"sort"
	"strings"
	"sync"
	"time"

	"firmwareupgrade/internal/protocol"

	"github.com/coder/websocket"
	"github.com/coder/websocket/wsjson"
	"github.com/shirou/gopsutil/v4/cpu"
	"github.com/shirou/gopsutil/v4/disk"
	"github.com/shirou/gopsutil/v4/mem"
)

const agentVersion = "0.4.1"

const defaultAgentConfigPath = "./configs/agent.example.json"

var errDeviceTokenRejected = errors.New("device token rejected")

type config struct {
	AllowRemoteReboot           bool           `json:"allow_remote_reboot"`
	SKU                         string         `json:"sku"`
	RuntimeVersion              string         `json:"runtime_version"`
	ModelVersion                string         `json:"model_version"`
	Address                     string         `json:"address"`
	ServerURL                   string         `json:"server_url"`
	DeviceName                  string         `json:"device_name"`
	DeviceInterface             string         `json:"device_interface"`
	StateFile                   string         `json:"state_file"`
	DatabaseFile                string         `json:"database_file"`
	AllowedTargetDir            string         `json:"allowed_target_dir"`
	RemoteFileDir               string         `json:"remote_file_dir,omitempty"`
	HeartbeatIntervalSeconds    int            `json:"heartbeat_interval_seconds"`
	WebsocketReconnectMaxSecond int            `json:"websocket_reconnect_max_seconds"`
	FileDownloadTimeoutSeconds  int            `json:"file_download_timeout_seconds"`
	DetectorWSURL               string         `json:"detector_ws_url"`
	SetupListen                 string         `json:"setup_listen"`
	SetupToken                  string         `json:"setup_token,omitempty"`
	Terminal                    terminalConfig `json:"terminal"`
}

type state struct {
	DeviceID string `json:"device_id"`
	Token    string `json:"token"`
}

type agent struct {
	rebootMu              sync.Mutex
	rebootPending         bool
	rebootSystem          *rebootSystem
	cfg                   config
	registrationMu        sync.Mutex
	stateMu               sync.RWMutex
	state                 state
	db                    *sql.DB
	http                  *http.Client
	writeM                sync.Mutex
	runM                  sync.Mutex
	running               map[string]struct{}
	terminal              *terminalManager
	detector              *detectorClient
	channelStatusMu       sync.RWMutex
	channelStatuses       map[string]protocol.VideoChannelResult
	detectorStatusUpdates chan protocol.VideoChannelResult
	alarmReportRequests   chan struct{}
	setup                 *setupServer
	control               *managementArbiter
	terminalOwnerMu       sync.Mutex
	terminalOwners        map[string]map[string]struct{}
}

func main() {
	logInitial()
	configPath := flag.String("config", defaultAgentConfigPath, "agent JSON configuration")
	flag.Parse()
	resolvedConfigPath := resolveAgentConfigPath(*configPath)
	cfg, created, err := loadOrCreateAgentConfig(resolvedConfigPath)
	if err != nil {
		logFatalf("load Agent configuration: %v", err)
	}
	if created {
		logInfof("agent configuration did not exist; generated default configuration: %s", resolvedConfigPath)
	}
	if filepath.Base(cfg.DatabaseFile) != "agent.db" {
		logFatalf("agent database file must be named agent.db")
	}
	if err := os.MkdirAll(filepath.Dir(cfg.StateFile), 0o750); err != nil && filepath.Dir(cfg.StateFile) != "." {
		logFatalf("create Agent state directory: %v", err)
	}
	if err := os.MkdirAll(filepath.Dir(cfg.DatabaseFile), 0o750); err != nil && filepath.Dir(cfg.DatabaseFile) != "." {
		logFatalf("create Agent database directory: %v", err)
	}
	if err := os.MkdirAll(cfg.AllowedTargetDir, 0o750); err != nil {
		logFatalf("create allowed target directory: %v", err)
	}
	db, err := openAgentDatabase(cfg.DatabaseFile)
	if err != nil {
		logFatalf("open agent database: %v", err)
	}
	defer db.Close()
	a := &agent{
		cfg: cfg, db: db,
		http:                  &http.Client{Timeout: time.Duration(cfg.FileDownloadTimeoutSeconds) * time.Second},
		running:               map[string]struct{}{},
		terminal:              newTerminalManager(cfg.Terminal),
		detector:              newDetectorClient(cfg.DetectorWSURL),
		channelStatuses:       map[string]protocol.VideoChannelResult{},
		detectorStatusUpdates: make(chan protocol.VideoChannelResult, 128),
		alarmReportRequests:   make(chan struct{}, 1),
		control:               newManagementArbiter(),
		terminalOwners:        map[string]map[string]struct{}{},
	}
	if err := a.reconcileRebootReceipts(); err != nil {
		logFatalf("reconcile reboot operations: %v", err)
	}
	defer a.detector.Close()
	runCtx, cancel := context.WithCancel(context.Background())
	defer cancel()
	a.setup = newSetupServer(a, cfg.SetupListen, cfg.SetupToken)
	if err := a.setup.Start(runCtx); err != nil {
		logFatalf("start setUp management service: %v", err)
	}
	if err := a.migrateLegacyVideoChannels(); err != nil {
		logFatalf("migrate legacy video channels: %v", err)
	}
	go a.maintainDetector(runCtx)
	a.waitForRegistration(runCtx)
	logInfof("agent %s (%s) starting", a.currentState().DeviceID, a.cfg.DeviceName)
	a.run(runCtx)
}

func (a *agent) waitForRegistration(ctx context.Context) {
	retryIndex := 0
	for {
		if err := a.loadOrRegister(ctx); err == nil {
			return
		} else {
			delay := registrationRetryDelay(retryIndex)
			logWarnf("device registration failed: %v; retrying in %s", err, delay)
			timer := time.NewTimer(delay)
			select {
			case <-ctx.Done():
				timer.Stop()
				return
			case <-timer.C:
			}
			retryIndex++
		}
	}
}

func registrationRetryDelay(index int) time.Duration {
	delays := [...]time.Duration{10 * time.Second, 20 * time.Second, 30 * time.Second, 60 * time.Second}
	if index < 0 {
		index = 0
	}
	if index >= len(delays) {
		index = len(delays) - 1
	}
	return delays[index]
}

func applyDefaults(c *config) {
	if strings.TrimSpace(c.ServerURL) == "" {
		c.ServerURL = "http://127.0.0.1:4700"
	}
	c.ServerURL = strings.TrimRight(strings.TrimSpace(c.ServerURL), "/")
	if c.DeviceName == "" {
		c.DeviceName, _ = os.Hostname()
	}
	if c.StateFile == "" {
		c.StateFile = "./agent-state.json"
	}
	if c.DatabaseFile == "" {
		c.DatabaseFile = defaultAgentDatabaseFile()
	}
	if c.AllowedTargetDir == "" {
		c.AllowedTargetDir = "./received-firmware"
	}
	if c.HeartbeatIntervalSeconds <= 0 {
		c.HeartbeatIntervalSeconds = 60
	}
	if c.WebsocketReconnectMaxSecond <= 0 {
		c.WebsocketReconnectMaxSecond = 60
	}
	if c.FileDownloadTimeoutSeconds <= 0 {
		c.FileDownloadTimeoutSeconds = 1800
	}
	if c.DetectorWSURL == "" {
		c.DetectorWSURL = "ws://127.0.0.1:8090"
	}
	if strings.TrimSpace(c.SetupListen) == "" {
		c.SetupListen = "127.0.0.1:8085"
	}
	if c.Terminal.MaxSessions <= 0 {
		c.Terminal.MaxSessions = 2
	}
	if len(c.Terminal.Shells) == 0 {
		if runtime.GOOS == "windows" {
			c.Terminal.Shells = []string{"powershell.exe", "cmd.exe"}
		} else {
			c.Terminal.Shells = []string{"/bin/sh", "/bin/bash"}
		}
	}
}

func resolveAgentConfigPath(configPath string) string {
	cleaned := filepath.Clean(configPath)
	if filepath.IsAbs(cleaned) || filepath.Clean(configPath) != filepath.Clean(defaultAgentConfigPath) {
		return cleaned
	}
	if _, err := os.Stat(cleaned); err == nil || !errors.Is(err, os.ErrNotExist) {
		return cleaned
	}
	executable, err := os.Executable()
	if err != nil {
		return cleaned
	}
	return filepath.Join(filepath.Dir(executable), "configs", "agent.example.json")
}

func loadOrCreateAgentConfig(configPath string) (config, bool, error) {
	data, err := os.ReadFile(configPath)
	if err == nil {
		cfg, err := decodeAgentConfig(configPath, data)
		return cfg, false, err
	}
	if !errors.Is(err, os.ErrNotExist) {
		return config{}, false, fmt.Errorf("read agent configuration %s: %w", configPath, err)
	}

	cfg := config{
		ServerURL: "http://127.0.0.1:4700",
		Terminal: terminalConfig{
			Enabled: true,
		},
	}
	applyDefaults(&cfg)
	encoded, err := json.MarshalIndent(cfg, "", "  ")
	if err != nil {
		return config{}, false, fmt.Errorf("encode default agent configuration: %w", err)
	}
	encoded = append(encoded, '\n')
	if err := os.MkdirAll(filepath.Dir(configPath), 0o750); err != nil && filepath.Dir(configPath) != "." {
		return config{}, false, fmt.Errorf("create agent configuration directory %s: %w", filepath.Dir(configPath), err)
	}
	file, err := os.OpenFile(configPath, os.O_WRONLY|os.O_CREATE|os.O_EXCL, 0o640)
	if errors.Is(err, os.ErrExist) {
		data, readErr := os.ReadFile(configPath)
		if readErr != nil {
			return config{}, false, fmt.Errorf("read concurrently created agent configuration %s: %w", configPath, readErr)
		}
		loaded, decodeErr := decodeAgentConfig(configPath, data)
		return loaded, false, decodeErr
	}
	if err != nil {
		return config{}, false, fmt.Errorf("create default agent configuration %s: %w", configPath, err)
	}
	if _, err := file.Write(encoded); err != nil {
		_ = file.Close()
		_ = os.Remove(configPath)
		return config{}, false, fmt.Errorf("write default agent configuration %s: %w", configPath, err)
	}
	if err := file.Close(); err != nil {
		return config{}, false, fmt.Errorf("close default agent configuration %s: %w", configPath, err)
	}
	return cfg, true, nil
}

func decodeAgentConfig(configPath string, data []byte) (config, error) {
	var cfg config
	if err := json.Unmarshal(data, &cfg); err != nil {
		return config{}, fmt.Errorf("parse agent configuration %s: %w", configPath, err)
	}
	applyDefaults(&cfg)
	return cfg, nil
}

func defaultAgentDatabaseFile() string {
	executable, err := os.Executable()
	if err != nil {
		return filepath.Join("db", "agent.db")
	}
	return filepath.Join(filepath.Dir(executable), "db", "agent.db")
}

func (a *agent) loadOrRegister(ctx context.Context) error {
	return a.registerDevice(ctx)
}

func (a *agent) registerDevice(ctx context.Context) error {
	a.registrationMu.Lock()
	defer a.registrationMu.Unlock()
	server, err := serverStateKey(a.cfg.ServerURL)
	if err != nil {
		return err
	}
	id, interfaceName, macAddress, err := deviceIDFromInterfaces(a.cfg.DeviceInterface)
	if err != nil {
		return err
	}
	logInfof("device identity resolved: interface=%s mac=%s device_id=%s", interfaceName, macAddress, id)
	store, legacy, err := readServerStates(a.cfg.StateFile)
	if err != nil {
		return err
	}
	previous := store.Servers[server]
	if legacy != nil {
		previous = legacy.Identity
	}
	if previous.DeviceID != id {
		previous = state{}
	}
	if previous.Token == "" {
		previous, err = newServerIdentity(id)
		if err != nil {
			return err
		}
		// Node preserves a supplied token on first enrollment. Save it before
		// sending the request so a lost response cannot orphan the identity.
		store.Servers[server] = previous
		if err := saveServerStates(a.cfg.StateFile, store, legacy); err != nil {
			return err
		}
		legacy = nil
	}
	reqBody, _ := json.Marshal(protocol.RegisterRequest{DeviceID: id, Token: previous.Token, Name: a.cfg.DeviceName, OS: runtime.GOOS, Arch: runtime.GOARCH, CPUModel: localCPUModel(), AgentVersion: agentVersion, SKU: a.cfg.SKU, RuntimeVersion: a.cfg.RuntimeVersion, ModelVersion: a.cfg.ModelVersion, Address: a.cfg.Address})
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, server+"/api/v1/agents/register", strings.NewReader(string(reqBody)))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	resp, err := a.http.Do(req)
	if err != nil {
		return fmt.Errorf("register agent: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		if resp.StatusCode == http.StatusUnauthorized {
			return fmt.Errorf("%w: invalid existing device token; server=%s state_file=%s; saved credentials retained; restore this server's state backup or request device re-pairing", errDeviceTokenRejected, server, a.cfg.StateFile)
		}
		b, _ := io.ReadAll(io.LimitReader(resp.Body, 4096))
		message := strings.TrimSpace(string(b))
		if previous.Token != "" {
			message = strings.ReplaceAll(message, previous.Token, "[REDACTED]")
		}
		return fmt.Errorf("register agent: status=%d %s", resp.StatusCode, message)
	}
	var registered protocol.RegisterResponse
	if err := json.NewDecoder(resp.Body).Decode(&registered); err != nil {
		return fmt.Errorf("register agent: malformed registration response for server=%s; saved credentials retained", server)
	}
	if registered.DeviceID != id || strings.TrimSpace(registered.Token) == "" {
		return fmt.Errorf("register agent: invalid registration response for server=%s; saved credentials retained", server)
	}
	next := state{DeviceID: registered.DeviceID, Token: registered.Token}
	store.Servers[server] = next
	if err := saveServerStates(a.cfg.StateFile, store, legacy); err != nil {
		return err
	}
	a.stateMu.Lock()
	a.state = next
	a.stateMu.Unlock()
	logInfof("device registration succeeded: server=%s saved_servers=%d", server, len(store.Servers))
	return nil
}

func localCPUModel() string {
	info, err := cpu.Info()
	if err == nil {
		for _, item := range info {
			if model := strings.TrimSpace(item.ModelName); model != "" {
				return model
			}
		}
	}
	return runtime.GOARCH
}

func (a *agent) run(ctx context.Context) {
	backoff := time.Second
	for {
		if err := a.connect(ctx); err != nil {
			logWarnf("control connection: %v; retrying in %s", err, backoff)
			if errors.Is(err, errDeviceTokenRejected) {
				logWarnf("device token is no longer valid; registering again")
				a.waitForRegistration(ctx)
				backoff = time.Second
				continue
			}
		}
		select {
		case <-ctx.Done():
			return
		case <-time.After(backoff):
		}
		backoff *= 2
		if backoff > time.Duration(a.cfg.WebsocketReconnectMaxSecond)*time.Second {
			backoff = time.Duration(a.cfg.WebsocketReconnectMaxSecond) * time.Second
		}
	}
}

func (a *agent) connect(ctx context.Context) error {
	wsURL, err := toWebSocketURL(a.cfg.ServerURL + "/api/v1/agents/connect")
	if err != nil {
		return err
	}
	headers := http.Header{}
	headers.Set("Authorization", "Bearer "+a.currentState().Token)
	c, response, err := websocket.Dial(ctx, wsURL, &websocket.DialOptions{HTTPHeader: headers})
	if err != nil {
		if response != nil && response.StatusCode == http.StatusUnauthorized {
			return fmt.Errorf("%w: server returned %s", errDeviceTokenRejected, response.Status)
		}
		return err
	}
	defer c.Close(websocket.StatusNormalClosure, "agent reconnect")
	defer a.closeManagementTerminals("cloud")
	logInfof("control connection established: %s", wsURL)
	files := newRemoteFiles(a.cfg)
	defer files.close()
	write := func(m protocol.Message) error {
		a.writeM.Lock()
		defer a.writeM.Unlock()
		return wsjson.Write(context.Background(), c, m.WithSource("agent"))
	}
	if err := a.sendHeartbeat(ctx, write); err != nil {
		logErrf("initial heartbeat: %v", err)
	}
	if err := a.reportPendingAlarms(write); err != nil {
		logErrf("initial alarm report: %v", err)
	}
	ticker := time.NewTicker(time.Duration(a.cfg.HeartbeatIntervalSeconds) * time.Second)
	defer ticker.Stop()
	heartbeatCtx, stopHeartbeats := context.WithCancel(ctx)
	defer stopHeartbeats()
	go func() {
		for {
			select {
			case status := <-a.detectorStatusUpdates:
				if err := write(protocol.New("channelStatusChanged", status)); err != nil {
					logErrf("forward Detector channel status: channel_id=%s error=%v", status.ChannelID, err)
				}
			case <-a.alarmReportRequests:
				if err := a.reportPendingAlarms(write); err != nil {
					logErrf("Detector alarm report: %v", err)
				}
			case <-ticker.C:
				if err := a.sendHeartbeat(context.Background(), write); err != nil {
					logErrf("heartbeat: %v", err)
				}
				if err := a.reportPendingAlarms(write); err != nil {
					logErrf("alarm report: %v", err)
				}
			case <-heartbeatCtx.Done():
				return
			}
		}
	}()
	for {
		var msg protocol.Message
		if err := wsjson.Read(ctx, c, &msg); err != nil {
			return err
		}
		if msg.Type != "terminal.input" {
			if msg.Type != "file.transfer.upload.chunk" && msg.Type != "file.transfer.download.chunk" {
				logInfof("control command received: from=%s cmd=%s request_id=%s", msg.From, msg.Type, msg.RequestID)
			}
		}
		if files.handle(msg, write) { continue }
		if a.handleManagementMessage(ctx, "cloud", msg, write) {
			continue
		}
		switch msg.Type {
		case "task.assign":
			var task protocol.TaskAssignment
			if err := decodeData(msg.Data, &task); err != nil {
				logWarnf("invalid task assignment: %v", err)
				continue
			}
			logInfof("task received: id=%s file=%s version=%s target=%s", task.TaskID, task.FileID, task.Version, task.TargetPath)
			if !a.markRunning(task.TaskID) {
				logWarnf("task ignored because it is already running: id=%s", task.TaskID)
				continue
			}
			go func() { defer a.unmarkRunning(task.TaskID); a.executeTask(task, write) }()
		case "directory.list":
			go a.respondDirectoryList(msg.RequestID, write)
		case "channelList":
			channels, err := a.loadVideoChannels()
			result := protocol.VideoChannelListResult{Operate: err == nil, Channels: channels}
			if err != nil {
				result.Error = err.Error()
				logErrf("list video channels: %v", err)
			}
			response := protocol.New("channelListResult", result)
			response.RequestID = msg.RequestID
			_ = write(response)
		case "channelSet":
			var channel protocol.VideoChannelConfig
			if err := decodeData(msg.Data, &channel); err != nil {
				logWarnf("invalid video channel configuration: %v", err)
				continue
			}
			release := a.control.acquire("cloud")
			result := a.configureDetectorChannel(ctx, channel)
			release()
			response := protocol.New("channelSet", result)
			response.RequestID = msg.RequestID
			_ = write(response)
		case "channelDelete":
			var channel protocol.VideoChannelDelete
			if err := decodeData(msg.Data, &channel); err != nil {
				logWarnf("invalid video channel delete: %v", err)
				continue
			}
			release := a.control.acquire("cloud")
			result := a.deleteDetectorChannel(ctx, channel)
			release()
			response := protocol.New("channelDelete", result)
			response.RequestID = msg.RequestID
			_ = write(response)
		case "alarmReportResult":
			var result protocol.AlarmReportResult
			if err := decodeData(msg.Data, &result); err != nil {
				logWarnf("invalid alarm report result: %v", err)
				continue
			}
			if result.Operate {
				if err := a.markAlarmsReported(result.RowIDs, time.Now()); err != nil {
					logErrf("mark alarms reported: %v", err)
				} else if a.alarmReportRequests != nil {
					select {
					case a.alarmReportRequests <- struct{}{}:
					default:
					}
				}
			}
		case "terminal.open":
			var request protocol.TerminalOpen
			if err := decodeData(msg.Data, &request); err != nil {
				logWarnf("invalid terminal open request: %v", err)
				continue
			}
			logInfof("terminal open: session=%s shell=%s size=%dx%d", request.SessionID, request.Shell, request.Cols, request.Rows)
			if err := a.terminal.Open(ctx, request, write); err != nil {
				logErrf("terminal open failed: session=%s error=%v", request.SessionID, err)
				_ = write(protocol.New("terminal.error", protocol.TerminalError{SessionID: request.SessionID, Message: err.Error()}))
			}
		case "terminal.input":
			var input protocol.TerminalInput
			if err := decodeData(msg.Data, &input); err != nil {
				logWarnf("invalid terminal input: %v", err)
				continue
			}
			if err := a.terminal.Input(input); err != nil {
				_ = write(protocol.New("terminal.error", protocol.TerminalError{SessionID: input.SessionID, Message: err.Error()}))
			}
		case "terminal.resize":
			var request protocol.TerminalResize
			if err := decodeData(msg.Data, &request); err != nil {
				logWarnf("invalid terminal resize: %v", err)
				continue
			}
			if err := a.terminal.Resize(request); err != nil {
				_ = write(protocol.New("terminal.error", protocol.TerminalError{SessionID: request.SessionID, Message: err.Error()}))
			}
		case "terminal.close":
			var request protocol.TerminalClose
			if err := decodeData(msg.Data, &request); err != nil {
				logWarnf("invalid terminal close: %v", err)
				continue
			}
			logInfof("terminal close: session=%s", request.SessionID)
			a.terminal.Close(request.SessionID)
		}
	}
}

func (a *agent) respondDirectoryList(requestID string, write func(protocol.Message) error) {
	directories, err := a.listTargetDirectories()
	response := protocol.DirectoryListResponse{Directories: directories}
	if err != nil {
		response.Error = err.Error()
		logErrf("list target directories: %v", err)
	} else {
		logInfof("listed %d target directories", len(directories))
	}
	message := protocol.New("directory.list.response", response)
	message.RequestID = requestID
	if err := write(message); err != nil {
		logErrf("report target directories: %v", err)
	}
}

func (a *agent) listTargetDirectories() ([]string, error) {
	root, err := filepath.Abs(a.cfg.AllowedTargetDir)
	if err != nil {
		return nil, err
	}
	directories := []string{"."}
	err = filepath.WalkDir(root, func(path string, entry os.DirEntry, walkErr error) error {
		if walkErr != nil {
			return walkErr
		}
		if path == root || !entry.IsDir() {
			return nil
		}
		if len(directories) >= 1000 {
			return filepath.SkipDir
		}
		relative, err := filepath.Rel(root, path)
		if err != nil {
			return err
		}
		directories = append(directories, filepath.ToSlash(relative))
		return nil
	})
	if err != nil {
		return nil, err
	}
	sort.Strings(directories[1:])
	return directories, nil
}

func (a *agent) sendHeartbeat(ctx context.Context, write func(protocol.Message) error) error {
	h, err := a.collectHeartbeat(ctx)
	if err != nil {
		return err
	}
	h.BootID, _ = a.rebootBackend().bootID()
	h.RebootResult = a.latestRebootReceipt()
	return write(protocol.New("heartbeat", h))
}

func (a *agent) collectHeartbeat(ctx context.Context) (protocol.Heartbeat, error) {
	percent, err := cpu.PercentWithContext(ctx, 0, false)
	if err != nil {
		return protocol.Heartbeat{}, err
	}
	vm, err := mem.VirtualMemoryWithContext(ctx)
	if err != nil {
		return protocol.Heartbeat{}, err
	}
	du, err := disk.UsageWithContext(ctx, a.cfg.AllowedTargetDir)
	if err != nil {
		return protocol.Heartbeat{}, err
	}
	value := 0.0
	if len(percent) > 0 {
		value = percent[0]
	}
	return protocol.Heartbeat{CPUPercent: value, MemoryTotalBytes: vm.Total, MemoryUsedBytes: vm.Used, MemoryUsedPercent: vm.UsedPercent, DiskTotalBytes: du.Total, DiskUsedBytes: du.Used, DiskUsedPercent: du.UsedPercent, TemperatureCelsius: collectDeviceTemperature()}, nil
}

func (a *agent) executeTask(task protocol.TaskAssignment, write func(protocol.Message) error) {
	report := func(status string, progress int, message, output string) {
		logInfof("task status: id=%s status=%s progress=%d message=%s", task.TaskID, status, progress, message)
		if err := write(protocol.New("task.status", protocol.TaskStatus{TaskID: task.TaskID, Status: status, Progress: progress, Message: message, ResultOutput: output})); err != nil {
			logErrf("report task %s: %v", task.TaskID, err)
		}
	}
	downloadURL, err := a.resolveDownloadURL(task.DownloadURL)
	if err != nil {
		logErrf("task download URL rejected: id=%s url=%s", task.TaskID, downloadLogURL(task.DownloadURL))
		report("failed", 0, "invalid download URL", err.Error())
		return
	}
	logInfof("task starting: id=%s download=%s", task.TaskID, downloadLogURL(downloadURL))
	report("downloading", 5, "downloading file", "")
	finalPath, err := a.resolveTaskTarget(task)
	if err != nil {
		logErrf("task target rejected: id=%s target=%s error=%v", task.TaskID, task.TargetPath, err)
		report("failed", 0, err.Error(), "")
		return
	}
	partPath := finalPath + ".part"
	logInfof("task paths resolved: id=%s temporary=%s final=%s", task.TaskID, partPath, finalPath)
	if err := os.MkdirAll(filepath.Dir(finalPath), 0o750); err != nil {
		logErrf("task cannot create target directory: id=%s error=%v", task.TaskID, err)
		report("failed", 0, err.Error(), "")
		return
	}
	if err := a.download(downloadURL, partPath); err != nil {
		logErrf("task download failed: id=%s error=%v", task.TaskID, err)
		report("failed", 0, "download failed", err.Error())
		return
	}
	logInfof("task download completed: id=%s path=%s", task.TaskID, partPath)
	if task.SHA256 != "" {
		report("verifying", 55, "verifying SHA-256", "")
	}
	if err := verifySHA256(partPath, task.SHA256); err != nil {
		_ = os.Remove(partPath)
		logErrf("task checksum failed: id=%s error=%v", task.TaskID, err)
		report("failed", 0, "checksum verification failed", err.Error())
		return
	}
	if task.SHA256 != "" {
		logInfof("task checksum verified: id=%s", task.TaskID)
	}
	if err := os.Rename(partPath, finalPath); err != nil {
		logErrf("task move failed: id=%s source=%s target=%s error=%v", task.TaskID, partPath, finalPath, err)
		report("failed", 0, "cannot move downloaded file", err.Error())
		return
	}
	logInfof("task completed: id=%s file=%s", task.TaskID, finalPath)
	report("succeeded", 100, "file downloaded", "")
}

func (a *agent) resolveTaskTarget(task protocol.TaskAssignment) (string, error) {
	if !task.TargetIsDirectory {
		return a.safeTarget(task.TargetPath)
	}
	if task.FileName == "" || filepath.Base(task.FileName) != task.FileName || task.FileName == "." || task.FileName == ".." {
		return "", errors.New("invalid task file name")
	}
	root, err := filepath.Abs(a.cfg.AllowedTargetDir)
	if err != nil {
		return "", err
	}
	relative := filepath.FromSlash(task.TargetPath)
	if relative == "" || relative == "." {
		relative = "."
	}
	targetDirectory, err := a.safeTarget(filepath.Join(root, relative))
	if err != nil {
		return "", err
	}
	return a.safeTarget(filepath.Join(targetDirectory, task.FileName))
}

func (a *agent) download(url, path string) error {
	var offset int64
	registrationRefreshed := false
	if info, err := os.Stat(path); err == nil {
		offset = info.Size()
		logInfof("resuming partial download: path=%s offset=%d", path, offset)
	}
	client := *a.http
	previousRedirect := client.CheckRedirect
	client.CheckRedirect = func(req *http.Request, via []*http.Request) error {
		if !a.isPlatformDownload(req.URL.String()) {
			req.Header.Del("Authorization")
		}
		if previousRedirect != nil {
			return previousRedirect(req, via)
		}
		if len(via) >= 10 {
			return fmt.Errorf("too many download redirects")
		}
		return nil
	}
	for attempt := 0; attempt < 2; attempt++ {
		req, err := http.NewRequest(http.MethodGet, url, nil)
		if err != nil {
			return fmt.Errorf("invalid download request URL")
		}
		if a.isPlatformDownload(url) {
			req.Header.Set("Authorization", "Bearer "+a.currentState().Token)
		}
		if offset > 0 {
			req.Header.Set("Range", fmt.Sprintf("bytes=%d-", offset))
		}
		logInfof("download request: attempt=%d url=%s offset=%d", attempt+1, downloadLogURL(url), offset)
		resp, err := client.Do(req)
		if err != nil {
			return downloadRequestError(err)
		}
		logInfof("download response: attempt=%d status=%s content_length=%d", attempt+1, resp.Status, resp.ContentLength)
		if resp.StatusCode == http.StatusUnauthorized && a.isPlatformDownload(resp.Request.URL.String()) && !registrationRefreshed {
			_ = resp.Body.Close()
			logWarnf("download token rejected; refreshing device registration before retry: url=%s", downloadLogURL(url))
			if err := a.refreshRegistrationAfterUnauthorized(context.Background()); err != nil {
				return fmt.Errorf("refresh registration after download 401: %w", err)
			}
			registrationRefreshed = true
			attempt--
			continue
		}
		if resp.StatusCode == http.StatusRequestedRangeNotSatisfiable && offset > 0 {
			_ = resp.Body.Close()
			logWarnf("partial download is not reusable; restarting from zero: path=%s", path)
			if err := os.Remove(path); err != nil && !errors.Is(err, os.ErrNotExist) {
				return fmt.Errorf("discard invalid partial download: %w", err)
			}
			offset = 0
			continue
		}
		if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusPartialContent {
			_ = resp.Body.Close()
			return fmt.Errorf("download returned %s", resp.Status)
		}
		flags := os.O_CREATE | os.O_WRONLY
		if resp.StatusCode == http.StatusPartialContent && offset > 0 {
			flags |= os.O_APPEND
		} else {
			flags |= os.O_TRUNC
		}
		f, err := os.OpenFile(path, flags, 0o600)
		if err != nil {
			_ = resp.Body.Close()
			return err
		}
		written, copyErr := io.Copy(f, resp.Body)
		bodyCloseErr := resp.Body.Close()
		fileCloseErr := f.Close()
		if copyErr != nil {
			return copyErr
		}
		if bodyCloseErr != nil {
			return bodyCloseErr
		}
		if fileCloseErr != nil {
			return fileCloseErr
		}
		logInfof("download body saved: path=%s bytes=%d", path, written)
		return nil
	}
	return errors.New("download range retry exhausted")
}

func (a *agent) refreshRegistrationAfterUnauthorized(ctx context.Context) error {
	// A missing Node device record accepts the provided token on registration.
	// Preserve credentials for this server; an existing mismatched record must
	// be re-paired explicitly rather than resetting the local token.
	return a.registerDevice(ctx)
}

func (a *agent) isPlatformDownload(raw string) bool {
	base, err := url.Parse(a.cfg.ServerURL)
	if err != nil {
		return false
	}
	target, err := url.Parse(raw)
	return err == nil && strings.EqualFold(base.Scheme, target.Scheme) && strings.EqualFold(base.Host, target.Host) && strings.HasPrefix(target.Path, "/api/v1/agents/files/")
}

func downloadLogURL(raw string) string {
	u, err := url.Parse(raw)
	if err != nil {
		return "<invalid URL>"
	}
	u.RawQuery = ""
	u.Fragment = ""
	u.User = nil
	return u.String()
}

func downloadRequestError(err error) error {
	var requestError *url.Error
	if errors.As(err, &requestError) {
		return fmt.Errorf("download request failed: %v", requestError.Err)
	}
	return err
}

func (a *agent) resolveDownloadURL(raw string) (string, error) {
	base, err := url.Parse(strings.TrimRight(a.cfg.ServerURL, "/") + "/")
	if err != nil || base.Scheme == "" || base.Host == "" {
		return "", fmt.Errorf("invalid agent server_url %q", a.cfg.ServerURL)
	}
	reference, err := url.Parse(strings.TrimSpace(raw))
	if err != nil {
		return "", fmt.Errorf("invalid download URL")
	}
	if reference.IsAbs() && reference.Scheme != "http" && reference.Scheme != "https" {
		return "", fmt.Errorf("unsupported download URL scheme")
	}
	if !reference.IsAbs() {
		return base.ResolveReference(reference).String(), nil
	}
	// Compatibility with older servers that generated task URLs from a
	// localhost browser request or a stale -public-url setting.
	if isLoopbackHost(reference.Hostname()) && !isLoopbackHost(base.Hostname()) {
		logWarnf("rewriting loopback download host: original=%s server=%s", reference.Host, base.Host)
		reference.Scheme = base.Scheme
		reference.Host = base.Host
	}
	return reference.String(), nil
}

func isLoopbackHost(host string) bool {
	if strings.EqualFold(strings.TrimSpace(host), "localhost") {
		return true
	}
	ip := net.ParseIP(strings.Trim(host, "[]"))
	return ip != nil && ip.IsLoopback()
}

func (a *agent) safeTarget(target string) (string, error) {
	root, err := filepath.Abs(a.cfg.AllowedTargetDir)
	if err != nil {
		return "", err
	}
	candidate, err := filepath.Abs(target)
	if err != nil {
		return "", err
	}
	relative, err := filepath.Rel(root, candidate)
	if err != nil || relative == ".." || strings.HasPrefix(relative, ".."+string(filepath.Separator)) {
		return "", fmt.Errorf("target path must be under %s", root)
	}
	return candidate, nil
}
func (a *agent) markRunning(id string) bool {
	a.runM.Lock()
	defer a.runM.Unlock()
	if a.rebootPending {
		return false
	}
	if _, ok := a.running[id]; ok {
		return false
	}
	a.running[id] = struct{}{}
	return true
}
func (a *agent) unmarkRunning(id string) { a.runM.Lock(); delete(a.running, id); a.runM.Unlock() }
func toWebSocketURL(raw string) (string, error) {
	u, err := url.Parse(raw)
	if err != nil {
		return "", err
	}
	switch u.Scheme {
	case "http":
		u.Scheme = "ws"
	case "https":
		u.Scheme = "wss"
	default:
		return "", fmt.Errorf("unsupported server URL scheme %q", u.Scheme)
	}
	return u.String(), nil
}
func verifySHA256(path, want string) error {
	if strings.TrimSpace(want) == "" {
		return nil
	}
	f, err := os.Open(path)
	if err != nil {
		return err
	}
	defer f.Close()
	h := sha256.New()
	if _, err := io.Copy(h, f); err != nil {
		return err
	}
	got := hex.EncodeToString(h.Sum(nil))
	if !strings.EqualFold(got, want) {
		return fmt.Errorf("got %s, want %s", got, want)
	}
	return nil
}
func decodeData(data any, v any) error {
	b, err := json.Marshal(data)
	if err != nil {
		return err
	}
	return json.Unmarshal(b, v)
}
