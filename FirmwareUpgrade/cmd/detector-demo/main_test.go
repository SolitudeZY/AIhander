package main

import (
	"bytes"
	"encoding/json"
	"image"
	_ "image/jpeg"
	"io/fs"
	"math/rand"
	"path"
	"testing"
	"time"

	"firmwareupgrade/internal/protocol"
)

func TestDemoOwnsAndConfirmsVideoChannelConfiguration(t *testing.T) {
	server := &demoServer{}
	channel := protocol.VideoChannelConfig{ChannelID: "CH-01", Name: "north", Enabled: true, RTSPURL: "rtsp://192.168.1.10/live", Transport: "tcp", ModuleName: "model.rknn"}
	setResponse, err := server.apply(protocol.New("channelSet", channel))
	if err != nil || setResponse.Type != "channelSetResult" {
		t.Fatalf("set response=%#v err=%v", setResponse, err)
	}
	var setResult protocol.VideoChannelResult
	data, _ := json.Marshal(setResponse.Data)
	if err := json.Unmarshal(data, &setResult); err != nil {
		t.Fatal(err)
	}
	if !setResult.Operate || setResult.Channel == nil || setResult.Channel.Revision != 1 {
		t.Fatalf("set result = %#v", setResult)
	}
	listResponse, err := server.apply(protocol.New("channelList", protocol.VideoChannelListRequest{}))
	if err != nil || listResponse.Type != "channelListResult" {
		t.Fatalf("list response=%#v err=%v", listResponse, err)
	}
	data, _ = json.Marshal(listResponse.Data)
	var listResult protocol.VideoChannelListResult
	if err := json.Unmarshal(data, &listResult); err != nil {
		t.Fatal(err)
	}
	if !listResult.Operate || len(listResult.Channels) != 1 || listResult.Channels[0].ChannelID != "CH-01" {
		t.Fatalf("list result = %#v", listResult)
	}
	deleteResponse, err := server.apply(protocol.New("channelDelete", protocol.DetectorChannelDelete{ChannelID: "CH-01"}))
	if err != nil || deleteResponse.Type != "channelDeleteResult" {
		t.Fatalf("delete response=%#v err=%v", deleteResponse, err)
	}
	if len(server.channels) != 0 {
		t.Fatalf("channels after delete = %#v", server.channels)
	}
}

func TestDemoDefaultsToTwoCamerasAndReportsAdditionalCameraOffline(t *testing.T) {
	channels := defaultVideoChannels()
	if len(channels) != maxDemoCameraChannels || channels[0].ChannelID != "CH-01" || channels[1].ChannelID != "CH-02" {
		t.Fatalf("default channels = %#v", channels)
	}
	channels = append(channels, protocol.VideoChannelConfig{ChannelID: "CH-03", Name: "extra", Enabled: true, RTSPURL: "rtsp://192.168.1.112/ch1", Transport: "tcp", ModuleName: "landslide.rknn", Revision: 1})
	server := &demoServer{
		channels:  channels,
		snapshots: []demoSnapshot{{name: "ch1.jpg", jpeg: []byte("one")}, {name: "ch2.jpg", jpeg: []byte("two")}},
		rng:       rand.New(rand.NewSource(1)),
	}
	statuses := server.currentStatuses(time.Now())
	if len(statuses) != 3 || statuses[0].Status != "running" || statuses[1].Status != "running" {
		t.Fatalf("camera statuses = %#v", statuses)
	}
	extra := statuses[2]
	if extra.Status != "offline" || extra.Error != cameraNotFoundError || extra.InputFPS != 0 || extra.PictureMetrics != nil || len(extra.Snapshot) != 0 {
		t.Fatalf("additional camera status = %#v", extra)
	}

	server.channels[0].Enabled = false
	server.channels[1].Enabled = false
	if alarm, ok := server.currentAlarm(time.Now()); ok {
		t.Fatalf("nonexistent camera generated alarm: %#v", alarm)
	}
}

func TestSnapshotsKeepDimensionsAndCompressForTransport(t *testing.T) {
	snapshots, err := loadSnapshots(embeddedImages, "img/通道图", snapshotCompressionRatio)
	if err != nil {
		t.Fatal(err)
	}
	if len(snapshots) != 3 {
		t.Fatalf("snapshot count = %d, want 3", len(snapshots))
	}
	for i, snapshot := range snapshots {
		wantName := "ch" + string(rune('1'+i)) + ".jpg"
		if snapshot.name != wantName {
			t.Fatalf("snapshot %d name = %q, want %q", i, snapshot.name, wantName)
		}
		original, err := fs.ReadFile(embeddedImages, path.Join("img/通道图", snapshot.name))
		if err != nil {
			t.Fatal(err)
		}
		if len(snapshot.jpeg) > int(float64(len(original))*snapshotCompressionRatio) {
			t.Fatalf("%s compressed size = %d, original = %d", snapshot.name, len(snapshot.jpeg), len(original))
		}
		originalConfig, _, err := image.DecodeConfig(bytes.NewReader(original))
		if err != nil {
			t.Fatal(err)
		}
		compressedConfig, _, err := image.DecodeConfig(bytes.NewReader(snapshot.jpeg))
		if err != nil {
			t.Fatal(err)
		}
		if compressedConfig.Width != originalConfig.Width || compressedConfig.Height != originalConfig.Height {
			t.Fatalf("%s dimensions changed from %dx%d to %dx%d", snapshot.name, originalConfig.Width, originalConfig.Height, compressedConfig.Width, compressedConfig.Height)
		}
	}
}

func TestDemoGeneratesLandslideAlarmForEnabledChannel(t *testing.T) {
	server := &demoServer{
		channels: []protocol.VideoChannelConfig{
			{ChannelID: "CH-01", Enabled: false},
			{ChannelID: "CH-02", Enabled: true},
		},
		rng:            rand.New(rand.NewSource(1)),
		alarmSnapshots: []demoSnapshot{{name: "alarm.jpg", jpeg: []byte("alarm-image")}},
	}
	now := time.Date(2026, 8, 19, 10, 45, 0, 0, time.FixedZone("CST", 8*60*60))
	event, ok := server.currentAlarm(now)
	if !ok {
		t.Fatal("expected a simulated alarm")
	}
	if event.ChannelID != "CH-02" || event.DetectionType != "landslide" || event.AlarmTime != now.Format(time.RFC3339Nano) {
		t.Fatalf("alarm = %#v", event)
	}
	if event.Confidence < 0.75 || event.Confidence > 0.99 {
		t.Fatalf("confidence = %f", event.Confidence)
	}
	if string(event.Image) != "alarm-image" || event.ImageMimeType != "image/jpeg" {
		t.Fatalf("alarm image = %q mime=%q", event.Image, event.ImageMimeType)
	}
}
