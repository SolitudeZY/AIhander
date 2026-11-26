package main

import (
	"errors"
	"path/filepath"
	"strings"
	"testing"

	"firmwareupgrade/internal/protocol"
)

func TestAgentPersistsVideoChannelConfiguration(t *testing.T) {
	a := newDatabaseTestAgent(t)
	first := protocol.VideoChannelConfig{ChannelID: "CH-01", Name: "north", Enabled: true, RTSPURL: "rtsp://192.168.1.10/live", Transport: "tcp", ModuleName: "first.rknn"}
	if err := a.setVideoChannel(first); err != nil {
		t.Fatal(err)
	}
	first.Name, first.ModuleName = "north updated", "second.rknn"
	if err := a.setVideoChannel(first); err != nil {
		t.Fatal(err)
	}
	channels, err := a.loadVideoChannels()
	if err != nil {
		t.Fatal(err)
	}
	if len(channels) != 1 || channels[0].Name != "north updated" || channels[0].ModuleName != "second.rknn" {
		t.Fatalf("saved channels = %#v", channels)
	}
	if err := a.deleteVideoChannel("CH-01"); err != nil {
		t.Fatal(err)
	}
	channels, err = a.loadVideoChannels()
	if err != nil || len(channels) != 0 {
		t.Fatalf("channels after delete = %#v err=%v", channels, err)
	}
}

func TestAgentRejectsInvalidVideoChannelConfiguration(t *testing.T) {
	a := newDatabaseTestAgent(t)
	for _, channel := range []protocol.VideoChannelConfig{
		{ChannelID: "CH-01", Name: "camera", RTSPURL: "http://invalid/live", ModuleName: "model.rknn"},
		{ChannelID: "CH-01", Name: "camera", RTSPURL: "rtsp://192.168.1.10/live", ModuleName: "models/model.rknn"},
	} {
		if err := a.setVideoChannel(channel); err == nil {
			t.Fatalf("invalid channel was accepted: %#v", channel)
		}
	}
}

func TestAgentRejectsStaleVideoChannelRevision(t *testing.T) {
	a := newDatabaseTestAgent(t)
	channel := protocol.VideoChannelConfig{ChannelID: "CH-01", Name: "north", Enabled: true, RTSPURL: "rtsp://192.168.1.10/live", Transport: "tcp", ModuleName: "first.rknn"}
	saved, err := a.upsertVideoChannel(channel)
	if err != nil {
		t.Fatal(err)
	}
	stale := int64(0)
	channel.ExpectedRevision = &stale
	if _, err := a.upsertVideoChannel(channel); err != errVideoChannelRevisionConflict {
		t.Fatalf("stale revision error = %v", err)
	}
	channel.ExpectedRevision = &saved.Revision
	updated, err := a.upsertVideoChannel(channel)
	if err != nil {
		t.Fatal(err)
	}
	if updated.Revision != 2 {
		t.Fatalf("updated revision = %d", updated.Revision)
	}
}

func TestAgentChecksVideoChannelNameUniquenessWithinCurrentDevice(t *testing.T) {
	a := newDatabaseTestAgent(t)
	first := protocol.VideoChannelConfig{ChannelID: "CH-01", Name: "north", Enabled: true, RTSPURL: "rtsp://192.168.1.10/live", Transport: "tcp", ModuleName: "first.rknn"}
	if err := a.setVideoChannel(first); err != nil {
		t.Fatal(err)
	}

	if err := a.checkVideoChannelNameUnique("CH-02", " north "); !errors.Is(err, errVideoChannelNameConflict) || !strings.Contains(err.Error(), "视频通道名称“north”已存在") {
		t.Fatalf("duplicate name error = %v", err)
	}
	if err := a.checkVideoChannelNameUnique("CH-01", "north"); err != nil {
		t.Fatalf("unchanged channel name was rejected: %v", err)
	}
	if err := a.checkVideoChannelNameUnique("CH-02", "south"); err != nil {
		t.Fatalf("unique channel name was rejected: %v", err)
	}
}

func newDatabaseTestAgent(t *testing.T) *agent {
	t.Helper()
	directory := t.TempDir()
	db, err := openAgentDatabase(filepath.Join(directory, "agent.db"))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = db.Close() })
	return &agent{cfg: config{StateFile: filepath.Join(directory, "agent-state.json"), DatabaseFile: filepath.Join(directory, "agent.db")}, db: db}
}
