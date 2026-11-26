package main

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"firmwareupgrade/internal/protocol"

	"github.com/coder/websocket"
	"github.com/coder/websocket/wsjson"
)

func TestAgentToDetectorPayloadOmitsManagementAndDatabaseFields(t *testing.T) {
	deleted, err := json.Marshal(protocol.New("channelDelete", protocol.DetectorChannelDelete{ChannelID: "CH-01"}))
	if err != nil {
		t.Fatal(err)
	}
	if strings.Contains(string(deleted), "expectedRevision") || !strings.Contains(string(deleted), `"channelId":"CH-01"`) {
		t.Fatalf("channelDelete payload = %s", deleted)
	}
}

func TestDetectorClientForwardsSavedChannelConfiguration(t *testing.T) {
	received := make(chan protocol.Message, 1)
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		conn, err := websocket.Accept(w, r, nil)
		if err != nil {
			t.Error(err)
			return
		}
		defer conn.Close(websocket.StatusNormalClosure, "done")
		var message protocol.Message
		if err := wsjson.Read(context.Background(), conn, &message); err != nil {
			t.Error(err)
			return
		}
		received <- message
	}))
	defer server.Close()

	client := newDetectorClient("ws" + strings.TrimPrefix(server.URL, "http"))
	defer client.Close()
	channel := protocol.VideoChannelConfig{ChannelID: "CH-01", Name: "north", Enabled: true, RTSPURL: "rtsp://192.168.1.10/live", Transport: "tcp", ModuleName: "fire.rknn", Revision: 1}
	if err := client.Send(protocol.New("channelSet", channel)); err != nil {
		t.Fatal(err)
	}

	select {
	case message := <-received:
		if message.From != "agent" || message.Type != "channelSet" {
			t.Fatalf("message envelope = %#v", message)
		}
		var got protocol.VideoChannelConfig
		if err := decodeData(message.Data, &got); err != nil {
			t.Fatal(err)
		}
		if got != channel {
			t.Fatalf("channel = %#v, want %#v", got, channel)
		}
	case <-time.After(2 * time.Second):
		t.Fatal("Detector did not receive configuration")
	}
}

func TestAgentSynchronizesAndMirrorsDetectorConfirmedConfiguration(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		conn, err := websocket.Accept(w, r, nil)
		if err != nil {
			return
		}
		defer conn.Close(websocket.StatusNormalClosure, "done")
		for {
			var message protocol.Message
			if err := wsjson.Read(r.Context(), conn, &message); err != nil {
				return
			}
			var response protocol.Message
			switch message.Type {
			case "channelList":
				response = protocol.New("channelListResult", protocol.VideoChannelListResult{Operate: true, Channels: []protocol.VideoChannelConfig{{ChannelID: "CH-01", Name: "existing", Enabled: true, RTSPURL: "rtsp://192.168.1.10/live", Transport: "tcp", ModuleName: "existing.rknn", Revision: 7}}})
			case "channelSet":
				var channel protocol.VideoChannelConfig
				if err := decodeData(message.Data, &channel); err != nil {
					return
				}
				channel.Revision = 1
				response = protocol.New("channelSetResult", protocol.VideoChannelResult{Operate: true, ChannelID: channel.ChannelID, Channel: &channel, Revision: channel.Revision, Status: "stopped"})
			case "channelDelete":
				var deleted protocol.DetectorChannelDelete
				if err := decodeData(message.Data, &deleted); err != nil {
					return
				}
				response = protocol.New("channelDeleteResult", protocol.VideoChannelResult{Operate: true, ChannelID: deleted.ChannelID})
			default:
				continue
			}
			response.RequestID = message.RequestID
			if err := wsjson.Write(r.Context(), conn, response.WithSource("detector")); err != nil {
				return
			}
		}
	}))
	defer server.Close()

	a := newDatabaseTestAgent(t)
	a.detector = newDetectorClient("ws" + strings.TrimPrefix(server.URL, "http"))
	a.control = newManagementArbiter()
	defer a.detector.Close()
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	if err := a.detector.Connect(); err != nil {
		t.Fatal(err)
	}
	go func() { _ = a.detector.ReadLoop(ctx, a.handleDetectorMessage) }()
	if err := a.syncChannelsFromDetector(ctx); err != nil {
		t.Fatal(err)
	}
	channels, err := a.loadVideoChannels()
	if err != nil || len(channels) != 1 || channels[0].Revision != 7 {
		t.Fatalf("synchronized channels=%#v err=%v", channels, err)
	}
	duplicateResult := a.configureDetectorChannel(ctx, protocol.VideoChannelConfig{ChannelID: "CH-02", Name: " existing ", Enabled: true, RTSPURL: "rtsp://192.168.1.11/live", Transport: "tcp", ModuleName: "new.rknn"})
	if duplicateResult.Operate || !strings.Contains(duplicateResult.Error, "视频通道名称“existing”已存在") {
		t.Fatalf("duplicate name result = %#v", duplicateResult)
	}
	setResult := a.configureDetectorChannel(ctx, protocol.VideoChannelConfig{ChannelID: "CH-02", Name: "new", Enabled: true, RTSPURL: "rtsp://192.168.1.11/live", Transport: "tcp", ModuleName: "new.rknn"})
	if !setResult.Operate || setResult.Revision != 1 {
		t.Fatalf("set result = %#v", setResult)
	}
	channels, err = a.loadVideoChannels()
	if err != nil || len(channels) != 2 {
		t.Fatalf("mirrored channels=%#v err=%v", channels, err)
	}
	expected := int64(7)
	deleteResult := a.deleteDetectorChannel(ctx, protocol.VideoChannelDelete{ChannelID: "CH-01", ExpectedRevision: &expected})
	if !deleteResult.Operate {
		t.Fatalf("delete result = %#v", deleteResult)
	}
	channels, err = a.loadVideoChannels()
	if err != nil || len(channels) != 1 || channels[0].ChannelID != "CH-02" {
		t.Fatalf("channels after delete=%#v err=%v", channels, err)
	}
}

