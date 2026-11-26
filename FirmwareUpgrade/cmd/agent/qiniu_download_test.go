package main

import (
	"fmt"
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestExternalDownloadResumesWithoutDeviceToken(t *testing.T) {
	var auth, requestedRange string
	cdn := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		auth = r.Header.Get("Authorization")
		requestedRange = r.Header.Get("Range")
		if r.URL.Query().Get("token") != "signed-qiniu-token" {
			t.Error("missing signed URL token")
		}
		w.Header().Set("Content-Range", "bytes 3-5/6")
		w.WriteHeader(http.StatusPartialContent)
		_, _ = w.Write([]byte("def"))
	}))
	defer cdn.Close()
	a := &agent{cfg: config{ServerURL: "http://platform.example.test:4700"}, state: state{Token: "private-device-token"}, http: cdn.Client()}
	target := filepath.Join(t.TempDir(), "model.part")
	if err := os.WriteFile(target, []byte("abc"), 0600); err != nil {
		t.Fatal(err)
	}
	if err := a.download(cdn.URL+"/model.rknn?e=9999999999&token=signed-qiniu-token", target); err != nil {
		t.Fatal(err)
	}
	data, err := os.ReadFile(target)
	if err != nil || string(data) != "abcdef" {
		t.Fatalf("download = %q, err = %v", data, err)
	}
	if auth != "" || requestedRange != "bytes=3-" {
		t.Fatalf("auth=%q, range=%q", auth, requestedRange)
	}
}

func TestPlatformDownloadRedirectStripsDeviceToken(t *testing.T) {
	var auth string
	cdn := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		auth = r.Header.Get("Authorization")
		_, _ = w.Write([]byte("model"))
	}))
	defer cdn.Close()
	platform := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Authorization") != "Bearer private-device-token" {
			t.Error("platform did not receive its device token")
		}
		http.Redirect(w, r, cdn.URL+"/model?token=signed", http.StatusTemporaryRedirect)
	}))
	defer platform.Close()
	a := &agent{cfg: config{ServerURL: platform.URL}, state: state{Token: "private-device-token"}, http: platform.Client()}
	if err := a.download(platform.URL+"/api/v1/agents/files/f1", filepath.Join(t.TempDir(), "model")); err != nil {
		t.Fatal(err)
	}
	if auth != "" {
		t.Fatal("external object storage received device token")
	}
}

func TestExternal401DoesNotRefreshPlatformRegistration(t *testing.T) {
	registrations := 0
	platform := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { registrations++; w.WriteHeader(500) }))
	defer platform.Close()
	cdn := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(http.StatusUnauthorized) }))
	defer cdn.Close()
	a := &agent{cfg: config{ServerURL: platform.URL}, http: cdn.Client()}
	err := a.download(cdn.URL+"/model?token=signed", filepath.Join(t.TempDir(), "model"))
	if err == nil || !strings.Contains(err.Error(), "401") {
		t.Fatalf("expected 401, got %v", err)
	}
	if registrations != 0 {
		t.Fatal("external 401 triggered platform registration")
	}
}

func TestDownloadDiagnosticsHideSigningQuery(t *testing.T) {
	raw := "https://files.example.test/model?token=private-signature&e=123"
	if got := downloadLogURL(raw); got != "https://files.example.test/model" {
		t.Fatalf("log URL = %s", got)
	}
	err := downloadRequestError(&url.Error{Op: "Get", URL: raw, Err: fmt.Errorf("network unavailable")})
	if strings.Contains(err.Error(), "private-signature") {
		t.Fatal("error exposes signature")
	}
}
