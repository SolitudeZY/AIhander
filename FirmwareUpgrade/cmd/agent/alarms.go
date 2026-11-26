package main

import (
	"database/sql"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"firmwareupgrade/internal/protocol"
)

func (a *agent) recordAlarm(alarm protocol.AlarmRecord) (int64, error) {
	if a.db == nil {
		return 0, errors.New("agent database is not initialized")
	}
	if err := normalizeAlarm(&alarm); err != nil {
		return 0, err
	}
	tx, err := a.db.Begin()
	if err != nil {
		return 0, err
	}
	defer tx.Rollback()
	result, err := tx.Exec(`INSERT INTO alarm_records(channel_id,model_version,detection_type,confidence,alarm_time,image_path,reported,reported_at) VALUES(?,?,?,?,?,?,0,NULL)`, alarm.ChannelID, alarm.ModelVersion, alarm.DetectionType, alarm.Confidence, alarm.AlarmTime, alarm.ImagePath)
	if err != nil {
		return 0, err
	}
	rowID, err := result.LastInsertId()
	if err != nil {
		return 0, err
	}
	if err := insertAlarmDeliveries(tx, rowID); err != nil {
		return 0, err
	}
	if err := tx.Commit(); err != nil {
		return 0, err
	}
	return rowID, nil
}

func normalizeAlarm(alarm *protocol.AlarmRecord) error {
	alarm.ChannelID = strings.TrimSpace(alarm.ChannelID)
	alarm.DetectionType = strings.TrimSpace(alarm.DetectionType)
	if alarm.ChannelID == "" || alarm.DetectionType == "" {
		return errors.New("channelId and detectionType are required")
	}
	if alarm.Confidence < 0 || alarm.Confidence > 1 {
		return errors.New("confidence must be between 0 and 1")
	}
	if alarm.AlarmTime == "" {
		alarm.AlarmTime = time.Now().UTC().Format(time.RFC3339Nano)
	} else if _, err := time.Parse(time.RFC3339Nano, alarm.AlarmTime); err != nil {
		return errors.New("alarmTime must use RFC3339 format")
	}
	return nil
}

func (a *agent) recordDetectorAlarm(event protocol.DetectorAlarm) (rowID int64, err error) {
	if a.db == nil {
		return 0, errors.New("agent database is not initialized")
	}
	alarm := protocol.AlarmRecord{ChannelID: event.ChannelID, ModelVersion: event.ModelVersion, DetectionType: event.DetectionType, Confidence: event.Confidence, AlarmTime: event.AlarmTime}
	if err := normalizeAlarm(&alarm); err != nil {
		return 0, err
	}
	tx, err := a.db.Begin()
	if err != nil {
		return 0, err
	}
	defer tx.Rollback()
	imagePath, absoluteImagePath, err := a.saveDetectorAlarmImage(event, alarm.AlarmTime)
	if err != nil {
		return 0, err
	}
	committed := false
	defer func() {
		if !committed && absoluteImagePath != "" {
			_ = os.Remove(absoluteImagePath)
		}
	}()
	result, err := tx.Exec(`INSERT INTO alarm_records(channel_id,model_version,detection_type,confidence,alarm_time,image_path,reported,reported_at) VALUES(?,?,?,?,?,?,0,NULL)`, alarm.ChannelID, alarm.ModelVersion, alarm.DetectionType, alarm.Confidence, alarm.AlarmTime, imagePath)
	if err != nil {
		return 0, err
	}
	rowID, err = result.LastInsertId()
	if err != nil {
		return 0, err
	}
	if err := insertAlarmDeliveries(tx, rowID); err != nil {
		return 0, err
	}
	if err := tx.Commit(); err != nil {
		return 0, err
	}
	committed = true
	return rowID, nil
}

