package main

import (
	"fmt"
	"io"
	"log"
	"os"
	"path/filepath"
	"runtime"
	"time"

	"gopkg.in/natefinch/lumberjack.v2"
)

// Initialize Agent log output.
func logInitial() {
	multiWriter := io.MultiWriter(os.Stdout, &lumberjack.Logger{
		Filename:   "./logs/logInfo.log",
		MaxSize:    10, // megabytes
		MaxBackups: 100,
		MaxAge:     30, // days
		// Compress: true,
	})
	log.SetFlags(0)
	log.SetOutput(multiWriter)
	logInfof("=================log start=================")
}

func logInfof(format string, args ...any) { logMessage("info", format, args...) }
func logWarnf(format string, args ...any) { logMessage("warn", format, args...) }
func logErrf(format string, args ...any)  { logMessage("err", format, args...) }

func logFatalf(format string, args ...any) {
	logMessage("err", format, args...)
	os.Exit(1)
}

func logMessage(level, format string, args ...any) {
	codeName := "unknown"
	if _, file, line, ok := runtime.Caller(2); ok {
		codeName = fmt.Sprintf("%s:%d", filepath.Base(file), line)
	}
	log.Printf("%s  [%s]  [%s]  %s", time.Now().Format("2006-01-02 15:04:05"), level, codeName, fmt.Sprintf(format, args...))
}
