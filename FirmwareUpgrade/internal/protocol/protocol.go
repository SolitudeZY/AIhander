package protocol

import (
	"encoding/json"
	"time"
)

// MaxControlMessageBytes allows a compressed snapshot encoded as Base64 in a
// channelStatusChanged JSON message while keeping a finite per-message limit.
const MaxControlMessageBytes int64 = 1 << 20

// Message is the JSON envelope exchanged over the management WebSocket.
// The on-wire format intentionally contains only _from, cmd, time and values.
// Type, RequestID and Data are kept for the existing business handlers and are
// never serialized to the WebSocket.
type Message struct {
	From   string `json:"_from"`
	Cmd    string `json:"cmd"`
	Time   string `json:"time"`
	Values any    `json:"values"`

	Type      string `json:"-"`
	RequestID string `json:"-"`
	Data      any    `json:"-"`
}

// WithSource fills the transport fields immediately before a message is sent.
func (m Message) WithSource(source string) Message {
	if m.From == "" {
		m.From = source
	}
	if m.Cmd == "" {
		m.Cmd = m.Type
	}
	if m.Values == nil {
		m.Values = m.Data
	}
	if m.Time == "" {
		m.Time = time.Now().Format(time.RFC3339Nano)
	}
	return m
}

// New creates a message in the unified WebSocket format while retaining the
// command name for existing internal handlers.
func New(cmd string, values any) Message {
	return Message{Cmd: cmd, Type: cmd, Values: values, Data: values}
}

func (m Message) MarshalJSON() ([]byte, error) {
	m = m.WithSource(m.From)
	values := m.Values
	if m.RequestID != "" {
		var fields map[string]any
		data, err := json.Marshal(values)
		if err != nil {
			return nil, err
		}
		if err := json.Unmarshal(data, &fields); err != nil {
			return nil, err
		}
		if fields == nil {
			fields = make(map[string]any)
		}
		fields["requestId"] = m.RequestID
		values = fields
	}
	return json.Marshal(struct {
		From   string `json:"_from"`
		Cmd    string `json:"cmd"`
		Time   string `json:"time"`
		Values any    `json:"values"`
	}{
		From:   m.From,
		Cmd:    m.Cmd,
		Time:   m.Time,
		Values: values,
	})
}

func (m *Message) UnmarshalJSON(data []byte) error {
	var wire struct {
		From   string `json:"_from"`
		Cmd    string `json:"cmd"`
		Time   string `json:"time"`
		Values any    `json:"values"`
	}
	if err := json.Unmarshal(data, &wire); err != nil {
		return err
	}
	m.From, m.Cmd, m.Time, m.Values = wire.From, wire.Cmd, wire.Time, wire.Values
	if fields, ok := wire.Values.(map[string]any); ok {
		if requestID, ok := fields["requestId"].(string); ok {
			m.RequestID = requestID
		}
	}
	// Keep existing command handlers working while their business commands are
	// progressively migrated to the vision-specific command set.
	m.Type, m.Data = wire.Cmd, wire.Values
	if wire.Cmd == "ping" {
		m.Type = "heartbeat"
	}
	return nil
}

type RegisterRequest struct {
	DeviceID            string `json:"device_id"`
	Token               string `json:"device_token,omitempty"`
	LegacyToken         string `json:"token,omitempty"` // Deprecated input alias.
	SKU                 string `json:"sku"`
	RuntimeVersion      string `json:"runtime_version"`
	ModelVersion        string `json:"model_version"`
	Address             string `json:"address"`
	RegistrationAddress string `json:"-"`
	Name                string `json:"name"`
	OS                  string `json:"os"`
	Arch                string `json:"arch"`
	CPUModel            string `json:"cpu_model,omitempty"`
	AgentVersion        string `json:"agent_version"`
}

type RegisterResponse struct {
	DeviceID string `json:"device_id"`
	Token    string `json:"device_token"`
}

