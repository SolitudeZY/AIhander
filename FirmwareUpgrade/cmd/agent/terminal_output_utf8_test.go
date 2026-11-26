package main

import (
	"bytes"
	"io"
	"testing"
	"unicode/utf8"

	"firmwareupgrade/internal/protocol"
)

type terminalChunkReader struct {
	terminalProcess
	io.Reader
}

// Explicit Read resolves the embedded interfaces' method ambiguity.
func (p terminalChunkReader) Read(b []byte) (int, error) { return p.Reader.Read(b) }

func TestTerminalOutputSplitUTF8(t *testing.T) {
	want := []byte("token=秘密🔒\r\n中文终端\x1b[0m")
	for split := 1; split < len(want); split++ {
		readers := []io.Reader{bytes.NewReader(want[:split]), bytes.NewReader(want[split:])}
		assertTerminalUTF8Output(t, io.MultiReader(readers...), want, len(want))
	}
	// Force up to three bytes of a four-byte rune to be carried across reads.
	var readers []io.Reader
	for _, b := range want {
		readers = append(readers, bytes.NewReader([]byte{b}))
	}
	assertTerminalUTF8Output(t, io.MultiReader(readers...), want, len(want))
}

func TestTerminalOutputInvalidUTF8AndIncompleteEOF(t *testing.T) {
	input := []byte{'a', 0xff, 'b', 0xf0, 0x9f, 0x94}
	assertTerminalUTF8Output(t, bytes.NewReader(input), []byte("a\uFFFDb\uFFFD"), len(input))
}

func assertTerminalUTF8Output(t *testing.T, reader io.Reader, want []byte, rawBytes int) {
	t.Helper()
	var got []byte
	var sequence uint64
	session := &terminalSession{id: "utf8", process: terminalChunkReader{Reader: reader}}
	session.send = func(message protocol.Message) error {
		var output protocol.TerminalOutput
		if err := decodeData(message.Data, &output); err != nil {
			t.Fatal(err)
		}
		sequence++
		if message.Type != "terminal.output" || output.Sequence != sequence || len(output.Data) == 0 || !utf8.Valid(output.Data) {
			t.Fatalf("invalid output chunk: type=%s seq=%d data=%x", message.Type, output.Sequence, output.Data)
		}
		got = append(got, output.Data...)
		return nil
	}
	(&terminalManager{}).readOutput(session)
	if !bytes.Equal(got, want) || session.outputBytes.Load() != uint64(rawBytes) {
		t.Fatalf("output=%q want=%q rawBytes=%d wantRawBytes=%d", got, want, session.outputBytes.Load(), rawBytes)
	}
}
