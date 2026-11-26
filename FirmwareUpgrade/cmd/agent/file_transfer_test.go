package main

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"os"
	"path/filepath"
	"testing"

	"firmwareupgrade/internal/protocol"
)

func TestRemoteFilesRoundTripAndSingleDirectory(t *testing.T) {
	dir := t.TempDir()
	m := newRemoteFiles(config{StateFile: filepath.Join(dir, "agent-state.json")})
	defer m.close()
	info, err := m.execute("info", remoteFileRequest{})
	if err != nil || info["directory"] != filepath.Join(dir, "files") {
		t.Fatalf("info=%v err=%v", info, err)
	}
	data := bytes.Repeat([]byte("binary\x00中文"), 10000)
	r := remoteFileRequest{ID: "transfer-1", Name: "测试.bin"}
	if _, err := m.execute("upload.begin", r); err != nil {
		t.Fatal(err)
	}
	if _, err := os.Stat(filepath.Join(m.root, r.Name)); !os.IsNotExist(err) {
		t.Fatal("incomplete upload was visible")
	}
	for start := 0; start < len(data); start += remoteFileChunk {
		end := min(start+remoteFileChunk, len(data))
		if _, err := m.execute("upload.chunk", remoteFileRequest{ID: r.ID, Offset: int64(start), Data: base64.StdEncoding.EncodeToString(data[start:end])}); err != nil {
			t.Fatal(err)
		}
	}
	if _, err := m.execute("upload.finish", remoteFileRequest{ID: r.ID, Offset: int64(len(data))}); err != nil {
		t.Fatal(err)
	}
	saved, err := os.ReadFile(filepath.Join(m.root, r.Name))
	if err != nil || !bytes.Equal(saved, data) {
		t.Fatalf("saved data differs: %v", err)
	}
	if _, err := m.execute("upload.begin", r); err == nil {
		t.Fatal("existing file may be overwritten")
	}
	if _, err := m.execute("download.begin", r); err != nil {
		t.Fatal(err)
	}
	var actual []byte
	for {
		result, err := m.execute("download.chunk", remoteFileRequest{ID: r.ID, Offset: int64(len(actual))})
		if err != nil {
			t.Fatal(err)
		}
		chunk, _ := base64.StdEncoding.DecodeString(result["data"].(string))
		actual = append(actual, chunk...)
		if result["eof"] == true {
			break
		}
	}
	if !bytes.Equal(actual, data) {
		t.Fatal("download data differs")
	}
}

func TestRemoteFilesRejectPathsAndCleanInterruptedUpload(t *testing.T) {
	m := newRemoteFiles(config{RemoteFileDir: t.TempDir()})
	for _, name := range []string{"../escape", "/etc/passwd", "a/b", "a\\b", ".secret", "..", "C:escape"} {
		if _, err := m.execute("upload.begin", remoteFileRequest{ID: "1", Name: name}); err == nil {
			t.Fatalf("accepted path %s", name)
		}
	}
	if _, err := m.execute("upload.begin", remoteFileRequest{ID: "1", Name: "file"}); err != nil {
		t.Fatal(err)
	}
	if _, err := m.execute("upload.chunk", remoteFileRequest{ID: "1", Offset: 1, Data: "YQ=="}); err == nil {
		t.Fatal("bad offset accepted")
	}
	m.active.offset = remoteFileLimit
	if _, err := m.execute("upload.chunk", remoteFileRequest{ID: "1", Offset: remoteFileLimit, Data: "YQ=="}); err == nil {
		t.Fatal("oversized upload accepted")
	}
	m.close()
	files, err := os.ReadDir(m.root)
	if err != nil || len(files) != 0 {
		t.Fatalf("staging survived disconnect: %v %v", files, err)
	}
	if err := os.WriteFile(filepath.Join(m.root, "empty.txt"), nil, 0600); err != nil {
		t.Fatal(err)
	}
	if _, err := m.execute("download.begin", remoteFileRequest{ID: "2", Name: "empty.txt"}); err != nil {
		t.Fatal(err)
	}
	result, err := m.execute("download.chunk", remoteFileRequest{ID: "2"})
	if err != nil || result["eof"] != true || result["data"] != "" {
		t.Fatalf("empty file: %v %v", result, err)
	}
}

func TestRemoteFilesWireResponse(t *testing.T) {
	m := newRemoteFiles(config{RemoteFileDir: t.TempDir()})
	var message protocol.Message
	if err := json.Unmarshal([]byte(`{"_from":"cloud","cmd":"file.transfer.info","values":{"requestId":"node-request"}}`), &message); err != nil {
		t.Fatal(err)
	}
	var result map[string]any
	if !m.handle(message, func(response protocol.Message) error {
		bytes, err := json.Marshal(response.WithSource("agent"))
		if err != nil {
			return err
		}
		return json.Unmarshal(bytes, &result)
	}) {
		t.Fatal("file command was ignored")
	}
	values := result["values"].(map[string]any)
	if result["cmd"] != "file.transfer.info.result" || values["requestId"] != "node-request" || values["operate"] != true {
		t.Fatalf("wire response: %#v", result)
	}
}

func TestRemoteFilesRejectSymlink(t *testing.T) {
	m := newRemoteFiles(config{RemoteFileDir: t.TempDir()})
	outside := filepath.Join(t.TempDir(), "outside")
	if err := os.WriteFile(outside, []byte("outside"), 0600); err != nil {
		t.Fatal(err)
	}
	if err := os.Symlink(outside, filepath.Join(m.root, "linked")); err != nil {
		t.Skipf("symlink unavailable: %v", err)
	}
	if _, err := m.execute("download.begin", remoteFileRequest{ID: "1", Name: "linked"}); err == nil {
		t.Fatal("followed symlink")
	}
}
