package main

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"reflect"
	"runtime"
	"strings"
	"sync"
	"testing"
	"time"

	"firmwareupgrade/internal/protocol"
	"github.com/coder/websocket"
	"github.com/coder/websocket/wsjson"
)

// A strict platform fixture catches credentials sent to the wrong environment.
func stateTestPlatform(t *testing.T, token string, tokens *[]string, mu *sync.Mutex) *httptest.Server {
	t.Helper()
	registered := false
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost || r.URL.Path != "/api/v1/agents/register" {
			http.NotFound(w, r)
			return
		}
		var req protocol.RegisterRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			t.Error(err)
			w.WriteHeader(400)
			return
		}
		mu.Lock()
		*tokens = append(*tokens, req.Token)
		accepted := req.Token == token || (!registered && len(req.Token) == 64)
		if accepted {
			registered = true
		}
		mu.Unlock()
		if !accepted {
			http.Error(w, `{"message":"invalid existing device token"}`, http.StatusUnauthorized)
			return
		}
		_ = json.NewEncoder(w).Encode(protocol.RegisterResponse{DeviceID: req.DeviceID, Token: token})
	}))
	t.Cleanup(server.Close)
	return server
}

func stateTestAgent(serverURL, stateFile string) *agent {
	return &agent{cfg: config{ServerURL: serverURL, StateFile: stateFile, DeviceName: "state-test", SKU: "RK3576", RuntimeVersion: "2.0", ModelVersion: "2.0", Address: "192.0.2.54"}, http: http.DefaultClient}
}

func TestRegistrationRemembersEachServerAcrossProcessRestarts(t *testing.T) {
	var mu sync.Mutex
	var tokensA, tokensB []string
	a := stateTestPlatform(t, "test-token-a", &tokensA, &mu)
	b := stateTestPlatform(t, "test-token-b", &tokensB, &mu)
	file := filepath.Join(t.TempDir(), "agent-state.json")
	for _, endpoint := range []string{a.URL, b.URL, a.URL, b.URL, a.URL} {
		// A fresh Agent simulates editing server_url then restarting the service.
		if err := stateTestAgent(endpoint, file).loadOrRegister(context.Background()); err != nil {
			t.Fatal(err)
		}
	}
	mu.Lock()
	defer mu.Unlock()
	if len(tokensA) != 3 || len(tokensB) != 2 || len(tokensA[0]) != 64 || len(tokensB[0]) != 64 || tokensA[0] == tokensB[0] || tokensA[1] != "test-token-a" || tokensA[2] != "test-token-a" || tokensB[1] != "test-token-b" {
		t.Fatalf("server-specific credential reuse failed: A=%v B=%v", tokensA, tokensB)
	}
	data, err := os.ReadFile(file)
	if err != nil {
		t.Fatal(err)
	}
	var saved struct {
		Version int              `json:"version"`
		Servers map[string]state `json:"servers"`
	}
	if err := json.Unmarshal(data, &saved); err != nil {
		t.Fatal(err)
	}
	if saved.Version != 2 || len(saved.Servers) != 2 || saved.Servers[a.URL].Token != "test-token-a" || saved.Servers[b.URL].Token != "test-token-b" {
		t.Fatal("server identities were not retained")
	}
}

func TestLegacyStateMigratesAfterSuccessfulRegistrationOnly(t *testing.T) {
	var mu sync.Mutex
	var tokens []string
	server := stateTestPlatform(t, "legacy-test-token", &tokens, &mu)
	file := filepath.Join(t.TempDir(), "agent-state.json")
	id, _, _, err := deviceIDFromInterfaces("")
	if err != nil {
		t.Fatal(err)
	}
	legacy, _ := json.Marshal(state{DeviceID: id, Token: "legacy-test-token"})
	if err := os.WriteFile(file, legacy, 0600); err != nil {
		t.Fatal(err)
	}
	for range 2 {
		if err := stateTestAgent(server.URL, file).loadOrRegister(context.Background()); err != nil {
			t.Fatal(err)
		}
	}
	backup, err := os.ReadFile(file + ".legacy.bak")
	if err != nil || string(backup) != string(legacy) {
		t.Fatalf("legacy backup was not preserved: %v", err)
	}
	if !reflect.DeepEqual(tokens, []string{"legacy-test-token", "legacy-test-token"}) {
		t.Fatal("legacy token was not reused")
	}
}

