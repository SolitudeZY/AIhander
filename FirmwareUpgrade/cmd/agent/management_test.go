package main

import (
	"context"
	"strings"
	"testing"

	"firmwareupgrade/internal/protocol"
)

func TestManagementReturnsWebSocketErrorForDuplicateChannelName(t *testing.T) {
	a := newDatabaseTestAgent(t)
	a.control = newManagementArbiter()
	// A non-nil Detector is enough here: duplicate-name validation must return
	// before Agent attempts to send the configuration to it.
	a.detector = newDetectorClient("ws://detector.invalid")
	if err := a.setVideoChannel(protocol.VideoChannelConfig{
		ChannelID: "CH-01", Name: "north", Enabled: true,
		RTSPURL: "rtsp://192.168.1.10/live", Transport: "tcp", ModuleName: "first.rknn",
	}); err != nil {
		t.Fatal(err)
	}

	request := protocol.New("channelSet", protocol.VideoChannelConfig{
		ChannelID: "CH-02", Name: "north", Enabled: true,
		RTSPURL: "rtsp://192.168.1.11/live", Transport: "tcp", ModuleName: "second.rknn",
	})
	request.RequestID = "request-duplicate-name"

	var response protocol.Message
	handled := a.handleManagementMessage(context.Background(), "setUp", request, func(message protocol.Message) error {
		response = message
		return nil
	})
	if !handled {
		t.Fatal("channelSet message was not handled")
	}
	if response.Type != "channelSet" || response.RequestID != request.RequestID {
		t.Fatalf("response envelope = %#v", response)
	}
	var result protocol.VideoChannelResult
	if err := decodeData(response.Data, &result); err != nil {
		t.Fatal(err)
	}
	if result.Operate || !strings.Contains(result.Error, "视频通道名称“north”已存在") {
		t.Fatalf("response result = %#v", result)
	}
}
