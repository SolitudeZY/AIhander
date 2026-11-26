package main

import (
	"context"
	"sync"

	"firmwareupgrade/internal/protocol"
)

// managementArbiter serializes state-changing management commands. A waiting
// local setUp command is always admitted before a Cloud command.
type managementArbiter struct {
	mu           sync.Mutex
	cond         *sync.Cond
	active       bool
	setupWaiting int
}

func newManagementArbiter() *managementArbiter {
	a := &managementArbiter{}
	a.cond = sync.NewCond(&a.mu)
	return a
}

func (a *managementArbiter) acquire(source string) func() {
	a.mu.Lock()
	if source == "setUp" {
		a.setupWaiting++
		for a.active {
			a.cond.Wait()
		}
		a.setupWaiting--
	} else {
		for a.active || a.setupWaiting > 0 {
			a.cond.Wait()
		}
	}
	a.active = true
	a.mu.Unlock()
	return func() {
		a.mu.Lock()
		a.active = false
		a.cond.Broadcast()
		a.mu.Unlock()
	}
}

// handleManagementMessage is shared by Cloud and setUp. Both management ends
// therefore use the same command names and values structures.
func (a *agent) handleManagementMessage(ctx context.Context, source string, msg protocol.Message, write func(protocol.Message) error) bool {
	switch msg.Type {
	case "deviceReboot":
		if source != "cloud" {
			return false
		}
		var request protocol.DeviceRebootRequest
		if decodeData(msg.Data, &request) != nil {
			return true
		}
		go a.respondDeviceReboot(msg.RequestID, request, write)
	case "channelTest":
		var request protocol.VideoTestRequest
		if decodeData(msg.Data, &request) != nil {
			return true
		}
		go func() {
			result := probeVideo(ctx, request)
			response := protocol.New("channelTestResult", result)
			response.RequestID = msg.RequestID
			_ = write(response)
		}()

	case "directory.list":
		go a.respondDirectoryList(msg.RequestID, write)
	case "channelList":
		channels, err := a.loadVideoChannels()
		result := protocol.VideoChannelListResult{Operate: err == nil, Channels: channels}
		if err != nil {
			result.Error = err.Error()
		}
		response := protocol.New("channelListResult", result)
		response.RequestID = msg.RequestID
		_ = write(response)
	case "channelSet":
		var channel protocol.VideoChannelConfig
		if err := decodeData(msg.Data, &channel); err != nil {
			logWarnf("invalid video channel configuration from %s: %v", source, err)
			return true
		}
		release := a.control.acquire(source)
		result := a.configureDetectorChannel(ctx, channel)
		release()
		response := protocol.New("channelSet", result)
		response.RequestID = msg.RequestID
		_ = write(response)
	case "channelDelete":
		var channel protocol.VideoChannelDelete
		if err := decodeData(msg.Data, &channel); err != nil {
			logWarnf("invalid video channel delete from %s: %v", source, err)
			return true
		}
		release := a.control.acquire(source)
		result := a.deleteDetectorChannel(ctx, channel)
		release()
		response := protocol.New("channelDelete", result)
		response.RequestID = msg.RequestID
		_ = write(response)
	case "terminal.open":
		var request protocol.TerminalOpen
		if decodeData(msg.Data, &request) != nil {
			return true
		}
		release := a.control.acquire(source)
		err := a.terminal.Open(ctx, request, write)
		release()
		if err != nil {
			_ = write(protocol.New("terminal.error", protocol.TerminalError{SessionID: request.SessionID, Message: err.Error()}))
		} else {
			a.trackTerminal(source, request.SessionID)
		}
	case "terminal.input":
		var input protocol.TerminalInput
		if decodeData(msg.Data, &input) == nil {
			if err := a.terminal.Input(input); err != nil {
				_ = write(protocol.New("terminal.error", protocol.TerminalError{SessionID: input.SessionID, Message: err.Error()}))
			}
		}
	case "terminal.resize":
		var request protocol.TerminalResize
		if decodeData(msg.Data, &request) == nil {
			if err := a.terminal.Resize(request); err != nil {
				_ = write(protocol.New("terminal.error", protocol.TerminalError{SessionID: request.SessionID, Message: err.Error()}))
			}
		}
	case "terminal.close":
		var request protocol.TerminalClose
		if decodeData(msg.Data, &request) == nil {
			a.terminal.Close(request.SessionID)
			a.untrackTerminal(source, request.SessionID)
		}
	default:
		return false
	}
	return true
}

func (a *agent) trackTerminal(owner, id string) {
	a.terminalOwnerMu.Lock()
	defer a.terminalOwnerMu.Unlock()
	if a.terminalOwners[owner] == nil {
		a.terminalOwners[owner] = map[string]struct{}{}
	}
	a.terminalOwners[owner][id] = struct{}{}
}

func (a *agent) untrackTerminal(owner, id string) {
	a.terminalOwnerMu.Lock()
	delete(a.terminalOwners[owner], id)
	a.terminalOwnerMu.Unlock()
}

func (a *agent) closeManagementTerminals(owner string) {
	a.terminalOwnerMu.Lock()
	ids := make([]string, 0, len(a.terminalOwners[owner]))
	for id := range a.terminalOwners[owner] {
		ids = append(ids, id)
	}
	delete(a.terminalOwners, owner)
	a.terminalOwnerMu.Unlock()
	for _, id := range ids {
		a.terminal.Close(id)
	}
}
