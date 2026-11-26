package main

import (
	"encoding/base64"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
	"time"

	"firmwareupgrade/internal/protocol"
)

const remoteFileLimit int64 = 200 * 1024 * 1024
const remoteFileChunk = 64 * 1024

type remoteFile struct {
	file    *os.File
	name    string
	size    int64
	offset  int64
	upload  bool
	touched time.Time
}

// One transfer per authenticated control connection; reconnect discards staging.
type remoteFiles struct {
	root   string
	active *remoteFile
	id     string
}

func newRemoteFiles(cfg config) *remoteFiles {
	root := cfg.RemoteFileDir
	if root == "" {
		root = filepath.Join(filepath.Dir(cfg.StateFile), "files")
	}
	root, _ = filepath.Abs(root)
	return &remoteFiles{root: root}
}

func remoteFileName(name string) bool {
	return name != "" && name != "." && name != ".." && !strings.HasPrefix(name, ".") && len(name) <= 255 && !strings.ContainsAny(name, "/\\:\x00\r\n") && filepath.Base(name) == name
}

func (m *remoteFiles) close() {
	if m.active != nil {
		_ = m.active.file.Close()
		if m.active.upload {
			_ = os.Remove(m.active.file.Name())
		}
	}
	m.active = nil
	m.id = ""
}

func (m *remoteFiles) prepare() error {
	if err := os.MkdirAll(m.root, 0700); err != nil {
		return errors.New("cannot create transfer directory")
	}
	info, err := os.Lstat(m.root)
	if err != nil || !info.IsDir() || info.Mode()&os.ModeSymlink != 0 {
		return errors.New("invalid transfer directory")
	}
	return nil
}

type remoteFileRequest struct {
	ID     string `json:"transfer_id"`
	Name   string `json:"name"`
	Offset int64  `json:"offset"`
	Data   string `json:"data"`
}

func (m *remoteFiles) execute(cmd string, r remoteFileRequest) (map[string]any, error) {
	if m.active != nil && time.Since(m.active.touched) > 5*time.Minute {
		m.close()
	}
	if err := m.prepare(); err != nil {
		return nil, err
	}
	if cmd == "info" {
		return map[string]any{"directory": m.root, "max_bytes": remoteFileLimit}, nil
	}
	if r.ID == "" || len(r.ID) > 64 {
		return nil, errors.New("invalid transfer id")
	}
	if cmd == "upload.begin" || cmd == "download.begin" {
		if !remoteFileName(r.Name) {
			return nil, errors.New("provide a file name in the transfer directory")
		}
		if m.active != nil {
			return nil, errors.New("another file transfer is active")
		}
		filename := filepath.Join(m.root, r.Name)
		var f *os.File
		var size int64
		if cmd == "upload.begin" {
			if _, err := os.Lstat(filename); !os.IsNotExist(err) {
				return nil, errors.New("file already exists")
			}
			var err error
			f, err = os.CreateTemp(m.root, ".upload-*")
			if err != nil {
				return nil, errors.New("cannot create temporary file")
			}
		} else {
			info, err := os.Lstat(filename)
			if err != nil || !info.Mode().IsRegular() {
				return nil, errors.New("file not found or not a regular file")
			}
			if info.Size() > remoteFileLimit {
				return nil, errors.New("file exceeds 200 MB")
			}
			f, err = os.Open(filename)
			if err != nil {
				return nil, errors.New("cannot read file")
			}
			opened, err := f.Stat()
			if err != nil || !os.SameFile(info, opened) {
				f.Close()
				return nil, errors.New("file changed while opening")
			}
			size = info.Size()
		}
		m.active = &remoteFile{file: f, name: r.Name, size: size, upload: cmd == "upload.begin", touched: time.Now()}
		m.id = r.ID
		return map[string]any{"name": r.Name, "size": size, "directory": m.root}, nil
	}
	if m.active == nil || m.id != r.ID {
		return nil, errors.New("file transfer expired or not found")
	}
	s := m.active
	s.touched = time.Now()
	switch cmd {
	case "abort":
		m.close()
		return map[string]any{}, nil
	case "upload.chunk":
		if !s.upload || r.Offset != s.offset {
			return nil, errors.New("invalid upload offset")
		}
		bytes, err := base64.StdEncoding.DecodeString(r.Data)
		if err != nil || len(bytes) == 0 || len(bytes) > remoteFileChunk || s.offset+int64(len(bytes)) > remoteFileLimit {
			return nil, errors.New("invalid upload chunk or file exceeds 200 MB")
		}
		n, err := s.file.Write(bytes)
		if err != nil || n != len(bytes) {
			m.close()
			return nil, errors.New("file write failed")
		}
		s.offset += int64(n)
		return map[string]any{"offset": s.offset}, nil
	case "upload.finish":
		if !s.upload || r.Offset != s.offset {
			return nil, errors.New("incomplete upload")
		}
		if err := s.file.Sync(); err != nil {
			m.close()
			return nil, errors.New("file flush failed")
		}
		if err := s.file.Close(); err != nil {
			m.close()
			return nil, errors.New("file close failed")
		}
		// Link refuses to replace an existing file, including a symlink.
		if err := os.Link(s.file.Name(), filepath.Join(m.root, s.name)); err != nil {
			m.close()
			return nil, errors.New("cannot publish file; check directory permissions or duplicate name")
		}
		result := map[string]any{"name": s.name, "size": s.offset, "directory": m.root}
		m.close()
		return result, nil
	case "download.chunk":
		if s.upload || r.Offset != s.offset {
			return nil, errors.New("invalid download offset")
		}
		bytes := make([]byte, remoteFileChunk)
		n, err := s.file.Read(bytes)
		if err != nil && err != io.EOF {
			m.close()
			return nil, errors.New("file read failed")
		}
		s.offset += int64(n)
		if s.offset > s.size || (n == 0 && s.offset != s.size) {
			m.close()
			return nil, errors.New("file changed during download")
		}
		result := map[string]any{"offset": s.offset, "data": base64.StdEncoding.EncodeToString(bytes[:n]), "eof": s.offset == s.size}
		if s.offset == s.size {
			m.close()
		}
		return result, nil
	}
	return nil, errors.New("unsupported file transfer command")
}

func (m *remoteFiles) handle(msg protocol.Message, write func(protocol.Message) error) bool {
	if !strings.HasPrefix(msg.Type, "file.transfer.") {
		return false
	}
	var request remoteFileRequest
	err := decodeData(msg.Data, &request)
	var result map[string]any
	if err == nil {
		result, err = m.execute(strings.TrimPrefix(msg.Type, "file.transfer."), request)
	}
	if result == nil {
		result = map[string]any{}
	}
	result["operate"] = err == nil
	if err != nil {
		result["err"] = err.Error()
	}
	response := protocol.New(msg.Type+".result", result)
	response.RequestID = msg.RequestID
	if err := write(response); err != nil {
		logWarnf("file transfer response: %v", err)
	}
	if strings.HasSuffix(msg.Type, ".begin") || strings.HasSuffix(msg.Type, ".finish") || err != nil {
		logInfof("file transfer: command=%s name=%s success=%t error=%s", msg.Type, request.Name, err == nil, fmt.Sprint(err))
	}
	return true
}
