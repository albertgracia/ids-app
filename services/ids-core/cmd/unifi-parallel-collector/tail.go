package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
	"time"
)

const tailStateVersion = 1

type tailState struct {
	Version      int    `json:"version"`
	Path         string `json:"path"`
	Inode        uint64 `json:"inode"`
	Device       uint64 `json:"device"`
	Offset       int64  `json:"offset"`
	LastLineHash string `json:"last_line_hash,omitempty"`
	UpdatedAt    string `json:"updated_at"`
	CollectorID  string `json:"collector_id"`
}

type tailSummary struct {
	LinesRead     int
	LinesComplete int
	LinesPartial  int
	OffsetBefore  int64
	OffsetAfter   int64
	StateWritten  bool
	Truncated     bool
	StateFile     string
}

func runTailMode(cfg config, stdout, stderr io.Writer) int {
	entries, tstate, err := collectTailLines(cfg)
	if err != nil {
		fmt.Fprintf(stderr, "error: %v\n", err)
		return classifyCollectError(err)
	}

	summary := summaryOutput{
		EventTypes: make(map[string]int),
		Severities: make(map[string]int),
	}
	records := make([]outputRecord, 0, len(entries)+1)
	seen := make(map[string]struct{})
	hadParseErrors := false

	for _, entry := range entries {
		res := processLine(cfg, entry, seen)
		records = append(records, res.record)
		updateSummary(&summary, res.record)
		if len(res.record.Warnings) > 0 {
			fmt.Fprintf(stderr, "warning en %s:%d: %s\n", entry.Source, entry.Line, strings.Join(res.record.Warnings, "; "))
		}
		if res.err != nil {
			hadParseErrors = true
			fmt.Fprintf(stderr, "error en %s:%d: %v\n", entry.Source, entry.Line, res.err)
		}
	}

	records = append(records, outputRecord{Summary: &summary})
	if err := emitOutput(stdout, cfg.output, records); err != nil {
		fmt.Fprintf(stderr, "error: no se pudo serializar salida: %v\n", err)
		return exitInvalidConfig
	}

	var batchSummary batchBuildSummary
	if cfg.ingestBatch {
		batches, bs, err := buildUniFiIngestBatches(cfg, records[:len(records)-1])
		if err != nil {
			fmt.Fprintf(stderr, "error: no se pudo construir batch ingest: %v\n", err)
			return exitInvalidConfig
		}
		batchSummary = bs
		if cfg.printPayloadSummary {
			printBatchSummary(stderr, batchSummary)
		}
		if cfg.send {
			responses, err := sendUniFiIngestBatches(cfg, batches)
			if err != nil {
				fmt.Fprintf(stderr, "error: no se pudo enviar batch ingest: %v\n", err)
				return exitInvalidConfig
			}
			if cfg.printPayloadSummary {
				printSendSummary(stderr, responses)
			}
		}
	}

	printTailSummary(stderr, tstate, summary, batchSummary)

	if hadParseErrors {
		return exitParseError
	}
	return exitOK
}

func collectTailLines(cfg config) ([]lineInput, tailSummary, error) {
	var summary tailSummary
	path := strings.TrimSpace(cfg.tailFile)
	if path == "" {
		return nil, summary, fmt.Errorf("tail-file is required")
	}
	if strings.HasPrefix(path, `\\`) {
		return nil, summary, fmt.Errorf("remote tail-file paths are not supported in local dry-run mode")
	}
	info, err := os.Stat(path)
	if err != nil {
		return nil, summary, fmt.Errorf("no se pudo abrir %q: %w", path, err)
	}
	if info.IsDir() {
		return nil, summary, fmt.Errorf("tail-file must be a regular file")
	}

	absPath, err := filepath.Abs(path)
	if err != nil {
		absPath = path
	}

	state, err := loadTailState(cfg.stateFile)
	if err != nil {
		return nil, summary, err
	}
	size := info.Size()
	startOffset := determineTailOffset(cfg, state, absPath, size)
	summary.OffsetBefore = startOffset
	if state != nil && startOffset == 0 && state.Offset > size {
		summary.Truncated = true
	}

	file, err := os.Open(path)
	if err != nil {
		return nil, summary, fmt.Errorf("no se pudo abrir %q: %w", path, err)
	}
	defer file.Close()
	if _, err := file.Seek(startOffset, io.SeekStart); err != nil {
		return nil, summary, fmt.Errorf("no se pudo posicionar lectura en %q: %w", path, err)
	}
	data, err := io.ReadAll(file)
	if err != nil {
		return nil, summary, fmt.Errorf("no se pudo leer %q: %w", path, err)
	}

	processedBytes, remainder := splitProcessedBytes(data)
	processed := data[:processedBytes]
	summary.LinesPartial = 0
	if len(remainder) > 0 {
		summary.LinesPartial = 1
	}
	entries := buildTailEntries(string(processed), absPath)
	summary.LinesRead = len(entries)
	summary.LinesComplete = len(entries)
	summary.OffsetAfter = startOffset + int64(processedBytes)

	if cfg.stateFile != "" {
		lastHash := ""
		if len(entries) > 0 {
			lastHash = hashRaw(entries[len(entries)-1].Raw)
		} else if state != nil {
			lastHash = state.LastLineHash
		}
		newState := tailState{
			Version:      tailStateVersion,
			Path:         absPath,
			Inode:        0,
			Device:       0,
			Offset:       summary.OffsetAfter,
			LastLineHash: lastHash,
			UpdatedAt:    time.Now().UTC().Format(time.RFC3339),
			CollectorID:  cfg.collectorID,
		}
		if err := writeTailStateAtomic(cfg.stateFile, newState); err != nil {
			return nil, summary, err
		}
		summary.StateWritten = true
		summary.StateFile = cfg.stateFile
	}

	return entries, summary, nil
}

