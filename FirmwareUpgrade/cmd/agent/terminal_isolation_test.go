package main

import (
	"context"
	"encoding/json"
	"errors"
	"reflect"
	"testing"

	"firmwareupgrade/internal/protocol"
)

func TestTerminalIsolationCommand(t *testing.T) {
	var cfg terminalConfig
	if err := json.Unmarshal([]byte(`{"run_as_user":"edgeops"}`), &cfg); err != nil {
		t.Fatal(err)
	}
	t.Setenv("AGENT_TOKEN", "must-not-leak")
	t.Setenv("BASH_ENV", "/untrusted/startup")
	cmd, err := isolatedTerminalCommand("/bin/bash", cfg.RunAsUser)
	if err != nil {
		t.Fatal(err)
	}
	want := []string{"/usr/bin/sudo", "-n", "-H", "-u", "edgeops", "--", "/usr/local/libexec/firmware-terminal-shell"}
	if cmd.Path != want[0] || !reflect.DeepEqual(cmd.Args, want) {
		t.Fatalf("unexpected command: path=%q args=%q", cmd.Path, cmd.Args)
	}
	if !reflect.DeepEqual(cmd.Env, []string{"PATH=/usr/bin:/bin", "TERM=xterm-256color", "LANG=C.UTF-8"}) || cmd.Dir != "/" {
		t.Fatalf("unsafe environment or working directory: env=%q dir=%q", cmd.Env, cmd.Dir)
	}
}

func TestTerminalIsolationRejectsInvalidConfiguration(t *testing.T) {
	for _, name := range []string{"", " ", " edgeops", "edgeops\n", "root", "kickpi", "#0", "-u", "a;b", "a/b", "a b", "123", "abcdefghijklmnopqrstuvwxyz1234567"} {
		t.Run(name, func(t *testing.T) {
			if _, err := isolatedTerminalCommand("/bin/bash", name); err == nil {
				t.Fatalf("accepted invalid account %q", name)
			}
		})
	}
	for _, shell := range []string{"bash", "/bin/sh", "/bin/bash -c id", "/BIN/BASH"} {
		if _, err := isolatedTerminalCommand(shell, "edgeops"); err == nil {
			t.Fatalf("accepted shell outside fixed launcher contract: %q", shell)
		}
	}
}

func TestTerminalIsolationStartFailureDoesNotFallback(t *testing.T) {
	m := newTerminalManager(terminalConfig{Enabled: true, Shells: []string{"/bin/bash", "/bin/sh"}, RunAsUser: "edgeops"})
	calls := 0
	failure := errors.New("sudo denied")
	m.startProcess = func(shell, runAsUser string, cols, rows int) (terminalProcess, error) {
		calls++
		if shell != "/bin/bash" || runAsUser != "edgeops" || cols != 80 || rows != 24 {
			t.Fatalf("unexpected launch: %q %q %dx%d", shell, runAsUser, cols, rows)
		}
		return nil, failure
	}
	err := m.Open(context.Background(), protocol.TerminalOpen{SessionID: "isolated", Cols: 80, Rows: 24}, func(protocol.Message) error {
		t.Fatal("failed launch must not publish terminal.opened")
		return nil
	})
	if !errors.Is(err, failure) || calls != 1 || m.get("isolated") != nil {
		t.Fatalf("failure was not closed: err=%v launches=%d session=%v", err, calls, m.get("isolated"))
	}
}
