package main

import (
	"bytes"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"net"
	"net/url"
	"os"
	"path/filepath"
	"strings"
)

const serverStateVersion = 2

type serverStates struct {
	Version int              `json:"version"`
	Servers map[string]state `json:"servers"`
}

type legacyServerState struct {
	Identity state
	Original []byte
}

func newServerIdentity(deviceID string) (state, error) {
	var token [32]byte
	if _, err := rand.Read(token[:]); err != nil {
		return state{}, fmt.Errorf("generate device registration token: %w", err)
	}
	return state{DeviceID: deviceID, Token: hex.EncodeToString(token[:])}, nil
}

func (a *agent) currentState() state {
	a.stateMu.RLock()
	defer a.stateMu.RUnlock()
	return a.state
}

// URLs identify platforms, not their current DNS resolutions. Path prefixes
// distinguish separate platform installations served by the same host.
func serverStateKey(raw string) (string, error) {
	u, err := url.Parse(strings.TrimSpace(raw))
	if err != nil {
		return "", errors.New("invalid server_url for device registration")
	}
	u.Scheme = strings.ToLower(u.Scheme)
	if (u.Scheme != "http" && u.Scheme != "https") || u.Hostname() == "" || u.User != nil || u.RawQuery != "" || u.ForceQuery || u.Fragment != "" || u.Opaque != "" {
		return "", errors.New("server_url must be an HTTP(S) root URL without credentials, query or fragment")
	}
	host, port := strings.ToLower(u.Hostname()), u.Port()
	if (u.Scheme == "http" && port == "80") || (u.Scheme == "https" && port == "443") {
		port = ""
	}
	if port != "" {
		u.Host = net.JoinHostPort(host, port)
	} else if strings.Contains(host, ":") {
		u.Host = "[" + host + "]"
	} else {
		u.Host = host
	}
	u.Path = strings.TrimRight(u.Path, "/")
	u.RawPath = strings.TrimRight(u.RawPath, "/")
	return u.String(), nil
}

func readServerStates(filename string) (serverStates, *legacyServerState, error) {
	empty := serverStates{Version: serverStateVersion, Servers: map[string]state{}}
	data, err := os.ReadFile(filename)
	if errors.Is(err, os.ErrNotExist) {
		return empty, nil, nil
	}
	if err != nil {
		return empty, nil, fmt.Errorf("read agent state %s: %w", filename, err)
	}
	var saved serverStates
	if err := json.Unmarshal(data, &saved); err != nil {
		// JSON errors can include invalid bytes from a damaged credential; avoid
		// logging the parser's contents or the file itself.
		return empty, nil, fmt.Errorf("invalid JSON in agent state %s; restore backup before retrying", filename)
	}
	if saved.Version == 0 {
		var identity state
		if err := json.Unmarshal(data, &identity); err != nil || identity.DeviceID == "" || strings.TrimSpace(identity.Token) == "" {
			return empty, nil, fmt.Errorf("invalid legacy agent state %s; restore backup before retrying", filename)
		}
		return empty, &legacyServerState{Identity: identity, Original: data}, nil
	}
	if saved.Version != serverStateVersion || saved.Servers == nil {
		return empty, nil, fmt.Errorf("unsupported agent state format in %s; expected version %d with servers", filename, serverStateVersion)
	}
	for raw, identity := range saved.Servers {
		key, err := serverStateKey(raw)
		if err != nil || identity.DeviceID == "" || strings.TrimSpace(identity.Token) == "" {
			return empty, nil, fmt.Errorf("invalid server entry in agent state %s; restore backup before retrying", filename)
		}
		if other, found := empty.Servers[key]; found && other != identity {
			return empty, nil, fmt.Errorf("conflicting server entries in agent state %s", filename)
		}
		empty.Servers[key] = identity
	}
	return empty, nil, nil
}

func saveServerStates(filename string, states serverStates, legacy *legacyServerState) error {
	data, err := json.MarshalIndent(states, "", "  ")
	if err != nil {
		return fmt.Errorf("encode agent state: %w", err)
	}
	if err := os.MkdirAll(filepath.Dir(filename), 0750); err != nil {
		return fmt.Errorf("create agent state directory: %w", err)
	}
	if legacy != nil {
		backup := filename + ".legacy.bak"
		file, err := os.OpenFile(backup, os.O_WRONLY|os.O_CREATE|os.O_EXCL, 0600)
		if errors.Is(err, os.ErrExist) {
			original, readErr := os.ReadFile(backup)
			if readErr != nil || !bytes.Equal(original, legacy.Original) {
				return fmt.Errorf("legacy backup %s already exists with different contents; preserve both files before retrying", backup)
			}
		} else if err != nil {
			return fmt.Errorf("create legacy agent state backup: %w", err)
		} else {
			_, writeErr := file.Write(legacy.Original)
			if writeErr == nil {
				writeErr = file.Sync()
			}
			closeErr := file.Close()
			if writeErr != nil || closeErr != nil {
				_ = os.Remove(backup)
				return fmt.Errorf("save legacy agent state backup: %w", errors.Join(writeErr, closeErr))
			}
		}
	}
	file, err := os.CreateTemp(filepath.Dir(filename), ".agent-state-*.tmp")
	if err != nil {
		return fmt.Errorf("create temporary agent state: %w", err)
	}
	temporary := file.Name()
	defer os.Remove(temporary)
	_, writeErr := file.Write(data)
	if writeErr == nil {
		writeErr = file.Sync()
	}
	closeErr := file.Close()
	if writeErr != nil || closeErr != nil {
		return fmt.Errorf("write agent state: %w", errors.Join(writeErr, closeErr))
	}
	if err := os.Rename(temporary, filename); err != nil {
		return fmt.Errorf("replace agent state %s: %w", filename, err)
	}
	return nil
}
