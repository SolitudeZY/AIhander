package protocol

import (
	"encoding/json"
	"strings"
	"testing"
)

func TestMessageUsesUnifiedWireFormat(t *testing.T) {
	data, err := json.Marshal(New("modelDownloadProgress", map[string]any{"progress": 62}).WithSource("agent"))
	if err != nil {
		t.Fatal(err)
	}
	text := string(data)
	for _, want := range []string{`"_from":"agent"`, `"cmd":"modelDownloadProgress"`, `"time":`, `"values":{"progress":62}`} {
		if !strings.Contains(text, want) {
			t.Fatalf("message %s does not contain %s", text, want)
		}
	}
	for _, forbidden := range []string{`"type"`, `"request_id"`, `"data"`} {
		if strings.Contains(text, forbidden) {
			t.Fatalf("message unexpectedly contains %s: %s", forbidden, text)
		}
	}
}

func TestMessageKeepsRequestIDInsideValues(t *testing.T) {
	message := New("directory.list.response", map[string]any{"directories": []string{"."}}).WithSource("agent")
	message.RequestID = "request-001"
	data, err := json.Marshal(message)
	if err != nil {
		t.Fatal(err)
	}

	var received Message
	if err := json.Unmarshal(data, &received); err != nil {
		t.Fatal(err)
	}
	if received.RequestID != "request-001" {
		t.Fatalf("request ID = %q, want request-001; message=%s", received.RequestID, data)
	}
}
