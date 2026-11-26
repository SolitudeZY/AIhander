// detector-demo is a local test-only Detector endpoint. It accepts channel
// configuration and reports simulated runtime and picture-quality data.
package main

import (
	"bytes"
	"context"
	"embed"
	"encoding/json"
	"flag"
	"fmt"
	"image"
	"image/jpeg"
	_ "image/png"
	"io/fs"
	"log"
	"math/rand"
	"net/http"
	"path"
	"sort"
	"strings"
	"sync"
	"time"

	"firmwareupgrade/internal/protocol"

	"github.com/coder/websocket"
	"github.com/coder/websocket/wsjson"
)

const (
	snapshotCompressionRatio = 0.6
	maxDemoCameraChannels    = 2
	cameraNotFoundError      = "相机连接失败：相机不存在"
)

//go:embed img
var embeddedImages embed.FS

type demoSnapshot struct {
	name         string
	originalSize int
	jpeg         []byte
}

type demoServer struct {
	mu             sync.RWMutex
	channels       []protocol.VideoChannelConfig
	snapshots      []demoSnapshot
	alarmSnapshots []demoSnapshot
	rng            *rand.Rand
}

func main() {
	listen := flag.String("listen", ":8090", "WebSocket listen address")
	interval := flag.Duration("status-interval", 10*time.Second, "channel status reporting interval")
	alarmInterval := flag.Duration("alarm-interval", 60*time.Second, "simulated landslide alarm interval")
	flag.Parse()

	snapshots, err := loadSnapshots(embeddedImages, "img/通道图", snapshotCompressionRatio)
	if err != nil {
		log.Fatalf("load Detector demo snapshots: %v", err)
	}
	alarmSnapshots, err := loadSnapshots(embeddedImages, "img/事件图", snapshotCompressionRatio)
	if err != nil {
		log.Fatalf("load Detector demo alarm images: %v", err)
	}
	server := &demoServer{channels: defaultVideoChannels(), snapshots: snapshots, alarmSnapshots: alarmSnapshots, rng: rand.New(rand.NewSource(time.Now().UnixNano()))}
	mux := http.NewServeMux()
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) { server.receive(w, r, *interval, *alarmInterval) })
	log.Printf("Detector demo listening on %s; channels=%d snapshots=%d status_interval=%s alarm_interval=%s", *listen, len(server.channels), len(snapshots), *interval, *alarmInterval)
	log.Fatal(http.ListenAndServe(*listen, mux))
}

func defaultVideoChannels() []protocol.VideoChannelConfig {
	return []protocol.VideoChannelConfig{
		{ChannelID: "CH-01", Name: "默认通道1", Enabled: true, RTSPURL: "rtsp://192.168.1.110/ch1", Transport: "tcp", ModuleName: "landslide.rknn", Revision: 1},
		{ChannelID: "CH-02", Name: "默认通道2", Enabled: true, RTSPURL: "rtsp://192.168.1.111/ch1", Transport: "tcp", ModuleName: "landslide.rknn", Revision: 1},
	}
}

func demoCameraSlot(channelID string) (int, bool) {
	switch channelID {
	case "CH-01":
		return 0, true
	case "CH-02":
		return 1, true
	default:
		return 0, false
	}
}

func (s *demoServer) receive(w http.ResponseWriter, r *http.Request, interval, alarmInterval time.Duration) {
	conn, err := websocket.Accept(w, r, &websocket.AcceptOptions{InsecureSkipVerify: true})
	if err != nil {
		log.Printf("accept Agent connection: %v", err)
		return
	}
	defer conn.Close(websocket.StatusNormalClosure, "demo closed")
	ctx, cancel := context.WithCancel(r.Context())
	defer cancel()
	statusRequested := make(chan struct{}, 1)
	outbound := make(chan protocol.Message, 16)
	senderDone := make(chan struct{})
	go func() {
		defer close(senderDone)
		statusTicker := time.NewTicker(interval)
		alarmTicker := time.NewTicker(alarmInterval)
		defer statusTicker.Stop()
		defer alarmTicker.Stop()
		for {
			sendAlarm := false
			var response protocol.Message
			select {
			case <-statusTicker.C:
			case <-alarmTicker.C:
				sendAlarm = true
			case <-statusRequested:
			case response = <-outbound:
			case <-ctx.Done():
				return
			}
			var err error
			if response.Type != "" {
				err = wsjson.Write(ctx, conn, response.WithSource("detector"))
			} else if sendAlarm {
				err = s.sendAlarm(ctx, conn, time.Now())
			} else {
				err = s.sendStatuses(ctx, conn)
			}
			if err != nil {
				if ctx.Err() == nil {
					log.Printf("send channel statuses: %v", err)
				}
				cancel()
				return
			}
		}
	}()

	log.Printf("Agent connected: %s", r.RemoteAddr)
	for {
		var message protocol.Message
		if err := wsjson.Read(ctx, conn, &message); err != nil {
			cancel()
			<-senderDone
			log.Printf("Agent disconnected: %s (%v)", r.RemoteAddr, err)
			return
		}
		response, err := s.apply(message)
		if err != nil {
			log.Printf("apply Agent message cmd=%s: %v", message.Type, err)
			continue
		}
		if response.Type != "" {
			response.RequestID = message.RequestID
			select {
			case outbound <- response:
			case <-ctx.Done():
				return
			}
		}
		payload, err := json.MarshalIndent(message.WithSource(message.From), "", "  ")
		if err == nil {
			log.Printf("received Agent message:\n%s", payload)
		}
		if message.Type == "channelSet" || message.Type == "channelDelete" {
			select {
			case statusRequested <- struct{}{}:
			default:
			}
		}
	}
}

