//go:build !windows

package main

import (
	"errors"
	"fmt"
	"os"
	"os/user"
	"path/filepath"
	"runtime"
	"strconv"
	"syscall"
)

func checkTerminalIsolation(runAsUser string) error {
	if runtime.GOOS != "linux" {
		return errors.New("terminal.run_as_user is supported only on Linux")
	}
	target, err := user.Lookup(runAsUser)
	if err != nil {
		return fmt.Errorf("lookup terminal.run_as_user: %w", err)
	}
	if err := validateTerminalUID(target.Uid, os.Geteuid()); err != nil {
		return err
	}
	return checkTerminalLauncher(terminalLauncherPath)
}

func validateTerminalUID(uid string, agentUID int) error {
	n, err := strconv.ParseUint(uid, 10, 32)
	if err != nil || n == 0 || n == uint64(agentUID) {
		return errors.New("terminal.run_as_user must have a non-root UID distinct from the Agent")
	}
	return nil
}

// Check every component: a root-owned file in a writable parent can be replaced.
// Symlinks are rejected so the sudoers path has a single, fixed meaning.
func checkTerminalLauncher(path string) error {
	for current := path; ; current = filepath.Dir(current) {
		info, err := os.Lstat(current)
		if err != nil {
			return fmt.Errorf("terminal launcher: %w", err)
		}
		stat, ok := info.Sys().(*syscall.Stat_t)
		if !ok || stat.Uid != 0 || info.Mode().Perm()&0022 != 0 {
			return fmt.Errorf("terminal launcher path %s must be root-owned and not group/world writable", current)
		}
		if current == path {
			if !info.Mode().IsRegular() || info.Mode().Perm()&0111 == 0 || info.Mode()&(os.ModeSetuid|os.ModeSetgid) != 0 {
				return errors.New("terminal launcher must be a regular executable without setuid/setgid")
			}
		} else if !info.IsDir() {
			return fmt.Errorf("terminal launcher parent %s must be a real directory", current)
		}
		if current == "/" {
			return nil
		}
	}
}
