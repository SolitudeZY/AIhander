package main

import (
	"net"
	"testing"
)

func TestSelectDeviceInterfaceUsesFirstUsableInterface(t *testing.T) {
	interfaces := []networkIdentity{
		{name: "lo", flags: net.FlagUp | net.FlagLoopback},
		{name: "eth1", hardware: net.HardwareAddr{0x02, 0, 0, 0, 0, 2}},
		{name: "eth0", hardware: net.HardwareAddr{0x02, 0, 0, 0, 0, 1}, flags: net.FlagUp},
	}
	selected, err := selectDeviceInterface(interfaces, "")
	if err != nil {
		t.Fatal(err)
	}
	if selected.name != "eth1" {
		t.Fatalf("selected interface = %q, want first usable interface eth1", selected.name)
	}
}

func TestSelectDeviceInterfaceDoesNotChangeWhenFirstInterfaceIsDown(t *testing.T) {
	interfaces := []networkIdentity{
		{name: "eth0", hardware: net.HardwareAddr{0x02, 0, 0, 0, 0, 1}},
		{name: "eth1", hardware: net.HardwareAddr{0x02, 0, 0, 0, 0, 2}, flags: net.FlagUp},
	}
	selected, err := selectDeviceInterface(interfaces, "")
	if err != nil {
		t.Fatal(err)
	}
	if selected.name != "eth0" {
		t.Fatalf("selected interface = %q, want first interface eth0 even while it is down", selected.name)
	}
}

func TestSelectDeviceInterfaceHonorsConfiguredName(t *testing.T) {
	interfaces := []networkIdentity{
		{name: "eth0", hardware: net.HardwareAddr{0x02, 0, 0, 0, 0, 1}, flags: net.FlagUp},
		{name: "eth1", hardware: net.HardwareAddr{0x02, 0, 0, 0, 0, 2}, flags: net.FlagUp},
	}
	selected, err := selectDeviceInterface(interfaces, "ETH1")
	if err != nil {
		t.Fatal(err)
	}
	if selected.name != "eth1" {
		t.Fatalf("selected interface = %q, want configured interface eth1", selected.name)
	}
}

func TestDeviceIDUsesCanonicalMACAddress(t *testing.T) {
	selected, err := selectDeviceInterface([]networkIdentity{{name: "eth0", hardware: net.HardwareAddr{0x10, 0x22, 0x33, 0x44, 0x55, 0xAB}}}, "")
	if err != nil {
		t.Fatal(err)
	}
	if got := selected.hardware.String(); got != "10:22:33:44:55:ab" {
		t.Fatalf("canonical MAC = %q", got)
	}
}