type DeviceRebootRequest struct {
	OperationID string `json:"operation_id"`
}
type DeviceRebootResult struct {
	OperationID string `json:"operation_id"`
	Status      string `json:"status"`
	BootID      string `json:"boot_id,omitempty"`
	ErrorCode   string `json:"error_code,omitempty"`
}
type Heartbeat struct {
	BootID             string              `json:"boot_id,omitempty"`
	RebootResult       *DeviceRebootResult `json:"reboot_result,omitempty"`
	CPUPercent         float64             `json:"cpu_percent"`
	MemoryTotalBytes   uint64              `json:"memory_total_bytes"`
	MemoryUsedBytes    uint64              `json:"memory_used_bytes"`
	MemoryUsedPercent  float64             `json:"memory_used_percent"`
	DiskTotalBytes     uint64              `json:"disk_total_bytes"`
	DiskUsedBytes      uint64              `json:"disk_used_bytes"`
	DiskUsedPercent    float64             `json:"disk_used_percent"`
	TemperatureCelsius *float64            `json:"temperature_celsius,omitempty"`
}

type TaskAssignment struct {
	TaskID            string `json:"task_id"`
	FileID            string `json:"file_id"`
	FileName          string `json:"file_name,omitempty"`
	DownloadURL       string `json:"download_url"`
	SHA256            string `json:"sha256,omitempty"`
	TargetPath        string `json:"target_path"`
	TargetIsDirectory bool   `json:"target_is_directory,omitempty"`
	Version           string `json:"version"`
}

type TaskStatus struct {
	TaskID       string `json:"task_id"`
	Status       string `json:"status"`
	Progress     int    `json:"progress"`
	Message      string `json:"message,omitempty"`
	ResultOutput string `json:"result_output,omitempty"`
}

type DirectoryListRequest struct{}

type DirectoryListResponse struct {
	Directories []string `json:"directories,omitempty"`
	Error       string   `json:"error,omitempty"`
}

type VideoChannelConfig struct {
	ChannelID        string `json:"channelId"`
	Name             string `json:"name"`
	Enabled          bool   `json:"enabled"`
	RTSPURL          string `json:"rtspUrl"`
	Transport        string `json:"transport"`
	ModuleName       string `json:"moduleName"`
	Revision         int64  `json:"revision,omitempty"`
	ExpectedRevision *int64 `json:"expectedRevision,omitempty"`
}

type VideoChannelDelete struct {
	ChannelID        string `json:"channelId"`
	ExpectedRevision *int64 `json:"expectedRevision,omitempty"`
}

// DetectorChannelDelete is sent after Agent has validated the management-side
// revision. Detector only needs the channel identity; Agent updates its mirror
// after Detector confirms the deletion.
type DetectorChannelDelete struct {
	ChannelID string `json:"channelId"`
}

// VideoTestRequest is read-only: it must never invoke channelSet.
type VideoTestRequest struct {
	RTSPURL   string `json:"rtspUrl"`
	Transport string `json:"transport"`
}
type VideoTestResult struct {
	Success    bool   `json:"success"`
	DurationMS int64  `json:"duration_ms"`
	Codec      string `json:"codec"`
	Resolution string `json:"resolution"`
	Message    string `json:"message"`
	ErrorCode  string `json:"error_code,omitempty"`
}

type VideoChannelResult struct {
	DetectionStatus    string              `json:"detectionStatus,omitempty"`
	DetectionErrorCode string              `json:"detectionErrorCode,omitempty"`
	ModelVersion       string              `json:"modelVersion,omitempty"`
	RecoveryAction     string              `json:"recoveryAction,omitempty"`
	Codec              string              `json:"codec,omitempty"`
	Resolution         string              `json:"resolution,omitempty"`
	QualityStatus      string              `json:"qualityStatus,omitempty"`
	Operate            bool                `json:"operate"`
	ChannelID          string              `json:"channelId"`
	Channel            *VideoChannelConfig `json:"channel,omitempty"`
	Revision           int64               `json:"revision,omitempty"`
	Status             string              `json:"status,omitempty"`
	PictureMetrics     *PictureMetrics     `json:"pictureMetrics,omitempty"`
	InputFPS           float64             `json:"inputFps,omitempty"`
	Snapshot           []byte              `json:"snapshot,omitempty"`
	SnapshotMimeType   string              `json:"snapshotMimeType,omitempty"`
	ObservedAt         string              `json:"observedAt,omitempty"`
	Error              string              `json:"err,omitempty"`
}