func determineTailOffset(cfg config, state *tailState, path string, size int64) int64 {
	if state != nil && state.Path == path {
		if state.Offset > size {
			return 0
		}
		return state.Offset
	}
	if cfg.startPosition == "beginning" {
		return 0
	}
	return size
}

func splitProcessedBytes(data []byte) (int, []byte) {
	if len(data) == 0 {
		return 0, nil
	}
	idx := bytes.LastIndexByte(data, '\n')
	if idx < 0 {
		return 0, data
	}
	processedBytes := idx + 1
	return processedBytes, data[processedBytes:]
}

func buildTailEntries(processed string, source string) []lineInput {
	if processed == "" {
		return nil
	}
	rawLines := strings.Split(processed, "\n")
	entries := make([]lineInput, 0, len(rawLines))
	lineNumber := 0
	for _, raw := range rawLines {
		if raw == "" {
			continue
		}
		lineNumber++
		clean := strings.TrimSpace(strings.TrimSuffix(raw, "\r"))
		if clean == "" {
			entries = append(entries, lineInput{Source: source, Line: lineNumber, Skipped: true})
			continue
		}
		entries = append(entries, lineInput{Source: source, Line: lineNumber, Raw: clean})
	}
	return entries
}

func loadTailState(path string) (*tailState, error) {
	if strings.TrimSpace(path) == "" {
		return nil, nil
	}
	data, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, nil
		}
		return nil, fmt.Errorf("no se pudo leer state-file %q: %w", path, err)
	}
	var state tailState
	if err := json.Unmarshal(data, &state); err != nil {
		return nil, fmt.Errorf("state-file invalido %q: %w", path, err)
	}
	return &state, nil
}

func writeTailStateAtomic(path string, state tailState) error {
	if strings.TrimSpace(path) == "" {
		return nil
	}
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return fmt.Errorf("no se pudo preparar directorio de state-file %q: %w", path, err)
	}
	data, err := json.MarshalIndent(state, "", "  ")
	if err != nil {
		return fmt.Errorf("no se pudo serializar state-file %q: %w", path, err)
	}
	tmpPath := path + ".tmp"
	if err := os.WriteFile(tmpPath, data, 0o600); err != nil {
		return fmt.Errorf("no se pudo escribir state-file temporal %q: %w", tmpPath, err)
	}
	if err := os.Rename(tmpPath, path); err != nil {
		_ = os.Remove(tmpPath)
		return fmt.Errorf("no se pudo reemplazar state-file %q: %w", path, err)
	}
	return nil
}

func printTailSummary(w io.Writer, tail tailSummary, summary summaryOutput, batch batchBuildSummary) {
	fmt.Fprintf(w, "tail summary: lines_read=%d lines_complete=%d lines_partial=%d parsed=%d errors=%d batch_events=%d duplicates=%d offset_before=%d offset_after=%d state_written=%t\n", tail.LinesRead, tail.LinesComplete, tail.LinesPartial, summary.Parsed, summary.Errors, batch.Events, summary.Duplicates, tail.OffsetBefore, tail.OffsetAfter, tail.StateWritten)
	if tail.Truncated {
		fmt.Fprintln(w, "tail warning: truncation detected, offset reset")
	}
}