func TestAgentDoesNotUpdateMirrorWithoutDetectorConfirmation(t *testing.T) {
	received := make(chan struct{})
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		conn, err := websocket.Accept(w, r, nil)
		if err != nil {
			return
		}
		defer conn.Close(websocket.StatusNormalClosure, "done")
		var message protocol.Message
		if wsjson.Read(r.Context(), conn, &message) == nil {
			close(received)
		}
		<-r.Context().Done()
	}))
	defer server.Close()
	a := newDatabaseTestAgent(t)
	a.detector = newDetectorClient("ws" + strings.TrimPrefix(server.URL, "http"))
	defer a.detector.Close()
	readCtx, stopRead := context.WithCancel(context.Background())
	defer stopRead()
	if err := a.detector.Connect(); err != nil {
		t.Fatal(err)
	}
	go func() { _ = a.detector.ReadLoop(readCtx, a.handleDetectorMessage) }()
	requestCtx, cancel := context.WithTimeout(context.Background(), 100*time.Millisecond)
	defer cancel()
	result := a.configureDetectorChannel(requestCtx, protocol.VideoChannelConfig{ChannelID: "CH-TIMEOUT", Name: "timeout", Enabled: true, RTSPURL: "rtsp://192.168.1.12/live", Transport: "tcp", ModuleName: "timeout.rknn"})
	if result.Operate || !strings.Contains(result.Error, "配置失败，请重试") {
		t.Fatalf("timeout result = %#v", result)
	}
	select {
	case <-received:
	default:
		t.Fatal("Detector did not receive configuration request")
	}
	channels, err := a.loadVideoChannels()
	if err != nil || len(channels) != 0 {
		t.Fatalf("mirror changed without confirmation: channels=%#v err=%v", channels, err)
	}
}

func TestAgentCachesAndQueuesDetectorChannelStatus(t *testing.T) {
	updates := make(chan protocol.VideoChannelResult, 1)
	a := &agent{channelStatuses: map[string]protocol.VideoChannelResult{}, detectorStatusUpdates: updates}
	want := protocol.VideoChannelResult{
		Operate: true, ChannelID: "CH-01", Status: "running", InputFPS: 12.4,
		DetectionStatus: "error", DetectionErrorCode: "E_INFERENCE", ModelVersion: "selected.rknn", RecoveryAction: "reconnect_channel",
		PictureMetrics: &protocol.PictureMetrics{BlackScreen: 4, Occlusion: 8, Blur: 186, BrightnessAbnormal: 112},
		Snapshot:       []byte("jpeg"), SnapshotMimeType: "image/jpeg",
	}
	a.handleDetectorMessage(protocol.New("channelStatusChanged", want).WithSource("detector"))
	got, ok := a.detectorChannelStatus("CH-01")
	if !ok || got.ChannelID != want.ChannelID || got.PictureMetrics == nil || got.PictureMetrics.Blur != 186 || string(got.Snapshot) != "jpeg" || got.ObservedAt == "" {
		t.Fatalf("cached status = %#v, found=%v", got, ok)
	}
	select {
	case queued := <-updates:
		if queued.DetectionStatus != "error" || queued.DetectionErrorCode != "E_INFERENCE" || queued.ModelVersion != "selected.rknn" || queued.RecoveryAction != "reconnect_channel" || queued.InputFPS != 12.4 {
			t.Fatalf("health telemetry lost: %#v",queued)
		}
		if queued.ChannelID != want.ChannelID || queued.PictureMetrics.BrightnessAbnormal != 112 {
			t.Fatalf("queued status = %#v", queued)
		}
	default:
		t.Fatal("Detector status was not queued for Cloud")
	}
}

func TestDetectorClientReadsSnapshotLargerThanDefaultLimit(t *testing.T) {
	release := make(chan struct{})
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		conn, err := websocket.Accept(w, r, nil)
		if err != nil {
			t.Error(err)
			return
		}
		defer conn.Close(websocket.StatusNormalClosure, "done")
		status := protocol.VideoChannelResult{
			Operate: true, ChannelID: "CH-LARGE", Status: "running",
			Snapshot: make([]byte, 64<<10), SnapshotMimeType: "image/jpeg",
		}
		if err := wsjson.Write(context.Background(), conn, protocol.New("channelStatusChanged", status).WithSource("detector")); err != nil {
			t.Error(err)
			return
		}
		<-release
	}))
	defer server.Close()
	defer close(release)

	client := newDetectorClient("ws" + strings.TrimPrefix(server.URL, "http"))
	defer client.Close()
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	received := make(chan protocol.Message, 1)
	go func() {
		_ = client.ReadLoop(ctx, func(message protocol.Message) { received <- message })
	}()
	select {
	case message := <-received:
		var status protocol.VideoChannelResult
		if err := decodeData(message.Data, &status); err != nil {
			t.Fatal(err)
		}
		if len(status.Snapshot) != 64<<10 {
			t.Fatalf("snapshot bytes = %d, want %d", len(status.Snapshot), 64<<10)
		}
	case <-time.After(2 * time.Second):
		t.Fatal("Detector snapshot message was not received")
	}
}
