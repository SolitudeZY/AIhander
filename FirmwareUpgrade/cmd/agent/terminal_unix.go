//go:build !windows

package main

import (
	"context"
	_ "embed"
	"os"
	"os/exec"
	"path/filepath"

	"github.com/creack/pty"
)

type unixTerminalProcess struct {
	cmd      *exec.Cmd
	file     *os.File
	commands *terminalCommands
	rcFile   string
}

//go:embed terminal_bashrc.sh
var terminalBashRC []byte

func startTerminalProcess(shell, runAsUser string, cols, rows int) (terminalProcess, error) {
	var cmd *exec.Cmd
	var commands *terminalCommands
	var rcFile string
	if runAsUser != "" {
		var err error
		cmd, err = isolatedTerminalCommand(shell, runAsUser)
		if err != nil {
			return nil, err
		}
		if err := checkTerminalIsolation(runAsUser); err != nil {
			return nil, err
		}
		commands = &terminalCommands{}
	} else {
		path, err := exec.LookPath(shell)
		if err != nil {
			return nil, err
		}
		cmd = exec.Command(path)
		cmd.Env = append(os.Environ(), "TERM=xterm-256color")
		if filepath.Base(path) == "bash" {
			rc, err := os.CreateTemp("", "firmware-terminal-*.bashrc")
			if err != nil {
				return nil, err
			}
			rcFile = rc.Name()
			_, writeErr := rc.Write(terminalBashRC)
			closeErr := rc.Close()
			if writeErr != nil || closeErr != nil {
				_ = os.Remove(rcFile)
				if writeErr != nil {
					return nil, writeErr
				}
				return nil, closeErr
			}
			cmd.Args = []string{path, "--rcfile", rcFile, "-i"}
			commands = &terminalCommands{}
		}
	}
	file, err := pty.StartWithSize(cmd, &pty.Winsize{Cols: uint16(cols), Rows: uint16(rows)})
	if err != nil {
		if rcFile != "" {
			_ = os.Remove(rcFile)
		}
		return nil, err
	}
	return &unixTerminalProcess{cmd: cmd, file: file, commands: commands, rcFile: rcFile}, nil
}

func (p *unixTerminalProcess) commandTracker() *terminalCommands { return p.commands }

func (p *unixTerminalProcess) Read(data []byte) (int, error)  { return p.file.Read(data) }
func (p *unixTerminalProcess) Write(data []byte) (int, error) { return p.file.Write(data) }
func (p *unixTerminalProcess) PID() int                       { return p.cmd.Process.Pid }
func (p *unixTerminalProcess) Resize(cols, rows int) error {
	return pty.Setsize(p.file, &pty.Winsize{Cols: uint16(cols), Rows: uint16(rows)})
}
func (p *unixTerminalProcess) Wait(context.Context) (int, error) {
	err := p.cmd.Wait()
	if p.rcFile != "" {
		_ = os.Remove(p.rcFile)
	}
	if p.cmd.ProcessState != nil {
		return p.cmd.ProcessState.ExitCode(), err
	}
	return -1, err
}
func (p *unixTerminalProcess) Close() error {
	if p.cmd.Process != nil {
		_ = p.cmd.Process.Kill()
	}
	return p.file.Close()
}
