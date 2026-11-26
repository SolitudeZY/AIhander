package main

import (
	"context"
	"errors"
	"fmt"
	"sync"
	"sync/atomic"
	"time"

	"firmwareupgrade/internal/protocol"

	"github.com/coder/websocket"
	"github.com/coder/websocket/wsjson"
)

// detectorClient owns Agent's outbound WebSocket to the local Detector. The
// connection is established proactively when Agent starts and reused for
// subsequent changes. A failed write is retried once on a new connection.
type detectorClient struct {
	url       string
	mu        sync.Mutex
	conn      *websocket.Conn
	pendingMu sync.Mutex
	pending   map[string]chan protocol.Message
	sequence  atomic.Uint64
}

func newDetectorClient(url string) *detectorClient {
	return &detectorClient{url: url, pending: make(map[string]chan protocol.Message)}
}

func (d *detectorClient) Request(ctx context.Context, message protocol.Message) (protocol.Message, error) {
	requestID := fmt.Sprintf("detector-%d-%d", time.Now().UnixNano(), d.sequence.Add(1))
	message.RequestID = requestID
	waiter := make(chan protocol.Message, 1)
	d.pendingMu.Lock()
	if d.pending == nil {
		d.pending = make(map[string]chan protocol.Message)
	}
	d.pending[requestID] = waiter
	d.pendingMu.Unlock()
	defer func() {
		d.pendingMu.Lock()
		delete(d.pending, requestID)
		d.pendingMu.Unlock()
	}()
	if err := d.Send(message); err != nil {
		return protocol.Message{}, err
	}
	select {
	case response := <-waiter:
		return response, nil
	case <-ctx.Done():
		return protocol.Message{}, ctx.Err()
	}
}

func (d *detectorClient) Send(message protocol.Message) error {
	d.mu.Lock()
	defer d.mu.Unlock()
	for attempt := 0; attempt < 2; attempt++ {
		if err := d.connectLocked(); err != nil {
			return err
		}
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		err := wsjson.Write(ctx, d.conn, message.WithSource("agent"))
		cancel()
		if err == nil {
			return nil
		}
		d.closeLocked()
		if attempt == 1 {
			return fmt.Errorf("send to detector: %w", err)
		}
	}
	return errors.New("send to detector failed")
}

func (d *detectorClient) Connect() error {
	d.mu.Lock()
	defer d.mu.Unlock()
	return d.connectLocked()
}

func (d *detectorClient) ReadLoop(ctx context.Context, handle func(protocol.Message)) error {
	d.mu.Lock()
	if err := d.connectLocked(); err != nil {
		d.mu.Unlock()
		return err
	}
	conn := d.conn
	d.mu.Unlock()
	for {
		var message protocol.Message
		if err := wsjson.Read(ctx, conn, &message); err != nil {
			d.invalidate(conn)
			return err
		}
		if d.deliverResponse(message) {
			continue
		}
		handle(message)
	}
}

func (d *detectorClient) deliverResponse(message protocol.Message) bool {
	if message.RequestID == "" {
		return false
	}
	d.pendingMu.Lock()
	waiter := d.pending[message.RequestID]
	d.pendingMu.Unlock()
	if waiter == nil {
		return false
	}
	select {
	case waiter <- message:
	default:
	}
	return true
}

func (d *detectorClient) invalidate(conn *websocket.Conn) {
	d.mu.Lock()
	if d.conn == conn {
		d.conn = nil
		_ = conn.CloseNow()
	}
	d.mu.Unlock()
}