func TestRejectedRegistrationPreservesAllServerState(t *testing.T) {
	var mu sync.Mutex
	var tokens []string
	server := stateTestPlatform(t, "expected-test-token", &tokens, &mu)
	file := filepath.Join(t.TempDir(), "agent-state.json")
	id, _, _, err := deviceIDFromInterfaces("")
	if err != nil {
		t.Fatal(err)
	}
	before, _ := json.Marshal(map[string]any{"version": 2, "servers": map[string]state{server.URL: {DeviceID: id, Token: "rejected-test-token"}, "https://other.example.test": {DeviceID: id, Token: "other-test-token"}}})
	if err := os.WriteFile(file, before, 0600); err != nil {
		t.Fatal(err)
	}
	agent := stateTestAgent(server.URL, file)
	for range 2 {
		err := agent.loadOrRegister(context.Background())
		if err == nil || !strings.Contains(err.Error(), "invalid existing device token") {
			t.Fatalf("expected token rejection, got %v", err)
		}
		if strings.Contains(err.Error(), "rejected-test-token") {
			t.Fatal("error leaked credential")
		}
	}
	after, err := os.ReadFile(file)
	if err != nil || string(after) != string(before) {
		t.Fatal("rejection changed saved state")
	}
	if !reflect.DeepEqual(tokens, []string{"rejected-test-token", "rejected-test-token"}) {
		t.Fatal("retry dropped existing credentials")
	}
}

func TestCorruptStateDoesNotRegisterOrOverwrite(t *testing.T) {
	for _, content := range []string{"{invalid", "null", "{}", `{"version":999,"servers":{}}`, `{"version":2,"servers":null}`, `{"version":2,"servers":{"https://example.test":{"device_id":"board","token":""}}}`} {
		t.Run(content, func(t *testing.T) {
			calls := 0
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { calls++; w.WriteHeader(500) }))
			defer server.Close()
			file := filepath.Join(t.TempDir(), "agent-state.json")
			if err := os.WriteFile(file, []byte(content), 0600); err != nil {
				t.Fatal(err)
			}
			if err := stateTestAgent(server.URL, file).loadOrRegister(context.Background()); err == nil {
				t.Fatal("invalid state accepted")
			}
			after, _ := os.ReadFile(file)
			if calls != 0 || string(after) != content {
				t.Fatal("invalid state was ignored or modified")
			}
		})
	}
}

func TestServerStateKeyNormalizesEquivalentAddresses(t *testing.T) {
	for input, want := range map[string]string{
		" HTTPS://TEST.Example.com:443/// ":      "https://test.example.com",
		"http://TEST.Example.com:80/":            "http://test.example.com",
		"http://TEST.Example.com:4700/prefix/":   "http://test.example.com:4700/prefix",
		"http://[::1]:80/":                       "http://[::1]",
		"http://[::1]:4700/":                     "http://[::1]:4700",
		"https://test.example.com/prefix%20one/": "https://test.example.com/prefix%20one",
	} {
		got, err := serverStateKey(input)
		if err != nil || got != want {
			t.Fatalf("server normalization: got=%q want=%q err=%v", got, want, err)
		}
	}
	for _, input := range []string{"", "test.example.com", "ftp://test.example.com", "http://user:secret@test.example.com", "https://test.example.com?token=secret", "https://test.example.com#fragment"} {
		if _, err := serverStateKey(input); err == nil {
			t.Fatal("invalid server root accepted")
		}
	}
}

func TestInvalidRegistrationResponsePreservesDiskAndMemoryIdentity(t *testing.T) {
	for _, reply := range []string{`{invalid`, `{"device_id":"another-board","device_token":"other-token"}`, `{"device_id":"%s","device_token":""}`} {
		t.Run(reply, func(t *testing.T) {
			id, _, _, err := deviceIDFromInterfaces("")
			if err != nil {
				t.Fatal(err)
			}
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				_, _ = w.Write([]byte(strings.ReplaceAll(reply, "%s", id)))
			}))
			defer server.Close()
			file := filepath.Join(t.TempDir(), "agent-state.json")
			original := state{DeviceID: id, Token: "saved-test-token"}
			before, _ := json.Marshal(serverStates{Version: 2, Servers: map[string]state{server.URL: original}})
			if err := os.WriteFile(file, before, 0600); err != nil {
				t.Fatal(err)
			}
			a := stateTestAgent(server.URL, file)
			a.state = original
			if err := a.loadOrRegister(context.Background()); err == nil {
				t.Fatal("invalid registration response accepted")
			}
			after, _ := os.ReadFile(file)
			if string(after) != string(before) || a.currentState() != original {
				t.Fatal("invalid response replaced credentials")
			}
		})
	}
}