// PictureMetrics contains the four numeric picture-quality measurements
// produced together for a video frame. Threshold interpretation belongs to
// the Detector; these values are not mutually exclusive status enums.
type PictureMetrics struct {
	BlackScreen        float64 `json:"black_screen"`
	Occlusion          float64 `json:"occlusion"`
	Blur               float64 `json:"blur"`
	BrightnessAbnormal float64 `json:"brightness_abnormal"`
}

type VideoChannelListRequest struct{}

type VideoChannelListResult struct {
	Operate  bool                 `json:"operate"`
	Channels []VideoChannelConfig `json:"channels,omitempty"`
	Error    string               `json:"err,omitempty"`
}

type AlarmRecord struct {
	RowID         int64   `json:"rowId,omitempty"`
	ChannelID     string  `json:"channelId"`
	ModelVersion  string  `json:"modelVersion,omitempty"`
	DetectionType string  `json:"detectionType"`
	Confidence    float64 `json:"confidence"`
	AlarmTime     string  `json:"alarmTime"`
	Reported      bool    `json:"reported"`
	ReportedAt    string  `json:"reportedAt,omitempty"`
	Image         []byte  `json:"image,omitempty"`
	ImageMimeType string  `json:"imageMimeType,omitempty"`
	ImagePath     string  `json:"-"`
}

type AlarmReport struct {
	Alarms []AlarmRecord `json:"alarms"`
}

type AlarmReportResult struct {
	Operate bool    `json:"operate"`
	RowIDs  []int64 `json:"rowIds,omitempty"`
	Error   string  `json:"err,omitempty"`
}

// DetectorAlarm is emitted once by Detector after identifying an event. Agent
// assigns the local SQLite rowid after receiving it.
type DetectorAlarm struct {
	ChannelID     string  `json:"channelId"`
	ModelVersion  string  `json:"modelVersion,omitempty"`
	DetectionType string  `json:"detectionType"`
	Confidence    float64 `json:"confidence"`
	AlarmTime     string  `json:"alarmTime"`
	Image         []byte  `json:"image,omitempty"`
	ImageMimeType string  `json:"imageMimeType,omitempty"`
}

type TerminalOpen struct {
	SessionID string `json:"session_id"`
	Shell     string `json:"shell"`
	Cols      int    `json:"cols"`
	Rows      int    `json:"rows"`
}

type TerminalOpened struct {
	SessionID string `json:"session_id"`
	PID       int    `json:"pid"`
}

type TerminalInput struct {
	SessionID string `json:"session_id"`
	Data      []byte `json:"data"`
}

type TerminalOutput struct {
	SessionID string `json:"session_id"`
	Sequence  uint64 `json:"sequence"`
	Data      []byte `json:"data"`
}

type TerminalResize struct {
	SessionID string `json:"session_id"`
	Cols      int    `json:"cols"`
	Rows      int    `json:"rows"`
}

type TerminalClose struct {
	SessionID string `json:"session_id"`
}

type TerminalExited struct {
	SessionID string `json:"session_id"`
	ExitCode  int    `json:"exit_code"`
}

// One foreground Bash submission (a pipeline/compound command is one unit).
type TerminalCommand struct {
	SessionID  string `json:"session_id"`
	CommandID  string `json:"command_id,omitempty"`
	State      string `json:"state"`
	Command    string `json:"command,omitempty"`
	StartedAt  string `json:"started_at,omitempty"`
	EndedAt    string `json:"ended_at,omitempty"`
	DurationMs *int64 `json:"duration_ms,omitempty"`
	ExitCode   *int   `json:"exit_code,omitempty"`
}

type TerminalError struct {
	SessionID string `json:"session_id"`
	Message   string `json:"message"`
}
