package main

import (
	"errors"
	"fmt"
	"net"
	"strings"
)

type networkIdentity struct {
	name     string
	hardware net.HardwareAddr
	flags    net.Flags
}

func deviceIDFromInterfaces(preferred string) (deviceID, interfaceName, macAddress string, err error) {
	interfaces, err := net.Interfaces()
	if err != nil {
		return "", "", "", fmt.Errorf("list network interfaces: %w", err)
	}
	items := make([]networkIdentity, 0, len(interfaces))
	for _, item := range interfaces {
		items = append(items, networkIdentity{name: item.Name, hardware: item.HardwareAddr, flags: item.Flags})
	}
	selected, err := selectDeviceInterface(items, preferred)
	if err != nil {
		return "", "", "", err
	}
	normalized := strings.ToLower(selected.hardware.String())
	return normalized, selected.name, selected.hardware.String(), nil
}

func selectDeviceInterface(interfaces []networkIdentity, preferred string) (networkIdentity, error) {
	preferred = strings.TrimSpace(preferred)
	if preferred != "" {
		for _, item := range interfaces {
			if strings.EqualFold(item.name, preferred) {
				if err := usableDeviceInterface(item); err != nil {
					return networkIdentity{}, fmt.Errorf("configured device_interface %q is unusable: %w", preferred, err)
				}
				return item, nil
			}
		}
		return networkIdentity{}, fmt.Errorf("configured device_interface %q was not found", preferred)
	}

	for _, item := range interfaces {
		if usableDeviceInterface(item) == nil {
			return item, nil
		}
	}
	return networkIdentity{}, errors.New("no usable network interface with a MAC address was found; configure device_interface explicitly")
}

func usableDeviceInterface(item networkIdentity) error {
	if item.flags&net.FlagLoopback != 0 {
		return errors.New("interface is loopback")
	}
	if len(item.hardware) != 6 {
		return errors.New("interface does not have a 6-byte MAC address")
	}
	allZero := true
	for _, value := range item.hardware {
		allZero = allZero && value == 0
	}
	if allZero {
		return errors.New("interface has an all-zero MAC address")
	}
	return nil
}
