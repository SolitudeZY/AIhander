//go:build !windows

package main

import (
	"context"
	"strings"
	"testing"
	"time"

	"firmwareupgrade/internal/protocol"
)

func TestBashCommandResultsPTY(t *testing.T) {
	t.Setenv("HOME", t.TempDir())
	manager := newTerminalManager(terminalConfig{Enabled: true, Shells: []string{"/bin/bash"}})
	defer manager.CloseAll()
	messages := make(chan protocol.Message, 1024)
	if err := manager.Open(context.Background(), protocol.TerminalOpen{SessionID: "commands", Cols: 120, Rows: 35}, func(m protocol.Message) error { messages <- m; return nil }); err != nil {
		t.Fatal(err)
	}
	wait := func(state string) protocol.TerminalCommand {
		t.Helper()
		deadline := time.NewTimer(10 * time.Second)
		defer deadline.Stop()
		for {
			select {
			case m := <-messages:
				if m.Type == "terminal.command" {
					var e protocol.TerminalCommand
					if err := decodeData(m.Data, &e); err != nil {
						t.Fatal(err)
					}
					if e.State == state {
						return e
					}
				}
			case <-deadline.C:
				t.Fatalf("timeout waiting for %s", state)
			}
		}
	}
	wait("ready")
	input := func(s string) {
		t.Helper()
		if err := manager.Input(protocol.TerminalInput{SessionID: "commands", Data: []byte(s)}); err != nil {
			t.Fatal(err)
		}
	}
	for _, test := range []struct {
		command string
		code    int
		min     int64
	}{
		{"true", 0, 0}, {"false", 1, 0}, {"sleep 0.2; false", 1, 180},
		{"printf 中文 | cat", 0, 0}, {"for x in a b; do\necho $x\ndone", 0, 0},
		{" false", 1, 0}, {"false", 1, 0}, {"printf 'STATUS=%s\\n' $?", 0, 0},
	} {
		input(test.command + "\r")
		started := wait("started")
		finished := wait("finished")
		if started.Command == "" || finished.CommandID != started.CommandID || *finished.ExitCode != test.code || *finished.DurationMs < test.min {
			t.Fatalf("%q: started=%+v finished=%+v", test.command, started, finished)
		}
	}
	// A command queued during foreground execution is a separate execution unit.
	input("sleep 0.1\rfalse\r")
	wait("started")
	first := wait("finished")
	wait("started")
	second := wait("finished")
	if *first.ExitCode != 0 || *second.ExitCode != 1 {
		t.Fatal(first, second)
	}
	input("sleep 10\r")
	wait("started")
	time.Sleep(100 * time.Millisecond)
	input("\x03")
	cancelled := wait("finished")
	if *cancelled.ExitCode != 130 {
		t.Fatal(cancelled)
	}
	input("exit 7\r")
	started := wait("started")
	finished := wait("finished")
	if !strings.Contains(started.Command, "exit 7") || *finished.ExitCode != 7 {
		t.Fatal(started, finished)
	}
}
