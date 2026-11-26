package main

import (
	"bytes"
	"unicode/utf8"
)

type terminalUTF8Output struct {
	carry [utf8.UTFMax - 1]byte
	n     int
}

func (o *terminalUTF8Output) chunk(input []byte, final bool) []byte {
	data := make([]byte, o.n+len(input))
	copy(data, o.carry[:o.n])
	copy(data[o.n:], input)
	o.n = 0
	end := 0
	for end < len(data) {
		if !final && !utf8.FullRune(data[end:]) {
			o.n = copy(o.carry[:], data[end:])
			break
		}
		_, size := utf8.DecodeRune(data[end:])
		end += size
	}
	// Non-UTF-8 bytes and incomplete runes at EOF cannot be represented by the
	// existing JSON text path. Replace explicitly; preserve every valid byte.
	return bytes.ToValidUTF8(data[:end], []byte("\uFFFD"))
}
