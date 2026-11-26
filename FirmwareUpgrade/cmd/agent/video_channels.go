package main

import (
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"time"

	"firmwareupgrade/internal/protocol"
)

var (
	errVideoChannelRevisionConflict = errors.New("video channel revision conflict")
	errVideoChannelNameConflict     = errors.New("video channel name conflict")
)

func validateVideoChannel(channel *protocol.VideoChannelConfig) error {
	channel.ChannelID = strings.TrimSpace(channel.ChannelID)
	channel.Name = strings.TrimSpace(channel.Name)
	channel.RTSPURL = strings.TrimSpace(channel.RTSPURL)
	channel.ModuleName = strings.TrimSpace(channel.ModuleName)
	channel.Transport = strings.TrimSpace(channel.Transport)
	if channel.Transport == "" {
		channel.Transport = "tcp"
	}
	if channel.ChannelID == "" || channel.Name == "" || channel.ModuleName == "" {
		return errors.New("channelId, name and moduleName are required")
	}
	parsed, err := url.Parse(channel.RTSPURL)
	if err != nil || (parsed.Scheme != "rtsp" && parsed.Scheme != "rtsps") || parsed.Host == "" {
		return errors.New("invalid rtspUrl")
	}
	if strings.ContainsAny(channel.ModuleName, `/\`) {
		return errors.New("moduleName must be a file name")
	}
	return nil
}

// checkVideoChannelNameUnique rejects a name already used by another channel
// on this Agent. The current channel is excluded so an update that keeps its
// existing name remains valid.
func (a *agent) checkVideoChannelNameUnique(channelID, name string) error {
	if a.db == nil {
		return errors.New("agent database is not initialized")
	}
	channelID, name = strings.TrimSpace(channelID), strings.TrimSpace(name)
	var existingID string
	err := a.db.QueryRow(`SELECT id FROM video_channels WHERE name=? AND id<>? LIMIT 1`, name, channelID).Scan(&existingID)
	if errors.Is(err, sql.ErrNoRows) {
		return nil
	}
	if err != nil {
		return err
	}
	return fmt.Errorf("%w: 视频通道名称“%s”已存在", errVideoChannelNameConflict, name)
}

func (a *agent) setVideoChannel(channel protocol.VideoChannelConfig) error {
	_, err := a.upsertVideoChannel(channel)
	return err
}

func (a *agent) upsertVideoChannel(channel protocol.VideoChannelConfig) (protocol.VideoChannelConfig, error) {
	if a.db == nil {
		return protocol.VideoChannelConfig{}, errors.New("agent database is not initialized")
	}
	if err := validateVideoChannel(&channel); err != nil {
		return protocol.VideoChannelConfig{}, err
	}
	tx, err := a.db.Begin()
	if err != nil {
		return protocol.VideoChannelConfig{}, err
	}
	defer tx.Rollback()
	var currentRevision int64
	err = tx.QueryRow(`SELECT revision FROM video_channels WHERE id=?`, channel.ChannelID).Scan(&currentRevision)
	now := time.Now().UTC().Format(time.RFC3339Nano)
	switch {
	case errors.Is(err, sql.ErrNoRows):
		if channel.ExpectedRevision != nil && *channel.ExpectedRevision != 0 {
			return protocol.VideoChannelConfig{}, errVideoChannelRevisionConflict
		}
		channel.Revision = 1
		_, err = tx.Exec(`INSERT INTO video_channels(id,name,rtsp_url,model_name,enabled,transport,revision,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)`, channel.ChannelID, channel.Name, channel.RTSPURL, channel.ModuleName, channel.Enabled, channel.Transport, channel.Revision, now, now)
	case err != nil:
		return protocol.VideoChannelConfig{}, err
	default:
		if channel.ExpectedRevision != nil && *channel.ExpectedRevision != currentRevision {
			return protocol.VideoChannelConfig{}, errVideoChannelRevisionConflict
		}
		channel.Revision = currentRevision + 1
		_, err = tx.Exec(`UPDATE video_channels SET name=?,rtsp_url=?,model_name=?,enabled=?,transport=?,revision=?,updated_at=? WHERE id=?`, channel.Name, channel.RTSPURL, channel.ModuleName, channel.Enabled, channel.Transport, channel.Revision, now, channel.ChannelID)
	}
	if err != nil {
		return protocol.VideoChannelConfig{}, err
	}
	if err := tx.Commit(); err != nil {
		return protocol.VideoChannelConfig{}, err
	}
	channel.ExpectedRevision = nil
	return channel, nil
}

func (a *agent) deleteVideoChannel(channelID string) error {
	return a.deleteVideoChannelRevision(channelID, nil)
}

func (a *agent) deleteVideoChannelRevision(channelID string, expectedRevision *int64) error {
	if a.db == nil {
		return errors.New("agent database is not initialized")
	}
	channelID = strings.TrimSpace(channelID)
	if channelID == "" {
		return errors.New("channelId is required")
	}
	tx, err := a.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()
	var revision int64
	err = tx.QueryRow(`SELECT revision FROM video_channels WHERE id=?`, channelID).Scan(&revision)
	if errors.Is(err, sql.ErrNoRows) {
		return tx.Commit()
	}
	if err != nil {
		return err
	}
	if expectedRevision != nil && *expectedRevision != revision {
		return errVideoChannelRevisionConflict
	}
	if _, err := tx.Exec(`DELETE FROM video_channels WHERE id=?`, channelID); err != nil {
		return err
	}
	return tx.Commit()
}

// checkVideoChannelRevision validates a management-side optimistic revision
// against Agent's last Detector-confirmed mirror without changing SQLite.
func (a *agent) checkVideoChannelRevision(channelID string, expectedRevision *int64, mustExist bool) error {
	channelID = strings.TrimSpace(channelID)
	if channelID == "" {
		return errors.New("channelId is required")
	}
	var revision int64
	err := a.db.QueryRow(`SELECT revision FROM video_channels WHERE id=?`, channelID).Scan(&revision)
	if errors.Is(err, sql.ErrNoRows) {
		if mustExist || (expectedRevision != nil && *expectedRevision != 0) {
			return errVideoChannelRevisionConflict
		}
		return nil
	}
	if err != nil {
		return err
	}
	if expectedRevision != nil && *expectedRevision != revision {
		return errVideoChannelRevisionConflict
	}
	return nil
}

// mirrorVideoChannel stores the exact configuration and revision confirmed by
// Detector. It never increments revision locally.
func (a *agent) mirrorVideoChannel(channel protocol.VideoChannelConfig) (protocol.VideoChannelConfig, error) {
	channel.ExpectedRevision = nil
	if err := validateVideoChannel(&channel); err != nil {
		return protocol.VideoChannelConfig{}, err
	}
	if channel.Revision <= 0 {
		return protocol.VideoChannelConfig{}, errors.New("Detector returned invalid channel revision")
	}
	now := time.Now().UTC().Format(time.RFC3339Nano)
	_, err := a.db.Exec(`INSERT INTO video_channels(id,name,rtsp_url,model_name,enabled,transport,revision,created_at,updated_at)
VALUES(?,?,?,?,?,?,?,?,?)
ON CONFLICT(id) DO UPDATE SET name=excluded.name,rtsp_url=excluded.rtsp_url,model_name=excluded.model_name,enabled=excluded.enabled,transport=excluded.transport,revision=excluded.revision,updated_at=excluded.updated_at`,
		channel.ChannelID, channel.Name, channel.RTSPURL, channel.ModuleName, channel.Enabled, channel.Transport, channel.Revision, now, now)
	if err != nil {
		return protocol.VideoChannelConfig{}, err
	}
	return channel, nil
}

// replaceVideoChannelMirror makes Agent SQLite an exact cache of Detector's
// current configuration after a successful channelList response.
func (a *agent) replaceVideoChannelMirror(channels []protocol.VideoChannelConfig) error {
	for i := range channels {
		channels[i].ExpectedRevision = nil
		if channels[i].Revision <= 0 {
			return errors.New("Detector returned invalid channel revision")
		}
		if err := validateVideoChannel(&channels[i]); err != nil {
			return err
		}
	}
	tx, err := a.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()
	if _, err := tx.Exec(`DELETE FROM video_channels`); err != nil {
		return err
	}
	now := time.Now().UTC().Format(time.RFC3339Nano)
	for _, channel := range channels {
		if _, err := tx.Exec(`INSERT INTO video_channels(id,name,rtsp_url,model_name,enabled,transport,revision,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)`,
			channel.ChannelID, channel.Name, channel.RTSPURL, channel.ModuleName, channel.Enabled, channel.Transport, channel.Revision, now, now); err != nil {
			return err
		}
	}
	return tx.Commit()
}

func (a *agent) loadVideoChannels() ([]protocol.VideoChannelConfig, error) {
	if a.db == nil {
		return nil, errors.New("agent database is not initialized")
	}
	rows, err := a.db.Query(`SELECT id,name,enabled,rtsp_url,transport,model_name,revision FROM video_channels ORDER BY name,id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	channels := []protocol.VideoChannelConfig{}
	for rows.Next() {
		var channel protocol.VideoChannelConfig
		if err := rows.Scan(&channel.ChannelID, &channel.Name, &channel.Enabled, &channel.RTSPURL, &channel.Transport, &channel.ModuleName, &channel.Revision); err != nil {
			return nil, err
		}
		channels = append(channels, channel)
	}
	return channels, rows.Err()
}

func (a *agent) migrateLegacyVideoChannels() error {
	if a.db == nil {
		return errors.New("agent database is not initialized")
	}
	var migrated string
	err := a.db.QueryRow(`SELECT value FROM agent_meta WHERE key='legacy_video_channels_migrated'`).Scan(&migrated)
	if err == nil {
		return nil
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return err
	}
	legacyPath := filepath.Join(filepath.Dir(a.cfg.StateFile), "video-channels.json")
	data, err := os.ReadFile(legacyPath)
	if err != nil && !errors.Is(err, os.ErrNotExist) {
		return err
	}
	if err == nil {
		var channels []protocol.VideoChannelConfig
		if err := json.Unmarshal(data, &channels); err != nil {
			return err
		}
		for _, channel := range channels {
			channel.ExpectedRevision = nil
			if _, err := a.upsertVideoChannel(channel); err != nil {
				return err
			}
		}
	}
	_, err = a.db.Exec(`INSERT INTO agent_meta(key,value,updated_at) VALUES('legacy_video_channels_migrated','1',?)`, time.Now().UTC().Format(time.RFC3339Nano))
	return err
}
