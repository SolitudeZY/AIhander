//go:build windows

package main

import (
	"context"
	"errors"
	"os"
	"os/exec"
	"strings"
)

// Windows keeps a pipe-based compatibility implementation for local testing.
// Production ARM Linux builds use terminal_unix.go and a real PTY.
type windowsTerminalProcess struct {
	cmd     *exec.Cmd
	inputW  *os.File
	outputR *os.File
}

func startTerminalProcess(shell, runAsUser string, _, _ int) (terminalProcess, error) {
	if runAsUser != "" {
		return nil, errors.New("terminal.run_as_user is supported only on Linux")
	}
	path, err := exec.LookPath(shell)
	if err != nil {
		return nil, err
	}
	args := []string{}
	if strings.Contains(strings.ToLower(shell), "powershell") {
		args = []string{"-NoLogo", "-NoProfile"}
	}
	cmd := exec.Command(path, args...)
	inputR, inputW, err := os.Pipe()
	if err != nil {
		return nil, err
	}
	outputR, outputW, err := os.Pipe()
	if err != nil {
		_ = inputR.Close()
		_ = inputW.Close()
		return nil, err
	}
	cmd.Stdin = inputR
	cmd.Stdout = outputW
	cmd.Stderr = outputW
	if err := cmd.Start(); err != nil {
		_ = inputR.Close()
		_ = inputW.Close()
		_ = outputR.Close()
		_ = outputW.Close()
		return nil, err
	}
	// The child owns the read side of stdin and write side of stdout/stderr.
	_ = inputR.Close()
	_ = outputW.Close()
	return &windowsTerminalProcess{cmd: cmd, inputW: inputW, outputR: outputR}, nil
}

func (p *windowsTerminalProcess) Read(data []byte) (int, error) { return p.outputR.Read(data) }
func (p *windowsTerminalProcess) Write(data []byte) (int, error) {
	// xterm.js emits Enter as a single carriage return. A Windows shell whose
	// stdin is an anonymous pipe expects a CRLF line ending instead of PTY input.
	if len(data) == 1 && data[0] == '\r' {
		_, err := p.inputW.Write([]byte{'\r', '\n'})
		if err != nil {
			return 0, err
		}
		return 1, nil
	}
	return p.inputW.Write(data)
}
func (p *windowsTerminalProcess) PID() int              { return p.cmd.Process.Pid }
func (p *windowsTerminalProcess) Resize(_, _ int) error { return nil }
func (p *windowsTerminalProcess) Wait(context.Context) (int, error) {
	err := p.cmd.Wait()
	_ = p.inputW.Close()
	if p.cmd.ProcessState != nil {
		return p.cmd.ProcessState.ExitCode(), err
	}
	return -1, err
}
func (p *windowsTerminalProcess) Close() error {
	if p.cmd.Process != nil {
		_ = p.cmd.Process.Kill()
	}
	_ = p.inputW.Close()
	return p.outputR.Close()
}
