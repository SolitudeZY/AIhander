package main

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"

	"firmwareupgrade/internal/protocol"
)

func TestDeviceTemperatureUsesHottestValidThermalZone(t *testing.T) {
	root := t.TempDir()
	for name, reading := range map[string]string{
		"thermal_zone0": "42500\n", "thermal_zone1": "53234\n",
		"thermal_zone2": "invalid", "thermal_zone3": "-274000",
		"thermal_zone4": "999999999", "thermal_zone5": "0",
	} {
		zone := filepath.Join(root, name)
		if err := os.Mkdir(zone, 0700); err != nil {
			t.Fatal(err)
		}
		if err := os.WriteFile(filepath.Join(zone, "temp"), []byte(reading), 0600); err != nil {
			t.Fatal(err)
		}
	}
	value := readDeviceTemperature(root)
	if value == nil || *value != 53.234 {
		t.Fatalf("temperature = %v", value)
	}
	data, err := json.Marshal(protocol.Heartbeat{TemperatureCelsius: value})
	if err != nil {
		t.Fatal(err)
	}
	var heartbeat map[string]any
	if err := json.Unmarshal(data, &heartbeat); err != nil {
		t.Fatal(err)
	}
	if heartbeat["temperature_celsius"] != 53.234 {
		t.Fatalf("heartbeat = %s", data)
	}
}

func TestDeviceTemperatureUnavailableIsOmittedAndZeroIsValid(t *testing.T) {
	root := t.TempDir()
	if readDeviceTemperature(root) != nil {
		t.Fatal("missing sensor must be unavailable")
	}
	zone := filepath.Join(root, "thermal_zone0")
	if err := os.Mkdir(zone, 0700); err != nil {
		t.Fatal(err)
	}
	file := filepath.Join(zone, "temp")
	for _, reading := range []string{"", "NaN", "-274000"} {
		if err := os.WriteFile(file, []byte(reading), 0600); err != nil {
			t.Fatal(err)
		}
		if readDeviceTemperature(root) != nil {
			t.Fatalf("invalid sensor %q must be unavailable", reading)
		}
	}
	data, err := json.Marshal(protocol.Heartbeat{TemperatureCelsius: readDeviceTemperature(root)})
	if err != nil {
		t.Fatal(err)
	}
	var heartbeat map[string]any
	if err := json.Unmarshal(data, &heartbeat); err != nil {
		t.Fatal(err)
	}
	if _, exists := heartbeat["temperature_celsius"]; exists {
		t.Fatalf("missing temperature serialized: %s", data)
	}
	if err := os.WriteFile(file, []byte("0\n"), 0600); err != nil {
		t.Fatal(err)
	}
	if value := readDeviceTemperature(root); value == nil || *value != 0 {
		t.Fatal("zero is a valid temperature")
	}
}