func TestRejectedLegacyStateIsNotMigrated(t *testing.T) {
	var mu sync.Mutex
	var tokens []string
	server := stateTestPlatform(t, "server-token", &tokens, &mu)
	file := filepath.Join(t.TempDir(), "agent-state.json")
	id, _, _, err := deviceIDFromInterfaces("")
	if err != nil {
		t.Fatal(err)
	}
	before, _ := json.Marshal(state{DeviceID: id, Token: "wrong-legacy-token"})
	if err := os.WriteFile(file, before, 0600); err != nil {
		t.Fatal(err)
	}
	if err := stateTestAgent(server.URL, file).loadOrRegister(context.Background()); err == nil {
		t.Fatal("invalid legacy registration accepted")
	}
	after, _ := os.ReadFile(file)
	if string(after) != string(before) {
		t.Fatal("rejected legacy file was modified")
	}
	if _, err := os.Stat(file + ".legacy.bak"); !os.IsNotExist(err) {
		t.Fatal("failed registration attempted migration")
	}
}

func TestSaveFailurePreservesLegacyIdentityAndCleansTemporaryFiles(t *testing.T) {
	file := filepath.Join(t.TempDir(), "agent-state.json")
	before := []byte(`{"device_id":"test-board","token":"legacy-test-token"}`)
	if err := os.WriteFile(file, before, 0600); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(file+".legacy.bak", []byte("different backup"), 0600); err != nil {
		t.Fatal(err)
	}
	states, legacy, err := readServerStates(file)
	if err != nil {
		t.Fatal(err)
	}
	states.Servers["https://test.example.com"] = legacy.Identity
	if err := saveServerStates(file, states, legacy); err == nil {
		t.Fatal("conflicting backup was overwritten")
	}
	after, _ := os.ReadFile(file)
	if string(after) != string(before) {
		t.Fatal("save failure damaged legacy file")
	}
	// Force the rename step to fail, after successfully writing the temporary file.
	target := filepath.Join(t.TempDir(), "nonempty-target")
	if err := os.Mkdir(target, 0750); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(target, "keep"), []byte("keep"), 0600); err != nil {
		t.Fatal(err)
	}
	if err := saveServerStates(target, states, nil); err == nil {
		t.Fatal("rename to a directory unexpectedly succeeded")
	}
	leftovers, _ := filepath.Glob(filepath.Join(filepath.Dir(target), ".agent-state-*.tmp"))
	if len(leftovers) != 0 {
		t.Fatal("failed save left temporary credentials")
	}
}

func TestServerStateFilesHavePrivatePermissions(t *testing.T) {
	if runtime.GOOS == "windows" {
		t.Skip("Unix file modes do not apply to Windows ACLs")
	}
	file := filepath.Join(t.TempDir(), "agent-state.json")
	legacy := []byte(`{"device_id":"test-board","token":"legacy-test-token"}`)
	if err := os.WriteFile(file, legacy, 0644); err != nil {
		t.Fatal(err)
	}
	states, old, err := readServerStates(file)
	if err != nil {
		t.Fatal(err)
	}
	states.Servers["https://test.example.com"] = old.Identity
	if err := saveServerStates(file, states, old); err != nil {
		t.Fatal(err)
	}
	for _, name := range []string{file, file + ".legacy.bak"} {
		info, err := os.Stat(name)
		if err != nil || info.Mode().Perm() != 0600 {
			t.Fatalf("state permissions are not 0600: %v", err)
		}
	}
}

func TestDownload401ReusesServerCredentialsOnRegistration(t *testing.T) {
	id, _, _, err := deviceIDFromInterfaces("")
	if err != nil {
		t.Fatal(err)
	}
	const token = "saved-download-test-token"
	downloads, registrations := 0, 0
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/api/v1/agents/register" {
			var req protocol.RegisterRequest
			if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
				t.Error(err)
				return
			}
			registrations++
			if req.Token != token {
				http.Error(w, "invalid existing device token", 401)
				return
			}
			_ = json.NewEncoder(w).Encode(protocol.RegisterResponse{DeviceID: req.DeviceID, Token: token})
			return
		}
		if r.Header.Get("Authorization") != "Bearer "+token {
			t.Error("download used wrong credentials")
		}
		downloads++
		if downloads == 1 {
			w.WriteHeader(401)
			return
		}
		_, _ = w.Write([]byte("model"))
	}))
	defer server.Close()
	file := filepath.Join(t.TempDir(), "agent-state.json")
	identity := state{DeviceID: id, Token: token}
	if err := saveServerStates(file, serverStates{Version: 2, Servers: map[string]state{server.URL: identity, "https://other.example.test": {DeviceID: id, Token: "other-token"}}}, nil); err != nil {
		t.Fatal(err)
	}
	a := stateTestAgent(server.URL, file)
	a.state = identity
	target := filepath.Join(t.TempDir(), "model")
	if err := a.download(server.URL+"/api/v1/agents/files/file-1", target); err != nil {
		t.Fatal(err)
	}
	if downloads != 2 || registrations != 1 {
		t.Fatal("download was not retried after credential-preserving registration")
	}
	data, _ := os.ReadFile(target)
	if string(data) != "model" {
		t.Fatal("download body missing")
	}
	states, _, err := readServerStates(file)
	if err != nil || states.Servers["https://other.example.test"].Token != "other-token" {
		t.Fatal("registration lost another server's identity")
	}
}