func (s *demoServer) apply(message protocol.Message) (protocol.Message, error) {
	switch message.Type {
	case "channelList":
		s.mu.RLock()
		channels := append([]protocol.VideoChannelConfig(nil), s.channels...)
		s.mu.RUnlock()
		return protocol.New("channelListResult", protocol.VideoChannelListResult{Operate: true, Channels: channels}), nil
	case "channelSet":
		var channel protocol.VideoChannelConfig
		if err := decodeValues(message.Data, &channel); err != nil {
			return protocol.New("channelSetResult", protocol.VideoChannelResult{Error: err.Error()}), nil
		}
		if channel.ChannelID == "" {
			return protocol.New("channelSetResult", protocol.VideoChannelResult{Error: "channelId is required"}), nil
		}
		channel.ExpectedRevision = nil
		s.mu.Lock()
		updated := false
		for i := range s.channels {
			if s.channels[i].ChannelID == channel.ChannelID {
				channel.Revision = s.channels[i].Revision + 1
				s.channels[i] = channel
				updated = true
				break
			}
		}
		if !updated {
			channel.Revision = 1
			s.channels = append(s.channels, channel)
		}
		s.mu.Unlock()
		return protocol.New("channelSetResult", protocol.VideoChannelResult{Operate: true, ChannelID: channel.ChannelID, Channel: &channel, Revision: channel.Revision, Status: "stopped"}), nil
	case "channelDelete":
		var deleted protocol.DetectorChannelDelete
		if err := decodeValues(message.Data, &deleted); err != nil {
			return protocol.New("channelDeleteResult", protocol.VideoChannelResult{Error: err.Error()}), nil
		}
		if deleted.ChannelID == "" {
			return protocol.New("channelDeleteResult", protocol.VideoChannelResult{Error: "channelId is required"}), nil
		}
		s.mu.Lock()
		for i := range s.channels {
			if s.channels[i].ChannelID == deleted.ChannelID {
				s.channels = append(s.channels[:i], s.channels[i+1:]...)
				break
			}
		}
		s.mu.Unlock()
		return protocol.New("channelDeleteResult", protocol.VideoChannelResult{Operate: true, ChannelID: deleted.ChannelID}), nil
	}
	return protocol.Message{}, nil
}

func (s *demoServer) sendStatuses(ctx context.Context, conn *websocket.Conn) error {
	for _, status := range s.currentStatuses(time.Now()) {
		message := protocol.New("channelStatusChanged", status).WithSource("detector")
		if err := wsjson.Write(ctx, conn, message); err != nil {
			return err
		}
		log.Printf("sent channel status: channel_id=%s status=%s fps=%.1f snapshot_bytes=%d", status.ChannelID, status.Status, status.InputFPS, len(status.Snapshot))
	}
	return nil
}

func (s *demoServer) sendAlarm(ctx context.Context, conn *websocket.Conn, now time.Time) error {
	event, ok := s.currentAlarm(now)
	if !ok {
		log.Printf("skip simulated landslide alarm: no enabled video channel")
		return nil
	}
	message := protocol.New("alarmDetected", event).WithSource("detector")
	if err := wsjson.Write(ctx, conn, message); err != nil {
		return err
	}
	log.Printf("sent simulated landslide alarm: channel_id=%s confidence=%.2f", event.ChannelID, event.Confidence)
	return nil
}

func (s *demoServer) currentAlarm(now time.Time) (protocol.DetectorAlarm, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	enabled := make([]protocol.VideoChannelConfig, 0, len(s.channels))
	for _, channel := range s.channels {
		if _, exists := demoCameraSlot(channel.ChannelID); exists && channel.Enabled {
			enabled = append(enabled, channel)
		}
	}
	if len(enabled) == 0 {
		return protocol.DetectorAlarm{}, false
	}
	channel := enabled[s.rng.Intn(len(enabled))]
	event := protocol.DetectorAlarm{
		ChannelID:     channel.ChannelID,
		ModelVersion:  channel.ModuleName,
		DetectionType: "landslide",
		Confidence:    randomConfidence(s.rng, 0.75, 0.99),
		AlarmTime:     now.Format(time.RFC3339Nano),
	}
	if len(s.alarmSnapshots) > 0 {
		event.Image = s.alarmSnapshots[s.rng.Intn(len(s.alarmSnapshots))].jpeg
		event.ImageMimeType = "image/jpeg"
	}
	return event, true
}