func (a *agent) saveDetectorAlarmImage(event protocol.DetectorAlarm, alarmTime string) (string, string, error) {
	if len(event.Image) == 0 {
		return "", "", nil
	}
	if event.ImageMimeType != "image/jpeg" {
		return "", "", errors.New("alarm image must be image/jpeg")
	}
	if len(event.Image) > int(protocol.MaxControlMessageBytes) {
		return "", "", errors.New("alarm image is too large")
	}
	parsed, _ := time.Parse(time.RFC3339Nano, alarmTime)
	relativeDirectory := filepath.Join("alarm-images", parsed.Format("2006"), parsed.Format("01"), parsed.Format("02"))
	absoluteDirectory := filepath.Join(filepath.Dir(a.cfg.DatabaseFile), relativeDirectory)
	if err := os.MkdirAll(absoluteDirectory, 0o750); err != nil {
		return "", "", err
	}
	temporary, err := os.CreateTemp(absoluteDirectory, ".alarm-*.tmp")
	if err != nil {
		return "", "", err
	}
	temporaryName := temporary.Name()
	defer os.Remove(temporaryName)
	if _, err := temporary.Write(event.Image); err != nil {
		temporary.Close()
		return "", "", err
	}
	if err := temporary.Close(); err != nil {
		return "", "", err
	}
	baseName := strings.TrimSuffix(strings.TrimPrefix(filepath.Base(temporaryName), ".alarm-"), ".tmp") + ".jpg"
	relative := filepath.Join(relativeDirectory, baseName)
	absolute := filepath.Join(filepath.Dir(a.cfg.DatabaseFile), relative)
	if err := os.Rename(temporaryName, absolute); err != nil {
		return "", "", err
	}
	return filepath.ToSlash(relative), absolute, nil
}

func insertAlarmDeliveries(tx *sql.Tx, rowID int64) error {
	_, err := tx.Exec(`INSERT INTO alarm_delivery_state(alarm_rowid,target,reported,reported_at) VALUES(?,'cloud',0,NULL),(?,'setUp',0,NULL)`, rowID, rowID)
	return err
}

func (a *agent) pendingAlarms(limit int) ([]protocol.AlarmRecord, error) {
	return a.pendingAlarmsForTarget("cloud", limit)
}

func (a *agent) pendingAlarmsForTarget(target string, limit int) ([]protocol.AlarmRecord, error) {
	if a.db == nil {
		return nil, errors.New("agent database is not initialized")
	}
	if limit <= 0 || limit > 1000 {
		limit = 100
	}
	rows, err := a.db.Query(`SELECT a.rowid,a.channel_id,a.model_version,a.detection_type,a.confidence,a.alarm_time,a.image_path,d.reported,COALESCE(d.reported_at,'') FROM alarm_records a JOIN alarm_delivery_state d ON d.alarm_rowid=a.rowid WHERE d.target=? AND d.reported=0 ORDER BY a.alarm_time,a.rowid LIMIT ?`, target, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	alarms := []protocol.AlarmRecord{}
	for rows.Next() {
		var alarm protocol.AlarmRecord
		if err := rows.Scan(&alarm.RowID, &alarm.ChannelID, &alarm.ModelVersion, &alarm.DetectionType, &alarm.Confidence, &alarm.AlarmTime, &alarm.ImagePath, &alarm.Reported, &alarm.ReportedAt); err != nil {
			return nil, err
		}
		if alarm.ImagePath != "" {
			imagePath := filepath.Join(filepath.Dir(a.cfg.DatabaseFile), filepath.FromSlash(alarm.ImagePath))
			alarm.Image, err = os.ReadFile(imagePath)
			if err != nil {
				return nil, fmt.Errorf("read alarm image: %w", err)
			}
			alarm.ImageMimeType = "image/jpeg"
		}
		alarms = append(alarms, alarm)
	}
	return alarms, rows.Err()
}

func (a *agent) markAlarmsReported(rowIDs []int64, reportedAt time.Time) error {
	return a.markAlarmsReportedForTarget("cloud", rowIDs, reportedAt)
}

func (a *agent) markAlarmsReportedForTarget(target string, rowIDs []int64, reportedAt time.Time) error {
	if a.db == nil {
		return errors.New("agent database is not initialized")
	}
	if len(rowIDs) == 0 {
		return nil
	}
	tx, err := a.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()
	at := reportedAt.UTC().Format(time.RFC3339Nano)
	for _, rowID := range rowIDs {
		if rowID <= 0 {
			continue
		}
		if _, err := tx.Exec(`UPDATE alarm_delivery_state SET reported=1,reported_at=? WHERE alarm_rowid=? AND target=? AND reported=0`, at, rowID, target); err != nil {
			return err
		}
		if target == "cloud" {
			if _, err := tx.Exec(`UPDATE alarm_records SET reported=1,reported_at=? WHERE rowid=? AND reported=0`, at, rowID); err != nil {
				return err
			}
		}
	}
	return tx.Commit()
}

func (a *agent) reportPendingAlarms(write func(protocol.Message) error) error {
	return a.reportPendingAlarmsForTarget("cloud", write)
}

func (a *agent) reportPendingAlarmsForTarget(target string, write func(protocol.Message) error) error {
	alarms, err := a.pendingAlarmsForTarget(target, 1)
	if err != nil || len(alarms) == 0 {
		return err
	}
	return write(protocol.New("alarmReport", protocol.AlarmReport{Alarms: alarms}))
}
