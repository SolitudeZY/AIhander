package main

import (
	"os"
	"path/filepath"
	"runtime"
	"strconv"
	"strings"
)

func collectDeviceTemperature() *float64 {
	if runtime.GOOS != "linux" {
		return nil
	}
	return readDeviceTemperature("/sys/class/thermal")
}

// Linux thermal zones report millidegrees Celsius. Use the hottest readable
// zone as device temperature; missing/invalid sensors must not stop heartbeats.
func readDeviceTemperature(root string) *float64 {
	paths, err := filepath.Glob(filepath.Join(root, "thermal_zone*", "temp"))
	if err != nil {
		return nil
	}
	var hottest *float64
	for _, path := range paths {
		data, err := os.ReadFile(path)
		if err != nil {
			continue
		}
		millidegrees, err := strconv.ParseInt(strings.TrimSpace(string(data)), 10, 64)
		if err != nil {
			continue
		}
		value := float64(millidegrees) / 1000
		if value < -50 || value > 200 {
			continue
		}
		if hottest == nil || value > *hottest {
			hottest = &value
		}
	}
	return hottest
}
