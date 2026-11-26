package main

import (
	"context"
	"database/sql"
	"errors"
	"io"
	"os"
	"os/exec"
	"runtime"
	"strings"
	"time"

	"firmwareupgrade/internal/protocol"
)

// Test injection lives at the OS boundary; tests never invoke a real reboot.
type rebootSystem struct {
	bootID  func() (string, error)
	execute func(context.Context) error
	wait    func()
}

func readDeviceBootID() (string, error) {
	if runtime.GOOS != "linux" {
		return "", errors.New("reboot is supported only on Linux")
	}
	data, err := os.ReadFile("/proc/sys/kernel/random/boot_id")
	if err != nil {
		return "", err
	}
	id := strings.TrimSpace(string(data))
	if id == "" {
		return "", errors.New("boot identity is empty")
	}
	return id, nil
}

func executeDeviceReboot(ctx context.Context) error {
	if runtime.GOOS != "linux" {
		return errors.New("unsupported reboot platform")
	}
	// Fixed argv only. No caller-supplied shell, executable or arguments.
	command := exec.CommandContext(ctx, "systemctl", "reboot", "--no-block")
	command.Stdout = io.Discard
	command.Stderr = io.Discard
	command.WaitDelay = time.Second
	return command.Run()
}

func (a *agent) rebootBackend() rebootSystem {
	if a.rebootSystem != nil {
		return *a.rebootSystem
	}
	return rebootSystem{bootID: readDeviceBootID, execute: executeDeviceReboot, wait: func() { time.Sleep(2 * time.Second) }}
}

func (a *agent) respondDeviceReboot(requestID string, request protocol.DeviceRebootRequest, write func(protocol.Message) error) {
	result := protocol.DeviceRebootResult{OperationID: request.OperationID, Status: "failed"}
	send := func() error {
		response := protocol.New("deviceRebootResult", result)
		response.RequestID = requestID
		return write(response)
	}
	if len(request.OperationID) != 32 {
		result.ErrorCode = "invalid_request"
		_ = send()
		return
	}
	if !a.cfg.AllowRemoteReboot {
		result.ErrorCode = "disabled"
		_ = send()
		return
	}
	system := a.rebootBackend()
	bootID, err := system.bootID()
	if err != nil {
		result.ErrorCode = "unsupported"
		_ = send()
		return
	}
	result.BootID = bootID
	a.rebootMu.Lock()
	if a.db == nil {
		a.rebootMu.Unlock()
		result.ErrorCode = "execution_failed"
		_ = send()
		return
	}
	var state, previousBoot, code string
	err = a.db.QueryRow(`SELECT state,boot_id,error_code FROM reboot_receipts WHERE operation_id=?`, request.OperationID).Scan(&state, &previousBoot, &code)
	if err == nil {
		a.rebootMu.Unlock()
		result.Status, result.BootID, result.ErrorCode = state, previousBoot, code
		if state == "issued" {
			result.Status = "accepted"
		}
		_ = send()
		return
	}
	if !errors.Is(err, sql.ErrNoRows) {
		a.rebootMu.Unlock()
		result.ErrorCode = "execution_failed"
		_ = send()
		return
	}
	a.runM.Lock()
	busy := a.rebootPending || len(a.running) > 0
	if !busy {
		a.rebootPending = true
	}
	a.runM.Unlock()
	if busy {
		a.rebootMu.Unlock()
		result.ErrorCode = "busy"
		_ = send()
		return
	}
	clearPending := func() { a.runM.Lock(); a.rebootPending = false; a.runM.Unlock() }
	var active int
	err = a.db.QueryRow(`SELECT COUNT(*) FROM reboot_receipts WHERE boot_id=? AND state IN ('accepted','issued','unknown')`, bootID).Scan(&active)
	if err != nil || active > 0 {
		clearPending()
		a.rebootMu.Unlock()
		result.ErrorCode = "busy"
		_ = send()
		return
	}
	_, err = a.db.Exec(`INSERT INTO reboot_receipts(operation_id,boot_id,state,error_code,updated_at) VALUES(?,?,'accepted','',?)`, request.OperationID, bootID, time.Now().UTC().Format(time.RFC3339Nano))
	a.rebootMu.Unlock()
	if err != nil {
		clearPending()
		result.ErrorCode = "execution_failed"
		_ = send()
		return
	}
	result.Status = "accepted"
	// Persist first, acknowledge second, execute last. A failed acknowledgement
	// never runs the OS command. Replays return the durable receipt without execution.
	if send() != nil {
		_, _ = a.db.Exec(`UPDATE reboot_receipts SET state='failed',error_code='ack_failed',updated_at=? WHERE operation_id=?`, time.Now().UTC().Format(time.RFC3339Nano), request.OperationID)
		clearPending()
		return
	}
	system.wait()
	// The cloud socket may close after acknowledgement. Its cancellation is not
	// a reason to lose an already accepted operation; bound the OS command itself.
	executeCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	err = system.execute(executeCtx)
	state, code = "issued", ""
	if err != nil {
		state, code = "failed", "execution_failed"
		if executeCtx.Err() != nil {
			state, code = "unknown", "execution_timeout"
		}
	}
	_, saveErr := a.db.Exec(`UPDATE reboot_receipts SET state=?,error_code=?,updated_at=? WHERE operation_id=?`, state, code, time.Now().UTC().Format(time.RFC3339Nano), request.OperationID)
	if saveErr != nil {
		logErrf("cannot persist reboot execution receipt: operation_id=%s", request.OperationID)
	}
	if state == "failed" {
		clearPending()
	}
	if err != nil {
		result.Status, result.ErrorCode = state, code
		_ = send()
	}
	logInfof("device reboot operation: operation_id=%s state=%s", request.OperationID, state)
}

func (a *agent) latestRebootReceipt() *protocol.DeviceRebootResult {
	if a.db == nil {
		return nil
	}
	var result protocol.DeviceRebootResult
	err := a.db.QueryRow(`SELECT operation_id,boot_id,state,error_code FROM reboot_receipts ORDER BY updated_at DESC,operation_id DESC LIMIT 1`).Scan(&result.OperationID, &result.BootID, &result.Status, &result.ErrorCode)
	if err != nil {
		return nil
	}
	if result.Status == "issued" {
		result.Status = "accepted"
	}
	return &result
}

// An interrupted process must not replay a delayed reboot on its next start.
func (a *agent) reconcileRebootReceipts() error {
	bootID, err := a.rebootBackend().bootID()
	if err != nil {
		return nil
	}
	_, err = a.db.Exec(`UPDATE reboot_receipts SET state='failed',error_code='interrupted',updated_at=? WHERE boot_id=? AND state='accepted'`, time.Now().UTC().Format(time.RFC3339Nano), bootID)
	return err
}
