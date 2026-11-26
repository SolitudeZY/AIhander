package main

import (
	"testing"
	"time"

	"firmwareupgrade/internal/protocol"
)

func TestAgentPersistsAndMarksAlarmReported(t *testing.T) {
	a := newDatabaseTestAgent(t)
	rowID, err := a.recordAlarm(protocol.AlarmRecord{ChannelID: "CH-01", DetectionType: "fire", Confidence: 0.92, AlarmTime: "2026-08-18T10:00:00Z"})
	if err != nil {
		t.Fatal(err)
	}
	alarms, err := a.pendingAlarms(10)
	if err != nil {
		t.Fatal(err)
	}
	if len(alarms) != 1 || alarms[0].RowID != rowID || alarms[0].Reported {
		t.Fatalf("pending alarms = %#v", alarms)
	}
	reportedAt := time.Date(2026, 8, 18, 10, 1, 0, 0, time.UTC)
	if err := a.markAlarmsReported([]int64{rowID}, reportedAt); err != nil {
		t.Fatal(err)
	}
	alarms, err = a.pendingAlarms(10)
	if err != nil || len(alarms) != 0 {
		t.Fatalf("pending alarms after report = %#v err=%v", alarms, err)
	}
	var reported bool
	var at string
	if err := a.db.QueryRow(`SELECT reported,reported_at FROM alarm_records WHERE rowid=?`, rowID).Scan(&reported, &at); err != nil {
		t.Fatal(err)
	}
	if !reported || at != reportedAt.Format(time.RFC3339Nano) {
		t.Fatalf("reported=%v reported_at=%q", reported, at)
	}
}

func TestAgentDatabaseHasAlarmColumns(t *testing.T) {
	a := newDatabaseTestAgent(t)
	rows, err := a.db.Query(`PRAGMA table_info(alarm_records)`)
	if err != nil {
		t.Fatal(err)
	}
	defer rows.Close()
	var names []string
	for rows.Next() {
		var cid, notNull, primaryKey int
		var name, columnType string
		var defaultValue any
		if err := rows.Scan(&cid, &name, &columnType, &notNull, &defaultValue, &primaryKey); err != nil {
			t.Fatal(err)
		}
		names = append(names, name)
	}
	want := []string{"channel_id", "model_version", "detection_type", "confidence", "alarm_time", "image_path", "reported", "reported_at"}
	if len(names) != len(want) {
		t.Fatalf("alarm columns = %v", names)
	}
	for index := range want {
		if names[index] != want[index] {
			t.Fatalf("alarm columns = %v", names)
		}
	}
}

func TestAgentPersistsEachDetectorAlarmAndQueuesReport(t *testing.T) {
	a := newDatabaseTestAgent(t)
	a.alarmReportRequests = make(chan struct{}, 1)
	event := protocol.DetectorAlarm{
		ChannelID: "CH-01", DetectionType: "landslide",
		ModelVersion: "landslide_yolov8n.rknn",
		Confidence: 0.93, AlarmTime: "2026-08-19T10:45:00+08:00", Image: []byte("jpeg-image"), ImageMimeType: "image/jpeg",
	}
	a.handleDetectorMessage(protocol.New("alarmDetected", event).WithSource("detector"))
	select {
	case <-a.alarmReportRequests:
	default:
		t.Fatal("alarm report was not requested after SQLite commit")
	}
	a.handleDetectorMessage(protocol.New("alarmDetected", event).WithSource("detector"))
	alarms, err := a.pendingAlarms(10)
	if err != nil {
		t.Fatal(err)
	}
	if len(alarms) != 2 || alarms[0].DetectionType != "landslide" || alarms[0].ModelVersion != "landslide_yolov8n.rknn" || alarms[0].Confidence != 0.93 || string(alarms[0].Image) != "jpeg-image" || alarms[0].ImagePath == "" || alarms[1].ImagePath == "" {
		t.Fatalf("pending alarms = %#v", alarms)
	}
	if alarms[0].ImagePath == alarms[1].ImagePath {
		t.Fatalf("two alarm images share path %q", alarms[0].ImagePath)
	}
	var receiptTables int
	if err := a.db.QueryRow(`SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='detector_alarm_receipts'`).Scan(&receiptTables); err != nil {
		t.Fatal(err)
	}
	if receiptTables != 0 {
		t.Fatalf("detector_alarm_receipts still exists")
	}
}

func TestAlarmDeliveryAcknowledgementsAreIndependent(t *testing.T) {
	a := newDatabaseTestAgent(t)
	rowID, err := a.recordAlarm(protocol.AlarmRecord{ChannelID: "CH-02", DetectionType: "landslide", Confidence: 0.98, AlarmTime: "2026-08-19T13:00:00+08:00"})
	if err != nil {
		t.Fatal(err)
	}
	if err := a.markAlarmsReportedForTarget("setUp", []int64{rowID}, time.Now()); err != nil {
		t.Fatal(err)
	}
	setupPending, err := a.pendingAlarmsForTarget("setUp", 10)
	if err != nil || len(setupPending) != 0 {
		t.Fatalf("setUp pending = %#v err=%v", setupPending, err)
	}
	cloudPending, err := a.pendingAlarmsForTarget("cloud", 10)
	if err != nil || len(cloudPending) != 1 || cloudPending[0].RowID != rowID {
		t.Fatalf("cloud pending = %#v err=%v", cloudPending, err)
	}
}
