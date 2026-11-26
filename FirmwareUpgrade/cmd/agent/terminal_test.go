package main

import (
	"bytes"
	"context"
	"runtime"
	"testing"
	"time"

	"firmwareupgrade/internal/protocol"
)

func TestTerminalRunsCommandAndReturnsOutput(t *testing.T) {
	shell := "/bin/sh"
	commands := [][]byte{[]byte("\r"), []byte("printf terminal-test-ok\\n"), []byte("\r"), []byte("exit"), []byte("\r")}
	if runtime.GOOS == "windows" {
		shell = "cmd.exe"
		commands = [][]byte{[]byte("\r"), []byte("echo terminal-test-ok"), []byte("\r"), []byte("exit"), []byte("\r")}
	}
	manager := newTerminalManager(terminalConfig{Enabled: true, Shells: []string{"missing-shell-for-fallback-test", shell}, MaxSessions: 1})
	defer manager.CloseAll()
	messages := make(chan protocol.Message, 32)
	send := func(message protocol.Message) error {
		messages <- message
		return nil
	}
	if err := manager.Open(context.Background(), protocol.TerminalOpen{SessionID: "test-session", Cols: 80, Rows: 24}, send); err != nil {
		t.Fatal(err)
	}
	for _, command := range commands {
		if err := manager.Input(protocol.TerminalInput{SessionID: "test-session", Data: command}); err != nil {
			t.Fatal(err)
		}
	}

	deadline := time.NewTimer(10 * time.Second)
	defer deadline.Stop()
	var output []byte
	exited := false
	for !exited || !bytes.Contains(output, []byte("terminal-test-ok")) {
		select {
		case message := <-messages:
			switch message.Type {
			case "terminal.output":
				var data protocol.TerminalOutput
				if err := decodeData(message.Data, &data); err != nil {
					t.Fatal(err)
				}
				output = append(output, data.Data...)
			case "terminal.exited":
				exited = true
			}
		case <-deadline.C:
			t.Fatalf("terminal output timed out; output=%q exited=%v", output, exited)
		}
	}
}
