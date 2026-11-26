package main

import (
	"encoding/json"
	"os"
	"path/filepath"
	"slices"
	"testing"
	"time"

	"firmwareupgrade/internal/protocol"
)

func TestLoadOrCreateAgentConfigCreatesDefaultFile(t *testing.T) {
	configPath := filepath.Join(t.TempDir(), "configs", "agent.example.json")

	cfg, created, err := loadOrCreateAgentConfig(configPath)
	if err != nil {
		t.Fatal(err)
	}
	if !created {
		t.Fatal("missing configuration was not reported as created")
	}
	if cfg.ServerURL != "http://127.0.0.1:4700" {
		t.Fatalf("default server URL = %q", cfg.ServerURL)
	}
	if !cfg.Terminal.Enabled {
		t.Fatal("terminal should be enabled in the generated default configuration")
	}
	data, err := os.ReadFile(configPath)
	if err != nil {
		t.Fatal(err)
	}
	var saved config
	if err := json.Unmarshal(data, &saved); err != nil {
		t.Fatalf("generated configuration is not valid JSON: %v", err)
	}
	if saved.DetectorWSURL != "ws://127.0.0.1:8090" || filepath.Base(saved.DatabaseFile) != "agent.db" {
		t.Fatalf("generated configuration is incomplete: %+v", saved)
	}
}

func TestLoadOrCreateAgentConfigDoesNotReplaceInvalidFile(t *testing.T) {
	configPath := filepath.Join(t.TempDir(), "agent.json")
	want := []byte("{invalid")
	if err := os.WriteFile(configPath, want, 0o640); err != nil {
		t.Fatal(err)
	}

	if _, created, err := loadOrCreateAgentConfig(configPath); err == nil || created {
		t.Fatalf("invalid existing configuration: created=%t err=%v", created, err)
	}
	got, err := os.ReadFile(configPath)
	if err != nil {
		t.Fatal(err)
	}
	if string(got) != string(want) {
		t.Fatalf("invalid configuration was overwritten: %q", got)
	}
}

func TestResolveDownloadURL(t *testing.T) {
	a := &agent{cfg: config{ServerURL: "http://10.8.30.110:8080"}}
	tests := map[string]string{
		"/api/v1/agents/files/file-1":                 "http://10.8.30.110:8080/api/v1/agents/files/file-1",
		"http://localhost:8080/api/v1/agents/files/a": "http://10.8.30.110:8080/api/v1/agents/files/a",
		"http://127.0.0.1:8080/api/v1/agents/files/b": "http://10.8.30.110:8080/api/v1/agents/files/b",
		"https://downloads.example.com/firmware.bin":  "https://downloads.example.com/firmware.bin",
	}
	for input, want := range tests {
		got, err := a.resolveDownloadURL(input)
		if err != nil {
			t.Fatalf("resolve %q: %v", input, err)
		}
		if got != want {
			t.Fatalf("resolve %q = %q, want %q", input, got, want)
		}
	}
}

func TestDefaultAgentDatabaseIsBesideExecutable(t *testing.T) {
	var cfg config
	applyDefaults(&cfg)
	if filepath.Base(cfg.DatabaseFile) != "agent.db" || filepath.Base(filepath.Dir(cfg.DatabaseFile)) != "db" {
		t.Fatalf("default agent database path = %q", cfg.DatabaseFile)
	}
	executable, err := os.Executable()
	if err == nil && filepath.Dir(filepath.Dir(cfg.DatabaseFile)) != filepath.Dir(executable) {
		t.Fatalf("database path %q is not beside executable %q", cfg.DatabaseFile, executable)
	}
}

func TestRegistrationRetryDelay(t *testing.T) {
	want := []time.Duration{10 * time.Second, 20 * time.Second, 30 * time.Second, 60 * time.Second, 60 * time.Second}
	for index, expected := range want {
		if got := registrationRetryDelay(index); got != expected {
			t.Fatalf("retry %d delay = %s, want %s", index, got, expected)
		}
	}
}

func TestResolveDirectoryTaskTarget(t *testing.T) {
	root := t.TempDir()
	a := &agent{cfg: config{AllowedTargetDir: root}}
	task := protocol.TaskAssignment{TargetPath: "versions/1.0", TargetIsDirectory: true, FileName: "firmware.bin"}

	got, err := a.resolveTaskTarget(task)
	if err != nil {
		t.Fatal(err)
	}
	want := filepath.Join(root, "versions", "1.0", "firmware.bin")
	if got != want {
		t.Fatalf("target = %q, want %q", got, want)
	}
}

func TestResolveDirectoryTaskTargetRejectsTraversal(t *testing.T) {
	a := &agent{cfg: config{AllowedTargetDir: t.TempDir()}}
	_, err := a.resolveTaskTarget(protocol.TaskAssignment{TargetPath: "../outside", TargetIsDirectory: true, FileName: "firmware.bin"})
	if err == nil {
		t.Fatal("expected traversal path to be rejected")
	}
}

func TestListTargetDirectories(t *testing.T) {
	root := t.TempDir()
	if err := os.MkdirAll(filepath.Join(root, "versions", "1.0"), 0o750); err != nil {
		t.Fatal(err)
	}
	a := &agent{cfg: config{AllowedTargetDir: root}}

	directories, err := a.listTargetDirectories()
	if err != nil {
		t.Fatal(err)
	}
	for _, want := range []string{".", "versions", "versions/1.0"} {
		if !slices.Contains(directories, want) {
			t.Fatalf("directories %v do not contain %q", directories, want)
		}
	}
}

func TestTerminalShellWhitelist(t *testing.T) {
	manager := newTerminalManager(terminalConfig{Enabled: true, Shells: []string{"/bin/sh"}, MaxSessions: 2})
	if shell, err := manager.allowedShell(""); err != nil || shell != "/bin/sh" {
		t.Fatalf("default shell = %q, err = %v", shell, err)
	}
	if _, err := manager.allowedShell("/bin/bash"); err == nil {
		t.Fatal("shell outside whitelist was accepted")
	}
}
