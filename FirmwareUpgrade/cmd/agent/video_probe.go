package main

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/url"
	"os/exec"
	"strings"
	"time"

	"firmwareupgrade/internal/protocol"
)

// Bound concurrent probes on the edge device. A probe never accesses the
// configuration database or Detector channelSet, even on failure/timeout.
var videoProbeSlots = make(chan struct{}, 2)

func probeVideo(ctx context.Context, request protocol.VideoTestRequest) protocol.VideoTestResult {
	return probeVideoWithRunner(ctx, request, runFFprobe)
}

func probeVideoWithRunner(ctx context.Context, request protocol.VideoTestRequest, run func(context.Context, protocol.VideoTestRequest) ([]byte, error)) (result protocol.VideoTestResult) {
	started := time.Now()
	defer func() { result.DurationMS = time.Since(started).Milliseconds() }()
	result.Message = "video connection failed"
	parsed, err := url.Parse(request.RTSPURL)
	if err != nil || (parsed.Scheme != "rtsp" && parsed.Scheme != "rtsps") || parsed.Hostname() == "" {
		result.ErrorCode = "probe_failed"
		return
	}
	if request.Transport == "" {
		request.Transport = "tcp"
	}
	if request.Transport != "tcp" && request.Transport != "udp" {
		result.ErrorCode = "probe_failed"
		return
	}
	ctx, cancel := context.WithTimeout(ctx, 7*time.Second)
	defer cancel()
	select {
	case videoProbeSlots <- struct{}{}:
		defer func() { <-videoProbeSlots }()
	case <-ctx.Done():
		result.ErrorCode = "timeout"
		return
	}
	data, err := run(ctx, request)
	if ctx.Err() != nil {
		result.ErrorCode = "timeout"
		return
	}
	if errors.Is(err, exec.ErrNotFound) {
		result.ErrorCode = "probe_unavailable"
		return
	}
	if err != nil {
		return
	} // Do not expose ffprobe stderr/argv or camera credentials.
	var output struct {
		Streams []struct {
			CodecName string `json:"codec_name"`
			Width     int    `json:"width"`
			Height    int    `json:"height"`
		} `json:"streams"`
	}
	if json.Unmarshal(data, &output) != nil {
		result.ErrorCode = "probe_failed"
		return
	}
	if len(output.Streams) == 0 || output.Streams[0].Width <= 0 || output.Streams[0].Height <= 0 || output.Streams[0].CodecName == "" {
		return
	}
	stream := output.Streams[0]
	result.Success = true
	result.Codec = strings.ToUpper(stream.CodecName)
	result.Resolution = fmt.Sprintf("%dx%d", stream.Width, stream.Height)
	result.Message = "video connection succeeded"
	return
}

type limitedProbeOutput struct{ bytes.Buffer }

func (b *limitedProbeOutput) Write(data []byte) (int, error) {
	if b.Len()+len(data) > 64<<10 {
		return 0, errors.New("probe output too large")
	}
	return b.Buffer.Write(data)
}

func runFFprobe(ctx context.Context, request protocol.VideoTestRequest) ([]byte, error) {
	// Exec argument arrays avoid shells. Network IO and the entire child process
	// are both bounded; raw process output never reaches logs or HTTP responses.
	command := exec.CommandContext(ctx, "ffprobe", "-v", "error", "-rtsp_transport", request.Transport, "-rw_timeout", "5000000", "-select_streams", "v:0", "-show_entries", "stream=codec_name,width,height", "-of", "json", request.RTSPURL)
	var output limitedProbeOutput
	command.Stdout = &output
	command.Stderr = io.Discard
	command.WaitDelay = time.Second
	err := command.Run()
	return output.Bytes(), err
}