func TestWebSocketReconnectKeepsPersistedTokenWithoutReregistering(t *testing.T) {
	var mu sync.Mutex
	registrations, connections := 0, 0
	const token = "reconnect-test-token"
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/api/v1/agents/register" {
			var req protocol.RegisterRequest
			if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
				t.Error(err)
				return
			}
			mu.Lock()
			registrations++
			mu.Unlock()
			_ = json.NewEncoder(w).Encode(protocol.RegisterResponse{DeviceID: req.DeviceID, Token: token})
			return
		}
		if r.URL.Path != "/api/v1/agents/connect" {
			http.NotFound(w, r)
			return
		}
		if r.Header.Get("Authorization") != "Bearer "+token {
			t.Error("WebSocket used wrong server token")
			w.WriteHeader(401)
			return
		}
		conn, err := websocket.Accept(w, r, nil)
		if err != nil {
			t.Error(err)
			return
		}
		defer conn.CloseNow()
		var message protocol.Message
		if err := wsjson.Read(r.Context(), conn, &message); err != nil {
			t.Error(err)
			return
		}
		if message.Type != "heartbeat" {
			t.Error("reconnection did not report heartbeat")
		}
		mu.Lock()
		connections++
		mu.Unlock()
		// Closing after the first heartbeat simulates a lost control connection.
	}))
	defer server.Close()
	file := filepath.Join(t.TempDir(), "agent-state.json")
	a := stateTestAgent(server.URL, file)
	a.cfg.AllowedTargetDir = t.TempDir()
	a.cfg.HeartbeatIntervalSeconds = 60
	if err := a.loadOrRegister(context.Background()); err != nil {
		t.Fatal(err)
	}
	before, _ := os.ReadFile(file)
	for range 2 {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		err := a.connect(ctx)
		cancel()
		if err == nil {
			t.Fatal("connection close was not reported")
		}
	}
	after, _ := os.ReadFile(file)
	mu.Lock()
	defer mu.Unlock()
	if registrations != 1 || connections != 2 || string(before) != string(after) || a.currentState().Token != token {
		t.Fatal("ordinary reconnect altered identity or repeated registration")
	}
}

func TestLostFirstRegistrationResponseCanRetryAfterRestart(t *testing.T) {
	var mu sync.Mutex
	token := ""
	calls := 0
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var req protocol.RegisterRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			t.Error(err)
			return
		}
		mu.Lock()
		defer mu.Unlock()
		calls++
		if calls == 1 {
			if len(req.Token) != 64 {
				t.Error("first registration did not provide a durable random token")
			}
			token = req.Token // Node persists the supplied token on enrollment.
			// Simulate an accepted registration followed by a dropped response.
			conn, _, err := w.(http.Hijacker).Hijack()
			if err != nil {
				t.Error(err)
				return
			}
			_ = conn.Close()
			return
		}
		if req.Token != token {
			http.Error(w, "invalid existing device token", 401)
			return
		}
		_ = json.NewEncoder(w).Encode(protocol.RegisterResponse{DeviceID: req.DeviceID, Token: token})
	}))
	defer server.Close()
	file := filepath.Join(t.TempDir(), "agent-state.json")
	first := stateTestAgent(server.URL, file)
	if err := first.loadOrRegister(context.Background()); err == nil {
		t.Fatal("lost response should report an error")
	}
	if first.currentState().Token != "" {
		t.Fatal("unconfirmed identity was activated")
	}
	// Restart while the platform already knows this device: retry must succeed.
	second := stateTestAgent(server.URL, file)
	if err := second.loadOrRegister(context.Background()); err != nil {
		t.Fatal(err)
	}
	mu.Lock()
	defer mu.Unlock()
	if calls != 2 || second.currentState().Token != token {
		t.Fatal("lost-response enrollment did not recover")
	}
}
