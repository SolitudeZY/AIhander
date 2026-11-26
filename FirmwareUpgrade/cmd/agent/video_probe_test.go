package main

import (
	"context"
	"errors"
	"net"
	"net/http"
	"net/http/httptest"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"firmwareupgrade/internal/protocol"
)

func TestVideoProbeResultAndFailures(t *testing.T) {
	for _, tc := range []struct {
		name, data string
		err        error
		success    bool
		code       string
	}{
		{name: "video", data: `{"streams":[{"codec_name":"h264","width":1920,"height":1080}]}`, success: true},
		{name: "audio only", data: `{"streams":[]}`},
		{name: "network failure", err: errors.New("rtsp://tester:secret@camera/live")},
		{name: "missing ffprobe", err: exec.ErrNotFound, code: "probe_unavailable"},
		{name: "invalid response", data: `broken`, code: "probe_failed"},
	} {
		t.Run(tc.name, func(t *testing.T) {
			result := probeVideoWithRunner(context.Background(), protocol.VideoTestRequest{RTSPURL: "rtsp://tester:secret@camera/live", Transport: "tcp"}, func(_ context.Context, request protocol.VideoTestRequest) ([]byte, error) {
				if request.Transport != "tcp" || !strings.Contains(request.RTSPURL, "secret") {
					t.Fatal("device probe lost credentials")
				}
				return []byte(tc.data), tc.err
			})
			if result.Success != tc.success || result.ErrorCode != tc.code || strings.Contains(result.Message, "secret") {
				t.Fatal(result)
			}
			if tc.success && (result.Codec != "H264" || result.Resolution != "1920x1080") {
				t.Fatal(result)
			}
		})
	}
}
func TestVideoProbeTimeoutAndValidation(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	result := probeVideoWithRunner(ctx, protocol.VideoTestRequest{RTSPURL: "rtsp://camera/live"}, func(ctx context.Context, _ protocol.VideoTestRequest) ([]byte, error) { return nil, ctx.Err() })
	if result.Success || result.ErrorCode != "timeout" {
		t.Fatal(result)
	}
	result = probeVideoWithRunner(context.Background(), protocol.VideoTestRequest{RTSPURL: "file:///etc/passwd"}, func(context.Context, protocol.VideoTestRequest) ([]byte, error) {
		t.Fatal("invalid input executed a probe")
		return nil, nil
	})
	if result.Success || result.ErrorCode != "probe_failed" {
		t.Fatal(result)
	}
}
func TestOptionalSHA256AcceptsMissingAndStillChecksProvided(t *testing.T) {
	path := filepath.Join(t.TempDir(), "download.bin")
	if err := os.WriteFile(path, []byte("file-data"), 0600); err != nil {
		t.Fatal(err)
	}
	if err := verifySHA256(path, ""); err != nil {
		t.Fatal(err)
	}
	if err := verifySHA256(path, "incorrect"); err == nil {
		t.Fatal("provided checksum must still be verified")
	}
}

func TestOptionalChecksumDownloadCompletes(t *testing.T) {
	for _, checksum := range []string{"", "incorrect"} {
		t.Run(checksum, func(t *testing.T) {
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { w.Write([]byte("downloaded-model")) }))
			defer server.Close()
			dir := t.TempDir()
			a := &agent{cfg: config{ServerURL: server.URL, AllowedTargetDir: dir, FileDownloadTimeoutSeconds: 3}, http: server.Client()}
			var final protocol.TaskStatus
			a.executeTask(protocol.TaskAssignment{TaskID: "task-1", DownloadURL: server.URL + "/model", TargetPath: ".", TargetIsDirectory: true, FileName: "model.rknn", SHA256: checksum}, func(msg protocol.Message) error { decodeData(msg.Data, &final); return nil })
			data, err := os.ReadFile(filepath.Join(dir, "model.rknn"))
			if checksum == "" {
				if err != nil || string(data) != "downloaded-model" || final.Status != "succeeded" {
					t.Fatal(final, err)
				}
			} else {
				if !os.IsNotExist(err) || final.Status != "failed" || final.Message != "checksum verification failed" {
					t.Fatal(final, err)
				}
			}
		})
	}
}
func TestVideoProbeRealFFprobeLocalFailure(t *testing.T) {
	if _, err := exec.LookPath("ffprobe"); err != nil {
		t.Skip("ffprobe unavailable")
	}
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	address := listener.Addr().String()
	listener.Close()
	started := time.Now()
	result := probeVideo(context.Background(), protocol.VideoTestRequest{RTSPURL: "rtsp://tester:secret@" + address + "/live", Transport: "tcp"})
	if result.Success || strings.Contains(result.Message, "secret") || time.Since(started) > 10*time.Second {
		t.Fatal(result)
	}
}
