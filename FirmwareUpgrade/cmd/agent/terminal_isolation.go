package main

import (
	"fmt"
	"os/exec"
	"regexp"
)

const terminalLauncherPath = "/usr/local/libexec/firmware-terminal-shell"

var terminalUserPattern = regexp.MustCompile(`^[a-z_][a-z0-9_-]{0,31}$`)

// The launcher, shell and environment are deliberately not client-configurable.
// The root-owned launcher and sudoers rule must agree with the configured user.
func isolatedTerminalCommand(shell, runAsUser string) (*exec.Cmd, error) {
	if !terminalUserPattern.MatchString(runAsUser) || runAsUser == "root" || runAsUser == "kickpi" {
		return nil, fmt.Errorf("invalid terminal.run_as_user %q: require a separate unprivileged Linux account", runAsUser)
	}
	if shell != "/bin/bash" {
		return nil, fmt.Errorf("terminal.run_as_user requires shell /bin/bash, got %q", shell)
	}
	cmd := exec.Command("/usr/bin/sudo", "-n", "-H", "-u", runAsUser, "--", terminalLauncherPath)
	// Do not pass Agent credentials, PATH, BASH_ENV, ENV, or loader settings to sudo.
	cmd.Env = []string{"PATH=/usr/bin:/bin", "TERM=xterm-256color", "LANG=C.UTF-8"}
	cmd.Dir = "/"
	return cmd, nil
}