func (s *demoServer) currentStatuses(now time.Time) []protocol.VideoChannelResult {
	s.mu.Lock()
	defer s.mu.Unlock()
	statuses := make([]protocol.VideoChannelResult, 0, len(s.channels))
	for _, channel := range s.channels {
		cameraSlot, cameraExists := demoCameraSlot(channel.ChannelID)
		status := "running"
		fps := 10 + s.rng.Float64()*5
		if !channel.Enabled {
			status, fps = "stopped", 0
		}
		result := protocol.VideoChannelResult{
			Operate:   true,
			ChannelID: channel.ChannelID,
			Revision:  channel.Revision,
			Status:    status,
			InputFPS:  fps,
			PictureMetrics: &protocol.PictureMetrics{
				BlackScreen:        randomRounded(s.rng, 0, 100),
				Occlusion:          randomRounded(s.rng, 0, 100),
				Blur:               randomRounded(s.rng, 0, 300),
				BrightnessAbnormal: randomRounded(s.rng, 0, 255),
			},
			ObservedAt: now.Format(time.RFC3339Nano),
		}
		if !cameraExists && channel.Enabled {
			result.Status = "offline"
			result.InputFPS = 0
			result.PictureMetrics = nil
			result.Error = cameraNotFoundError
		} else if cameraExists && len(s.snapshots) > 0 {
			result.Snapshot = s.snapshots[cameraSlot%len(s.snapshots)].jpeg
			result.SnapshotMimeType = "image/jpeg"
		}
		statuses = append(statuses, result)
	}
	return statuses
}

func randomRounded(rng *rand.Rand, minValue, maxValue float64) float64 {
	return float64(int((minValue+rng.Float64()*(maxValue-minValue))*10+0.5)) / 10
}

func randomConfidence(rng *rand.Rand, minValue, maxValue float64) float64 {
	return float64(int((minValue+rng.Float64()*(maxValue-minValue))*100+0.5)) / 100
}

func loadSnapshots(source fs.FS, directory string, compressionRatio float64) ([]demoSnapshot, error) {
	entries, err := fs.ReadDir(source, directory)
	if err != nil {
		return nil, err
	}
	sort.Slice(entries, func(i, j int) bool {
		return strings.ToLower(entries[i].Name()) < strings.ToLower(entries[j].Name())
	})
	var snapshots []demoSnapshot
	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}
		ext := strings.ToLower(path.Ext(entry.Name()))
		if ext != ".jpg" && ext != ".jpeg" && ext != ".png" {
			continue
		}
		imagePath := path.Join(directory, entry.Name())
		original, err := fs.ReadFile(source, imagePath)
		if err != nil {
			return nil, fmt.Errorf("%s: %w", entry.Name(), err)
		}
		data, err := compressAsJPEG(original, compressionRatio)
		if err != nil {
			return nil, fmt.Errorf("%s: %w", entry.Name(), err)
		}
		log.Printf("compressed snapshot %s: %d -> %d bytes (%.1f%%)", entry.Name(), len(original), len(data), float64(len(data))*100/float64(len(original)))
		snapshots = append(snapshots, demoSnapshot{name: entry.Name(), originalSize: len(original), jpeg: data})
	}
	if len(snapshots) == 0 {
		return nil, fmt.Errorf("no jpg, jpeg or png images found in %s", directory)
	}
	return snapshots, nil
}

func compressAsJPEG(original []byte, compressionRatio float64) ([]byte, error) {
	if compressionRatio <= 0 || compressionRatio > 1 {
		return nil, fmt.Errorf("compression ratio must be in (0, 1]")
	}
	source, _, err := image.Decode(bytes.NewReader(original))
	if err != nil {
		return nil, err
	}
	targetSize := max(1, int(float64(len(original))*compressionRatio))
	var best []byte
	for low, high := 1, 95; low <= high; {
		quality := (low + high) / 2
		var output bytes.Buffer
		if err := jpeg.Encode(&output, source, &jpeg.Options{Quality: quality}); err != nil {
			return nil, err
		}
		encoded := output.Bytes()
		if len(encoded) <= targetSize {
			best = append(best[:0], encoded...)
			low = quality + 1
		} else {
			high = quality - 1
		}
	}
	if best != nil {
		return best, nil
	}
	var smallest bytes.Buffer
	if err := jpeg.Encode(&smallest, source, &jpeg.Options{Quality: 1}); err != nil {
		return nil, err
	}
	return smallest.Bytes(), nil
}

func decodeValues(values any, target any) error {
	data, err := json.Marshal(values)
	if err != nil {
		return err
	}
	return json.Unmarshal(data, target)
}
