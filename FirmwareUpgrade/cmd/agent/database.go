package main

import (
	"database/sql"
	"fmt"
	"strings"

	_ "modernc.org/sqlite"
)

func openAgentDatabase(path string) (*sql.DB, error) {
	db, err := sql.Open("sqlite", path)
	if err != nil {
		return nil, err
	}
	db.SetMaxOpenConns(1)
	db.SetMaxIdleConns(1)
	if _, err := db.Exec(`PRAGMA busy_timeout = 5000`); err != nil {
		db.Close()
		return nil, fmt.Errorf("set SQLite busy timeout: %w", err)
	}
	if _, err := db.Exec(`PRAGMA journal_mode = WAL`); err != nil {
		db.Close()
		return nil, fmt.Errorf("enable SQLite WAL mode: %w", err)
	}
	if err := initAgentSchema(db); err != nil {
		db.Close()
		return nil, err
	}
	return db, nil
}

func initAgentSchema(db *sql.DB) error {
	_, err := db.Exec(`
CREATE TABLE IF NOT EXISTS reboot_receipts (
 operation_id TEXT PRIMARY KEY,boot_id TEXT NOT NULL,state TEXT NOT NULL,error_code TEXT NOT NULL DEFAULT '',updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS agent_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS video_channels (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  rtsp_url TEXT NOT NULL,
  model_name TEXT NOT NULL DEFAULT '',
  enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
  transport TEXT NOT NULL DEFAULT 'tcp',
  revision INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS alarm_records (
  channel_id TEXT NOT NULL,
  model_version TEXT NOT NULL DEFAULT '',
  detection_type TEXT NOT NULL,
  confidence REAL NOT NULL,
  alarm_time TEXT NOT NULL,
  image_path TEXT NOT NULL DEFAULT '',
  reported INTEGER NOT NULL DEFAULT 0 CHECK (reported IN (0, 1)),
  reported_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_alarm_records_pending
  ON alarm_records(reported, alarm_time);
DROP TABLE IF EXISTS detector_alarm_receipts;
CREATE TABLE IF NOT EXISTS alarm_delivery_state (
  alarm_rowid INTEGER NOT NULL,
  target TEXT NOT NULL CHECK (target IN ('cloud', 'setUp')),
  reported INTEGER NOT NULL DEFAULT 0 CHECK (reported IN (0, 1)),
  reported_at TEXT,
  PRIMARY KEY (alarm_rowid, target)
);
CREATE INDEX IF NOT EXISTS idx_alarm_delivery_pending
  ON alarm_delivery_state(target, reported, alarm_rowid);
INSERT OR IGNORE INTO alarm_delivery_state(alarm_rowid,target,reported,reported_at)
  SELECT rowid,'cloud',reported,reported_at FROM alarm_records;
INSERT OR IGNORE INTO alarm_delivery_state(alarm_rowid,target,reported,reported_at)
  SELECT rowid,'setUp',0,NULL FROM alarm_records;
`)
	if err != nil {
		return fmt.Errorf("initialize agent schema: %w", err)
	}
	if _, err := db.Exec(`ALTER TABLE alarm_records ADD COLUMN image_path TEXT NOT NULL DEFAULT ''`); err != nil && !strings.Contains(strings.ToLower(err.Error()), "duplicate column name") {
		return fmt.Errorf("add alarm image path: %w", err)
	}
	if _, err := db.Exec(`ALTER TABLE alarm_records ADD COLUMN model_version TEXT NOT NULL DEFAULT ''`); err != nil && !strings.Contains(strings.ToLower(err.Error()), "duplicate column name") {
		return fmt.Errorf("add alarm model version: %w", err)
	}
	return nil
}
