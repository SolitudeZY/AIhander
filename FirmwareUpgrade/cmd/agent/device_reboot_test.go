package main

import (
	"context"
	"errors"
	"path/filepath"
	"testing"

	"firmwareupgrade/internal/protocol"
)

func rebootTestAgent(t *testing.T) (*agent, *int) {
	t.Helper()
	db, err := openAgentDatabase(filepath.Join(t.TempDir(), "agent.db"))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { db.Close() })
	calls := new(int)
	a := &agent{db: db, cfg: config{AllowRemoteReboot: true}, running: map[string]struct{}{}}
	a.rebootSystem = &rebootSystem{bootID: func() (string, error) { return "boot-before", nil }, wait: func() {}, execute: func(context.Context) error { *calls++; return nil }}
	return a, calls
}

func TestRebootAcknowledgesBeforeExecutionAndDeduplicates(t *testing.T) {
	a, calls := rebootTestAgent(t)
	id := "0123456789abcdef0123456789abcdef"
	writes := 0
	write := func(message protocol.Message) error {
		writes++
		var result protocol.DeviceRebootResult
		if decodeData(message.Data, &result) != nil {
			t.Fatal("bad result")
		}
		if result.Status != "accepted" || result.BootID != "boot-before" || (writes == 1 && *calls != 0) {
			t.Fatal("reboot was not acknowledged first", result, *calls)
		}
		return nil
	}
	a.respondDeviceReboot("request-1", protocol.DeviceRebootRequest{OperationID: id}, write)
	a.respondDeviceReboot("request-2", protocol.DeviceRebootRequest{OperationID: id}, write)
	if *calls != 1 || writes != 2 {
		t.Fatal("duplicate execution", *calls, writes)
	}
	if a.markRunning("upgrade-after-reboot") {
		t.Fatal("upgrade admitted during pending reboot")
	}
	// Recreating the process object still observes the durable receipt.
	other := &agent{db: a.db, cfg: a.cfg, rebootSystem: a.rebootSystem}
	other.respondDeviceReboot("request-3", protocol.DeviceRebootRequest{OperationID: id}, write)
	if *calls != 1 {
		t.Fatal("restarted agent repeated OS command")
	}
}

func TestRebootDisabledBusyAndFailedAcknowledgement(t *testing.T) {
	for _, scenario := range []string{"disabled", "busy", "ack_failed", "execution_failed", "unsupported"} {
		t.Run(scenario, func(t *testing.T) {
			a, calls := rebootTestAgent(t)
			switch scenario {
			case "disabled":
				a.cfg.AllowRemoteReboot = false
			case "busy":
				a.running["upgrade"] = struct{}{}
			case "execution_failed":
				a.rebootSystem.execute = func(context.Context) error { *calls++; return errors.New("internal OS error") }
			case "unsupported":
				a.rebootSystem.bootID = func() (string, error) { return "", errors.New("unsupported") }
			}
			var last protocol.DeviceRebootResult
			a.respondDeviceReboot("request", protocol.DeviceRebootRequest{OperationID: "0123456789abcdef0123456789abcdef"}, func(msg protocol.Message) error {
				decodeData(msg.Data, &last)
				if scenario == "ack_failed" {
					return errors.New("connection lost")
				}
				return nil
			})
			if scenario == "execution_failed" {
				if *calls != 1 || last.ErrorCode != scenario || a.rebootPending {
					t.Fatal(last, *calls)
				}
			} else if *calls != 0 {
				t.Fatal("unsafe OS call", *calls)
			}
			if scenario != "ack_failed" && last.ErrorCode != scenario {
				t.Fatal(last)
			}
			if scenario == "ack_failed" {
				if receipt := a.latestRebootReceipt(); receipt == nil || receipt.ErrorCode != "ack_failed" || a.rebootPending {
					t.Fatal(receipt)
				}
			}
		})
	}
}

func TestInterruptedRebootIsNotReexecuted(t *testing.T) {
	a, calls := rebootTestAgent(t)
	_, err := a.db.Exec(`INSERT INTO reboot_receipts VALUES('0123456789abcdef0123456789abcdef','boot-before','accepted','','2026-09-21T00:00:00Z')`)
	if err != nil {
		t.Fatal(err)
	}
	if err := a.reconcileRebootReceipts(); err != nil {
		t.Fatal(err)
	}
	a.respondDeviceReboot("req", protocol.DeviceRebootRequest{OperationID: "0123456789abcdef0123456789abcdef"}, func(msg protocol.Message) error {
		var result protocol.DeviceRebootResult
		decodeData(msg.Data, &result)
		if result.Status != "failed" || result.ErrorCode != "interrupted" {
			t.Fatal(result)
		}
		return nil
	})
	if *calls != 0 {
		t.Fatal("interrupted command executed")
	}
}
