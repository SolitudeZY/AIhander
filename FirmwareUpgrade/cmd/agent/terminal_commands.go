package main

import (
	"bytes"
	"encoding/base64"
	"strconv"
	"strings"
	"sync"
	"time"

	"firmwareupgrade/internal/protocol"
)

const commandMarker = "\x1b]777;fwcmd;"

// Marker parsing is independent of PTY read boundaries. Only this session's
// token is accepted after the initial handshake. No command text is logged.
type terminalCommands struct {
	mu       sync.Mutex
	pending  []byte
	token    string
	sequence uint64
	active   *protocol.TerminalCommand
	finished bool
}

func markerTime(value string) (time.Time, bool) {
	parts := strings.SplitN(value, ".", 2)
	if len(parts) != 2 || len(parts[1]) < 1 || len(parts[1]) > 9 {
		return time.Time{}, false
	}
	sec, err := strconv.ParseInt(parts[0], 10, 64)
	if err != nil || sec <= 0 {
		return time.Time{}, false
	}
	nsec, err := strconv.ParseInt(parts[1]+strings.Repeat("0", 9-len(parts[1])), 10, 64)
	if err != nil || nsec < 0 || nsec >= 1e9 {
		return time.Time{}, false
	}
	return time.Unix(sec, nsec).UTC(), true
}

func (c *terminalCommands) marker(data []byte, emit func(protocol.TerminalCommand)) {
	parts := strings.Split(string(data), ";")
	if len(parts) < 2 || len(parts[0]) > 64 || parts[0] == "" || c.finished {
		return
	}
	if parts[1] == "ready" {
		if c.token == "" {
			c.token = parts[0]
			emit(protocol.TerminalCommand{State: "ready"})
		}
		return
	}
	if c.token == "" || parts[0] != c.token || len(parts) != 4 {
		return
	}
	at, ok := markerTime(parts[2])
	if !ok {
		return
	}
	switch parts[1] {
	case "start":
		command, err := base64.StdEncoding.DecodeString(parts[3])
		if err != nil || len(command) > 8192 {
			return
		}
		c.sequence++
		value := protocol.TerminalCommand{CommandID: strconv.FormatUint(c.sequence, 10), State: "started", StartedAt: at.Format(time.RFC3339Nano), Command: string(command)}
		c.active = &value
		emit(value)
	case "end":
		code, err := strconv.Atoi(parts[3])
		if err != nil || code < 0 || code > 255 {
			return
		}
		c.end(at, code, emit)
	}
}

func (c *terminalCommands) end(at time.Time, code int, emit func(protocol.TerminalCommand)) {
	if c.active == nil {
		return
	}
	value := *c.active
	c.active = nil
	start, err := time.Parse(time.RFC3339Nano, value.StartedAt)
	if err != nil || at.Before(start) {
		return
	}
	value.State, value.EndedAt, value.Command = "finished", at.Format(time.RFC3339Nano), ""
	duration := at.Sub(start).Milliseconds()
	value.DurationMs, value.ExitCode = &duration, &code
	emit(value)
}

func (c *terminalCommands) finish(at time.Time, code int, emit func(protocol.TerminalCommand)) {
	c.mu.Lock()
	defer c.mu.Unlock()
	if !c.finished {
		c.end(at, code, emit)
		c.finished = true
	}
}

func (c *terminalCommands) feed(data []byte, final bool, output func([]byte), emit func(protocol.TerminalCommand)) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.pending = append(c.pending, data...)
	for len(c.pending) > 0 {
		index := bytes.Index(c.pending, []byte(commandMarker))
		if index < 0 {
			keep := 0
			if !final {
				for n := 1; n < len(commandMarker) && n <= len(c.pending); n++ {
					if bytes.Equal(c.pending[len(c.pending)-n:], []byte(commandMarker[:n])) {
						keep = n
					}
				}
			}
			output(c.pending[:len(c.pending)-keep])
			c.pending = append([]byte(nil), c.pending[len(c.pending)-keep:]...)
			return
		}
		if index > 0 {
			output(c.pending[:index])
			c.pending = c.pending[index:]
		}
		end := bytes.IndexByte(c.pending, '\a')
		if end < 0 {
			if final || len(c.pending) > 16384 {
				c.pending = nil
			}
			return
		}
		c.marker(c.pending[len(commandMarker):end], emit)
		c.pending = c.pending[end+1:]
	}
}
