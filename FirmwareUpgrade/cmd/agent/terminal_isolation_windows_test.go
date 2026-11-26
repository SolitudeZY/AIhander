//go:build windows

package main

import (
	"strings"
	"testing"
)

func TestTerminalIsolationWindowsRejected(t *testing.T) {
	for _, runAsUser := range []string{"edgeops", " "} {
		process, err := startTerminalProcess("cmd.exe", runAsUser, 80, 24)
		if process != nil {
			_ = process.Close()
			t.Fatal("Windows must not start an unisolated process")
		}
		if err == nil || !strings.Contains(err.Error(), "only on Linux") {
			t.Fatalf("expected explicit unsupported-platform error, got %v", err)
		}
	}
}