func (d *detectorClient) connectLocked() error {
	if d.conn != nil {
		return nil
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	conn, _, err := websocket.Dial(ctx, d.url, nil)
	cancel()
	if err != nil {
		return fmt.Errorf("connect detector %s: %w", d.url, err)
	}
	conn.SetReadLimit(protocol.MaxControlMessageBytes)
	d.conn = conn
	logInfof("Detector connection established: %s", d.url)
	return nil
}

func (d *detectorClient) Close() {
	d.mu.Lock()
	defer d.mu.Unlock()
	d.closeLocked()
}

func (d *detectorClient) closeLocked() {
	if d.conn != nil {
		_ = d.conn.Close(websocket.StatusNormalClosure, "agent stopped")
		d.conn = nil
	}
}

func (a *agent) maintainDetector(ctx context.Context) {
	for {
		err := a.detector.Connect()
		if err == nil {
			readDone := make(chan error, 1)
			go func() { readDone <- a.detector.ReadLoop(ctx, a.handleDetectorMessage) }()
			if syncErr := a.syncChannelsFromDetector(ctx); syncErr != nil {
				logErrf("synchronize Agent channel mirror from Detector: %v", syncErr)
			}
			err = <-readDone
		}
		if ctx.Err() != nil {
			return
		}
		logWarnf("Detector connection unavailable: %v; retrying in 10s", err)
		timer := time.NewTimer(10 * time.Second)
		select {
		case <-ctx.Done():
			timer.Stop()
			return
		case <-timer.C:
		}
	}
}

func (a *agent) syncChannelsFromDetector(ctx context.Context) error {
	if a.detector == nil {
		return errors.New("Detector client is not initialized")
	}
	var release func()
	if a.control != nil {
		release = a.control.acquire("detector")
		defer release()
	}
	requestCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()
	response, err := a.detector.Request(requestCtx, protocol.New("channelList", protocol.VideoChannelListRequest{}))
	if err != nil {
		return fmt.Errorf("request Detector configuration: %w", err)
	}
	if response.Type != "channelListResult" {
		return fmt.Errorf("unexpected Detector response %q", response.Type)
	}
	var result protocol.VideoChannelListResult
	if err := decodeData(response.Data, &result); err != nil {
		return fmt.Errorf("decode Detector configuration: %w", err)
	}
	if !result.Operate {
		return fmt.Errorf("Detector configuration query failed: %s", result.Error)
	}
	if err := a.replaceVideoChannelMirror(result.Channels); err != nil {
		return fmt.Errorf("replace Agent channel mirror: %w", err)
	}
	logInfof("Agent channel mirror synchronized from Detector: channels=%d", len(result.Channels))
	return nil
}

func (a *agent) handleDetectorMessage(message protocol.Message) {
	switch message.Type {
	case "channelStatusChanged":
		a.handleDetectorChannelStatus(message)
	case "alarmDetected":
		a.handleDetectorAlarm(message)
	default:
		logWarnf("ignored Detector message: from=%s cmd=%s", message.From, message.Type)
	}
}

func (a *agent) handleDetectorChannelStatus(message protocol.Message) {
	var status protocol.VideoChannelResult
	if err := decodeData(message.Data, &status); err != nil {
		logWarnf("invalid Detector channel status: %v", err)
		return
	}
	if status.ChannelID == "" || status.Status == "" {
		logWarnf("invalid Detector channel status: channelId and status are required")
		return
	}
	if status.ObservedAt == "" {
		status.ObservedAt = message.Time
		if status.ObservedAt == "" {
			status.ObservedAt = time.Now().Format(time.RFC3339Nano)
		}
	}
	a.channelStatusMu.Lock()
	if a.channelStatuses == nil {
		a.channelStatuses = make(map[string]protocol.VideoChannelResult)
	}
	a.channelStatuses[status.ChannelID] = status
	a.channelStatusMu.Unlock()
	if a.setup != nil {
		go a.setup.Broadcast(protocol.New("channelStatusChanged", status))
	}

	if a.detectorStatusUpdates != nil {
		select {
		case a.detectorStatusUpdates <- status:
		default:
			// Status snapshots are periodic. Drop the oldest queued update so the
			// latest observation is retained while Cloud is temporarily offline.
			select {
			case <-a.detectorStatusUpdates:
			default:
			}
			select {
			case a.detectorStatusUpdates <- status:
			default:
			}
		}
	}
	logInfof("Detector channel status received: channel_id=%s status=%s fps=%.1f snapshot_bytes=%d", status.ChannelID, status.Status, status.InputFPS, len(status.Snapshot))
}

func (a *agent) handleDetectorAlarm(message protocol.Message) {
	var event protocol.DetectorAlarm
	if err := decodeData(message.Data, &event); err != nil {
		logWarnf("invalid Detector alarm: %v", err)
		return
	}
	rowID, err := a.recordDetectorAlarm(event)
	if err != nil {
		logErrf("persist Detector alarm: channel_id=%s error=%v", event.ChannelID, err)
	} else {
		logInfof("Detector alarm persisted: channel_id=%s row_id=%d", event.ChannelID, rowID)
		if a.alarmReportRequests != nil {
			select {
			case a.alarmReportRequests <- struct{}{}:
			default:
			}
		}
		if a.setup != nil {
			go a.setup.ReportAlarm()
		}
	}
}

func (a *agent) detectorChannelStatus(channelID string) (protocol.VideoChannelResult, bool) {
	a.channelStatusMu.RLock()
	status, ok := a.channelStatuses[channelID]
	a.channelStatusMu.RUnlock()
	return status, ok
}

func (a *agent) configureDetectorChannel(ctx context.Context, channel protocol.VideoChannelConfig) protocol.VideoChannelResult {
	result := protocol.VideoChannelResult{ChannelID: channel.ChannelID, Status: "stopped"}
	if a.detector == nil {
		result.Error = "配置失败，请重试: Detector 未初始化"
		return result
	}
	if err := validateVideoChannel(&channel); err != nil {
		result.Error = err.Error()
		return result
	}
	if err := a.checkVideoChannelRevision(channel.ChannelID, channel.ExpectedRevision, channel.ExpectedRevision != nil); err != nil {
		result.Error = err.Error()
		return result
	}
	if err := a.checkVideoChannelNameUnique(channel.ChannelID, channel.Name); err != nil {
		logWarnf("channel name uniqueness check failed: %v", err)
		result.Error = err.Error()
		return result
	}
	channel.ExpectedRevision = nil
	channel.Revision = 0
	requestCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()
	response, err := a.detector.Request(requestCtx, protocol.New("channelSet", channel))
	if err != nil {
		result.Error = "配置失败，请重试: " + err.Error()
		return result
	}
	if response.Type != "channelSetResult" {
		result.Error = "配置失败，请重试: Detector 返回了无效应答"
		return result
	}
	if err := decodeData(response.Data, &result); err != nil {
		result.Error = "配置失败，请重试: Detector 应答无法解析"
		result.Operate = false
		return result
	}
	if !result.Operate {
		if result.Error == "" {
			result.Error = "配置失败，请重试"
		} else {
			result.Error = "配置失败，请重试: " + result.Error
		}
		return result
	}
	if result.Channel == nil {
		result.Operate = false
		result.Error = "配置失败，请重试: Detector 未返回最终配置"
		return result
	}
	saved, err := a.mirrorVideoChannel(*result.Channel)
	if err != nil {
		result.Operate = false
		result.Error = "配置失败，请重试: 更新 Agent 配置镜像失败: " + err.Error()
		return result
	}
	result.Channel, result.Revision = &saved, saved.Revision
	return result
}

func (a *agent) deleteDetectorChannel(ctx context.Context, channel protocol.VideoChannelDelete) protocol.VideoChannelResult {
	result := protocol.VideoChannelResult{ChannelID: channel.ChannelID}
	if a.detector == nil {
		result.Error = "配置失败，请重试: Detector 未初始化"
		return result
	}
	if err := a.checkVideoChannelRevision(channel.ChannelID, channel.ExpectedRevision, false); err != nil {
		result.Error = err.Error()
		return result
	}
	requestCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()
	response, err := a.detector.Request(requestCtx, protocol.New("channelDelete", protocol.DetectorChannelDelete{ChannelID: channel.ChannelID}))
	if err != nil {
		result.Error = "配置失败，请重试: " + err.Error()
		return result
	}
	if response.Type != "channelDeleteResult" {
		result.Error = "配置失败，请重试: Detector 返回了无效应答"
		return result
	}
	if err := decodeData(response.Data, &result); err != nil {
		result.Error = "配置失败，请重试: Detector 应答无法解析"
		result.Operate = false
		return result
	}
	if !result.Operate {
		if result.Error == "" {
			result.Error = "配置失败，请重试"
		} else {
			result.Error = "配置失败，请重试: " + result.Error
		}
		return result
	}
	if err := a.deleteVideoChannelRevision(channel.ChannelID, nil); err != nil {
		result.Operate = false
		result.Error = "配置失败，请重试: 更新 Agent 配置镜像失败: " + err.Error()
	}
	return result
}
