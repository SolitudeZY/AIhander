package main

import (
	"bytes"
	"encoding/base64"
	"strings"
	"testing"

	"firmwareupgrade/internal/protocol"
)

func TestTerminalCommandMarkersEverySplit(t *testing.T) {
	raw := "中文\x1b[32m" + commandMarker + "test;ready\a" + commandMarker + "test;start;1700000000.123456;" + base64.StdEncoding.EncodeToString([]byte("sleep 1; false")) + "\ahello" + commandMarker + "test;end;1700000001.456789;1\a$ "
	for split := 0; split <= len(raw); split++ {
		tracker := &terminalCommands{}
		var output bytes.Buffer
		var events []protocol.TerminalCommand
		emit := func(e protocol.TerminalCommand) { events = append(events, e) }
		write := func(p []byte) { output.Write(p) }
		tracker.feed([]byte(raw[:split]), false, write, emit)
		tracker.feed([]byte(raw[split:]), true, write, emit)
		if output.String() != "中文\x1b[32mhello$ " || len(events) != 3 {
			t.Fatalf("split %d: output=%q events=%+v", split, output.String(), events)
		}
		if events[1].Command != "sleep 1; false" || *events[2].ExitCode != 1 || *events[2].DurationMs != 1333 || events[2].CommandID != events[1].CommandID {
			t.Fatalf("bad result: %+v", events)
		}
	}
}

func TestTerminalCommandMarkersInvalidAndBounded(t *testing.T) {
	tracker := &terminalCommands{}
	var events []protocol.TerminalCommand
	emit := func(e protocol.TerminalCommand) { events = append(events, e) }
	output := func([]byte) {}
	tracker.feed([]byte(commandMarker+"token;ready\a"+commandMarker+"other;start;1700000000.1;dHJ1ZQ==\a"+commandMarker+"token;start;bad;dHJ1ZQ==\a"), false, output, emit)
	if len(events) != 1 {
		t.Fatal(events)
	}
	tracker.feed([]byte(commandMarker+strings.Repeat("x", 20000)), false, output, emit)
	if len(tracker.pending) != 0 {
		t.Fatal("unbounded marker")
	}
}
