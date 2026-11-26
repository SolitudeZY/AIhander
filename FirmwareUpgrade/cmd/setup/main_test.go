package main

import (
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"

	"firmwareupgrade/internal/protocol"
)

func newTestService(t *testing.T) *service {
	t.Helper()
	directory := t.TempDir()
	db, err := openDatabase(filepath.Join(directory, "setup.db"))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = db.Close() })
	return &service{dataDir: directory, db: db, browsers: map[*browserClient]struct{}{}, statuses: map[string]protocol.VideoChannelResult{}}
}

func TestSetUpPersistsAlarmBeforeAcknowledgement(t *testing.T) {
	s := newTestService(t)
	ids, err := s.persistAlarms([]protocol.AlarmRecord{{RowID: 17, ChannelID: "CH-01", DetectionType: "landslide", Confidence: 0.98, AlarmTime: "2026-08-19T13:00:00+08:00", Image: []byte("jpeg")}})
	if err != nil {
		t.Fatal(err)
	}
	if len(ids) != 1 || ids[0] != 17 {
		t.Fatalf("ids = %v", ids)
	}
	var imagePath string
	if err := s.db.QueryRow(`SELECT image_path FROM alarm_records WHERE agent_rowid=17`).Scan(&imagePath); err != nil {
		t.Fatal(err)
	}
	data, err := os.ReadFile(filepath.Join(s.dataDir, filepath.FromSlash(imagePath)))
	if err != nil || string(data) != "jpeg" {
		t.Fatalf("image=%q err=%v", data, err)
	}
}

func TestSetUpOwnsManagementPage(t *testing.T) {
	s := newTestService(t)
	request := httptest.NewRequest(http.MethodGet, "/", nil)
	response := httptest.NewRecorder()
	s.routes().ServeHTTP(response, request)
	if response.Code != http.StatusOK {
		t.Fatalf("status = %d", response.Code)
	}
	if response.Body.Len() == 0 {
		t.Fatal("management page is empty")
	}
	for _, path := range []string{"/static/xterm/xterm.js", "/static/xterm/xterm.css", "/static/xterm/addon-fit.js"} {
		request = httptest.NewRequest(http.MethodGet, path, nil)
		response = httptest.NewRecorder()
		s.routes().ServeHTTP(response, request)
		if response.Code != http.StatusOK || response.Body.Len() == 0 {
			t.Fatalf("asset %s status=%d bytes=%d", path, response.Code, response.Body.Len())
		}
	}
}
