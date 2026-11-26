//go:build !windows

package main

import (
	"os"
	"path/filepath"
	"testing"
)

func TestTerminalIsolationUID(t *testing.T) {
	for _, uid := range []string{"0", "000", "1000", "-1", "invalid"} {
		if err := validateTerminalUID(uid, 1000); err == nil {
			t.Fatalf("accepted unsafe UID %q", uid)
		}
	}
	if err := validateTerminalUID("1001", 1000); err != nil {
		t.Fatal(err)
	}
}

func TestTerminalIsolationMissingUser(t *testing.T) {
	process, err := startTerminalProcess("/bin/bash", "fw_terminal_missing_test_account", 80, 24)
	if process != nil {
		_ = process.Close()
		t.Fatal("missing account unexpectedly started a terminal")
	}
	if err == nil {
		t.Fatal("missing account must fail")
	}
}

func TestTerminalIsolationUnsafeLauncher(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "launcher")
	if err := os.WriteFile(path, []byte("#!/bin/sh\nexit 0\n"), 0777); err != nil {
		t.Fatal(err)
	}
	if err := os.Chmod(path, 0777); err != nil {
		t.Fatal(err)
	}
	if err := checkTerminalLauncher(path); err == nil {
		t.Fatal("accepted writable launcher")
	}
	link := filepath.Join(dir, "symlink")
	if err := os.Symlink(path, link); err != nil {
		t.Fatal(err)
	}
	if err := checkTerminalLauncher(link); err == nil {
		t.Fatal("accepted symlink launcher")
	}
}
